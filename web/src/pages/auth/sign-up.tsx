import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { signupSchema } from "@/src/features/auth/lib/signupSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { env } from "@/src/env.mjs";
import { useState } from "react";
import { LangfuseIcon } from "@/src/components/LangfuseLogo";
import { CloudPrivacyNotice } from "@/src/features/auth/components/AuthCloudPrivacyNotice";
import { CloudRegionSwitch } from "@/src/features/auth/components/AuthCloudRegionSwitch";
import {
  SSOButtons,
  useHuggingFaceRedirect,
  type PageProps,
} from "@/src/pages/auth/sign-in";
import { PasswordInput } from "@/src/components/ui/password-input";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { useRouter } from "next/router";
import { getSafeRedirectPath } from "@/src/utils/redirect";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import useLocalStorage from "@/src/components/useLocalStorage";

// Use the same getServerSideProps function as src/pages/auth/sign-in.tsx
export { getServerSideProps } from "@/src/pages/auth/sign-in";

type NextAuthProvider = NonNullable<Parameters<typeof signIn>[0]>;

export default function SignIn({
  authProviders,
  runningOnHuggingFaceSpaces,
}: PageProps) {
  useHuggingFaceRedirect(runningOnHuggingFaceSpaces);
  const { isLangfuseCloud, region } = useLangfuseCloudRegion();
  const router = useRouter();
  const capture = usePostHogClientCapture();

  // Read query params for targetPath and email pre-population
  const queryTargetPath = router.query.targetPath as string | undefined;
  const emailParam = router.query.email as string | undefined;

  // Validate targetPath to prevent open redirect attacks
  const targetPath = queryTargetPath
    ? getSafeRedirectPath(queryTargetPath)
    : undefined;

  const [formError, setFormError] = useState<string | null>(null);

  // Two-step login flow: ask for email first, detect SSO, then either redirect to SSO or reveal password field.
  // Skip this flow when no SSO is configured - show password field immediately
  const [showPasswordStep, setShowPasswordStep] = useState<boolean>(
    !authProviders.sso,
  );
  const [continueLoading, setContinueLoading] = useState<boolean>(false);
  const [lastUsedAuthMethod, setLastUsedAuthMethod] =
    useLocalStorage<NextAuthProvider | null>(
      "langfuse_last_used_auth_method",
      null,
    );

  const form = useForm({
    resolver: showPasswordStep ? zodResolver(signupSchema) : undefined,
    defaultValues: {
      name: "",
      email: emailParam ?? "",
      password: "",
    },
  });

  async function handleContinue() {
    setContinueLoading(true);
    setFormError(null);
    form.clearErrors();

    // Ensure email is valid before hitting the API
    // We use z.string().email() manually because we don't use the full schema resolver in the first step
    // or we could just trigger validation for the email field only
    const emailValue = form.getValues("email");
    // Basic check using zod directly or trigger
    // Using trigger("email") might validate against the full schema if we don't be careful,
    // but since we conditionally set the resolver, it might be tricky.
    // Simplest is manual check here matching what sign-in does.
    // Note: signupSchema has name and password as required, so trigger() would fail on those if using full schema.

    // Manual email validation to match sign-in behavior
    // Although signupSchema.shape.email is ZodString, let's just use a new Zod check for simplicity and robustness
    const emailSchema = z.string().email();
    const emailResult = emailSchema.safeParse(emailValue);

    if (!emailResult.success) {
      form.setError("email", {
        message: "Invalid email address",
      });
      setContinueLoading(false);
      return;
    }

    // Extract domain and check whether SSO is configured for it
    const domain = emailResult.data.split("@")[1]?.toLowerCase();

    try {
      const res = await fetch(
        `${env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/check-sso`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      );

      if (res.ok) {
        // Enterprise SSO found – redirect straight away
        const { providerId } = await res.json();
        capture("sign_up:button_click", { provider: "sso_auto" });

        // Store the SSO provider as the last used auth method
        setLastUsedAuthMethod(providerId as NextAuthProvider);

        void signIn(providerId);
        return; // stop further execution – page redirect expected
      }

      // No SSO – fall back to password step
      setShowPasswordStep(true);

      // Auto-focus password input when password step becomes visible
      setTimeout(() => {
        // Find and focus the name input (since it's the first new field) or password?
        // Plan says "name + password fields". Usually Name is first in Sign Up.
        // Let's focus Name.
        const nameInput = document.querySelector(
          'input[name="name"]',
        ) as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }, 100);
    } catch (error) {
      console.error(error);
      setFormError("Unable to check SSO configuration. Please try again.");
    } finally {
      setContinueLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    try {
      setFormError(null);
      const res = await fetch(
        `${env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!res.ok) {
        const payload = (await res.json()) as { message: string };
        setFormError(payload.message);
        return;
      }

      await signIn<"credentials">("credentials", {
        email: values.email,
        password: values.password,
        callbackUrl:
          targetPath ??
          (isLangfuseCloud && region !== "DEV"
            ? `${env.NEXT_PUBLIC_BASE_PATH ?? ""}/onboarding`
            : `${env.NEXT_PUBLIC_BASE_PATH ?? ""}/`),
      });
    } catch {
      setFormError("An error occurred. Please try again.");
    }
  }

  return (
    <>
      <Head>
        <title>注册 | 九思监控</title>
        <meta
          name="description"
          content="创建账户，开始追踪 LLM 应用。"
          key="desc"
        />
      </Head>
      {/* 全屏蓝白企业科技背景 */}
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-10">
        {/* 背景装饰层 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(circle at 12% 18%, rgba(37,99,235,0.20) 0%, transparent 32%),
              radial-gradient(circle at 88% 8%,  rgba(56,189,248,0.16) 0%, transparent 26%),
              radial-gradient(circle at 65% 82%, rgba(29,78,216,0.13)  0%, transparent 28%),
              linear-gradient(180deg, #eef5ff 0%, #e4f0ff 50%, #eef5ff 100%)
            `,
          }}
        />
        {/* 网格纹理 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            opacity: 0.7,
          }}
        />

        {/* 居中注册卡片 */}
        <div
          className="relative z-10 w-full max-w-[440px] rounded-2xl px-8 py-9"
          style={{
            background: "rgba(255,255,255,0.84)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(37,99,235,0.13)",
            boxShadow: "0 24px 72px rgba(37,99,235,0.14), 0 1px 0 rgba(255,255,255,0.92) inset",
          }}
        >
          {/* Logo + 品牌标题 */}
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
              style={{
                background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)",
                boxShadow: "0 8px 24px rgba(37,99,235,0.38)",
              }}
            >
              <LangfuseIcon size={30} className="brightness-0 invert" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center rounded-full border border-blue-200/60 bg-blue-50 px-3 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-blue-600">
                AI 链路追踪平台
              </div>
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900">
                创建新账户
              </h1>
              <p className="mt-1 text-sm text-slate-500">免费注册，立即开始 LLM 可观测性</p>
            </div>
          </div>

          <CloudRegionSwitch isSignUpPage />

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={
                showPasswordStep
                  ? form.handleSubmit(onSubmit)
                  : (e) => {
                      e.preventDefault();
                      void handleContinue();
                    }
              }
            >
              {showPasswordStep && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">姓名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="您的姓名"
                          className="h-11 rounded-xl border-blue-100 bg-white/90 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">邮箱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="example@company.com"
                        allowPasswordManager
                        autoComplete="email"
                        className="h-11 rounded-xl border-blue-100 bg-white/90 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showPasswordStep && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">密码</FormLabel>
                      <FormControl>
                        <PasswordInput
                          className="h-11 rounded-xl border-blue-100 bg-white/90 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button
                type="submit"
                className="mt-1 h-11 w-full rounded-xl text-sm font-semibold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 52%, #3b82f6 100%)",
                  boxShadow: "0 10px 24px -10px rgba(37,99,235,0.70)",
                }}
                loading={
                  showPasswordStep
                    ? form.formState.isSubmitting
                    : continueLoading
                }
                disabled={
                  showPasswordStep
                    ? false
                    : form.watch("email") === ""
                }
                data-testid="submit-email-password-sign-up-form"
              >
                {showPasswordStep ? "注册" : "继续"}
              </Button>
              {formError ? (
                <div className="rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-center text-sm font-medium text-red-600">
                  {formError}
                </div>
              ) : null}
            </form>
          </Form>

          <SSOButtons
            authProviders={authProviders}
            action="sign up"
            lastUsedMethod={lastUsedAuthMethod}
            onProviderSelect={setLastUsedAuthMethod}
          />

          <p className="mt-7 border-t border-slate-200/60 pt-5 text-center text-sm text-slate-500">
            已有账户？{" "}
            <Link
              href={`/auth/sign-in${router.asPath.includes("?") ? router.asPath.substring(router.asPath.indexOf("?")) : ""}`}
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
