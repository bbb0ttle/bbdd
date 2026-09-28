import type { ComponentType, ReactNode } from "react";
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  FileDownIcon,
  FolderInputIcon,
  FolderIcon,
  GaugeIcon,
  ListOrderedIcon,
  MegaphoneIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  ScaleIcon,
  SquareIcon,
  TagIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import {
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import * as api from "@/api";
import type { Torrent } from "@/api";
import { useStore } from "@/store";
import { useUI } from "@/ui-state";
import { copyText } from "@/lib/clipboard";
import { isStopped, stateKind } from "@/lib/state";

interface ItemProps {
  children: ReactNode;
  onSelect?: (e: Event) => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  className?: string;
}
interface CheckProps {
  children: ReactNode;
  checked: boolean | "indeterminate";
  onCheckedChange?: (v: boolean) => void;
  onSelect?: (e: Event) => void;
  className?: string;
}

export interface MenuKit {
  Item: ComponentType<ItemProps>;
  Check: ComponentType<CheckProps>;
  Separator: ComponentType<object>;
  Sub: ComponentType<{ children: ReactNode }>;
  SubTrigger: ComponentType<{ children: ReactNode; className?: string }>;
  SubContent: ComponentType<{ children: ReactNode; className?: string }>;
}

export const contextKit: MenuKit = {
  Item: ContextMenuItem,
  Check: ContextMenuCheckboxItem,
  Separator: ContextMenuSeparator,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
};

export const dropdownKit: MenuKit = {
  Item: DropdownMenuItem,
  Check: DropdownMenuCheckboxItem,
  Separator: DropdownMenuSeparator,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

const itemCls = "gap-2.5 py-1.5 pr-2 text-[13px]";

function tri(values: boolean[]): boolean | "indeterminate" {
  if (values.every(Boolean)) return true;
  if (values.some(Boolean)) return "indeterminate";
  return false;
}

export function TorrentActions({ kit, hashes }: { kit: MenuKit; hashes: string[] }) {
  const { torrents, categories, tags, server, run } = useStore();
  const { openDialog } = useUI();
  const list = hashes.map((h) => torrents.get(h)).filter((t): t is Torrent => !!t);
  if (list.length === 0) return null;
  const single = list.length === 1 ? list[0] : undefined;
  const { Item, Check, Separator, Sub, SubTrigger, SubContent } = kit;

  const anyStopped = list.some((t) => isStopped(t) || stateKind(t.state) === "err");
  const anyRunning = list.some((t) => !isStopped(t));
  const force = tri(list.map((t) => !!t.force_start));
  const autoTmm = tri(list.map((t) => !!t.auto_tmm));
  const seq = tri(list.map((t) => !!t.seq_dl));
  const flp = tri(list.map((t) => !!t.f_l_piece_prio));
  const superSeed = tri(list.map((t) => !!t.super_seeding));
  const allDone = list.every((t) => t.progress >= 1);
  const anyIncomplete = list.some((t) => t.progress < 1);
  const catSet = new Set(list.map((t) => t.category || ""));
  const tagSets = list.map((t) => new Set((t.tags || "").split(",").map((s) => s.trim()).filter(Boolean)));

  const toggle = (value: boolean | "indeterminate") => value !== true;

  return (
    <>
      {anyStopped && (
        <Item className={itemCls} onSelect={() => run(() => api.start(hashes))}>
          <PlayIcon /> 启动
        </Item>
      )}
      {anyRunning && (
        <Item className={itemCls} onSelect={() => run(() => api.stop(hashes))}>
          <SquareIcon /> 停止
        </Item>
      )}
      <Check
        className={itemCls}
        checked={force}
        onCheckedChange={() => run(() => api.setForceStart(hashes, toggle(force)))}
      >
        <ZapIcon /> 强制启动
      </Check>
      <Item className={itemCls} variant="destructive" onSelect={() => openDialog({ type: "delete", hashes })}>
        <Trash2Icon /> 删除…
      </Item>
      <Separator />
      <Item className={itemCls} onSelect={() => openDialog({ type: "location", hashes })}>
        <FolderInputIcon /> 设置保存位置…
      </Item>
      {single && (
        <Item className={itemCls} onSelect={() => openDialog({ type: "rename", hash: single.hash })}>
          <PencilIcon /> 重命名…
        </Item>
      )}
      <Sub>
        <SubTrigger className={itemCls}>
          <FolderIcon className="size-4" /> 分类
        </SubTrigger>
        <SubContent className="min-w-44">
          <Item className={itemCls} onSelect={() => openDialog({ type: "category", assignTo: hashes })}>
            <PlusIcon /> 新建分类…
          </Item>
          <Separator />
          <Check
            className={itemCls}
            checked={catSet.size === 1 && catSet.has("")}
            onCheckedChange={() => run(() => api.setCategory(hashes, ""))}
          >
            无分类
          </Check>
          {Object.keys(categories)
            .sort()
            .map((c) => (
              <Check
                key={c}
                className={itemCls}
                checked={catSet.size === 1 && catSet.has(c)}
                onCheckedChange={() => run(() => api.setCategory(hashes, c))}
              >
                {c}
              </Check>
            ))}
        </SubContent>
      </Sub>
      <Sub>
        <SubTrigger className={itemCls}>
          <TagIcon className="size-4" /> 标签
        </SubTrigger>
        <SubContent className="min-w-44">
          <Item className={itemCls} onSelect={() => openDialog({ type: "newTag", assignTo: hashes })}>
            <PlusIcon /> 新建标签…
          </Item>
          <Item
            className={itemCls}
            disabled={tagSets.every((s) => s.size === 0)}
            onSelect={() => run(() => api.removeTags(hashes, [...new Set(tagSets.flatMap((s) => [...s]))]))}
          >
            <Trash2Icon /> 移除全部标签
          </Item>
          {tags.length > 0 && <Separator />}
          {[...tags].sort().map((tag) => {
            const state = tri(tagSets.map((s) => s.has(tag)));
            return (
              <Check
                key={tag}
                className={itemCls}
                checked={state}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() =>
                  run(() => (state === true ? api.removeTags(hashes, [tag]) : api.addTags(hashes, [tag])))
                }
              >
                {tag}
              </Check>
            );
          })}
        </SubContent>
      </Sub>
      <Separator />
      <Check
        className={itemCls}
        checked={autoTmm}
        onCheckedChange={() => run(() => api.setAutoTMM(hashes, toggle(autoTmm)))}
      >
        自动管理
      </Check>
      <Item className={itemCls} onSelect={() => openDialog({ type: "limits", hashes })}>
        <GaugeIcon /> 限制速度…
      </Item>
      <Item className={itemCls} onSelect={() => openDialog({ type: "share", hashes })}>
        <ScaleIcon /> 限制分享比率…
      </Item>
      <Separator />
      {anyIncomplete && (
        <>
          <Check className={itemCls} checked={seq} onCheckedChange={() => run(() => api.toggleSequential(hashes))}>
            按顺序下载
          </Check>
          <Check className={itemCls} checked={flp} onCheckedChange={() => run(() => api.toggleFirstLast(hashes))}>
            优先下载首尾文件块
          </Check>
        </>
      )}
      {allDone && (
        <Check
          className={itemCls}
          checked={superSeed}
          onCheckedChange={() => run(() => api.setSuperSeeding(hashes, toggle(superSeed)))}
        >
          超级做种模式
        </Check>
      )}
      <Separator />
      <Item className={itemCls} onSelect={() => run(() => api.recheck(hashes), "已开始重新校验")}>
        <RefreshCwIcon /> 强制重新校验
      </Item>
      <Item className={itemCls} onSelect={() => run(() => api.reannounce(hashes), "已重新汇报")}>
        <MegaphoneIcon /> 强制重新汇报
      </Item>
      {server.queueing && (
        <Sub>
          <SubTrigger className={itemCls}>
            <ListOrderedIcon className="size-4" /> 队列
          </SubTrigger>
          <SubContent className="min-w-40">
            <Item className={itemCls} onSelect={() => run(() => api.queueMove(hashes, "topPrio"))}>
              <ArrowUpToLineIcon /> 移至顶部
            </Item>
            <Item className={itemCls} onSelect={() => run(() => api.queueMove(hashes, "increasePrio"))}>
              <ChevronUpIcon /> 上移
            </Item>
            <Item className={itemCls} onSelect={() => run(() => api.queueMove(hashes, "decreasePrio"))}>
              <ChevronDownIcon /> 下移
            </Item>
            <Item className={itemCls} onSelect={() => run(() => api.queueMove(hashes, "bottomPrio"))}>
              <ArrowDownToLineIcon /> 移至底部
            </Item>
          </SubContent>
        </Sub>
      )}
      <Sub>
        <SubTrigger className={itemCls}>
          <ClipboardIcon className="size-4" /> 复制
        </SubTrigger>
        <SubContent className="min-w-40">
          <Item className={itemCls} onSelect={() => copyText(list.map((t) => t.name).join("\n"))}>
            名称
          </Item>
          <Item className={itemCls} onSelect={() => copyText(list.map((t) => t.hash).join("\n"))}>
            信息哈希
          </Item>
          <Item className={itemCls} onSelect={() => copyText(list.map((t) => t.magnet_uri).join("\n"))}>
            磁力链接
          </Item>
          <Item className={itemCls} onSelect={() => copyText(list.map((t) => t.content_path || t.save_path).join("\n"))}>
            内容路径
          </Item>
        </SubContent>
      </Sub>
      <Item
        className={itemCls}
        onSelect={() => {
          for (const t of list) {
            const a = document.createElement("a");
            a.href = api.exportUrl(t.hash);
            a.download = `${t.name}.torrent`;
            a.click();
          }
        }}
      >
        <FileDownIcon /> 导出 .torrent
      </Item>
    </>
  );
}
