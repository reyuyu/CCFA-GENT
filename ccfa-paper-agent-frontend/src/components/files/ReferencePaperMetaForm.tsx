import { useEffect, useState } from "react";
import type { FolderType, ProjectFile, ReferencePaperMeta } from "../../types/file";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";

const emptyMeta: ReferencePaperMeta = {
  paperYear: "",
  paperVenueOrQuality: "",
  semanticScholarPaperId: "",
  referenceSummary: "",
  referenceSections: ""
};

export function ReferencePaperMetaForm({
  open,
  file,
  folderType,
  onClose,
  onSave
}: {
  open: boolean;
  file?: ProjectFile;
  folderType?: FolderType;
  onClose: () => void;
  onSave: (folderType: FolderType, fileId: string, meta: ReferencePaperMeta) => void;
}) {
  const [meta, setMeta] = useState<ReferencePaperMeta>(emptyMeta);

  useEffect(() => {
    setMeta({ ...emptyMeta, ...(file?.referenceMeta ?? {}) });
  }, [file]);

  const update = <K extends keyof ReferencePaperMeta>(key: K, value: ReferencePaperMeta[K]) => {
    setMeta((current) => ({ ...current, [key]: value }));
  };

  return (
    <Modal open={open} title="编辑参考论文信息" onClose={onClose} widthClass="max-w-xl">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (file && folderType) {
            onSave(folderType, file.id, meta);
          }
        }}
      >
        <p className="text-sm font-medium text-stone-700">{file?.name}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">年份</span>
            <Input
              className="mt-1"
              value={meta.paperYear}
              onChange={(event) => update("paperYear", event.target.value)}
              placeholder="2025"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">论文质量 / 会议 / 期刊</span>
            <Input
              className="mt-1"
              value={meta.paperVenueOrQuality}
              onChange={(event) => update("paperVenueOrQuality", event.target.value)}
              placeholder="CCF-A / SCI Q1 / ACL"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Semantic Scholar Paper ID</span>
          <Input
            className="mt-1"
            value={meta.semanticScholarPaperId ?? ""}
            onChange={(event) => update("semanticScholarPaperId", event.target.value)}
            placeholder="CorpusID:123456789 或 Semantic Scholar paperId"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">参考简介</span>
          <Textarea
            className="mt-1 min-h-[92px]"
            value={meta.referenceSummary}
            onChange={(event) => update("referenceSummary", event.target.value)}
            placeholder="这篇论文主要可参考的创新点、实验设置或写作方式"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">具体参考段落</span>
          <Textarea
            className="mt-1 min-h-[92px]"
            value={meta.referenceSections}
            onChange={(event) => update("referenceSections", event.target.value)}
            placeholder="例如：Method 里的 loss design；Related Work 的 taxonomy"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary">
            保存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
