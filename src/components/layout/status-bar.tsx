import { ArrowDownIcon, ArrowUpIcon, HardDriveIcon, NetworkIcon, TurtleIcon, WifiIcon, WifiOffIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import * as api from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { fmtBytes, fmtSpeed } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { server: s, connected, run } = useStore();
  const { openDialog } = useUI();
  const status = !connected ? "disconnected" : (s.connection_status ?? "disconnected");
  const statusLabel = { connected: "已连接", firewalled: "受防火墙限制", disconnected: "未连接" }[status];
  const StatusIcon = status === "disconnected" ? WifiOffIcon : WifiIcon;

  return (
    <footer className="flex h-9 shrink-0 items-center gap-1 border-t bg-background px-2 text-xs text-muted-foreground tnum">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden items-center gap-1.5 px-2 sm:inline-flex">
            <StatusIcon
              className={cn(
                "size-4",
                status === "connected" && "text-success",
                status === "firewalled" && "text-warning",
                status === "disconnected" && "text-destructive",
              )}
            />
            {statusLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {s.last_external_address_v4 ? `外部 IP：${s.last_external_address_v4}` : "连接状态"}
        </TooltipContent>
      </Tooltip>
      <span className="hidden items-center gap-1.5 px-2 md:inline-flex">
        <NetworkIcon className="size-4" /> DHT {s.dht_nodes ?? 0}
      </span>
      <span className="hidden items-center gap-1.5 px-2 md:inline-flex">
        <HardDriveIcon className="size-4" /> 剩余 {fmtBytes(s.free_space_on_disk ?? -1)}
      </span>
      <div className="ml-auto flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-pressed={!!s.use_alt_speed_limits}
              aria-label="备用速度限制"
              onClick={() => run(() => api.toggleAltSpeed())}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]",
                s.use_alt_speed_limits && "bg-warning/12 text-warning hover:bg-warning/20 hover:text-warning",
              )}
            >
              <TurtleIcon className="size-4" />
              <span className="hidden sm:inline">{s.use_alt_speed_limits ? "备用限速已启用" : "备用限速"}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>切换备用速度限制</TooltipContent>
        </Tooltip>
        <button
          type="button"
          onClick={() => openDialog({ type: "globalLimits" })}
          className="inline-flex h-7 items-center gap-3 rounded-md px-2 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="全局速度限制"
        >
          <span className="inline-flex items-center gap-1">
            <ArrowDownIcon className="size-4 text-info" />
            <span className="text-foreground">{fmtSpeed(s.dl_info_speed ?? 0)}</span>
            {!!s.dl_rate_limit && <span className="hidden lg:inline">[{fmtSpeed(s.dl_rate_limit)}]</span>}
            <span className="hidden lg:inline">({fmtBytes(s.dl_info_data ?? 0)})</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowUpIcon className="size-4 text-success" />
            <span className="text-foreground">{fmtSpeed(s.up_info_speed ?? 0)}</span>
            {!!s.up_rate_limit && <span className="hidden lg:inline">[{fmtSpeed(s.up_rate_limit)}]</span>}
            <span className="hidden lg:inline">({fmtBytes(s.up_info_data ?? 0)})</span>
          </span>
        </button>
      </div>
    </footer>
  );
}
