import React, { useState } from 'react';
import { Shield, Bell, Lock, Eye, Sphere, Globe, ChevronRight, Save } from 'lucide-react';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

const EmployerSettings = () => {
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState(true);

    const handleSave = () => {
        showToast('Settings updated successfully', 'success');
    };

    return (
        <div className="p-4 md:p-10 space-y-8 md:space-y-12 font-sans bg-nile-white min-h-full anime-fade-in text-left">
            <div className="border-b-3 border-black pb-8">
                <h2 className="text-4xl md:text-6xl font-black text-black leading-none uppercase tracking-tighter">Settings .</h2>
                <p className="text-sm md:text-xl font-bold text-nile-blue/70 uppercase tracking-widest mt-2">Manage your recruiter preferences and system security.</p>
            </div>

            <div className="max-w-3xl space-y-8">
                {/* Security Section */}
                <section className="space-y-4">
                    <h3 className="text-xs font-black text-black/40 uppercase tracking-[0.3em] flex items-center">
                        <Shield className="mr-2" size={14} /> SECURITY & ACCESS
                    </h3>
                    <div className="bg-white border-3 border-black rounded-3xl p-6 md:p-8 shadow-brutalist-sm space-y-6">
                        <div className="flex items-center justify-between group cursor-pointer">
                            <div className="space-y-1">
                                <p className="text-sm font-black text-black uppercase">Two-Factor Authentication</p>
                                <p className="text-[10px] font-bold text-nile-blue/40 uppercase">Add an extra layer of security to your account.</p>
                            </div>
                            <div className="w-12 h-6 bg-black rounded-full relative p-1 cursor-pointer">
                                <div className="w-4 h-4 bg-nile-green rounded-full absolute right-1"></div>
                            </div>
                        </div>
                        <div className="border-t-2 border-dashed border-black/5 pt-6 flex items-center justify-between group cursor-pointer hover:bg-nile-white transition-all rounded-xl p-2 -m-2">
                             <div className="space-y-1">
                                <p className="text-sm font-black text-black uppercase">Active Sessions</p>
                                <p className="text-[10px] font-bold text-nile-blue/40 uppercase">You are currently logged in on 2 devices.</p>
                            </div>
                            <ChevronRight size={20} className="text-black/20 group-hover:text-black transition-all" />
                        </div>
                    </div>
                </section>

                {/* Notifications Section */}
                <section className="space-y-4">
                    <h3 className="text-xs font-black text-black/40 uppercase tracking-[0.3em] flex items-center">
                        <Bell className="mr-2" size={14} /> NOTIFICATION PREFERENCES
                    </h3>
                    <div className="bg-white border-3 border-black rounded-3xl p-6 md:p-8 shadow-brutalist-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-black text-black uppercase">Email Alerts</p>
                                <p className="text-[10px] font-bold text-nile-blue/40 uppercase">Receive updates on new candidate applications.</p>
                            </div>
                            <div 
                                onClick={() => setNotifications(!notifications)}
                                className={`w-12 h-6 rounded-full relative p-1 transition-all cursor-pointer ${notifications ? 'bg-black' : 'bg-black/10'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all absolute ${notifications ? 'right-1' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="pt-8 flex justify-end">
                    <Button onClick={handleSave} size="lg" className="px-12 shadow-[6px_6px_0px_0px_rgba(108,187,86,1)]">
                       <Save size={18} className="mr-2" /> SAVE CHANGES
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmployerSettings;
