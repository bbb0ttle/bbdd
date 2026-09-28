import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { MoreHorizontalIcon, PlayIcon, PlusIcon, SearchIcon, SquareIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TorrentTable } from "@/components/torrents/torrent-table";
import { TorrentActions, dropdownKit } from "@/components/torrents/torrent-actions";
import { DetailPanel } from "@/components/detail/detail-panel";
import { PageHeader } from "@/components/layout/page-header";
import * as api from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { matchStatus } from "@/lib/state";
import { trackerHost } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";

export function TransfersView() {
  const { torrents, trackers, run } = useStore();
  const { filters, query, setQuery, selected, setSelected, detail, setDetail, openDialog } = useUI();
  const isMobile = useIsMobile();
  const searchRef = useRef<HTMLInputElement>(null);

  const trackerMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const [url, hashes] of Object.entries(trackers)) {
      const host = trackerHost(url);
      for (const h of hashes) {
        const set = m.get(h) ?? new Set();
        set.add(host);
        m.set(h, set);
      }
    }
    return m;
  }, [trackers]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...torrents.values()].filter((t) => {
      if (!matchStatus(t, filters.status)) return false;
      if (filters.category !== null && (t.category || "") !== filters.category) return false;
      if (filters.tag !== null) {
        const ts = (t.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (filters.tag === "" ? ts.length > 0 : !ts.includes(filters.tag)) return false;
      }
      if (filters.tracker !== null) {
        const hs = trackerMap.get(t.hash);
        if (filters.tracker === "" ? hs && hs.size > 0 : !hs?.has(filters.tracker)) return false;
      }
      if (q && !t.name.toLowerCase().includes(q) && !t.hash.startsWith(q)) return false;
      return true;
    });
  }, [torrents, filters, query, trackerMap]);

  const sel = useMemo(() => [...selected].filter((h) => torrents.has(h)), [selected, torrents]);
  const detailTorrent = detail ? torrents.get(detail) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, [contenteditable], [role=dialog], [role=menu]");
      if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (typing) {
        return;
      } else if (e.key === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSelected(new Set(list.map((t) => t.hash)));
      } else if (e.key === "Escape") {
        setSelected(new Set());
        setDetail(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && sel.length) {
        openDialog({ type: "delete", hashes: sel });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list, sel, setSelected, setDetail, openDialog]);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader>
          <InputGroup className="h-9 max-w-md flex-1">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              placeholder="筛选任务名称或哈希"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setQuery(""), e.currentTarget.blur())}
            />
            <InputGroupAddon align="inline-end">
              {query ? (
                <InputGroupButton size="icon-xs" aria-label="清除" onClick={() => setQuery("")}>
                  <XIcon className="size-4" />
                </InputGroupButton>
              ) : (
                <Kbd className="hidden sm:inline-flex">/</Kbd>
              )}
            </InputGroupAddon>
          </InputGroup>
          <div className="ml-auto flex items-center gap-1.5">
            {sel.length > 0 && (
              <div className="flex items-center gap-1 animate-in duration-150 fade-in-0">
                <span className="mr-1 hidden text-xs text-muted-foreground tnum lg:inline">已选 {sel.length} 项</span>
                <ToolButton label="启动" onClick={() => run(() => api.start(sel))}>
                  <PlayIcon />
                </ToolButton>
                <ToolButton label="停止" onClick={() => run(() => api.stop(sel))}>
                  <SquareIcon />
                </ToolButton>
                <ToolButton label="删除" onClick={() => openDialog({ type: "delete", hashes: sel })}>
                  <Trash2Icon />
                </ToolButton>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-lg" aria-label="更多操作">
                          <MoreHorizontalIcon className="size-[18px]" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>更多操作</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-60">
                    <TorrentActions kit={dropdownKit} hashes={sel} />
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="mx-1 h-5 w-px bg-border" />
              </div>
            )}
            <Button size="lg" className="h-9 gap-2 px-3" onClick={() => openDialog({ type: "add" })}>
              <PlusIcon className="size-[18px]" />
              <span className="hidden sm:inline">添加</span>
            </Button>
          </div>
        </PageHeader>
        <div className="min-h-0 flex-1">
          <TorrentTable torrents={list} />
        </div>
      </div>
      {detailTorrent && !isMobile && (
        <aside className="hidden w-[min(560px,42vw)] shrink-0 border-l md:flex md:flex-col animate-in duration-200 ease-out fade-in-0 slide-in-from-right-4">
          <DetailPanel torrent={detailTorrent} onClose={() => setDetail(null)} />
        </aside>
      )}
      {isMobile && (
        <Sheet open={!!detailTorrent} onOpenChange={(o) => !o && setDetail(null)}>
          <SheetContent side="bottom" className="h-[88svh] gap-0 p-0" showCloseButton={false}>
            <SheetHeader className="sr-only">
              <SheetTitle>任务详情</SheetTitle>
              <SheetDescription>{detailTorrent?.name}</SheetDescription>
            </SheetHeader>
            {detailTorrent && <DetailPanel torrent={detailTorrent} onClose={() => setDetail(null)} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label={label} onClick={onClick} className="[&_svg]:size-[18px]">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
