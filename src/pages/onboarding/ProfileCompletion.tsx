import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import BrutalistIconBox from '../../components/BrutalistIconBox';
import { redirectToPortal } from '../../utils/navigation';

const ProfileCompletion = () => {
    const navigate = useNavigate();

    const leftPanelContent = (
        <div className="flex flex-col items-center">
            <BrutalistIconBox className="mb-12">
                👤
            </BrutalistIconBox>
            <h2 className="text-4xl font-black text-black tracking-tight">
                FINAL STEPS
            </h2>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="space-y-10 anime-fade-in">
                <div className="space-y-4">
                    <h1 className="text-5xl font-black text-black">
                        ALMOST DONE .
                    </h1>
                    <p className="text-lg font-bold text-nile-blue">
                        HELP US PERSONALIZE YOUR EXPERIENCE .
                    </p>
                </div>

                <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); redirectToPortal('student'); }}>
                    <div className="space-y-3">
                        <label className="text-sm font-black text-black tracking-widest uppercase">Major</label>
                        <select 
                            className="w-full p-5 rounded-full border-3 border-black shadow-brutalist-sm focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none outline-none transition-all bg-white font-bold appearance-none"
                        >
                            <option value="">SELECT YOUR MAJOR</option>
                            <option value="CS">COMPUTER SCIENCE</option>
                            <option value="ENG">ENGINEERING</option>
                            <option value="BUS">BUSINESS ADMINISTRATION</option>
                            <option value="MED">MEDICINE</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-black text-black tracking-widest uppercase">Expected Graduation Year</label>
                        <input 
                            type="number" 
                            placeholder="2026"
                            min="2024"
                            max="2030"
                            className="w-full p-5 rounded-full border-3 border-black shadow-brutalist-sm focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-none outline-none transition-all placeholder:text-nile-blue/50 font-bold"
                        />
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            className="w-full bg-nile-green text-white font-black py-5 px-8 rounded-full border-3 border-black shadow-brutalist hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:scale-95 transition-all text-xl"
                        >
                            FINISH
                        </button>
                    </div>
                </form>

                <p className="text-center text-sm font-black text-nile-blue/70">
                    NEED HELP ? <button className="text-black hover:underline underline-offset-4">CONTACT SUPPORT</button>
                </p>
            </div>
        </AuthLayout>
    );
};

export default ProfileCompletion;
