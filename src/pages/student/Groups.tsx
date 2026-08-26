import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Users, Plus, Search, Loader2, AlertCircle, Lock, Globe, Shield,
    Megaphone, MessageSquare, BookOpen, HelpCircle, Check, Link2, LogOut,
    UserPlus, Crown, Settings,
} from 'lucide-react';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../services/api';
import {
    discoverGroups, getMyGroups, getGroup, createGroup, joinGroup, leaveGroup,
    getGroupMembers, manageMember, createInvite, redeemInvite, inviteLink,
    VISIBILITY_LABELS, JOIN_LABELS, KIND_LABELS,
    type Group, type GroupKind, type GroupVisibility, type JoinPolicy,
    type GroupMemberRow, type MemberStatus,
} from '../../services/groupsService';

/**
 * Groups: discovery, membership, and administration.
 *
 * The screen leads with "Your groups" rather than discovery, because after the
 * first week that is what someone opens this page to reach. Discovery is a tab,
 * not the default.
 */

const KIND_ICONS: Record<GroupKind, typeof MessageSquare> = {
    discussion: MessageSquare,
    announcement: Megaphone,
    qa: HelpCircle,
    resource: BookOpen,
};

const VISIBILITY_ICONS: Record<GroupVisibility, typeof Globe> = {
    public: Globe,
    restricted: Shield,
    private: Lock,
};

type Tab = 'mine' | 'discover';

