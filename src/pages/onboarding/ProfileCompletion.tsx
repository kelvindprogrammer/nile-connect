import React from 'react';
import { UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import BrutalistIconBox from '../../components/BrutalistIconBox';
import { redirectToPortal } from '../../utils/navigation';

const ProfileCompletion = () => {
    const navigate = useNavigate();

    const leftPanelContent = (
        <div className="flex flex-col items-center">
            <BrutalistIconBox className="mb-12">
                    <UserCheck size={32} strokeWidth={1.75} />
                </BrutalistIconBox>
            <h2 className="co-display text-4xl text-ink-800">
                Final steps
            </h2>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="space-y-10 anime-fade-in">
                <div className="space-y-4">
                    <h1 className="co-display text-4xl md:text-5xl text-ink-800">
                        Almost done
                    </h1>
                    <p className="text-lg font-bold text-nile-blue">
                        Help us personalise your experience
                    </p>
                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); redirectToPortal('student'); }}>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-ink-800">Major</label>
                        <select 
                            className="w-full p-5 rounded-full border-3 border-paper-400 shadow-soft-xs focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none outline-none transition-all bg-white font-bold appearance-none"
                        >
                            <option value="">SELECT YOUR MAJOR</option>
                            <option value="CS">COMPUTER SCIENCE</option>
                            <option value="ENG">ENGINEERING</option>
                            <option value="BUS">BUSINESS ADMINISTRATION</option>
                            <option value="MED">MEDICINE</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-ink-800">Expected graduation year</label>
                        <input 
                            type="number" 
                            placeholder="2026"
                            min="2024"
                            max="2030"
                            className="w-full p-5 rounded-full border-3 border-paper-400 shadow-soft-xs focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none outline-none transition-all placeholder:text-nile-blue/50 font-bold"
                        />
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full bg-nile-green text-white font-semibold py-5 px-8 rounded-full border-3 border-paper-400 shadow-soft-sm hover:-translate-y-0.5 hover:shadow-soft-sm active:scale-95 transition-all text-xl"
                        >
                            FINISH
                        </button>
                    </div>
                </form>

                <p className="text-center text-sm font-semibold text-nile-blue/70">
                    NEED HELP ? <button className="text-ink-800 hover:underline underline-offset-4">CONTACT SUPPORT</button>
                </p>
            </div>
        </AuthLayout>
    );
};

export default ProfileCompletion;
