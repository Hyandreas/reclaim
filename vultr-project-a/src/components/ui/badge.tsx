import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "border-[color-mix(in_oklch,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))] text-[color-mix(in_oklch,var(--primary)_58%,var(--foreground))]",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        muted: "border-border bg-muted text-muted-foreground",
        success:
          "border-[color-mix(in_oklch,var(--success)_30%,var(--border))] bg-[color-mix(in_oklch,var(--success)_13%,var(--card))] text-[color-mix(in_oklch,var(--success)_55%,var(--foreground))]",
        warning:
          "border-[color-mix(in_oklch,var(--warning)_34%,var(--border))] bg-[color-mix(in_oklch,var(--warning)_15%,var(--card))] text-[color-mix(in_oklch,var(--warning)_62%,var(--foreground))]",
        violet:
          "border-[color-mix(in_oklch,var(--violet)_30%,var(--border))] bg-[color-mix(in_oklch,var(--violet)_13%,var(--card))] text-[color-mix(in_oklch,var(--violet)_56%,var(--foreground))]",
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
