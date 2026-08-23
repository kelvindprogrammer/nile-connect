import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, LifeBuoy } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import {
    getReportReasons, submitReport,
    type ReportReason, type ReportSubject,
} from '../../services/socialService';
import { getErrorMessage } from '../../services/api';

/**
 * The report flow.
 *
 * Two deliberate choices:
 *
 * 1. Reasons come from the server so all clients offer identical wording, and
 *    so the queue priority attached to each reason cannot be spoofed by a
 *    client sending an unknown value.
 *
 * 2. Choosing a self-harm reason surfaces support resources BEFORE the
 *    submit step. Someone reporting a friend in crisis needs help now, not a
 *    ticket number — the report still files, but the human need comes first.
 */

interface ReportModalProps {
    subjectType: ReportSubject;
    subjectId: string;
    subjectLabel: string;
    onClose: () => void;
    onSubmitted?: () => void;
}

const SELF_HARM = 'self_harm';

const ReportModal: React.FC<ReportModalProps> = ({
    subjectType, subjectId, subjectLabel, onClose, onSubmitted,
}) => {
    const [reasons, setReasons] = useState<ReportReason[]>([]);
    const [loadingReasons, setLoadingReasons] = useState(true);
    const [selected, setSelected] = useState<string>('');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        getReportReasons()
            .then(list => { if (!cancelled) setReasons(list); })
            .catch(() => {
                if (!cancelled) setError('Could not load report options. Please try again.');
            })
            .finally(() => { if (!cancelled) setLoadingReasons(false); });
        return () => { cancelled = true; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await submitReport(subjectType, subjectId, selected, details.trim() || undefined);
            setDone(res.message);
            onSubmitted?.();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not send your report. Please try again.'));
        } finally {
            setSubmitting(false);
        }
    };

    if (done) {
        return (
            <Modal isOpen onClose={onClose} title="Report received" maxWidth="sm">
                <div className="space-y-4 text-left">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-nile-green/15 text-nile-green flex items-center justify-center flex-shrink-0">
                            <Check size={18} strokeWidth={3} />
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{done}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                        You will not be told the outcome of the review, to protect everyone's privacy.
                        If you need to stop seeing this person, you can also block them.
                    </p>
                    <Button fullWidth size="sm" onClick={onClose}>Done</Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen onClose={onClose} title={`Report ${subjectLabel}`} maxWidth="sm">
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <p className="text-xs text-gray-500">
                    Your report is confidential. {subjectLabel.replace(/'s.*/, '')} will not be told who reported them.
                </p>

                {loadingReasons ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-gray-300" />
                    </div>
                ) : (
                    <fieldset className="space-y-1.5">
                        <legend className="text-xs font-medium text-gray-700 mb-1.5">
                            What's the problem?
                        </legend>
                        {reasons.map(r => (
                            <label
                                key={r.reason}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                                    ${selected === r.reason
                                        ? 'border-nile-blue bg-nile-blue/5'
                                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                            >
                                <input
                                    type="radio"
                                    name="report-reason"
                                    value={r.reason}
                                    checked={selected === r.reason}
                                    onChange={() => setSelected(r.reason)}
                                    className="mt-0.5 accent-nile-blue"
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-900">{r.label}</span>
                                    <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">{r.help}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>
                )}

                {/* Support resources come before the submit button, not after. */}
                {selected === SELF_HARM && (
                    <div className="rounded-xl border border-nile-blue/30 bg-nile-blue/5 p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-nile-blue">
                            <LifeBuoy size={15} />
                            <p className="text-xs font-semibold">If someone is in immediate danger</p>
                        </div>
                        <p className="text-[11px] text-gray-700 leading-relaxed">
                            Please contact emergency services or the university counselling team directly —
                            they can act faster than a content review. Your report will still be sent to
                            Career Services and treated as urgent.
                        </p>
                    </div>
                )}

                <div>
                    <label htmlFor="report-details" className="block text-xs font-medium text-gray-700 mb-1.5">
                        Anything else we should know? <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                        id="report-details"
                        value={details}
                        onChange={e => setDetails(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder="Add any context that would help our team review this."
                        className="w-full border border-gray-200 rounded-xl py-2.5 px-3.5 text-sm outline-none
                                   transition-all bg-white resize-none
                                   focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                    />
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" fullWidth isLoading={submitting} disabled={!selected}>
                        {submitting ? 'Sending…' : 'Send report'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ReportModal;
