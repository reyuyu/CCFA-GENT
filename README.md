# CCFA Paper Agent

一个面向 CCF-A / SCI 英文论文写作的本地论文 Agent 工作台。项目包含前端、后端、写作 Agent、检索 Agent、项目上下文管理、参考论文管理和草稿编辑能力。

## 一键本地运行

Windows 用户下载项目后，在项目根目录运行：

```powershell
.\start-local.ps1
```

也可以直接双击：

```text
start-local.bat
```

脚本会自动完成：

- 创建或复用后端虚拟环境 `.venv310`
- 复制 `ccfa-paper-agent-backend/.env.example` 为本地 `.env`
- 安装后端依赖
- 安装前端依赖
- 启动后端 `http://127.0.0.1:8000`
- 启动前端 `http://127.0.0.1:5173`
- 自动打开前端主页

首次运行如果 PowerShell 阻止脚本执行，可以在项目根目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

## 本地 API Key 配置

打开主页后，可以在“本地运行配置”中填写自己的 Key：

- DeepSeek API Key
- Semantic Scholar API Key，可选
- MinerU API Token，可选

这些 Key 只会保存到本机后端目录：

```text
ccfa-paper-agent-backend/.env
```

`.env` 已被 `.gitignore` 忽略，不应该提交到 GitHub。

## 手动启动

如果不使用一键脚本，也可以手动启动。

后端：

```powershell
cd ccfa-paper-agent-backend
.\.venv310\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

前端：

```powershell
cd ccfa-paper-agent-frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## 目录结构

```text
ccfa-paper-agent-backend/    后端服务、Agent、工具、项目上下文
ccfa-paper-agent-frontend/   前端工作台
设计文档管理/                 项目规划与设计笔记
start-local.ps1              Windows 一键启动脚本
start-local.bat              Windows 双击启动入口
```

## 注意事项

- 不要把真实 API Key 写入 `.env.example` 或提交到仓库。
- 推荐使用 Python 3.10。
- 如果端口 `8000` 或 `5173` 被占用，请先关闭已有服务，或修改启动脚本中的端口。
