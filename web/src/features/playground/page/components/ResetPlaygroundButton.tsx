import { ListRestartIcon } from "lucide-react";
import { useRouter } from "next/router";

import { Button } from "@/src/components/ui/button";
import { usePersistedWindowIds } from "@/src/features/playground/page/hooks/usePersistedWindowIds";

export const ResetPlaygroundButton: React.FC = () => {
  const router = useRouter();
  const { clearAllCache } = usePersistedWindowIds();

  const handleClick = () => {
    clearAllCache();
    router.reload();
  };

  return (
    <Button
      variant="outline"
      title="重置演练场状态"
      onClick={handleClick}
      className="gap-1"
    >
      <ListRestartIcon className="h-4 w-4" />
      <span className="hidden lg:inline">重置演练场</span>
    </Button>
  );
};
