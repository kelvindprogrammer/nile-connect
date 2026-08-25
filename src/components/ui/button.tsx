import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-app-accent text-white hover:bg-harbour-600 shadow-soft-xs",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-soft-xs",
        outline:
          "border border-paper-300 bg-white hover:bg-paper-100 text-gray-800",
        secondary:
          "bg-paper-100 text-gray-800 hover:bg-paper-200 border border-paper-300",
        ghost: "hover:bg-paper-100 text-gray-700",
        link: "text-app-accent underline-offset-4 hover:underline",
        // Nile Custom
        nile: "bg-app-accent text-white border border-transparent shadow-soft-xs hover:bg-harbour-600 transition-all font-medium",
        "nile-green": "bg-green-600 text-white border border-transparent shadow-soft-xs hover:bg-green-700 transition-all font-medium",
        "nile-outline": "bg-white text-gray-800 border border-paper-400 shadow-soft-xs hover:bg-paper-100 transition-all font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-xl px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
