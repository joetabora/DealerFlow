import { cn } from "@/lib/cn";

export const buttonPrimary =
  "inline-flex h-9 min-h-9 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition-all duration-200 hover:bg-gray-800 active:scale-[0.98]";

export const buttonSecondary =
  "inline-flex h-9 min-h-9 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm text-gray-900 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]";

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
