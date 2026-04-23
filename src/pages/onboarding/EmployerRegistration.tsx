import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Send, CheckCircle2, Globe, MapPin, Users, Mail, Target, ShieldCheck } from 'lucide-react';
import Button from '../../components/Button';
import InputField from '../../components/InputField';
import Stepper from '../../components/Stepper';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const EmployerRegistration = () => {
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const { showToast } = useToast();
    
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [form, setForm] = useState({
        companyName: user?.company || '',
        industry: '',
        location: '',
        website: '',
        employeeCount: '',
        about: '',
        email: user?.email || '',
        contactPerson: user?.name || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const nextStep = () => {
        if (currentStep < 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Persist the detailed data to the mock session
        login({
            name: form.contactPerson,
            email: form.email,
            role: 'employer',
            company: form.companyName
        });
        
        await new Promise(r => setTimeout(r, 1500));
        showToast('Application submitted for verification!', 'success');
        navigate('/awaiting-verification');
    };

    const steps = ['ORGANIZATION', 'CONTACT'];

    return (
        <div className="min-h-screen flex items-center justify-center bg-nile-white p-4 md:p-8 font-sans">
            <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[40px] overflow-hidden min-h-[500px] relative text-left anime-fade-in">

                {/* Left Panel */}
                <div className="w-full md:w-[40%] bg-nile-blue text-white border-r-[2px] border-black flex flex-col p-10 relative overflow-hidden">
                    <button
                        onClick={() => navigate('/register?role=employer')}
                        className="mb-8 w-10 h-10 bg-white text-black border-[2px] border-black rounded-xl flex items-center justify-center shadow-sm hover:translate-x-0.5 hover:translate-y-0.5 transition-all z-10"
                    >
                        <ArrowLeft size={16} strokeWidth={3} />
                    </button>

                    <div className="relative z-10 space-y-6 flex-1 flex flex-col justify-center">
                        <div className="w-16 h-16 bg-white border-[2px] border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#6CBB56] flex-shrink-0">
                            <Building2 size={32} strokeWidth={2.5} className="text-black" />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black uppercase leading-none tracking-tight">Partner Hub .</h2>
                            <p className="text-[10px] font-bold text-nile-white/50 uppercase tracking-widest leading-relaxed">
                                ACCESS PRE-VETTED TALENT FROM NILE UNIVERSITY.
                            </p>
                        </div>

                        <div className="space-y-3 pt-6">
                            <div className="flex items-center space-x-3 text-[8px] font-black uppercase tracking-widest">
                                <CheckCircle2 size={14} className="text-nile-green" />
                                <span>CAMPUS ACCESS</span>
                            </div>
                            <div className="flex items-center space-x-3 text-[8px] font-black uppercase tracking-widest">
                                <CheckCircle2 size={14} className="text-nile-green" />
                                <span>DIRECT TALENT PIPELINE</span>
                            </div>
                            <div className="flex items-center space-x-3 text-[8px] font-black uppercase tracking-widest">
                                <CheckCircle2 size={14} className="text-nile-green" />
                                <span>RECRUITER DASHBOARD</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="absolute top-10 -right-10 w-40 h-40 bg-white/5 rounded-full border-2 border-white/10 blur-sm"></div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 flex flex-col p-8 md:p-12">
                    <div className="mb-8">
                        <Stepper steps={steps} currentStep={currentStep} />
                    </div>

                    <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                            {currentStep === 0 ? (
                                <div className="space-y-5 anime-fade-in text-left">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">Organization Profile</h3>
                                        <p className="text-[8px] font-black text-nile-blue/30 uppercase tracking-widest">CORE IDENTITY DATA</p>
                                    </div>
                                    
                                    <InputField 
                                        label="COMPANY NAME" 
                                        name="companyName" 
                                        value={form.companyName} 
                                        onChange={handleChange} 
                                        placeholder="E.G. GOOGLE TECH"
                                        icon={<Building2 size={14}/>}
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField 
                                            label="INDUSTRY" 
                                            name="industry" 
                                            value={form.industry} 
                                            onChange={handleChange} 
                                            placeholder="TECHNOLOGY"
                                        />
                                        <InputField 
                                            label="LOCATION" 
                                            name="location" 
                                            value={form.location} 
                                            onChange={handleChange} 
                                            placeholder="CITY, COUNTRY"
                                            icon={<MapPin size={14}/>}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField 
                                            label="WEBSITE" 
                                            name="website" 
                                            value={form.website} 
                                            onChange={handleChange} 
                                            placeholder="HTTPS://..."
                                            icon={<Globe size={14}/>}
                                        />
                                        <InputField 
                                            label="EMPLOYEES" 
                                            name="employeeCount" 
                                            value={form.employeeCount} 
                                            onChange={handleChange} 
                                            placeholder="500+"
                                            icon={<Users size={14}/>}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5 anime-fade-in text-left">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">Vetting Details</h3>
                                        <p className="text-[8px] font-black text-nile-blue/30 uppercase tracking-widest">RECRUITMENT AUTHORIZATION</p>
                                    </div>

                                    <InputField 
                                        label="POINT OF CONTACT" 
                                        name="contactPerson" 
                                        value={form.contactPerson} 
                                        onChange={handleChange} 
                                        placeholder="FULL NAME"
                                        icon={<Target size={14}/>}
                                    />

                                    <InputField 
                                        label="BUSINESS EMAIL" 
                                        type="email"
                                        name="email" 
                                        value={form.email} 
                                        onChange={handleChange} 
                                        placeholder="CORP@COMPANY.COM"
                                        icon={<Mail size={14}/>}
                                    />

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-black tracking-widest uppercase ml-1">HIRING GOALS</label>
                                        <textarea 
                                            name="about"
                                            value={form.about}
                                            onChange={handleChange}
                                            className="w-full h-24 bg-nile-white/40 border-[2px] border-black rounded-xl p-4 font-bold text-[10px] uppercase outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#000000] transition-all"
                                            placeholder="DESCRIBE YOUR RECRUITING NEEDS..."
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                {currentStep > 0 && (
                                    <Button variant="outline" className="flex-1" onClick={prevStep} disabled={isSubmitting}>
                                        BACK
                                    </Button>
                                )}
                                <Button 
                                    className="flex-1" 
                                    onClick={nextStep} 
                                    isLoading={isSubmitting}
                                >
                                    {currentStep === 1 ? 'SUBMIT FOR VETTING' : 'CONTINUE'}
                                    {!isSubmitting && <Send size={14} className="ml-2" />}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployerRegistration;