import { useEffect, useRef } from "react";
import * as api from "@/api";
import { usePoll } from "@/hooks/use-poll";

export function PieceBar({ hash, total, have }: { hash: string; total?: number; have?: number }) {
  const { data } = usePoll(() => api.getPieceStates(hash), [hash], 5000);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !data) return;
    const w = c.clientWidth * devicePixelRatio;
    const h = c.clientHeight * devicePixelRatio;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(c);
    const color = { 1: css.getPropertyValue("--warning"), 2: css.getPropertyValue("--info") };
    ctx.clearRect(0, 0, w, h);
    const n = data.length;
    const bucket = Math.max(1, Math.ceil(n / w));
    for (let x = 0; x < w; x++) {
      const start = Math.floor((x / w) * n);
      let best = 0;
      for (let i = start; i < Math.min(n, start + bucket); i++) best = Math.max(best, data[i]);
      if (best === 0) continue;
      ctx.fillStyle = color[best as 1 | 2];
      ctx.fillRect(x, 0, 1, h);
    }
  }, [data]);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground tnum">
        <span>文件块分布</span>
        {total ? <span>{have ?? 0} / {total}</span> : null}
      </div>
      <canvas ref={ref} className="h-3 w-full rounded-sm bg-muted" aria-hidden />
    </div>
  );
}
