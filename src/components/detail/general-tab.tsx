import type { ReactNode } from "react";
import { CopyIcon } from "lucide-react";
import type { Torrent } from "@/api";
import * as api from "@/api";
import { usePoll } from "@/hooks/use-poll";
import { copyText } from "@/lib/clipboard";
import { fmtBytes, fmtDate, fmtDuration, fmtEta, fmtLimit, fmtRatio, fmtSpeed } from "@/lib/format";
import { PieceBar } from "./piece-bar";

function Row({ label, children, copy }: { label: string; children: ReactNode; copy?: string }) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-baseline gap-3 py-1.5 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="group flex min-w-0 items-center gap-1.5 tnum break-all">
        <span className="min-w-0">{children}</span>
        {copy && (
          <button
            type="button"
            aria-label={`复制${label}`}
            className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            onClick={() => copyText(copy)}
          >
            <CopyIcon className="size-3.5" />
          </button>
        )}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <dl className="divide-y divide-border/50">{children}</dl>
    </section>
  );
}

export function GeneralTab({ t }: { t: Torrent }) {
  const { data: p } = usePoll(() => api.getProps(t.hash), [t.hash]);

  return (
    <div className="space-y-6 p-4">
      <PieceBar hash={t.hash} total={p?.pieces_num} have={p?.pieces_have} />
      <Section title="传输">
        <Row label="活动时间">
          {fmtDuration(p?.time_elapsed)}
          {p && p.seeding_time > 0 && <span className="text-muted-foreground">（做种 {fmtDuration(p.seeding_time)}）</span>}
        </Row>
        <Row label="剩余时间">{t.progress >= 1 ? "—" : fmtEta(t.eta)}</Row>
        <Row label="已下载">
          {fmtBytes(p?.total_downloaded ?? t.downloaded)}
          {p && <span className="text-muted-foreground">（本次 {fmtBytes(p.total_downloaded_session)}）</span>}
        </Row>
        <Row label="已上传">
          {fmtBytes(p?.total_uploaded ?? t.uploaded)}
          {p && <span className="text-muted-foreground">（本次 {fmtBytes(p.total_uploaded_session)}）</span>}
        </Row>
        <Row label="下载速度">
          {fmtSpeed(t.dlspeed)}
          {p && <span className="text-muted-foreground">（平均 {fmtSpeed(p.dl_speed_avg)}）</span>}
        </Row>
        <Row label="上传速度">
          {fmtSpeed(t.upspeed)}
          {p && <span className="text-muted-foreground">（平均 {fmtSpeed(p.up_speed_avg)}）</span>}
        </Row>
        <Row label="限速">
          ↓ {fmtLimit(t.dl_limit)} · ↑ {fmtLimit(t.up_limit)}
        </Row>
        <Row label="分享率">{fmtRatio(t.ratio)}</Row>
        <Row label="连接">
          {p ? `${p.nb_connections}（上限 ${p.nb_connections_limit < 0 ? "∞" : p.nb_connections_limit}）` : "—"}
        </Row>
        <Row label="种子">{p ? `${p.seeds}（共 ${p.seeds_total}）` : t.num_seeds}</Row>
        <Row label="用户">{p ? `${p.peers}（共 ${p.peers_total}）` : t.num_leechs}</Row>
        <Row label="浪费">{fmtBytes(p?.total_wasted ?? 0)}</Row>
        <Row label="下次汇报">{p ? fmtDuration(p.reannounce) : "—"}</Row>
        <Row label="最后完整可见">{fmtDate(p?.last_seen)}</Row>
        <Row label="可用性">{t.availability >= 0 ? t.availability.toFixed(3) : "—"}</Row>
      </Section>
      <Section title="信息">
        <Row label="总大小">{fmtBytes(p?.total_size ?? t.total_size)}</Row>
        <Row label="文件块">
          {p ? `${p.pieces_num} × ${fmtBytes(p.piece_size)}（已有 ${p.pieces_have}）` : "—"}
        </Row>
        <Row label="保存路径" copy={p?.save_path ?? t.save_path}>
          <span className="font-mono text-xs">{p?.save_path ?? t.save_path}</span>
        </Row>
        {(p?.download_path || t.download_path) && (
          <Row label="下载路径" copy={p?.download_path ?? t.download_path}>
            <span className="font-mono text-xs">{p?.download_path ?? t.download_path}</span>
          </Row>
        )}
        <Row label="添加时间">{fmtDate(t.added_on)}</Row>
        <Row label="完成时间">{fmtDate(t.completion_on)}</Row>
        <Row label="创建时间">{fmtDate(p?.creation_date)}</Row>
        <Row label="创建者">{p?.created_by || "—"}</Row>
        <Row label="私有">{p ? ((p.is_private ?? p.isPrivate) ? "是" : "否") : "—"}</Row>
        <Row label="信息哈希 v1" copy={p?.infohash_v1 || t.hash}>
          <span className="font-mono text-xs">{p?.infohash_v1 || t.hash}</span>
        </Row>
        {p?.infohash_v2 && (
          <Row label="信息哈希 v2" copy={p.infohash_v2}>
            <span className="font-mono text-xs">{p.infohash_v2}</span>
          </Row>
        )}
        <Row label="注释">
          <span className="whitespace-pre-wrap">{p?.comment || "—"}</span>
        </Row>
      </Section>
    </div>
  );
}
