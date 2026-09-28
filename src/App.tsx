import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkAuth,
  del,
  pause,
  resume,
  syncMainData,
  type ServerState,
  type Torrent,
} from "./api";
import { fmtBytes, fmtSpeed } from "./format";
import { Login } from "./components/Login";
import { TorrentRow } from "./components/TorrentRow";
import { AddDialog } from "./components/AddDialog";

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [torrents, setTorrents] = useState<Map<string, Torrent>>(new Map());
  const [server, setServer] = useState<Partial<ServerState>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [connErr, setConnErr] = useState(false);
  const rid = useRef(0);

  useEffect(() => {
    checkAuth()
      .then(setAuthed)
      .catch(() => setAuthed(false));
  }, []);

  const poll = useCallback(async () => {
    try {
      const d = await syncMainData(rid.current);
      if (d.rid !== undefined) rid.current = d.rid;
      if (d.full_update) setTorrents(new Map());
      if (d.torrents) {
        setTorrents((prev) => {
          const next = new Map(prev);
          for (const [h, patch] of Object.entries(d.torrents!)) {
            const old = next.get(h);
            next.set(h, { ...(old ?? ({ hash: h } as Torrent)), ...(patch as Torrent) });
          }
          return next;
        });
      }
      if (d.torrents_removed?.length) {
        setTorrents((prev) => {
          const next = new Map(prev);
          for (const h of d.torrents_removed!) next.delete(h);
          return next;
        });
        setSelected((prev) => {
          const next = new Set(prev);
          for (const h of d.torrents_removed!) next.delete(h);
          return next;
        });
      }
      if (d.server_state) setServer((p) => ({ ...p, ...d.server_state }));
      if (d.categories) setCategories(Object.keys(d.categories));
      setConnErr(false);
    } catch {
      setConnErr(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [authed, poll]);

  const list = useMemo(() => {
    const arr = [...torrents.values()];
    const q = query.trim().toLowerCase();
    const filtered = q ? arr.filter((t) => t.name.toLowerCase().includes(q)) : arr;
    return filtered.sort(
      (a, b) => (b.state === "downloading" ? 1 : 0) - (a.state === "downloading" ? 1 : 0) || (b.added_on ?? 0) - (a.added_on ?? 0),
    );
  }, [torrents, query]);

  function toggle(h: string, shift: boolean) {
    setSelected((prev) => {
      const next = new Set(shift ? prev : []);
      if (prev.has(h) && shift) next.delete(h);
      else if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  const sel = [...selected];
  const allChecked = sel.length > 0 && sel.length === list.length;

  if (authed === null)
    return <div className="min-h-screen" />;
  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-[1100px] items-center gap-4 px-4">
          <div className="text-[14px] font-semibold tracking-tight">Downloads</div>
          <div className="ml-auto flex items-center gap-4 text-[12px] text-fg-2">
            <span className="tnum hidden sm:inline">
              ↓ {fmtSpeed(server.dl_info_speed ?? 0)}&nbsp;&nbsp;↑ {fmtSpeed(server.up_info_speed ?? 0)}
            </span>
            <span className="tnum hidden md:inline">剩余 {fmtBytes(server.free_space_on_disk ?? 0)}</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connErr ? "bg-err" : "bg-ok"
              }`}
              title={connErr ? "连接中断" : "已连接"}
            />
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-lg bg-fg px-3 py-1.5 text-[12px] font-medium text-bg transition-all hover:opacity-90 active:scale-[0.97]"
            >
              添加任务
            </button>
          </div>
        </div>
      </header>

      {/* toolbar */}
      <div className="mx-auto max-w-[1100px] px-4 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索任务…"
            className="w-56 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-[12px] outline-none transition-colors placeholder:text-fg-3 focus:border-hairline-strong focus:ring-2 focus:ring-accent-soft"
          />
          <span className="text-[12px] text-fg-3">
            {list.length} 个任务{selected.size > 0 && `，已选 ${selected.size}`}
          </span>
          {sel.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <BulkBtn onClick={() => resume(sel)}>继续</BulkBtn>
              <BulkBtn onClick={() => pause(sel)}>暂停</BulkBtn>
              <BulkBtn danger onClick={() => { del(sel, false); setSelected(new Set()); }}>
                移除
              </BulkBtn>
              <BulkBtn
                danger
                onClick={() => {
                  if (confirm(`删除 ${sel.length} 个任务及其文件？`)) {
                    del(sel, true);
                    setSelected(new Set());
                  }
                }}
              >
                删文件
              </BulkBtn>
            </div>
          )}
        </div>

        {/* list */}
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <div
            className="flex cursor-pointer items-center gap-4 border-b border-hairline px-4 py-2 text-[11px] uppercase tracking-wider text-fg-3 hover:bg-white/[0.02]"
            onClick={() =>
              setSelected(allChecked ? new Set() : new Set(list.map((t) => t.hash)))
            }
          >
            <div
              className={`h-3.5 w-3.5 rounded border transition-colors ${
                allChecked ? "border-accent bg-accent" : "border-hairline-strong"
              }`}
            />
            <span className="flex-1">名称</span>
            <span className="hidden w-[300px] text-right md:block">状态</span>
          </div>
          {list.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-[13px] text-fg-3">
              {query ? "无匹配任务" : "暂无下载任务"}
            </div>
          ) : (
            list.map((t) => (
              <TorrentRow key={t.hash} t={t} selected={selected.has(t.hash)} onToggle={toggle} />
            ))
          )}
        </div>

        <div className="py-6 text-center text-[11px] text-fg-3">
          qBittorrent · {fmtBytes(server.dl_info_data ?? 0)} ↓ / {fmtBytes(server.up_info_data ?? 0)} ↑ 本会话
        </div>
      </div>

      <AddDialog open={addOpen} categories={categories} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function BulkBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[12px] transition-colors ${
        danger
          ? "border-err/40 text-err hover:bg-err-soft"
          : "border-hairline text-fg-2 hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}
