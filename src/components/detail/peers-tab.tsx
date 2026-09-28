import { useEffect, useRef, useState } from "react";
import { BanIcon, CopyIcon, MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as api from "@/api";
import type { Peer } from "@/api";
import { useStore } from "@/store";
import { copyText } from "@/lib/clipboard";
import { fmtBytes, fmtPct, fmtSpeed } from "@/lib/format";
import { AddLinesButton, Toolbar } from "./list-editor";

function flag(code?: string) {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

export function PeersTab({ hash }: { hash: string }) {
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const { run } = useStore();
  const rid = useRef(0);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    rid.current = 0;
    setPeers(new Map());
    setLoaded(false);
    const tick = async () => {
      try {
        const d = await api.syncPeers(hash, rid.current);
        if (!alive) return;
        rid.current = d.rid;
        setPeers((prev) => {
          const next = new Map(d.full_update ? [] : prev);
          for (const [k, v] of Object.entries(d.peers ?? {})) next.set(k, { ...(next.get(k) ?? ({} as Peer)), ...v } as Peer);
          for (const k of d.peers_removed ?? []) next.delete(k);
          return next;
        });
        setLoaded(true);
      } catch {
        /* ignore */
      }
      if (alive) timer = window.setTimeout(tick, 2000);
    };
    tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [hash]);

  const list = [...peers.entries()].sort((a, b) => b[1].dl_speed + b[1].up_speed - (a[1].dl_speed + a[1].up_speed));
  if (!loaded) return null;

  return (
    <div>
      <Toolbar>
        <AddLinesButton
          label="添加用户"
          description="每行一个 IP:端口。"
          placeholder="192.0.2.10:6881"
          onSubmit={(lines) => run(() => api.addPeers([hash], lines), "已添加用户")}
        />
        <span className="ml-auto text-xs text-muted-foreground tnum">{list.length} 个连接</span>
      </Toolbar>
      {list.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">当前没有已连接的用户。</p>
      ) : (
        <div className="divide-y divide-border/50 text-[13px]">
          {list.map(([key, p]) => (
            <div key={key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
              <span className="w-5 text-center text-base" title={p.country}>
                {flag(p.country_code)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-xs">
                    {p.ip}:{p.port}
                  </span>
                  <span className="rounded border px-1 text-[10px] text-muted-foreground">{p.connection}</span>
                  {p.flags && (
                    <span className="font-mono text-[10px] text-muted-foreground" title={p.flags_desc}>
                      {p.flags}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">{p.client || "未知客户端"}</div>
              </div>
              <div className="hidden w-14 text-right text-xs text-muted-foreground tnum sm:block">{fmtPct(p.progress)}</div>
              <div className="w-24 text-right text-xs tnum">
                <div className="text-info">↓ {fmtSpeed(p.dl_speed)}</div>
                <div className="text-success">↑ {fmtSpeed(p.up_speed)}</div>
              </div>
              <div className="hidden w-20 text-right text-xs text-muted-foreground tnum lg:block">
                <div>{fmtBytes(p.downloaded)}</div>
                <div>{fmtBytes(p.uploaded)}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="用户操作">
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onSelect={() => copyText(`${p.ip}:${p.port}`)}>
                    <CopyIcon /> 复制 IP:端口
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onSelect={() => run(() => api.banPeers([`${p.ip}:${p.port}`]), "已永久封禁该用户")}>
                    <BanIcon /> 永久封禁
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
