import { useEffect, useState } from "react";
import { getFiles, getProps, type Torrent, type TorrentFile, type TorrentProps } from "../api";
import { fmtBytes, fmtEta, fmtSpeed, fmtRatio } from "../format";
import { stateLabel } from "../state";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[12px] text-fg-3">{k}</span>
      <span className="tnum truncate text-right text-[12px] text-fg">{v}</span>
    </div>
  );
}

function fmtTime(sec?: number) {
  if (sec === undefined || sec < 0) return "—";
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时`;
  return `${Math.floor(sec / 86400)} 天 ${Math.floor((sec % 86400) / 3600)} 小时`;
}

function host(uri?: string): string {
  if (!uri) return "—";
  const m = uri.match(/^(?:https?|udp):\/\/([^:/]+)/);
  return m?.[1] ?? uri;
}

export function DetailPanel({ t, onClose }: { t: Torrent; onClose: () => void }) {
  const [props, setProps] = useState<TorrentProps | null>(null);
  const [files, setFiles] = useState<TorrentFile[] | null>(null);
  const [tab, setTab] = useState<"info" | "files">("info");

  useEffect(() => {
    setProps(null);
    setFiles(null);
    setTab("info");
    getProps(t.hash).then(setProps).catch(() => {});
    getFiles(t.hash).then(setFiles).catch(() => {});
  }, [t.hash]);

  return (
    <div className="mt-3 rounded-xl border border-hairline bg-surface">
      <div className="flex items-center gap-1 border-b border-hairline px-4 pt-2">
        <button
          onClick={() => setTab("info")}
          className={`rounded-t-md px-3 py-1.5 text-[12px] transition-colors ${
            tab === "info" ? "border-b-2 border-fg text-fg" : "text-fg-2 hover:text-fg"
          }`}
        >
          概览
        </button>
        <button
          onClick={() => setTab("files")}
          className={`rounded-t-md px-3 py-1.5 text-[12px] transition-colors ${
            tab === "files" ? "border-b-2 border-fg text-fg" : "text-fg-2 hover:text-fg"
          }`}
        >
          文件 {files ? `(${files.length})` : ""}
        </button>
        <button
          onClick={onClose}
          className="ml-auto mb-1 rounded-md px-2 py-1 text-[12px] text-fg-3 hover:bg-white/[0.06] hover:text-fg"
        >
          ✕ 关闭
        </button>
      </div>

      {tab === "info" ? (
        <div className="grid grid-cols-1 gap-x-8 px-4 py-3 sm:grid-cols-2">
          <Row k="名称" v={t.name} />
          <Row k="状态" v={stateLabel(t.state)} />
          <Row k="大小" v={fmtBytes(t.size)} />
          <Row k="已下载" v={fmtBytes(props?.downloaded ?? t.downloaded ?? 0)} />
          <Row k="已上传" v={fmtBytes(props?.uploaded ?? t.uploaded ?? 0)} />
          <Row k="分享率" v={fmtRatio(t.ratio)} />
          <Row k="下载速度" v={fmtSpeed(t.dlspeed)} />
          <Row k="上传速度" v={fmtSpeed(t.upspeed)} />
          <Row k="剩余时间" v={fmtEta(t.eta)} />
          <Row k="做种耗时" v={fmtTime(props?.seeding_time)} />
          <Row k="耗时" v={fmtTime(props?.time_elapsed)} />
          <Row k="Tracker" v={host(props?.tracker ?? t.tracker)} />
          <Row k="保存位置" v={props?.save_path ?? t.save_path ?? "—"} />
          <Row k="分类" v={t.category || "—"} />
          <Row k="标签" v={t.tags || "—"} />
          <Row k="加入时间" v={t.added_on ? new Date(t.added_on * 1000).toLocaleString("zh-CN") : "—"} />
        </div>
      ) : (
        <div className="max-h-[320px] overflow-auto px-4 py-2">
          {(files ?? []).map((f) => (
            <div key={f.index} className="flex items-center gap-3 border-b border-hairline/50 py-1.5 last:border-0">
              <span className="min-w-0 flex-1 truncate text-[12px]">{f.name}</span>
              <span className="tnum w-16 text-right text-[11px] text-fg-3">{fmtBytes(f.size)}</span>
              <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-fg-3" style={{ width: `${f.progress * 100}%` }} />
              </div>
              <span className="tnum w-12 text-right text-[11px] text-fg-2">
                {Math.round(f.progress * 100)}%
              </span>
            </div>
          ))}
          {files === null && <div className="py-6 text-center text-[12px] text-fg-3">加载中…</div>}
        </div>
      )}
    </div>
  );
}
