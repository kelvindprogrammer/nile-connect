import React from 'react';
import { Users } from 'lucide-react';

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface NileConnectLogoProps {
    size?: LogoSize;
    showText?: boolean;
    showTagline?: boolean;
    animated?: boolean;
    textColor?: 'dark' | 'white';
    className?: string;
}

const sizeMap: Record<LogoSize, {
    wrap: number; circle: number; icon: number;
    node1: number; node2: number;
    titleSize: string; taglineSize: string; gap: string;
}> = {
    xs:  { wrap: 52,  circle: 32,  icon: 14, node1: 7,  node2: 5,  titleSize: 'text-lg',  taglineSize: 'text-[7px]',  gap: 'gap-2' },
    sm:  { wrap: 72,  circle: 44,  icon: 20, node1: 10, node2: 7,  titleSize: 'text-xl',  taglineSize: 'text-[7px]',  gap: 'gap-2.5' },
    md:  { wrap: 100, circle: 62,  icon: 28, node1: 13, node2: 9,  titleSize: 'text-2xl', taglineSize: 'text-[8px]',  gap: 'gap-3' },
    lg:  { wrap: 140, circle: 86,  icon: 38, node1: 17, node2: 12, titleSize: 'text-4xl', taglineSize: 'text-[9px]',  gap: 'gap-4' },
    xl:  { wrap: 200, circle: 124, icon: 56, node1: 22, node2: 16, titleSize: 'text-5xl', taglineSize: 'text-[10px]', gap: 'gap-5' },
    '2xl':{ wrap: 280, circle: 172, icon: 76, node1: 28, node2: 20, titleSize: 'text-7xl', taglineSize: 'text-[12px]', gap: 'gap-6' },
};

const NileConnectLogo: React.FC<NileConnectLogoProps> = ({
    size = 'md',
    showText = true,
    showTagline = true,
    animated = true,
    textColor = 'dark',
    className = '',
}) => {
    const s = sizeMap[size];
    const textMain = textColor === 'white' ? 'text-white' : 'text-[#1E499D]';
    const textSub  = textColor === 'white' ? 'text-[#6CBB56]' : 'text-[#6CBB56]';

    return (
        <div className={`flex flex-col items-center ${s.gap} ${className}`}>
            {/* Logo mark */}
            <div
                className="relative flex items-center justify-center flex-shrink-0"
                style={{ width: s.wrap, height: s.wrap }}
            >
                {/* Outer glow (subtle) */}
                <div
                    className="absolute inset-0 rounded-full opacity-20 blur-xl"
                    style={{ background: '#1E499D', transform: 'scale(0.8)' }}
                />

                {/* Orbit ring (dashed green) */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        border: '2px dashed #6CBB56',
                        opacity: 0.85,
                    }}
                />

                {/* Orbit node 1 — green, clockwise */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{ animation: animated ? 'ncOrbitCW 7s linear infinite' : undefined }}
                >
                    <div
                        className="absolute rounded-full border-[1.5px] border-white shadow-md"
                        style={{
                            width: s.node1, height: s.node1,
                            background: '#6CBB56',
                            top: -(s.node1 / 2),
                            left: '50%',
                            marginLeft: -(s.node1 / 2),
                        }}
                    />
                </div>

                {/* Orbit node 2 — blue, counterclockwise, offset start */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        animation: animated ? 'ncOrbitCCW 11s linear infinite' : undefined,
                        transform: 'rotate(200deg)',
                    }}
                >
                    <div
                        className="absolute rounded-full border-[1.5px] border-white shadow-md"
                        style={{
                            width: s.node2, height: s.node2,
                            background: '#1E499D',
                            top: -(s.node2 / 2),
                            left: '50%',
                            marginLeft: -(s.node2 / 2),
                        }}
                    />
                </div>

                {/* Center circle */}
                <div
                    className="relative z-10 rounded-full bg-[#1E499D] flex items-center justify-center shadow-lg"
                    style={{ width: s.circle, height: s.circle }}
                >
                    <Users
                        size={s.icon}
                        className="text-white"
                        strokeWidth={1.8}
                    />
                </div>
            </div>

            {/* Wordmark */}
            {showText && (
                <div className="text-center select-none">
                    <p
                        className={`font-black leading-none ${s.titleSize} ${textMain}`}
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic' }}
                    >
                        Connect<span style={{ color: '#6CBB56' }}>.</span>
                    </p>
                    {showTagline && (
                        <p
                            className={`font-black uppercase tracking-[0.35em] mt-1 ${s.taglineSize} ${textSub}`}
                        >
                            EMPOWERING STUDENTS
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default NileConnectLogo;
