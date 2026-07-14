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
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    {docLabel(type)}
                    {required
                        ? <span className="text-red-500">*</span>
                        : <span className="text-xs text-gray-400 font-normal">(optional)</span>}
                </label>
                {docs.length > 0 && (
                    <select
                        value={selected}
                        onChange={e => setSelectedDocs(prev => ({ ...prev, [type]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all bg-white"
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
                    className="w-full border border-dashed border-gray-200 rounded-xl p-3 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-all text-sm font-medium text-gray-600"
                >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {busy ? 'Uploading…' : docs.length > 0 ? 'Upload another' : `Upload ${docLabel(type).toLowerCase()}`}
                </button>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleFinalClose} title={step === 1 ? "Apply for this role" : "Application sent"} maxWidth="lg">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            {step === 1 ? (
                <form onSubmit={handleSubmit} className="space-y-6 font-sans">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <p className="text-xs font-medium text-nile-blue mb-1">Applying for</p>
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{jobTitle}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{company}</p>
                    </div>

                    {loadingPackage ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={28} className="animate-spin text-nile-blue/40" />
                        </div>
                    ) : !pkg ? (
                        <div className="flex items-center gap-2 p-4 border border-red-200 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                            <AlertCircle size={16} /> Couldn't load document requirements. Try again.
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {pkg.required_docs.length === 0 && pkg.optional_docs.length === 0 && (
                                <div className="flex items-center gap-2 p-4 border border-gray-100 rounded-xl bg-gray-50 text-sm font-medium text-gray-600">
                                    <FileText size={16} className="text-nile-blue" /> No documents required for this role.
                                </div>
                            )}
                            {pkg.required_docs.map(type => renderDocPicker(type, true))}
                            {pkg.optional_docs.map(type => renderDocPicker(type, false))}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Cover note (optional)</label>
                        <textarea
                            className="w-full h-28 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all resize-none"
                            placeholder="Why are you a good fit?"
                            value={coverLetter}
                            onChange={e => setCoverLetter(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={handleFinalClose} type="button">Cancel</Button>
                        <Button variant="primary" type="submit" isLoading={isSubmitting} disabled={loadingPackage || !pkg}>Submit application</Button>
                    </div>
                </form>
            ) : (
                <div className="py-10 flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-nile-green/10 text-nile-green rounded-full flex items-center justify-center">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-xl font-semibold text-gray-900">You're all set!</h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            Your application has been sent to the recruiting team at <span className="text-nile-blue font-medium">{company}</span>.
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleFinalClose} className="mt-2">Back to jobs</Button>
                </div>
            )}
        </Modal>
    );
};

export default QuickApplyModal;
