import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PageHeader } from "@/components/layout/page-header";
import * as api from "@/api";
import type { LogEntry, PeerLogEntry } from "@/api";
import { cn } from "@/lib/utils";

const levels = [
  { v: "1", label: "普通", cls: "text-foreground" },
  { v: "2", label: "信息", cls: "text-info" },
  { v: "4", label: "警告", cls: "text-warning" },
  { v: "8", label: "严重", cls: "text-destructive" },
];

const time = (sec: number) => new Date(sec * 1000).toLocaleString("zh-CN", { hour12: false });

function useIncremental<T extends { id: number }>(fetcher: (last: number) => Promise<T[]>, enabled: boolean) {
  const [rows, setRows] = useState<T[]>([]);
  const last = useRef(-1);
  const f = useRef(fetcher);
  f.current = fetcher;
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const d = await f.current(last.current);
        if (alive && d.length) {
          last.current = d[d.length - 1].id;
          setRows((p) => [...p, ...d].slice(-5000));
        }
      } catch {
        /* ignore */
      }
      if (alive) timer = window.setTimeout(tick, 3000);
    };
    tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [enabled]);
  return rows;
}

export function LogView() {
  const [tab, setTab] = useState("main");
  const [lv, setLv] = useState<string[]>(["1", "2", "4", "8"]);
  const [q, setQ] = useState("");
  const main = useIncremental<LogEntry>(api.getLog, tab === "main");
  const peers = useIncremental<PeerLogEntry>(api.getPeerLog, tab === "peers");

  const mainRows = useMemo(() => {
    const s = q.toLowerCase();
    return main.filter((r) => lv.includes(String(r.type)) && (!s || r.message.toLowerCase().includes(s))).reverse();
  }, [main, lv, q]);
  const peerRows = useMemo(() => {
    const s = q.toLowerCase();
    return peers.filter((r) => !s || r.ip.includes(s) || r.reason.toLowerCase().includes(s)).reverse();
  }, [peers, q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="日志">
        <Tabs value={tab} onValueChange={setTab} className="ml-2">
          <TabsList>
            <TabsTrigger value="main" className="px-3">
              常规
            </TabsTrigger>
            <TabsTrigger value="peers" className="px-3">
              被封禁的 IP
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-2">
          {tab === "main" && (
            <ToggleGroup type="multiple" variant="outline" value={lv} onValueChange={setLv} className="hidden md:flex">
              {levels.map((l) => (
                <ToggleGroupItem key={l.v} value={l.v} className="h-9 px-3 text-xs">
                  {l.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
          <InputGroup className="h-9 w-48 sm:w-64">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput placeholder="筛选" value={q} onChange={(e) => setQ(e.target.value)} />
          </InputGroup>
        </div>
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-auto font-mono text-xs">
        {tab === "main"
          ? mainRows.map((r) => {
              const l = levels.find((x) => x.v === String(r.type));
              return (
                <div key={r.id} className="flex gap-4 border-b border-border/40 px-4 py-2 hover:bg-muted/30">
                  <span className="shrink-0 text-muted-foreground tnum">{time(r.timestamp)}</span>
                  <span className={cn("w-8 shrink-0", l?.cls)}>{l?.label}</span>
                  <span className={cn("min-w-0 break-all", l?.cls)}>{r.message}</span>
                </div>
              );
            })
          : peerRows.map((r) => (
              <div key={r.id} className="flex gap-4 border-b border-border/40 px-4 py-2 hover:bg-muted/30">
                <span className="shrink-0 text-muted-foreground tnum">{time(r.timestamp)}</span>
                <span className="w-36 shrink-0">{r.ip}</span>
                <span className={cn("w-10 shrink-0", r.blocked ? "text-destructive" : "text-warning")}>{r.blocked ? "封禁" : "禁止"}</span>
                <span className="min-w-0 break-all text-muted-foreground">{r.reason}</span>
              </div>
            ))}
      </div>
    </div>
  );
}
