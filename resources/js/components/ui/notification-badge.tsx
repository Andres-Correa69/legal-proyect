import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const notificationBadgeVariants = cva(
  "min-w-4 h-4 flex items-center justify-center px-1 text-[9px] font-bold rounded-full",
  {
    variants: {
      variant: {
        default: "bg-destructive text-destructive-foreground",
        secondary: "bg-secondary text-secondary-foreground font-semibold",
        primary: "bg-primary text-primary-foreground",
        outline: "border border-border bg-background text-foreground",
      },
      position: {
        static: "",
        absolute: "absolute top-0 right-0 border border-background",
      },
    },
    defaultVariants: {
      variant: "default",
      position: "static",
    },
  }
);

export interface NotificationBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof notificationBadgeVariants> {
  count: number | string;
  max?: number;
  showZero?: boolean;
  animate?: boolean;
}

function NotificationBadge({
  className,
  variant,
  position,
  count,
  max = 9,
  showZero = false,
  animate = false,
  ...props
}: NotificationBadgeProps) {
  const isNumeric = typeof count === "number";

  if (isNumeric && count === 0 && !showZero) {
    return null;
  }

  const displayValue = isNumeric && count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        notificationBadgeVariants({ variant, position }),
        animate && "animate-pulse",
        className
      )}
      {...props}
    >
      {displayValue}
    </span>
  );
}

export { NotificationBadge, notificationBadgeVariants };
