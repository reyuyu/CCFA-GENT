import type { ProjectFile } from "../../types/file";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

function buildSimpleDiff(oldContent: string, newContent: string): Array<{
  type: "same" | "removed" | "added";
  text: string;
}> {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);
  const maxLength = Math.max(oldLines.length, newLines.length);
  const rows: Array<{ type: "same" | "removed" | "added"; text: string }> = [];

  for (let index = 0; index < maxLength; index += 1) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];
    if (oldLine === newLine) {
      rows.push({ type: "same", text: `  ${oldLine ?? ""}` });
      continue;
    }
    if (oldLine !== undefined) {
      rows.push({ type: "removed", text: `- ${oldLine}` });
    }
    if (newLine !== undefined) {
      rows.push({ type: "added", text: `+ ${newLine}` });
    }
  }

  return rows;
}

export function FileChangeReviewModal({
  open,
  file,
  applying,
  onClose,
  onApply,
  onReject
}: {
  open: boolean;
  file?: ProjectFile;
  applying?: boolean;
  onClose: () => void;
  onApply: () => void;
  onReject: () => void;
}) {
  const change = file?.pendingChange;
  const rows = change ? buildSimpleDiff(change.oldContent, change.newContent) : [];

  return (
    <Modal
      open={open}
      title={file ? `确认文件修改：${file.name}` : "确认文件修改"}
      description={change?.summary}
      onClose={onClose}
      widthClass="max-w-none w-[min(1240px,calc(100vw-40px))]"
      bodyClassName="p-0"
    >
      {change ? (
        <div className="flex max-h-[calc(92vh-72px)] flex-col">
          <div className="border-b border-stone-200 bg-paper-100 px-5 py-3 text-sm text-stone-600">
            <p>
              来源：{change.source === "agent" ? "Agent" : "手动编辑"} · 状态：
              {change.status === "pending" ? "待确认" : change.status}
            </p>
            <p className="mt-1">
              确认后
              {file?.sourceType === "localHandle"
                ? "会写回本地文件并重新同步前端状态。"
                : "会更新浏览器本地副本，无法写回磁盘原文件。"}
            </p>
          </div>
          <pre className="min-h-[55vh] flex-1 overflow-auto bg-stone-950 p-5 text-xs leading-5 text-stone-200">
            {rows.map((row, index) => (
              <div
                key={`${row.type}-${index}`}
                className={
                  row.type === "added"
                    ? "bg-emerald-500/10 text-emerald-200"
                    : row.type === "removed"
                      ? "bg-red-500/10 text-red-200"
                      : "text-stone-400"
                }
              >
                {row.text || " "}
              </div>
            ))}
          </pre>
          <div className="flex justify-end gap-2 border-t border-stone-200 bg-white px-5 py-4">
            <Button variant="danger" disabled={applying} onClick={onReject}>
              拒绝修改
            </Button>
            <Button variant="primary" disabled={applying} onClick={onApply}>
              {applying ? "正在写入..." : "确认并应用"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
