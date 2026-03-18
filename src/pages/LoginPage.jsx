// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

// Logo 2C animada com neon
function AnimatedLogo() {
  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes pulseNode { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes flowLine { 0% { stroke-dashoffset: 12; } 100% { stroke-dashoffset: 0; } }
        @keyframes glowPulse { 0%,100% { opacity: 0.06; } 50% { opacity: 0.15; } }
        .sn-node { animation: pulseNode 2.5s ease-in-out infinite; }
        .sn-d0 { animation-delay: 0s; } .sn-d1 { animation-delay: 0.4s; }
        .sn-d2 { animation-delay: 0.8s; } .sn-d3 { animation-delay: 1.2s; } .sn-d4 { animation-delay: 1.6s; }
        .sn-flow { stroke-dasharray: 4 8; animation: flowLine 1.8s linear infinite; }
        .sn-fl1 { animation-delay: 0.2s; } .sn-fl2 { animation-delay: 0.6s; } .sn-fl3 { animation-delay: 1s; }
        .sn-glow { animation: glowPulse 3s ease-in-out infinite; }
      `}</style>
      <svg width="180" height="126" viewBox="0 0 200 140" fill="none">
        {/* Glow */}
        <ellipse cx="82" cy="55" rx="50" ry="35" fill="#7C3AED" className="sn-glow"/>
        <ellipse cx="148" cy="55" rx="38" ry="30" fill="#7C3AED" className="sn-glow"/>

        {/* Bubble esquerdo */}
        <path d="M70 20C90 20 112 20 120 28C130 38 130 58 120 68C112 76 90 76 70 76C58 76 46 76 38 68C28 58 28 38 38 28C46 20 58 20 70 20Z" fill="#7C3AED" fillOpacity="0.1" stroke="#7C3AED" strokeWidth="1"/>
        <path d="M58 76L52 90L68 76" fill="#7C3AED" fillOpacity="0.1" stroke="#7C3AED" strokeWidth="1" strokeLinejoin="round"/>

        {/* Bubble direito */}
        <path d="M140 32C155 32 170 32 176 37C183 44 183 58 176 65C170 70 155 70 140 70C131 70 122 70 116 65C109 58 109 44 116 37C122 32 131 32 140 32Z" fill="#7C3AED" fillOpacity="0.15" stroke="#7C3AED" strokeWidth="1"/>
        <path d="M150 70L155 82L143 70" fill="#7C3AED" fillOpacity="0.15" stroke="#7C3AED" strokeWidth="1" strokeLinejoin="round"/>

        {/* Conexões com flow */}
        <line x1="57" y1="40" x2="66" y2="37" stroke="#A78BFA" strokeWidth="0.8" className="sn-flow sn-fl1"/>
        <line x1="78" y1="37" x2="87" y2="40" stroke="#A78BFA" strokeWidth="0.8" className="sn-flow sn-fl2"/>
        <line x1="54" y1="45" x2="58" y2="55" stroke="#A78BFA" strokeWidth="0.7" className="sn-flow sn-fl3"/>
        <line x1="74" y1="42" x2="62" y2="55" stroke="#A78BFA" strokeWidth="0.7" className="sn-flow sn-fl1"/>
        <line x1="74" y1="42" x2="80" y2="53" stroke="#A78BFA" strokeWidth="0.7" className="sn-flow sn-fl2"/>
        <line x1="90" y1="45" x2="84" y2="53" stroke="#A78BFA" strokeWidth="0.7" className="sn-flow sn-fl3"/>
        <line x1="131" y1="47" x2="138" y2="45" stroke="#A78BFA" strokeWidth="0.7" className="sn-flow sn-fl2"/>
        <line x1="147" y1="45" x2="154" y2="47" stroke="#A78BFA" strokeWidth="0.7" className="sn-flow sn-fl3"/>
        <line x1="130" y1="50" x2="132" y2="58" stroke="#A78BFA" strokeWidth="0.6" className="sn-flow sn-fl1"/>
        <line x1="144" y1="48" x2="136" y2="58" stroke="#A78BFA" strokeWidth="0.6" className="sn-flow sn-fl2"/>
        <line x1="144" y1="48" x2="148" y2="57" stroke="#A78BFA" strokeWidth="0.6" className="sn-flow sn-fl3"/>
        <line x1="156" y1="50" x2="152" y2="57" stroke="#A78BFA" strokeWidth="0.6" className="sn-flow sn-fl1"/>

        {/* Sinapse central */}
        <line x1="96" y1="42" x2="124" y2="46" stroke="#A78BFA" strokeWidth="1" strokeDasharray="3 4" className="sn-flow"/>

        {/* Nós esquerdo com pulse */}
        <circle cx="52" cy="40" r="5" fill="#7C3AED" className="sn-node sn-d0"/>
        <circle cx="72" cy="35" r="6.5" fill="#7C3AED" className="sn-node sn-d1"/>
        <circle cx="92" cy="40" r="5" fill="#7C3AED" className="sn-node sn-d2"/>
        <circle cx="60" cy="58" r="4" fill="#7C3AED" opacity="0.6" className="sn-node sn-d3"/>
        <circle cx="82" cy="56" r="4" fill="#7C3AED" opacity="0.6" className="sn-node sn-d4"/>
        {/* Brilho interno */}
        <circle cx="52" cy="40" r="2" fill="#C4B5FD"/>
        <circle cx="72" cy="35" r="2.5" fill="#C4B5FD"/>
        <circle cx="92" cy="40" r="2" fill="#C4B5FD"/>

        {/* Nós direito com pulse */}
        <circle cx="128" cy="47" r="4" fill="#7C3AED" className="sn-node sn-d2"/>
        <circle cx="142" cy="44" r="5" fill="#7C3AED" className="sn-node sn-d3"/>
        <circle cx="158" cy="47" r="4" fill="#7C3AED" className="sn-node sn-d4"/>
        <circle cx="134" cy="61" r="3" fill="#7C3AED" opacity="0.6" className="sn-node sn-d0"/>
        <circle cx="150" cy="60" r="3" fill="#7C3AED" opacity="0.6" className="sn-node sn-d1"/>
        <circle cx="128" cy="47" r="1.5" fill="#C4B5FD"/>
        <circle cx="142" cy="44" r="2" fill="#C4B5FD"/>
        <circle cx="158" cy="47" r="1.5" fill="#C4B5FD"/>

        {/* Ponto viajando na sinapse */}
        <circle r="2" fill="#C4B5FD" opacity="0.8">
          <animateMotion dur="2s" repeatCount="indefinite" path="M96,42 L124,46"/>
        </circle>
      </svg>
    </div>
  );
}

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
        {/* Logo animada */}
        <div className="flex flex-col items-center mb-6">
          <AnimatedLogo />
          <h1 className="text-[26px] font-bold text-white tracking-tight mt-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>synapse</h1>
          <p className="text-[11px] text-white/35 tracking-[5px] uppercase mt-1">chat</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/40 transition-all"/>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input type="password" placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/40 transition-all"/>
          </div>
          <button type="submit" disabled={loading || !email || !senha}
            className="w-full h-12 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[11px] text-white/15 mt-8">Plataforma de atendimento inteligente</p>
      </div>
    </div>
  );
}