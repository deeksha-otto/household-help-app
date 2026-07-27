import { useEffect, useState } from 'react'

export default function Splash({ onDone }) {
  const [phase, setPhase] = useState('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1600)
    const t2 = setTimeout(onDone, 1950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300 ${
        phase === 'out' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#58CC02' }}
    >
      <style>{`
        @keyframes splashPop {
          0%   { transform: scale(0.65); opacity: 0; }
          70%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .splash-icon { animation: splashPop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* Logo mark */}
      <div className="splash-icon mb-6">
        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl">
          <svg viewBox="0 0 48 48" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
            {/* House body */}
            <rect x="9" y="23" width="30" height="21" rx="3" fill="#3aac00" />
            {/* Roof */}
            <path d="M4 25 L24 7 L44 25 Z" fill="#3aac00" />
            {/* Door */}
            <rect x="18" y="31" width="12" height="13" rx="2" fill="white" />
            {/* Check badge */}
            <circle cx="36" cy="14" r="9" fill="white" />
            <path
              d="M31 14 L35 18 L42 10"
              stroke="#58CC02"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Name */}
      <h1
        className="text-5xl font-black text-white tracking-tight"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
      >
        Sahayak
      </h1>

      {/* Tagline */}
      <p className="text-white/80 text-base font-semibold mt-2 tracking-wide">
        Attendance &amp; salary, sorted
      </p>
    </div>
  )
}
