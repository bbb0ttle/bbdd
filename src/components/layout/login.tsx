import { useState, type FormEvent } from "react";
import { DownloadCloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/api";

export function Login({ onOk }: { onOk: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (await login(user, pass)) onOk();
      else setErr("用户名或密码错误");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "无法建立连接");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm animate-in duration-300 fade-in-0 slide-in-from-bottom-2">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border bg-card shadow-sm">
            <DownloadCloudIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">qBittorrent</h1>
            <p className="mt-1 text-sm text-muted-foreground">登录以管理下载任务</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="user">用户名</FieldLabel>
              <Input id="user" autoFocus autoComplete="username" className="h-10" value={user} onChange={(e) => setUser(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="pass">密码</FieldLabel>
              <Input
                id="pass"
                type="password"
                autoComplete="current-password"
                className="h-10"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </Field>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" size="lg" className="h-10 w-full" disabled={busy || !user || !pass}>
              {busy && <Spinner />}
              登录
            </Button>
          </FieldGroup>
        </div>
      </form>
    </div>
  );
}
