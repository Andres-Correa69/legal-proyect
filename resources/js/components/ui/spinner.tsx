import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

interface SpinnerProps extends Omit<React.ComponentProps<"svg">, 'size'> {
  size?: 'sm' | 'md' | 'lg' | number;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const numericSize = typeof size === 'string' ? sizeMap[size] : size;

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      width={numericSize}
      height={numericSize}
      className={cn("animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
