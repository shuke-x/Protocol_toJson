import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

export type TableColumn<T> = {
  header: string;
  className?: string;
  cell: (params: { row: T; index: number }) => ReactNode;
};

type EditableTableProps<T extends { id: string }> = {
  title: string;
  description: string;
  addLabel: string;
  addVariant?: "default" | "secondary";
  rows: T[];
  columns: TableColumn<T>[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  bodyHeight?: number;
  maxRowsBeforeScroll?: number;
};

function EditableTable<T extends { id: string }>({
  title,
  description,
  addLabel,
  addVariant = "default",
  rows,
  columns,
  onAdd,
  onRemove,
  bodyHeight = 260,
  maxRowsBeforeScroll = 4,
}: EditableTableProps<T>) {
  const headerHeight = 44;
  const rowHeight = 44;
  const targetHeight = Math.max(bodyHeight, headerHeight + rowHeight * maxRowsBeforeScroll);
  const bodyMaxHeight = Math.max(140, targetHeight - headerHeight);
  const columnTemplate = `${columns.map(() => "minmax(0,1fr)").join(" ")} 72px`;

  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <Button onClick={onAdd} className="gap-2 h-8 px-3" variant={addVariant}>
          <span className="text-xs font-semibold">+</span>
          {addLabel}
        </Button>
      </CardHeader>
      <div className="p-5">
        <CardContent className="space-y-3" style={{ height: targetHeight }}>
          <div className="rounded-lg border border-border/50 bg-white/5 h-full flex flex-col">
            <div
              className="grid text-xs uppercase tracking-wide text-muted-foreground/80 bg-white/5"
              style={{ gridTemplateColumns: columnTemplate }}
            >
              {columns.map((col) => (
                <div key={col.header} className={cn("px-3 py-2 font-semibold text-left", col.className)}>
                  {col.header}
                </div>
              ))}
              <div className="px-3 py-2 font-semibold text-center">操作</div>
            </div>

            <ScrollArea className="flex-1" style={{ maxHeight: bodyMaxHeight }}>
              <div className="divide-y divide-border/40 text-xs">
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid items-center transition-colors hover:bg-white/[0.03]"
                    style={{ gridTemplateColumns: columnTemplate }}
                  >
                    {columns.map((col) => (
                      <div key={col.header} className={cn("px-3 py-2", col.className)}>
                        {col.cell({ row, index })}
                      </div>
                    ))}
                    <div className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(index)}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!rows.length ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  暂无数据，点击右上角添加。
                </div>
              ) : null}
            </ScrollArea>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default EditableTable;
