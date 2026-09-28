import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CheckCheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderPlusIcon,
  ListFilterIcon,
  PlusIcon,
  RefreshCwIcon,
  RssIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import * as api from "@/api";
import type { RssArticle, RssFeed, RssNode, RssRule } from "@/api";
import { usePoll } from "@/hooks/use-poll";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { cn } from "@/lib/utils";

interface FlatItem {
  path: string;
  name: string;
  depth: number;
  feed?: RssFeed;
}

const isFeed = (n: RssFeed | RssNode): n is RssFeed => typeof (n as RssFeed).uid === "string" && typeof (n as RssFeed).url === "string";

function flatten(node: RssNode, prefix = "", depth = 0, out: FlatItem[] = []) {
  for (const [name, child] of Object.entries(node)) {
    const path = prefix ? `${prefix}\\${name}` : name;
    if (isFeed(child)) out.push({ path, name, depth, feed: child });
    else {
      out.push({ path, name, depth });
      flatten(child, path, depth + 1, out);
    }
  }
  return out;
}

export function RssView() {
  const { run } = useStore();
  const { openDialog } = useUI();
  const { data, reload } = usePoll(() => api.rssItems(), [], 5000);
  const [sel, setSel] = useState<string>("");
  const [article, setArticle] = useState<{ feed: string; a: RssArticle } | null>(null);
  const [adding, setAdding] = useState<"feed" | "folder" | null>(null);
  const [input, setInput] = useState("");
  const [rules, setRules] = useState(false);

  const items = useMemo(() => (data ? flatten(data) : []), [data]);
  const feeds = items.filter((i) => i.feed);
  const selected = items.find((i) => i.path === sel);

  const articles = useMemo(() => {
    const src = selected
      ? selected.feed
        ? [selected]
        : feeds.filter((f) => f.path.startsWith(`${selected.path}\\`))
      : feeds;
    return src
      .flatMap((f) => (f.feed?.articles ?? []).map((a) => ({ feed: f.path, a })))
      .sort((x, y) => Date.parse(y.a.date) - Date.parse(x.a.date));
  }, [selected, feeds]);

  const unread = (f: RssFeed) => (f.articles ?? []).filter((a) => !a.isRead).length;
  const act = async (fn: () => Promise<unknown>, msg?: string) => {
    const ok = await run(fn, msg);
    if (ok) reload();
    return ok;
  };

  const open = (feed: string, a: RssArticle) => {
    setArticle({ feed, a });
    if (!a.isRead) act(() => api.rssMarkRead(feed, a.id));
  };

  const parentFolder = selected && !selected.feed ? selected.path : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="RSS">
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon-lg" aria-label="全部刷新" onClick={() => act(() => api.rssRefresh(""), "已开始刷新")}>
            <RefreshCwIcon className="size-[18px]" />
          </Button>
          <Button variant="outline" className="h-9 gap-2" onClick={() => setRules(true)}>
            <ListFilterIcon className="size-4" />
            <span className="hidden sm:inline">下载规则</span>
          </Button>
          <Button
            className="h-9 gap-2"
            onClick={() => {
              setInput("");
              setAdding("feed");
            }}
          >
            <PlusIcon className="size-[18px]" />
            <span className="hidden sm:inline">订阅</span>
          </Button>
        </div>
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="max-h-48 shrink-0 overflow-auto border-b md:max-h-none md:w-64 md:border-r md:border-b-0">
          <div className="flex items-center justify-between px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
            订阅源
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="新建文件夹"
              onClick={() => {
                setInput("");
                setAdding("folder");
              }}
            >
              <FolderPlusIcon className="size-4" />
            </Button>
          </div>
          <div className="px-2 pb-2">
            <FeedButton
              active={sel === ""}
              onClick={() => setSel("")}
              icon={<RssIcon className="size-4" />}
              name="全部"
              count={feeds.reduce((n, f) => n + unread(f.feed!), 0)}
              depth={0}
            />
            {items.map((i) => (
              <FeedButton
                key={i.path}
                active={sel === i.path}
                onClick={() => setSel(i.path)}
                depth={i.depth}
                name={i.feed?.title || i.name}
                count={i.feed ? unread(i.feed) : undefined}
                icon={
                  !i.feed ? (
                    <FolderIcon className="size-4" />
                  ) : i.feed.isLoading ? (
                    <Spinner className="size-4" />
                  ) : i.feed.hasError ? (
                    <TriangleAlertIcon className="size-4 text-destructive" />
                  ) : (
                    <RssIcon className="size-4" />
                  )
                }
              />
            ))}
          </div>
          {selected && (
            <div className="flex gap-1 border-t px-2 py-2">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => act(() => api.rssRefresh(selected.path))}>
                <RefreshCwIcon className="size-4" /> 刷新
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => act(() => api.rssMarkRead(selected.path))}>
                <CheckCheckIcon className="size-4" /> 已读
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 gap-1.5 text-destructive hover:text-destructive"
                onClick={() => {
                  setSel("");
                  act(() => api.rssRemove(selected.path), "已删除");
                }}
              >
                <Trash2Icon className="size-4" /> 删除
              </Button>
            </div>
          )}
        </nav>
        <div className="min-h-0 flex-1 overflow-auto">
          {articles.length === 0 ? (
            <Empty className="h-full border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RssIcon />
                </EmptyMedia>
                <EmptyTitle>没有文章</EmptyTitle>
                <EmptyDescription>
                  {feeds.length === 0 ? "添加 RSS 订阅源以获取种子更新。需在设置中启用 RSS 订阅获取。" : "该订阅源暂无文章。"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="divide-y divide-border/50">
              {articles.map(({ feed, a }) => (
                <div
                  key={`${feed}-${a.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => open(feed, a)}
                  onKeyDown={(e) => e.key === "Enter" && open(feed, a)}
                  className={cn(
                    "group flex cursor-default items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-muted/40",
                    article?.a.id === a.id && "bg-muted/70",
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", a.isRead ? "bg-transparent" : "bg-info")} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate", !a.isRead && "font-medium")}>{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {feed.split("\\").pop()} · {new Date(a.date).toLocaleString("zh-CN", { hour12: false })}
                    </div>
                  </div>
                  {a.torrentURL && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="下载"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDialog({ type: "add", urls: a.torrentURL });
                      }}
                    >
                      <DownloadIcon className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!article} onOpenChange={(o) => !o && setArticle(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="leading-snug break-all">{article?.a.title}</DialogTitle>
            <DialogDescription>
              {article && new Date(article.a.date).toLocaleString("zh-CN", { hour12: false })}
              {article?.a.author && ` · ${article.a.author}`}
            </DialogDescription>
          </DialogHeader>
          {article?.a.description && (
            <div className="max-h-[50svh] overflow-auto rounded-md border bg-muted/20 p-3 text-[13px] break-all whitespace-pre-wrap text-muted-foreground">
              {article.a.description.replace(/<[^>]+>/g, "")}
            </div>
          )}
          <DialogFooter>
            {article?.a.link && (
              <Button variant="outline" asChild>
                <a href={article.a.link} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-4" /> 打开链接
                </a>
              </Button>
            )}
            {article?.a.torrentURL && (
              <Button
                onClick={() => {
                  const url = article.a.torrentURL!;
                  setArticle(null);
                  openDialog({ type: "add", urls: url });
                }}
              >
                <DownloadIcon className="size-4" /> 下载
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adding} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent className="sm:max-w-md">
          <form
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = input.trim();
              if (!v) return;
              const ok =
                adding === "feed"
                  ? await act(() => api.rssAddFeed(v, parentFolder ? `${parentFolder}\\${v.replace(/[\\/]/g, "_")}` : ""), "已添加订阅")
                  : await act(() => api.rssAddFolder(parentFolder ? `${parentFolder}\\${v}` : v));
              if (ok) setAdding(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>{adding === "feed" ? "添加订阅源" : "新建文件夹"}</DialogTitle>
              {parentFolder && <DialogDescription>位于：{parentFolder}</DialogDescription>}
            </DialogHeader>
            <Input
              autoFocus
              className={cn("h-10", adding === "feed" && "font-mono text-xs")}
              placeholder={adding === "feed" ? "https://example.org/rss" : "文件夹名称"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(null)}>
                取消
              </Button>
              <Button type="submit" disabled={!input.trim()}>
                添加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="flex h-[min(720px,92svh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>RSS 下载规则</DialogTitle>
            <DialogDescription>匹配规则的文章将自动添加为下载任务。</DialogDescription>
          </DialogHeader>
          {rules && <RulesEditor feeds={feeds} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedButton({
  active,
  onClick,
  icon,
  name,
  count,
  depth,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  name: string;
  count?: number;
  depth: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: 8 + depth * 14 }}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md pr-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted font-medium text-foreground",
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {!!count && <span className="text-xs tnum">{count}</span>}
    </button>
  );
}

const emptyRule: Partial<RssRule> = {
  enabled: true,
  mustContain: "",
  mustNotContain: "",
  useRegex: false,
  episodeFilter: "",
  smartFilter: false,
  affectedFeeds: [],
  ignoreDays: 0,
  assignedCategory: "",
  savePath: "",
};

function RulesEditor({ feeds }: { feeds: FlatItem[] }) {
  const { run, categories } = useStore();
  const { data, reload } = usePoll(() => api.rssRules(), [], 0);
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<RssRule>>(emptyRule);
  const [newName, setNewName] = useState("");
  const [matches, setMatches] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (name && data?.[name]) setDraft(data[name]);
  }, [name, data]);

  useEffect(() => {
    if (!name || !data?.[name]) return setMatches({});
    api.rssMatching(name).then(setMatches).catch(() => setMatches({}));
  }, [name, data]);

  const set = <K extends keyof RssRule>(k: K, v: RssRule[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => {
    if (!name) return;
    if (await run(() => api.rssSetRule(name, draft), "规则已保存")) reload();
  };

  const NONE = "__none__";

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div className="flex max-h-48 shrink-0 flex-col border-b md:max-h-none md:w-56 md:border-r md:border-b-0">
        <form
          className="flex gap-1.5 p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = newName.trim();
            if (!n) return;
            if (await run(() => api.rssSetRule(n, emptyRule))) {
              setNewName("");
              reload();
              setName(n);
            }
          }}
        >
          <Input className="h-8 text-xs" placeholder="新规则名称" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button type="submit" size="icon-sm" className="size-8" aria-label="添加规则" disabled={!newName.trim()}>
            <PlusIcon className="size-4" />
          </Button>
        </form>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          {Object.entries(data ?? {}).map(([n, r]) => (
            <button
              key={n}
              type="button"
              onClick={() => setName(n)}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-muted",
                name === n && "bg-muted font-medium",
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", r.enabled ? "bg-success" : "bg-muted-foreground/40")} />
              <span className="truncate">{n}</span>
            </button>
          ))}
        </div>
      </div>
      {name && data?.[name] ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
            <FieldGroup className="gap-4">
              <label className="flex items-center justify-between text-sm font-medium">
                启用规则
                <Switch checked={!!draft.enabled} onCheckedChange={(v) => set("enabled", v)} />
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={!!draft.useRegex} onCheckedChange={(v) => set("useRegex", !!v)} /> 使用正则表达式
              </label>
              <Field>
                <FieldLabel>必须包含</FieldLabel>
                <Input className="h-9 font-mono text-xs" value={draft.mustContain ?? ""} onChange={(e) => set("mustContain", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>必须不含</FieldLabel>
                <Input className="h-9 font-mono text-xs" value={draft.mustNotContain ?? ""} onChange={(e) => set("mustNotContain", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>剧集过滤器</FieldLabel>
                <Input className="h-9 font-mono text-xs" placeholder="1x2;8-15;16-" value={draft.episodeFilter ?? ""} onChange={(e) => set("episodeFilter", e.target.value)} />
              </Field>
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={!!draft.smartFilter} onCheckedChange={(v) => set("smartFilter", !!v)} /> 使用智能剧集过滤器
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>分类</FieldLabel>
                  <Select value={draft.assignedCategory || NONE} onValueChange={(v) => set("assignedCategory", v === NONE ? "" : v)}>
                    <SelectTrigger className="h-9! w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>无</SelectItem>
                      {Object.keys(categories).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>忽略后续匹配（天）</FieldLabel>
                  <Input
                    className="h-9 tnum"
                    inputMode="numeric"
                    value={String(draft.ignoreDays ?? 0)}
                    onChange={(e) => set("ignoreDays", Number(e.target.value.replace(/\D/g, "") || 0))}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>保存路径</FieldLabel>
                <Input className="h-9 font-mono text-xs" placeholder="默认" value={draft.savePath ?? ""} onChange={(e) => set("savePath", e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>应用于订阅源</FieldLabel>
                <div className="space-y-1 rounded-md border p-2">
                  {feeds.length === 0 && <p className="p-2 text-xs text-muted-foreground">尚无订阅源。</p>}
                  {feeds.map((f) => {
                    const url = f.feed!.url;
                    const on = (draft.affectedFeeds ?? []).includes(url);
                    return (
                      <label key={f.path} className="flex items-center gap-2.5 rounded px-1.5 py-1 text-[13px] hover:bg-muted/50">
                        <Checkbox
                          checked={on}
                          onCheckedChange={(v) =>
                            set("affectedFeeds", v ? [...(draft.affectedFeeds ?? []), url] : (draft.affectedFeeds ?? []).filter((u) => u !== url))
                          }
                        />
                        <span className="truncate">{f.feed!.title || f.name}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
              {Object.keys(matches).length > 0 && (
                <Field>
                  <FieldLabel>匹配的文章</FieldLabel>
                  <Textarea
                    readOnly
                    rows={5}
                    className="font-mono text-xs"
                    value={Object.entries(matches)
                      .flatMap(([feed, arts]) => [`# ${feed}`, ...arts])
                      .join("\n")}
                  />
                </Field>
              )}
            </FieldGroup>
          </div>
          <div className="flex items-center gap-2 border-t px-6 py-3">
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={async () => {
                if (await run(() => api.rssRemoveRule(name))) {
                  setName(null);
                  reload();
                }
              }}
            >
              <Trash2Icon className="size-4" /> 删除规则
            </Button>
            <Button className="ml-auto" onClick={save}>
              保存规则
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">选择或新建一条规则。</div>
      )}
    </div>
  );
}
