import { useMemo, useState } from "react";
import { ChevronRightIcon, FileIcon, FolderIcon, PencilIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as api from "@/api";
import type { TorrentFile } from "@/api";
import { usePoll } from "@/hooks/use-poll";
import { useStore } from "@/store";
import { fmtBytes, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const prios = [
  { v: 0, label: "不下载" },
  { v: 1, label: "正常" },
  { v: 6, label: "高" },
  { v: 7, label: "最高" },
];

interface Node {
  name: string;
  path: string;
  file?: TorrentFile;
  children: Map<string, Node>;
  size: number;
  done: number;
  ids: number[];
}

function build(files: TorrentFile[]): Node {
  const root: Node = { name: "", path: "", children: new Map(), size: 0, done: 0, ids: [] };
  for (const f of files) {
    const parts = f.name.split("/");
    let cur = root;
    cur.size += f.size;
    cur.done += f.size * f.progress;
    cur.ids.push(f.index);
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      let next = cur.children.get(part);
      if (!next) {
        next = { name: part, path, children: new Map(), size: 0, done: 0, ids: [] };
        cur.children.set(part, next);
      }
      next.size += f.size;
      next.done += f.size * f.progress;
      next.ids.push(f.index);
      if (i === parts.length - 1) next.file = f;
      cur = next;
    });
  }
  return root;
}

export function FilesTab({ hash }: { hash: string }) {
  const { data, reload } = usePoll(() => api.getFiles(hash), [hash], 3000);
  const { run } = useStore();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<Node | null>(null);
  const [newName, setNewName] = useState("");
  const tree = useMemo(() => build(data ?? []), [data]);
  const byId = useMemo(() => new Map((data ?? []).map((f) => [f.index, f])), [data]);

  const setPrio = async (ids: number[], p: number) => {
    await run(() => api.setFilePrio(hash, ids, p));
    reload();
  };

  const prioOf = (n: Node): number | "mixed" => {
    const ps = new Set(n.ids.map((i) => byId.get(i)?.priority ?? 1));
    return ps.size === 1 ? [...ps][0] : "mixed";
  };

  const rows: { node: Node; depth: number }[] = [];
  const walk = (n: Node, depth: number) => {
    const kids = [...n.children.values()].sort((a, b) => {
      if (!!a.file !== !!b.file) return a.file ? 1 : -1;
      return a.name.localeCompare(b.name, "zh-CN", { numeric: true });
    });
    for (const k of kids) {
      rows.push({ node: k, depth });
      if (!k.file && !collapsed.has(k.path)) walk(k, depth + 1);
    }
  };
  walk(tree, 0);

  const submitRename = async () => {
    if (!renaming || !newName.trim()) return;
    const parent = renaming.path.split("/").slice(0, -1).join("/");
    const target = parent ? `${parent}/${newName.trim()}` : newName.trim();
    const ok = await run(() =>
      renaming.file ? api.renameFile(hash, renaming.path, target) : api.renameFolder(hash, renaming.path, target),
    );
    if (ok) {
      setRenaming(null);
      reload();
    }
  };

  if (!data) return null;

  return (
    <div className="text-[13px]">
      {rows.map(({ node, depth }) => {
        const p = prioOf(node);
        const pct = node.size ? node.done / node.size : 1;
        const isDir = !node.file;
        const open = !collapsed.has(node.path);
        return (
          <div
            key={node.path}
            className="group flex h-11 items-center gap-2 border-b border-border/50 pr-3 hover:bg-muted/40"
            style={{ paddingLeft: 12 + depth * 18 }}
          >
            <Checkbox
              aria-label={`下载 ${node.name}`}
              checked={p === "mixed" ? "indeterminate" : p !== 0}
              onCheckedChange={(v) => setPrio(node.ids, v ? 1 : 0)}
            />
            {isDir ? (
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() => {
                  const next = new Set(collapsed);
                  if (open) next.add(node.path);
                  else next.delete(node.path);
                  setCollapsed(next);
                }}
              >
                <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
                <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{node.name}</span>
              </button>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-5.5">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className={cn("truncate", p === 0 && "text-muted-foreground line-through decoration-muted-foreground/40")} title={node.name}>
                  {node.name}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
              aria-label={`重命名 ${node.name}`}
              onClick={() => {
                setRenaming(node);
                setNewName(node.name);
              }}
            >
              <PencilIcon className="size-4" />
            </Button>
            <span className="hidden w-16 text-right text-muted-foreground tnum sm:block">{fmtBytes(node.size)}</span>
            <span className="w-12 text-right text-muted-foreground tnum">{fmtPct(pct)}</span>
            <Select value={p === "mixed" ? "" : String(p)} onValueChange={(v) => setPrio(node.ids, Number(v))}>
              <SelectTrigger size="sm" className="w-[92px] text-xs" aria-label="优先级">
                <SelectValue placeholder="混合" />
              </SelectTrigger>
              <SelectContent align="end">
                {prios.map((x) => (
                  <SelectItem key={x.v} value={String(x.v)}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名{renaming?.file ? "文件" : "文件夹"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
            className="space-y-4"
          >
            <Input autoFocus className="h-10" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>
                取消
              </Button>
              <Button type="submit" disabled={!newName.trim()}>
                重命名
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
