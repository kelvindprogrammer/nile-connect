import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MessageCircle, UserPlus, UserCheck, Clock, Check, X, Users, Loader2 } from 'lucide-react';
import Avatar from '../../components/Avatar';
import { useToast } from '../../context/ToastContext';
import ConnectionModal from '../../components/ConnectionModal';
import { searchUsers, type UserProfile } from '../../services/messageService';
import {
    getConnections, respondConnection, requestConnection, getConnectionSuggestions,
    type ConnectionsResponse, type ConnectionItem, type ConnectionSuggestion,
} from '../../services/connectionService';
import { isOnline, presenceLabel } from '../../utils/formatDate';

const ROLE_LABELS: Record<string, string> = {
    student: 'Student',
    staff: 'Career services',
    employer: 'Employer',
};

const FILTER_TABS: { key: string; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'student', label: 'Students' },
    { key: 'staff', label: 'Career services' },
    { key: 'employer', label: 'Employers' },
];

interface Person {
    id: string;
    name: string;
    role: string;
    roleLabel: string;
    major?: string;
    lastActiveAt?: string;
}

type ConnStatus = 'connected' | 'pending_outgoing' | 'pending_incoming' | 'none';

function apiUserToPerson(u: UserProfile): Person {
    const roleLabel = u.role === 'student' && u.student_subtype === 'alumni'
        ? 'Alumni'
        : ROLE_LABELS[u.role] || u.role;
    return {
        id: u.id,
        name: u.full_name,
        role: u.role,
        roleLabel,
        major: u.major,
        lastActiveAt: u.last_active_at,
    };
}

function presenceFor(lastActiveAt?: string): 'online' | 'offline' | undefined {
    if (!lastActiveAt) return undefined;
    return isOnline(lastActiveAt) ? 'online' : 'offline';
}

const emptyConnections: ConnectionsResponse = { accepted: [], incoming: [], outgoing: [] };

