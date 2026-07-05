import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-[3px] text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-[color-mix(in_oklch,var(--primary)_13%,var(--card))] text-[color-mix(in_oklch,var(--primary)_62%,var(--foreground))]",
        secondary:
          "bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        muted: "bg-muted text-muted-foreground",
        success:
          "bg-[color-mix(in_oklch,var(--success)_14%,var(--card))] text-[color-mix(in_oklch,var(--success)_58%,var(--foreground))]",
        warning:
          "bg-[color-mix(in_oklch,var(--warning)_17%,var(--card))] text-[color-mix(in_oklch,var(--warning)_64%,var(--foreground))]",
        violet:
          "bg-[color-mix(in_oklch,var(--violet)_14%,var(--card))] text-[color-mix(in_oklch,var(--violet)_58%,var(--foreground))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
