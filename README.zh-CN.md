<div align="center">

<img src="output/imagegen/ccfa-paper-agent-dark-icon.png" alt="CCFA Paper Agent icon" width="132" />

# CCFA Paper Agent

**面向 CCF-A / SCI 论文写作、检查、检索和可确认改稿的本地优先 multi-agent 工作台。**

[English](README.md) | [中文](README.zh-CN.md) | [使用教程](docs/USAGE.zh-CN.md) | [项目更新](docs/UPDATES.zh-CN.md)

![Python](https://img.shields.io/badge/Python-3.10+-6F7F6A?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Agent%20Backend-7C9A92?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite%20Workspace-8EA7B8?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20UI-7F8DA8?style=for-the-badge&logo=typescript&logoColor=white)
![OpenAI Agents](https://img.shields.io/badge/OpenAI%20Agents-Handoff%20Runtime-9A8F7A?style=for-the-badge)
![Local First](https://img.shields.io/badge/Local--First-Confirm%20Before%20Write-AE8F83?style=for-the-badge)

</div>

---

![CCFA Paper Agent 架构图](output/imagegen/ccfa-paper-agent-architecture-cvpr-morandi.png)

---

## 系统概览

| 层级 | 技术栈 | 职责 |
| --- | --- | --- |
| 前端工作台 | React, Vite, TypeScript, Tailwind CSS | 本地论文工程、聊天线程、文件面板、patch 审阅、streaming trace |
| 后端服务 | FastAPI, OpenAI Agents SDK, DeepSeek 兼容模型适配 | Agent 编排、handoff 路由、工具执行、JSON 响应契约 |
| Agent 层 | `PaperManagerAgent`, `WritingAgent`, `PaperCheckAgent`, `SemanticScholarRetrievalAgent` | 写作、检查、检索、证据组织和可确认 patch 生成 |
| 本地数据 | Markdown 初稿、MinerU 解析后的 PDF、参考论文、图片、好词好句记忆、IndexedDB 状态、可选本地工程路径 | 项目级论文上下文和可恢复本地状态 |
| 安全边界 | 工具生成 patch + 前端确认 | 不静默覆盖文件，所有初稿修改必须先预览再应用 |

## 这是什么

**CCFA Paper Agent** 不是普通聊天窗口，而是围绕“论文工程”组织起来的本地优先写作系统。

它把初稿、参考论文、图片、段落状态、Introduction 大纲、科学问题记忆、学术检索结果和可确认文件修改放在同一个项目上下文里。Agent 不直接凭空写论文，而是读取工程材料、选择对应 skill、检索候选证据，并在需要改稿时生成前端可审阅的 patch。

系统采用 handoff 架构：`PaperManagerAgent` 负责调度，`WritingAgent` 负责写作和改稿，`PaperCheckAgent` 负责检查和审稿式诊断，`SemanticScholarRetrievalAgent` 负责学术检索。

## 核心能力

- **本地论文工程管理**：集中管理初稿、核心参考论文、可选参考论文、图片、项目元信息和段落状态。
- **写作 Agent + Skills**：支持 Introduction、Method、Result、Abstract、标题和科学问题短语等章节写作能力。
- **检查 Agent + Skills**：支持 Introduction 质量检查、语料充分性、逐句逻辑、概念对齐、语气强弱和修改成本判断。
- **MinerU PDF 自动解析**：基于 MinerU 自动解析论文 PDF，并整理成结构精确、可被 Agent 读取和检索的 Markdown 文件。
- **Reference-grounded Writing**：优先使用本地初稿、项目材料和参考论文，减少无依据生成。
- **Semantic Scholar 检索**：支持开放检索、被引扩展和参考文献扩展，返回候选证据供用户确认。
- **动态积累功能**：Agent 在运行过程中自动沉淀好词好句、优秀句式和可复用学术表达，并保存到本地供后续写作调用。
- **可确认的文件修改**：Agent 修改初稿时生成结构化 patch，用户确认后才写入本地文件。
- **Streaming Trace**：实时展示 Agent 思考、工具调用、handoff、patch 和最终响应。
- **Local-first Key Storage**：DeepSeek、Semantic Scholar、MinerU 等 Key 仅保存在本地 `.env`。

## Agent 角色

### `PaperManagerAgent`

主控 Agent。它理解用户请求、读取紧凑工程上下文，并决定直接回答、handoff 到写作 Agent，还是 handoff 到检查 Agent。

### `WritingAgent`

论文写作 Agent。它在写作或改稿前读取对应 writing skill，结合初稿、参考论文、Introduction 大纲和科学问题记忆生成论文文本或 patch。

### `PaperCheckAgent`

论文检查 Agent。它读取 checking skill，定位目标段落或句子，检查段落状态、参考支撑、逻辑衔接、概念一致性、信息对齐、语气和修改成本。默认只给检查意见，不修改初稿；只有用户明确确认后才生成 patch。

### `SemanticScholarRetrievalAgent`

学术检索 Agent，通过 `retrieve_academic_papers` 暴露为工具。它根据任务选择开放检索、被引扩展或参考文献扩展，返回候选论文和证据包。检索结果不会自动加入参考库。

## 快速开始

### 环境要求

- Python 3.10+；启动脚本会校验版本，并支持更新的 Python 3 版本
- Node.js 20+
- Chrome 或 Edge；不建议使用 Safari，因为本地目录访问能力不完整
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

macOS 用户注意：

- 脚本支持 Python 3.10 或更新版本。如果找不到 `python3.10`，只会在 `python3 >= 3.10` 时使用 `python3`。
- 请使用 Chrome 或 Edge 打开本地工作台。Safari 可能无法稳定创建或打开工程目录，因为本项目依赖 File System Access API。
- 首次使用请点击“创建论文工程”。“打开已有工程”只用于恢复之前创建过、且包含 `.agent/project-state.json` 的 CCFA Paper Agent 工程目录。
- 如果配置面板出现 `Failed to fetch` 或无法连接后端，请先打开 `http://127.0.0.1:8000/health`，确认 `start-local.sh` 已成功启动后端。

脚本会安装依赖、准备后端环境、启动 FastAPI 后端 `http://127.0.0.1:8000`、启动 Vite 前端 `http://127.0.0.1:5173`，并打开本地工作台。

## API Key 配置

首次进入前端后，在本地 API 配置面板中填写 Key，或编辑：

```text
ccfa-paper-agent-backend/.env
```

| 配置项 | 是否必需 | 用途 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 必需 | 驱动后端 Agent |
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
6. 与 Paper Agent 对话，进行写作、检查、检索、标题设计和 patch 生成。
7. 在前端确认 Agent 生成的文件修改，再写回本地工程。

## 仓库结构

```text
.
├── ccfa-paper-agent-backend/      FastAPI backend, agents, tools, prompts, skills
├── ccfa-paper-agent-frontend/     React local workspace
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
