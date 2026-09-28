import { useMemo } from "react";
import type { Torrent } from "../api";
import { stateKind } from "../state";

export type Filter =
  | { kind: "all" }
  | { kind: "state"; key: "down" | "up" | "paused" | "stalled" | "err" | "done" | "notdone" }
  | { kind: "category"; name: string }
  | { kind: "tag"; name: string };

export function matchFilter(t: Torrent, f: Filter): boolean {
  switch (f.kind) {
    case "all":
      return true;
    case "state":
      switch (f.key) {
        case "down": return stateKind(t.state) === "down";
        case "up": return stateKind(t.state) === "up" || (t.progress >= 1 && stateKind(t.state) === "idle");
        case "paused": return stateKind(t.state) === "paused";
        case "stalled": return stateKind(t.state) === "stalled";
        case "err": return stateKind(t.state) === "err";
        case "done": return t.progress >= 1;
        case "notdone": return t.progress < 1;
      }
      return true;
    case "category":
      return (t.category || "") === (f.name === "__none__" ? "" : f.name);
    case "tag": {
      const tags = (t.tags ?? "").split(",").map((s) => s.trim());
      return f.name === "__none__" ? tags.every((s) => !s) : tags.includes(f.name);
    }
  }
}

function Item({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[12.5px] transition-colors ${
        active ? "bg-white/[0.07] text-fg" : "text-fg-2 hover:bg-white/[0.04]"
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="tnum text-[11px] text-fg-3">{count}</span>}
    </button>
  );
}

export function Sidebar({
  torrents,
  categories,
  tags,
  filter,
  onFilter,
}: {
  torrents: Map<string, Torrent>;
  categories: string[];
  tags: string[];
  filter: Filter;
  onFilter: (f: Filter) => void;
}) {
  const counts = useMemo(() => {
    const arr = [...torrents.values()];
    const c = (f: Filter) => arr.filter((t) => matchFilter(t, f)).length;
    return {
      all: arr.length,
      down: c({ kind: "state", key: "down" }),
      up: c({ kind: "state", key: "up" }),
      paused: c({ kind: "state", key: "paused" }),
      stalled: c({ kind: "state", key: "stalled" }),
      err: c({ kind: "state", key: "err" }),
      done: c({ kind: "state", key: "done" }),
    };
  }, [torrents]);

  const active = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter);

  return (
    <aside className="w-44 shrink-0 space-y-4 pr-1">
      <div>
        <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-fg-3">状态</div>
        <Item label="全部" count={counts.all} active={active({ kind: "all" })} onClick={() => onFilter({ kind: "all" })} />
        <Item label="下载中" count={counts.down} active={active({ kind: "state", key: "down" })} onClick={() => onFilter({ kind: "state", key: "down" })} />
        <Item label="做种" count={counts.up} active={active({ kind: "state", key: "up" })} onClick={() => onFilter({ kind: "state", key: "up" })} />
        <Item label="已完成" count={counts.done} active={active({ kind: "state", key: "done" })} onClick={() => onFilter({ kind: "state", key: "done" })} />
        <Item label="已暂停" count={counts.paused} active={active({ kind: "state", key: "paused" })} onClick={() => onFilter({ kind: "state", key: "paused" })} />
        <Item label="无源/排队" count={counts.stalled} active={active({ kind: "state", key: "stalled" })} onClick={() => onFilter({ kind: "state", key: "stalled" })} />
        {counts.err > 0 && (
          <Item label="错误" count={counts.err} active={active({ kind: "state", key: "err" })} onClick={() => onFilter({ kind: "state", key: "err" })} />
        )}
      </div>

      <div>
        <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-fg-3">分类</div>
        <Item
          label="无分类"
          count={[...torrents.values()].filter((t) => !t.category).length}
          active={active({ kind: "category", name: "__none__" })}
          onClick={() => onFilter({ kind: "category", name: "__none__" })}
        />
        {categories.map((c) => (
          <Item
            key={c}
            label={c}
            count={[...torrents.values()].filter((t) => t.category === c).length}
            active={active({ kind: "category", name: c })}
            onClick={() => onFilter({ kind: "category", name: c })}
          />
        ))}
      </div>

      {tags.length > 0 && (
        <div>
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-widest text-fg-3">标签</div>
          {tags.map((t) => (
            <Item
              key={t}
              label={t}
              active={active({ kind: "tag", name: t })}
              onClick={() => onFilter({ kind: "tag", name: t })}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
