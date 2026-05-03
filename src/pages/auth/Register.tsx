import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import InputField from '../../components/InputField';
import Button from '../../components/Button';
import { User, Mail, AtSign, Building, ShieldCheck, GraduationCap, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    registerStudent,
    registerEmployer,
    type StudentRegisterRequest,
    type EmployerRegisterRequest,
} from '../../services/authService';
import { redirectToPortal } from '../../utils/navigation';

const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { loginWithResponse } = useAuth();
    const { showToast } = useToast();

    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role') || 'student';
    const typeParam = params.get('type') || 'current';

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        company: '',
        department: '',
        industry: '',
        location_: '',
        about: '',
        contactEmail: '',
        website: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const roleConfig: Record<string, { title: string; subtitle: string; icon: React.ReactNode }> = {
        student: {
            title: 'NILE STUDENT',
            subtitle: `${typeParam.toUpperCase()} ACADEMIC TRACK`,
            icon: <GraduationCap size={48} strokeWidth={2.5} />,
        },
        employer: {
            title: 'CAREER PARTNER',
            subtitle: 'RECRUITMENT & TALENT HUB',
            icon: <Building size={48} strokeWidth={2.5} />,
        },
        staff: {
            title: 'NILE STAFF',
            subtitle: 'ADMINISTRATIVE SYSTEMS',
            icon: <ShieldCheck size={48} strokeWidth={2.5} />,
        },
    };

    const config = roleConfig[roleParam] || roleConfig.student;

    const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.password || formData.password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            if (roleParam === 'employer') {
                const req: EmployerRegisterRequest = {
                    full_name: formData.name,
                    username: formData.username || formData.name.toLowerCase().replace(/\s+/g, '_'),
                    email: formData.email,
                    password: formData.password,
                    company_name: formData.company,
                    industry: formData.industry || 'Technology',
                    location: formData.location_ || 'Nigeria',
                    about: formData.about || `${formData.company} is a leading company.`,
                    contact_email: formData.contactEmail || formData.email,
                    website: formData.website || undefined,
                };
                const resp = await registerEmployer(req);
                loginWithResponse(resp);
                showToast(`Welcome, ${formData.name}! Account created.`, 'success');
                navigate('/awaiting-verification');
            } else {
                const req: StudentRegisterRequest = {
                    full_name: formData.name,
                    username: formData.username || formData.name.toLowerCase().replace(/\s+/g, '_'),
                    email: formData.email,
                    password: formData.password,
                };
                const resp = await registerStudent(req);
                loginWithResponse(resp);
                showToast(`Account created! Welcome, ${formData.name}`, 'success');
                
                if (roleParam === 'staff') {
                    redirectToPortal('staff');
                } else {
                    navigate('/profile-completion');
                }
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.error ||
                'Registration failed. Please try again.';
            showToast(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const leftPanelContent = (
        <div className="flex flex-col items-center text-center">
            <div className="relative z-10 w-24 h-24 bg-white border-[2px] border-black rounded-2xl shadow-[4px_4px_0px_0px_#6CBB56] flex items-center justify-center mb-10 transition-transform hover:rotate-6">
                <div className="text-black">{config.icon}</div>
            </div>
            <div className="space-y-1">
                <h2 className="text-2xl font-black text-white leading-none uppercase tracking-[0.2em]">
                    {config.title}
                </h2>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em]">
                    {config.subtitle}
                </p>
            </div>
        </div>
    );

    return (
        <AuthLayout leftContent={leftPanelContent}>
            <div className="space-y-10 anime-fade-in text-left">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-black uppercase tracking-tight">
                        Join Hub
                    </h1>
                    <p className="text-[9px] font-black text-nile-blue uppercase tracking-[0.25em]">
                        CREATE YOUR {roleParam.toUpperCase()} IDENTITY
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <InputField
                        label="FULL NAME"
                        placeholder="E.G. JOHN DOE"
                        icon={<User size={16} />}
                        value={formData.name}
                        onChange={update('name')}
                        required
                    />

                    <InputField
                        label="EMAIL ADDRESS"
                        type="email"
                        placeholder="NAME@EXAMPLE.COM"
                        icon={<Mail size={16} />}
                        value={formData.email}
                        onChange={update('email')}
                        required
                    />

                    {roleParam === 'employer' ? (
                        <InputField
                            label="COMPANY / ORG NAME"
                            placeholder="E.G. GOOGLE TECH"
                            icon={<Building size={16} />}
                            value={formData.company}
                            onChange={update('company')}
                            required
                        />
                    ) : (
                        <InputField
                            label="NILE USERNAME"
                            placeholder="CHOOSE A USERNAME"
                            icon={<AtSign size={16} />}
                            value={formData.username}
                            onChange={update('username')}
                        />
                    )}

                    <InputField
                        label="PASSWORD"
                        type="password"
                        placeholder="MIN 8 CHARACTERS"
                        icon={<Lock size={16} />}
                        value={formData.password}
                        onChange={update('password')}
                        required
                    />

                    <div className="pt-4">
                        <Button fullWidth size="md" type="submit" isLoading={isLoading}>
                            CREATE {roleParam.toUpperCase()} ACCOUNT
                        </Button>
                    </div>
                </form>

                <div className="pt-6 border-t-[2px] border-black/5 text-center">
                    <p className="text-[9px] font-black text-black/30 uppercase tracking-[0.15em] mb-4">
                        ALREADY ON THE HUB?
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-[10px] font-black text-nile-blue hover:text-nile-green transition-colors uppercase tracking-[0.2em] border-b-[1px] border-nile-blue/20 hover:border-nile-green pb-0.5"
                    >
                        SIGN IN TO PROFILE
                    </button>
                </div>
            </div>
        </AuthLayout>
    );
};

export default Register;
