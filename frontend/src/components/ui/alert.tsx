export interface Alert extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

const Alert = ({ className, variant = "default", ...props }: Alert) => (
  <div
    className={`relative w-full rounded-lg border px-4 py-3 text-sm ${
      variant === "destructive"
        ? "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
        : "border-border bg-card text-foreground [&>svg]:text-foreground"
    } ${className || ""}`}
    {...props}
  />
);

const AlertDescription = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`[&_p]:leading-relaxed ${className || ""}`} {...props} />
);

export { Alert, AlertDescription };
