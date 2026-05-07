import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export const ExpandListButton = ({
  isExpanded,
  setExpanded,
  totalLength,
  maxLength,
  expandText = "查看更多",
}: {
  isExpanded: boolean;
  setExpanded: (isExpanded: boolean) => void;
  totalLength: number;
  maxLength: number;
  expandText?: string;
}) => {
  if (totalLength <= maxLength) {
    return null;
  }

  return (
    <Button
      className="mt-2 text-slate-700"
      variant="ghost"
      onClick={() => setExpanded(!isExpanded)}
    >
      {isExpanded ? (
        <>
          <ChevronUp className="mr-2 h-4 w-4" /> 收起
        </>
      ) : (
        <>
          <ChevronDown className="mr-2 h-4 w-4" /> {expandText}
        </>
      )}
    </Button>
  );
};