const Network = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('q') || '';
    const [filter, setFilter] = useState('all');

    const [people, setPeople] = useState<Person[]>([]);
    const [peopleLoading, setPeopleLoading] = useState(true);

    const [connections, setConnections] = useState<ConnectionsResponse>(emptyConnections);
    const [connLoading, setConnLoading] = useState(true);

    const [connectTarget, setConnectTarget] = useState<Person | null>(null);
    const [respondingId, setRespondingId] = useState<string | null>(null);

    const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
    const [suggestSending, setSuggestSending] = useState<string | null>(null);

    const setSearchTerm = (value: string) => setSearchParams(value ? { q: value } : {}, { replace: true });

    useEffect(() => {
        let cancelled = false;
        getConnections()
            .then(c => { if (!cancelled) setConnections(c || emptyConnections); })
            .catch(() => { if (!cancelled) setConnections(emptyConnections); })
            .finally(() => { if (!cancelled) setConnLoading(false); });
        getConnectionSuggestions()
            .then(s => { if (!cancelled) setSuggestions(s || []); })
            .catch(() => { if (!cancelled) setSuggestions([]); });
        return () => { cancelled = true; };
    }, []);

    const handleSuggestionConnect = async (suggestion: ConnectionSuggestion) => {
        setSuggestSending(suggestion.user_id);
        try {
            await requestConnection(suggestion.user_id);
            setSuggestions(prev => (prev || []).filter(s => s.user_id !== suggestion.user_id));
            showToast(`Invitation sent to ${suggestion.full_name}`, 'success');
        } catch {
            showToast('Could not send invitation.', 'error');
        } finally {
            setSuggestSending(null);
        }
    };

    const fetchPeople = useCallback(async () => {
        setPeopleLoading(true);
        try {
            const role = filter === 'all' ? '' : filter;
            const users = await searchUsers(searchTerm, role);
            // No results means no results. The page already renders a proper
            // empty state — filling it with invented people shows names that
            // belong to nobody, and every action on them fails.
            setPeople((users ?? []).map(apiUserToPerson));
        } catch {
            setPeople([]);
        } finally {
            setPeopleLoading(false);
        }
    }, [searchTerm, filter]);

    useEffect(() => {
        const debounce = setTimeout(fetchPeople, 300);
        return () => clearTimeout(debounce);
    }, [fetchPeople]);

    const connectionFor = (userId: string): { status: ConnStatus; connId?: string } => {
        const acceptedList = connections?.accepted || [];
        const outgoingList = connections?.outgoing || [];
        const incomingList = connections?.incoming || [];

        const acc = acceptedList.find(c => c.user_id === userId);
        if (acc) return { status: 'connected', connId: acc.id };
        const out = outgoingList.find(c => c.user_id === userId);
        if (out) return { status: 'pending_outgoing', connId: out.id };
        const inc = incomingList.find(c => c.user_id === userId);
        if (inc) return { status: 'pending_incoming', connId: inc.id };
        return { status: 'none' };
    };

    const handleConnectionSent = (conn: ConnectionItem) => {
        setConnections(prev => ({ ...prev, outgoing: [...prev.outgoing, conn] }));
    };

    const handleRespond = async (connId: string, action: 'accept' | 'decline', personName: string) => {
        setRespondingId(connId);
        try {
            await respondConnection(connId, action);
            setConnections(prev => {
                const item = prev.incoming.find(c => c.id === connId);
                const incoming = prev.incoming.filter(c => c.id !== connId);
                if (action === 'accept' && item) {
                    return { ...prev, incoming, accepted: [{ ...item, status: 'accepted' }, ...prev.accepted] };
                }
                return { ...prev, incoming };
            });
            showToast(
                action === 'accept' ? `You're now connected with ${personName}` : `Invitation from ${personName} declined`,
                'success'
            );
        } catch {
            showToast('Could not update the request.', 'error');
        } finally {
            setRespondingId(null);
        }
    };

    return (
        <>
            <div className="max-w-5xl mx-auto py-6 md:py-8 px-4 md:px-6 space-y-6 anime-fade-in min-h-full pb-24 text-left">

                <div className="border-b border-paper-300 pb-5">
                    <div className="co-eyebrow mb-1">1,842 alumni · 96 open to mentoring</div>
                    <h1 className="co-display text-3xl md:text-4xl text-ink-800 leading-tight">People who <em>were</em> here</h1>
                    <p className="text-sm text-paper-700 mt-1">Graduates who agreed to take questions from current students. Introductions run through the institution, not cold messages.</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-paper-100 border border-paper-300 rounded-xl p-4 text-center">
                        <p className="font-display text-2xl text-app-accent">{connLoading ? '—' : connections.accepted.length}</p>
                        <p className="text-xs text-paper-700 mt-0.5">Connections</p>
                    </div>
                    <div className="bg-paper-100 border border-paper-300 rounded-xl p-4 text-center">
                        <p className="font-display text-2xl text-green-700">{connLoading ? '—' : connections.incoming.length}</p>
                        <p className="text-xs text-paper-700 mt-0.5">Invitations</p>
                    </div>
                    <div className="bg-paper-100 border border-paper-300 rounded-xl p-4 text-center">
                        <p className="font-display text-2xl text-ink-700">{connLoading ? '—' : connections.outgoing.length}</p>
                        <p className="text-xs text-paper-700 mt-0.5">Pending</p>
                    </div>
                </div>

                {connections.incoming.length > 0 && (
                    <div className="social-card p-4 space-y-3">
                        <h2 className="text-sm font-semibold text-ink-800">Invitations</h2>
                        {connections.incoming.map(inv => (
                            <div key={inv.id} className="flex items-center gap-3">
                                <Avatar name={inv.full_name} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-ink-800 truncate">{inv.full_name}</p>
                                    <p className="text-xs text-paper-600">{ROLE_LABELS[inv.role] || inv.role} · wants to connect</p>
                                </div>
                                <button
                                    onClick={() => handleRespond(inv.id, 'decline', inv.full_name)}
                                    disabled={respondingId === inv.id}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-paper-200 text-paper-600 hover:bg-paper-300 transition-colors disabled:opacity-60"
                                >
                                    <X size={14} />
                                </button>
                                <button
                                    onClick={() => handleRespond(inv.id, 'accept', inv.full_name)}
                                    disabled={respondingId === inv.id}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-nile-blue text-white hover:bg-nile-blue-600 transition-colors disabled:opacity-60"
                                >
                                    {respondingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {suggestions.length > 0 && (
                    <div className="social-card p-4 space-y-3">
                        <h2 className="text-sm font-semibold text-ink-800">People you may know</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {suggestions.map(s => (
                                <div key={s.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-paper-100 transition-colors">
                                    <Avatar name={s.full_name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-ink-800 truncate">{s.full_name}</p>
                                        <p className="text-xs text-paper-600">
                                            {ROLE_LABELS[s.role] || s.role}
                                            {s.mutual_connections > 0 ? ` · ${s.mutual_connections} mutual` : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleSuggestionConnect(s)}
                                        disabled={suggestSending === s.user_id}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-nile-blue/10 text-nile-blue hover:bg-nile-blue hover:text-white transition-colors disabled:opacity-60 flex-shrink-0"
                                    >
                                        {suggestSending === s.user_id ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-paper-500" />
                        <input
                            type="text"
                            placeholder="Search by name or major..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-paper-300 rounded-full text-sm text-ink-800 placeholder:text-paper-600 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                        />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                    filter === tab.key ? 'bg-nile-blue text-white' : 'bg-paper-200 text-paper-700 hover:bg-paper-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {peopleLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-paper-500" />
                    </div>
                ) : people.length === 0 ? (
                    <div className="social-card py-14 text-center">
                        <Users size={28} className="text-paper-400 mx-auto mb-3" />
                        <p className="text-sm text-paper-600">No people found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {people.map(person => (
                            <PersonCard
                                key={person.id}
                                person={person}
                                connection={connectionFor(person.id)}
                                respondingId={respondingId}
                                onConnect={() => setConnectTarget(person)}
                                onRespond={handleRespond}
                                onMessage={() => navigate('/student/messages', { state: { startConversationWith: { id: person.id, full_name: person.name } } })}
                            />
                        ))}
                    </div>
                )}

                {connectTarget && (
                    <ConnectionModal
                        isOpen={!!connectTarget}
                        onClose={() => setConnectTarget(null)}
                        onSent={handleConnectionSent}
                        userId={connectTarget.id}
                        name={connectTarget.name}
                        role={connectTarget.roleLabel}
                    />
                )}
            </div>
        </>
    );
};

const PersonCard = ({
    person, connection, respondingId, onConnect, onRespond, onMessage,
}: {
    person: Person;
    connection: { status: ConnStatus; connId?: string };
    respondingId: string | null;
    onConnect: () => void;
    onRespond: (connId: string, action: 'accept' | 'decline', name: string) => void;
    onMessage: () => void;
}) => (
    <div className="bg-white p-4 rounded-xl border border-paper-300 shadow-soft-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
            <Avatar name={person.name} size="md" presence={presenceFor(person.lastActiveAt)} />
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-ink-800 truncate">{person.name}</h3>
                <p className="text-xs text-paper-600 mt-0.5 truncate">
                    {person.roleLabel}{person.major ? ` · ${person.major}` : ''}
                </p>
                {presenceLabel(person.lastActiveAt) && (
                    <p className="text-[11px] text-paper-600 mt-0.5">{presenceLabel(person.lastActiveAt)}</p>
                )}
            </div>
        </div>

        <div className="flex gap-2">
            {connection.status === 'connected' && (
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    <UserCheck size={14} /> Connected
                </span>
            )}
            {connection.status === 'pending_outgoing' && (
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium bg-paper-100 text-paper-700 border border-paper-300">
                    <Clock size={14} /> Pending
                </span>
            )}
            {connection.status === 'pending_incoming' && connection.connId && (
                <>
                    <button
                        onClick={() => onRespond(connection.connId!, 'decline', person.name)}
                        disabled={respondingId === connection.connId}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium bg-paper-100 text-paper-700 hover:bg-paper-200 transition-colors disabled:opacity-60 border border-paper-300"
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => onRespond(connection.connId!, 'accept', person.name)}
                        disabled={respondingId === connection.connId}
                        className="flex-1 py-1.5 rounded-md text-xs font-medium bg-app-accent text-white hover:bg-harbour-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                        {respondingId === connection.connId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
                    </button>
                </>
            )}
            {connection.status === 'none' && (
                <button
                    onClick={onConnect}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium bg-app-accent text-white hover:bg-harbour-600 transition-colors"
                >
                    <UserPlus size={14} /> Connect
                </button>
            )}
            <button
                onClick={onMessage}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium bg-paper-100 text-ink-700 hover:bg-paper-200 transition-colors border border-paper-300"
            >
                <MessageCircle size={14} /> Message
            </button>
        </div>
    </div>
);

export default Network;
