import {
  Bot,
  Check,
  ChevronDown,
  Cpu,
  GraduationCap,
  Loader2,
  PenLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { AgentMode } from "../../types/agent";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";

export const DEFAULT_CHAT_MODEL = "deepseek-v4-flash";

export const CHAT_MODEL_OPTIONS = [
  { value: "deepseek-v4-flash", label: "V4 Flash", hint: "轻快" },
  { value: "deepseek-v4-pro", label: "V4 Pro", hint: "深度" }
];

export const DEFAULT_AGENT_MODE: AgentMode = "auto";

export const AGENT_MODE_OPTIONS: Array<{
  value: AgentMode;
  label: string;
  hint: string;
  description: string;
  Icon: LucideIcon;
  triggerClass: string;
  iconClass: string;
  optionClass: string;
  railClass: string;
}> = [
  {
    value: "auto",
    label: "智能调度",
    hint: "默认",
    description: "主控 Agent 判断任务，再交给最合适的专家。",
    Icon: Sparkles,
    triggerClass: "from-[#eef4ef] via-[#e3ece5] to-[#f5f0e8] text-[#26332e]",
    iconClass: "bg-white/82 text-[#587565] ring-[#bfd0c5]",
    optionClass: "border-[#d9e4dd] bg-[#f4f8f5] hover:border-[#8aa091] hover:bg-[#edf4ef]",
    railClass: "bg-[#6f8c7d]"
  },
  {
    value: "writing",
    label: "写作agent",
    hint: "撰写改稿",
    description: "处理写作、润色、改稿、结构调整和 patch。",
    Icon: PenLine,
    triggerClass: "from-[#f6eddc] via-[#efe0c0] to-[#f8f1e4] text-[#513b18]",
    iconClass: "bg-white/82 text-[#9a7131] ring-[#e3c98c]",
    optionClass: "border-[#ead8b7] bg-[#fbf5ea] hover:border-[#c09a4e] hover:bg-[#f5ead2]",
    railClass: "bg-[#c09a4e]"
  },
  {
    value: "checking",
    label: "检查agent",
    hint: "审稿诊断",
    description: "检查逻辑、证据、语气、概念对齐和风险。",
    Icon: ShieldCheck,
    triggerClass: "from-[#e7f0eb] via-[#d8e8df] to-[#f3eee5] text-[#294f42]",
    iconClass: "bg-white/82 text-[#4f846d] ring-[#b9d3c7]",
    optionClass: "border-[#d2e2da] bg-[#f1f7f3] hover:border-[#6ca48b] hover:bg-[#e5f0ea]",
    railClass: "bg-[#6ca48b]"
  },
  {
    value: "learning",
    label: "学习agent",
    hint: "参考精读",
    description: "学习参考论文，提炼语料、观点、逻辑和实验设计。",
    Icon: GraduationCap,
    triggerClass: "from-[#eeeaf3] via-[#e2d9eb] to-[#f5efe8] text-[#51445e]",
    iconClass: "bg-white/82 text-[#77628d] ring-[#d1c1dd]",
    optionClass: "border-[#ded3e7] bg-[#f7f3fa] hover:border-[#9b83b1] hover:bg-[#eee8f4]",
    railClass: "bg-[#9b83b1]"
  },
  {
    value: "retrieval",
    label: "检索agent",
    hint: "论文搜索",
    description: "检索 Semantic Scholar，推荐可加入阅读队列的论文。",
    Icon: Search,
    triggerClass: "from-[#e6f0f2] via-[#d7e8ec] to-[#f4efe7] text-[#2c5964]",
    iconClass: "bg-white/82 text-[#4d8692] ring-[#b8d3d9]",
    optionClass: "border-[#d1e2e6] bg-[#f0f7f8] hover:border-[#69a8b4] hover:bg-[#e4f0f2]",
    railClass: "bg-[#69a8b4]"
  }
];

export function ChatComposer({
  disabled,
  model,
  agentMode,
  onModelChange,
  onAgentModeChange,
  onSend
}: {
  disabled?: boolean;
  model: string;
  agentMode: AgentMode;
  onModelChange: (model: string) => void;
  onAgentModeChange: (agentMode: AgentMode) => void;
  onSend: (content: string) => void;
}) {
  const [value, setValue] = useState("");
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const selectedAgent =
    AGENT_MODE_OPTIONS.find((option) => option.value === agentMode) ?? AGENT_MODE_OPTIONS[0];
  const SelectedAgentIcon = selectedAgent.Icon;

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

        <div className="flex flex-col gap-3 px-1 pb-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-end">
            <div
              className="relative w-full sm:max-w-[360px]"
              onBlur={(event) => {
                const nextFocus = event.relatedTarget;
                if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return;
                setAgentMenuOpen(false);
              }}
            >
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-morandi-muted">
                <Bot className="h-3.5 w-3.5 text-sage-700" />
                指定agent回答
              </span>
              <button
                type="button"
                className={clsx(
                  "group relative flex h-14 w-full items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r px-3 text-left shadow-[0_12px_28px_rgba(59,52,45,0.16)] ring-1 ring-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-600/25 disabled:cursor-not-allowed disabled:opacity-60",
                  selectedAgent.triggerClass
                )}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={agentMenuOpen}
                onClick={() => setAgentMenuOpen((open) => !open)}
              >
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.28),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <span
                  className={clsx(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1",
                    selectedAgent.iconClass
                  )}
                >
                  <SelectedAgentIcon className="h-[18px] w-[18px]" />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold leading-5">{selectedAgent.label}</span>
                  <span className="block truncate text-xs leading-4 text-[#667368]">
                    {selectedAgent.hint} · {selectedAgent.description}
                  </span>
                </span>
                <ChevronDown
                  className={clsx(
                    "relative h-4 w-4 shrink-0 transition-transform duration-200",
                    agentMenuOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              {agentMenuOpen ? (
                <div
                  role="listbox"
                  className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border border-[#b8aa9c] bg-[#fbfaf7] p-1.5 shadow-[0_22px_54px_rgba(47,43,38,0.24)]"
                >
                  {AGENT_MODE_OPTIONS.map((option) => {
                    const active = option.value === agentMode;
                    const Icon = option.Icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={clsx(
                          "group relative flex min-h-[58px] w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sage-600/20",
                          active ? "bg-[#efe8dc] text-morandi-ink shadow-inner shadow-white/50" : option.optionClass
                        )}
                        onClick={() => {
                          onAgentModeChange(option.value);
                          setAgentMenuOpen(false);
                        }}
                      >
                        <span
                          className={clsx(
                            "absolute inset-y-2 left-1 w-1 rounded-full transition-all duration-200",
                            option.railClass,
                            active ? "opacity-100" : "opacity-45 group-hover:opacity-90"
                          )}
                        />
                        <span
                          className={clsx(
                            "ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-[#d8cfc4]",
                            active ? "text-morandi-ink" : option.iconClass
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold leading-5">{option.label}</span>
                            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#867768]">
                              {option.hint}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs leading-4 text-morandi-muted">
                            {option.description}
                          </span>
                        </span>
                        {active ? <Check className="h-4 w-4 shrink-0 text-sage-700" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

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
            <p className="shrink-0 pb-1 text-xs text-morandi-muted">
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
