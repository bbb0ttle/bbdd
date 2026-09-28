import { useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowDownIcon, ArrowUpIcon, Columns3Icon, InboxIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { Torrent } from "@/api";
import { cn } from "@/lib/utils";
import { fmtBytes, fmtEta, fmtPct, fmtSpeed } from "@/lib/format";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useUI } from "@/ui-state";
import { columns, defaultVisible, ProgressBar, type ColumnId } from "./columns";
import { StateBadge } from "./state-badge";
import { TorrentActions, contextKit } from "./torrent-actions";

type SortKey = ColumnId | "name";

export function TorrentTable({ torrents }: { torrents: Torrent[] }) {
  const { selected, setSelected, detail, setDetail } = useUI();
  const [visible, setVisible] = usePersistentState("columns", defaultVisible);
  const [sort, setSort] = usePersistentState<{ key: SortKey; desc: boolean }>("sort", {
    key: "added_on",
    desc: true,
  });
  const anchor = useRef<string | null>(null);
  const [menuHashes, setMenuHashes] = useState<string[]>([]);

  const cols = columns.filter((c) => visible[c.id]);
  const template = `20px minmax(240px,1fr) ${cols.map((c) => c.width).join(" ")} 32px`;

  const rows = useMemo(() => {
    const col = columns.find((c) => c.id === sort.key);
    const key = (t: Torrent) => (col ? col.sort(t) : t.name.toLowerCase());
    const out = [...torrents].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      const r = typeof x === "string" ? x.localeCompare(String(y), "zh-CN") : x - (y as number);
      return sort.desc ? -r : r;
    });
    return out;
  }, [torrents, sort]);

  const allChecked = rows.length > 0 && rows.every((t) => selected.has(t.hash));
  const someChecked = rows.some((t) => selected.has(t.hash));

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== "name" }));

  const onRowClick = (e: MouseEvent, t: Torrent) => {
    if (e.shiftKey && anchor.current) {
      const a = rows.findIndex((r) => r.hash === anchor.current);
      const b = rows.findIndex((r) => r.hash === t.hash);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const next = new Set(e.metaKey || e.ctrlKey ? selected : []);
      for (const r of rows.slice(lo, hi + 1)) next.add(r.hash);
      setSelected(next);
      return;
    }
    anchor.current = t.hash;
    if (e.metaKey || e.ctrlKey) {
      const next = new Set(selected);
      if (next.has(t.hash)) next.delete(t.hash);
      else next.add(t.hash);
      setSelected(next);
      return;
    }
    setSelected(new Set([t.hash]));
    setDetail(t.hash);
  };

  const toggleOne = (hash: string, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(hash);
    else next.delete(hash);
    anchor.current = hash;
    setSelected(next);
  };

  const onContext = (t: Torrent) => {
    if (selected.has(t.hash)) setMenuHashes([...selected]);
    else {
      setSelected(new Set([t.hash]));
      setMenuHashes([t.hash]);
    }
  };

  const SortIcon = sort.desc ? ArrowDownIcon : ArrowUpIcon;
  const header = (key: SortKey, label: string, align?: "right") => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className={cn(
        "flex h-full min-w-0 items-center gap-1 text-left transition-colors hover:text-foreground",
        align === "right" && "justify-end",
        sort.key === key && "text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      {sort.key === key && <SortIcon className="size-3.5 shrink-0" aria-hidden />}
    </button>
  );

  if (torrents.length === 0) {
    return (
      <Empty className="h-full border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <InboxIcon />
          </EmptyMedia>
          <EmptyTitle>没有任务</EmptyTitle>
          <EmptyDescription>当前筛选条件下没有匹配的任务。拖拽 .torrent 文件或粘贴磁力链接即可添加。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full min-h-0 overflow-auto" role="grid" aria-rowcount={rows.length}>
          {/* desktop */}
          <div className="hidden min-w-fit md:block">
            <div
              className="sticky top-0 z-10 grid h-10 items-center gap-x-4 border-b bg-background/95 px-4 text-xs font-medium text-muted-foreground backdrop-blur"
              style={{ gridTemplateColumns: template }}
              role="row"
            >
              <Checkbox
                aria-label="全选"
                checked={allChecked ? true : someChecked ? "indeterminate" : false}
                onCheckedChange={(v) => setSelected(v ? new Set(rows.map((t) => t.hash)) : new Set())}
              />
              {header("name", "名称")}
              {cols.map((c) => (
                <div key={c.id} className={cn("h-full", c.align === "right" && "text-right")}>
                  {header(c.id, c.label, c.align)}
                </div>
              ))}
              <ColumnPicker visible={visible} setVisible={setVisible} />
            </div>
            {rows.map((t) => {
              const isSel = selected.has(t.hash);
              return (
                <div
                  key={t.hash}
                  role="row"
                  aria-selected={isSel}
                  onClick={(e) => onRowClick(e, t)}
                  onContextMenu={() => onContext(t)}
                  className={cn(
                    "group grid h-12 cursor-default items-center gap-x-4 border-b border-border/60 px-4 text-[13px] tnum transition-colors select-none",
                    "hover:bg-muted/40",
                    isSel && "bg-muted/70 hover:bg-muted/80",
                    detail === t.hash && "shadow-[inset_2px_0_0_var(--color-info)]",
                  )}
                  style={{ gridTemplateColumns: template }}
                >
                  <Checkbox
                    aria-label={`选择 ${t.name}`}
                    checked={isSel}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(v) => toggleOne(t.hash, !!v)}
                  />
                  <NameCell t={t} showCategory={!visible.category} />
                  {cols.map((c) => (
                    <div
                      key={c.id}
                      className={cn("flex min-w-0 items-center", c.align === "right" && "justify-end text-right")}
                    >
                      {c.render(t)}
                    </div>
                  ))}
                  <span />
                </div>
              );
            })}
          </div>
          {/* mobile */}
          <div className="divide-y divide-border/60 md:hidden">
            {rows.map((t) => {
              const isSel = selected.has(t.hash);
              return (
                <div
                  key={t.hash}
                  role="row"
                  aria-selected={isSel}
                  onClick={(e) => onRowClick(e, t)}
                  onContextMenu={() => onContext(t)}
                  className={cn("flex gap-3 px-4 py-3 active:bg-muted/60", isSel && "bg-muted/70")}
                >
                  <Checkbox
                    className="mt-0.5"
                    aria-label={`选择 ${t.name}`}
                    checked={isSel}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(v) => toggleOne(t.hash, !!v)}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="line-clamp-2 text-sm leading-snug font-medium break-all">{t.name}</div>
                    <ProgressBar t={t} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tnum">
                      <StateBadge state={t.state} progress={t.progress} className="h-5 px-2" />
                      <span>{fmtPct(t.progress)}</span>
                      <span>{fmtBytes(t.size)}</span>
                      {t.dlspeed > 0 && (
                        <span className="inline-flex items-center gap-1 text-info">
                          <ArrowDownIcon className="size-3.5" />
                          {fmtSpeed(t.dlspeed)}
                        </span>
                      )}
                      {t.upspeed > 0 && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <ArrowUpIcon className="size-3.5" />
                          {fmtSpeed(t.upspeed)}
                        </span>
                      )}
                      {t.progress < 1 && t.eta < 8640000 && <span>{fmtEta(t.eta)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <TorrentActions kit={contextKit} hashes={menuHashes} />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function NameCell({ t, showCategory }: { t: Torrent; showCategory: boolean }) {
  const tags = (t.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium" title={t.name}>
        {t.name}
      </span>
      {showCategory && t.category && (
        <span className="shrink-0 rounded-md border px-1.5 py-px text-[11px] text-muted-foreground">{t.category}</span>
      )}
      {tags.slice(0, 2).map((tag) => (
        <span key={tag} className="shrink-0 rounded-md bg-muted px-1.5 py-px text-[11px] text-muted-foreground">
          #{tag}
        </span>
      ))}
    </div>
  );
}

function ColumnPicker({
  visible,
  setVisible,
}: {
  visible: Record<ColumnId, boolean>;
  setVisible: (v: Record<ColumnId, boolean>) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="显示列" onClick={(e) => e.stopPropagation()}>
          <Columns3Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>显示列</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={visible[c.id]}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(v) => setVisible({ ...visible, [c.id]: v })}
            className="py-1.5"
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
