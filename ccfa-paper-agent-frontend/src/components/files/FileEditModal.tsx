import { useEffect, useState } from "react";
import type { ProjectFile } from "../../types/file";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";

export function FileEditModal({
  open,
  file,
  onClose,
  onCreateProposal
}: {
  open: boolean;
  file?: ProjectFile;
  onClose: () => void;
  onCreateProposal: (newContent: string, summary: string) => void;
}) {
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("手动编辑 Markdown 文件");

  useEffect(() => {
    setContent(file?.contentText ?? "");
    setSummary("手动编辑 Markdown 文件");
  }, [file, open]);

  return (
    <Modal
      open={open}
      title={file ? `编辑文件：${file.name}` : "编辑文件"}
      description="这里不会立即写入磁盘，而是先生成一次待确认修改。"
      onClose={onClose}
      widthClass="max-w-none w-[min(1120px,calc(100vw-40px))]"
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">修改说明</span>
          <input
            className="mt-1 h-10 w-full rounded-md border-stone-200 bg-white px-3 text-sm shadow-sm focus:border-sage-600 focus:ring-sage-600/20"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        <Textarea
          className="min-h-[56vh] font-mono text-sm leading-6"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onCreateProposal(content, summary.trim() || "手动编辑 Markdown 文件");
            }}
          >
            生成待确认修改
          </Button>
        </div>
      </div>
    </Modal>
  );
}
