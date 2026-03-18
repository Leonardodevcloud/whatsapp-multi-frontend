// src/components/ui/SplashScreen.jsx
import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setFase(1), 400),
      setTimeout(() => setFase(2), 900),
      setTimeout(() => setFase(3), 1500),
      setTimeout(() => setFase(4), 2200),
      setTimeout(() => setFase(5), 3000),
      setTimeout(() => onFinish?.(), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  const t = (delay = 0) => ({ transition: `all 0.5s ease-out ${delay}s` });
  const show = (f, delay = 0) => ({ opacity: fase >= f ? 1 : 0, transform: fase >= f ? 'scale(1)' : 'scale(0.5)', ...t(delay) });
  const showLine = (f, delay = 0) => ({ opacity: fase >= f ? 0.45 : 0, ...t(delay) });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 100%)',
      opacity: fase >= 5 ? 0 : 1, transition: 'opacity 0.5s ease-out',
      pointerEvents: fase >= 5 ? 'none' : 'all',
    }}>
      <svg width="220" height="155" viewBox="0 0 200 140" fill="none">

        {/* Fase 2: Bubbles */}
        <path d="M70 20C90 20 112 20 120 28C130 38 130 58 120 68C112 76 90 76 70 76C58 76 46 76 38 68C28 58 28 38 38 28C46 20 58 20 70 20Z"
          fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.5s ease-out' }}/>
        <path d="M58 76L52 90L68 76" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.5s ease-out 0.1s' }}/>
        <path d="M140 32C155 32 170 32 176 37C183 44 183 58 176 65C170 70 155 70 140 70C131 70 122 70 116 65C109 58 109 44 116 37C122 32 131 32 140 32Z"
          fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="1.5"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.5s ease-out 0.15s' }}/>
        <path d="M150 70L155 82L143 70" fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.5s ease-out 0.2s' }}/>

        {/* Fase 0: Nós esquerdo */}
        {[[52,40,5,0],[72,35,6.5,0.1],[92,40,5,0.2],[60,58,4,0.3],[82,56,4,0.4]].map(([cx,cy,r,d],i) => (
          <g key={`ln${i}`}>
            <circle cx={cx} cy={cy} r={r} fill="#7C3AED" fillOpacity={i>2?0.6:1} style={show(0, d)}/>
            {i<3 && <circle cx={cx} cy={cy} r={r*0.38} fill="#C4B5FD" style={{...show(0, d+0.05)}}/>}
          </g>
        ))}

        {/* Fase 0: Nós direito */}
        {[[128,47,4,0.15],[142,44,5,0.25],[158,47,4,0.35],[134,61,3,0.4],[150,60,3,0.45]].map(([cx,cy,r,d],i) => (
          <g key={`rn${i}`}>
            <circle cx={cx} cy={cy} r={r} fill="#7C3AED" fillOpacity={i>2?0.6:1} style={show(0, d)}/>
            {i<3 && <circle cx={cx} cy={cy} r={r*0.38} fill="#C4B5FD" style={{...show(0, d+0.05)}}/>}
          </g>
        ))}

        {/* Fase 1: Conexões esquerdo */}
        {[[57,40,66,37],[78,37,87,40],[54,45,58,55],[74,40,62,55],[74,40,80,53],[90,45,84,53]].map(([x1,y1,x2,y2],i) => (
          <line key={`lc${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#A78BFA" strokeWidth="0.8" style={showLine(1, i*0.06)}/>
        ))}

        {/* Fase 1: Conexões direito */}
        {[[131,47,138,45],[147,45,154,47],[130,50,132,58],[144,48,136,58],[144,48,148,57],[156,50,152,57]].map(([x1,y1,x2,y2],i) => (
          <line key={`rc${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#A78BFA" strokeWidth="0.7" style={showLine(1, i*0.06+0.15)}/>
        ))}

        {/* Fase 1: Sinapse central */}
        <line x1="96" y1="42" x2="124" y2="46" stroke="#A78BFA" strokeWidth="1" strokeDasharray="3 3"
          style={{ opacity: fase >= 1 ? 0.4 : 0, transition: 'opacity 0.5s ease-out 0.3s' }}/>
        <circle cx="106" cy="43.5" r="1.8" fill="#7C3AED" fillOpacity="0.3"
          style={{ opacity: fase >= 1 ? 1 : 0, transition: 'opacity 0.4s ease-out 0.35s' }}/>

        {/* Fase 3: Neon pulse (brilho viajando pela sinapse) */}
        {fase >= 3 && (
          <circle r="2.5" fill="#C4B5FD" opacity="0.8">
            <animateMotion dur="1.8s" repeatCount="indefinite" path="M96,42 L124,46"/>
          </circle>
        )}

        {/* Fase 4: Texto */}
        <text x="100" y="118" textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif" fontSize="24" fontWeight="600" fill="#e2e0d8" letterSpacing="-0.5"
          style={{ opacity: fase >= 4 ? 1 : 0, transition: 'opacity 0.5s ease-out' }}>
          synapse
        </text>
        <text x="100" y="135" textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" letterSpacing="5" fill="#6b6a63"
          style={{ opacity: fase >= 4 ? 1 : 0, transition: 'opacity 0.5s ease-out 0.15s' }}>
          CHAT
        </text>
      </svg>
    </div>
  );
}