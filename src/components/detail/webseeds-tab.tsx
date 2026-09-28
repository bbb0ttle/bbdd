import { CopyIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as api from "@/api";
import { usePoll } from "@/hooks/use-poll";
import { useStore } from "@/store";
import { copyText } from "@/lib/clipboard";
import { AddLinesButton, Toolbar } from "./list-editor";

export function WebSeedsTab({ hash }: { hash: string }) {
  const { data, reload } = usePoll(() => api.getWebSeeds(hash), [hash], 5000);
  const { run } = useStore();
  const act = async (fn: () => Promise<unknown>) => {
    const ok = await run(fn);
    if (ok) reload();
    return ok;
  };
  if (!data) return null;
  return (
    <div>
      <Toolbar>
        <AddLinesButton
          label="添加 HTTP 源"
          description="每行一个 URL。"
          placeholder="https://example.org/files/"
          onSubmit={(lines) => act(() => api.addWebSeeds(hash, lines))}
        />
      </Toolbar>
      {data.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">此任务没有 HTTP 源。</p>
      ) : (
        <div className="divide-y divide-border/50">
          {data.map((w) => (
            <div key={w.url} className="group flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40">
              <span className="min-w-0 flex-1 truncate font-mono text-xs" title={w.url}>
                {w.url}
              </span>
              <Button variant="ghost" size="icon-sm" aria-label="复制" onClick={() => copyText(w.url)}>
                <CopyIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="移除" onClick={() => act(() => api.removeWebSeeds(hash, [w.url]))}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
