import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "primary" | "destructive";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-white",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
