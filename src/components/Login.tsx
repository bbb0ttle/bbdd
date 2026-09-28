import { useState } from "react";
import { login } from "../api";

export function Login({ onOk }: { onOk: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(false);
    try {
      if (await login(user, pass)) onOk();
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[320px] rounded-xl border border-hairline bg-surface p-6 shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="mb-6">
          <div className="text-[15px] font-medium tracking-tight">qBittorrent</div>
          <div className="mt-1 text-[13px] text-fg-2">登录到下载服务</div>
        </div>
        <label className="block text-[12px] text-fg-2 mb-1.5">用户名</label>
        <input
          autoFocus
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="w-full mb-4 rounded-lg border border-hairline bg-bg px-3 py-2 text-[13px] outline-none transition-colors focus:border-hairline-strong focus:ring-2 focus:ring-accent-soft"
        />
        <label className="block text-[12px] text-fg-2 mb-1.5">密码</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full mb-5 rounded-lg border border-hairline bg-bg px-3 py-2 text-[13px] outline-none transition-colors focus:border-hairline-strong focus:ring-2 focus:ring-accent-soft"
        />
        {err && <div className="mb-4 text-[12px] text-err">用户名或密码错误</div>}
        <button
          type="submit"
          disabled={busy || !user || !pass}
          className="w-full rounded-lg bg-fg text-bg py-2 text-[13px] font-medium transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
