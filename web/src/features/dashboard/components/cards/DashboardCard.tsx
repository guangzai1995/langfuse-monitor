import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/src/components/ui/card";
import { cn } from "@/src/utils/tailwind";
import { Loader } from "lucide-react";
import { type ReactNode } from "react";

export type DashboardCardProps = {
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  isLoading: boolean;
  children?: ReactNode;
  headerChildren?: ReactNode;
  cardContentClassName?: string;
  headerClassName?: string;
  headerRight?: ReactNode;
};

export const DashboardCard = ({
  className,
  title,
  description,
  isLoading,
  children,
  headerChildren,
  cardContentClassName,
  headerClassName,
  headerRight,
}: DashboardCardProps) => {
  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden border-white/80 bg-linear-to-br from-white via-white to-[#f3f8ff]",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "relative border-b border-[#d9e7ff] bg-linear-to-r from-[#f8fbff] via-[#eff6ff] to-[#f7fbff]",
          headerClassName,
        )}
      >
        <div className="items-top flex justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="text-xl text-slate-900">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-slate-600">
                {description}
              </CardDescription>
            ) : undefined}
          </div>
          {headerRight}
        </div>
        {headerChildren}
        {isLoading ? (
          <div className="absolute top-5 right-5">
            <Loader className="h-5 w-5 animate-spin" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "flex flex-1 flex-col gap-4 bg-linear-to-b from-transparent to-[#f9fbff]",
          cardContentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
};
