import React, { useCallback, useEffect, useState } from 'react';
import {
    Shield, AlertTriangle, Loader2, Check, X, EyeOff, Ban,
    Clock, Inbox, RefreshCcw, FileText, ChevronRight, History,
} from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import { timeAgo } from '../../utils/formatDate';
import {
    getModQueue, getModStats, resolveReport, moderateContent, restrictUser, getModHistory,
    type ModQueueItem, type ModStats, type ModAction, type PersonSummary, type RestrictionType,
} from '../../services/socialService';

/**
 * The staff moderation console.
 *
 * Design principle taken straight from the spec: an admin must be able to
 * answer "who did what, when, where, against whom, and what action was taken."
 * So every action taken here is written to an immutable audit log server-side,
 * and this screen surfaces that history rather than hiding it — including the
 * reported user's prior record, which is what separates a first offence from a
 * fifth.
 *
 * The queue is ordered by priority then age on the server, so safety-critical
 * reports (self-harm, threats) are always at the top regardless of when they
 * arrived.
 */

const STATUS_TABS = [
    { value: 'open', label: 'Open', Icon: Inbox },
    { value: 'triaged', label: 'In review', Icon: Clock },
    { value: 'resolved', label: 'Resolved', Icon: Check },
    { value: 'dismissed', label: 'Dismissed', Icon: X },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]['value'];

