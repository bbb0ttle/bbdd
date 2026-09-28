import { stateKind, stateLabel, type StateKind } from "../state";

const styles: Record<StateKind, string> = {
  down: "text-accent bg-accent-soft",
  up: "text-ok bg-ok-soft",
  idle: "text-fg-3 bg-white/[0.06]",
  stalled: "text-warn bg-warn-soft",
  paused: "text-fg-2 bg-white/[0.06]",
  busy: "text-warn bg-warn-soft",
  err: "text-err bg-err-soft",
};

const dot: Record<StateKind, string> = {
  down: "bg-accent animate-pulse",
  up: "bg-ok",
  idle: "bg-fg-3",
  stalled: "bg-warn",
  paused: "bg-fg-3",
  busy: "bg-warn animate-pulse",
  err: "bg-err",
};

export function Badge({ state }: { state: string }) {
  const k = stateKind(state);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[k]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[k]}`} />
      {stateLabel(state)}
    </span>
  );
}
