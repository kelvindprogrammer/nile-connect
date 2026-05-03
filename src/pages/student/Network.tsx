import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { UserPlus, Search, MessageCircle, MapPin, ArrowRight, UserCheck, UserMinus, Loader2 } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import ConnectionModal from '../../components/ConnectionModal';
import { searchUsers, type UserProfile } from '../../services/messageService';

// Fallback seed data shown until the API returns results
const networkData = [
    { id: 1, name: 'Tunde Afolayan', role: 'Alumni (2022)', major: 'Mechanical Engineering', company: 'Shell Nigeria', location: 'Lagos', bio: 'Petroleum engineer passionate about sustainable energy.' },
    { id: 2, name: 'Zainab Bello', role: 'Student (400L)', major: 'Law', company: '', location: 'Abuja', bio: 'Law student focused on human rights advocacy.' },
    { id: 3, name: 'Damian Opara', role: 'Staff', major: 'IT Department', company: 'Nile University', location: 'Abuja', bio: 'IT administrator and tech enthusiast.' },
    { id: 4, name: 'Sophia Chen', role: 'Employer', major: 'HR Manager', company: 'Microsoft', location: 'Remote', bio: 'Connecting top talent with Microsoft opportunities.' },
    { id: 5, name: 'Ahmad Garba', role: 'Alumni (2020)', major: 'Economics', company: 'Access Bank', location: 'Kano', bio: 'Financial analyst driving economic growth in Northern Nigeria.' },
    { id: 6, name: 'Chioma Okoro', role: 'Student (200L)', major: 'Architecture', company: '', location: 'Abuja', bio: 'Aspiring architect passionate about sustainable design.' },
    { id: 7, name: 'Emeka Okafor', role: 'Alumni (2021)', major: 'Computer Science', company: 'Andela', location: 'Lagos', bio: 'Full-stack developer building impactful products.' },
    { id: 8, name: 'Hauwa Musa', role: 'Student (300L)', major: 'Medicine', company: '', location: 'Abuja', bio: 'Medical student aiming to specialize in pediatrics.' },
    { id: 9, name: 'Bayo Adeleke', role: 'Employer', major: 'CEO', company: 'TechAbuja', location: 'Abuja', bio: 'Building Nigeria\'s next tech unicorn.' },
];

const FILTER_TABS = ['ALL', 'STUDENT', 'ALUMNI', 'STAFF', 'EMPLOYER'];

type Person = {
    id: string | number;
    name: string;
    role: string;
    major: string;
    company: string;
    location: string;
    bio: string;
};

function apiUserToPerson(u: UserProfile): Person {
    const role = u.role === 'student'
        ? (u.student_subtype === 'alumni' ? 'Alumni' : `Student`)
        : u.role === 'staff' ? 'Staff' : 'Employer';
    return {
        id: u.id,
        name: u.full_name,
        role,
        major: u.major || u.role,
        company: '',
        location: 'Nigeria',
        bio: '',
    };
}

