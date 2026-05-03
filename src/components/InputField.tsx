import * as React from "react"
import { cn } from "../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
}

const InputField = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em] ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-nile-blue transition-colors">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-xl border-[2px] border-black bg-nile-white/40 px-4 py-2 text-sm font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-white focus-visible:shadow-[3px_3px_0px_0px_rgba(30,73,157,1)] transition-all disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-11",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      </div>
    )
  }
)
InputField.displayName = "InputField"

export default InputField
