# Product Requirements Document (PRD): Parallel Agent Web Generator Demo

## 1. Product Overview
The **Parallel Agent Web Generator Demo** is a lightweight web application designed to showcase the capability of running multiple autonomous AI agents concurrently using a locally hosted Large Language Model (LLM). The application will demonstrate 16 independent agents generating unique HTML web pages in parallel and rendering them in real-time upon completion.

## 2. Objectives
* **Demonstrate Concurrency:** Prove the feasibility of orchestrating multiple agent tasks simultaneously rather than sequentially.
* **Showcase Local LLM Performance:** Validate the capability of the `gemma-4-e2b-it` model served locally via LM Studio to handle burst requests.
* **Provide Immediate Visual Feedback:** Offer a clean, single-page interface where users can visually verify the output of all 16 agents at a glance.

## 3. Scope
This is a Proof of Concept (PoC) demo. 
* **In Scope:** A single-page web interface, backend orchestration for parallel API calls, integration with local LM Studio, and rendering basic HTML outputs in iframes.
* **Out of Scope:** User authentication, saving/exporting generated pages, complex agent reasoning loops (agents will do a single-pass zero-shot generation), and deployment to external cloud environments.

---

## 4. Technical Architecture & Tech Stack

### 4.1. AI / LLM Layer
* **Model:** `gemma-4-e2b-it` (Note: Ensure the local hardware has sufficient VRAM to handle the context windows for 16 concurrent requests, or configure LM Studio to queue/batch appropriately).
* **Serving Engine:** LM Studio.
* **Interface:** OpenAI-compatible local REST API (typically `http://localhost:1234/v1`).

### 4.2. Backend Orchestration
* **Framework:** Node.js (Express) or Python (FastAPI). FastAPI is highly recommended due to its native asynchronous capabilities, making it ideal for managing 16 parallel blocking requests to the LLM.
* **Agent Logic:** A simple asynchronous function that prompts the local API. 
    * *System Prompt Example:* "You are an expert web developer. Output only valid HTML/CSS for a random, creative single-page website. Do not include markdown formatting or explanations."

### 4.3. Frontend
* **Framework:** React, Vue, or Vanilla JavaScript with HTML/CSS.
* **Display:** CSS Grid (4x4 layout) to house 16 `<iframe>` elements.

---

## 5. Functional Requirements

### 5.1. Trigger Mechanism
* **Feature:** "Launch Agents" Button.
* **Behavior:** A prominent button on the screen that, when clicked, initiates an API call to the backend to start the 16 concurrent agent runs. The button should disable once clicked to prevent spamming until the current batch finishes.

### 5.2. Parallel Execution
* **Feature:** Concurrent Backend Processing.
* **Behavior:** The backend must spin up 16 parallel threads or async tasks. Each task sends a unique request (perhaps with a slightly randomized seed or topic in the prompt to ensure variety) to the local LM Studio instance.

### 5.3. Loading State Management
* **Feature:** Status Indicators.
* **Behavior:** While agents are processing, each of the 16 grid slots should display an active loading state (e.g., a spinner or "Agent [1-16] thinking...").

### 5.4. Result Rendering
* **Feature:** Iframe Previews.
* **Behavior:** As soon as an individual agent completes its generation, the raw HTML string is passed back to the frontend. The frontend injects this HTML into the corresponding `<iframe>` using the `srcdoc` attribute, allowing immediate preview of the rendered page.

---

## 6. UI/UX Design Specifications

### 6.1. Layout
* **Header:** Title of the demo and the main **"Launch 16 Agents"** CTA button.
* **Main Content Area:** A 4x4 responsive CSS Grid.
* **Grid Cards:** Each cell in the grid represents an Agent.
    * *Initial State:* Empty box with an "Agent [X] Idle" label.
    * *Active State:* Loading animation with "Agent [X] Generating..." label.
    * *Completed State:* The `<iframe>` takes up the full card, displaying the generated web page.

### 6.2. Error Handling
* If an agent fails (e.g., local server timeout, malformed HTML), that specific grid cell should display a clear error state (e.g., red background, "Generation Failed") without disrupting the other 15 agents.

---

## 7. System Prompt Configuration (Agent Instructions)
To ensure the output renders correctly in an iframe, the prompt sent to `gemma-4-e2b-it` must strictly enforce constraints:
> "Generate the HTML and inline CSS for a random, visually appealing landing page. The topic should be completely random (e.g., a bakery, a sci-fi movie, a tech product, a personal blog). Output ONLY the raw HTML code starting with `<!DOCTYPE html>`. Do NOT wrap the code in markdown blocks (like ```html). Do NOT provide any conversational text before or after the code."

## 8. Success Metrics for Demo
* **Click-to-Render Time:** The time it takes from clicking the button to the first iframe populating, and the time for the last (16th) iframe to populate.
* **Concurrency Success Rate:** The percentage of agents that successfully return valid, renderable HTML out of the 16 fired.
* **Local Hardware Stability:** Ensuring the local machine running LM Studio does not crash under the sudden load of 16 parallel inference requests.