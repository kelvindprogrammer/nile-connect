import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Shield, Eye, MessageSquare, AtSign, Users, Search,
    Loader2, AlertCircle, Check, UserX, VolumeX, Bell, BellOff,
} from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import {
    getPrivacySettings, updatePrivacySettings, listBlockedUsers, unblockUser,
    AUDIENCE_LABELS, GATE_LABELS,
    type Audience, type Gate, type PrivacySettings as Settings, type PersonSummary,
} from '../../services/socialService';
import {
    getPushState, subscribeToPush, unsubscribeFromPush, type PushState,
} from '../../services/pushService';

/**
 * Privacy control centre.
 *
 * Every control here maps to a check enforced server-side in lib/privacy —
 * none of it is cosmetic. The copy under each option states the actual
 * consequence, because a privacy control nobody understands is not a control.
 *
 * Saves are applied per-field and optimistically, with rollback on failure:
 * a privacy screen that makes you press "Save" invites people to change a
 * setting, get distracted, and believe they are protected when they are not.
 */

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const PrivacySettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [settings, setSettings] = useState<Settings | null>(null);
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');

    const [blocked, setBlocked] = useState<PersonSummary[]>([]);
    const [blockedLoading, setBlockedLoading] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);

    const [pushState, setPushState] = useState<PushState>('unsubscribed');
    const [pushBusy, setPushBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getPushState()
            .then(state => { if (!cancelled) setPushState(state); })
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    const togglePush = async () => {
        setPushBusy(true);
        try {
            const next = pushState === 'subscribed'
                ? await unsubscribeFromPush()
                : await subscribeToPush();
            setPushState(next);
            if (next === 'denied') {
                showToast('Notifications are blocked in your browser settings.', 'error');
            } else if (next === 'subscribed') {
                showToast('Push notifications are on for this device.', 'success');
            }
        } finally {
            setPushBusy(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getPrivacySettings()
            .then(res => {
                if (cancelled) return;
                setSettings(res.settings);
                setAudiences(res.audiences);
                setLoadError(null);
            })
            .catch(err => {
                if (!cancelled) setLoadError(getErrorMessage(err, 'Could not load your privacy settings.'));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [reloadToken]);

    useEffect(() => {
        let cancelled = false;
        listBlockedUsers()
            .then(list => { if (!cancelled) setBlocked(list); })
            .catch(() => { if (!cancelled) setBlocked([]); })
            .finally(() => { if (!cancelled) setBlockedLoading(false); });
        return () => { cancelled = true; };
    }, [reloadToken]);

    const patch = async (update: Partial<Settings>) => {
        if (!settings) return;
        const previous = settings;
        setSettings({ ...settings, ...update });
        setSaveState('saving');
        try {
            const saved = await updatePrivacySettings(update);
            setSettings(saved);
            setSaveState('saved');
            setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 2000);
        } catch (err) {
            setSettings(previous); // exact rollback — never leave a false sense of safety
            setSaveState('error');
            showToast(getErrorMessage(err, 'Could not save that setting. Please try again.'), 'error');
        }
    };

    const handleUnblock = async (person: PersonSummary) => {
        const previous = blocked;
        setBlocked(prev => prev.filter(p => p.id !== person.id));
        try {
            await unblockUser(person.id);
            showToast(`${person.name} is unblocked. They are not followed again automatically.`, 'success');
        } catch (err) {
            setBlocked(previous);
            showToast(getErrorMessage(err, 'Could not unblock.'), 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
        );
    }

    if (loadError || !settings) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="social-card py-12 text-center space-y-3">
                    <AlertCircle size={26} className="text-red-300 mx-auto" />
                    <p className="text-sm text-gray-600">{loadError}</p>
                    <Button size="sm" variant="outline" onClick={() => setReloadToken(t => t + 1)}>
                        Try again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24 space-y-6 font-sans">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                        className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-semibold text-gray-900 leading-tight">
                            Privacy & safety
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Changes save automatically
                        </p>
                    </div>
                </div>
                <div aria-live="polite" className="text-xs flex-shrink-0">
                    {saveState === 'saving' && (
                        <span className="flex items-center gap-1.5 text-gray-400">
                            <Loader2 size={12} className="animate-spin" /> Saving
                        </span>
                    )}
                    {saveState === 'saved' && (
                        <span className="flex items-center gap-1.5 text-nile-green">
                            <Check size={12} /> Saved
                        </span>
                    )}
                </div>
            </div>

            <Section
                icon={Eye}
                title="Who can see what"
                description="These apply everywhere on Nile Connect, not just in the app you're using now."
            >
                <ChoiceRow
                    label="Your profile"
                    help="Who can open your profile and see your posts, connections and activity."
                    value={settings.profile_visibility}
                    options={audiences}
                    labels={AUDIENCE_LABELS}
                    onChange={v => patch({ profile_visibility: v as Audience })}
                />
                <ChoiceRow
                    label="New posts, by default"
                    help="You can still change the audience on any individual post."
                    value={settings.default_post_audience}
                    options={audiences}
                    labels={AUDIENCE_LABELS}
                    onChange={v => patch({ default_post_audience: v as Audience })}
                />
                <ChoiceRow
                    label="New stories, by default"
                    help="Stories are more personal, so this starts narrower than posts."
                    value={settings.default_story_audience}
                    options={audiences}
                    labels={AUDIENCE_LABELS}
                    onChange={v => patch({ default_story_audience: v as Audience })}
                />
            </Section>

            <Section
                icon={MessageSquare}
                title="Who can reach you"
                description="Limiting these does not tell anyone they've been limited."
            >
                <ChoiceRow
                    icon={AtSign}
                    label="Mention you with @"
                    help="People who can't mention you also won't see you in the @ suggestions."
                    value={settings.who_can_mention}
                    options={['everyone', 'connections', 'no_one'] as Gate[]}
                    labels={GATE_LABELS}
                    onChange={v => patch({ who_can_mention: v as Gate })}
                />
                <ChoiceRow
                    icon={MessageSquare}
                    label="Send you messages"
                    value={settings.who_can_message}
                    options={['everyone', 'connections', 'no_one'] as Gate[]}
                    labels={GATE_LABELS}
                    onChange={v => patch({ who_can_message: v as Gate })}
                />
                <ChoiceRow
                    icon={MessageSquare}
                    label="Comment on your posts"
                    value={settings.who_can_comment}
                    options={['everyone', 'connections', 'no_one'] as Gate[]}
                    labels={GATE_LABELS}
                    onChange={v => patch({ who_can_comment: v as Gate })}
                />
                <ChoiceRow
                    icon={Users}
                    label="Add you to groups"
                    help="You'll always be able to leave a group you were added to."
                    value={settings.who_can_add_to_groups}
                    options={['everyone', 'connections', 'no_one'] as Gate[]}
                    labels={GATE_LABELS}
                    onChange={v => patch({ who_can_add_to_groups: v as Gate })}
                />
            </Section>

            <Section icon={Search} title="Visibility & activity">
                <ToggleRow
                    label="Show when you're online"
                    help="People you've blocked never see this, whatever you choose."
                    checked={settings.show_online_status}
                    onChange={v => patch({ show_online_status: v })}
                />
                <ToggleRow
                    label="Show your activity"
                    help="Whether others see that you recently reacted, commented or joined something."
                    checked={settings.show_activity_status}
                    onChange={v => patch({ show_activity_status: v })}
                />
                <ToggleRow
                    label="Appear in search"
                    help="Turn this off and people who don't already know you won't find your profile."
                    checked={settings.discoverable_in_search}
                    onChange={v => patch({ discoverable_in_search: v })}
                />
                <ToggleRow
                    label="Let others reshare your stories"
                    checked={settings.allow_story_resharing}
                    onChange={v => patch({ allow_story_resharing: v })}
                />
            </Section>

            <Section
                icon={Bell}
                title="Push notifications"
                description="Get notified on this device even when Nile Connect is closed. This setting is per device."
            >
                <div className="py-3.5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                            {pushState === 'subscribed' ? 'On for this device' : 'Off for this device'}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                            {pushState === 'unsupported' && 'Your browser does not support push notifications.'}
                            {pushState === 'unconfigured' && 'Push is not set up on the server yet. Your in-app notifications still work.'}
                            {pushState === 'denied' && 'You blocked notifications for this site. Re-enable them in your browser settings.'}
                            {(pushState === 'subscribed' || pushState === 'unsubscribed') &&
                                'You will still see everything in the app either way — this only changes whether your device alerts you.'}
                        </p>
                    </div>
                    <Button
                        size="xs"
                        variant={pushState === 'subscribed' ? 'outline' : 'primary'}
                        onClick={togglePush}
                        isLoading={pushBusy}
                        disabled={pushState === 'unsupported' || pushState === 'unconfigured' || pushState === 'denied'}
                    >
                        {pushState === 'subscribed'
                            ? <><BellOff size={12} className="mr-1" /> Turn off</>
                            : <><Bell size={12} className="mr-1" /> Turn on</>}
                    </Button>
                </div>
            </Section>

            <Section
                icon={UserX}
                title="Blocked accounts"
                description="Blocked people can't see your profile or posts, message you, or find you in search — and you won't see them either."
            >
                {blockedLoading ? (
                    <div className="py-6 flex justify-center">
                        <Loader2 size={16} className="animate-spin text-gray-300" />
                    </div>
                ) : blocked.length === 0 ? (
                    <p className="py-6 text-center text-xs text-gray-400">
                        You haven't blocked anyone.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {blocked.map(person => (
                            <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                                    <p className="text-xs text-gray-400 truncate">@{person.username}</p>
                                </div>
                                <Button size="xs" variant="outline" onClick={() => handleUnblock(person)}>
                                    Unblock
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-nile-blue/5 border border-nile-blue/10">
                <VolumeX size={15} className="text-nile-blue flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                    Want to stop seeing someone without blocking them? Use <strong>Mute</strong> from the
                    menu on any of their posts. Muting is completely private — they're never told.
                </p>
            </div>
        </div>
    );
};

// ── Building blocks ───────────────────────────────────────────────────────────

const Section: React.FC<{
    icon: typeof Shield;
    title: string;
    description?: string;
    children: React.ReactNode;
}> = ({ icon: Icon, title, description, children }) => (
    <section className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
        <header className="px-4 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-2">
                <Icon size={15} className="text-nile-blue" />
                <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            </div>
            {description && (
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{description}</p>
            )}
        </header>
        <div className="px-4">{children}</div>
    </section>
);

const ChoiceRow: React.FC<{
    label: string;
    help?: string;
    icon?: typeof Shield;
    value: string;
    options: string[];
    labels: Record<string, string>;
    onChange: (value: string) => void;
}> = ({ label, help, value, options, labels, onChange }) => {
    const id = `choice-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
        <div className="py-3.5 border-b border-gray-50 last:border-0">
            <label htmlFor={id} className="block text-sm font-medium text-gray-800">
                {label}
            </label>
            {help && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{help}</p>}
            <select
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="mt-2 w-full border border-gray-200 rounded-xl py-2 px-3 text-sm bg-white
                           outline-none transition-all cursor-pointer
                           focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{labels[opt] ?? opt}</option>
                ))}
            </select>
        </div>
    );
};

const ToggleRow: React.FC<{
    label: string;
    help?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}> = ({ label, help, checked, onChange }) => (
    <div className="py-3.5 border-b border-gray-50 last:border-0 flex items-start justify-between gap-4">
        <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{label}</p>
            {help && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{help}</p>}
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5
                        ${checked ? 'bg-nile-blue' : 'bg-gray-200'}`}
        >
            <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform
                            ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
            />
        </button>
    </div>
);

export default PrivacySettingsPage;
