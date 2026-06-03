# CCFA Paper Agent

[English](README.md) | [中文](README.zh-CN.md)

**CCFA Paper Agent** 是一个面向 CCF-A / SCI 英文论文写作的本地优先 multi-agent 工作台。

它不是简单的聊天窗口，而是围绕“论文工程”组织起来的写作系统：管理初稿、参考论文、图片、段落状态、Introduction 大纲、科学问题记忆、学术检索结果，并通过 `PaperManagerAgent`、`WritingAgent` 和 `SemanticScholarRetrievalAgent` 协同完成论文写作、润色、改写、检索和可确认的文件修改。

## 核心亮点

- **本地论文工程管理**：集中管理初稿、核心参考论文、可选参考论文、图片、项目元信息和段落状态。
- **后端多 Agent 架构**：`PaperManagerAgent` 负责任务调度，`WritingAgent` 负责论文写作，`SemanticScholarRetrievalAgent` 作为 agent-as-tool 提供检索能力。
- **Reference-grounded Writing**：优先使用本地初稿、项目材料和参考论文，避免凭空生成。
- **可确认的文件修改**：Agent 修改初稿时生成结构化 patch，用户确认后才写入本地文件。
- **写作 Skill Registry**：支持 Introduction、Method、Result、Abstract、标题和科学问题短语等写作技能。
- **Semantic Scholar 检索**：支持开放检索、被引扩展和参考文献扩展。
- **Streaming Trace**：实时展示 Agent 思考、工具调用、handoff 和最终响应。
- **Local-first Key Storage**：DeepSeek、Semantic Scholar、MinerU 等 Key 仅保存在本地 `.env`。

## 架构图

![Backend agent architecture](output/imagegen/paper-agent-backend-architecture-morandi.png)

## Agent 角色

**PaperManagerAgent** 是主控 Agent，负责理解用户请求、检查工程上下文、决定直接处理还是 handoff 给 `WritingAgent`，并协调项目工具、检索工具和 patch 生成。

**WritingAgent** 负责真实的论文写作、改写、润色和结构优化。它会先读取对应写作 skill，再结合初稿、参考论文和科学问题记忆生成内容或文件修改 patch。

**SemanticScholarRetrievalAgent** 通过 `retrieve_academic_papers` 暴露为工具。它会根据任务选择 open search、citation expansion 或 reference expansion，并返回候选论文供用户确认。检索结果不会自动加入参考库。

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 20+
- Chrome 或 Edge
- DeepSeek API Key

### Windows

在项目根目录运行：

```powershell
.\start-local.ps1
```

也可以直接双击：

```text
start-local.bat
```

如果 PowerShell 阻止脚本执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

### macOS / Linux

在项目根目录运行：

```bash
chmod +x ./start-local.sh
./start-local.sh
```

脚本会安装依赖、准备后端环境、启动 FastAPI 后端 `http://127.0.0.1:8000`、启动 Vite 前端 `http://127.0.0.1:5173`，并打开本地工作台。

## API Key 配置

首次进入前端后，在本地 API 配置面板中填写 Key，或编辑：

```text
ccfa-paper-agent-backend/.env
```

| 配置项 | 是否必需 | 用途 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 必需 | 驱动 `PaperManagerAgent` 和 `WritingAgent` |
| `DEEPSEEK_MODEL` | 必需 | 后端 Agent Runner 使用的聊天模型 |
| `SEMANTIC_SCHOLAR_API_KEY` | 可选 | 提高 Semantic Scholar 检索限额 |
| `MINERU_API_TOKEN` | 可选 | 支持 PDF 解析为 Markdown |

不要提交真实 API Key。`.env` 已被 Git 忽略。

## 项目工作流

1. 创建或打开本地论文项目。
2. 上传初稿 Markdown、参考论文 PDF / Markdown 和实验图片。
3. 使用 MinerU 将参考论文 PDF 解析为 Markdown。
4. 维护参考论文元信息、核心参考标记和 Semantic Scholar Paper ID。
5. 维护 Introduction 大纲和科学问题记忆。
6. 与 Paper Agent 对话，进行写作、润色、标题设计、检索和 patch 生成。
7. 在前端确认 Agent 生成的文件修改，再写回本地工程。

## 仓库结构

```text
.
├── ccfa-paper-agent-backend/      FastAPI backend, agents, tools, services
├── ccfa-paper-agent-frontend/     React frontend workspace
├── output/imagegen/               README/docs 使用的生成图
├── 设计文档管理/                   项目规划和设计文档
├── start-local.ps1                Windows 一键启动脚本
├── start-local.bat                Windows 双击启动脚本
├── start-local.sh                 macOS / Linux 一键启动脚本
├── README.md                      英文项目首页
└── README.zh-CN.md                中文项目首页
```

## 开发检查

后端检查：

```bash
cd ccfa-paper-agent-backend
python -m compileall app
```

前端构建：

```bash
cd ccfa-paper-agent-frontend
npm run build
```

## 隐私与本地数据

- 项目文件保存在用户选择的本地项目文件夹中。
- API Key 保存在 `ccfa-paper-agent-backend/.env`。
- 浏览器项目状态可从 `.agent/project-state.json` 恢复。
- Agent 文件修改以 patch 形式提出，需要用户确认。
- 检索到的候选论文不会自动写入参考库。

## License

当前尚未声明 License。正式分发或接受外部贡献前建议补充开源许可证。
