import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { type ObjectType } from "@/src/features/score-analytics/lib/analytics-url-state";

const OBJECT_TYPE_OPTIONS: Array<{ value: ObjectType; label: string }> = [
  { value: "all", label: "全部对象" },
  { value: "trace", label: "Trace" },
  { value: "session", label: "会话" },
  { value: "observation", label: "观测" },
  { value: "dataset_run", label: "数据集运行" },
];

interface ObjectTypeFilterProps {
  value: ObjectType;
  onChange: (value: ObjectType) => void;
  className?: string;
}

export function ObjectTypeFilter({
  value,
  onChange,
  className,
}: ObjectTypeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label="对象类型">
        <SelectValue placeholder="对象类型" />
      </SelectTrigger>
      <SelectContent>
        {OBJECT_TYPE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
