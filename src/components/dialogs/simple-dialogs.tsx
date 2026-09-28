import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as api from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { usePersistentState } from "@/hooks/use-persistent-state";

export function FormDialog({
  title,
  description,
  submit,
  submitLabel = "保存",
  disabled,
  children,
  className = "sm:max-w-md",
}: {
  title: string;
  description?: ReactNode;
  submit: () => Promise<boolean>;
  submitLabel?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { closeDialog } = useUI();
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await submit();
    setBusy(false);
    if (ok) closeDialog();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className={className}>
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button type="submit" disabled={busy || disabled}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({ hashes }: { hashes: string[] }) {
  const { torrents, run } = useStore();
  const { closeDialog, setSelected, detail, setDetail } = useUI();
  const [deleteFiles, setDeleteFiles] = usePersistentState("deleteFiles", { v: false });
  const names = hashes.map((h) => torrents.get(h)?.name).filter(Boolean) as string[];
  return (
    <AlertDialog open onOpenChange={(o) => !o && closeDialog()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除 {hashes.length > 1 ? `${hashes.length} 个任务` : "任务"}？</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <ul className="max-h-40 space-y-1 overflow-auto rounded-md border bg-muted/30 p-2 text-left text-xs text-foreground">
                {names.map((n) => (
                  <li key={n} className="truncate">
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={deleteFiles.v} onCheckedChange={(v) => setDeleteFiles({ v: !!v })} />
          同时删除硬盘上的文件
        </label>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              run(() => api.del(hashes, deleteFiles.v), `已删除 ${hashes.length} 个任务`);
              setSelected(new Set());
              if (detail && hashes.includes(detail)) setDetail(null);
            }}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function LocationDialog({ hashes }: { hashes: string[] }) {
  const { torrents, run } = useStore();
  const first = torrents.get(hashes[0]);
  const [path, setPath] = useState(first?.save_path ?? "");
  return (
    <FormDialog
      title="设置保存位置"
      description={`${hashes.length} 个任务的数据将被移动到新位置。`}
      disabled={!path.trim()}
      submit={() => run(() => api.setLocation(hashes, path.trim()), "已开始移动")}
    >
      <Field>
        <FieldLabel htmlFor="loc">保存路径</FieldLabel>
        <Input id="loc" autoFocus className="h-10 font-mono text-xs" value={path} onChange={(e) => setPath(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

export function RenameDialog({ hash }: { hash: string }) {
  const { torrents, run } = useStore();
  const [name, setName] = useState(torrents.get(hash)?.name ?? "");
  return (
    <FormDialog title="重命名任务" disabled={!name.trim()} submit={() => run(() => api.rename(hash, name.trim()))}>
      <Input autoFocus className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
    </FormDialog>
  );
}

export function CategoryDialog({ edit, assignTo }: { edit?: string; assignTo?: string[] }) {
  const { categories, run } = useStore();
  const [name, setName] = useState(edit ?? "");
  const [savePath, setSavePath] = useState(edit ? (categories[edit]?.savePath ?? "") : "");
  return (
    <FormDialog
      title={edit ? "编辑分类" : "新建分类"}
      disabled={!name.trim()}
      submit={() =>
        run(async () => {
          if (edit) await api.editCategory(edit, savePath.trim());
          else {
            await api.createCategory(name.trim(), savePath.trim());
            if (assignTo?.length) await api.setCategory(assignTo, name.trim());
          }
        })
      }
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="cat">名称</FieldLabel>
          <Input id="cat" autoFocus={!edit} disabled={!!edit} className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="catpath">保存路径</FieldLabel>
          <Input
            id="catpath"
            autoFocus={!!edit}
            className="h-10 font-mono text-xs"
            placeholder="留空则使用默认路径"
            value={savePath}
            onChange={(e) => setSavePath(e.target.value)}
          />
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}

export function NewTagDialog({ assignTo }: { assignTo?: string[] }) {
  const { run } = useStore();
  const [text, setText] = useState("");
  const tags = text.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <FormDialog
      title="新建标签"
      description="多个标签以英文逗号分隔。"
      disabled={tags.length === 0}
      submit={() =>
        run(async () => {
          await api.createTags(tags);
          if (assignTo?.length) await api.addTags(assignTo, tags);
        })
      }
    >
      <Input autoFocus className="h-10" value={text} onChange={(e) => setText(e.target.value)} />
    </FormDialog>
  );
}

function KiBInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          className="h-10 pr-16 tnum"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">KiB/s</span>
      </div>
    </Field>
  );
}

const toKiB = (b: number) => (b > 0 ? String(Math.round(b / 1024)) : "");

export function LimitsDialog({ hashes }: { hashes: string[] }) {
  const { torrents, run } = useStore();
  const first = torrents.get(hashes[0]);
  const [dl, setDl] = useState(toKiB(first?.dl_limit ?? 0));
  const [up, setUp] = useState(toKiB(first?.up_limit ?? 0));
  return (
    <FormDialog
      title="限制速度"
      description="0 或留空表示不限制。"
      submit={() =>
        run(async () => {
          await api.setDownloadLimit(hashes, Number(dl || 0) * 1024);
          await api.setUploadLimit(hashes, Number(up || 0) * 1024);
        }, "速度限制已更新")
      }
    >
      <FieldGroup className="grid grid-cols-2 gap-4">
        <KiBInput id="dl" label="下载" value={dl} onChange={setDl} />
        <KiBInput id="up" label="上传" value={up} onChange={setUp} />
      </FieldGroup>
    </FormDialog>
  );
}

export function GlobalLimitsDialog() {
  const { server, run } = useStore();
  const [dl, setDl] = useState(toKiB(server.dl_rate_limit ?? 0));
  const [up, setUp] = useState(toKiB(server.up_rate_limit ?? 0));
  return (
    <FormDialog
      title="全局速度限制"
      description={server.use_alt_speed_limits ? "当前启用备用速度限制，修改将作用于备用限制。" : "0 或留空表示不限制。"}
      submit={() =>
        run(async () => {
          await api.setGlobalDlLimit(Number(dl || 0) * 1024);
          await api.setGlobalUpLimit(Number(up || 0) * 1024);
        }, "全局速度限制已更新")
      }
    >
      <FieldGroup className="grid grid-cols-2 gap-4">
        <KiBInput id="gdl" label="下载" value={dl} onChange={setDl} />
        <KiBInput id="gup" label="上传" value={up} onChange={setUp} />
      </FieldGroup>
    </FormDialog>
  );
}

type Mode = "global" | "none" | "custom";
const modeOf = (v: number): Mode => (v === -2 ? "global" : v === -1 ? "none" : "custom");

function ShareLimitRow({
  label,
  unit,
  mode,
  setMode,
  value,
  setValue,
}: {
  label: string;
  unit: string;
  mode: Mode;
  setMode: (m: Mode) => void;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex gap-4">
          {(
            [
              ["global", "全局"],
              ["none", "不限"],
              ["custom", "自定义"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={v} /> {l}
            </label>
          ))}
        </RadioGroup>
        <div className="relative ml-auto w-32">
          <Input
            disabled={mode !== "custom"}
            className="h-9 pr-12 tnum"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
    </Field>
  );
}

export function ShareDialog({ hashes }: { hashes: string[] }) {
  const { torrents, run } = useStore();
  const t = torrents.get(hashes[0]);
  const [rm, setRm] = useState<Mode>(modeOf(t?.ratio_limit ?? -2));
  const [r, setR] = useState(t && t.ratio_limit >= 0 ? String(t.ratio_limit) : "1");
  const [sm, setSm] = useState<Mode>(modeOf(t?.seeding_time_limit ?? -2));
  const [s, setS] = useState(t && t.seeding_time_limit >= 0 ? String(t.seeding_time_limit) : "1440");
  const [im, setIm] = useState<Mode>(modeOf(t?.inactive_seeding_time_limit ?? -2));
  const [i, setI] = useState(t && t.inactive_seeding_time_limit >= 0 ? String(t.inactive_seeding_time_limit) : "1440");
  const val = (m: Mode, v: string) => (m === "global" ? -2 : m === "none" ? -1 : Number(v || 0));
  return (
    <FormDialog
      title="限制分享比率"
      className="sm:max-w-lg"
      submit={() => run(() => api.setShareLimits(hashes, val(rm, r), val(sm, s), val(im, i)), "分享限制已更新")}
    >
      <FieldGroup className="gap-5">
        <ShareLimitRow label="分享率" unit="" mode={rm} setMode={setRm} value={r} setValue={setR} />
        <ShareLimitRow label="做种时间" unit="分钟" mode={sm} setMode={setSm} value={s} setValue={setS} />
        <ShareLimitRow label="非活动做种时间" unit="分钟" mode={im} setMode={setIm} value={i} setValue={setI} />
        <FieldDescription>达到任一限制后执行全局设置中配置的动作。</FieldDescription>
      </FieldGroup>
    </FormDialog>
  );
}
