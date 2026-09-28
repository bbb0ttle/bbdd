// qBittorrent v5 torrent states → display semantics
export type StateKind = "down" | "up" | "paused" | "stalled" | "busy" | "err" | "idle";

export function stateKind(s: string): StateKind {
  if (s === "error" || s === "missingFiles") return "err";
  if (s === "downloading" || s === "forcedDL" || s === "moving") return "down";
  if (s === "uploading" || s === "forcedUP") return "up";
  if (s === "stalledDL" || s === "queuedDL" || s === "forcedMetaDL") return "stalled";
  if (s === "stalledUP" || s === "queuedUP") return "idle";
  if (s.startsWith("paused") || s.startsWith("stopped")) return "paused";
  if (
    s.startsWith("checking") ||
    s === "allocating" ||
    s === "metaDL" ||
    s === "queuedForChecking"
  )
    return "busy";
  return "idle";
}

export function stateLabel(s: string): string {
  const map: Record<string, string> = {
    downloading: "下载中",
    forcedDL: "强制下载",
    stalledDL: "无源",
    queuedDL: "排队",
    metaDL: "取元数据",
    forcedMetaDL: "取元数据",
    pausedDL: "已暂停",
    stoppedDL: "已暂停",
    uploading: "做种中",
    forcedUP: "强制做种",
    stalledUP: "做种",
    queuedUP: "排队做种",
    pausedUP: "已暂停",
    stoppedUP: "已完成",
    checkingDL: "校验中",
    checkingUP: "校验中",
    checkingResumeData: "校验中",
    queuedForChecking: "待校验",
    moving: "移动中",
    allocating: "分配空间",
    error: "错误",
    missingFiles: "缺文件",
    unknown: "未知",
  };
  return map[s] ?? s;
}
