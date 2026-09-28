import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as api from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { fmtBytes } from "@/lib/format";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tnum">{children}</dd>
    </div>
  );
}

export function AboutDialog() {
  const { closeDialog } = useUI();
  const [info, setInfo] = useState<{ version: string; api: string; build: Record<string, string | number> } | null>(null);
  useEffect(() => {
    Promise.all([api.appVersion(), api.webapiVersion(), api.buildInfo()])
      .then(([version, a, build]) => setInfo({ version, api: a, build }))
      .catch(() => {});
  }, []);
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>关于</DialogTitle>
          <DialogDescription>qBittorrent 与本 WebUI 的版本信息。</DialogDescription>
        </DialogHeader>
        <dl className="divide-y divide-border/60">
          <Row label="qBittorrent">{info?.version ?? "—"}</Row>
          <Row label="Web API">{info?.api ?? "—"}</Row>
          {info &&
            Object.entries(info.build).map(([k, v]) => (
              <Row key={k} label={k}>
                {String(v)}
              </Row>
            ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export function StatsDialog() {
  const { closeDialog } = useUI();
  const { server: s } = useStore();
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>统计</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <section>
            <h3 className="text-xs font-medium text-muted-foreground">用户统计</h3>
            <dl className="divide-y divide-border/60">
              <Row label="历史下载">{fmtBytes(s.alltime_dl ?? 0)}</Row>
              <Row label="历史上传">{fmtBytes(s.alltime_ul ?? 0)}</Row>
              <Row label="全局分享率">{s.global_ratio ?? "—"}</Row>
              <Row label="本次会话浪费">{fmtBytes(s.total_wasted_session ?? 0)}</Row>
              <Row label="已连接用户">{s.total_peer_connections ?? 0}</Row>
            </dl>
          </section>
          <section>
            <h3 className="text-xs font-medium text-muted-foreground">缓存与队列</h3>
            <dl className="divide-y divide-border/60">
              <Row label="读缓存命中">{s.read_cache_hits ?? "—"}%</Row>
              <Row label="缓冲区大小">{fmtBytes(s.total_buffers_size ?? 0)}</Row>
              <Row label="写缓存过载">{s.write_cache_overload ?? "—"}%</Row>
              <Row label="读缓存过载">{s.read_cache_overload ?? "—"}%</Row>
              <Row label="排队 I/O 任务">{s.queued_io_jobs ?? 0}</Row>
              <Row label="平均排队时间">{s.average_time_queue ?? 0} ms</Row>
            </dl>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
