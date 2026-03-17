// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button, Input } from '../components/ui';
import { Zap } from 'lucide-react';
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
      toast.success('Login realizado!');
    } catch (err) {
      toast.error(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/25">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">Central Tutts</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Multi-atendimento WhatsApp</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
