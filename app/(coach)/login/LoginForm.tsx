"use client";

import { useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { pl } from "@/lib/i18n/pl";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

import { signInAction } from "./actions";

export default function LoginForm() {
  const [isPending, startPendingTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  async function onSubmit(data: LoginInput) {
    startPendingTransition(async () => {
      const result = await signInAction(data);

      if (!result) {
        // signInAction redirected — no return value comes back
        return;
      }

      if (!result.ok) {
        let message: string;
        switch (result.error) {
          case "invalid_credentials":
            message = pl.auth.login.errorInvalid;
            form.resetField("password");
            break;
          case "network":
            message = pl.auth.login.errorNetwork;
            break;
          default:
            message = pl.auth.login.errorGeneric;
        }
        form.setError("root", { message });
      }
    });
  }

  const isDisabled = isPending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Email field */}
      <div className="mb-5">
        <label
          htmlFor="email"
          className="text-foreground mb-1.5 block text-sm font-medium"
        >
          {pl.auth.login.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder={pl.auth.login.emailPlaceholder}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isDisabled}
          {...register("email")}
        />
        {errors.email && (
          <p
            id="email-error"
            role="alert"
            className="text-destructive mt-1.5 text-xs"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="mb-6">
        <label
          htmlFor="password"
          className="text-foreground mb-1.5 block text-sm font-medium"
        >
          {pl.auth.login.passwordLabel}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder={pl.auth.login.passwordPlaceholder}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isDisabled}
          {...register("password")}
        />
        {errors.password && (
          <p
            id="password-error"
            role="alert"
            className="text-destructive mt-1.5 text-xs"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Root / server error alert */}
      {errors.root && (
        <div
          role="alert"
          className="bg-destructive/10 border-destructive/30 text-destructive rounded-input mb-5 border px-4 py-3 text-sm"
        >
          {errors.root.message}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isDisabled}
        className="bg-primary text-primary-foreground rounded-input w-full py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending || isSubmitting
          ? pl.auth.login.submitting
          : pl.auth.login.submitButton}
      </button>
    </form>
  );
}
