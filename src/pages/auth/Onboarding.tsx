import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Users, Calendar } from 'lucide-react';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { markOnboardingSeen, dashboardPathForRole } from '../../utils/onboardingState';

const slides = [
    {
        Icon: Briefcase,
        leftLabel: 'CAREERS .',
        leftSub: 'FIND YOUR DREAM JOB',
        heading: 'WELCOME .',
        description: 'CONNECT WITH TOP EMPLOYERS ACTIVELY RECRUITING FROM OUR CAMPUS. BROWSE INTERNSHIPS, PART-TIME ROLES, AND GRADUATE POSITIONS.',
        cta: 'NEXT',
    },
    {
        Icon: Users,
        leftLabel: 'NETWORK .',
        leftSub: 'BUILD YOUR CIRCLE',
        heading: 'CONNECT .',
        description: 'ENGAGE WITH ALUMNI AND INDUSTRY PROFESSIONALS. JOIN GROUPS BASED ON YOUR MAJOR AND DISCOVER CAREER PATHS THROUGH SHARED EXPERIENCES.',
        cta: 'NEXT',
    },
    {
        Icon: Calendar,
        leftLabel: 'EVENTS .',
        leftSub: 'ATTEND KEY MOMENTS',
        heading: 'ENGAGE .',
        description: 'STAY UPDATED ON CAREER FAIRS, MOCK INTERVIEWS, AND TECH TALKS. NEVER MISS AN OPPORTUNITY TO PUT YOURSELF OUT THERE.',
        cta: 'GET STARTED',
    },
];

const Onboarding = () => {
    const [step, setStep] = useState(0);
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    const slide = slides[step];

    // Leaving the carousel — by finishing it or skipping it — records that it
    // has been seen, so it stops reappearing on later visits to the app root.
    // It goes straight to /login: routing via /join-as only bounced through a
    // redirect to the same place.
    const finish = () => {
        markOnboardingSeen();
        navigate('/login', { replace: true });
    };

    const handleNext = () => {
        if (step < slides.length - 1) setStep(step + 1);
        else finish();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-nile-white">
                <div className="w-8 h-8 rounded-full border-2 border-nile-blue border-t-transparent animate-spin" />
            </div>
        );
    }

    // An already-signed-in user has no business being shown the intro; before
    // this, landing here restarted the SSO flow and Campus One re-prompted for
    // consent.
    if (user) return <Navigate to={dashboardPathForRole(user.role)} replace />;

    return (
        <div className="min-h-screen flex items-center justify-center bg-nile-white p-6 font-sans overflow-hidden relative">
            {/* Background Decorative */}
            <div className="absolute top-0 right-0 w-[40%] h-full bg-nile-blue/5 -skew-x-12 translate-x-1/2" />

            {/* Main Card */}
            <div className="w-full max-w-4xl flex flex-col md:flex-row bg-white border-[2px] border-paper-400 shadow-[8px_8px_0px_0px_rgba(30,73,157,1)] rounded-[40px] overflow-hidden min-h-[500px] anime-fade-in relative z-10">

                {/* Brand Side Panel */}
                <div className="w-full md:w-[42%] bg-nile-blue text-white border-r-[2px] border-paper-400 flex flex-col items-center justify-center p-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Logo with orbital animation */}
                        <div
                            className="mb-10"
                            key={step}
                            style={{ animation: 'fadeIn 0.4s ease-out' }}
                        >
                            <NileConnectLogo size="md" showText showTagline animated textColor="white" />
                        </div>

                        <div className="space-y-1">
                            <p className="text-2xl font-semibold text-white uppercase leading-none tracking-[0.14em]">
                                {slide.leftLabel}
                            </p>
                            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.14em]">
                                {slide.leftSub}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Side Panel */}
                <div className="flex-1 flex flex-col justify-center p-10 md:p-14 bg-white bg-[radial-gradient(#000_0.5px,transparent_0.5px)] [background-size:24px_24px] [background-position:center] !bg-opacity-[0.02]">
                    <div className="max-w-sm mx-auto w-full space-y-10">

                        {/* Slide Text */}
                        <div className="space-y-3 text-left" key={`text-${step}`} style={{ animation: 'fadeIn 0.4s ease-out' }}>
                            <h1 className="co-display text-4xl text-ink-800 leading-none">
                                {slide.heading}
                            </h1>
                            <p className="text-[11px] font-semibold text-nile-blue uppercase tracking-[0.14em] leading-relaxed">
                                {slide.description}
                            </p>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={handleNext}
                            className="w-full bg-nile-blue text-white font-semibold py-4 px-6 rounded-xl border-[2px] border-paper-400 shadow-[4px_4px_0px_0px_rgba(108,187,86,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase tracking-[0.14em] text-xs flex items-center justify-center space-x-3"
                        >
                            <span>{slide.cta}</span>
                            <ArrowRight size={16} strokeWidth={3} />
                        </button>

                        {/* Progress Dots */}
                        <div className="flex items-center justify-start space-x-2 pt-2">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setStep(i)}
                                    className={`rounded-full transition-all duration-300 border-[2px] border-paper-400 ${
                                        i === step
                                            ? 'w-8 h-2.5 bg-nile-blue'
                                            : 'w-2.5 h-2.5 bg-transparent hover:bg-nile-blue/20'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Skip / Already have account */}
                        <div className="pt-4 border-t-[2px] border-paper-400/5 flex justify-between items-center">
                            <button
                                onClick={finish}
                                className="text-[11px] font-semibold text-nile-blue/40 hover:text-ink-800 transition-colors uppercase tracking-[0.14em] border-b-[1px] border-transparent hover:border-paper-400/20 pb-0.5"
                            >
                                ALREADY HAVE AN ACCOUNT?
                            </button>
                            <button
                                onClick={finish}
                                className="text-[11px] font-semibold text-paper-600 hover:text-nile-blue transition-colors uppercase tracking-[0.14em]"
                            >
                                SKIP →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
