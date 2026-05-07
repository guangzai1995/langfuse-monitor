import { cn } from "@/src/utils/tailwind";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { useRouter } from "next/router";

type SettingsProps = {
  pages: Array<
    {
      title: string;
      slug: string;
      show?: boolean | (() => boolean);
    } & ({ content: ReactNode } | { href: string })
  >;
  activeSlug?: string;
};

export const PagedSettingsContainer = ({
  pages,
  activeSlug,
}: SettingsProps) => {
  const router = useRouter();
  const availablePages = pages.filter((page) =>
    "show" in page
      ? typeof page.show === "function"
        ? page.show()
        : page.show
      : true,
  );

  const currentPage =
    availablePages.find((page) => page.slug === activeSlug) ??
    availablePages[0]; // Fallback to first page if not found

  const onChange = (newSlug: string) => {
    const pathSegments = router.asPath.split("/");
    if (pathSegments[pathSegments.length - 1] !== "settings")
      pathSegments.pop();
    if (newSlug !== "index") pathSegments.push(newSlug);
    router.push(pathSegments.join("/"));
  };

  return (
    <main className="flex flex-1 flex-col gap-6 py-3 md:gap-8">
      <div className="grid w-full items-start gap-5 md:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr]">
        <nav className="block md:hidden">
          <Select
            onValueChange={(slug) => {
              const page = availablePages.find((p) => p.slug === slug);
              if (page && "href" in page) router.push(page.href);
              else onChange(slug);
            }}
            value={currentPage.slug}
          >
            <SelectTrigger className="h-11 rounded-2xl border-sky-200/70 bg-white/90 shadow-sm">
              <SelectValue placeholder="选择页面" />
            </SelectTrigger>
            <SelectContent>
              {availablePages.map((page) => (
                <SelectItem key={page.title} value={page.slug}>
                  {page.title}
                  {"href" in page && (
                    <ArrowUpRight size={14} className="ml-1 inline" />
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </nav>
        <nav
          className="text-muted-foreground hidden gap-2 rounded-3xl border border-sky-200/70 bg-white/85 p-3 text-sm shadow-sm backdrop-blur md:sticky md:top-5 md:grid"
          x-chunk="dashboard-04-chunk-0"
        >
          {availablePages.map((page) =>
            "href" in page ? (
              <Link
                key={page.title}
                href={page.href}
                className="hover:bg-accent/60 flex flex-row items-center gap-2 rounded-2xl px-3 py-2 font-semibold transition-colors"
              >
                {page.title}
                <ArrowUpRight size={14} className="inline" />
              </Link>
            ) : (
              <span
                key={page.title}
                onClick={() => onChange(page.slug)}
                className={cn(
                  "cursor-pointer rounded-2xl px-3 py-2 font-semibold transition-colors hover:bg-sky-50",
                  page.slug === currentPage.slug &&
                    "text-primary bg-sky-50 shadow-sm",
                )}
              >
                {page.title}
              </span>
            ),
          )}
        </nav>
        <div className="w-full overflow-hidden rounded-3xl border border-sky-200/70 bg-white/85 p-5 shadow-sm backdrop-blur">
          {currentPage && "content" in currentPage ? currentPage.content : null}
        </div>
      </div>
    </main>
  );
};