const Moderation: React.FC = () => {
    const { showToast } = useToast();

    const [tab, setTab] = useState<StatusTab>('open');
    const [items, setItems] = useState<ModQueueItem[]>([]);
    const [stats, setStats] = useState<ModStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);
    const [active, setActive] = useState<ModQueueItem | null>(null);

    const reload = useCallback(() => setReloadToken(t => t + 1), []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        Promise.all([getModQueue(tab), getModStats().catch(() => null)])
            .then(([queue, s]) => {
                if (cancelled) return;
                setItems(queue.items);
                if (s) setStats(s);
            })
            .catch(err => {
                if (!cancelled) setError(getErrorMessage(err, 'Could not load the moderation queue.'));
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [tab, reloadToken]);

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-5 font-sans">
            <header className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="co-display text-xl md:text-3xl text-ink-800 flex items-center gap-2">
                        <Shield size={22} className="text-nile-blue" />
                        Moderation
                    </h1>
                    <p className="text-xs text-paper-600 mt-1">
                        Every action here is recorded in the audit log with your name against it.
                    </p>
                </div>
                <Button size="sm" variant="outline" onClick={reload} disabled={loading}>
                    <RefreshCcw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </header>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatCard label="Open" value={stats.open} />
                    <StatCard label="In review" value={stats.triaged} />
                    <StatCard label="Urgent" value={stats.urgent} tone={stats.urgent > 0 ? 'danger' : undefined} />
                    <StatCard label="Resolved today" value={stats.resolved_today} />
                    <StatCard label="Restricted users" value={stats.active_restrictions} />
                </div>
            )}

            {stats && stats.urgent > 0 && (
                <div
                    role="alert"
                    className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200"
                >
                    <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">
                        <strong>{stats.urgent}</strong> urgent {stats.urgent === 1 ? 'report needs' : 'reports need'}{' '}
                        review now — these may involve someone's safety.
                    </p>
                </div>
            )}

            <div className="flex gap-1 overflow-x-auto no-scrollbar" role="tablist">
                {STATUS_TABS.map(({ value, label, Icon }) => (
                    <button
                        key={value}
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium
                                    whitespace-nowrap transition-colors
                            ${tab === value ? 'bg-ink-900 text-white' : 'text-paper-700 hover:bg-paper-200'}`}
                    >
                        <Icon size={13} />
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="social-card p-4 animate-pulse space-y-2">
                            <div className="h-3 bg-paper-200 rounded w-1/3" />
                            <div className="h-3 bg-paper-200 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="social-card py-12 text-center space-y-3">
                    <AlertTriangle size={24} className="text-red-300 mx-auto" />
                    <p className="text-sm text-paper-700">{error}</p>
                    <Button size="sm" variant="outline" onClick={reload}>Try again</Button>
                </div>
            ) : items.length === 0 ? (
                <div className="social-card py-16 text-center">
                    <Check size={26} className="text-nile-green/40 mx-auto mb-3" />
                    <p className="text-sm text-paper-700">
                        {tab === 'open' ? 'Nothing waiting. The queue is clear.' : `No ${tab} reports.`}
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {items.map(item => (
                        <li key={item.report.id}>
                            <button
                                onClick={() => setActive(item)}
                                className="w-full text-left social-card p-4 hover:border-paper-300 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                            {item.is_urgent && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide">
                                                    Urgent
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-full bg-paper-200 text-paper-700 text-[10px] font-medium">
                                                {item.report.reason.replace(/_/g, ' ')}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-paper-100 text-paper-700 text-[10px]">
                                                {item.report.subject_type}
                                            </span>
                                            <span className="text-[10px] text-paper-600">
                                                {timeAgo(item.report.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-ink-800 line-clamp-2">
                                            {item.report.snapshot_content || <em className="text-paper-600">No content snapshot</em>}
                                        </p>
                                        <p className="text-[11px] text-paper-600 mt-1.5">
                                            Reported by {item.reporter?.name || 'a user'}
                                            {item.subject_owner?.name && <> · about {item.subject_owner.name}</>}
                                        </p>
                                    </div>
                                    <ChevronRight size={16} className="text-paper-500 flex-shrink-0 mt-1" />
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {active && (
                <ReviewModal
                    item={active}
                    onClose={() => setActive(null)}
                    onDone={() => { setActive(null); reload(); }}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: number; tone?: 'danger' }> = ({ label, value, tone }) => (
    <div className={`bg-white border rounded-xl p-3.5 shadow-card ${tone === 'danger' ? 'border-red-200' : 'border-paper-300'}`}>
        <p className={`text-2xl font-semibold ${tone === 'danger' ? 'text-red-600' : 'text-ink-800'}`}>{value}</p>
        <p className="text-[11px] text-paper-600 mt-0.5">{label}</p>
    </div>
);

// ── Review modal ──────────────────────────────────────────────────────────────

const ReviewModal: React.FC<{
    item: ModQueueItem;
    onClose: () => void;
    onDone: () => void;
    showToast: (m: string, t?: 'success' | 'error') => void;
}> = ({ item, onClose, onDone, showToast }) => {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [history, setHistory] = useState<ModAction[]>([]);
    const [people, setPeople] = useState<Record<string, PersonSummary>>({});
    const [historyLoading, setHistoryLoading] = useState(true);

    const ownerId = item.report.subject_owner_id;

    // The reported user's prior record. A moderator deciding a sanction needs
    // to know whether this is a first offence.
    useEffect(() => {
        let cancelled = false;
        if (!ownerId) { setHistoryLoading(false); return; }
        getModHistory({ userId: ownerId })
            .then(res => {
                if (cancelled) return;
                setHistory(res.actions);
                setPeople(res.people);
            })
            .catch(() => { if (!cancelled) setHistory([]); })
            .finally(() => { if (!cancelled) setHistoryLoading(false); });
        return () => { cancelled = true; };
    }, [ownerId]);

    const run = async (key: string, fn: () => Promise<void>, message: string) => {
        setBusy(key);
        try {
            await fn();
            showToast(message, 'success');
            onDone();
        } catch (err) {
            showToast(getErrorMessage(err, 'That action failed. Please try again.'), 'error');
            setBusy(null);
        }
    };

    const isContent = ['post', 'comment', 'story'].includes(item.report.subject_type);

    return (
        <Modal isOpen onClose={onClose} title="Review report" maxWidth="lg">
            <div className="space-y-5 text-left">
                <div className="rounded-xl border border-paper-300 bg-paper-100 p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {item.is_urgent && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase">
                                Urgent
                            </span>
                        )}
                        <span className="text-xs font-semibold text-ink-800">
                            {item.report.reason.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-paper-600">· {timeAgo(item.report.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-paper-700">
                        Reported by <strong>{item.reporter?.name || 'a user'}</strong>
                        {item.subject_owner?.name && <> · about <strong>{item.subject_owner.name}</strong></>}
                    </p>
                    {item.report.details && (
                        <p className="text-xs text-ink-700 bg-white rounded-xl p-3 border border-paper-300">
                            "{item.report.details}"
                        </p>
                    )}
                </div>

                <div>
                    <p className="text-[11px] font-medium text-paper-700 mb-1.5 flex items-center gap-1.5">
                        <FileText size={12} />
                        Content as reported
                    </p>
                    <div className="rounded-xl border border-paper-300 p-3.5 text-sm text-ink-800 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                        {item.report.snapshot_content || (
                            <em className="text-paper-600">
                                No snapshot was captured. The content may have been deleted before the report.
                            </em>
                        )}
                    </div>
                    <p className="text-[10px] text-paper-600 mt-1">
                        This is a snapshot taken when the report was filed, so edits since then don't hide the original.
                    </p>
                </div>

                <div>
                    <p className="text-[11px] font-medium text-paper-700 mb-1.5 flex items-center gap-1.5">
                        <History size={12} />
                        This user's record
                    </p>
                    {historyLoading ? (
                        <div className="py-4 flex justify-center">
                            <Loader2 size={14} className="animate-spin text-paper-500" />
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-xs text-paper-600 py-2">
                            No prior moderation actions — this appears to be a first report.
                        </p>
                    ) : (
                        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                            {history.slice(0, 10).map(a => (
                                <li key={a.id} className="text-[11px] text-paper-700 flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-paper-200 font-medium">
                                        {a.action_type.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-paper-600">
                                        {timeAgo(a.created_at)}
                                        {people[a.actor_id]?.name && <> by {people[a.actor_id].name}</>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <label htmlFor="mod-note" className="block text-[11px] font-medium text-paper-700 mb-1.5">
                        Decision note <span className="text-paper-600">(recorded in the audit log)</span>
                    </label>
                    <textarea
                        id="mod-note"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        rows={2}
                        placeholder="Why you're taking this action."
                        className="w-full border border-paper-300 rounded-xl py-2.5 px-3.5 text-sm outline-none resize-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                    />
                </div>

                <div className="space-y-2">
                    <p className="text-[11px] font-medium text-paper-700">Actions</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                            size="sm" variant="outline"
                            isLoading={busy === 'dismiss'}
                            onClick={() => run('dismiss',
                                () => resolveReport(item.report.id, 'dismissed', note || 'No action needed'),
                                'Report dismissed')}
                        >
                            <X size={13} className="mr-1.5" /> Dismiss — no breach
                        </Button>

                        {isContent && (
                            <Button
                                size="sm" variant="outline"
                                isLoading={busy === 'hide'}
                                onClick={() => run('hide', async () => {
                                    await moderateContent(item.report.subject_type, item.report.subject_id,
                                        'hidden', note || 'Under review', item.report.id);
                                    await resolveReport(item.report.id, 'triaged', note || 'Content hidden pending review');
                                }, 'Content hidden')}
                            >
                                <EyeOff size={13} className="mr-1.5" /> Hide pending review
                            </Button>
                        )}

                        {isContent && (
                            <Button
                                size="sm" variant="danger"
                                isLoading={busy === 'remove'}
                                onClick={() => run('remove', async () => {
                                    await moderateContent(item.report.subject_type, item.report.subject_id,
                                        'removed', note || 'Violates community guidelines', item.report.id);
                                    await resolveReport(item.report.id, 'resolved', note || 'Content removed');
                                }, 'Content removed and the author notified')}
                            >
                                <EyeOff size={13} className="mr-1.5" /> Remove content
                            </Button>
                        )}

                        {ownerId && (
                            <Button
                                size="sm" variant="danger"
                                isLoading={busy === 'restrict'}
                                onClick={() => run('restrict', async () => {
                                    await restrictUser(ownerId, 'post_restricted' as RestrictionType,
                                        note || 'Repeated guideline breaches', '168h', item.report.id);
                                    await resolveReport(item.report.id, 'resolved', note || 'User restricted for 7 days');
                                }, 'User restricted for 7 days')}
                            >
                                <Ban size={13} className="mr-1.5" /> Restrict posting (7 days)
                            </Button>
                        )}
                    </div>

                    <Button
                        size="sm" fullWidth
                        isLoading={busy === 'resolve'}
                        onClick={() => run('resolve',
                            () => resolveReport(item.report.id, 'resolved', note || 'Reviewed'),
                            'Report resolved')}
                    >
                        <Check size={13} className="mr-1.5" /> Mark resolved
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default Moderation;
