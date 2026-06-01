$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "ccfa-paper-agent-backend"
$frontend = Join-Path $root "ccfa-paper-agent-frontend"
$venv = Join-Path $backend ".venv310"
$python = Join-Path $venv "Scripts\python.exe"
$pip = Join-Path $venv "Scripts\pip.exe"

if (-not (Test-Path $python)) {
  Write-Host "Creating Python virtual environment..."
  py -3.10 -m venv $venv
}

if (-not (Test-Path (Join-Path $backend ".env"))) {
  Copy-Item (Join-Path $backend ".env.example") (Join-Path $backend ".env")
}

Write-Host "Installing backend dependencies..."
& $pip install -r (Join-Path $backend "requirements.txt")

Write-Host "Installing frontend dependencies..."
Push-Location $frontend
npm install
Pop-Location

Write-Host "Starting backend at http://127.0.0.1:8000 ..."
Start-Process -FilePath $python -ArgumentList @("-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $backend -WindowStyle Hidden

Write-Host "Starting frontend at http://127.0.0.1:5173 ..."
Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") -WorkingDirectory $frontend -WindowStyle Hidden

Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:5173"

Write-Host ""
Write-Host "CCFA Paper Agent is starting."
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Configure API keys from the homepage settings panel."
