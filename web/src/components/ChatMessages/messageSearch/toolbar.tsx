"use client";

import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/utils/tailwind";

import { useMessageSearch } from "./context";

export function MessageSearchToolbar({ className }: { className?: string }) {
  const {
    isOpen,
    openRequestCount,
    queryInput,
    matches,
    activeMatch,
    activeMatchIndex,
    openSearch,
    closeSearch,
    setQueryInput,
    nextMatch,
    previousMatch,
  } = useMessageSearch();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isOpen, openRequestCount]);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn("h-8 gap-2", className)}
        onClick={openSearch}
        aria-label="在消息中查找"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">查找</span>
      </Button>
    );
  }

  const activeCountText =
    matches.length === 0 || activeMatchIndex < 0
      ? "0 / 0"
      : `${activeMatchIndex + 1} / ${matches.length}`;

  return (
    <div
      className={cn(
        "bg-background flex items-center gap-1 rounded-md border p-1",
        className,
      )}
    >
      <Search className="text-muted-foreground ml-1 h-3.5 w-3.5 shrink-0" />
      <Input
        ref={inputRef}
        value={queryInput}
        onChange={(event) => setQueryInput(event.target.value)}
        placeholder="在消息中查找"
        className="h-6 min-w-40 border-0 px-1 text-xs shadow-none focus-visible:ring-0 sm:min-w-56"
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (event.shiftKey) {
              previousMatch();
            } else {
              nextMatch();
            }
          }

          if (event.key === "Escape") {
            event.preventDefault();
            if (queryInput) {
              setQueryInput("");
            } else {
              closeSearch();
            }
          }
        }}
      />
      <div className="text-muted-foreground min-w-16 px-1 text-right text-xs">
        {activeCountText}
      </div>
      <IconButton
        icon={ChevronUp}
        label="上一个结果"
        onClick={previousMatch}
        disabled={matches.length === 0}
      />
      <IconButton
        icon={ChevronDown}
        label="下一个结果"
        onClick={nextMatch}
        disabled={matches.length === 0}
      />
      <div className="text-muted-foreground hidden max-w-48 truncate px-1 text-xs lg:block">
        {activeMatch?.locationLabel ?? "无匹配结果"}
      </div>
      <IconButton icon={X} label="关闭搜索" onClick={closeSearch} />
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
