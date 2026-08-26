import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Avatar from '../Avatar';

interface Stat {
    label: string;
    value: string | number;
    to?: string;
}

interface Shortcut {
    label: string;
    icon: React.ElementType;
    to: string;
}

interface ProfileSnapshotCardProps {
    name: string;
    headline: string;
    avatarSrc?: string | null;
    coverClassName?: string;
    stats: Stat[];
    shortcuts?: Shortcut[];
    profilePath: string;
    accentText?: string;
}

const ProfileSnapshotCard: React.FC<ProfileSnapshotCardProps> = ({
    name, headline, avatarSrc, coverClassName = 'bg-nile-blue', stats, shortcuts, profilePath, accentText = 'text-nile-blue',
}) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white border border-paper-300 rounded-xl shadow-card overflow-hidden">
            <button onClick={() => navigate(profilePath)} className="block w-full text-left group">
                <div className={`h-14 ${coverClassName}`} />
                <div className="px-4 pb-4 -mt-7">
                    <div className="w-14 h-14 rounded-xl border-2 border-white shadow-sm overflow-hidden">
                        <Avatar name={name} size="lg" src={avatarSrc || undefined} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink-800 group-hover:underline truncate">{name}</p>
                    <p className="text-xs text-paper-600 mt-0.5 truncate">{headline}</p>
                </div>
            </button>

            {stats.length > 0 && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-paper-200 pt-3">
                    {stats.map(s => (
                        <button
                            key={s.label}
                            onClick={() => s.to && navigate(s.to)}
                            className={`w-full flex items-center justify-between text-xs ${s.to ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
                        >
                            <span className="text-paper-600">{s.label}</span>
                            <span className={`font-semibold ${accentText}`}>{s.value}</span>
                        </button>
                    ))}
                </div>
            )}

            {shortcuts && shortcuts.length > 0 && (
                <div className="border-t border-paper-200 py-2">
                    {shortcuts.map(sc => {
                        const Icon = sc.icon;
                        return (
                            <button
                                key={sc.to}
                                onClick={() => navigate(sc.to)}
                                className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-paper-700 hover:bg-paper-100 transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <Icon size={14} className="text-paper-600" /> {sc.label}
                                </span>
                                <ChevronRight size={13} className="text-paper-500" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProfileSnapshotCard;
