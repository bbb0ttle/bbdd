import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as api from "@/api";
import type { Preferences } from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { cn } from "@/lib/utils";
import { settingsTabs, type FieldDef } from "./settings-schema";

type Value = string | number | boolean;

function fromPref(f: FieldDef, v: unknown): Value {
  if (f.type === "bool") return !!v;
  if (f.type === "number") return v === undefined || v === null ? "" : String(Number(v) / (f.scale ?? 1));
  if (f.type === "select") return String(v ?? "");
  return v === undefined || v === null ? "" : String(v);
}

function toPref(f: FieldDef, v: Value, orig: unknown): unknown {
  if (f.type === "bool") return !!v;
  if (f.type === "number") {
    const n = Number(v || 0);
    return f.scale ? Math.round(n * f.scale) : n;
  }
  if (f.type === "select") {
    if (typeof orig === "number") return Number(v);
    if (typeof orig === "boolean") return v === "true";
    return v;
  }
  return v;
}

export function SettingsDialog() {
  const { closeDialog } = useUI();
  const { run } = useStore();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [values, setValues] = useState<Record<string, Value>>({});
  const [busy, setBusy] = useState(false);

  const fields = useMemo(() => settingsTabs.flatMap((t) => t.sections.flatMap((s) => s.fields)), []);

  useEffect(() => {
    api
      .getPreferences()
      .then((p) => {
        setPrefs(p);
        const v: Record<string, Value> = {};
        for (const f of fields) v[f.key] = fromPref(f, f.key === "web_ui_password" ? "" : p[f.key]);
        setValues(v);
      })
      .catch(() => {});
  }, [fields]);

  const changed = useMemo(() => {
    if (!prefs) return {};
    const out: Preferences = {};
    for (const f of fields) {
      if (!(f.key in prefs) && f.key !== "web_ui_password") continue;
      const initial = fromPref(f, f.key === "web_ui_password" ? "" : prefs[f.key]);
      if (values[f.key] !== initial) {
        if (f.key === "web_ui_password" && !values[f.key]) continue;
        out[f.key] = toPref(f, values[f.key], prefs[f.key]);
      }
    }
    return out;
  }, [prefs, values, fields]);
  const nChanged = Object.keys(changed).length;

  const save = async () => {
    setBusy(true);
    const ok = await run(() => api.setPreferences(changed), "设置已保存");
    setBusy(false);
    if (ok) closeDialog();
  };

  const set = (k: string, v: Value) => setValues((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && closeDialog()}>
      <DialogContent className="flex h-[min(760px,92svh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription className="sr-only">qBittorrent 首选项</DialogDescription>
        </DialogHeader>
        {prefs && (
          <Tabs defaultValue="downloads" orientation="vertical" className="min-h-0 flex-1 flex-col gap-0 sm:flex-row">
            <div className="shrink-0 overflow-x-auto border-b sm:w-44 sm:border-r sm:border-b-0">
              <TabsList variant="line" className="h-auto w-max flex-row gap-0.5 p-2 sm:w-full sm:flex-col sm:items-stretch">
                {settingsTabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="h-9 justify-start px-3 text-[13px] after:hidden data-active:bg-muted">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {settingsTabs.map((t) => (
                <TabsContent key={t.id} value={t.id} className="m-0 space-y-8 px-6 py-5">
                  {t.sections.map((s) => {
                    const visible = s.fields.filter((f) => f.key in prefs || f.key === "web_ui_password");
                    if (visible.length === 0) return null;
                    return (
                      <section key={s.title} className="space-y-1">
                        <h3 className="pb-1 text-sm font-semibold tracking-tight">{s.title}</h3>
                        <div className="divide-y divide-border/60">
                          {visible.map((f) => (
                            <FieldRow
                              key={f.key}
                              f={f}
                              value={values[f.key]}
                              disabled={!!f.dependsOn && !values[f.dependsOn]}
                              onChange={(v) => set(f.key, v)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}
        <DialogFooter className="mx-0 mb-0 rounded-b-none items-center border-t px-6 py-3">
          <span className="mr-auto text-xs text-muted-foreground tnum">{nChanged > 0 ? `${nChanged} 项更改` : ""}</span>
          <Button variant="outline" onClick={closeDialog}>
            取消
          </Button>
          <Button disabled={busy || nChanged === 0} onClick={save}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ f, value, disabled, onChange }: { f: FieldDef; value: Value; disabled: boolean; onChange: (v: Value) => void }) {
  const id = `pref-${f.key}`;
  const wide = f.type === "textarea" || (f.type === "text" && f.mono);
  return (
    <div className={cn("flex gap-x-6 gap-y-2 py-3", wide ? "flex-col" : "items-center justify-between", disabled && "opacity-50")}>
      <label htmlFor={id} className="min-w-0 text-[13px]">
        {f.label}
        {f.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{f.hint}</span>}
      </label>
      {f.type === "bool" && <Switch id={id} disabled={disabled} checked={!!value} onCheckedChange={onChange} />}
      {f.type === "number" && (
        <div className="relative w-36 shrink-0">
          <Input
            id={id}
            disabled={disabled}
            inputMode="decimal"
            className={cn("h-9 text-right tnum", f.unit && "pr-14")}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.-]/g, ""))}
          />
          {f.unit && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{f.unit}</span>
          )}
        </div>
      )}
      {(f.type === "text" || f.type === "password") && (
        <Input
          id={id}
          type={f.type === "password" ? "password" : "text"}
          autoComplete={f.type === "password" ? "new-password" : "off"}
          disabled={disabled}
          className={cn("h-9", wide ? "w-full" : "w-56", "mono" in f && f.mono && "font-mono text-xs")}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {f.type === "textarea" && (
        <Textarea
          id={id}
          disabled={disabled}
          rows={4}
          className={cn("w-full", f.mono && "font-mono text-xs")}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {f.type === "select" && (
        <Select disabled={disabled} value={String(value)} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-9! w-48 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {f.options.map(([v, l]) => (
              <SelectItem key={String(v)} value={String(v)}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
