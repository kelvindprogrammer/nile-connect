import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { UserPlus, Search, MessageCircle, MapPin, ArrowRight } from 'lucide-react';
import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import ConnectionModal from '../../components/ConnectionModal';

const networkData = [
    { id: 1, name: 'Tunde Afolayan', role: 'Alumni (2022)', major: 'Mechanical Engineering', company: 'Shell Nigeria', location: 'Lagos', avatar: '' },
    { id: 2, name: 'Zainab Bello', role: 'Student (400L)', major: 'Law', company: '', location: 'Abuja', avatar: '' },
    { id: 3, name: 'Damian Opara', role: 'Staff', major: 'IT Department', company: 'Nile University', location: 'Abuja', avatar: '' },
    { id: 4, name: 'Sophia Chen', role: 'Employer', major: 'HR Manager', company: 'Microsoft', location: 'Remote', avatar: '' },
    { id: 5, name: 'Ahmad Garba', role: 'Alumni (2020)', major: 'Economics', company: 'Access Bank', location: 'Kano', avatar: '' },
    { id: 6, name: 'Chioma Okoro', role: 'Student (200L)', major: 'Architecture', company: '', location: 'Abuja', avatar: '' },
];

const Network = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [requestedIds, setRequestedIds] = useState<number[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<typeof networkData[0] | null>(null);
    const [isConnectModalOpen, setConnectModalOpen] = useState(false);

    const handleConnectTrigger = (person: typeof networkData[0]) => {
        setSelectedPerson(person);
        setConnectModalOpen(true);
    };

    const filteredData = networkData.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             user.major.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'ALL' || user.role.toUpperCase().includes(filter);
        return matchesSearch && matchesFilter;
    });

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-8 md:space-y-10 anime-fade-in font-sans max-w-6xl mx-auto pb-20">
                
                {/* 1. Header Section: Responsive */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-[2px] border-black pb-8 gap-6">
                    <div className="text-left space-y-1 md:space-y-2">
                        <h2 className="text-2xl md:text-4xl font-black text-black leading-none uppercase tracking-tighter">My Network .</h2>
                        <p className="text-[10px] md:text-sm font-bold text-nile-blue/50 uppercase tracking-widest flex items-center">
                            Professional ecosystem <ArrowRight size={14} className="ml-2 md:ml-3 text-nile-green" />
                        </p>
                    </div>
                    <div className="flex bg-nile-blue/5 border-2 border-dashed border-nile-blue/20 p-3 md:p-4 rounded-[20px] md:rounded-[24px] items-center space-x-4 md:space-x-6 w-full md:w-auto overflow-x-auto no-scrollbar">
                        <div className="text-left md:text-right flex-1 md:flex-none">
                            <p className="text-lg md:text-xl font-black text-nile-blue leading-none">1.2K</p>
                            <p className="text-[8px] md:text-[9px] font-black text-black/40 uppercase tracking-widest mt-1">CONNECTIONS</p>
                        </div>
                        <div className="w-[1px] h-6 md:h-8 bg-black/10" />
                        <div className="text-left md:text-right flex-1 md:flex-none">
                            <p className="text-lg md:text-xl font-black text-nile-green leading-none">42</p>
                            <p className="text-[8px] md:text-[9px] font-black text-black/40 uppercase tracking-widest mt-1">PENDING</p>
                        </div>
                    </div>
                </div>

                {/* 2. Professional Filter Toolbar: Sticky */}
                <div className="sticky top-14 z-10 py-4 bg-nile-white/80 backdrop-blur-md -mx-4 px-4 flex flex-col xl:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full group">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-black/30 group-focus-within:text-nile-blue transition-colors" />
                        <input 
                            type="text" 
                            placeholder="SEARCH BY NAME, MAJOR..." 
                            className="w-full pl-12 pr-6 py-3.5 rounded-2xl border-[2px] border-black font-black text-[9px] md:text-[10px] tracking-widest uppercase outline-none focus:bg-white focus:shadow-[3px_3px_0px_0px_rgba(30,73,157,1)] transition-all bg-nile-white/40 placeholder:text-black/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-white p-1 border-[2px] border-black rounded-2xl shadow-sm overflow-x-auto no-scrollbar w-full xl:w-auto scroll-smooth">
                        {['ALL', 'STUDENT', 'ALUMNI', 'STAFF', 'EMPLOYER'].map(item => (
                            <button
                                key={item}
                                onClick={() => setFilter(item)}
                                className={`px-4 md:px-5 py-2 rounded-xl font-black text-[8px] md:text-[9px] tracking-widest uppercase transition-all whitespace-nowrap
                                    ${filter === item ? 'bg-nile-blue text-white shadow-[2px_2px_0px_0px_rgba(108,187,86,1)]' : 'text-black/40 hover:text-black'}
                                `}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. High-Fidelity Network Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filteredData.map(person => (
                        <Card key={person.id} variant="flat" className="group relative border-[2px] border-black flex flex-col items-center text-center p-0 transition-all hover:translate-y-[-4px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                            <div className="w-full h-20 md:h-24 bg-nile-blue/5 border-b-[2px] border-black relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-24 h-48 bg-nile-green/5 rotate-45 translate-x-1/2 -translate-y-1/2" />
                            </div>
                            
                            <div className="relative -mt-10 mb-3 md:mb-4">
                                <div className="p-1 md:p-1.5 bg-white rounded-full border-[2px] border-black shadow-sm group-hover:scale-105 transition-transform duration-500">
                                    <Avatar name={person.name} size="md" />
                                </div>
                            </div>

                            <div className="px-5 md:px-6 pb-6 md:pb-8 w-full space-y-3 md:space-y-4">
                                <div className="space-y-1.5 text-center">
                                    <h3 className="text-base md:text-lg font-black text-black uppercase tracking-tight leading-none truncate">{person.name}</h3>
                                    <span className="inline-block text-[7px] md:text-[8px] font-black bg-nile-blue/10 text-nile-blue border border-nile-blue/10 px-2.5 py-0.5 rounded-full uppercase tracking-widest">{person.role}</span>
                                    <p className="text-[9px] md:text-[10px] font-bold text-nile-blue/60 leading-relaxed uppercase tracking-wide h-10 md:h-auto overflow-hidden">
                                        {person.major}
                                        {person.company && <span className="block mt-0.5 md:mt-1 text-black font-black truncate">@ {person.company}</span>}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center space-x-2 text-[8px] md:text-[9px] font-black text-black/30 uppercase tracking-widest">
                                    <MapPin size={10} strokeWidth={3} className="text-nile-green" />
                                    <span>{person.location}</span>
                                </div>

                                <div className="grid grid-cols-1 gap-2 pt-4 border-t-[2px] border-black/5">
                                    <Button 
                                        size="sm"
                                        variant={requestedIds.includes(person.id) ? "outline" : "primary"} 
                                        fullWidth 
                                        onClick={() => handleConnectTrigger(person)}
                                        disabled={requestedIds.includes(person.id)}
                                    >
                                        {requestedIds.includes(person.id) ? "PENDING" : "CONNECT"}
                                    </Button>
                                    <Button 
                                        size="xs" 
                                        variant="ghost" 
                                        fullWidth 
                                        onClick={() => navigate('/student/messages')}
                                    >
                                        <MessageCircle size={14} className="mr-2" /> MESSAGE
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {selectedPerson && (
                    <ConnectionModal 
                        isOpen={isConnectModalOpen} 
                        onClose={() => setConnectModalOpen(false)} 
                        name={selectedPerson.name} 
                        role={selectedPerson.role} 
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

export default Network;
