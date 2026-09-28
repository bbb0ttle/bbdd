import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PlugIcon,
  RefreshCwIcon,
  SearchIcon,
  SquareIcon,
  Trash2Icon,

} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import * as api from "@/api";
import type { SearchPlugin, SearchResult } from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { fmtBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "nbSeeders" | "nbLeechers" | "fileSize" | "fileName";

export function SearchView() {
  const { run } = useStore();
  const { openDialog } = useUI();
  const [plugins, setPlugins] = useState<SearchPlugin[]>([]);
  const [pattern, setPattern] = useState("");
  const [plugin, setPlugin] = useState("enabled");
  const [category, setCategory] = useState("all");
  const [id, setId] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "nbSeeders", desc: true });
  const [managing, setManaging] = useState(false);
  const idRef = useRef<number | null>(null);

  const loadPlugins = () => api.searchPlugins().then(setPlugins).catch(() => {});
  useEffect(() => {
    loadPlugins();
    return () => {
      if (idRef.current !== null) api.searchDelete(idRef.current).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const r = await api.searchResults(id, 0);
        if (!alive) return;
        setResults(r.results);
        setRunning(r.status === "Running");
        if (r.status === "Running") timer = window.setTimeout(tick, 1000);
      } catch {
        setRunning(false);
      }
    };
    tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [id]);

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    const src = plugin === "enabled" || plugin === "all" ? plugins.filter((p) => plugin === "all" || p.enabled) : plugins.filter((p) => p.name === plugin);
    for (const p of src) for (const c of p.supportedCategories) m.set(c.id, c.name);
    return [...m.entries()];
  }, [plugins, plugin]);

  const start = async () => {
    if (!pattern.trim()) return;
    if (idRef.current !== null) await api.searchDelete(idRef.current).catch(() => {});
    try {
      const r = await api.searchStart(pattern.trim(), plugin, category);
      idRef.current = r.id;
      setResults([]);
      setRunning(true);
      setId(r.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "搜索启动失败");
    }
  };

  const shown = useMemo(() => {
    const f = filter.toLowerCase();
    const r = results.filter((x) => !f || x.fileName.toLowerCase().includes(f));
    return r.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const d = typeof x === "string" ? x.localeCompare(String(y)) : (x as number) - (y as number);
      return sort.desc ? -d : d;
    });
  }, [results, filter, sort]);

  const head = (key: SortKey, label: string, cls = "") => (
    <button
      type="button"
      className={cn("flex items-center gap-1 hover:text-foreground", sort.key === key && "text-foreground", cls)}
      onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "fileName" }))}
    >
      {label}
      {sort.key === key && (sort.desc ? <ArrowDownIcon className="size-3.5" /> : <ArrowUpIcon className="size-3.5" />)}
    </button>
  );

  const noPlugins = plugins.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="搜索">
        <div className="ml-auto">
          <Button variant="outline" className="h-9 gap-2" onClick={() => setManaging(true)}>
            <PlugIcon className="size-4" />
            <span className="hidden sm:inline">搜索插件</span>
          </Button>
        </div>
      </PageHeader>
      <form
        className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
      >
        <Input
          className="h-9 min-w-48 flex-1"
          placeholder="搜索关键词"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          disabled={noPlugins}
        />
        <Select value={plugin} onValueChange={setPlugin}>
          <SelectTrigger className="h-9! w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">仅启用的插件</SelectItem>
            <SelectItem value="all">所有插件</SelectItem>
            {plugins.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-9! w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories
              .filter(([cid]) => cid !== "all")
              .map(([cid, name]) => (
                <SelectItem key={cid} value={cid}>
                  {name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {running ? (
          <Button type="button" variant="outline" className="h-9 gap-2" onClick={() => id !== null && api.searchStop(id).then(() => setRunning(false))}>
            <SquareIcon className="size-4" /> 停止
          </Button>
        ) : (
          <Button type="submit" className="h-9 gap-2" disabled={!pattern.trim() || noPlugins}>
            <SearchIcon className="size-4" /> 搜索
          </Button>
        )}
      </form>
      {results.length > 0 && (
        <div className="flex items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
          {running && <Spinner className="size-3.5" />}
          <span className="tnum">
            {shown.length} / {results.length} 条结果
          </span>
          <Input className="ml-auto h-8 w-56 text-xs" placeholder="在结果中筛选" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {results.length === 0 ? (
          <Empty className="h-full border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">{running ? <Spinner /> : noPlugins ? <PlugIcon /> : <SearchIcon />}</EmptyMedia>
              <EmptyTitle>{running ? "正在搜索" : noPlugins ? "未安装搜索插件" : "搜索种子"}</EmptyTitle>
              <EmptyDescription>
                {noPlugins ? "搜索功能依赖服务端的 Python 与搜索插件。请先在“搜索插件”中安装。" : "结果来自已启用的搜索插件。"}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="min-w-[640px] text-[13px]">
            <div className="sticky top-0 z-10 grid h-10 grid-cols-[1fr_88px_72px_72px_120px_76px] items-center gap-3 border-b bg-background/95 px-4 text-xs font-medium text-muted-foreground backdrop-blur">
              {head("fileName", "名称")}
              {head("fileSize", "大小", "justify-end")}
              {head("nbSeeders", "做种", "justify-end")}
              {head("nbLeechers", "下载", "justify-end")}
              <span>来源</span>
              <span />
            </div>
            {shown.map((r, i) => (
              <div
                key={`${r.fileUrl}-${i}`}
                className="grid h-11 grid-cols-[1fr_88px_72px_72px_120px_76px] items-center gap-3 border-b border-border/50 px-4 hover:bg-muted/40"
              >
                <span className="truncate" title={r.fileName}>
                  {r.fileName}
                </span>
                <span className="text-right text-muted-foreground tnum">{r.fileSize > 0 ? fmtBytes(r.fileSize) : "—"}</span>
                <span className="text-right text-success tnum">{r.nbSeeders}</span>
                <span className="text-right text-info tnum">{r.nbLeechers}</span>
                <span className="truncate text-xs text-muted-foreground">{r.engineName || r.siteUrl.replace(/^https?:\/\//, "")}</span>
                <div className="flex justify-end gap-0.5">
                  <Button variant="ghost" size="icon-sm" aria-label="下载" onClick={() => openDialog({ type: "add", urls: r.fileUrl })}>
                    <DownloadIcon className="size-4" />
                  </Button>
                  {r.descrLink && (
                    <Button variant="ghost" size="icon-sm" aria-label="打开描述页" asChild>
                      <a href={r.descrLink} target="_blank" rel="noreferrer">
                        <ExternalLinkIcon className="size-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={managing} onOpenChange={setManaging}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>搜索插件</DialogTitle>
            <DialogDescription>插件以 Python 脚本形式运行于 qBittorrent 服务端。</DialogDescription>
          </DialogHeader>
          <PluginManager plugins={plugins} reload={loadPlugins} run={run} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PluginManager({
  plugins,
  reload,
  run,
}: {
  plugins: SearchPlugin[];
  reload: () => void;
  run: (t: () => Promise<unknown>, s?: string) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    if (await run(fn, msg)) window.setTimeout(reload, 1500);
  };
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) act(() => api.installPlugin([url.trim()]), "已提交安装请求").then(() => setUrl(""));
        }}
      >
        <Input className="h-9 font-mono text-xs" placeholder="插件 URL（.py）" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button type="submit" className="h-9" disabled={!url.trim()}>
          安装
        </Button>
        <Button type="button" variant="outline" className="h-9 gap-2" onClick={() => act(() => api.updatePlugins(), "已检查更新")}>
          <RefreshCwIcon className="size-4" /> 更新
        </Button>
      </form>
      <div className="max-h-96 divide-y overflow-auto rounded-lg border">
        {plugins.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">尚未安装任何插件。</p>}
        {plugins.map((p) => (
          <div key={p.name} className="flex items-center gap-3 px-3 py-2.5">
            <Switch checked={p.enabled} onCheckedChange={(v) => act(() => api.enablePlugin([p.name], v))} aria-label={`启用 ${p.fullName}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.fullName}</div>
              <div className="truncate text-xs text-muted-foreground">
                v{p.version} · {p.url}
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="卸载" onClick={() => act(() => api.uninstallPlugin([p.name]), "已卸载")}>
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        非官方插件列表：github.com/qbittorrent/search-plugins/wiki/Unofficial-search-plugins
      </p>
    </div>
  );
}
