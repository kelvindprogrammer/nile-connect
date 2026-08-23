import React, { useEffect, useState } from 'react';
import { Eye, CheckCircle2, MessageCircle, Heart, Loader2, Lock } from 'lucide-react';
import Modal from '../Modal';
import Avatar from '../Avatar';
import { getStoryInsights, type Story, type StoryAnalytics } from '../../services/storiesService';
import type { PersonSummary } from '../../services/socialService';
import { getErrorMessage } from '../../services/api';

/**
 * Per-story performance, visible only to the author.
 *
 * The server enforces that (a non-author gets a 403), so this component is the
 * presentation of a right the API already guarantees rather than the thing
 * granting it.
 *
 * Completion rate is the metric worth surfacing: raw views reward posting a lot,
 * completion rewards posting something people actually watch to the end. Showing
 * the honest number is also what lets someone decide to post less.
 */

interface StoryInsightsProps {
    story: Story;
    onClose: () => void;
}

const StoryInsights: React.FC<StoryInsightsProps> = ({ story, onClose }) => {
    const [analytics, setAnalytics] = useState<StoryAnalytics | null>(null);
    const [viewers, setViewers] = useState<PersonSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        getStoryInsights(story.id)
            .then(res => {
                if (cancelled) return;
                setAnalytics(res.analytics);
                setViewers(res.viewers);
            })
            .catch(err => {
                if (!cancelled) setError(getErrorMessage(err, 'Could not load insights.'));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [story.id]);

    return (
        <Modal isOpen onClose={onClose} title="Story insights" maxWidth="sm">
            {loading ? (
                <div className="py-10 flex justify-center">
                    <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
            ) : error ? (
                <p className="py-8 text-center text-sm text-gray-500">{error}</p>
            ) : (
                <div className="space-y-5 text-left">
                    <div className="grid grid-cols-2 gap-3">
                        <Stat Icon={Eye} label="Views" value={analytics?.views ?? 0} />
                        <Stat
                            Icon={CheckCircle2}
                            label="Watched to the end"
                            value={`${Math.round((analytics?.completion_rate ?? 0) * 100)}%`}
                        />
                        <Stat Icon={Heart} label="Reactions" value={analytics?.reactions ?? 0} />
                        <Stat Icon={MessageCircle} label="Replies" value={analytics?.replies ?? 0} />
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">
                            Viewers {viewers.length > 0 && <span className="text-gray-400">({viewers.length})</span>}
                        </p>
                        {viewers.length === 0 ? (
                            <p className="py-6 text-center text-xs text-gray-400">
                                No one has watched this yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                                {viewers.map(v => (
                                    <li key={v.id} className="flex items-center gap-3 py-2.5">
                                        <Avatar name={v.name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-800 truncate">{v.name}</p>
                                            <p className="text-[11px] text-gray-400 truncate">@{v.username}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <p className="flex items-start gap-1.5 text-[11px] text-gray-400">
                        <Lock size={11} className="flex-shrink-0 mt-0.5" />
                        Only you can see who viewed your story.
                    </p>
                </div>
            )}
        </Modal>
    );
};

const Stat: React.FC<{
    Icon: typeof Eye;
    label: string;
    value: number | string;
}> = ({ Icon, label, value }) => (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5">
        <Icon size={14} className="text-nile-blue mb-1.5" />
        <p className="text-xl font-semibold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-1">{label}</p>
    </div>
);

export default StoryInsights;
