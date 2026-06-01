# CCFA Paper Agent Backend

Python backend for the paper-writing agent. The React frontend sends the current
project context here, and this service calls the OpenAI Agents SDK with a
DeepSeek OpenAI-compatible API endpoint.

## Setup

```powershell
cd D:\E\OneDrive\桌面\E\yupaper\ccfa-paper-agent-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `DEEPSEEK_API_KEY`.

## Run

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The frontend defaults to `http://localhost:8000`. You can override it with
`VITE_AGENT_API_URL` in the frontend environment.

## Agent Directory Layout

```text
app/
  agents/           PaperManagerAgent / WritingAgent assembly and handoff setup
  context/          Runtime context assembly for project/thread requests
  core/             Settings and shared configuration
  memory/           Per-thread session and memory management
  models/           Model/provider construction, such as DeepSeek
  observability/    Run hooks, tracing, and tool/LLM lifecycle logging
  prompts/          System prompts and prompt fragments
  schemas/          API request/response contracts
  services/         Application services that orchestrate agents
  skills/           Writing skill registry and per-skill folders with SKILL.md
  tools/            Agent tools exposed to the model
```

`PaperManagerAgent` decides whether a request should be handled directly or
handed off to `WritingAgent`. `WritingAgent` owns manuscript writing, revision,
polishing, and patch generation. Writing skills live in folders such as
`app/skills/writing-introduction-skill/` and may contain `SKILL.md`,
`references/`, and `scripts/`.

Frontend chat threads are stored in the frontend project state. The backend now
also creates an Agents SDK `SQLiteSession` per `projectId + threadId`, stored at
`AGENT_MEMORY_DB_PATH`, so each thread can keep independent backend conversation
memory. The frontend remains the source of truth for project files and project
state.
