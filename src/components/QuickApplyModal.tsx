import React, { useState, useRef, useEffect, useCallback } from 'react';
import Modal from './Modal';
import Button from './Button';
import { useToast } from '../context/ToastContext';
import { Upload, CheckCircle2, FileText, Loader2, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '../services/api';
import { uploadFile } from '../services/messageService';
import { getApplicationPackage, createDocument } from '../services/studentService';
import { applyToJob } from '../services/jobService';
import type { ApplicationPackage, Document } from '../types/application';
import { DOCUMENT_TYPES } from '../types/application';

interface QuickApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobTitle: string;
    company: string;
    jobId: string;
}

const docLabel = (type: string) => DOCUMENT_TYPES.find(d => d.value === type)?.label ?? type;

const QuickApplyModal: React.FC<QuickApplyModalProps> = ({ isOpen, onClose, jobTitle, company, jobId }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [coverLetter, setCoverLetter] = useState('');
    const [loadingPackage, setLoadingPackage] = useState(true);
    const [pkg, setPkg] = useState<ApplicationPackage | null>(null);
    const [selectedDocs, setSelectedDocs] = useState<Record<string, string>>({}); // type -> document id
    const [uploadingType, setUploadingType] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadTargetType = useRef<string | null>(null);

    const loadPackage = useCallback(() => {
        setLoadingPackage(true);
        getApplicationPackage(jobId)
            .then(data => {
                setPkg(data);
                // Pre-select the default (or only) document for each required/optional type.
                const initial: Record<string, string> = {};
                [...data.required_docs, ...data.optional_docs].forEach(type => {
                    const docs = data.documents_by_type[type] || [];
                    const preferred = docs.find(d => d.is_default) || docs[0];
                    if (preferred) initial[type] = preferred.id;
                });
                setSelectedDocs(initial);
            })
            .catch(() => setPkg(null))
            .finally(() => setLoadingPackage(false));
    }, [jobId]);

    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(() => {
            setStep(1);
            setCoverLetter('');
            loadPackage();
        }, 0);
        return () => clearTimeout(t);
    }, [isOpen, loadPackage]);

    const handleUploadNew = (type: string) => {
        uploadTargetType.current = type;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const type = uploadTargetType.current;
        if (!file || !type) return;
        if (file.size > 10 * 1024 * 1024) {
            showToast('File must be under 10MB', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setUploadingType(type);
        try {
            const { url } = await uploadFile(file);
            const doc: Document = await createDocument({
                type,
                title: file.name,
                file_url: url,
                file_name: file.name,
                is_default: !(pkg?.documents_by_type[type]?.length),
            });
            setPkg(prev => prev && ({
                ...prev,
                documents_by_type: {
                    ...prev.documents_by_type,
                    [type]: [...(prev.documents_by_type[type] || []), doc],
                },
            }));
            setSelectedDocs(prev => ({ ...prev, [type]: doc.id }));
            showToast(`${docLabel(type)} uploaded`, 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Upload failed'), 'error');
        } finally {
            setUploadingType(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const missingRequired = pkg
        ? pkg.required_docs.filter(type => !selectedDocs[type])
        : [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (missingRequired.length > 0) {
            showToast(`Please provide: ${missingRequired.map(docLabel).join(', ')}`, 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await applyToJob({
                job_id: jobId,
                cover_letter: coverLetter,
                document_ids: Object.values(selectedDocs),
            });
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

    const renderDocPicker = (type: string, required: boolean) => {
        const docs = pkg?.documents_by_type[type] || [];
        const selected = selectedDocs[type] || '';
        const busy = uploadingType === type;
        return (
            <div key={type} className="space-y-2">
                <label className="text-[10px] font-black text-black tracking-widest uppercase flex items-center gap-2">
                    {docLabel(type)}
                    {required
                        ? <span className="text-red-500">*</span>
                        : <span className="text-[8px] font-bold text-nile-blue/40 normal-case">(optional)</span>}
                </label>
                {docs.length > 0 && (
                    <select
                        value={selected}
                        onChange={e => setSelectedDocs(prev => ({ ...prev, [type]: e.target.value }))}
                        className="w-full border-3 border-black rounded-2xl p-3 font-bold text-xs outline-none focus:shadow-brutalist-sm transition-all"
                    >
                        {!required && <option value="">— None —</option>}
                        {docs.map(d => (
                            <option key={d.id} value={d.id}>{d.title}{d.is_default ? ' (default)' : ''}</option>
                        ))}
                    </select>
                )}
                <button
                    type="button"
                    onClick={() => handleUploadNew(type)}
                    disabled={busy}
                    className="w-full border-3 border-black border-dashed rounded-2xl p-3 flex items-center justify-center gap-2 bg-nile-white/50 hover:bg-white transition-all text-[10px] font-black uppercase"
                >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {busy ? 'UPLOADING...' : docs.length > 0 ? 'UPLOAD ANOTHER' : `UPLOAD ${docLabel(type).toUpperCase()}`}
                </button>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleFinalClose} title={step === 1 ? "QUICK APPLICATION" : "APPLICATION SENT"} maxWidth="lg">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            {step === 1 ? (
                <form onSubmit={handleSubmit} className="space-y-6 font-sans">
                    <div className="bg-nile-white p-6 rounded-2xl border-3 border-black mb-8">
                        <p className="text-[10px] font-black text-nile-blue uppercase tracking-widest mb-1">APPLYING FOR</p>
                        <h3 className="text-xl font-black text-black uppercase leading-tight">{jobTitle}</h3>
                        <p className="text-xs font-bold text-nile-blue/70 uppercase mt-1">{company}</p>
                    </div>

                    {loadingPackage ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={28} className="animate-spin text-nile-blue/40" />
                        </div>
                    ) : !pkg ? (
                        <div className="flex items-center gap-2 p-4 border-3 border-red-400 rounded-2xl bg-red-50 text-red-500 text-[10px] font-black uppercase">
                            <AlertCircle size={16} /> Couldn't load document requirements. Try again.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {pkg.required_docs.length === 0 && pkg.optional_docs.length === 0 && (
                                <div className="flex items-center gap-2 p-4 border-3 border-black rounded-2xl bg-nile-white/50 text-[10px] font-black uppercase">
                                    <FileText size={16} className="text-nile-blue" /> No documents required for this role.
                                </div>
                            )}
                            {pkg.required_docs.map(type => renderDocPicker(type, true))}
                            {pkg.optional_docs.map(type => renderDocPicker(type, false))}
                        </div>
                    )}

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
                        <Button variant="primary" type="submit" isLoading={isSubmitting} disabled={loadingPackage || !pkg}>SUBMIT APP</Button>
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
