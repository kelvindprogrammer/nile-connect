import React from 'react';

interface StepperProps {
    steps: string[];
    currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
    return (
        <div className="flex items-center w-full justify-between">
            {steps.map((step, index) => (
                <React.Fragment key={step}>
                    <div className="flex flex-col items-center relative flex-1">
                        <div 
                            className={`w-10 h-10 rounded-xl border-3 border-black flex items-center justify-center transition-all z-10
                                ${index <= currentStep ? 'bg-nile-green text-white shadow-brutalist-sm ' : 'bg-white text-nile-blue/30 shadow-none'}
                            `}
                        >
                            <span className="font-black text-sm">{index + 1}</span>
                        </div>
                        <span 
                            className={`mt-3 text-[9px] font-black uppercase tracking-widest text-center
                                ${index <= currentStep ? 'text-black' : 'text-nile-blue/30'}
                            `}
                        >
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`h-1 flex-1 -mt-8 mx-[-10%] border-t-4 border-dashed transition-all
                            ${index < currentStep ? 'border-black' : 'border-nile-blue/10'}
                        `}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default Stepper;
