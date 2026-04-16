"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { pl } from "@/lib/i18n/pl";
import { useCreateAthlete } from "@/lib/hooks/use-athletes";

const createNameSchema = z.object({
  name: z.string().min(1, pl.validation.required),
});

type CreateNameInput = z.infer<typeof createNameSchema>;

interface CreateAthleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal dialog for creating a new athlete.
 * Only asks for name â€” coach completes the profile in the editor.
 * This is the one exception to "no Save buttons" (creation requires explicit action).
 */
export default function CreateAthleteDialog({
  isOpen,
  onClose,
}: CreateAthleteDialogProps) {
  const router = useRouter();
  const createMutation = useCreateAthlete();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<CreateNameInput>({
    resolver: zodResolver(createNameSchema),
    defaultValues: { name: "" },
  });

  const { ref: registerRef, ...restRegister } = register("name");

  // Merge react-hook-form ref with our focus ref
  const mergedRef = useCallback(
    (el: HTMLInputElement | null) => {
      registerRef(el);
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [registerRef],
  );

  // Focus the input when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is ready
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  // handleClose is stable within effect scope
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleClose() {
    reset();
    createMutation.reset();
    onClose();
  }

  async function onSubmit(data: CreateNameInput) {
    try {
      const athlete = await createMutation.mutateAsync({ name: data.name });
      handleClose();
      router.push(`/athletes/${athlete.id}`);
    } catch {
      setError("root", {
        message: pl.coach.athlete.createDialog.errorGeneric,
      });
    }
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => {
        // Close when clicking the backdrop (not the dialog itself)
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Dialog panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-athlete-title"
        className="bg-card border-border rounded-card w-full max-w-sm border p-6 shadow-xl"
      >
        <h2
          id="create-athlete-title"
          className="text-foreground mb-5 text-lg font-semibold"
        >
          {pl.coach.athlete.createDialog.title}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Name field */}
          <div className="mb-5">
            <input
              id="new-athlete-name"
              type="text"
              placeholder={pl.coach.athlete.createDialog.namePlaceholder}
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : undefined}
              autoComplete="off"
              className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              ref={mergedRef}
              {...restRegister}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-destructive mt-1.5 text-xs">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Root/server error */}
          {errors.root && (
            <div
              role="alert"
              className="bg-destructive/10 border-destructive/30 text-destructive rounded-input mb-4 border px-4 py-3 text-sm"
            >
              {errors.root.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-foreground px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {pl.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground rounded-input px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? pl.coach.athlete.createDialog.submitting
                : pl.coach.athlete.createDialog.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

