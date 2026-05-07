import PageHeader, {
  type PageHeaderProps,
} from "@/src/components/layouts/page-header";
import { cn } from "@/src/utils/tailwind";

type PageContainerProps = {
  children: React.ReactNode;
  headerProps: Omit<PageHeaderProps, "container">;
  scrollable?: boolean;
  withPadding?: boolean;
};

const Page = ({
  children,
  headerProps,
  scrollable = false,
  withPadding = false,
}: PageContainerProps) => {
  return (
    <div
      className={cn(
        "flex flex-col bg-linear-to-br from-[#edf5ff] via-[#f7fbff] to-[#eef7ff]",
        scrollable ? "min-h-screen-with-banner relative flex flex-1" : "h-full",
      )}
      id="page"
    >
      <header className="sticky top-0 z-50 w-full">
        <PageHeader {...headerProps} container={false} className={"top-0"} />
      </header>
      <main
        className={cn(
          "flex flex-1 flex-col",
          scrollable
            ? "min-h-screen-with-banner relative flex"
            : "h-full overflow-hidden",
          withPadding && "p-4",
        )}
      >
        {children}
      </main>
    </div>
  );
};

export default Page;
