// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../components/ui';
import { SynapseIcon } from '../components/ui/SynapseLogo';
import { Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !senha) return;

    setLoading(true);
    try {
      await login(email, senha);
      navigate('/tickets');
      toast.success('Bem-vindo ao Synapse Chat!');
    } catch (err) {
      toast.error(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <SynapseIcon size={80} className="mb-4" />
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">synapse</h1>
          <p className="text-xs text-white/40 tracking-[4px] uppercase mt-1">chat</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !senha}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-8">Plataforma de atendimento inteligente</p>
      </div>
    </div>
  );
}