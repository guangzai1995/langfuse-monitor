import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v4";
import Head from "next/head";
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
import { PasswordInput } from "@/src/components/ui/password-input";
import { LangfuseIcon } from "@/src/components/LangfuseLogo";
import { useSession } from "next-auth/react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "@/src/utils/api";
import { useRouter } from "next/router";
import { RequestResetPasswordEmailButton } from "@/src/features/auth-credentials/components/ResetPasswordButton";
import { TRPCClientError } from "@trpc/client";
import { isEmailVerifiedWithinCutoff } from "@/src/features/auth-credentials/lib/credentialsUtils";
import Link from "next/link";
import { ErrorPage } from "@/src/components/error-page";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { passwordSchema } from "@/src/features/auth/lib/signupSchema";

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export function ResetPasswordPage({
  passwordResetAvailable,
}: {
  passwordResetAvailable: boolean;
}) {
  const session = useSession();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showResetPasswordEmailButton, setShowResetPasswordEmailButton] =
    useState(false);

  const capture = usePostHogClientCapture();

  const mutResetPassword = api.credentials.resetPassword.useMutation();
  const emailVerified = isEmailVerifiedWithinCutoff(
    session.data?.user?.emailVerified,
  );

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: session.data?.user?.email ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setFormError(null);
    setShowResetPasswordEmailButton(false);
    setIsSuccess(false);
    capture("auth:update_password_form_submit");
    await mutResetPassword
      .mutateAsync({ password: values.password })
      .then(() => {
        setIsSuccess(true);
        setTimeout(() => {
          router.push("/");
          setIsSuccess(false);
        }, 2000);
      })
      .catch((error) => {
        console.log(error.message);
        if (error instanceof TRPCClientError) {
          if (error.data?.code === "UNAUTHORIZED") {
            setShowResetPasswordEmailButton(true);
          }
          setFormError(error.message);
        } else {
          console.error(error);
          setFormError("An unknown error occurred");
        }
      });
  }

  if (!passwordResetAvailable)
    return (
      <ErrorPage
        title="功能不可用"
        message="此实例未配置密码重置功能"
        additionalButton={{
          label: "查看配置说明",
          href: "https://langfuse.com/self-hosting/security/authentication-and-sso#auth-email-password",
        }}
      />
    );

  return (
    <>
      <Head>
        <title>重置密码 | 九思监控</title>
      </Head>
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-10">
        {/* 背景装饰层 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(circle at 12% 18%, rgba(37,99,235,0.20) 0%, transparent 32%),
              radial-gradient(circle at 88% 8%,  rgba(56,189,248,0.16) 0%, transparent 26%),
              linear-gradient(180deg, #eef5ff 0%, #e4f0ff 50%, #eef5ff 100%)
            `,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
            opacity: 0.7,
          }}
        />

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
          {/* Logo + 标题 */}
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <Link href="/">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%)",
                  boxShadow: "0 8px 24px rgba(37,99,235,0.38)",
                }}
              >
                <LangfuseIcon size={30} className="brightness-0 invert" />
              </div>
            </Link>
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-slate-900">
                重置密码
              </h2>
              {session.status !== "authenticated" && (
                <div className="mt-2 flex justify-center">
                  <Button asChild variant="ghost" className="text-blue-600 hover:text-blue-700">
                    <Link href="/auth/sign-in">
                      <ArrowLeft className="mr-2 h-3 w-3" />
                      返回登录
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">邮箱</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="example@company.com"
                            disabled={session.status === "authenticated"}
                            allowPasswordManager
                            autoComplete="email"
                            className="h-11 rounded-xl border-blue-100 bg-white/90 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                            {...field}
                          />
                          {emailVerified.verified && (
                            <span title="邮箱已验证">
                              <ShieldCheck className="text-muted-green absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 transform" />
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {emailVerified.verified && (
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">新密码</FormLabel>
                          <FormControl>
                            <PasswordInput
                              autoComplete="new-password"
                              className="h-11 rounded-xl border-blue-100 bg-white/90 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">确认新密码</FormLabel>
                          <FormControl>
                            <PasswordInput
                              autoComplete="new-password"
                              className="h-11 rounded-xl border-blue-100 bg-white/90 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <div className="pt-2">
                  {emailVerified.verified ? (
                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl text-sm font-semibold tracking-wide transition-all hover:brightness-110"
                      style={{
                        background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 52%, #3b82f6 100%)",
                        boxShadow: "0 10px 24px -10px rgba(37,99,235,0.70)",
                      }}
                      disabled={mutResetPassword.isPending}
                      loading={mutResetPassword.isPending}
                    >
                      更新密码
                    </Button>
                  ) : (
                    <RequestResetPasswordEmailButton
                      email={form.watch("email")}
                      className="w-full"
                    />
                  )}
                </div>
              </form>
            </Form>
            {formError ? (
              <div className="rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-center text-sm font-medium text-red-600">
                {formError}
              </div>
            ) : null}
            {isSuccess && (
              <div className="rounded-xl border border-green-200/60 bg-green-50/80 px-4 py-3 text-center text-sm font-medium text-green-700">
                密码更新成功，正在跳转...
              </div>
            )}
            {showResetPasswordEmailButton && (
              <RequestResetPasswordEmailButton
                email={form.getValues("email")}
                className="w-full"
              />
            )}
          </div>
          {session.status !== "authenticated" && (
            <p className="mt-6 text-center text-xs text-slate-400">
              仅当该邮箱已注册且使用邮箱/密码方式登录时才会收到邮件。
              如果您使用了 Google、Gitlab、Okta 等第三方登录，请直接
              <Link href="/auth/sign-in" className="text-blue-500 underline ml-1">
                登录
              </Link>。
            </p>
          )}
        </div>
      </div>
    </>
  );
}
