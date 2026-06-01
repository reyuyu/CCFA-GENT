# CCFA Paper Agent Frontend

A local-first React frontend for an English CCF-A / SCI paper writing Agent. It is organized around paper projects and per-project chat threads, so users create or enter a paper project before chatting with the writing assistant.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Zustand for state
- IndexedDB via `idb` for local persistence
- `react-markdown` for Markdown preview
- `lucide-react` icons

## Run Locally

```bash
npm install
npm run dev
```

Then open the URL printed by Vite, usually `http://localhost:5173`.

## What Works Now

- Create, edit, enter, exit, and delete paper projects
- Store all project data in browser IndexedDB
- Upload Markdown drafts and references, PDF reference placeholders, and image assets
- Preview Markdown files
- Manage draft paragraph statuses parsed from Markdown heading structure
- Edit reference-paper metadata
- Edit image captions and copy local Markdown image references
- Create/switch chat threads and send mock Agent messages
- Inspect the JSON Agent context exposed by the frontend

## Local-Only MVP

This project has no backend and no real Agent service yet. Markdown text and image data URLs are stored locally in IndexedDB under the database `ccfa-paper-agent-db`.

## Future Agent Integration

The adapter layer lives in `src/agent/agentAdapter.ts`. Replace `sendMessageToAgent` with an OpenAI SDK call or your own Agent service request. The `buildAgentContext(project)` function already prepares project metadata, file summaries, reference metadata, draft paragraph statuses, image assets, and current thread messages for downstream Agent debugging.

For a Chinese engineering guide focused on frontend state, editable fields, and future Agent design, see `docs/AGENT_DESIGN_GUIDE_CN.md`.

For the local-file Agent workflow, including file handles, pending changes, and confirm-before-write behavior, see `docs/LOCAL_FILE_AGENT_WORKFLOW_CN.md`.
