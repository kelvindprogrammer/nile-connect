import * as React from "react"
import { cn } from "../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    icon?: React.ReactNode;
}

const InputField = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, hint, error, icon, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label className="text-xs font-medium text-ink-700 ml-0.5">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-600 group-focus-within:text-app-accent transition-colors pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-9 w-full rounded-md text-sm",
                            "border border-paper-400 bg-white px-3 py-1.5",
                            "text-ink-800 placeholder:text-paper-600 font-normal",
                            "transition-all duration-150",
                            "focus-visible:outline-none focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/20",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-paper-200",
                            error && "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-100",
                            icon && "pl-9",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {hint && !error && <p className="text-xs text-paper-600 ml-0.5">{hint}</p>}
                {error && <p className="text-xs text-red-500 ml-0.5">{error}</p>}
            </div>
        )
    }
)
InputField.displayName = "InputField"

export default InputField
