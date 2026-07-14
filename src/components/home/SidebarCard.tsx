import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface SidebarCardProps {
    title: string;
    seeAllTo?: string;
    isLoading?: boolean;
    empty?: boolean;
    emptyLabel?: string;
    children: React.ReactNode;
}

const SidebarCard: React.FC<SidebarCardProps> = ({ title, seeAllTo, isLoading, empty, emptyLabel = 'Nothing here yet', children }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {seeAllTo && (
                    <button onClick={() => navigate(seeAllTo)} className="text-xs font-medium text-gray-400 hover:text-nile-blue transition-colors">
                        See all
                    </button>
                )}
            </div>
            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={18} className="animate-spin text-gray-300" />
                </div>
            ) : empty ? (
                <p className="px-4 py-6 text-xs text-gray-400 text-center">{emptyLabel}</p>
            ) : (
                <div className="py-1">{children}</div>
            )}
        </div>
    );
};

export default SidebarCard;
