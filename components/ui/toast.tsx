"use client";

import * as React from "react";
import { Toast } from "radix-ui";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "destructive" | "warning" | "success";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (opts: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((opts: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            duration={t.duration ?? 4500}
            onOpenChange={(open) => {
              if (!open) dismiss(t.id);
            }}
            className={cn(
              "group pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
              t.variant === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20"
                : t.variant === "warning"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-200"
                  : t.variant === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-border bg-card text-card-foreground",
            )}
          >
            <div className="mt-0.5 shrink-0">
              {t.variant === "destructive" ? (
                <AlertCircle className="size-5 text-destructive" />
              ) : t.variant === "warning" ? (
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
              ) : t.variant === "success" ? (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CheckCircle2 className="size-5 text-primary" />
              )}
            </div>
            <div className="grid flex-1 gap-1">
              <Toast.Title className="text-sm font-semibold leading-none">
                {t.title}
              </Toast.Title>
              {t.description && (
                <Toast.Description className="text-xs opacity-90 leading-relaxed">
                  {t.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
              <X className="size-4" />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:max-w-[420px]" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
