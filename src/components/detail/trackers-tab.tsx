import { useState } from "react";
import { CopyIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as api from "@/api";
import type { Tracker } from "@/api";
import { usePoll } from "@/hooks/use-poll";
import { useStore } from "@/store";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { AddLinesButton, Toolbar } from "./list-editor";

const statusText: Record<number, [string, string]> = {
  0: ["已禁用", "text-muted-foreground"],
  1: ["未联系", "text-muted-foreground"],
  2: ["工作中", "text-success"],
  3: ["更新中", "text-info"],
  4: ["未工作", "text-destructive"],
  5: ["Tracker 错误", "text-destructive"],
  6: ["不可达", "text-warning"],
};

const n = (v: number) => (v < 0 ? "—" : v);

export function TrackersTab({ hash }: { hash: string }) {
  const { data, reload } = usePoll(() => api.getTrackers(hash), [hash], 3000);
  const { run } = useStore();
  const [editing, setEditing] = useState<Tracker | null>(null);
  const [url, setUrl] = useState("");

  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    const ok = await run(fn, msg);
    if (ok) reload();
    return ok;
  };

  if (!data) return null;
  return (
    <div>
      <Toolbar>
        <AddLinesButton
          label="添加 Tracker"
          description="每行一个 Tracker URL。"
          placeholder="udp://tracker.example.org:1337/announce"
          onSubmit={(lines) => act(() => api.addTrackers(hash, lines), `已添加 ${lines.length} 个 Tracker`)}
        />
      </Toolbar>
      <div className="divide-y divide-border/50 text-[13px]">
        {data.map((t) => {
          const isSpecial = t.url.startsWith("** [");
          const [label, tone] = statusText[t.status] ?? ["未知", "text-muted-foreground"];
          return (
            <div key={t.url} className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate", isSpecial ? "text-muted-foreground" : "font-mono text-xs")} title={t.url}>
                    {t.url}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tnum">
                  <span className={tone}>{label}</span>
                  {!isSpecial && <span>层级 {t.tier}</span>}
                  <span>种子 {n(t.num_seeds)}</span>
                  <span>用户 {n(t.num_leeches)}</span>
                  <span>节点 {n(t.num_peers)}</span>
                  <span>已下载 {n(t.num_downloaded)}</span>
                </div>
                {t.msg && <div className="text-xs text-muted-foreground break-all">{t.msg}</div>}
              </div>
              {!isSpecial && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Tracker 操作">
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(t);
                        setUrl(t.url);
                      }}
                    >
                      <PencilIcon /> 编辑 URL…
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => copyText(t.url)}>
                      <CopyIcon /> 复制 URL
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => act(() => api.removeTrackers(hash, [t.url]))}>
                      <Trash2Icon /> 移除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑 Tracker</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (editing && (await act(() => api.editTracker(hash, editing.url, url.trim())))) setEditing(null);
            }}
          >
            <Input autoFocus className="h-10 font-mono text-xs" value={url} onChange={(e) => setUrl(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                取消
              </Button>
              <Button type="submit" disabled={!url.trim() || url.trim() === editing?.url}>
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
