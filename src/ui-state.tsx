import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { StatusFilter } from "@/lib/state";

export type View = "transfers" | "search" | "rss" | "log";

export interface Filters {
  status: StatusFilter;
  category: string | null;
  tag: string | null;
  tracker: string | null;
}

export type DialogState =
  | { type: "add"; urls?: string; files?: File[]; downloader?: string }
  | { type: "delete"; hashes: string[] }
  | { type: "location"; hashes: string[] }
  | { type: "rename"; hash: string }
  | { type: "category"; edit?: string; assignTo?: string[] }
  | { type: "tags"; hashes: string[] }
  | { type: "newTag"; assignTo?: string[] }
  | { type: "limits"; hashes: string[] }
  | { type: "share"; hashes: string[] }
  | { type: "globalLimits" }
  | { type: "settings" }
  | { type: "about" }
  | { type: "stats" };

interface UI {
  view: View;
  setView: (v: View) => void;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  query: string;
  setQuery: (q: string) => void;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  detail: string | null;
  setDetail: (h: string | null) => void;
  dialog: DialogState | null;
  openDialog: (d: DialogState) => void;
  closeDialog: () => void;
}

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("transfers");
  const [filters, setFiltersState] = useState<Filters>({
    status: "all",
    category: null,
    tag: null,
    tracker: null,
  });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
    setSelected(new Set());
  }, []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const value = useMemo(
    () => ({
      view,
      setView,
      filters,
      setFilters,
      query,
      setQuery,
      selected,
      setSelected,
      detail,
      setDetail,
      dialog,
      openDialog: setDialog,
      closeDialog,
    }),
    [view, filters, setFilters, query, selected, detail, dialog, closeDialog],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI(): UI {
  const s = useContext(Ctx);
  if (!s) throw new Error("useUI outside UIProvider");
  return s;
}
