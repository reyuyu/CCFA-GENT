import { KeyRound, Power, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchLocalConfig,
  saveLocalConfig,
  shutdownLocalServices,
  type LocalConfig
} from "../../agent/localConfigApi";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const defaultForm = {
  deepseekApiKey: "",
  deepseekBaseUrl: "https://api.deepseek.com",
  deepseekModel: "deepseek-v4-pro",
  semanticScholarApiKey: "",
  semanticScholarBaseUrl: "https://api.semanticscholar.org/graph/v1",
  mineruApiToken: "",
  mineruParseMode: "precision"
};

function ConfigStatus({ configured }: { configured: boolean }) {
  return <Badge tone={configured ? "green" : "amber"}>{configured ? "已配置" : "未配置"}</Badge>;
}

export function LocalConfigPanel() {
  const [config, setConfig] = useState<LocalConfig | undefined>();
  const [form, setForm] = useState(defaultForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadConfig = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const nextConfig = await fetchLocalConfig();
      setConfig(nextConfig);
      setForm((current) => ({
        ...current,
        deepseekBaseUrl: nextConfig.deepseekBaseUrl || current.deepseekBaseUrl,
        deepseekModel: nextConfig.deepseekModel || current.deepseekModel,
        semanticScholarBaseUrl: nextConfig.semanticScholarBaseUrl || current.semanticScholarBaseUrl,
        mineruParseMode: nextConfig.mineruParseMode || current.mineruParseMode
      }));
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "无法连接本地后端，请先运行 start-local.ps1。"
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const nextConfig = await saveLocalConfig({
        deepseekApiKey: form.deepseekApiKey,
        deepseekBaseUrl: form.deepseekBaseUrl,
        deepseekModel: form.deepseekModel,
        semanticScholarApiKey: form.semanticScholarApiKey,
        semanticScholarBaseUrl: form.semanticScholarBaseUrl,
        mineruApiToken: form.mineruApiToken,
        mineruParseMode: form.mineruParseMode
      });
      setConfig(nextConfig);
      setForm((current) => ({
        ...current,
        deepseekApiKey: "",
        semanticScholarApiKey: "",
        mineruApiToken: ""
      }));
      setMessage("配置已保存到后端 .env，新的请求会立即使用。");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "保存配置失败。");
    } finally {
      setBusy(false);
    }
  };

  const shutdown = async () => {
    const confirmed = window.confirm(
      "确定要关闭本地前后端服务吗？关闭后当前页面将无法继续连接，重新使用需要再次运行启动脚本。"
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await shutdownLocalServices();
      setMessage(
        `${result.message} 后端进程：${result.backendPids.join(", ") || "未检测到"}；前端进程：${
          result.frontendPids.join(", ") || "未检测到"
        }。`
      );
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "关闭本地服务失败。");
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-[#b8afa4]/70 bg-[#f7f3ee]/82 p-5 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-morandi-green text-sage-700">
              <KeyRound className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-morandi-ink">本地 API 配置</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-morandi-muted">
            Key 只会写入本机后端的 <code>.env</code>，不会保存到浏览器工程，也不会提交到 Git。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            icon={<RefreshCw className="h-4 w-4" />}
            disabled={busy}
            onClick={() => void loadConfig()}
          >
            刷新状态
          </Button>
          <Button
            variant="danger"
            icon={<Power className="h-4 w-4" />}
            disabled={busy}
            onClick={() => void shutdown()}
          >
            关闭本地服务
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-morandi-clay/70 bg-[#fbfaf7]/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-morandi-ink">DeepSeek</h3>
            <ConfigStatus configured={Boolean(config?.deepseekApiKeyConfigured)} />
          </div>
          <Input
            className="mt-3"
            type="password"
            value={form.deepseekApiKey}
            onChange={(event) => update("deepseekApiKey", event.target.value)}
            placeholder={config?.deepseekApiKeyConfigured ? "留空则保留原 Key" : "填写 DeepSeek API Key"}
          />
          <Input
            className="mt-2"
            value={form.deepseekBaseUrl}
            onChange={(event) => update("deepseekBaseUrl", event.target.value)}
            placeholder="DeepSeek Base URL"
          />
          <Input
            className="mt-2"
            value={form.deepseekModel}
            onChange={(event) => update("deepseekModel", event.target.value)}
            placeholder="deepseek-v4-pro"
          />
        </div>

        <div className="rounded-lg border border-morandi-clay/70 bg-[#fbfaf7]/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-morandi-ink">Semantic Scholar</h3>
            <ConfigStatus configured={Boolean(config?.semanticScholarApiKeyConfigured)} />
          </div>
          <Input
            className="mt-3"
            type="password"
            value={form.semanticScholarApiKey}
            onChange={(event) => update("semanticScholarApiKey", event.target.value)}
            placeholder={config?.semanticScholarApiKeyConfigured ? "留空则保留原 Key" : "可选 API Key"}
          />
          <Input
            className="mt-2"
            value={form.semanticScholarBaseUrl}
            onChange={(event) => update("semanticScholarBaseUrl", event.target.value)}
            placeholder="Semantic Scholar Base URL"
          />
        </div>

        <div className="rounded-lg border border-morandi-clay/70 bg-[#fbfaf7]/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-morandi-ink">MinerU PDF</h3>
            <ConfigStatus configured={Boolean(config?.mineruApiTokenConfigured)} />
          </div>
          <Input
            className="mt-3"
            type="password"
            value={form.mineruApiToken}
            onChange={(event) => update("mineruApiToken", event.target.value)}
            placeholder={config?.mineruApiTokenConfigured ? "留空则保留原 Token" : "可选 MinerU Token"}
          />
          <Input
            className="mt-2"
            value={form.mineruParseMode}
            onChange={(event) => update("mineruParseMode", event.target.value)}
            placeholder="precision"
          />
        </div>
      </div>

      {config?.envPath ? (
        <p className="mt-3 text-xs text-morandi-muted">当前配置文件：{config.envPath}</p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-sage-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex justify-end">
        <Button variant="primary" icon={<Save className="h-4 w-4" />} disabled={busy} onClick={submit}>
          保存本地配置
        </Button>
      </div>
    </section>
  );
}
