import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, Briefcase, Users, Brain, Sparkles,
    ChevronDown, Star, MessageCircle, Calendar,
    GraduationCap, Shield, Zap, BarChart3,
} from 'lucide-react';
import NileConnectLogo from '../../components/NileConnectLogo';

// ── Animated counter ─────────────────────────────────────────────────────────
const AnimatedCounter = ({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && !started.current) {
                started.current = true;
                let start = 0;
                const step = end / (duration / 16);
                const timer = setInterval(() => {
                    start += step;
                    if (start >= end) { setCount(end); clearInterval(timer); }
                    else setCount(Math.floor(start));
                }, 16);
            }
        }, { threshold: 0.5 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ── Star particle background ──────────────────────────────────────────────────
const StarField = () => {
    const stars = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        delay: Math.random() * 3,
    }));
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {stars.map(s => (
                <div
                    key={s.id}
                    className="absolute rounded-full bg-white"
                    style={{
                        left: `${s.x}%`, top: `${s.y}%`,
                        width: s.size, height: s.size,
                        opacity: s.opacity,
                        animation: `pulse ${2 + s.delay}s ease-in-out infinite`,
                        animationDelay: `${s.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};

// ── Feature card ─────────────────────────────────────────────────────────────
const FeatureCard = ({
    icon, title, desc, accent, delay = 0,
}: { icon: React.ReactNode; title: string; desc: string; accent: string; delay?: number }) => (
    <div
        className="bg-white border-[2px] border-black rounded-[28px] p-7 flex flex-col gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_0px_rgba(30,73,157,1)] transition-all duration-300 text-left"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`w-12 h-12 ${accent} rounded-2xl border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-black text-black uppercase tracking-tight leading-none">{title}</h3>
            <p className="text-[11px] font-bold text-black/60 leading-relaxed mt-2 uppercase">{desc}</p>
        </div>
    </div>
);

// ── Testimonial card ──────────────────────────────────────────────────────────
const TestimonialCard = ({ quote, name, role }: { quote: string; name: string; role: string }) => (
    <div className="flex-shrink-0 w-72 md:w-80 bg-white/10 backdrop-blur border border-white/20 rounded-[24px] p-6 text-left">
        <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(i => <Star key={i} size={12} fill="#6CBB56" className="text-nile-green" />)}
        </div>
        <p className="text-sm font-bold text-white/80 leading-relaxed italic">"{quote}"</p>
        <div className="mt-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-nile-green/30 border border-white/20 flex items-center justify-center font-black text-white text-xs">
                {name[0]}
            </div>
            <div>
                <p className="text-[10px] font-black text-white uppercase">{name}</p>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{role}</p>
            </div>
        </div>
    </div>
);

// ── Main Onboarding ───────────────────────────────────────────────────────────
const Onboarding = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const testimonials = [
        { quote: 'Found my internship at Google through Nile Connect in just 2 weeks. The AI career coach is incredible.', name: 'Aisha Bello', role: 'CS Student · 400L' },
        { quote: 'As an alumnus, connecting back with current students and giving back has never been easier.', name: 'Tunde Adewale', role: 'Alumni · Shell Nigeria' },
        { quote: 'We hired 3 exceptional Nile University graduates through the platform last semester.', name: 'Jennifer Okafor', role: 'HR Director · Microsoft' },
        { quote: 'The mock interview AI helped me land my first job offer. Truly game-changing.', name: 'Emeka Nwosu', role: 'Engineering Student · 300L' },
    ];

    return (
        <div className="font-sans bg-nile-white overflow-x-hidden">

            {/* ── STICKY NAV ─────────────────────────────── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur border-b-[2px] border-black shadow-sm' : 'bg-transparent'}`}>
                <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
                    <NileConnectLogo size="xs" showText showTagline={false} animated={false} textColor={scrolled ? 'dark' : 'white'} />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border-[2px] transition-all ${scrolled ? 'border-black text-black hover:bg-black hover:text-white' : 'border-white/40 text-white hover:border-white'}`}
                        >
                            SIGN IN
                        </button>
                        <button
                            onClick={() => navigate('/join-as')}
                            className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border-[2px] border-nile-green bg-nile-green text-white hover:bg-nile-green/90 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                            JOIN FREE
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── HERO ───────────────────────────────────── */}
            <section
                className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #0a1628 0%, #1E499D 50%, #0d2a5c 100%)',
                }}
            >
                <StarField />

                {/* Ambient glow blobs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nile-green/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-nile-blue/30 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl mx-auto">
                    {/* Badge */}
                    <div className="nc-reveal" style={{ animationDelay: '0ms' }}>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse" />
                            Nile University's Official Career Platform
                        </span>
                    </div>

                    {/* Animated Logo */}
                    <div className="nc-float nc-reveal" style={{ animationDelay: '100ms' }}>
                        <NileConnectLogo size="xl" showText showTagline animated textColor="white" />
                    </div>

                    {/* Headline */}
                    <div className="nc-reveal space-y-3" style={{ animationDelay: '200ms' }}>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.05] uppercase tracking-tighter">
                            Your Professional<br />
                            <span className="text-nile-green">Universe</span> Starts Here
                        </h1>
                        <p className="text-base md:text-lg font-bold text-white/60 max-w-xl mx-auto leading-relaxed">
                            Connect with employers, alumni, and mentors. Land your dream career with AI-powered guidance — built exclusively for Nile University.
                        </p>
                    </div>

                    {/* CTAs */}
                    <div className="nc-reveal flex flex-col sm:flex-row gap-3 w-full sm:w-auto" style={{ animationDelay: '350ms' }}>
                        <button
                            onClick={() => navigate('/join-as')}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-nile-green text-white font-black text-sm uppercase tracking-widest rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
                        >
                            GET STARTED FREE
                            <ArrowRight size={18} strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur text-white font-black text-sm uppercase tracking-widest rounded-2xl border-[2px] border-white/30 hover:bg-white/20 transition-all"
                        >
                            SIGN IN
                        </button>
                    </div>

                    {/* Social proof */}
                    <div className="nc-reveal flex items-center gap-2" style={{ animationDelay: '450ms' }}>
                        <div className="flex -space-x-2">
                            {['A','B','C','D','E'].map(l => (
                                <div key={l} className="w-7 h-7 rounded-full bg-nile-green/30 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                                    {l}
                                </div>
                            ))}
                        </div>
                        <p className="text-[10px] font-bold text-white/60 text-left ml-1">
                            <span className="text-white font-black">2,400+</span> students already connected
                        </p>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                    <span className="text-[7px] font-black text-white uppercase tracking-widest">EXPLORE</span>
                    <ChevronDown size={20} className="text-white animate-bounce" />
                </div>
            </section>

            {/* ── STATS BAR ──────────────────────────────── */}
            <section className="bg-white border-y-[2px] border-black py-8 overflow-hidden">
                <div className="max-w-5xl mx-auto px-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { end: 2400, suffix: '+', label: 'ACTIVE STUDENTS', icon: <GraduationCap size={18} className="text-nile-blue" /> },
                            { end: 150,  suffix: '+', label: 'PARTNER EMPLOYERS', icon: <Briefcase size={18} className="text-nile-green" /> },
                            { end: 94,   suffix: '%', label: 'JOB MATCH RATE',   icon: <BarChart3 size={18} className="text-nile-blue" /> },
                            { end: 1800, suffix: '+', label: 'CAREERS LAUNCHED', icon: <Zap size={18} className="text-nile-green" /> },
                        ].map(stat => (
                            <div key={stat.label} className="text-center space-y-1">
                                <div className="flex justify-center mb-2">{stat.icon}</div>
                                <p className="text-3xl md:text-4xl font-black text-black leading-none">
                                    <AnimatedCounter end={stat.end} suffix={stat.suffix} />
                                </p>
                                <p className="text-[7px] md:text-[8px] font-black text-black/40 uppercase tracking-[0.2em]">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURES ───────────────────────────────── */}
            <section className="py-20 md:py-28 px-5 bg-nile-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14 space-y-3">
                        <span className="inline-block px-4 py-1 bg-nile-blue/10 text-nile-blue text-[8px] font-black uppercase tracking-[0.3em] rounded-full border border-nile-blue/20">
                            EVERYTHING YOU NEED
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black text-black uppercase leading-none tracking-tighter">
                            One Platform .<br />
                            <span className="text-nile-blue">Infinite Potential</span>
                        </h2>
                        <p className="text-sm font-bold text-black/50 uppercase tracking-widest max-w-lg mx-auto">
                            Built for Nile University students, alumni, staff and employers
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <FeatureCard
                            icon={<Briefcase size={22} className="text-white" />}
                            accent="bg-nile-blue"
                            title="Job Board"
                            desc="Browse hundreds of internships and full-time roles from employers actively recruiting from our campus."
                            delay={0}
                        />
                        <FeatureCard
                            icon={<Users size={22} className="text-white" />}
                            accent="bg-nile-green"
                            title="Network"
                            desc="Connect with alumni, industry professionals, and peers. Build a powerful professional circle."
                            delay={80}
                        />
                        <FeatureCard
                            icon={<Brain size={22} className="text-white" />}
                            accent="bg-black"
                            title="AI Career Advisor"
                            desc="Upload your CV and get AI-powered analysis, skill-gap mapping, and actionable career pathways."
                            delay={160}
                        />
                        <FeatureCard
                            icon={<MessageCircle size={22} className="text-white" />}
                            accent="bg-nile-blue"
                            title="Real-time Messaging"
                            desc="Direct messages, video calls, and voice calls with other students, alumni and employers."
                            delay={240}
                        />
                        <FeatureCard
                            icon={<Calendar size={22} className="text-white" />}
                            accent="bg-nile-green"
                            title="Events & Career Fairs"
                            desc="Never miss a career fair, workshop, or networking event. Register with one click."
                            delay={320}
                        />
                        <FeatureCard
                            icon={<Sparkles size={22} className="text-white" />}
                            accent="bg-black"
                            title="Mock Interviews"
                            desc="Practice with our AI interviewer across behavioral, technical, HR, and case study formats."
                            delay={400}
                        />
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ───────────────────────────── */}
            <section className="py-20 px-5" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1E499D 100%)' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <span className="inline-block px-4 py-1 bg-white/10 text-white text-[8px] font-black uppercase tracking-[0.3em] rounded-full border border-white/20 mb-3">
                            GET STARTED IN MINUTES
                        </span>
                        <h2 className="text-4xl md:text-6xl font-black text-white uppercase leading-none tracking-tighter">
                            How It Works<span className="text-nile-green">.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: '01', title: 'Create Your Profile', desc: 'Register with your Nile University email and build your professional profile in minutes.', icon: <Shield size={28} className="text-nile-green" /> },
                            { step: '02', title: 'Connect & Explore', desc: 'Browse jobs, connect with peers and alumni, and attend events that match your interests.', icon: <Users size={28} className="text-nile-green" /> },
                            { step: '03', title: 'Launch Your Career', desc: 'Apply with one click, get AI-powered interview prep, and land your dream opportunity.', icon: <Zap size={28} className="text-nile-green" /> },
                        ].map(item => (
                            <div key={item.step} className="relative bg-white/5 backdrop-blur border border-white/10 rounded-[28px] p-8 text-left hover:bg-white/10 transition-all">
                                <div className="text-[60px] font-black text-white/5 absolute top-4 right-6 leading-none select-none">{item.step}</div>
                                <div className="mb-5">{item.icon}</div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">{item.title}</h3>
                                <p className="text-[11px] font-bold text-white/50 uppercase leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ───────────────────────────── */}
            <section className="py-20 px-5 bg-nile-white overflow-hidden">
                <div className="max-w-5xl mx-auto mb-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter">
                        What They Say<span className="text-nile-green">.</span>
                    </h2>
                </div>
                <div className="relative">
                    <div className="overflow-hidden">
                        <div className="flex gap-5 nc-marquee" style={{ width: 'max-content' }}>
                            {[...testimonials, ...testimonials].map((t, i) => (
                                <div key={i} className="flex-shrink-0 w-72 md:w-80 bg-nile-blue rounded-[24px] p-6 text-left border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex gap-1 mb-3">
                                        {[1,2,3,4,5].map(j => <Star key={j} size={12} fill="#6CBB56" className="text-nile-green" />)}
                                    </div>
                                    <p className="text-sm font-bold text-white/80 leading-relaxed italic">"{t.quote}"</p>
                                    <div className="mt-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-nile-green/30 border border-white/20 flex items-center justify-center font-black text-white text-xs">{t.name[0]}</div>
                                        <div>
                                            <p className="text-[10px] font-black text-white uppercase">{t.name}</p>
                                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ──────────────────────────────── */}
            <section className="py-20 px-5 bg-white border-t-[2px] border-black">
                <div className="max-w-3xl mx-auto text-center space-y-8">
                    <NileConnectLogo size="lg" showText showTagline animated textColor="dark" className="mx-auto" />
                    <div className="space-y-3">
                        <h2 className="text-4xl md:text-6xl font-black text-black uppercase tracking-tighter leading-none">
                            Ready to <span className="text-nile-blue">Grow?</span>
                        </h2>
                        <p className="text-sm font-bold text-black/50 uppercase tracking-widest max-w-md mx-auto">
                            Join thousands of Nile University students already building their futures.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate('/join-as')}
                            className="flex items-center justify-center gap-2 px-10 py-4 bg-nile-blue text-white font-black text-sm uppercase tracking-widest rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(108,187,86,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
                        >
                            CREATE ACCOUNT
                            <ArrowRight size={18} strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="flex items-center justify-center gap-2 px-10 py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                        >
                            ALREADY HAVE ACCOUNT
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ─────────────────────────────────── */}
            <footer className="bg-black text-white py-8 px-5">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <NileConnectLogo size="xs" showText showTagline={false} animated={false} textColor="white" />
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em] text-center">
                        © 2025 NILE CONNECT · NILE UNIVERSITY · ABUJA, NIGERIA
                    </p>
                    <div className="flex gap-4">
                        {['PRIVACY', 'TERMS', 'SUPPORT'].map(l => (
                            <span key={l} className="text-[8px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors cursor-pointer">{l}</span>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Onboarding;
