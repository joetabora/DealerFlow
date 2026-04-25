"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type Toast = { id: string; message: string; variant: "success" | "error" };
type Ctx = { show: (message: string, variant?: "success" | "error") => void };

const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((t) => [...t, { id, message, variant }]);
    },
    [],
  );
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-w-sm flex-col gap-2 p-4 sm:max-w-md"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDismiss={() => setToasts((s) => s.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  t,
  onDismiss,
}: {
  t: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const i = setTimeout(onDismiss, 4000);
    return () => clearTimeout(i);
  }, [onDismiss]);
  return (
    <div
      className={cn(
        "pointer-events-auto animate-enter rounded-xl border px-3.5 py-2.5 text-sm shadow-md",
        t.variant === "success"
          ? "border-gray-200 bg-white text-gray-900"
          : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {t.message}
    </div>
  );
}

export function useToast() {
  const x = useContext(ToastContext);
  if (!x) throw new Error("useToast must be used within ToastProvider");
  return x;
}
