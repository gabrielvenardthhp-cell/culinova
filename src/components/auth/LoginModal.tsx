import React, { useState } from 'react';
import { ChefHat, Lock, User, AlertCircle, Key } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import loginDishImage from '../../assets/images/dish_ayam_geprek_1791109817096.jpg';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('culinova2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shouldReduceMotion = useReducedMotion();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await onLogin({ username, password });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login gagal. Periksa username dan password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setUsername('admin');
    setPassword('culinova2026');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Full-screen food photo background with warm cream veil */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${loginDishImage})`,
        }}
      >
        <div className="absolute inset-0 bg-[#2B2118]/45 backdrop-blur-[6px]" />
      </div>

      {/* Central warm liquid glass panel */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm glass-solid rounded-[28px] shadow-2xl border border-white/90 p-8 space-y-6"
      >
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#D9482B] text-white mx-auto flex items-center justify-center shadow-md">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#2B2118]">CULINOVA</h2>
            <p className="text-xs text-[#735A47] font-medium mt-0.5">Kitchen & Food Cost Management</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-[#FDEDE8] border border-[#F8C8BD] text-[#9E2A14] rounded-[14px] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#D9482B]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#2B2118] mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-pill pl-9.5 text-xs"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#2B2118] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-pill pl-9.5 text-xs"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-pill-primary w-full py-2.5 shadow-md mt-2"
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
          </button>
        </form>

        {/* Demo Quick Fill Helper */}
        <div className="pt-3 border-t border-stone-200/60 text-center">
          <button
            type="button"
            onClick={handleQuickDemoFill}
            className="inline-flex items-center gap-1.5 text-xs text-[#D9482B] hover:text-[#C23C21] font-semibold transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Gunakan Akun Demo (admin / culinova2026)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