const Network = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [filter, setFilter] = useState('ALL');
    const [connectedIds, setConnectedIds] = useState<Set<string | number>>(new Set());
    const [pendingIds, setPendingIds] = useState<Set<string | number>>(new Set());
    const [followingIds, setFollowingIds] = useState<Set<string | number>>(new Set());
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [isConnectModalOpen, setConnectModalOpen] = useState(false);
    const [apiPeople, setApiPeople] = useState<Person[]>([]);
    const [apiLoading, setApiLoading] = useState(true);

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchTerm(q);
    }, [searchParams]);

    // Fetch real users from API
    const fetchUsers = useCallback(async () => {
        setApiLoading(true);
        try {
            const role = filter === 'ALL' ? '' : filter.toLowerCase();
            const users = await searchUsers(searchTerm, role);
            setApiPeople(users.map(apiUserToPerson));
        } catch {
            setApiPeople([]); // Fall back to seed data
        } finally {
            setApiLoading(false);
        }
    }, [searchTerm, filter]);

    useEffect(() => {
        const debounce = setTimeout(fetchUsers, 300);
        return () => clearTimeout(debounce);
    }, [fetchUsers]);

    const handleConnect = (person: Person) => {
        if (connectedIds.has(person.id)) {
            showToast(`Disconnected from ${person.name}`, 'success');
            setConnectedIds(prev => { const n = new Set(prev); n.delete(person.id); return n; });
        } else if (pendingIds.has(person.id)) {
            showToast(`Connection request to ${person.name} cancelled`, 'success');
            setPendingIds(prev => { const n = new Set(prev); n.delete(person.id); return n; });
        } else {
            setSelectedPerson(person);
            setConnectModalOpen(true);
        }
    };

    const handleFollow = (person: Person) => {
        if (followingIds.has(person.id)) {
            setFollowingIds(prev => { const n = new Set(prev); n.delete(person.id); return n; });
            showToast(`Unfollowed ${person.name}`, 'success');
        } else {
            setFollowingIds(prev => new Set([...prev, person.id]));
            showToast(`Following ${person.name}`, 'success');
        }
    };

    // Use real API users if available, otherwise fall back to seed data
    const displayData: Person[] = apiPeople.length > 0
        ? apiPeople
        : networkData.filter(u => {
            const matchesSearch = !searchTerm ||
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.major.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filter === 'ALL' || u.role.toUpperCase().includes(filter);
            return matchesSearch && matchesFilter;
          });
    const filteredData = displayData;

    const connections = connectedIds.size + pendingIds.size;
    const following = followingIds.size;

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 anime-fade-in font-sans max-w-6xl mx-auto pb-24">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-[2px] border-black pb-6 gap-4">
                    <div className="text-left">
                        <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">My Network .</h2>
                        <p className="text-[10px] font-bold text-nile-blue/50 uppercase tracking-widest mt-1 flex items-center gap-2">
                            Professional ecosystem <ArrowRight size={12} className="text-nile-green" />
                        </p>
                    </div>
                    <div className="flex bg-nile-blue/5 border-[2px] border-dashed border-nile-blue/20 p-3 rounded-[20px] items-center gap-5 w-full md:w-auto">
                        <div className="text-left flex-1 md:flex-none">
                            <p className="text-lg font-black text-nile-blue leading-none">{connections}</p>
                            <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-0.5">CONNECTIONS</p>
                        </div>
                        <div className="w-px h-6 bg-black/10" />
                        <div className="text-left flex-1 md:flex-none">
                            <p className="text-lg font-black text-nile-green leading-none">{following}</p>
                            <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-0.5">FOLLOWING</p>
                        </div>
                        <div className="w-px h-6 bg-black/10" />
                        <div className="text-left flex-1 md:flex-none">
                            <p className="text-lg font-black text-black leading-none">
                                {apiLoading ? '—' : apiPeople.length > 0 ? apiPeople.length : networkData.length}
                            </p>
                            <p className="text-[8px] font-black text-black/40 uppercase tracking-widest mt-0.5">SUGGESTED</p>
                        </div>
                    </div>
                </div>

                {/* Search + Filter Bar */}
                <div className="sticky top-14 z-10 py-3 bg-nile-white/90 backdrop-blur-md -mx-4 px-4 flex flex-col xl:flex-row gap-3">
                    <div className="flex-1 relative group">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-nile-blue transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH BY NAME, MAJOR, COMPANY..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border-[2px] border-black font-black text-[9px] uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_rgba(30,73,157,1)] transition-all bg-white/60"
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setSearchParams(e.target.value ? { q: e.target.value } : {}); }}
                        />
                    </div>
                    <div className="flex bg-white p-1 border-[2px] border-black rounded-xl shadow-sm overflow-x-auto no-scrollbar w-full xl:w-auto">
                        {FILTER_TABS.map(item => (
                            <button
                                key={item}
                                onClick={() => setFilter(item)}
                                className={`px-3 md:px-4 py-2 rounded-lg font-black text-[8px] tracking-widest uppercase transition-all whitespace-nowrap
                                    ${filter === item ? 'bg-nile-blue text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' : 'text-black/40 hover:text-black'}`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {searchTerm && (
                    <p className="text-[9px] font-black text-black/40 uppercase tracking-widest -mt-2">
                        {filteredData.length} RESULT{filteredData.length !== 1 ? 'S' : ''} FOR "{searchTerm}"
                    </p>
                )}

                {/* Grid */}
                {apiLoading && apiPeople.length === 0 ? (
                    <div className="flex justify-center py-20 col-span-full">
                        <Loader2 size={28} className="animate-spin text-nile-blue/40" />
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-16 text-center border-[2px] border-dashed border-black/10 rounded-[24px] col-span-full">
                        <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">NO PEOPLE FOUND</p>
                        <button onClick={() => { setSearchTerm(''); setFilter('ALL'); setSearchParams({}); }} className="text-[9px] font-black text-nile-blue underline mt-2 hover:text-nile-green transition-colors">
                            CLEAR SEARCH
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredData.map(person => (
                            <PersonCard
                                key={person.id}
                                person={person}
                                isConnected={connectedIds.has(person.id)}
                                isPending={pendingIds.has(person.id)}
                                isFollowing={followingIds.has(person.id)}
                                onConnect={() => handleConnect(person)}
                                onFollow={() => handleFollow(person)}
                                onMessage={() => navigate('/messages')}
                            />
                        ))}
                    </div>
                )}

                {selectedPerson && (
                    <ConnectionModal
                        isOpen={isConnectModalOpen}
                        onClose={() => {
                            if (selectedPerson) {
                                setPendingIds(prev => new Set([...prev, selectedPerson.id]));
                            }
                            setConnectModalOpen(false);
                            setSelectedPerson(null);
                        }}
                        name={selectedPerson.name}
                        role={selectedPerson.role}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

const PersonCard = ({
    person, isConnected, isPending, isFollowing, onConnect, onFollow, onMessage,
}: {
    person: Person;
    isConnected: boolean; isPending: boolean; isFollowing: boolean;
    onConnect: () => void; onFollow: () => void; onMessage: () => void;
}) => (
    <div className="bg-white border-[2px] border-black rounded-[20px] flex flex-col text-center overflow-hidden transition-all hover:translate-y-[-3px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(108,187,86,1)]">
        <div className="h-16 bg-nile-blue/10 border-b-[2px] border-black relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-32 bg-nile-green/10 rotate-45 translate-x-1/2 -translate-y-1/4" />
        </div>

        <div className="relative -mt-8 flex justify-center">
            <div className="p-1 bg-white rounded-full border-[2px] border-black shadow-sm">
                <Avatar name={person.name} size="md" />
            </div>
        </div>

        <div className="px-4 pb-5 pt-2 flex flex-col flex-1 gap-2">
            <div>
                <h3 className="text-sm font-black text-black uppercase tracking-tight leading-none">{person.name}</h3>
                <span className="inline-block mt-1.5 text-[7px] font-black bg-nile-blue/10 text-nile-blue border border-nile-blue/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">{person.role}</span>
                <p className="text-[9px] font-bold text-nile-blue/60 mt-1.5 uppercase tracking-wide leading-snug">
                    {person.major}
                    {person.company && <span className="block text-black font-black truncate">@ {person.company}</span>}
                </p>
            </div>

            {person.bio && (
                <p className="text-[9px] font-bold text-black/50 leading-relaxed line-clamp-2 text-left">{person.bio}</p>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[8px] font-black text-black/30 uppercase">
                <MapPin size={9} strokeWidth={3} className="text-nile-green" />
                <span>{person.location}</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-3 border-t-[2px] border-black/5 mt-auto">
                <button
                    onClick={onConnect}
                    className={`w-full py-2 rounded-xl font-black text-[9px] uppercase border-[2px] border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center justify-center gap-1.5
                        ${isConnected ? 'bg-nile-green text-white'
                        : isPending ? 'bg-nile-white text-black/50'
                        : 'bg-nile-blue text-white'}`}
                >
                    {isConnected
                        ? <><UserCheck size={11} strokeWidth={3} /> CONNECTED</>
                        : isPending
                        ? <><UserMinus size={11} strokeWidth={3} /> PENDING</>
                        : <><UserPlus size={11} strokeWidth={3} /> CONNECT</>}
                </button>
                <div className="flex gap-1.5">
                    <button
                        onClick={onFollow}
                        className={`flex-1 py-1.5 rounded-lg border-[1.5px] border-black font-black text-[8px] uppercase transition-all
                            ${isFollowing ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5'}`}
                    >
                        {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
                    <button
                        onClick={onMessage}
                        className="flex-1 py-1.5 rounded-lg border-[1.5px] border-black font-black text-[8px] uppercase bg-white hover:bg-nile-white transition-all flex items-center justify-center gap-1"
                    >
                        <MessageCircle size={11} strokeWidth={3} /> MSG
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default Network;
