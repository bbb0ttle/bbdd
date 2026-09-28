import { useCallback, useEffect, useState } from "react";
import { UploadIcon } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import { Login } from "@/components/layout/login";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { DialogHost } from "@/components/dialogs/dialog-host";
import { TransfersView } from "@/views/transfers";
import { SearchView } from "@/views/search";
import { RssView } from "@/views/rss";
import { LogView } from "@/views/log";
import * as api from "@/api";
import { StoreProvider, useStore } from "@/store";
import { UIProvider, useUI } from "@/ui-state";
import { cn } from "@/lib/utils";

type Auth = "checking" | "in" | "out";

export default function App() {
  const [auth, setAuth] = useState<Auth>("checking");

  useEffect(() => {
    api
      .checkAuth()
      .then((ok) => setAuth(ok ? "in" : "out"))
      .catch(() => setAuth("out"));
    const onUnauth = () => setAuth("out");
    window.addEventListener("qbt:unauthorized", onUnauth);
    return () => window.removeEventListener("qbt:unauthorized", onUnauth);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    setAuth("out");
  }, []);

  return (
    <TooltipProvider delayDuration={400}>
      {auth === "checking" ? (
        <div className="flex min-h-svh items-center justify-center">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : auth === "out" ? (
        <Login onOk={() => setAuth("in")} />
      ) : (
        <StoreProvider>
          <UIProvider>
            <Shell onLogout={logout} />
          </UIProvider>
        </StoreProvider>
      )}
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { view, openDialog, dialog } = useUI();
  const { server, torrents } = useStore();
  const [version, setVersion] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    api.appVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    const dl = server.dl_info_speed ?? 0;
    const up = server.up_info_speed ?? 0;
    const f = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}M` : `${Math.round(n / 1024)}K`);
    document.title = dl || up ? `↓${f(dl)} ↑${f(up)} · qBittorrent` : `qBittorrent (${torrents.size})`;
  }, [server.dl_info_speed, server.up_info_speed, torrents.size]);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) || dialog) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && !dialog && e.preventDefault();
    const drop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (!hasFiles(e) || dialog) return;
      e.preventDefault();
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.name.endsWith(".torrent"));
      if (files.length) openDialog({ type: "add", files });
    };
    const paste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (dialog || target.closest("input, textarea")) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (/^(magnet:\?|https?:\/\/|[0-9a-f]{40}$)/i.test(text.trim())) openDialog({ type: "add", urls: text.trim() });
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, [dialog, openDialog]);

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar onLogout={onLogout} version={version} />
      <SidebarInset className="min-w-0 overflow-hidden">
        {view === "transfers" && <TransfersView />}
        {view === "search" && <SearchView />}
        {view === "rss" && <RssView />}
        {view === "log" && <LogView />}
        <StatusBar />
      </SidebarInset>
      <DialogHost />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-foreground/30 px-16 py-12 text-sm">
          <UploadIcon className="size-8" />
          松开以添加 .torrent 文件
        </div>
      </div>
    </SidebarProvider>
  );
}
