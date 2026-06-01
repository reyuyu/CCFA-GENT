import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

export function ChatComposer({
  disabled,
  onSend
}: {
  disabled?: boolean;
  onSend: (content: string) => void;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    setValue("");
    onSend(content);
  };

  return (
    <div className="border-t border-[#b8afa4] bg-[#cfc4b8]/90 p-4">
      <div className="rounded-lg border border-[#a99f94] bg-[#f4efe7] p-2 shadow-md shadow-[#7c756e]/10">
        <Textarea
          className="max-h-40 min-h-[76px] border-0 bg-transparent shadow-none focus:ring-0"
          placeholder="向论文写作 Agent 描述任务，例如：帮我检查 Method 的逻辑连贯性"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <p className="text-xs text-morandi-muted">Enter 发送，Shift+Enter 换行</p>
          <Button variant="primary" icon={<Send className="h-4 w-4" />} disabled={disabled} onClick={submit}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
