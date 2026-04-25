import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement> & { hover?: boolean };

export function Card({ className, hover = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm",
        hover &&
          "transition-all duration-200 hover:-translate-y-px hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type CardNoPadProps = React.HTMLAttributes<HTMLDivElement> & { hover?: boolean };

export function CardShell({ className, hover = true, children, ...props }: CardNoPadProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm",
        hover &&
          "transition-all duration-200 hover:-translate-y-px hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-medium leading-tight text-gray-800", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-0.5 text-sm text-gray-600", className)} {...props}>
      {children}
    </p>
  );
}

export function CardSection({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}
