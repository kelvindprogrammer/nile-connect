import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText, Upload, Loader2, Trash2, Star, ExternalLink, Plus, X,
} from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { uploadFile } from '../../services/messageService';
import { getErrorMessage } from '../../services/api';
import {
    getDocuments, createDocument, updateDocument, deleteDocument,
} from '../../services/studentService';
import type { Document, RefereeType } from '../../types/application';
import { DOCUMENT_TYPES } from '../../types/application';

const Documents = () => {
    const { showToast } = useToast();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadType, setUploadType] = useState<string>(DOCUMENT_TYPES[0].value);
    const [uploadTitle, setUploadTitle] = useState('');
    const [refereeType, setRefereeType] = useState<RefereeType | ''>('');
    const [uploading, setUploading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const load = useCallback(() => {
        setIsLoading(true);
        getDocuments()
            .then(setDocuments)
            .catch(() => setDocuments([]))
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        const t = setTimeout(load, 0);
        return () => clearTimeout(t);
    }, [load]);

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            showToast('File must be under 10MB', 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setPendingFile(file);
        if (!uploadTitle) setUploadTitle(file.name);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingFile) {
            showToast('Please choose a file to upload', 'error');
            return;
        }
        setUploading(true);
        try {
            const { url } = await uploadFile(pendingFile);
            const doc = await createDocument({
                type: uploadType,
                title: uploadTitle || pendingFile.name,
                file_url: url,
                file_name: pendingFile.name,
                referee_type: uploadType === 'reference_letter' && refereeType ? refereeType : undefined,
                is_default: !documents.some(d => d.type === uploadType),
            });
            setDocuments(prev => [doc, ...prev]);
            showToast('Document uploaded', 'success');
            setShowForm(false);
            setPendingFile(null);
            setUploadTitle('');
            setRefereeType('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            showToast(getErrorMessage(err, 'Upload failed'), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleSetDefault = async (doc: Document) => {
        setBusyId(doc.id);
        try {
            await updateDocument(doc.id, { is_default: true });
            setDocuments(prev => prev.map(d =>
                d.type === doc.type ? { ...d, is_default: d.id === doc.id } : d
            ));
            showToast(`${doc.title} set as default ${docLabel(doc.type)}`, 'success');
        } catch {
            showToast('Failed to update document', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (doc: Document) => {
        if (!window.confirm(`Delete "${doc.title}"?`)) return;
        setBusyId(doc.id);
        try {
            await deleteDocument(doc.id);
            setDocuments(prev => prev.filter(d => d.id !== doc.id));
            showToast('Document deleted', 'success');
        } catch {
            showToast('Failed to delete document', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const docLabel = (type: string) => DOCUMENT_TYPES.find(d => d.value === type)?.label ?? type;

    const grouped = DOCUMENT_TYPES.map(t => ({
        ...t,
        docs: documents.filter(d => d.type === t.value),
    }));

    return (
        <>
            <div className="p-4 md:p-8 space-y-6 md:space-y-8 anime-fade-in font-sans pb-24 text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-semibold text-black leading-none">Document Library .</h2>
                        <p className="text-[8px] md:text-[10px] font-semibold text-nile-blue/50 mt-1">
                            MANAGE THE FILES YOU USE TO APPLY TO JOBS
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setShowForm(v => !v)}>
                        <Plus size={13} className="mr-1.5" /> ADD DOCUMENT
                    </Button>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-[20px] shadow-card p-5 md:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm">Upload a document</h3>
                            <button type="button" onClick={() => setShowForm(false)}><X size={16} /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-semibold text-black/50">DOCUMENT TYPE</label>
                                <select
                                    value={uploadType}
                                    onChange={e => setUploadType(e.target.value)}
                                    className="w-full border border-gray-100 rounded-xl py-3 px-4 font-semibold text-xs outline-none focus:shadow-blue bg-[#F8F9FB]/60 focus:bg-white transition-all"
                                >
                                    {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-semibold text-black/50">TITLE</label>
                                <input
                                    type="text"
                                    value={uploadTitle}
                                    onChange={e => setUploadTitle(e.target.value)}
                                    placeholder="e.g. Updated Resume 2026"
                                    className="w-full border border-gray-100 rounded-xl py-3 px-4 font-semibold text-xs outline-none focus:shadow-blue bg-[#F8F9FB]/60 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {uploadType === 'reference_letter' && (
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-semibold text-black/50">REFEREE TYPE</label>
                                <select
                                    value={refereeType}
                                    onChange={e => setRefereeType(e.target.value as RefereeType | '')}
                                    className="w-full border border-gray-100 rounded-xl py-3 px-4 font-semibold text-xs outline-none focus:shadow-blue bg-[#F8F9FB]/60 focus:bg-white transition-all"
                                >
                                    <option value="">— Select —</option>
                                    <option value="academic">Academic</option>
                                    <option value="professional">Professional</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[8px] font-semibold text-black/50">FILE</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-4 border-[2px] border-dashed border-black/20 rounded-xl text-[10px] font-semibold text-black/40 hover:border-nile-blue hover:text-nile-blue transition-all flex items-center justify-center gap-2"
                            >
                                <Upload size={14} /> {pendingFile ? pendingFile.name : 'CHOOSE FILE'}
                            </button>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" size="sm" type="button" onClick={() => setShowForm(false)}>CANCEL</Button>
                            <Button size="sm" type="submit" isLoading={uploading}>UPLOAD</Button>
                        </div>
                    </form>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {grouped.map(group => (
                            <div key={group.value} className="space-y-3">
                                <h3 className="text-[10px] font-semibold text-black/40 tracking-wider">{group.label.toUpperCase()}</h3>
                                {group.docs.length === 0 ? (
                                    <div className="py-6 text-center border-[2px] border-dashed border-black/10 rounded-[18px]">
                                        <p className="text-[9px] font-semibold text-black/20">NO {group.label.toUpperCase()} UPLOADED YET</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {group.docs.map(doc => (
                                            <div key={doc.id} className="bg-white border border-gray-100 rounded-[18px] shadow-card p-4 flex items-start gap-3">
                                                <div className="w-10 h-10 bg-nile-blue/10 rounded-xl flex items-center justify-center text-nile-blue flex-shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-semibold text-[11px] text-black truncate">{doc.title}</p>
                                                        {doc.is_default && (
                                                            <span className="text-[7px] font-semibold px-1.5 py-0.5 rounded-full bg-nile-green/10 text-nile-green border border-nile-green/20 flex-shrink-0">DEFAULT</span>
                                                        )}
                                                    </div>
                                                    {doc.referee_type && (
                                                        <p className="text-[8px] font-semibold text-black/30 mt-0.5">{doc.referee_type.toUpperCase()} REFEREE</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-[8px] font-semibold text-nile-blue flex items-center gap-1 hover:underline">
                                                            <ExternalLink size={10} /> VIEW
                                                        </a>
                                                        {!doc.is_default && (
                                                            <button
                                                                onClick={() => handleSetDefault(doc)}
                                                                disabled={busyId === doc.id}
                                                                className="text-[8px] font-semibold text-black/40 flex items-center gap-1 hover:text-nile-blue"
                                                            >
                                                                <Star size={10} /> SET DEFAULT
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(doc)}
                                                            disabled={busyId === doc.id}
                                                            className="text-[8px] font-semibold text-red-400 flex items-center gap-1 hover:text-red-600 ml-auto"
                                                        >
                                                            {busyId === doc.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} DELETE
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default Documents;
