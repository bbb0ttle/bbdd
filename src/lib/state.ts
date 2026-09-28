import type { Torrent } from "@/api";

export type StateKind = "down" | "up" | "paused" | "stalled" | "busy" | "err" | "idle" | "done";

export function stateKind(s: string, progress = 0): StateKind {
  if (s === "error" || s === "missingFiles") return "err";
  if (s === "downloading" || s === "forcedDL" || s === "moving") return "down";
  if (s === "uploading" || s === "forcedUP") return "up";
  if (s === "stalledDL" || s === "queuedDL" || s === "forcedMetaDL") return "stalled";
  if (s === "stalledUP" || s === "queuedUP") return "idle";
  if (s.startsWith("paused") || s.startsWith("stopped")) return progress >= 1 ? "done" : "paused";
  if (s.startsWith("checking") || s === "allocating" || s === "metaDL" || s === "queuedForChecking")
    return "busy";
  return "idle";
}

const labels: Record<string, string> = {
  downloading: "下载中",
  forcedDL: "强制下载",
  stalledDL: "等待来源",
  queuedDL: "排队下载",
  metaDL: "获取元数据",
  forcedMetaDL: "获取元数据",
  pausedDL: "已停止",
  stoppedDL: "已停止",
  uploading: "做种中",
  forcedUP: "强制做种",
  stalledUP: "做种（空闲）",
  queuedUP: "排队做种",
  pausedUP: "已完成",
  stoppedUP: "已完成",
  checkingDL: "校验中",
  checkingUP: "校验中",
  checkingResumeData: "校验恢复数据",
  queuedForChecking: "排队校验",
  moving: "移动中",
  allocating: "分配空间",
  error: "错误",
  missingFiles: "文件缺失",
  unknown: "未知",
};

export const stateLabel = (s: string) => labels[s] ?? s;

export const isStopped = (t: Torrent) => t.state.startsWith("paused") || t.state.startsWith("stopped");

export type StatusFilter =
  | "all"
  | "downloading"
  | "seeding"
  | "completed"
  | "running"
  | "stopped"
  | "active"
  | "inactive"
  | "stalled"
  | "checking"
  | "moving"
  | "errored";

export function matchStatus(t: Torrent, f: StatusFilter): boolean {
  const s = t.state;
  switch (f) {
    case "all":
      return true;
    case "downloading":
      return ["downloading", "forcedDL", "stalledDL", "queuedDL", "metaDL", "forcedMetaDL", "pausedDL", "stoppedDL", "checkingDL"].includes(s);
    case "seeding":
      return ["uploading", "forcedUP", "stalledUP", "queuedUP", "checkingUP"].includes(s);
    case "completed":
      return t.progress >= 1;
    case "running":
      return !isStopped(t);
    case "stopped":
      return isStopped(t);
    case "active":
      return t.dlspeed > 0 || t.upspeed > 0;
    case "inactive":
      return t.dlspeed === 0 && t.upspeed === 0;
    case "stalled":
      return s === "stalledDL" || s === "stalledUP";
    case "checking":
      return s.startsWith("checking") || s === "queuedForChecking";
    case "moving":
      return s === "moving";
    case "errored":
      return s === "error" || s === "missingFiles";
  }
}
