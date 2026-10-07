import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-[#2B2118]/45 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Panel */}
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : isMobile
                ? { y: '100%', opacity: 1 }
                : { opacity: 0, scale: 0.96, y: 12 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : isMobile
                ? { y: 0, opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : isMobile
                ? { y: '100%', opacity: 1 }
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            transition={{
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose();
              }
            }}
            onClick={e => e.stopPropagation()}
            className={`relative z-10 w-full ${maxWidthClasses[maxWidth]} glass-solid rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-white/85 flex flex-col max-h-[92dvh] sm:max-h-[90dvh] overflow-hidden`}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-stone-300/80 rounded-full" />
            </div>

            {/* Fixed Header */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/60 flex items-center justify-between bg-white/40 shrink-0">
              <div className="pr-4">
                <h3 className="font-display text-base font-bold text-[#2B2118] tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-[#735A47] mt-0.5 line-clamp-2">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/70 hover:bg-white text-[#735A47] hover:text-[#2B2118] flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                aria-label="Tutup Dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body Content ONLY */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
