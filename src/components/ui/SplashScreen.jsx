// src/components/ui/SplashScreen.jsx
import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [fase, setFase] = useState(0); // 0=nós, 1=conexões, 2=bubbles, 3=texto, 4=fade

  useEffect(() => {
    const timers = [
      setTimeout(() => setFase(1), 300),
      setTimeout(() => setFase(2), 700),
      setTimeout(() => setFase(3), 1100),
      setTimeout(() => setFase(4), 1800),
      setTimeout(() => onFinish?.(), 2300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)',
        opacity: fase >= 4 ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: fase >= 4 ? 'none' : 'all',
      }}
    >
      <svg width="200" height="140" viewBox="0 0 200 140" fill="none">
        {/* Bubble esquerdo */}
        <path
          d="M70 20C90 20 112 20 120 28C130 38 130 58 120 68C112 76 90 76 70 76C58 76 46 76 38 68C28 58 28 38 38 28C46 20 58 20 70 20Z"
          fill="#7C3AED" fillOpacity="0.12"
          stroke="#7C3AED" strokeWidth="1.5"
          style={{
            opacity: fase >= 2 ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
          }}
        />
        <path
          d="M58 76L52 90L68 76"
          fill="#7C3AED" fillOpacity="0.12"
          stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease-out 0.1s' }}
        />

        {/* Bubble direito */}
        <path
          d="M140 32C155 32 170 32 176 37C183 44 183 58 176 65C170 70 155 70 140 70C131 70 122 70 116 65C109 58 109 44 116 37C122 32 131 32 140 32Z"
          fill="#7C3AED" fillOpacity="0.2"
          stroke="#7C3AED" strokeWidth="1.5"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease-out 0.15s' }}
        />
        <path
          d="M150 70L155 82L143 70"
          fill="#7C3AED" fillOpacity="0.2"
          stroke="#7C3AED" strokeWidth="1.5" strokeLinejoin="round"
          style={{ opacity: fase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease-out 0.2s' }}
        />

        {/* Nós esquerdo — aparecem primeiro */}
        {[
          { cx: 52, cy: 40, r: 5, d: 0 },
          { cx: 72, cy: 35, r: 6.5, d: 0.08 },
          { cx: 92, cy: 40, r: 5, d: 0.16 },
          { cx: 60, cy: 58, r: 4, op: 0.6, d: 0.24 },
          { cx: 82, cy: 56, r: 4, op: 0.6, d: 0.3 },
        ].map(({ cx, cy, r, op = 1, d }, i) => (
          <g key={`ln${i}`}>
            <circle cx={cx} cy={cy} r={r} fill="#7C3AED" fillOpacity={op}
              style={{ opacity: fase >= 0 ? 1 : 0, transition: `opacity 0.3s ease-out ${d}s`, transform: fase >= 0 ? 'scale(1)' : 'scale(0)', transformOrigin: `${cx}px ${cy}px`, transitionProperty: 'opacity, transform' }} />
            {op === 1 && <circle cx={cx} cy={cy} r={r * 0.4} fill="#fff"
              style={{ opacity: fase >= 0 ? 0.9 : 0, transition: `opacity 0.3s ease-out ${d + 0.1}s` }} />}
          </g>
        ))}

        {/* Nós direito */}
        {[
          { cx: 128, cy: 47, r: 4, d: 0.12 },
          { cx: 142, cy: 44, r: 5, d: 0.2 },
          { cx: 158, cy: 47, r: 4, d: 0.28 },
          { cx: 134, cy: 61, r: 3, op: 0.6, d: 0.34 },
          { cx: 150, cy: 60, r: 3, op: 0.6, d: 0.38 },
        ].map(({ cx, cy, r, op = 1, d }, i) => (
          <g key={`rn${i}`}>
            <circle cx={cx} cy={cy} r={r} fill="#7C3AED" fillOpacity={op}
              style={{ opacity: fase >= 0 ? 1 : 0, transition: `opacity 0.3s ease-out ${d}s`, transform: fase >= 0 ? 'scale(1)' : 'scale(0)', transformOrigin: `${cx}px ${cy}px`, transitionProperty: 'opacity, transform' }} />
            {op === 1 && <circle cx={cx} cy={cy} r={r * 0.4} fill="#fff"
              style={{ opacity: fase >= 0 ? 0.9 : 0, transition: `opacity 0.3s ease-out ${d + 0.1}s` }} />}
          </g>
        ))}

        {/* Conexões esquerdo — fase 1 */}
        {[
          { x1: 57, y1: 40, x2: 66, y2: 37 },
          { x1: 78, y1: 37, x2: 87, y2: 40 },
          { x1: 54, y1: 45, x2: 58, y2: 55 },
          { x1: 74, y1: 40, x2: 62, y2: 55 },
          { x1: 74, y1: 40, x2: 80, y2: 53 },
          { x1: 90, y1: 45, x2: 84, y2: 53 },
        ].map(({ x1, y1, x2, y2 }, i) => (
          <line key={`lc${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#7C3AED" strokeWidth="1" strokeOpacity="0.4"
            style={{ opacity: fase >= 1 ? 1 : 0, transition: `opacity 0.3s ease-out ${i * 0.05}s` }} />
        ))}

        {/* Conexões direito */}
        {[
          { x1: 131, y1: 47, x2: 138, y2: 45 },
          { x1: 147, y1: 45, x2: 154, y2: 47 },
          { x1: 130, y1: 50, x2: 132, y2: 58 },
          { x1: 144, y1: 48, x2: 136, y2: 58 },
          { x1: 144, y1: 48, x2: 148, y2: 57 },
          { x1: 156, y1: 50, x2: 152, y2: 57 },
        ].map(({ x1, y1, x2, y2 }, i) => (
          <line key={`rc${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#7C3AED" strokeWidth="0.8" strokeOpacity="0.4"
            style={{ opacity: fase >= 1 ? 1 : 0, transition: `opacity 0.3s ease-out ${i * 0.05 + 0.15}s` }} />
        ))}

        {/* Sinapse entre bubbles — fase 1 */}
        <line x1="96" y1="42" x2="124" y2="46"
          stroke="#7C3AED" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.4"
          style={{ opacity: fase >= 1 ? 1 : 0, transition: 'opacity 0.4s ease-out 0.3s' }} />
        <circle cx="106" cy="43.5" r="1.8" fill="#7C3AED" fillOpacity="0.3"
          style={{ opacity: fase >= 1 ? 1 : 0, transition: 'opacity 0.3s ease-out 0.35s' }} />
        <circle cx="114" cy="44.5" r="1.3" fill="#7C3AED" fillOpacity="0.25"
          style={{ opacity: fase >= 1 ? 1 : 0, transition: 'opacity 0.3s ease-out 0.4s' }} />

        {/* Texto — fase 3 */}
        <text x="100" y="115" textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif" fontSize="22" fontWeight="500" fill="#e2e0d8"
          style={{ opacity: fase >= 3 ? 1 : 0, transition: 'opacity 0.4s ease-out', transform: fase >= 3 ? 'translateY(0)' : 'translateY(5px)', transitionProperty: 'opacity, transform' }}>
          synapse
        </text>
        <text x="100" y="133" textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif" fontSize="10" letterSpacing="4" fill="#9c9a92"
          style={{ opacity: fase >= 3 ? 1 : 0, transition: 'opacity 0.4s ease-out 0.15s' }}>
          CHAT
        </text>
      </svg>
    </div>
  );
}
