"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type AdminModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function AdminModal({
  open,
  title,
  description,
  children,
  onClose,
}: AdminModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    let focusFrame: number | undefined;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      focusFrame = requestAnimationFrame(() => {
        dialog.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
      });
    } else if (dialog.open) {
      dialog.close();
    }

    return () => {
      if (focusFrame !== undefined) {
        cancelAnimationFrame(focusFrame);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-modal-title"
      aria-describedby={description ? "admin-modal-description" : undefined}
      className="admin-modal m-auto w-[min(92vw,34rem)] max-w-none p-0 text-white"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="admin-modal-panel">
        <header className="flex items-start justify-between gap-5 border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <h2 id="admin-modal-title" className="text-lg font-medium text-white">
              {title}
            </h2>
            {description ? (
              <p
                id="admin-modal-description"
                className="mt-1 text-sm leading-6 text-white/50"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="press-feedback inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/65 transition-colors hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} strokeWidth={1.7} />
          </button>
        </header>
        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </dialog>
  );
}
