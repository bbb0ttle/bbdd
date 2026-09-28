import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function PageHeader({ children, title }: { children?: ReactNode; title?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
      <SidebarTrigger className="size-9 [&_svg]:size-[18px]" />
      <div className="mx-1 h-5 w-px bg-border" />
      {title && <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
      {children}
    </header>
  );
}
