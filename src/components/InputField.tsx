import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    icon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({ label, error, icon, className = '', ...props }) => {
    return (
        <div className={`flex flex-col space-y-1.5 w-full text-left`}>
            <label className="text-[9px] font-black text-black uppercase tracking-[0.15em] ml-1">
                {label}
            </label>
            
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-nile-blue/40 group-focus-within:text-nile-blue transition-colors">
                        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
                    </div>
                )}
                
                <input
                    className={`
                        w-full bg-nile-white/40 border-[2px] border-black rounded-xl py-3 px-4
                        font-bold text-xs text-black placeholder:text-nile-blue/20 outline-none
                        transition-all duration-200
                        ${icon ? 'pl-11' : ''}
                        focus:bg-white focus:border-nile-blue focus:shadow-[3px_3px_0px_0px_#1E499D]
                        hover:bg-white
                        ${error ? 'border-red-500 shadow-[3px_3px_0px_0px_#EF4444]' : ''}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            
            {error && (
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-1">
                    {error}
                </p>
            )}
        </div>
    );
};

export default InputField;
