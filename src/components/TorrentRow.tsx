import type { Torrent } from "../api";
import { pause, resume, del, recheck, reannounce } from "../api";
import { fmtBytes, fmtEta, fmtSpeed, fmtRatio } from "../format";
import { Badge } from "./Badge";
import { stateKind } from "../state";

export function TorrentRow({
  t,
  selected,
  onToggle,
  onOpen,
}: {
  t: Torrent;
  selected: boolean;
  onToggle: (h: string, shift: boolean) => void;
  onOpen: (h: string) => void;
}) {
  const k = stateKind(t.state);
  const pct = Math.round(t.progress * 1000) / 10;
  const act = (fn: (h: string[]) => Promise<Response> | Promise<void>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn([t.hash]);
  };
  return (
    <div
      onClick={() => onOpen(t.hash)}
      className={`row-in group flex cursor-pointer items-center gap-4 border-b border-hairline/60 px-4 py-3 transition-colors last:border-0 hover:bg-white/[0.025] ${
        selected ? "bg-accent-soft/60" : ""
      }`}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggle(t.hash, e.shiftKey);
        }}
        className={`h-3.5 w-3.5 shrink-0 rounded border transition-colors ${
          selected ? "border-accent bg-accent" : "border-hairline-strong group-hover:border-fg-3"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-[13px] font-medium tracking-[-0.01em]">{t.name}</span>
          <Badge state={t.state} />
          {t.category && (
            <span className="hidden sm:inline rounded border border-hairline px-1.5 py-px text-[10px] text-fg-3">
              {t.category}
            </span>
          )}
          <span className="ml-auto hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 md:flex">
            <MiniBtn title="继续" onClick={act(resume)}>⏵</MiniBtn>
            <MiniBtn title="暂停" onClick={act(pause)}>⏸</MiniBtn>
            <MiniBtn title="重新校验" onClick={act(recheck)}>↻</MiniBtn>
            <MiniBtn title="重新汇报" onClick={act(reannounce)}>⇄</MiniBtn>
            <MiniBtn
              title="删除（保留文件）"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`移除任务「${t.name}」？（保留已下载文件）`)) del([t.hash], false);
              }}
            >
              ✕
            </MiniBtn>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                k === "down" ? "bg-accent" : t.progress >= 1 ? "bg-ok" : "bg-fg-3"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="tnum w-12 shrink-0 text-right text-[12px] text-fg-2">{pct}%</span>
        </div>
      </div>
      <div className="hidden w-[300px] shrink-0 grid-cols-4 gap-2 text-right text-[12px] text-fg-2 md:grid">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-3">大小</div>
          <div className="tnum">{fmtBytes(t.size)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-3">下载</div>
          <div className={`tnum ${t.dlspeed > 0 ? "text-accent" : ""}`}>{fmtSpeed(t.dlspeed)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-3">剩余</div>
          <div className="tnum">{fmtEta(t.eta)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-fg-3">做种</div>
          <div className="tnum">
            {t.num_seeds}/{t.num_leechs} · {fmtRatio(t.ratio)}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded px-1.5 py-0.5 text-[12px] text-fg-3 transition-colors hover:bg-white/[0.08] hover:text-fg"
    >
      {children}
    </button>
  );
}
