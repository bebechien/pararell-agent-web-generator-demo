# Parallel Agent Web Generator Demo - Startup Script

Write-Host "Starting Parallel Agent Web Generator Demo..." -ForegroundColor Cyan

# Start Backend
Write-Host "Launching Backend (FastAPI) on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-Command `"cd backend; .\venv\Scripts\activate; python main.py`"" -WindowStyle Normal

# Start Frontend
Write-Host "Launching Frontend (Vite) on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-Command `"cd frontend; npm run dev; Write-Host 'Finished'`"" -WindowStyle Normal

Write-Host "Both services are starting. Please ensure LM Studio is running at http://localhost:1234" -ForegroundColor Yellow
