import { Copy, Image as ImageIcon, Trash2 } from "lucide-react";
import type { ProjectFile } from "../../types/file";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export function ImageAssetPanel({
  file,
  onCaptionChange,
  onPreview,
  onDelete
}: {
  file: ProjectFile;
  onCaptionChange: (caption: string) => void;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const reference = `![${file.imageCaption || "Figure caption"}](local-image://${file.id})`;

  return (
    <div className="space-y-2 rounded-md border border-stone-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onPreview}>
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-stone-100">
            {file.dataUrl ? (
              <img src={file.dataUrl} alt={file.name} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="m-3 h-6 w-6 text-stone-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-800">{file.name}</p>
            <p className="text-xs text-stone-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </button>
        <Button
          className="h-8 w-8 shrink-0 px-0 text-stone-400 hover:bg-red-50 hover:text-red-600"
          variant="ghost"
          title="删除图片"
          aria-label={`删除图片 ${file.name}`}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input
        value={file.imageCaption ?? ""}
        onChange={(event) => onCaptionChange(event.target.value)}
        placeholder="Figure caption"
      />
      <Button
        className="w-full"
        variant="ghost"
        icon={<Copy className="h-4 w-4" />}
        onClick={() => void navigator.clipboard.writeText(reference)}
      >
        复制 Markdown 引用
      </Button>
    </div>
  );
}
