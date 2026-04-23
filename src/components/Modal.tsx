import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children,
    maxWidth = 'md' 
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const widthClasses = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl'
    };

    return (
        <div 
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 bg-nile-blue/20 backdrop-blur-sm flex items-center justify-center p-4 anime-fade-in"
        >
            <div className={`bg-white border-4 border-black w-full ${widthClasses[maxWidth]} rounded-[32px] shadow-brutalist flex flex-col max-h-[90vh] overflow-hidden`}>
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b-4 border-black bg-nile-white">
                    <h2 className="text-xl font-black text-black uppercase tracking-widest">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="bg-white border-2 border-black rounded-lg p-2 hover:bg-black hover:text-white transition-colors"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-8 overflow-y-auto font-sans">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
