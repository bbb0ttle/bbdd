import { useEffect, useState } from "react";
import { getPreferences, setPreferences, type Preferences } from "../api";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-[12.5px] text-fg-2">{label}</span>
      {children}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  suffix,
  divisor = 1024,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix: string;
  divisor?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={Math.round(value / divisor)}
        onChange={(e) => onChange((parseInt(e.target.value) || 0) * divisor)}
        className="w-24 rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-right text-[12px] outline-none tnum focus:border-hairline-strong focus:ring-2 focus:ring-accent-soft"
      />
      <span className="text-[11px] text-fg-3">{suffix}</span>
    </div>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "fail">("idle");

  useEffect(() => {
    if (open) {
      setSaved("idle");
      getPreferences().then(setPrefs).catch(() => setPrefs({}));
    }
  }, [open]);

  if (!open) return null;

  async function save() {
    if (!prefs) return;
    setSaved("saving");
    const ok = await setPreferences({
      save_path: prefs.save_path,
      dl_limit: prefs.dl_limit,
      up_limit: prefs.up_limit,
      alt_dl_limit: prefs.alt_dl_limit,
      alt_up_limit: prefs.alt_up_limit,
      queueing_enabled: prefs.queueing_enabled,
      max_active_downloads: prefs.max_active_downloads,
      max_active_uploads: prefs.max_active_uploads,
      max_active_torrents: prefs.max_active_torrents,
    });
    setSaved(ok ? "ok" : "fail");
    if (ok) setTimeout(onClose, 500);
  }

  const set = (k: keyof Preferences, v: unknown) =>
    setPrefs((p) => (p ? { ...p, [k]: v } : p));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-xl border border-hairline bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-2 text-[14px] font-medium">设置</div>
        {!prefs ? (
          <div className="py-10 text-center text-[12px] text-fg-3">加载中…</div>
        ) : (
          <>
            <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-widest text-fg-3">速率限制（0 = 不限）</div>
            <Field label="下载速度上限">
              <NumInput value={prefs.dl_limit ?? 0} onChange={(v) => set("dl_limit", v)} suffix="KiB/s" />
            </Field>
            <Field label="上传速度上限">
              <NumInput value={prefs.up_limit ?? 0} onChange={(v) => set("up_limit", v)} suffix="KiB/s" />
            </Field>
            <div className="mt-3 px-1 pb-1 text-[10px] font-medium uppercase tracking-widest text-fg-3">队列</div>
            <Field label="启用队列">
              <input
                type="checkbox"
                checked={!!prefs.queueing_enabled}
                onChange={(e) => set("queueing_enabled", e.target.checked)}
                className="h-4 w-4 accent-[#0070f3]"
              />
            </Field>
            <Field label="最大同时下载">
              <NumInput value={prefs.max_active_downloads ?? 0} onChange={(v) => set("max_active_downloads", v)} suffix="个" divisor={1} />
            </Field>
            <Field label="最大同时做种">
              <NumInput value={prefs.max_active_uploads ?? 0} onChange={(v) => set("max_active_uploads", v)} suffix="个" divisor={1} />
            </Field>
            <Field label="最大活动任务">
              <NumInput value={prefs.max_active_torrents ?? 0} onChange={(v) => set("max_active_torrents", v)} suffix="个" divisor={1} />
            </Field>
            <div className="mt-3 px-1 pb-1 text-[10px] font-medium uppercase tracking-widest text-fg-3">目录</div>
            <Field label="默认保存路径">
              <input
                value={prefs.save_path ?? ""}
                onChange={(e) => set("save_path", e.target.value)}
                className="w-56 rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-[12px] outline-none font-mono focus:border-hairline-strong focus:ring-2 focus:ring-accent-soft"
              />
            </Field>
          </>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          {saved === "fail" && <span className="text-[12px] text-err">保存失败</span>}
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[12px] text-fg-2 transition-colors hover:bg-white/[0.06]"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={saved === "saving" || !prefs}
            className="rounded-lg bg-fg px-3.5 py-1.5 text-[12px] font-medium text-bg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
          >
            {saved === "saving" ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
