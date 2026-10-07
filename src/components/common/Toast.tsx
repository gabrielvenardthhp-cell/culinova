import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <motion.div
              key={toast.id}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-[20px] shadow-lg border backdrop-blur-xl text-xs font-medium ${
                isSuccess
                  ? 'bg-white/95 text-[#2B2118] border-[#4F8A3C]/40'
                  : isError
                  ? 'bg-white/95 text-[#2B2118] border-[#D9482B]/40'
                  : 'bg-white/95 text-[#2B2118] border-white/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isSuccess && (
                  <div className="w-6 h-6 rounded-full bg-[#4F8A3C]/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4F8A3C]" />
                  </div>
                )}
                {isError && (
                  <div className="w-6 h-6 rounded-full bg-[#D9482B]/15 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-[#D9482B]" />
                  </div>
                )}
                {!isSuccess && !isError && (
                  <div className="w-6 h-6 rounded-full bg-[#E0A526]/15 flex items-center justify-center shrink-0">
                    <Info className="w-3.5 h-3.5 text-[#825C05]" />
                  </div>
                )}
                <span className="leading-snug">{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-[#8C7A6B] hover:text-[#2B2118] p-1 ml-2 rounded-full hover:bg-white/80 transition-colors cursor-pointer"
                aria-label="Tutup Notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
