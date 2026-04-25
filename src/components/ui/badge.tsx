import { cn } from "@/lib/cn";

type Variant = "available" | "sold" | "scheduled" | "draft" | "posted" | "default";

const variantClass: Record<Variant, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-gray-200 text-gray-600",
  scheduled: "bg-yellow-100 text-yellow-700",
  draft: "bg-gray-100 text-gray-600",
  posted: "bg-green-50 text-green-800",
  default: "bg-gray-100 text-gray-700",
};

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
};

export function Badge({ children, variant = "default", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium leading-none",
        "rounded-full px-2 py-0.5",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
