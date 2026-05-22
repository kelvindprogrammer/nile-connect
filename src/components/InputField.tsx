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
                    <label className="text-xs font-medium text-gray-700 ml-0.5">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-nile-blue transition-colors pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex h-11 w-full rounded-xl text-sm",
                            "border border-gray-200 bg-white px-4 py-2.5",
                            "text-gray-900 placeholder:text-gray-400 font-normal",
                            "transition-all duration-150",
                            "focus-visible:outline-none focus-visible:border-nile-blue focus-visible:ring-3 focus-visible:ring-nile-blue/10",
                            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
                            error && "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-100",
                            icon && "pl-10",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {hint && !error && <p className="text-xs text-gray-400 ml-0.5">{hint}</p>}
                {error && <p className="text-xs text-red-500 ml-0.5">{error}</p>}
            </div>
        )
    }
)
InputField.displayName = "InputField"

export default InputField