const GroupsPage: React.FC = () => {
    const { showToast } = useToast();
    const [params, setParams] = useSearchParams();

    const [tab, setTab] = useState<Tab>('mine');
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [discovered, setDiscovered] = useState<Group[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const [creating, setCreating] = useState(false);
    const [openGroupId, setOpenGroupId] = useState<string | null>(params.get('id'));

    const reload = useCallback(() => setReloadToken(t => t + 1), []);

    // An invite link lands here with ?invite=CODE and redeems on arrival.
    useEffect(() => {
        const code = params.get('invite');
        if (!code) return;
        redeemInvite(code)
            .then(group => {
                showToast(`You joined ${group.name}`, 'success');
                setOpenGroupId(group.id);
                reload();
            })
            .catch(err => showToast(getErrorMessage(err, 'That invite link is not valid.'), 'error'))
            .finally(() => {
                params.delete('invite');
                setParams(params, { replace: true });
            });
    }, [params, setParams, showToast, reload]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const request = tab === 'mine'
            ? getMyGroups().then(items => ({ items }))
            : discoverGroups(query).then(res => ({ items: res.items }));

        request
            .then(({ items }) => {
                if (cancelled) return;
                if (tab === 'mine') setMyGroups(items);
                else setDiscovered(items);
            })
            .catch(err => {
                if (!cancelled) setError(getErrorMessage(err, 'Could not load groups.'));
            })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [tab, query, reloadToken]);

    const list = tab === 'mine' ? myGroups : discovered;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-5 font-sans">
            <header className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="co-display text-xl md:text-3xl text-ink-800 flex items-center gap-2">
                        <Users size={22} className="text-nile-blue" />
                        Groups
                    </h1>
                    <p className="text-xs text-paper-600 mt-1">
                        Study groups, clubs and course spaces.
                    </p>
                </div>
                <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus size={14} className="mr-1.5" /> New group
                </Button>
            </header>

            <div className="flex gap-1" role="tablist" aria-label="Group view">
                {([
                    { value: 'mine' as const, label: 'Your groups' },
                    { value: 'discover' as const, label: 'Discover' },
                ]).map(({ value, label }) => (
                    <button
                        key={value}
                        role="tab"
                        aria-selected={tab === value}
                        onClick={() => setTab(value)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors
                            ${tab === value ? 'bg-nile-blue text-white' : 'text-paper-700 hover:bg-paper-200'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'discover' && (
                <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-600 pointer-events-none" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search groups…"
                        aria-label="Search groups"
                        className="w-full h-10 pl-10 pr-4 rounded-xl border border-paper-300 text-sm outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10"
                    />
                </div>
            )}

            {loading ? (
                <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="social-card p-4 animate-pulse space-y-2">
                            <div className="h-4 bg-paper-200 rounded w-1/3" />
                            <div className="h-3 bg-paper-200 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="social-card py-12 text-center space-y-3">
                    <AlertCircle size={24} className="text-red-300 mx-auto" />
                    <p className="text-sm text-paper-700">{error}</p>
                    <Button size="sm" variant="outline" onClick={reload}>Try again</Button>
                </div>
            ) : list.length === 0 ? (
                <div className="social-card py-14 text-center space-y-2">
                    <Users size={26} className="text-paper-400 mx-auto" />
                    <p className="text-sm text-paper-700">
                        {tab === 'mine' ? "You haven't joined any groups yet." : 'No groups match that search.'}
                    </p>
                    {tab === 'mine' && (
                        <button onClick={() => setTab('discover')} className="text-xs font-medium text-nile-blue hover:underline">
                            Find a group to join →
                        </button>
                    )}
                </div>
            ) : (
                <ul className="space-y-3">
                    {list.map(group => (
                        <GroupRow
                            key={group.id}
                            group={group}
                            onOpen={() => setOpenGroupId(group.id)}
                            onChanged={reload}
                        />
                    ))}
                </ul>
            )}

            {creating && (
                <CreateGroupModal
                    onClose={() => setCreating(false)}
                    onCreated={group => { setCreating(false); reload(); setOpenGroupId(group.id); }}
                />
            )}

            {openGroupId && (
                <GroupDetailModal
                    groupId={openGroupId}
                    onClose={() => setOpenGroupId(null)}
                    onChanged={reload}
                />
            )}
        </div>
    );
};

// ── Row ───────────────────────────────────────────────────────────────────────

const GroupRow: React.FC<{ group: Group; onOpen: () => void; onChanged: () => void }> = ({
    group, onOpen, onChanged,
}) => {
    const { showToast } = useToast();
    const [busy, setBusy] = useState(false);
    const KindIcon = KIND_ICONS[group.kind] ?? MessageSquare;
    const VisIcon = VISIBILITY_ICONS[group.visibility] ?? Globe;

    const handleJoin = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setBusy(true);
        try {
            const res = await joinGroup(group.id);
            showToast(res.message, 'success');
            onChanged();
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not join that group.'), 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <li>
            <button onClick={onOpen} className="w-full text-left social-card p-4 hover:border-paper-300 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-nile-blue/10 text-nile-blue flex items-center justify-center flex-shrink-0">
                        <KindIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-ink-800 truncate">{group.name}</h3>
                            <span className="flex items-center gap-1 text-[10px] text-paper-600" title={VISIBILITY_LABELS[group.visibility]?.label}>
                                <VisIcon size={10} />
                            </span>
                            {group.my_role === 'owner' && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-[10px] font-medium">
                                    <Crown size={9} /> Owner
                                </span>
                            )}
                            {group.my_status === 'pending' && (
                                <span className="px-1.5 py-0.5 rounded-full bg-paper-200 text-paper-700 text-[10px]">
                                    Requested
                                </span>
                            )}
                        </div>
                        {group.description && (
                            <p className="text-xs text-paper-700 mt-1 line-clamp-2">{group.description}</p>
                        )}
                        <p className="text-[11px] text-paper-600 mt-1.5">
                            {group.members_count} {group.members_count === 1 ? 'member' : 'members'}
                            {group.posts_count > 0 && <> · {group.posts_count} posts</>}
                        </p>
                    </div>
                    {!group.is_member && group.my_status !== 'pending' && (
                        <Button size="xs" variant="outline" onClick={handleJoin} isLoading={busy}>
                            {group.join_policy === 'request' ? 'Request' : 'Join'}
                        </Button>
                    )}
                    {group.is_member && (
                        <span className="flex items-center gap-1 text-[11px] text-nile-green flex-shrink-0">
                            <Check size={12} /> Joined
                        </span>
                    )}
                </div>
            </button>
        </li>
    );
};

// ── Create ────────────────────────────────────────────────────────────────────

const CreateGroupModal: React.FC<{ onClose: () => void; onCreated: (g: Group) => void }> = ({
    onClose, onCreated,
}) => {
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [kind, setKind] = useState<GroupKind>('discussion');
    const [visibility, setVisibility] = useState<GroupVisibility>('public');
    const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>('open');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // A private group that anyone can join is a contradiction; the server
    // corrects it, and the form should not offer the impossible combination.
    useEffect(() => {
        if (visibility === 'private' && joinPolicy === 'open') setJoinPolicy('invite_only');
    }, [visibility, joinPolicy]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Give your group a name.'); return; }
        setBusy(true);
        setError(null);
        try {
            const group = await createGroup({
                name: name.trim(), description: description.trim(),
                kind, visibility, join_policy: joinPolicy,
            });
            showToast(`${group.name} created`, 'success');
            onCreated(group);
        } catch (err) {
            setError(getErrorMessage(err, 'Could not create that group.'));
        } finally {
            setBusy(false);
        }
    };

    const field = 'w-full border border-paper-300 rounded-xl py-2.5 px-3.5 text-sm outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10';

    return (
        <Modal isOpen onClose={onClose} title="Create a group" maxWidth="sm">
            <form onSubmit={submit} className="space-y-4 text-left">
                <div>
                    <label htmlFor="g-name" className="block text-xs font-medium text-ink-700 mb-1.5">Name</label>
                    <input id="g-name" value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. CS 101 Study Group" className={field} maxLength={80} />
                </div>
                <div>
                    <label htmlFor="g-desc" className="block text-xs font-medium text-ink-700 mb-1.5">
                        What's it for? <span className="text-paper-600">(optional)</span>
                    </label>
                    <textarea id="g-desc" value={description} onChange={e => setDescription(e.target.value)}
                        rows={2} className={`${field} resize-none`} maxLength={500} />
                </div>

                <fieldset>
                    <legend className="text-xs font-medium text-ink-700 mb-1.5">Type</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(KIND_LABELS) as GroupKind[]).map(k => {
                            const Icon = KIND_ICONS[k];
                            return (
                                <button key={k} type="button" onClick={() => setKind(k)}
                                    className={`p-2.5 rounded-xl border text-left transition-colors
                                        ${kind === k ? 'border-nile-blue bg-nile-blue/5' : 'border-paper-300 hover:bg-paper-100'}`}>
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-ink-800">
                                        <Icon size={12} /> {KIND_LABELS[k].label}
                                    </span>
                                    <span className="block text-[10px] text-paper-700 mt-0.5">{KIND_LABELS[k].help}</span>
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                <div>
                    <label htmlFor="g-vis" className="block text-xs font-medium text-ink-700 mb-1.5">Who can find it</label>
                    <select id="g-vis" value={visibility} onChange={e => setVisibility(e.target.value as GroupVisibility)} className={field}>
                        {(Object.keys(VISIBILITY_LABELS) as GroupVisibility[]).map(v => (
                            <option key={v} value={v}>{VISIBILITY_LABELS[v].label}</option>
                        ))}
                    </select>
                    <p className="text-[11px] text-paper-700 mt-1">{VISIBILITY_LABELS[visibility].help}</p>
                </div>

                <div>
                    <label htmlFor="g-join" className="block text-xs font-medium text-ink-700 mb-1.5">How people join</label>
                    <select id="g-join" value={joinPolicy} onChange={e => setJoinPolicy(e.target.value as JoinPolicy)} className={field}>
                        {(Object.keys(JOIN_LABELS) as JoinPolicy[])
                            .filter(j => !(visibility === 'private' && j === 'open'))
                            .map(j => <option key={j} value={j}>{JOIN_LABELS[j].label}</option>)}
                    </select>
                    <p className="text-[11px] text-paper-700 mt-1">{JOIN_LABELS[joinPolicy].help}</p>
                </div>

                {error && (
                    <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                        <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                )}

                <div className="flex gap-2">
                    <Button type="submit" size="sm" fullWidth isLoading={busy}>Create group</Button>
                    <Button type="button" size="sm" variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </form>
        </Modal>
    );
};

// ── Detail ────────────────────────────────────────────────────────────────────

const GroupDetailModal: React.FC<{
    groupId: string; onClose: () => void; onChanged: () => void;
}> = ({ groupId, onClose, onChanged }) => {
    const { showToast } = useToast();
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMemberRow[]>([]);
    const [pending, setPending] = useState<GroupMemberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getGroup(groupId)
            .then(async res => {
                if (cancelled) return;
                setGroup(res.group);
                if (res.group.is_member) {
                    const roster = await getGroupMembers(groupId, 'active').catch(() => null);
                    if (roster && !cancelled) setMembers(roster.items);
                    if (res.group.can_moderate) {
                        const requests = await getGroupMembers(groupId, 'pending').catch(() => null);
                        if (requests && !cancelled) setPending(requests.items);
                    }
                }
            })
            .catch(err => {
                if (!cancelled) setError(getErrorMessage(err, 'That group is not available.'));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [groupId, refresh]);

    const act = async (key: string, fn: () => Promise<void>, message: string) => {
        setBusy(key);
        try {
            await fn();
            showToast(message, 'success');
            setRefresh(r => r + 1);
            onChanged();
        } catch (err) {
            showToast(getErrorMessage(err, 'That action failed.'), 'error');
        } finally {
            setBusy(null);
        }
    };

    const handleInvite = async () => {
        if (!group) return;
        try {
            const invite = await createInvite(group.id, 0, 168);
            await navigator.clipboard.writeText(inviteLink(invite.code)).catch(() => undefined);
            showToast('Invite link copied — valid for 7 days', 'success');
        } catch (err) {
            showToast(getErrorMessage(err, 'Could not create an invite.'), 'error');
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={group?.name ?? 'Group'} maxWidth="md">
            {loading ? (
                <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-paper-500" /></div>
            ) : error || !group ? (
                <p className="py-8 text-center text-sm text-paper-700">{error}</p>
            ) : (
                <div className="space-y-5 text-left">
                    {group.description && <p className="text-sm text-ink-700">{group.description}</p>}

                    <div className="flex flex-wrap gap-2 text-[11px]">
                        <Badge>{KIND_LABELS[group.kind]?.label}</Badge>
                        <Badge>{VISIBILITY_LABELS[group.visibility]?.label}</Badge>
                        <Badge>{group.members_count} members</Badge>
                        {group.my_role && group.my_role !== 'member' && <Badge tone="accent">You're {group.my_role}</Badge>}
                    </div>

                    {group.kind === 'announcement' && !group.can_post && group.is_member && (
                        <p className="text-[11px] text-paper-700 flex items-center gap-1.5 p-2.5 rounded-xl bg-paper-100">
                            <Megaphone size={12} /> Only admins post here. You'll see every announcement.
                        </p>
                    )}

                    {/* Join requests, admins only */}
                    {group.can_moderate && pending.length > 0 && (
                        <section>
                            <h3 className="text-xs font-medium text-ink-700 mb-2">
                                Join requests ({pending.length})
                            </h3>
                            <ul className="space-y-1.5">
                                {pending.map(row => (
                                    <li key={row.user.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-paper-100">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar name={row.user.name} size="sm" />
                                            <span className="text-sm text-ink-800 truncate">{row.user.name}</span>
                                        </div>
                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <Button size="xs" isLoading={busy === `a-${row.user.id}`}
                                                onClick={() => act(`a-${row.user.id}`,
                                                    () => manageMember(group.id, row.user.id, 'approve'),
                                                    `${row.user.name} joined`)}>
                                                Approve
                                            </Button>
                                            <Button size="xs" variant="outline" isLoading={busy === `d-${row.user.id}`}
                                                onClick={() => act(`d-${row.user.id}`,
                                                    () => manageMember(group.id, row.user.id, 'decline'),
                                                    'Request declined')}>
                                                Decline
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {group.is_member && members.length > 0 && (
                        <section>
                            <h3 className="text-xs font-medium text-ink-700 mb-2">Members</h3>
                            <ul className="divide-y divide-paper-200 max-h-56 overflow-y-auto">
                                {members.map(row => (
                                    <li key={row.user.id} className="flex items-center justify-between gap-2 py-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Avatar name={row.user.name} size="sm" />
                                            <div className="min-w-0">
                                                <p className="text-sm text-ink-800 truncate">{row.user.name}</p>
                                                <p className="text-[11px] text-paper-600 capitalize">{row.role}</p>
                                            </div>
                                        </div>
                                        {group.can_administer && row.role !== 'owner' && (
                                            <Button size="xs" variant="outline" isLoading={busy === `r-${row.user.id}`}
                                                onClick={() => act(`r-${row.user.id}`,
                                                    () => manageMember(group.id, row.user.id, 'remove'),
                                                    `${row.user.name} removed`)}>
                                                Remove
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        {!group.is_member && group.my_status !== 'pending' && (
                            <Button size="sm" isLoading={busy === 'join'}
                                onClick={() => act('join', async () => { await joinGroup(group.id); },
                                    group.join_policy === 'request' ? 'Request sent' : `You joined ${group.name}`)}>
                                <UserPlus size={13} className="mr-1.5" />
                                {group.join_policy === 'request' ? 'Request to join' : 'Join group'}
                            </Button>
                        )}
                        {group.can_administer && (
                            <Button size="sm" variant="outline" onClick={handleInvite}>
                                <Link2 size={13} className="mr-1.5" /> Copy invite link
                            </Button>
                        )}
                        {group.is_member && (
                            <Button size="sm" variant="outline" isLoading={busy === 'leave'}
                                onClick={() => act('leave', () => leaveGroup(group.id), `You left ${group.name}`)}>
                                <LogOut size={13} className="mr-1.5" /> Leave
                            </Button>
                        )}
                    </div>

                    {group.my_role === 'owner' && (
                        <p className="text-[11px] text-paper-600 flex items-start gap-1.5">
                            <Settings size={11} className="flex-shrink-0 mt-0.5" />
                            As owner you must transfer ownership before you can leave, so the group is never left unadministered.
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
};

const Badge: React.FC<{ children: React.ReactNode; tone?: 'accent' }> = ({ children, tone }) => (
    <span className={`px-2 py-0.5 rounded-full ${tone === 'accent' ? 'bg-nile-blue/10 text-nile-blue' : 'bg-paper-200 text-paper-700'}`}>
        {children}
    </span>
);

export default GroupsPage;
