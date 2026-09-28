import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, FileIcon, UploadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as api from "@/api";
import type { AddOptions } from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { cn } from "@/lib/utils";
import { fmtBytes } from "@/lib/format";

const NONE = "__none__";

function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex h-9 items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function AddDialog({ initialUrls = "", initialFiles = [] }: { initialUrls?: string; initialFiles?: File[] }) {
  const { categories, tags: allTags, run } = useStore();
  const { closeDialog } = useUI();
  const [urls, setUrls] = useState(initialUrls);
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adv, setAdv] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [autoTMM, setAutoTMM] = useState(false);
  const [savepath, setSavepath] = useState("");
  const [category, setCategory] = useState(NONE);
  const [tags, setTags] = useState<string[]>([]);
  const [rename, setRename] = useState("");
  const [stopped, setStopped] = useState(false);
  const [skipCheck, setSkipCheck] = useState(false);
  const [seq, setSeq] = useState(false);
  const [flp, setFlp] = useState(false);
  const [top, setTop] = useState(false);
  const [layout, setLayout] = useState<NonNullable<AddOptions["contentLayout"]>>("Original");
  const [stopCond, setStopCond] = useState<NonNullable<AddOptions["stopCondition"]>>("None");
  const [dl, setDl] = useState("");
  const [up, setUp] = useState("");

  useEffect(() => {
    api
      .getPreferences()
      .then((p) => {
        setSavepath(String(p.save_path ?? ""));
        setAutoTMM(!!p.auto_tmm_enabled);
        setStopped(!!(p.add_stopped_enabled ?? p.start_paused_enabled));
        setTop(!!p.add_to_top_of_queue);
        if (typeof p.torrent_content_layout === "string") setLayout(p.torrent_content_layout as typeof layout);
        if (typeof p.torrent_stop_condition === "string") setStopCond(p.torrent_stop_condition as typeof stopCond);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (autoTMM && category !== NONE) setSavepath(categories[category]?.savePath ?? "");
  }, [autoTMM, category, categories]);

  const addFiles = (list: FileList | File[]) => {
    const next = [...list].filter((f) => f.name.endsWith(".torrent"));
    setFiles((prev) => [...prev, ...next.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))]);
  };

  const canSubmit = urls.trim().length > 0 || files.length > 0;

  const submit = async () => {
    setBusy(true);
    const ok = await run(
      () =>
        api.addTorrents(urls, files, {
          autoTMM,
          savepath: autoTMM ? undefined : savepath || undefined,
          category: category === NONE ? undefined : category,
          tags: tags.join(",") || undefined,
          rename: rename || undefined,
          stopped,
          skip_checking: skipCheck,
          sequentialDownload: seq,
          firstLastPiecePrio: flp,
          addToTopOfQueue: top,
          contentLayout: layout,
          stopCondition: stopCond,
          dlLimit: dl ? Number(dl) * 1024 : undefined,
          upLimit: up ? Number(up) * 1024 : undefined,
        }),
      "已添加任务",
    );
    setBusy(false);
    if (ok) closeDialog();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>添加任务</DialogTitle>
          <DialogDescription>粘贴磁力链接、HTTP 链接或选择 .torrent 文件。</DialogDescription>
        </DialogHeader>
        <div className="max-h-[calc(92svh-140px)] space-y-5 overflow-y-auto px-6 py-5">
          <Textarea
            autoFocus
            rows={4}
            className="min-h-24 font-mono text-xs"
            placeholder={"magnet:?xt=urn:btih:…\nhttps://example.org/file.torrent"}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/30",
              drag && "border-info bg-info/5 text-foreground",
            )}
          >
            <UploadIcon className="size-5" />
            <span>拖放 .torrent 文件到此处，或点击选择</span>
            <input
              ref={fileRef}
              type="file"
              accept=".torrent,application/x-bittorrent"
              multiple
              hidden
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border px-3 py-2 text-[13px]">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground tnum">{fmtBytes(f.size)}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="移除"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <FieldGroup className="gap-4">
            <SwitchRow label="自动管理（按分类决定保存路径）" checked={autoTMM} onChange={setAutoTMM} />
            <Field>
              <FieldLabel htmlFor="savepath">保存路径</FieldLabel>
              <Input
                id="savepath"
                disabled={autoTMM}
                className="h-10 font-mono text-xs"
                value={savepath}
                onChange={(e) => setSavepath(e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>分类</FieldLabel>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10! w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>无分类</SelectItem>
                    {Object.keys(categories)
                      .sort()
                      .map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="rename">重命名</FieldLabel>
                <Input id="rename" className="h-10" placeholder="保持原名" value={rename} onChange={(e) => setRename(e.target.value)} />
              </Field>
            </div>
            {allTags.length > 0 && (
              <Field>
                <FieldLabel>标签</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {[...allTags].sort().map((tag) => {
                    const on = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTags(on ? tags.filter((t) => t !== tag) : [...tags, tag])}
                        className={cn(
                          "h-7 rounded-full border px-3 text-xs transition-colors active:scale-[0.97]",
                          on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
            <div className="grid gap-x-6 sm:grid-cols-2">
              <SwitchRow label="添加后不启动" checked={stopped} onChange={setStopped} />
              <SwitchRow label="添加到队列顶部" checked={top} onChange={setTop} />
            </div>
          </FieldGroup>

          <Collapsible open={adv} onOpenChange={setAdv}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ChevronRightIcon className={cn("size-4 transition-transform duration-200", adv && "rotate-90")} />
              高级选项
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <FieldGroup className="gap-4">
                <div className="grid gap-x-6 sm:grid-cols-2">
                  <SwitchRow label="跳过哈希校验" checked={skipCheck} onChange={setSkipCheck} />
                  <SwitchRow label="按顺序下载" checked={seq} onChange={setSeq} />
                  <SwitchRow label="优先下载首尾文件块" checked={flp} onChange={setFlp} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>内容布局</FieldLabel>
                    <Select value={layout} onValueChange={(v) => setLayout(v as typeof layout)}>
                      <SelectTrigger className="h-10! w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Original">原始</SelectItem>
                        <SelectItem value="Subfolder">创建子文件夹</SelectItem>
                        <SelectItem value="NoSubfolder">不创建子文件夹</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>停止条件</FieldLabel>
                    <Select value={stopCond} onValueChange={(v) => setStopCond(v as typeof stopCond)}>
                      <SelectTrigger className="h-10! w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">无</SelectItem>
                        <SelectItem value="MetadataReceived">已收到元数据</SelectItem>
                        <SelectItem value="FilesChecked">文件已校验</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="adl">下载限速（KiB/s）</FieldLabel>
                    <Input id="adl" inputMode="numeric" className="h-10 tnum" placeholder="不限" value={dl} onChange={(e) => setDl(e.target.value.replace(/\D/g, ""))} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="aup">上传限速（KiB/s）</FieldLabel>
                    <Input id="aup" inputMode="numeric" className="h-10 tnum" placeholder="不限" value={up} onChange={(e) => setUp(e.target.value.replace(/\D/g, ""))} />
                  </Field>
                </div>
              </FieldGroup>
            </CollapsibleContent>
          </Collapsible>
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-b-none border-t px-6 py-4">
          <Button variant="outline" onClick={closeDialog}>
            取消
          </Button>
          <Button disabled={!canSubmit || busy} onClick={submit}>
            添加{files.length + urls.split("\n").filter((s) => s.trim()).length > 1 ? ` ${files.length + urls.split("\n").filter((s) => s.trim()).length} 项` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
