# 项目更新 / Project Updates

记录主要功能变化。每条更新都包含中文和英文，尽量只保留最重要的信息。

Major feature changes are listed here. Each entry includes Chinese and English, keeping only the essentials.

## 2026-06-06

### 初稿 LaTeX 上传与智能解析 / LaTeX Draft Upload and Smart Parse

**中文**

- 初稿支持上传 `.tex` 文件，并自动转换为 `.latex.md`。
- 新增“智能解析”：清理无关 TeX 代码，规整章节层次，保留公式和 caption。
- 智能解析改为分块处理，长文档不再因为模型输出长度限制直接失败。

**English**

- Draft manuscripts can now upload `.tex` files and convert them to `.latex.md`.
- Added **Smart Parse** to clean TeX artifacts, regularize sections, and preserve formulas/captions.
- Smart Parse now processes long drafts in chunks to avoid model output length failures.
