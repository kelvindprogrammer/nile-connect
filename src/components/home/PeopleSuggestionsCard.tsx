import React, { useEffect, useState } from 'react';
import { UserPlus, Check } from 'lucide-react';
import Avatar from '../Avatar';
import { useToast } from '../../context/ToastContext';
import { getConnectionSuggestions, requestConnection, type ConnectionSuggestion } from '../../services/connectionService';
import SidebarCard from './SidebarCard';

const ROLE_LABELS: Record<string, string> = { student: 'Student', staff: 'Career Services', employer: 'Employer' };

const PeopleSuggestionsCard: React.FC<{ seeAllTo: string }> = ({ seeAllTo }) => {
    const { showToast } = useToast();
    const [people, setPeople] = useState<ConnectionSuggestion[] | null>(null);
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());

    useEffect(() => {
        getConnectionSuggestions()
            .then(list => setPeople(list.slice(0, 4)))
            .catch(() => setPeople([]));
    }, []);

    const handleConnect = async (userId: string) => {
        setSentTo(prev => new Set(prev).add(userId));
        try {
            await requestConnection(userId);
            showToast('Connection request sent', 'success');
        } catch {
            setSentTo(prev => { const next = new Set(prev); next.delete(userId); return next; });
            showToast('Could not send request', 'error');
        }
    };

    return (
        <SidebarCard title="People you may know" seeAllTo={seeAllTo} isLoading={people === null} empty={people?.length === 0} emptyLabel="No suggestions right now">
            {people?.map(p => {
                const sent = sentTo.has(p.user_id);
                return (
                    <div key={p.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <Avatar name={p.full_name} size="sm" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 truncate">{p.full_name}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                                {ROLE_LABELS[p.role] || p.role}{p.mutual_connections > 0 ? ` · ${p.mutual_connections} mutual` : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => handleConnect(p.user_id)}
                            disabled={sent}
                            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${sent ? 'text-nile-green' : 'text-gray-400 hover:text-nile-blue hover:bg-nile-blue/10'}`}
                            title={sent ? 'Request sent' : 'Connect'}
                        >
                            {sent ? <Check size={14} /> : <UserPlus size={14} />}
                        </button>
                    </div>
                );
            })}
        </SidebarCard>
    );
};

export default PeopleSuggestionsCard;
