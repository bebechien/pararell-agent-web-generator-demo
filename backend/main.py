import asyncio
import json
import random
import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"

"""
TOPICS = [
    "A cozy bakery in Paris",
    "A futuristic cyberpunk city news portal",
    "A retro 80s synthwave music blog",
    "A minimalist plant shop",
    "A space travel agency to Mars",
    "A mystical potion shop for wizards",
    "A high-tech underwater research station",
    "A rustic mountain cabin rental",
    "A sleek electric car configurator",
    "A colorful candy factory homepage",
    "A zen meditation retreat",
    "A dinosaur theme park",
    "A professional photography portfolio",
    "A classic Italian pizzeria",
    "A mobile app for pet translations",
    "A luxury watch boutique"
]

TOPICS = [
  "미니멀리스트 인테리어 디자인 트렌드",
  "초보자를 위한 실내 식물 가꾸기",
  "도쿄 숨겨진 카페 탐방",
  "인공지능이 바꾸는 미래 직업",
  "집에서 즐기는 홈트레이닝 루틴",
  "지속 가능한 패션 브랜드 소개",
  "한국 길거리 음식 베스트 10",
  "효과적인 시간 관리 방법",
  "우주 탐사의 새로운 발견",
  "비건 베이킹 레시피",
  "고전 문학 읽기 모임 모집",
  "스마트폰 사진 촬영 팁",
  "친환경 제로 웨이스트 라이프스타일",
  "세계의 독특한 축제들",
  "프리랜서 생존 가이드",
  "반려견 행동 교정 기초"
]

TOPICS = [
  "京都の穴場お寺巡りガイド",
  "自宅で本格スパイスカレーを作る方法",
  "週末に始めるDIYリノベーション",
  "30代からの資産運用入門",
  "最新ガジェットレビューとおすすめ",
  "初心者のためのキャンプギア選び",
  "睡眠の質を劇的に向上させる習慣",
  "オンラインで学べる語学学習ツール比較",
  "昭和レトロな純喫茶の魅力",
  "デジタルデトックスの実践記録",
  "失敗しない観葉植物の選び方",
  "地元民が教える北海道グルメ旅",
  "写真で見る世界の絶景スポット",
  "リモートワークを快適にするデスク環境",
  "1日15分でできるヨガルーティン",
  "映画好きのためのマイナー作品レビュー"
]
"""

TOPICS = [
  "京都の穴場お寺巡りガイド",
  "自宅で本格スパイスカレーを作る方法",
  "週末に始めるDIYリノベーション",
  "30代からの資産運用入門",
  "最新ガジェットレビューとおすすめ",
  "初心者のためのキャンプギア選び",
  "睡眠の質を劇的に向上させる習慣",
  "オンラインで学べる語学学習ツール比較",
  "昭和レトロな純喫茶の魅力",
  "デジタルデトックスの実践記録",
  "失敗しない観葉植物の選び方",
  "地元民が教える北海道グルメ旅",
  "写真で見る世界の絶景スポット",
  "リモートワークを快適にするデスク環境",
  "1日15分でできるヨガルーティン",
  "映画好きのためのマイナー作品レビュー"
]

# Global dictionary to keep track of active tasks
agent_tasks = {}

async def generate_agent_html(agent_id: int, topic: str, queue: asyncio.Queue):
    """Calls the local LLM and streams HTML generation for a specific topic."""
    prompt = (
        f"Generate the HTML and inline CSS for a random, visually appealing landing page about: {topic}. "
        "Output ONLY the raw HTML code starting with <!DOCTYPE html>. "
        "Do NOT wrap the code in markdown blocks (like ```html). "
        "Do NOT provide any conversational text before or after the code."
    )
    
    payload = {
        "model": "gemma-4-e4b-it",
        "messages": [
            {"role": "system", "content": "You are an expert web developer."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "stream": True
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", LM_STUDIO_URL, json=payload) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                                delta = chunk_data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    await queue.put({
                                        "agent_id": agent_id,
                                        "chunk": delta["content"],
                                        "status": "generating"
                                    })
                        except json.JSONDecodeError:
                            pass
                            
            await queue.put({"agent_id": agent_id, "status": "done"})
    except asyncio.CancelledError:
        # Task was cancelled explicitly by the user
        await queue.put({"agent_id": agent_id, "error": "Stopped by user", "status": "error"})
    except Exception as e:
        print(f"Error for agent {agent_id}: {str(e)}")
        await queue.put({"agent_id": agent_id, "error": str(e), "status": "error"})

@app.get("/generate")
async def generate(request: Request):
    global agent_tasks
    queue = asyncio.Queue()
    random_topics = random.sample(TOPICS, 16)
    
    # Clean up any residual tasks before starting new ones
    for task in agent_tasks.values():
        task.cancel()
    agent_tasks.clear()
    
    # Start all 16 agents concurrently
    for i in range(16):
        task = asyncio.create_task(generate_agent_html(i, random_topics[i], queue))
        agent_tasks[i] = task
    
    async def event_generator():
        active_tasks = 16
        while active_tasks > 0:
            if await request.is_disconnected():
                # Cancel all tasks if the client disconnects entirely
                for task in agent_tasks.values():
                    task.cancel()
                break
            
            item = await queue.get()
            
            if item["status"] in ["done", "error"]:
                active_tasks -= 1
            
            yield {
                "event": "message",
                "id": str(item["agent_id"]),
                "data": json.dumps(item)
            }
            
    return EventSourceResponse(event_generator())

@app.post("/stop/{agent_id}")
async def stop_agent(agent_id: int):
    """Endpoint to cancel a specific agent's generation task."""
    global agent_tasks
    if agent_id in agent_tasks:
        agent_tasks[agent_id].cancel()
        return {"status": "stopped", "agent_id": agent_id}
    return {"status": "not found", "agent_id": agent_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
