import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Monitor,
    Copy, CheckCircle2, Loader2, Users, AlertCircle,
} from 'lucide-react';
import NileConnectLogo from '../../components/NileConnectLogo';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Peer, MediaConnection } from 'peerjs';

const CALL_RETRY_MS = 3000;

const LiveSession = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [phase, setPhase] = useState<'lobby' | 'connecting' | 'live' | 'ended'>('lobby');
    const [isMuted,     setIsMuted]     = useState(false);
    const [isVideoOff,  setIsVideoOff]  = useState(false);
    const [duration,    setDuration]    = useState(0);
    const [peerCount,   setPeerCount]   = useState(0);
    const [linkCopied,  setLinkCopied]  = useState(false);
    const [peerError,   setPeerError]   = useState('');

    const localVideoRef  = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef        = useRef<Peer | null>(null);
    const localStream    = useRef<MediaStream | null>(null);
    const currentCall    = useRef<MediaConnection | null>(null);
    const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
    const callIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const connectedRef    = useRef(false);
    const otherPeerIdRef  = useRef('');

    const role = user?.role === 'staff' ? 'staff' : 'student';
    const basePath = role === 'staff' ? '/staff' : '/student';
    const sessionUrl = `${window.location.origin}${basePath}/session/${roomId}`;

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    const copyLink = () => {
        navigator.clipboard.writeText(sessionUrl).then(() => {
            setLinkCopied(true);
            showToast('Session link copied!', 'success');
            setTimeout(() => setLinkCopied(false), 3000);
        });
    };

    const stopCallAttempts = () => {
        if (callIntervalRef.current) {
            clearInterval(callIntervalRef.current);
            callIntervalRef.current = null;
        }
    };

    const handleCall = (call: MediaConnection) => {
        call.on('stream', (remoteStream: MediaStream) => {
            if (connectedRef.current) return;
            connectedRef.current = true;
            currentCall.current = call;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            setPeerCount(1);
            stopCallAttempts();
            showToast('Other participant joined the session!', 'success');
        });

        call.on('close', () => {
            if (currentCall.current !== call) return;
            currentCall.current = null;
            connectedRef.current = false;
            setPeerCount(0);
            showToast('Other participant left the session', 'success');
            // Resume trying to reconnect in case they rejoin
            const peer = peerRef.current;
            const stream = localStream.current;
            if (peer && stream && !peer.destroyed) {
                startCallAttempts(peer, stream, otherPeerIdRef.current);
            }
        });

        call.on('error', () => {});
    };

    const startCallAttempts = (peer: Peer, stream: MediaStream, otherPeerId: string) => {
        otherPeerIdRef.current = otherPeerId;
        const attempt = () => {
            if (connectedRef.current || peer.destroyed) return;
            try {
                const call = peer.call(otherPeerId, stream);
                if (call) handleCall(call);
            } catch { /* other peer not online yet — keep retrying */ }
        };
        attempt();
        stopCallAttempts();
        callIntervalRef.current = setInterval(attempt, CALL_RETRY_MS);
    };

    const startSession = async () => {
        setPhase('connecting');
        setPeerError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            const { Peer } = await import('peerjs');
            const peerConfig = {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            };

            // Two deterministic "slots" per room — whichever participant connects
            // first claims slot "a", the second falls back to slot "b". Each side
            // then knows exactly which peer ID to dial for the other.
            const connectAsSlot = (slot: 'a' | 'b') => {
                const peer = new Peer(`nc-${roomId}-${slot}`, peerConfig);
                peerRef.current = peer;

                peer.on('open', () => {
                    setPhase('live');
                    startTimer();
                    const otherSlot = slot === 'a' ? 'b' : 'a';
                    startCallAttempts(peer, stream, `nc-${roomId}-${otherSlot}`);
                });

                peer.on('call', (call) => {
                    call.answer(stream);
                    handleCall(call);
                });

                peer.on('error', (err) => {
                    if (err.type === 'unavailable-id') {
                        if (slot === 'a') {
                            peer.destroy();
                            connectAsSlot('b');
                        } else {
                            setPeerError('This session already has two participants.');
                        }
                    } else if (err.type === 'peer-unavailable') {
                        // Other participant hasn't joined yet — the retry loop will keep trying
                    } else {
                        setPeerError('Connection issue. Please try refreshing.');
                    }
                });
            };

            connectAsSlot('a');

        } catch (err) {
            setPhase('lobby');
            if (err instanceof Error && err.name === 'NotAllowedError') {
                setPeerError('Camera/microphone access denied. Please allow permissions and try again.');
            } else {
                setPeerError('Could not start session. Please check your camera and microphone.');
            }
        }
    };

    const endCall = () => {
        stopCallAttempts();
        currentCall.current?.close();
        localStream.current?.getTracks().forEach(t => t.stop());
        localStream.current = null;
        peerRef.current?.destroy();
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase('ended');
    };

    const toggleMute = () => {
        if (!localStream.current) return;
        localStream.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
        setIsMuted(v => !v);
    };

    const toggleVideo = () => {
        if (!localStream.current) return;
        localStream.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
        setIsVideoOff(v => !v);
    };

    useEffect(() => {
        return () => {
            stopCallAttempts();
            localStream.current?.getTracks().forEach(t => t.stop());
            peerRef.current?.destroy();
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── ENDED ─────────────────────────────────────────────────────────────────
    if (phase === 'ended') return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 md:p-12 text-center max-w-md w-full shadow-green">
                <NileConnectLogo size="sm" showText showTagline={false} animated={false} className="mb-6 justify-center" />
                <CheckCircle2 size={48} className="text-nile-green mx-auto mb-4" strokeWidth={1.5} />
                <h2 className="text-2xl font-semibold tracking-tight mb-2">Session Complete</h2>
                <p className="text-[9px] font-semibold text-black/40 mb-2">Duration: {formatTime(duration)}</p>
                <p className="text-sm font-bold text-black/60 leading-relaxed mb-8">
                    Your live career advisory session has ended. Check your messages for any follow-up notes.
                </p>
                <div className="flex gap-3">
                    <button onClick={() => navigate(role === 'staff' ? '/staff/services' : '/student/career')}
                        className="flex-1 py-3 border border-gray-100 rounded-xl font-semibold text-[9px] hover:bg-black hover:text-white transition-all">
                        {role === 'staff' ? 'SERVICES' : 'CAREER CENTER'}
                    </button>
                    <button onClick={() => navigate(basePath)}
                        className="flex-1 py-3 bg-nile-blue text-white border border-gray-100 rounded-xl font-semibold text-[9px] shadow-green transition-all">
                        DASHBOARD
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">

            {/* Top bar */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <NileConnectLogo size="xs" showText={false} showTagline={false} animated={false} />
                    <div>
                        <p className="text-[9px] font-semibold text-white/50">LIVE CAREER SESSION</p>
                        {phase === 'live' && (
                            <p className="text-[8px] font-semibold text-nile-green flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-nile-green rounded-full animate-pulse" />
                                {formatTime(duration)} · {peerCount > 0 ? `${peerCount + 1} PEOPLE` : 'WAITING FOR OTHER PARTICIPANT'}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[7px] font-semibold text-white/40">
                        ROOM: {roomId?.slice(0, 8).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* Video area */}
                <div className="flex-1 relative bg-[#111] p-3 md:p-4 flex flex-col gap-3">

                    {/* Remote video (main) */}
                    <div className="flex-1 relative rounded-[20px] overflow-hidden bg-[#1a1a1a] border border-white/5 min-h-[200px]">
                        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        {peerCount === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                    <Users size={28} className="text-white/30" />
                                </div>
                                <p className="text-[9px] font-semibold text-white/30">
                                    {phase === 'live' ? 'WAITING FOR OTHER PARTICIPANT...' : 'START SESSION TO BEGIN'}
                                </p>
                                {phase === 'live' && (
                                    <p className="text-[8px] text-white/20 font-bold">Share the link below so the other participant can join</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Local video (PiP) */}
                    {phase === 'live' && (
                        <div className="absolute bottom-6 right-6 w-32 md:w-44 aspect-video rounded-[12px] overflow-hidden border border-white/20 shadow-[4px_4px_20px_rgba(0,0,0,0.5)] bg-[#1a1a1a]">
                            <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : ''}`} />
                            {isVideoOff && (
                                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                                    <VideoOff size={20} className="text-white/30" />
                                </div>
                            )}
                            <div className="absolute bottom-1.5 left-2 text-[7px] font-semibold text-white/60">YOU</div>
                        </div>
                    )}
                </div>

                {/* Side panel */}
                <div className="w-full lg:w-80 bg-[#111] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">

                    {/* Session info */}
                    <div className="p-5 border-b border-white/10 space-y-4">
                        <h3 className="text-[10px] font-semibold text-white/40">SESSION DETAILS</h3>
                        <div className="space-y-2 text-[9px] font-semibold text-white/60">
                            <div className="flex justify-between"><span>PARTICIPANT</span><span className="text-white">{user?.name?.split(' ')[0] || (role === 'staff' ? 'STAFF' : 'STUDENT')}</span></div>
                            <div className="flex justify-between"><span>TYPE</span><span className="text-nile-green">CAREER ADVISORY</span></div>
                            <div className="flex justify-between"><span>STATUS</span>
                                <span className={phase === 'live' ? 'text-nile-green' : 'text-yellow-400'}>
                                    {phase === 'lobby' ? 'NOT STARTED' : phase === 'connecting' ? 'CONNECTING...' : phase === 'live' ? 'LIVE' : 'ENDED'}
                                </span>
                            </div>
                        </div>

                        {/* Share link */}
                        <div className="space-y-1.5">
                            <p className="text-[8px] font-semibold text-white/30">SHARE LINK WITH THE OTHER PARTICIPANT</p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[8px] font-semibold text-white/40 truncate">
                                    {sessionUrl}
                                </div>
                                <button onClick={copyLink}
                                    className={`px-3 py-2 rounded-lg border font-semibold text-[8px] transition-all flex-shrink-0 ${linkCopied ? 'bg-nile-green border-nile-green text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                                    {linkCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                </button>
                            </div>
                        </div>

                        {peerError && (
                            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
                                <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[8px] font-bold text-red-300">{peerError}</p>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-5 mt-auto space-y-3">
                        {phase === 'lobby' && (
                            <button onClick={startSession}
                                className="w-full py-4 bg-nile-green border border-white/20 rounded-[16px] font-semibold text-[10px] text-white shadow-[0_4px_20px_rgba(108,187,86,0.4)] hover:bg-nile-green/90 transition-all flex items-center justify-center gap-2">
                                <Video size={16} /> START SESSION
                            </button>
                        )}

                        {phase === 'connecting' && (
                            <div className="w-full py-4 bg-white/5 border border-white/10 rounded-[16px] font-semibold text-[10px] text-white/40 flex items-center justify-center gap-2">
                                <Loader2 size={16} className="animate-spin" /> CONNECTING...
                            </div>
                        )}

                        {phase === 'live' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={toggleMute}
                                        className={`py-3 rounded-[12px] border font-semibold text-[8px] flex flex-col items-center gap-1 transition-all ${isMuted ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                                        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                                        {isMuted ? 'UNMUTE' : 'MUTE'}
                                    </button>
                                    <button onClick={toggleVideo}
                                        className={`py-3 rounded-[12px] border font-semibold text-[8px] flex flex-col items-center gap-1 transition-all ${isVideoOff ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                                        {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                                        {isVideoOff ? 'SHOW' : 'HIDE'}
                                    </button>
                                    <button
                                        className="py-3 rounded-[12px] border border-white/10 bg-white/5 font-semibold text-[8px] flex flex-col items-center gap-1 text-white/60 hover:border-white/30 transition-all">
                                        <Monitor size={18} />
                                        SHARE
                                    </button>
                                </div>
                                <button onClick={endCall}
                                    className="w-full py-3.5 bg-red-600 border-[2px] border-red-500 rounded-[14px] font-semibold text-[10px] text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(239,68,68,0.3)]">
                                    <PhoneOff size={16} /> END SESSION
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveSession;
