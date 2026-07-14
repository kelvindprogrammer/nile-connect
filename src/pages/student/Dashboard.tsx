import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, ChevronRight, Sparkles } from 'lucide-react';
import Feed from '../../components/Feed';
import { useAuth } from '../../context/AuthContext';
import { useProfile, calculateProfileStrength } from '../../hooks/useProfile';
import { useProfilePicture } from '../../hooks/useProfilePicture';
import { useToast } from '../../context/ToastContext';

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 5)  return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile } = useProfile(user?.id);
    const { picture, uploadPicture } = useProfilePicture();
    const { showToast } = useToast();

    const firstName = (user?.name || 'Student').split(' ')[0];
    const strength  = calculateProfileStrength(profile, !!user?.name, !!user?.email);
    const greeting  = getGreeting();

    const [uploadingPic, setUploadingPic] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handlePicSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setUploadingPic(true);
        try { await uploadPicture(f); showToast('Photo updated!', 'success'); }
        catch { showToast('Upload failed', 'error'); }
        finally { setUploadingPic(false); if (fileRef.current) fileRef.current.value = ''; }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:py-6 space-y-4 anime-fade-in font-sans pb-24 md:pb-6">

            {/* ── Identity header ─────────────────────────────────────── */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-card p-4 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl border border-gray-100 overflow-hidden bg-nile-blue">
                        {picture
                            ? <img src={picture} alt={firstName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center">
                                <span className="font-semibold text-white text-lg">{(user?.name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                              </div>}
                    </div>
                    <button onClick={() => fileRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-nile-green border-2 border-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        {uploadingPic ? <Loader2 size={9} className="text-white animate-spin" /> : <Camera size={9} className="text-white" />}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePicSelect} />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{greeting},</p>
                    <h1 className="text-lg font-semibold text-gray-900 leading-tight truncate">{firstName}</h1>
                    {strength < 100 && (
                        <button onClick={() => navigate('/student/profile/edit')} className="text-xs font-medium text-nile-blue hover:underline mt-0.5">
                            Profile {strength}% complete — finish it →
                        </button>
                    )}
                </div>

                <button onClick={() => navigate('/student/insights')}
                    className="hidden sm:flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-nile-blue transition-colors flex-shrink-0">
                    <Sparkles size={13} /> Insights <ChevronRight size={13} />
                </button>
            </div>

            {/* ── Feed ─────────────────────────────────────────────────── */}
            <Feed />
        </div>
    );
};

export default StudentDashboard;
