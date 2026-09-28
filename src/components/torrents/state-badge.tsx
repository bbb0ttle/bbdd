import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  CircleDashedIcon,
  CirclePauseIcon,
  HourglassIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stateKind, stateLabel, type StateKind } from "@/lib/state";

const tone: Record<StateKind, string> = {
  down: "text-info bg-info/12 ring-info/20",
  up: "text-success bg-success/12 ring-success/20",
  done: "text-success bg-success/10 ring-success/15",
  idle: "text-muted-foreground bg-muted/60 ring-border",
  stalled: "text-warning bg-warning/12 ring-warning/20",
  paused: "text-muted-foreground bg-muted/60 ring-border",
  busy: "text-warning bg-warning/12 ring-warning/20",
  err: "text-destructive bg-destructive/12 ring-destructive/25",
};

const icon: Record<StateKind, typeof ArrowDownIcon> = {
  down: ArrowDownIcon,
  up: ArrowUpIcon,
  done: CheckIcon,
  idle: ArrowUpIcon,
  stalled: HourglassIcon,
  paused: CirclePauseIcon,
  busy: LoaderCircleIcon,
  err: AlertTriangleIcon,
};

export function StateBadge({ state, progress, className }: { state: string; progress: number; className?: string }) {
  const k = stateKind(state, progress);
  const Icon = state ? icon[k] : CircleDashedIcon;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tone[k],
        className,
      )}
    >
      <Icon className={cn("size-3.5", k === "busy" && "animate-spin")} aria-hidden />
      {stateLabel(state)}
    </span>
  );
}

export function progressTone(state: string, progress: number) {
  const k = stateKind(state, progress);
  if (k === "err") return "bg-destructive";
  if (k === "down") return "bg-info";
  if (progress >= 1) return "bg-success";
  if (k === "stalled" || k === "busy") return "bg-warning";
  return "bg-muted-foreground/60";
}
