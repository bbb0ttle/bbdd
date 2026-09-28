import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  DownloadCloudIcon,
  FolderIcon,

  GlobeIcon,
  HourglassIcon,
  InfoIcon,
  LayersIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  MoonIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  RssIcon,
  ScrollTextIcon,
  SearchIcon,
  SettingsIcon,
  TagIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as api from "@/api";
import { useStore } from "@/store";
import { useUI, type View } from "@/ui-state";
import { matchStatus, type StatusFilter } from "@/lib/state";
import { trackerHost } from "@/lib/format";

type Icon = ComponentType<{ className?: string }>;

const views: { id: View; label: string; icon: Icon }[] = [
  { id: "transfers", label: "传输", icon: LayersIcon },
  { id: "search", label: "搜索", icon: SearchIcon },
  { id: "rss", label: "RSS", icon: RssIcon },
  { id: "log", label: "日志", icon: ScrollTextIcon },
];

const statuses: { id: StatusFilter; label: string; icon: Icon }[] = [
  { id: "all", label: "全部", icon: LayersIcon },
  { id: "downloading", label: "下载", icon: ArrowDownIcon },
  { id: "seeding", label: "做种", icon: ArrowUpIcon },
  { id: "completed", label: "已完成", icon: CheckCircle2Icon },
  { id: "running", label: "运行中", icon: CirclePlayIcon },
  { id: "stopped", label: "已停止", icon: CirclePauseIcon },
  { id: "active", label: "活动", icon: ActivityIcon },
  { id: "inactive", label: "非活动", icon: MoonIcon },
  { id: "stalled", label: "等待", icon: HourglassIcon },
  { id: "checking", label: "校验中", icon: RefreshCwIcon },
  { id: "moving", label: "移动中", icon: TruckIcon },
  { id: "errored", label: "错误", icon: AlertCircleIcon },
];

const btn = "h-9 gap-2.5 text-[13px] [&_svg]:size-4";
const badge = "top-2! text-muted-foreground";

