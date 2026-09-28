import { useState } from "react";
import { MoreHorizontalIcon, PlayIcon, SquareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Torrent } from "@/api";
import * as api from "@/api";
import { useStore } from "@/store";
import { isStopped } from "@/lib/state";
import { fmtPct } from "@/lib/format";
import { StateBadge } from "@/components/torrents/state-badge";
import { ProgressBar } from "@/components/torrents/columns";
import { TorrentActions, dropdownKit } from "@/components/torrents/torrent-actions";
import { GeneralTab } from "./general-tab";
import { TrackersTab } from "./trackers-tab";
import { PeersTab } from "./peers-tab";
import { WebSeedsTab } from "./webseeds-tab";
import { FilesTab } from "./files-tab";

const tabs = [
  { id: "general", label: "常规" },
  { id: "files", label: "文件" },
  { id: "trackers", label: "Tracker" },
  { id: "peers", label: "用户" },
  { id: "http", label: "HTTP 源" },
] as const;

export function DetailPanel({ torrent: t, onClose }: { torrent: Torrent; onClose: () => void }) {
  const [tab, setTab] = useState<string>("general");
  const { run } = useStore();
  const stopped = isStopped(t);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b px-4 pt-4 pb-3">
        <div className="flex items-start gap-2">
          <h2 className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-snug font-semibold tracking-tight break-all">
            {t.name}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={stopped ? "启动" : "停止"}
            onClick={() => run(() => (stopped ? api.start([t.hash]) : api.stop([t.hash])))}
          >
            {stopped ? <PlayIcon className="size-[18px]" /> : <SquareIcon className="size-[18px]" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="更多操作">
                <MoreHorizontalIcon className="size-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <TorrentActions kit={dropdownKit} hashes={[t.hash]} />
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" aria-label="关闭详情" onClick={onClose}>
            <XIcon className="size-[18px]" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <StateBadge state={t.state} progress={t.progress} />
          <ProgressBar t={t} className="flex-1" />
          <span className="text-xs text-muted-foreground tnum">{fmtPct(t.progress)}</span>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 gap-0">
        <div className="shrink-0 overflow-x-auto border-b px-2">
          <TabsList variant="line" className="h-10">
            {tabs.map((x) => (
              <TabsTrigger key={x.id} value={x.id} className="px-3 text-[13px]">
                {x.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <TabsContent value="general" className="m-0">
            {tab === "general" && <GeneralTab t={t} />}
          </TabsContent>
          <TabsContent value="files" className="m-0">
            {tab === "files" && <FilesTab hash={t.hash} />}
          </TabsContent>
          <TabsContent value="trackers" className="m-0">
            {tab === "trackers" && <TrackersTab hash={t.hash} />}
          </TabsContent>
          <TabsContent value="peers" className="m-0">
            {tab === "peers" && <PeersTab hash={t.hash} />}
          </TabsContent>
          <TabsContent value="http" className="m-0">
            {tab === "http" && <WebSeedsTab hash={t.hash} />}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
