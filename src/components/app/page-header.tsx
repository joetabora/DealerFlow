import { cn } from "@/lib/cn";
import { SHELL_MAX, SHELL_PX } from "./shell-classnames";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, action, className }: Props) {
  const hasSub = Boolean(description);
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur-md",
        className,
      )}
    >
      <div
        className={cn(
          SHELL_MAX,
          SHELL_PX,
          "flex items-start justify-between gap-3 py-3",
        )}
      >
        <div className="min-w-0 space-y-0.5 pr-2">
          <h1 className="text-2xl font-semibold leading-tight text-gray-900">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-snug text-gray-600">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center justify-end gap-2",
              hasSub && "pt-0.5",
            )}
          >
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
