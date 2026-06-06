$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "ccfa-paper-agent-backend"
$frontend = Join-Path $root "ccfa-paper-agent-frontend"
$venv = Join-Path $backend ".venv310"
$python = Join-Path $venv "Scripts\python.exe"
$pip = Join-Path $venv "Scripts\pip.exe"
$npm = "npm.cmd"

function Test-PythonCandidate {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  & $Command @Arguments -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" *> $null
  return $LASTEXITCODE -eq 0
}

function Find-Python310Plus {
  $candidates = @()

  if (Get-Command "py" -ErrorAction SilentlyContinue) {
    $candidates += ,@("py", @("-3"))
    $candidates += ,@("py", @("-3.13"))
    $candidates += ,@("py", @("-3.12"))
    $candidates += ,@("py", @("-3.11"))
    $candidates += ,@("py", @("-3.10"))
  }

  foreach ($name in @("python", "python3")) {
    if (Get-Command $name -ErrorAction SilentlyContinue) {
      $candidates += ,@($name, @())
    }
  }

  foreach ($candidate in $candidates) {
    if (Test-PythonCandidate -Command $candidate[0] -Arguments $candidate[1]) {
      return @{
        Command = $candidate[0]
        Arguments = $candidate[1]
      }
    }
  }

  throw "Python 3.10 or newer is required. Please install Python 3.10+ and rerun this script."
}

if (-not (Get-Command $npm -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm is required. Please install Node.js first."
}

if (-not (Test-Path $python)) {
  Write-Host "Creating Python virtual environment..."
  $pythonLauncher = Find-Python310Plus
  & $pythonLauncher.Command @($pythonLauncher.Arguments + @("-m", "venv", $venv))
}

if (-not (Test-Path (Join-Path $backend ".env"))) {
  Copy-Item (Join-Path $backend ".env.example") (Join-Path $backend ".env")
}

Write-Host "Installing backend dependencies..."
& $pip install -r (Join-Path $backend "requirements.txt")

Write-Host "Installing frontend dependencies..."
Push-Location $frontend
& $npm install
Pop-Location

Write-Host "Starting backend at http://127.0.0.1:8000 ..."
Start-Process -FilePath $python -ArgumentList @("-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $backend -WindowStyle Hidden

Write-Host "Starting frontend at http://127.0.0.1:5173 ..."
Start-Process -FilePath $npm -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") -WorkingDirectory $frontend -WindowStyle Hidden

Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:5173"

Write-Host ""
Write-Host "CCFA Paper Agent is starting."
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Backend:  http://127.0.0.1:8000"
Write-Host "Configure API keys from the homepage settings panel."
