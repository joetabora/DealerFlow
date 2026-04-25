import { cn } from "@/lib/cn";
import { SHELL_MAX, SHELL_PX } from "./shell-classnames";

/**
 * Main content area: max width, same horizontal padding as {@link PageHeader}.
 */
export function AppLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        SHELL_MAX,
        SHELL_PX,
        "flex-1 space-y-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
