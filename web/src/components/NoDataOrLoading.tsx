import React from "react";
import { cn } from "@/src/utils/tailwind";
import DocPopup from "@/src/components/layouts/doc-popup";
import { Skeleton } from "@/src/components/ui/skeleton";

interface NoDataOrLoadingProps {
  isLoading: boolean;
  description?: string;
  href?: string;
  className?: string;
}
interface NoDataProps {
  noDataText?: string;
  children?: React.ReactNode;
  className?: string;
}

const NoData = ({
  noDataText = "暂无数据",
  children,
  className,
}: NoDataProps) => {
  return (
    <div
      className={cn(
        "flex h-3/4 min-h-36 w-full items-center justify-center rounded-xl border border-dashed border-[#bfdbfe] bg-[#f8fbff]/80",
        className,
      )}
    >
      <p className="text-muted-foreground">{noDataText}</p>
      {children}
    </div>
  );
};

export function NoDataOrLoading({
  isLoading,
  description,
  href,
  className,
}: NoDataOrLoadingProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-3/4 min-h-36 w-full items-center justify-center rounded-xl",
          className,
        )}
      >
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <NoData noDataText="暂无数据" className={className}>
      {description && <DocPopup description={description} href={href} />}
    </NoData>
  );
}
