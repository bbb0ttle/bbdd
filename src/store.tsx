import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { ApiError, syncMainData, type Category, type ServerState, type Torrent } from "@/api";

interface Data {
  torrents: Map<string, Torrent>;
  server: Partial<ServerState>;
  categories: Record<string, Category>;
  tags: string[];
  trackers: Record<string, string[]>;
  connected: boolean;
  loaded: boolean;
}

interface Store extends Data {
  refresh: () => void;
  run: (task: () => Promise<unknown>, success?: string) => Promise<boolean>;
}

const Ctx = createContext<Store | null>(null);

const empty: Data = {
  torrents: new Map(),
  server: {},
  categories: {},
  tags: [],
  trackers: {},
  connected: true,
  loaded: false,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(empty);
  const rid = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const interval = useRef(1500);

  const poll = useCallback(async () => {
    window.clearTimeout(timer.current);
    try {
      const d = await syncMainData(rid.current);
      rid.current = d.rid ?? 0;
      setData((prev) => {
        const full = !!d.full_update;
        const torrents = new Map(full ? [] : prev.torrents);
        for (const [h, patch] of Object.entries(d.torrents ?? {})) {
          const old = torrents.get(h);
          torrents.set(h, { ...(old ?? ({ hash: h } as Torrent)), ...(patch as Torrent), hash: h });
        }
        for (const h of d.torrents_removed ?? []) torrents.delete(h);

        const categories = { ...(full ? {} : prev.categories) };
        for (const [name, c] of Object.entries(d.categories ?? {})) {
          categories[name] = { ...categories[name], ...c, name } as Category;
        }
        for (const name of d.categories_removed ?? []) delete categories[name];

        let tags = full ? [] : prev.tags;
        if (d.tags) tags = [...new Set([...tags, ...d.tags])];
        if (d.tags_removed) tags = tags.filter((t) => !d.tags_removed!.includes(t));

        const trackers = { ...(full ? {} : prev.trackers), ...(d.trackers ?? {}) };
        for (const u of d.trackers_removed ?? []) delete trackers[u];

        const server = { ...prev.server, ...d.server_state };
        if (server.refresh_interval) interval.current = Math.max(500, server.refresh_interval);
        return { torrents, categories, tags, trackers, server, connected: true, loaded: true };
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) return;
      setData((p) => (p.connected ? { ...p, connected: false } : p));
    }
    timer.current = window.setTimeout(poll, document.hidden ? 5000 : interval.current);
  }, []);

  useEffect(() => {
    poll();
    const onVis = () => !document.hidden && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  const refresh = useCallback(() => {
    window.setTimeout(poll, 150);
  }, [poll]);

  const run = useCallback(
    async (task: () => Promise<unknown>, success?: string) => {
      try {
        await task();
        if (success) toast.success(success);
        refresh();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    [refresh],
  );

  const value = useMemo(() => ({ ...data, refresh, run }), [data, refresh, run]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
