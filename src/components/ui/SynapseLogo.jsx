// src/components/ui/SynapseLogo.jsx
export function SynapseIcon({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      {/* Bubble esquerdo */}
      <path d="M38 25C50 25 63 25 68 30C75 37 75 52 68 59C63 64 50 64 38 64C30 64 22 64 17 59C10 52 10 37 17 30C22 25 30 25 38 25Z" fill="#7C3AED" opacity="0.15" stroke="#7C3AED" strokeWidth="1.5"/>
      <path d="M32 64L28 74L38 64" fill="#7C3AED" opacity="0.15" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Nós esquerdo */}
      <circle cx="28" cy="40" r="4.5" fill="#7C3AED"/>
      <circle cx="42" cy="36" r="5.5" fill="#7C3AED"/>
      <circle cx="56" cy="40" r="4.5" fill="#7C3AED"/>
      <circle cx="33" cy="54" r="3.5" fill="#7C3AED" opacity="0.6"/>
      <circle cx="48" cy="52" r="3.5" fill="#7C3AED" opacity="0.6"/>
      {/* Olhos */}
      <circle cx="28" cy="40" r="1.8" fill="#fff"/>
      <circle cx="42" cy="36" r="2.2" fill="#fff"/>
      <circle cx="56" cy="40" r="1.8" fill="#fff"/>
      {/* Conexões esquerdo */}
      <line x1="32" y1="40" x2="38" y2="37" stroke="#7C3AED" strokeWidth="1" opacity="0.45"/>
      <line x1="46" y1="37" x2="52" y2="40" stroke="#7C3AED" strokeWidth="1" opacity="0.45"/>
      <line x1="30" y1="44" x2="31" y2="51" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      <line x1="44" y1="41" x2="35" y2="51" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      <line x1="44" y1="41" x2="46" y2="49" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      <line x1="54" y1="44" x2="50" y2="49" stroke="#7C3AED" strokeWidth="0.8" opacity="0.3"/>
      {/* Bubble direito */}
      <path d="M70 35C80 35 90 35 94 39C99 45 99 56 94 62C90 66 80 66 70 66C63 66 56 66 52 62C47 56 47 45 52 39C56 35 63 35 70 35Z" fill="#7C3AED" opacity="0.22" stroke="#7C3AED" strokeWidth="1.5"/>
      <path d="M78 66L82 74L74 66" fill="#7C3AED" opacity="0.22" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Nós direito */}
      <circle cx="62" cy="47" r="3.5" fill="#7C3AED"/>
      <circle cx="73" cy="44" r="4" fill="#7C3AED"/>
      <circle cx="84" cy="47" r="3.5" fill="#7C3AED"/>
      <circle cx="67" cy="58" r="2.5" fill="#7C3AED" opacity="0.6"/>
      <circle cx="79" cy="57" r="2.5" fill="#7C3AED" opacity="0.6"/>
      <circle cx="62" cy="47" r="1.4" fill="#fff"/>
      <circle cx="73" cy="44" r="1.7" fill="#fff"/>
      <circle cx="84" cy="47" r="1.4" fill="#fff"/>
      <line x1="65" y1="47" x2="70" y2="45" stroke="#7C3AED" strokeWidth="0.8" opacity="0.45"/>
      <line x1="77" y1="45" x2="81" y2="47" stroke="#7C3AED" strokeWidth="0.8" opacity="0.45"/>
      <line x1="64" y1="50" x2="65" y2="55" stroke="#7C3AED" strokeWidth="0.6" opacity="0.3"/>
      <line x1="75" y1="48" x2="69" y2="55" stroke="#7C3AED" strokeWidth="0.6" opacity="0.3"/>
      <line x1="75" y1="48" x2="77" y2="54" stroke="#7C3AED" strokeWidth="0.6" opacity="0.3"/>
      <line x1="82" y1="50" x2="80" y2="54" stroke="#7C3AED" strokeWidth="0.6" opacity="0.3"/>
      {/* Sinapse entre bubbles */}
      <line x1="58" y1="44" x2="50" y2="42" stroke="#7C3AED" strokeWidth="1" strokeDasharray="2.5 2.5" opacity="0.35"/>
      <circle cx="54" cy="43" r="1.5" fill="#7C3AED" opacity="0.25"/>
    </svg>
  );
}

export function SynapseIconSolid({ size = 40, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <rect width="40" height="40" rx="10" fill="#7C3AED"/>
      {/* Bubble simplificado branco */}
      <circle cx="13" cy="16" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="20" cy="14" r="3.5" fill="#fff" opacity="0.9"/>
      <circle cx="27" cy="16" r="3" fill="#fff" opacity="0.9"/>
      <circle cx="16" cy="24" r="2.5" fill="#fff" opacity="0.55"/>
      <circle cx="24" cy="23" r="2.5" fill="#fff" opacity="0.55"/>
      <circle cx="13" cy="16" r="1.2" fill="#7C3AED"/>
      <circle cx="20" cy="14" r="1.4" fill="#7C3AED"/>
      <circle cx="27" cy="16" r="1.2" fill="#7C3AED"/>
      <line x1="16" y1="16" x2="17" y2="15" stroke="#fff" strokeWidth="0.7" opacity="0.5"/>
      <line x1="23" y1="15" x2="24" y2="16" stroke="#fff" strokeWidth="0.7" opacity="0.5"/>
      <line x1="14" y1="19" x2="15" y2="22" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
      <line x1="21" y1="17" x2="17" y2="22" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
      <line x1="21" y1="17" x2="23" y2="21" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
      <line x1="26" y1="19" x2="25" y2="21" stroke="#fff" strokeWidth="0.5" opacity="0.3"/>
    </svg>
  );
}

export function SynapseWordmark({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SynapseIconSolid size={36} />
      <div>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">Synapse Chat</span>
      </div>
    </div>
  );
}
