import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,_#233731,_#35544a)] text-primary-foreground shadow-[0_16px_30px_rgba(35,55,49,0.2)] hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(35,55,49,0.24)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[#e9dfd2] bg-[#fffaf2] text-slate-800 shadow-[0_10px_24px_rgba(109,84,49,0.08)] hover:-translate-y-0.5 hover:bg-white",
        secondary:
          "bg-[linear-gradient(135deg,_rgba(35,55,49,0.09),_rgba(180,83,9,0.08))] text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/80",
        ghost: "text-slate-700 hover:bg-[#f5ede0] hover:text-slate-950",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5",
        lg: "h-12 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