export function AppSidebar({ onLogout, version }: { onLogout: () => void; version: string }) {
  const { torrents, categories, tags, trackers, run } = useStore();
  const { view, setView, filters, setFilters, openDialog } = useUI();
  const { setOpenMobile, isMobile } = useSidebar();
  const list = useMemo(() => [...torrents.values()], [torrents]);

  const go = (fn: () => void) => {
    fn();
    if (isMobile) setOpenMobile(false);
  };

  const statusCount = useMemo(() => {
    const out = {} as Record<StatusFilter, number>;
    for (const s of statuses) out[s.id] = list.filter((t) => matchStatus(t, s.id)).length;
    return out;
  }, [list]);

  const catCount = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of list) out[t.category || ""] = (out[t.category || ""] ?? 0) + 1;
    return out;
  }, [list]);

  const tagCount = useMemo(() => {
    const out: Record<string, number> = { "": 0 };
    for (const t of list) {
      const ts = (t.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (ts.length === 0) out[""]++;
      for (const tag of ts) out[tag] = (out[tag] ?? 0) + 1;
    }
    return out;
  }, [list]);

  const trackerHosts = useMemo(() => {
    const byHost = new Map<string, Set<string>>();
    for (const [url, hashes] of Object.entries(trackers)) {
      const host = trackerHost(url);
      const set = byHost.get(host) ?? new Set();
      for (const h of hashes) set.add(h);
      byHost.set(host, set);
    }
    const tracked = new Set([...byHost.values()].flatMap((s) => [...s]));
    const trackerless = list.filter((t) => !tracked.has(t.hash)).length;
    return {
      hosts: [...byHost.entries()].map(([host, s]) => ({ host, count: s.size })).sort((a, b) => a.host.localeCompare(b.host)),
      trackerless,
    };
  }, [trackers, list]);

  const inTransfers = view === "transfers";

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-14 flex-row items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
          <DownloadCloudIcon className="size-4" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-semibold tracking-tight">qBittorrent</div>
          {version && <div className="text-[11px] text-muted-foreground">{version}</div>}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {views.map((v) => (
                <SidebarMenuItem key={v.id}>
                  <SidebarMenuButton className={btn} isActive={view === v.id} onClick={() => go(() => setView(v.id))}>
                    <v.icon />
                    <span>{v.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {inTransfers && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>状态</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {statuses.map((s) => (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        className={btn}
                        isActive={filters.status === s.id}
                        onClick={() => go(() => setFilters({ status: s.id }))}
                      >
                        <s.icon />
                        <span>{s.label}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className={badge}>{statusCount[s.id]}</SidebarMenuBadge>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <FilterGroup label="分类" onAdd={() => openDialog({ type: "category" })} addLabel="新建分类">
              <FilterItem
                icon={FolderIcon}
                label="全部"
                count={list.length}
                active={filters.category === null}
                onClick={() => go(() => setFilters({ category: null }))}
              />
              <FilterItem
                icon={FolderIcon}
                label="未分类"
                count={catCount[""] ?? 0}
                active={filters.category === ""}
                onClick={() => go(() => setFilters({ category: "" }))}
              />
              {Object.keys(categories)
                .sort()
                .map((c) => (
                  <FilterItem
                    key={c}
                    icon={FolderIcon}
                    label={c}
                    count={catCount[c] ?? 0}
                    active={filters.category === c}
                    onClick={() => go(() => setFilters({ category: c }))}
                    menu={
                      <>
                        <DropdownMenuItem onSelect={() => openDialog({ type: "category", edit: c })}>
                          <PencilIcon /> 编辑分类…
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            const hashes = list.filter((t) => t.category === c).map((t) => t.hash);
                            if (hashes.length) run(() => api.start(hashes));
                          }}
                        >
                          <CirclePlayIcon /> 启动该分类任务
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            const hashes = list.filter((t) => t.category === c).map((t) => t.hash);
                            if (hashes.length) run(() => api.stop(hashes));
                          }}
                        >
                          <CirclePauseIcon /> 停止该分类任务
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            if (filters.category === c) setFilters({ category: null });
                            run(() => api.removeCategories([c]), `已删除分类 ${c}`);
                          }}
                        >
                          <Trash2Icon /> 删除分类
                        </DropdownMenuItem>
                      </>
                    }
                  />
                ))}
            </FilterGroup>

            <FilterGroup label="标签" onAdd={() => openDialog({ type: "newTag" })} addLabel="新建标签">
              <FilterItem
                icon={TagIcon}
                label="全部"
                count={list.length}
                active={filters.tag === null}
                onClick={() => go(() => setFilters({ tag: null }))}
              />
              <FilterItem
                icon={TagIcon}
                label="无标签"
                count={tagCount[""] ?? 0}
                active={filters.tag === ""}
                onClick={() => go(() => setFilters({ tag: "" }))}
              />
              {[...tags].sort().map((tag) => (
                <FilterItem
                  key={tag}
                  icon={TagIcon}
                  label={tag}
                  count={tagCount[tag] ?? 0}
                  active={filters.tag === tag}
                  onClick={() => go(() => setFilters({ tag }))}
                  menu={
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        if (filters.tag === tag) setFilters({ tag: null });
                        run(() => api.deleteTags([tag]), `已删除标签 ${tag}`);
                      }}
                    >
                      <Trash2Icon /> 删除标签
                    </DropdownMenuItem>
                  }
                />
              ))}
            </FilterGroup>

            <FilterGroup label="Tracker" defaultOpen={false}>
              <FilterItem
                icon={GlobeIcon}
                label="全部"
                count={list.length}
                active={filters.tracker === null}
                onClick={() => go(() => setFilters({ tracker: null }))}
              />
              <FilterItem
                icon={GlobeIcon}
                label="无 Tracker"
                count={trackerHosts.trackerless}
                active={filters.tracker === ""}
                onClick={() => go(() => setFilters({ tracker: "" }))}
              />
              {trackerHosts.hosts.map(({ host, count }) => (
                <FilterItem
                  key={host}
                  icon={GlobeIcon}
                  label={host}
                  count={count}
                  active={filters.tracker === host}
                  onClick={() => go(() => setFilters({ tracker: host }))}
                />
              ))}
            </FilterGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className={btn} onClick={() => go(() => openDialog({ type: "settings" }))}>
              <SettingsIcon />
              <span>设置</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className={btn} onClick={() => go(() => openDialog({ type: "stats" }))}>
              <BarChart3Icon />
              <span>统计</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className={btn} onClick={() => go(() => openDialog({ type: "about" }))}>
              <InfoIcon />
              <span>关于</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className={btn} onClick={onLogout}>
              <LogOutIcon />
              <span>注销</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function FilterGroup({
  label,
  children,
  onAdd,
  addLabel,
  defaultOpen = true,
}: {
  label: string;
  children: ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="gap-1">
            <ChevronRightIcon className="size-3.5! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            {label}
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        {onAdd && (
          <SidebarGroupAction title={addLabel} aria-label={addLabel} onClick={onAdd} className="top-3">
            <PlusIcon className="size-4" />
          </SidebarGroupAction>
        )}
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

function FilterItem({
  icon: IconCmp,
  label,
  count,
  active,
  onClick,
  menu,
}: {
  icon: Icon;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  menu?: ReactNode;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className={btn} isActive={active} onClick={onClick} title={label}>
        <IconCmp />
        <span>{label}</span>
      </SidebarMenuButton>
      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="top-2! size-5" aria-label={`${label} 操作`}>
              <span className="text-xs text-muted-foreground tabular-nums group-hover/menu-item:hidden group-focus-within/menu-item:hidden">
                {count}
              </span>
              <MoreHorizontalIcon className="hidden group-hover/menu-item:block group-focus-within/menu-item:block" />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-48">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <SidebarMenuBadge className={badge}>{count}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

