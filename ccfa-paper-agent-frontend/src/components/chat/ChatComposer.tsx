import { Cpu, Loader2, Send } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

export const DEFAULT_CHAT_MODEL = "deepseek-v4-flash";

export const CHAT_MODEL_OPTIONS = [
  { value: "deepseek-v4-flash", label: "V4 Flash", hint: "轻快" },
  { value: "deepseek-v4-pro", label: "V4 Pro", hint: "深度" }
];

export function ChatComposer({
  disabled,
  model,
  onModelChange,
  onSend
}: {
  disabled?: boolean;
  model: string;
  onModelChange: (model: string) => void;
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
    <div className="relative border-t border-white/32 bg-gradient-to-t from-[#d0c6ba]/82 via-[#ddd5cc]/58 to-transparent px-5 pb-5 pt-8 shadow-[0_-18px_44px_rgba(74,67,60,0.08)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-transparent to-[#ddd5cc]/40" />
      <div className="relative rounded-xl border border-[#afa397]/78 bg-[#fbfaf7]/94 p-2 shadow-[0_18px_45px_rgba(74,67,60,0.15),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur transition-all duration-200 focus-within:-translate-y-0.5 focus-within:border-sage-600/55 focus-within:bg-white focus-within:shadow-[0_22px_58px_rgba(74,67,60,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]">
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
        <div className="flex flex-col gap-3 px-1 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex w-full min-w-0 items-center gap-2 rounded-md border border-[#c4b8aa] bg-white/58 p-1 text-xs text-morandi-muted shadow-inner shadow-[#7c756e]/5 sm:w-auto">
              <Cpu className="h-3.5 w-3.5 shrink-0 text-sage-700" />
              <div className="grid min-w-[210px] flex-1 grid-cols-2 gap-1">
                {CHAT_MODEL_OPTIONS.map((option) => {
                  const active = model === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={clsx(
                        "h-8 rounded px-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-600/20 disabled:cursor-not-allowed",
                        active
                          ? "bg-[#253029] text-white shadow-sm"
                          : "text-morandi-muted hover:bg-white/70 hover:text-morandi-ink"
                      )}
                      disabled={disabled}
                      onClick={() => onModelChange(option.value)}
                      aria-pressed={active}
                    >
                      <span className="block truncate text-xs font-semibold leading-4">{option.label}</span>
                      <span
                        className={clsx(
                          "block truncate text-[10px] leading-3",
                          active ? "text-[#dce8da]" : "text-[#8f8274]"
                        )}
                      >
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="shrink-0 text-xs text-morandi-muted">
              {disabled ? "Agent 正在处理上一条消息..." : "Enter 发送，Shift+Enter 换行"}
            </p>
          </div>
          <Button
            variant="primary"
            icon={
              disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />
            }
            disabled={disabled}
            onClick={submit}
          >
            {disabled ? "处理中" : "发送"}
          </Button>
        </div>
      </div>
    </div>
  );
}
