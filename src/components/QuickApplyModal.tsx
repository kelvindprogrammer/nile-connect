import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import InputField from './InputField';
import { useToast } from '../context/ToastContext';
import { Upload, CheckCircle2 } from 'lucide-react';

interface QuickApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    company: string;
}

const QuickApplyModal: React.FC<QuickApplyModalProps> = ({ isOpen, onClose, jobTitle, company }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setStep(2);
            showToast(`Successfully applied to ${company}!`, 'success');
        }, 1500);
    };

    const handleFinalClose = () => {
        setStep(1);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleFinalClose} title={step === 1 ? "QUICK APPLICATION" : "APPLICATION SENT"}>
            {step === 1 ? (
                <form onSubmit={handleSubmit} className="space-y-6 font-sans">
                    <div className="bg-nile-white p-6 rounded-2xl border-3 border-black mb-8">
                        <p className="text-[10px] font-black text-nile-blue uppercase tracking-widest mb-1">APPLYING FOR</p>
                        <h3 className="text-xl font-black text-black uppercase leading-tight">{jobTitle}</h3>
                        <p className="text-xs font-bold text-nile-blue/70 uppercase mt-1">{company}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="FULL NAME" placeholder="Grace Stanley" required />
                        <InputField label="EMAIL" placeholder="grace@nile.edu.ng" type="email" required />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-black tracking-widest uppercase">UPLOAD CV (PDF)</label>
                        <div className="w-full border-3 border-black border-dashed rounded-2xl p-8 flex flex-col items-center justify-center bg-nile-white/50 hover:bg-white transition-all cursor-pointer group">
                            <Upload className="text-nile-blue mb-2 group-hover:-translate-y-1 transition-transform" size={24} />
                            <p className="text-[10px] font-black text-black uppercase">DROP FILE OR CLICK TO BROWSE</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-black tracking-widest uppercase">COVER NOTE (OPTIONAL)</label>
                        <textarea 
                            className="w-full h-32 border-3 border-black rounded-2xl p-4 font-bold text-sm outline-none focus:shadow-brutalist-sm transition-all"
                            placeholder="Why are you a good fit?"
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
                        <Button variant="outline" onClick={handleFinalClose} type="button">CANCEL</Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting}>SUBMIT APP</Button>
                    </div>
                </form>
            ) : (
                <div className="py-12 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-nile-green text-white rounded-full flex items-center justify-center shadow-brutalist-sm border-3 border-black">
                        <CheckCircle2 size={48} strokeWidth={3} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-black uppercase tracking-tight">YOU'RE ALL SET!</h3>
                        <p className="text-sm font-bold text-nile-blue/70 uppercase max-w-xs">
                            YOUR APPLICATION HAS BEEN DISPATCHED TO THE RECRUITING TEAM AT <span className="text-nile-blue underline">{company}</span>.
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleFinalClose} className="mt-4">BACK TO JOBS</Button>
                </div>
            )}
        </Modal>
    );
};

export default QuickApplyModal;
