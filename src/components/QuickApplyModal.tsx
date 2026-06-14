import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useToast } from '../context/ToastContext';
import { Upload, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { apiClient, getErrorMessage } from '../services/api';
import { uploadFile } from '../services/messageService';

interface QuickApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    company: string;
    jobId: string;
}

const QuickApplyModal: React.FC<QuickApplyModalProps> = ({ isOpen, onClose, jobTitle, company, jobId }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [uploadingCv, setUploadingCv] = useState(false);
    const cvInputRef = useRef<HTMLInputElement>(null);

    // Pre-fill from the student's saved CV, if they've uploaded one.
    useEffect(() => {
        if (!isOpen) return;
        apiClient
            .get<{ data: { resume_url?: string } }>('/api/student/profile')
            .then(({ data }) => setResumeUrl(data.data?.resume_url || ''))
            .catch(() => {});
    }, [isOpen]);

    const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            showToast('CV must be a PDF file', 'error');
            if (cvInputRef.current) cvInputRef.current.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('CV must be under 10MB', 'error');
            if (cvInputRef.current) cvInputRef.current.value = '';
            return;
        }
        setUploadingCv(true);
        try {
            const { url } = await uploadFile(file);
            setResumeUrl(url);
            showToast('CV attached', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'CV upload failed', 'error');
        } finally {
            setUploadingCv(false);
            if (cvInputRef.current) cvInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resumeUrl) {
            showToast('Please attach your CV before applying', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await apiClient.post('/api/jobs', { job_id: jobId, cover_letter: coverLetter, resume_url: resumeUrl });
            setStep(2);
            showToast(`Successfully applied to ${company}!`, 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Application failed. Please try again.'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalClose = () => {
        setStep(1);
        setCoverLetter('');
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

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-black tracking-widest uppercase">CV (PDF)</label>
                        {resumeUrl ? (
                            <div className="flex items-center justify-between gap-3 p-4 border-3 border-black rounded-2xl bg-nile-white/50">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="text-nile-blue flex-shrink-0" size={18} />
                                    <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-black uppercase underline truncate">
                                        VIEW ATTACHED CV
                                    </a>
                                </div>
                                <button type="button" onClick={() => cvInputRef.current?.click()} className="text-[10px] font-black text-nile-blue uppercase hover:underline flex-shrink-0">
                                    {uploadingCv ? <Loader2 size={14} className="animate-spin" /> : 'CHANGE'}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => cvInputRef.current?.click()}
                                disabled={uploadingCv}
                                className="w-full border-3 border-black border-dashed rounded-2xl p-8 flex flex-col items-center justify-center bg-nile-white/50 hover:bg-white transition-all cursor-pointer group"
                            >
                                {uploadingCv
                                    ? <Loader2 className="text-nile-blue mb-2 animate-spin" size={24} />
                                    : <Upload className="text-nile-blue mb-2 group-hover:-translate-y-1 transition-transform" size={24} />}
                                <p className="text-[10px] font-black text-black uppercase">{uploadingCv ? 'UPLOADING...' : 'CLICK TO UPLOAD CV'}</p>
                            </button>
                        )}
                        <input ref={cvInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCvUpload} />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-black tracking-widest uppercase">COVER NOTE (OPTIONAL)</label>
                        <textarea
                            className="w-full h-32 border-3 border-black rounded-2xl p-4 font-bold text-sm outline-none focus:shadow-brutalist-sm transition-all"
                            placeholder="Why are you a good fit?"
                            value={coverLetter}
                            onChange={e => setCoverLetter(e.target.value)}
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
