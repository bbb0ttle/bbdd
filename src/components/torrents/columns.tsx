import type { ReactNode } from "react";
import type { Torrent } from "@/api";
import { fmtBytes, fmtDate, fmtEta, fmtPct, fmtRatio, fmtSpeed, trackerHost } from "@/lib/format";
import { StateBadge, progressTone } from "./state-badge";
import { cn } from "@/lib/utils";

export type ColumnId =
  | "size"
  | "progress"
  | "state"
  | "dlspeed"
  | "upspeed"
  | "eta"
  | "ratio"
  | "peers"
  | "category"
  | "added_on"
  | "tracker"
  | "uploaded"
  | "priority";

export interface Column {
  id: ColumnId;
  label: string;
  width: string;
  align?: "right";
  sort: (t: Torrent) => number | string;
  render: (t: Torrent) => ReactNode;
}

const dim = (v: number, s: string) => <span className={cn(v === 0 && "text-muted-foreground/50")}>{s}</span>;

export function ProgressBar({ t, className }: { t: Torrent; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", progressTone(t.state, t.progress))}
        style={{ width: `${Math.min(100, t.progress * 100)}%` }}
      />
    </div>
  );
}

export const columns: Column[] = [
  {
    id: "size",
    label: "大小",
    width: "88px",
    align: "right",
    sort: (t) => t.size,
    render: (t) => fmtBytes(t.size),
  },
  {
    id: "progress",
    label: "进度",
    width: "140px",
    sort: (t) => t.progress,
    render: (t) => (
      <div className="flex w-full items-center gap-2.5">
        <ProgressBar t={t} className="flex-1" />
        <span className="w-11 text-right text-muted-foreground">{fmtPct(t.progress)}</span>
      </div>
    ),
  },
  {
    id: "state",
    label: "状态",
    width: "124px",
    sort: (t) => t.state,
    render: (t) => <StateBadge state={t.state} progress={t.progress} />,
  },
  {
    id: "dlspeed",
    label: "下载",
    width: "96px",
    align: "right",
    sort: (t) => t.dlspeed,
    render: (t) => dim(t.dlspeed, t.dlspeed > 0 ? fmtSpeed(t.dlspeed) : "—"),
  },
  {
    id: "upspeed",
    label: "上传",
    width: "96px",
    align: "right",
    sort: (t) => t.upspeed,
    render: (t) => dim(t.upspeed, t.upspeed > 0 ? fmtSpeed(t.upspeed) : "—"),
  },
  {
    id: "eta",
    label: "剩余时间",
    width: "88px",
    align: "right",
    sort: (t) => (t.eta >= 8640000 ? Number.MAX_SAFE_INTEGER : t.eta),
    render: (t) => <span className="text-muted-foreground">{t.progress >= 1 ? "—" : fmtEta(t.eta)}</span>,
  },
  {
    id: "ratio",
    label: "分享率",
    width: "72px",
    align: "right",
    sort: (t) => t.ratio,
    render: (t) => fmtRatio(t.ratio),
  },
  {
    id: "peers",
    label: "种子 / 用户",
    width: "104px",
    align: "right",
    sort: (t) => t.num_seeds * 1e6 + t.num_leechs,
    render: (t) => (
      <span className="text-muted-foreground">
        <span className="text-foreground">{t.num_seeds}</span>
        <span className="text-muted-foreground/60">({t.num_complete})</span> /{" "}
        <span className="text-foreground">{t.num_leechs}</span>
        <span className="text-muted-foreground/60">({t.num_incomplete})</span>
      </span>
    ),
  },
  {
    id: "category",
    label: "分类",
    width: "112px",
    sort: (t) => t.category || "",
    render: (t) => <span className="truncate text-muted-foreground">{t.category || "—"}</span>,
  },
  {
    id: "added_on",
    label: "添加时间",
    width: "152px",
    sort: (t) => t.added_on,
    render: (t) => <span className="text-muted-foreground">{fmtDate(t.added_on)}</span>,
  },
  {
    id: "tracker",
    label: "Tracker",
    width: "160px",
    sort: (t) => trackerHost(t.tracker),
    render: (t) => <span className="truncate text-muted-foreground">{trackerHost(t.tracker) || "—"}</span>,
  },
  {
    id: "uploaded",
    label: "已上传",
    width: "88px",
    align: "right",
    sort: (t) => t.uploaded,
    render: (t) => fmtBytes(t.uploaded),
  },
  {
    id: "priority",
    label: "队列",
    width: "60px",
    align: "right",
    sort: (t) => (t.priority > 0 ? t.priority : Number.MAX_SAFE_INTEGER),
    render: (t) => <span className="text-muted-foreground">{t.priority > 0 ? t.priority : "—"}</span>,
  },
];

export const defaultVisible: Record<ColumnId, boolean> = {
  size: true,
  progress: true,
  state: true,
  dlspeed: true,
  upspeed: true,
  eta: true,
  ratio: true,
  peers: false,
  category: false,
  added_on: false,
  tracker: false,
  uploaded: false,
  priority: false,
};
