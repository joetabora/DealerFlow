import { cn } from "@/lib/cn";

export const buttonPrimary =
  "inline-flex h-9 min-h-9 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-gray-800";

export const buttonSecondary =
  "inline-flex h-9 min-h-9 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm text-gray-900 transition hover:bg-gray-50";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        variant === "primary" ? buttonPrimary : buttonSecondary,
        className,
      )}
      {...props}
    />
  );
}
