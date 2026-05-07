import Header from "@/src/components/layouts/header";
import ModelTable from "@/src/components/table/use-cases/models";

export function ModelsSettings(props: { projectId: string }) {
  return (
    <>
      <Header title="模型定义" />
      <p className="mb-2 text-sm">
        模型定义用于保存 LLM 模型的定价信息。配置输入与输出 token 单价后，Langfuse 就能基于 token 用量自动计算生成成本。
      </p>
      <ModelTable projectId={props.projectId} />
    </>
  );
}
