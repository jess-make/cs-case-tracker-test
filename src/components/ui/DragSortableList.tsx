"use client";

import { useEffect, useState, type ReactNode } from "react";
import { GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragSortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (orderedIds: string[]) => Promise<{ error?: string } | undefined>;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  renderItem: (
    item: T,
    context: { dragHandle: ReactNode; isDragging: boolean; saving: boolean }
  ) => ReactNode;
}

export function DragSortableList<T extends { id: string }>({
  items,
  onReorder,
  disabled = false,
  className,
  itemClassName,
  renderItem,
}: DragSortableListProps<T>) {
  const [ordered, setOrdered] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrdered(items);
  }, [items]);

  function moveItem(dragId: string, overId: string): T[] | null {
    const fromIdx = ordered.findIndex((i) => i.id === dragId);
    const toIdx = ordered.findIndex((i) => i.id === overId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return null;
    const next = [...ordered];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return next;
  }

  async function commit(next: T[]) {
    const previous = ordered;
    setOrdered(next);
    setSaving(true);
    const result = await onReorder(next.map((i) => i.id));
    setSaving(false);
    if (result?.error) {
      setOrdered(previous);
    }
  }

  const dragHandle = (itemId: string) => (
    <span
      draggable={!disabled && !saving}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", itemId);
        e.dataTransfer.effectAllowed = "move";
        setDraggingId(itemId);
      }}
      onDragEnd={() => setDraggingId(null)}
      className={cn(
        "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-slate-400",
        disabled || saving
          ? "cursor-not-allowed opacity-40"
          : "cursor-grab hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
      )}
      aria-label="拖曳排序"
      title="拖曳排序"
    >
      {saving && draggingId === itemId ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <GripVertical className="h-4 w-4" />
      )}
    </span>
  );

  return (
    <ul className={cn("divide-y divide-slate-100", className)}>
      {ordered.map((item) => (
        <li
          key={item.id}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const dragId = e.dataTransfer.getData("text/plain");
            if (!dragId || dragId === item.id || disabled || saving) return;
            const next = moveItem(dragId, item.id);
            if (next) void commit(next);
            setDraggingId(null);
          }}
          className={cn(
            itemClassName,
            draggingId === item.id && "opacity-50"
          )}
        >
          {renderItem(item, {
            dragHandle: dragHandle(item.id),
            isDragging: draggingId === item.id,
            saving,
          })}
        </li>
      ))}
    </ul>
  );
}
