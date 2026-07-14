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
            .then(c => { if (!cancelled) setConnections(c); })
            .catch(() => { if (!cancelled) setConnections(emptyConnections); })
            .finally(() => { if (!cancelled) setConnLoading(false); });
        getConnectionSuggestions()
            .then(s => { if (!cancelled) setSuggestions(s); })
            .catch(() => { if (!cancelled) setSuggestions([]); });
        return () => { cancelled = true; };
    }, []);

    const handleSuggestionConnect = async (suggestion: ConnectionSuggestion) => {
        setSuggestSending(suggestion.user_id);
        try {
            await requestConnection(suggestion.user_id);
            setSuggestions(prev => prev.filter(s => s.user_id !== suggestion.user_id));
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
            setPeople(users.map(apiUserToPerson));
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
        const acc = connections.accepted.find(c => c.user_id === userId);
        if (acc) return { status: 'connected', connId: acc.id };
        const out = connections.outgoing.find(c => c.user_id === userId);
        if (out) return { status: 'pending_outgoing', connId: out.id };
        const inc = connections.incoming.find(c => c.user_id === userId);
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
            <div className="max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-6 space-y-5 anime-fade-in min-h-full pb-24">

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-nile-blue rounded-2xl flex items-center justify-center text-white shadow-blue flex-shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 leading-none">My network</h1>
                        <p className="text-sm text-gray-400 mt-1">Grow your professional community</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="social-card p-4 text-center">
                        <p className="text-xl font-semibold text-nile-blue">{connLoading ? '—' : connections.accepted.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Connections</p>
                    </div>
                    <div className="social-card p-4 text-center">
                        <p className="text-xl font-semibold text-nile-green">{connLoading ? '—' : connections.incoming.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Invitations</p>
                    </div>
                    <div className="social-card p-4 text-center">
                        <p className="text-xl font-semibold text-gray-700">{connLoading ? '—' : connections.outgoing.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Pending</p>
                    </div>
                </div>

                {connections.incoming.length > 0 && (
                    <div className="social-card p-4 space-y-3">
                        <h2 className="text-sm font-semibold text-gray-900">Invitations</h2>
                        {connections.incoming.map(inv => (
                            <div key={inv.id} className="flex items-center gap-3">
                                <Avatar name={inv.full_name} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{inv.full_name}</p>
                                    <p className="text-xs text-gray-400">{ROLE_LABELS[inv.role] || inv.role} · wants to connect</p>
                                </div>
                                <button
                                    onClick={() => handleRespond(inv.id, 'decline', inv.full_name)}
                                    disabled={respondingId === inv.id}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors disabled:opacity-60"
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
                        <h2 className="text-sm font-semibold text-gray-900">People you may know</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {suggestions.map(s => (
                                <div key={s.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                                    <Avatar name={s.full_name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                                        <p className="text-xs text-gray-400">
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
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Search by name or major..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-nile-blue focus:ring-2 focus:ring-nile-blue/10 transition-all"
                        />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                    filter === tab.key ? 'bg-nile-blue text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {peopleLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-gray-300" />
                    </div>
                ) : people.length === 0 ? (
                    <div className="social-card py-14 text-center">
                        <Users size={28} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No people found{searchTerm ? ` for "${searchTerm}"` : ''}.</p>
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
    <div className="social-card p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
            <Avatar name={person.name} size="md" presence={presenceFor(person.lastActiveAt)} />
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{person.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {person.roleLabel}{person.major ? ` · ${person.major}` : ''}
                </p>
                {presenceLabel(person.lastActiveAt) && (
                    <p className="text-[11px] text-gray-300 mt-0.5">{presenceLabel(person.lastActiveAt)}</p>
                )}
            </div>
        </div>

        <div className="flex gap-2">
            {connection.status === 'connected' && (
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-nile-green/10 text-nile-green">
                    <UserCheck size={14} /> Connected
                </span>
            )}
            {connection.status === 'pending_outgoing' && (
                <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-400">
                    <Clock size={14} /> Pending
                </span>
            )}
            {connection.status === 'pending_incoming' && connection.connId && (
                <>
                    <button
                        onClick={() => onRespond(connection.connId!, 'decline', person.name)}
                        disabled={respondingId === connection.connId}
                        className="flex-1 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-60"
                    >
                        Decline
                    </button>
                    <button
                        onClick={() => onRespond(connection.connId!, 'accept', person.name)}
                        disabled={respondingId === connection.connId}
                        className="flex-1 py-2 rounded-xl text-xs font-medium bg-nile-blue text-white hover:bg-nile-blue-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                        {respondingId === connection.connId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
                    </button>
                </>
            )}
            {connection.status === 'none' && (
                <button
                    onClick={onConnect}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-nile-blue text-white hover:bg-nile-blue-600 transition-colors"
                >
                    <UserPlus size={14} /> Connect
                </button>
            )}
            <button
                onClick={onMessage}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
                <MessageCircle size={14} /> Message
            </button>
        </div>
    </div>
);

export default Network;
