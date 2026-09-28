import { useState, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function AddLinesButton({
  label,
  description,
  placeholder,
  onSubmit,
}: {
  label: string;
  description: string;
  placeholder: string;
  onSubmit: (lines: string[]) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <>
      <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            rows={6}
            className="font-mono text-xs"
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              disabled={lines.length === 0}
              onClick={async () => {
                if (await onSubmit(lines)) {
                  setText("");
                  setOpen(false);
                }
              }}
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 border-b px-3 py-2">{children}</div>;
}
