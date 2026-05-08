import { Button } from "@/src/components/ui/button";
import { useEffect } from "react";
import type * as z from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { api } from "@/src/utils/api";
import { useSession } from "next-auth/react";
import { organizationFormSchema } from "@/src/features/organizations/utils/organizationNameSchema";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { SurveyName } from "@prisma/client";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";

export const NewOrganizationForm = ({
  onSuccess,
}: {
  onSuccess: (orgId: string) => void;
}) => {
  const { update: updateSession } = useSession();

  const form = useForm({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      type: "Personal",
      size: undefined,
    },
  });
  const capture = usePostHogClientCapture();
  const createOrgMutation = api.organizations.create.useMutation({
    onError: (error) => form.setError("name", { message: error.message }),
  });
  const createSurveyMutation = api.surveys.create.useMutation();
  const watchedType = form.watch("type");
  const { isLangfuseCloud } = useLangfuseCloudRegion();

  function onSubmit(values: z.infer<typeof organizationFormSchema>) {
    capture("organizations:new_form_submit");
    createOrgMutation
      .mutateAsync({
        name: values.name,
      })
      .then(async (org) => {
        // Submit survey with organization data only on Cloud and if type is provided
        if (isLangfuseCloud && values.type) {
          const surveyResponse: Record<string, string> = {
            type: values.type,
          };
          if (values.size) {
            surveyResponse.size = values.size;
          }

          try {
            await createSurveyMutation.mutateAsync({
              surveyName: SurveyName.ORG_ONBOARDING,
              response: surveyResponse,
              orgId: org.id,
            });
          } catch (error) {
            console.error("Failed to submit survey:", error);
            // Continue with organization creation even if survey fails
          }
        }

        void updateSession();
        onSuccess(org.id);
        form.reset();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  // Clear size whenever type is not Company or Agency to avoid submitting hidden values
  useEffect(() => {
    if (watchedType !== "Company" && watchedType !== "Agency") {
      form.setValue("size", undefined);
    }
  }, [watchedType, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
        data-testid="new-org-form"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void form.handleSubmit(onSubmit)();
          }
        }}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>组织名称</FormLabel>
              <FormControl>
                <Input
                  placeholder="我的组织"
                  {...field}
                  data-testid="new-org-name-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isLangfuseCloud && (
          <>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>组织类型</FormLabel>
                  <FormDescription>
                    请选择最符合你组织情况的类型。
                  </FormDescription>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger ref={field.ref}>
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Personal">个人</SelectItem>
                      <SelectItem value="Educational">教育</SelectItem>
                      <SelectItem value="Company">企业</SelectItem>
                      <SelectItem value="Startup">创业团队</SelectItem>
                      <SelectItem value="Agency">代理机构</SelectItem>
                      <SelectItem value="N/A">不适用</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(watchedType === "Company" || watchedType === "Agency") && (
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchedType === "Company" ? "企业" : "代理机构"}规模</FormLabel>
                    <FormDescription>
                      {watchedType === "Company"
                        ? "你的企业大约有多少人？"
                        : "你的代理机构大约有多少人？"}
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger ref={field.ref}>
                          <SelectValue placeholder="请选择" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="10-49">10-49</SelectItem>
                        <SelectItem value="50-99">50-99</SelectItem>
                        <SelectItem value="100-299">100-299</SelectItem>
                        <SelectItem value="More than 300">
                          300 人以上
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}
        <Button type="submit" loading={createOrgMutation.isPending}>
          创建组织
        </Button>
      </form>
    </Form>
  );
};
