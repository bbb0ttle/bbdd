import { useEffect, useRef, useState } from "react";
import { addTorrent, addTorrentFile } from "../api";

export function AddDialog({
  open,
  categories,
  onClose,
}: {
  open: boolean;
  categories: string[];
  onClose: () => void;
}) {
  const [urls, setUrls] = useState("");
  const [cat, setCat] = useState("movies");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<"ok" | "fail" | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setMsg(null);
      setBusy(false);
      setFiles(null);
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let ok = true;
    if (files && files.length > 0) {
      for (const f of Array.from(files)) {
        ok = (await addTorrentFile(f, cat || undefined)) && ok;
      }
    }
    if (urls.trim()) {
      ok = (await addTorrent(urls.trim(), cat || undefined)) && ok;
    }
    setBusy(false);
    setMsg(ok ? "ok" : "fail");
    if (ok) {
      setUrls("");
      setTimeout(onClose, 450);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[18vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-xl border border-hairline bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-4 text-[14px] font-medium">添加下载任务</div>
        <textarea
          ref={ref}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="magnet:?xt=urn:btih:… 每行一条"
          rows={3}
          className="w-full resize-none rounded-lg border border-hairline bg-bg px-3 py-2 font-mono text-[12px] outline-none transition-colors placeholder:text-fg-3 focus:border-hairline-strong focus:ring-2 focus:ring-accent-soft"
        />
        <div className="mt-2 flex items-center gap-2 text-[12px] text-fg-3">
          <label className="cursor-pointer rounded-md border border-hairline px-2.5 py-1 transition-colors hover:bg-white/[0.06]">
            选择 .torrent 文件
            <input
              type="file"
              accept=".torrent"
              multiple
              className="hidden"
              onChange={(e) => setFiles(e.target.files)}
            />
          </label>
          {files && files.length > 0 && (
            <span className="tnum text-fg-2">{files.length} 个文件</span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-lg border border-hairline bg-bg px-2.5 py-1.5 text-[12px] text-fg-2 outline-none"
          >
            <option value="">无分类</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            {msg === "fail" && <span className="text-[12px] text-err">添加失败</span>}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-[12px] text-fg-2 transition-colors hover:bg-white/[0.06]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy || (!urls.trim() && (!files || files.length === 0))}
              className="rounded-lg bg-fg px-3.5 py-1.5 text-[12px] font-medium text-bg transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
            >
              {busy ? "添加中…" : "添加"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
