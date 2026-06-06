# Project Updates

This page records major CCFA Paper Agent feature updates so local users and collaborators can quickly see what changed.

## 2026-06-06

### Draft manuscripts support LaTeX upload and smart parsing

Initial implementation:

- Draft manuscripts now support `.tex` uploads.
- Uploaded LaTeX drafts are converted into `.latex.md` Markdown files.
- The conversion preserves section hierarchy, formulas, and figure/table captions where possible.
- Image files are not preserved; figure/table captions are retained as text.
- `.latex.md` / `.tex.md` draft files now show a **Smart Parse** action.
- Smart Parse further removes irrelevant TeX artifacts, regularizes the section structure, and creates a pending reviewable change.
- The cleaned result does not overwrite the file directly; users must review the diff and confirm before applying it.

Note: this is an initial implementation. Complex packages, custom macros, and unusual LaTeX environments may need further support.
