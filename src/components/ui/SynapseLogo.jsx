// src/components/ui/SynapseLogo.jsx

// Ícone do sidebar — Dual Bubble mini (Proposta D)
export function SynapseIconSolid({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect width="40" height="40" rx="10" fill="#7C3AED"/>
      {/* Bubble esquerdo */}
      <path d="M16 11C20 11 25 11 27 13C29 15 29 20 27 22C25 24 20 24 16 24C13 24 10 24 8 22C6 20 6 15 8 13C10 11 13 11 16 11Z" fill="#fff" fillOpacity="0.2"/>
      <path d="M13 24L11 28L16 24" fill="#fff" fillOpacity="0.2"/>
      {/* Bubble direito */}
      <path d="M27 14C30 14 34 14 35 16C37 18 37 22 35 24C34 26 30 26 27 26C25 26 22 26 21 24C19 22 19 18 21 16C22 14 25 14 27 14Z" fill="#fff" fillOpacity="0.3"/>
      <path d="M30 26L32 29L28 26" fill="#fff" fillOpacity="0.3"/>
      {/* Nós esquerdo */}
      <circle cx="12" cy="15" r="2" fill="#fff" opacity="0.9"/>
      <circle cx="18" cy="14" r="2.5" fill="#fff" opacity="0.9"/>
      <circle cx="24" cy="15" r="2" fill="#fff" opacity="0.9"/>
      <line x1="14" y1="15" x2="16" y2="14.5" stroke="#fff" strokeWidth="0.6" opacity="0.5"/>
      <line x1="20" y1="14.5" x2="22" y2="15" stroke="#fff" strokeWidth="0.6" opacity="0.5"/>
      {/* Nós direito */}
      <circle cx="25" cy="19" r="1.5" fill="#fff" opacity="0.8"/>
      <circle cx="30" cy="18" r="2" fill="#fff" opacity="0.8"/>
      <circle cx="34" cy="19" r="1.5" fill="#fff" opacity="0.8"/>
      <line x1="27" y1="19" x2="28" y2="18.5" stroke="#fff" strokeWidth="0.5" opacity="0.4"/>
      <line x1="32" y1="18.5" x2="33" y2="19" stroke="#fff" strokeWidth="0.5" opacity="0.4"/>
      {/* Sinapse */}
      <line x1="25" y1="16" x2="24" y2="17" stroke="#fff" strokeWidth="0.5" strokeDasharray="1.5 1.5" opacity="0.35"/>
    </svg>
  );
}

// Logo grande 2C pra login — versão estática (sem animação)
export function SynapseIcon({ size = 80, className = '' }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 200 140" fill="none" className={className}>
      {/* Bubble esquerdo */}
      <path d="M70 20C90 20 112 20 120 28C130 38 130 58 120 68C112 76 90 76 70 76C58 76 46 76 38 68C28 58 28 38 38 28C46 20 58 20 70 20Z" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5"/>
      <path d="M58 76L52 90L68 76" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Nós esquerdo */}
      <circle cx="52" cy="40" r="5" fill="#7C3AED"/>
      <circle cx="72" cy="35" r="6.5" fill="#7C3AED"/>
      <circle cx="92" cy="40" r="5" fill="#7C3AED"/>
      <circle cx="60" cy="58" r="4" fill="#7C3AED" opacity="0.6"/>
      <circle cx="82" cy="56" r="4" fill="#7C3AED" opacity="0.6"/>
      <circle cx="52" cy="40" r="2" fill="#fff"/>
      <circle cx="72" cy="35" r="2.5" fill="#fff"/>
      <circle cx="92" cy="40" r="2" fill="#fff"/>
      <line x1="57" y1="40" x2="66" y2="37" stroke="#7C3AED" strokeWidth="1" opacity="0.45"/>
      <line x1="78" y1="37" x2="87" y2="40" stroke="#7C3AED" strokeWidth="1" opacity="0.45"/>
      <line x1="54" y1="45" x2="58" y2="55" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      <line x1="74" y1="40" x2="62" y2="55" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      <line x1="74" y1="40" x2="80" y2="53" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      <line x1="90" y1="45" x2="84" y2="53" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      {/* Bubble direito */}
      <path d="M140 32C155 32 170 32 176 37C183 44 183 58 176 65C170 70 155 70 140 70C131 70 122 70 116 65C109 58 109 44 116 37C122 32 131 32 140 32Z" fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="1.5"/>
      <path d="M150 70L155 82L143 70" fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Nós direito */}
      <circle cx="128" cy="47" r="4" fill="#7C3AED"/>
      <circle cx="142" cy="44" r="5" fill="#7C3AED"/>
      <circle cx="158" cy="47" r="4" fill="#7C3AED"/>
      <circle cx="134" cy="61" r="3" fill="#7C3AED" opacity="0.6"/>
      <circle cx="150" cy="60" r="3" fill="#7C3AED" opacity="0.6"/>
      <circle cx="128" cy="47" r="1.5" fill="#fff"/>
      <circle cx="142" cy="44" r="2" fill="#fff"/>
      <circle cx="158" cy="47" r="1.5" fill="#fff"/>
      <line x1="131" y1="47" x2="138" y2="45" stroke="#7C3AED" strokeWidth="0.8" opacity="0.45"/>
      <line x1="147" y1="45" x2="154" y2="47" stroke="#7C3AED" strokeWidth="0.8" opacity="0.45"/>
      <line x1="130" y1="50" x2="132" y2="58" stroke="#7C3AED" strokeWidth="0.7" opacity="0.3"/>
      <line x1="144" y1="48" x2="136" y2="58" stroke="#7C3AED" strokeWidth="0.7" opacity="0.3"/>
      <line x1="144" y1="48" x2="148" y2="57" stroke="#7C3AED" strokeWidth="0.7" opacity="0.3"/>
      <line x1="156" y1="50" x2="152" y2="57" stroke="#7C3AED" strokeWidth="0.7" opacity="0.3"/>
      {/* Sinapse */}
      <line x1="96" y1="42" x2="124" y2="46" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 3" opacity="0.35"/>
      <circle cx="106" cy="43.5" r="1.8" fill="#7C3AED" opacity="0.25"/>
      <circle cx="114" cy="44.5" r="1.3" fill="#7C3AED" opacity="0.2"/>
    </svg>
  );
}

export function SynapseWordmark({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SynapseIconSolid size={36} />
      <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">Synapse Chat</span>
    </div>
  );
}