import React from 'react';

interface Props {
  maxWidth?: number | string;
}

/**
 * OfflineHowItWorksIllustration
 * A compact, self-contained, 7.5-second looping cartoon-style educational illustration
 * explaining: Connected -> Network Lost -> Offline Mode -> Offline Map -> Signal Rescuers -> Summary.
 * 
 * Uses pure SVG + CSS keyframe animation (0 external dependencies, 0 external assets).
 * Fully respects prefers-reduced-motion.
 */
export const OfflineHowItWorksIllustration: React.FC<Props> = ({ maxWidth = 420 }) => {
  return (
    <div
      style={{
        maxWidth,
        width: '100%',
        margin: '0 auto 16px auto',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '14px',
        padding: '12px 14px 10px 14px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
      role="region"
      aria-label="Offline emergency mode demonstration: shows a civilian losing network connectivity and using offline safety tools."
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1rem' }}>🛡️</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#38bdf8' }}>
            How Offline Emergency Mode Works
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, background: 'rgba(51, 65, 85, 0.5)', padding: '2px 6px', borderRadius: '4px' }}>
          7s Loop
        </span>
      </div>

      <div style={{ width: '100%', overflow: 'hidden', borderRadius: '10px' }}>
        <svg
          viewBox="0 0 420 180"
          style={{ width: '100%', height: 'auto', display: 'block' }}
          role="img"
          aria-label="Offline emergency mode animation sequence"
        >
          <defs>
            {/* Scoped CSS animations */}
            <style>{`
              @keyframes scene1Anim {
                0% { opacity: 0; transform: translateY(4px); }
                2%, 13% { opacity: 1; transform: translateY(0); }
                15%, 100% { opacity: 0; transform: translateY(-4px); }
              }
              @keyframes scene2Anim {
                0%, 15% { opacity: 0; transform: translateY(4px); }
                17%, 29% { opacity: 1; transform: translateY(0); }
                31%, 100% { opacity: 0; transform: translateY(-4px); }
              }
              @keyframes scene3Anim {
                0%, 31% { opacity: 0; transform: translateY(4px); }
                33%, 45% { opacity: 1; transform: translateY(0); }
                47%, 100% { opacity: 0; transform: translateY(-4px); }
              }
              @keyframes scene4Anim {
                0%, 47% { opacity: 0; transform: translateY(4px); }
                49%, 62% { opacity: 1; transform: translateY(0); }
                64%, 100% { opacity: 0; transform: translateY(-4px); }
              }
              @keyframes scene5Anim {
                0%, 64% { opacity: 0; transform: translateY(4px); }
                66%, 79% { opacity: 1; transform: translateY(0); }
                81%, 100% { opacity: 0; transform: translateY(-4px); }
              }
              @keyframes scene6Anim {
                0%, 81% { opacity: 0; transform: translateY(4px); }
                83%, 97% { opacity: 1; transform: translateY(0); }
                99%, 100% { opacity: 0; transform: translateY(-4px); }
              }
              @keyframes phoneGlowAnim {
                0%, 15% { stroke: #38bdf8; fill: #0284c7; }
                17%, 31% { stroke: #ef4444; fill: #991b1b; }
                33%, 80% { stroke: #f59e0b; fill: #b45309; }
                83%, 100% { stroke: #ef4444; fill: #b91c1c; }
              }
              @keyframes pulseRings {
                0% { r: 10; opacity: 0.9; stroke-width: 2.5; }
                100% { r: 38; opacity: 0; stroke-width: 0.5; }
              }
              @keyframes wifiPulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
              }

              .s1 { animation: scene1Anim 7.5s infinite ease-in-out; }
              .s2 { animation: scene2Anim 7.5s infinite ease-in-out; }
              .s3 { animation: scene3Anim 7.5s infinite ease-in-out; }
              .s4 { animation: scene4Anim 7.5s infinite ease-in-out; }
              .s5 { animation: scene5Anim 7.5s infinite ease-in-out; }
              .s6 { animation: scene6Anim 7.5s infinite ease-in-out; }
              .phone-screen { animation: phoneGlowAnim 7.5s infinite ease-in-out; }
              .beacon-ring-1 { animation: pulseRings 1.8s infinite cubic-bezier(0.2, 0.8, 0.2, 1); }
              .beacon-ring-2 { animation: pulseRings 1.8s infinite 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
              .wifi-bar { animation: wifiPulse 1.2s infinite ease-in-out; }

              /* Reduced motion fallback: show static composite summary */
              @media (prefers-reduced-motion: reduce) {
                .s1, .s2, .s3, .s4, .s5 { display: none !important; }
                .s6 {
                  opacity: 1 !important;
                  transform: none !important;
                  animation: none !important;
                }
                .phone-screen {
                  stroke: #f59e0b !important;
                  fill: #b45309 !important;
                  animation: none !important;
                }
                .beacon-ring-1, .beacon-ring-2, .wifi-bar {
                  animation: none !important;
                }
              }
            `}</style>

            {/* Gradients */}
            <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="phoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="safeRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Canvas Background */}
          <rect width="420" height="180" rx="10" fill="#0b1329" />

          {/* ─────────────────────────────────────────────────────────────
              LEFT SIDE: CIVILIAN CHARACTER HOLDING PHONE
             ───────────────────────────────────────────────────────────── */}
          <g transform="translate(15, 10)">
            {/* Subtle glow behind character */}
            <circle cx="65" cy="85" r="50" fill="rgba(56, 189, 248, 0.04)" />

            {/* Civilian Head */}
            <circle cx="56" cy="46" r="18" fill="#64748b" />
            <circle cx="56" cy="46" r="15" fill="#94a3b8" />
            {/* Friendly generic hairstyle / cap silhouette */}
            <path d="M 40 44 Q 56 26 72 44 Q 72 35 56 32 Q 40 35 40 44 Z" fill="#334155" />

            {/* Torso / Jacket */}
            <path
              d="M 32 135 L 36 76 Q 56 70 76 76 L 80 135 Z"
              fill="url(#avatarGrad)"
              stroke="#334155"
              strokeWidth="1.5"
            />
            {/* Collar */}
            <path d="M 48 74 L 56 86 L 64 74" fill="none" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Arms holding the phone */}
            <path
              d="M 38 88 Q 50 102 78 100"
              fill="none"
              stroke="#475569"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 74 88 Q 80 96 90 98"
              fill="none"
              stroke="#475569"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Civilian Hands holding phone */}
            <circle cx="78" cy="102" r="5" fill="#94a3b8" />
            <circle cx="106" cy="104" r="5" fill="#94a3b8" />

            {/* ── Smartphone Body ── */}
            <g transform="translate(76, 70)">
              {/* Phone Outer Bezel */}
              <rect
                x="0"
                y="0"
                width="36"
                height="62"
                rx="6"
                fill="url(#phoneGrad)"
                stroke="#475569"
                strokeWidth="1.8"
              />
              {/* Phone Speaker Notch */}
              <rect x="13" y="3" width="10" height="2" rx="1" fill="#64748b" />

              {/* Dynamic Phone Screen */}
              <rect
                className="phone-screen"
                x="3"
                y="8"
                width="30"
                height="48"
                rx="3"
                fill="#0284c7"
                stroke="#38bdf8"
                strokeWidth="1"
              />

              {/* Mini UI on Phone Screen */}
              <rect x="6" y="12" width="24" height="4" rx="1" fill="rgba(255,255,255,0.7)" />
              <rect x="6" y="19" width="16" height="3" rx="1" fill="rgba(255,255,255,0.5)" />
              <circle cx="18" cy="34" r="7" fill="rgba(255,255,255,0.2)" />
              {/* Home indicator bar */}
              <rect x="12" y="52" width="12" height="1.5" rx="0.75" fill="#94a3b8" />
            </g>
          </g>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT SIDE: DYNAMIC EXPLANATORY SCENES (0s - 7.5s Loop)
             ───────────────────────────────────────────────────────────── */}
          <g transform="translate(142, 14)">
            {/* Card Frame */}
            <rect
              width="264"
              height="152"
              rx="12"
              fill="url(#cardGrad)"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* SCENE 1: CONNECTED (0s - 1.2s) */}
            <g className="s1">
              {/* Status Badge */}
              <rect x="16" y="14" width="112" height="22" rx="11" fill="rgba(34, 197, 94, 0.18)" stroke="#22c55e" strokeWidth="1" />
              <circle cx="28" cy="25" r="4" fill="#22c55e" className="wifi-bar" />
              <text x="38" y="29" fill="#86efac" fontSize="10.5" fontWeight="800">📶 Connected</text>

              {/* Graphic: Cellular Tower & Waves */}
              <g transform="translate(186, 20)">
                {/* Tower Mast */}
                <path d="M 24 16 L 36 60 M 48 16 L 36 60 M 20 40 L 52 40 M 16 56 L 56 56" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
                <circle cx="36" cy="14" r="3" fill="#4ade80" />
                {/* Radiating WiFi curves */}
                <path d="M 24 8 A 15 15 0 0 1 48 8" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                <path d="M 16 2 A 25 25 0 0 1 56 2" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
              </g>

              {/* Explanation Texts */}
              <text x="16" y="62" fill="#f8fafc" fontSize="13.5" fontWeight="800">
                Cellular Network Active
              </text>
              <text x="16" y="82" fill="#94a3b8" fontSize="11" fontWeight="500">
                Normal operations with active data
              </text>
              <text x="16" y="98" fill="#64748b" fontSize="10.5">
                • Live server telemetry synced
              </text>
              <text x="16" y="114" fill="#64748b" fontSize="10.5">
                • Satellite risk maps cached locally
              </text>
            </g>

            {/* SCENE 2: NETWORK LOST (1.2s - 2.5s) */}
            <g className="s2">
              {/* Status Badge */}
              <rect x="16" y="14" width="124" height="22" rx="11" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
              <circle cx="28" cy="25" r="4" fill="#ef4444" />
              <text x="38" y="29" fill="#fca5a5" fontSize="10.5" fontWeight="800">📵 Network Lost</text>

              {/* Graphic: Disconnected Tower with Red Slash */}
              <g transform="translate(186, 20)">
                <path d="M 24 16 L 36 60 M 48 16 L 36 60 M 20 40 L 52 40 M 16 56 L 56 56" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                <circle cx="36" cy="14" r="3" fill="#64748b" opacity="0.4" />
                {/* Red warning circle with slash */}
                <circle cx="36" cy="28" r="18" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" strokeWidth="2.5" />
                <line x1="24" y1="16" x2="48" y2="40" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* Explanation Texts */}
              <text x="16" y="62" fill="#fca5a5" fontSize="13.5" fontWeight="800">
                Disaster Cuts Connectivity
              </text>
              <text x="16" y="82" fill="#cbd5e1" fontSize="11" fontWeight="500">
                Cell towers fail · Fiber severed
              </text>
              <text x="16" y="98" fill="#f87171" fontSize="10.5">
                ⚠️ Zero cellular signal or Wi-Fi
              </text>
              <text x="16" y="114" fill="#94a3b8" fontSize="10.5">
                • Standard internet apps stop working
              </text>
            </g>

            {/* SCENE 3: OFFLINE MODE (2.5s - 3.8s) */}
            <g className="s3">
              {/* Status Badge */}
              <rect x="16" y="14" width="118" height="22" rx="11" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1" />
              <text x="26" y="29" fill="#fcd34d" fontSize="10.5" fontWeight="800">📴 Offline Mode</text>

              {/* Graphic: SATARK Golden Shield Emblem */}
              <g transform="translate(196, 22)">
                <path d="M 24 6 L 46 14 L 46 38 Q 46 56 24 64 Q 2 56 2 38 L 2 14 Z" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="2" />
                <path d="M 24 16 L 38 22 L 38 36 Q 38 48 24 54 Q 10 48 10 36 L 10 22 Z" fill="#f59e0b" opacity="0.3" />
                <text x="16" y="40" fontSize="16">⚡</text>
              </g>

              {/* Explanation Texts */}
              <text x="16" y="62" fill="#fde047" fontSize="13.5" fontWeight="800">
                SATARK Auto-Engages
              </text>
              <text x="16" y="82" fill="#cbd5e1" fontSize="11" fontWeight="500">
                Switches instantly to cached storage
              </text>
              <text x="16" y="98" fill="#94a3b8" fontSize="10.5">
                • Zero internet required
              </text>
              <text x="16" y="114" fill="#94a3b8" fontSize="10.5">
                • IndexedDB secure storage active
              </text>
            </g>

            {/* SCENE 4: OFFLINE MAP (3.8s - 5.2s) */}
            <g className="s4">
              {/* Status Badge */}
              <rect x="16" y="14" width="116" height="22" rx="11" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1" />
              <text x="26" y="29" fill="#7dd3fc" fontSize="10.5" fontWeight="800">🗺️ Offline Map</text>

              {/* Graphic: Mini GIS Vector Map Visual */}
              <g transform="translate(178, 16)">
                <rect width="70" height="54" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                {/* Hazard Polygon (Red) */}
                <polygon points="12,14 36,8 44,24 22,28" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" strokeWidth="1" />
                {/* Blocked Road (Dashed Red) */}
                <line x1="8" y1="42" x2="34" y2="24" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="3,2" />
                {/* Safe Evacuation Bypass Corridor (Cyan/Green) */}
                <path d="M 8 46 Q 34 50 48 38 T 62 14" fill="none" stroke="url(#safeRouteGrad)" strokeWidth="2.5" />
                {/* User Location Pin */}
                <circle cx="12" cy="44" r="3.5" fill="#38bdf8" stroke="#fff" strokeWidth="1" />
                {/* Relief Shelter */}
                <rect x="56" y="8" width="10" height="10" rx="2" fill="#22c55e" />
                <text x="58" y="16" fill="#fff" fontSize="8" fontWeight="900">+</text>
              </g>

              {/* Explanation Texts */}
              <text x="16" y="62" fill="#38bdf8" fontSize="13.5" fontWeight="800">
                Safety Tools Remain Available
              </text>
              <text x="16" y="82" fill="#cbd5e1" fontSize="11" fontWeight="500">
                Cached vector geometry &amp; routes
              </text>
              <text x="16" y="98" fill="#94a3b8" fontSize="10.5">
                • 📍 GPS location without cellular data
              </text>
              <text x="16" y="114" fill="#94a3b8" fontSize="10.5">
                • 🏔️ Hazard zone &amp; safe relief camps
              </text>
            </g>

            {/* SCENE 5: SIGNAL RESCUERS (5.2s - 6.5s) */}
            <g className="s5">
              {/* Status Badge */}
              <rect x="16" y="14" width="134" height="22" rx="11" fill="rgba(217, 119, 6, 0.25)" stroke="#f59e0b" strokeWidth="1" />
              <text x="26" y="29" fill="#fcd34d" fontSize="10.5" fontWeight="800">📡 Signal Rescuers</text>

              {/* Graphic: Radiating Distress Beacon Rings */}
              <g transform="translate(202, 38)">
                <circle cx="20" cy="20" r="10" fill="none" stroke="#f59e0b" className="beacon-ring-1" />
                <circle cx="20" cy="20" r="10" fill="none" stroke="#ea580c" className="beacon-ring-2" />
                <circle cx="20" cy="20" r="8" fill="#ef4444" />
                <text x="13" y="24" fill="#fff" fontSize="12">📢</text>
              </g>

              {/* Explanation Texts */}
              <text x="16" y="62" fill="#fdba74" fontSize="13.5" fontWeight="800">
                Acoustic &amp; Local Distress Signal
              </text>
              <text x="16" y="82" fill="#cbd5e1" fontSize="11" fontWeight="500">
                Unique emergency beacon ID generated
              </text>
              <text x="16" y="98" fill="#94a3b8" fontSize="10.5">
                • Audible high-pitch alarm sounds
              </text>
              <text x="16" y="114" fill="#94a3b8" fontSize="10.5">
                • GPS coordinates logged for responders
              </text>
            </g>

            {/* SCENE 6: SUMMARY (6.5s - 7.5s) */}
            <g className="s6">
              {/* Dual Header Badge */}
              <g transform="translate(16, 12)">
                <rect width="102" height="20" rx="10" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
                <text x="8" y="14" fill="#fca5a5" fontSize="9.5" fontWeight="800">📵 NO INTERNET</text>

                <rect x="110" y="0" width="118" height="20" rx="10" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1" />
                <text x="118" y="14" fill="#fde047" fontSize="9.5" fontWeight="800">🆘 EMERGENCY MODE</text>
              </g>

              {/* Central Key Takeaway */}
              <text x="16" y="58" fill="#f8fafc" fontSize="12.5" fontWeight="800">
                Critical safety tools remain available offline
              </text>

              {/* 3 Key Pillars Icons & Labels */}
              <g transform="translate(16, 72)">
                {/* Pillar 1 */}
                <rect width="70" height="38" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x="27" y="18" fontSize="12">🗺️</text>
                <text x="10" y="32" fill="#38bdf8" fontSize="8.5" fontWeight="700">Offline Maps</text>

                {/* Pillar 2 */}
                <rect x="78" width="70" height="38" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x="105" y="18" fontSize="12">📢</text>
                <text x="86" y="32" fill="#fb923c" fontSize="8.5" fontWeight="700">Distress Siren</text>

                {/* Pillar 3 */}
                <rect x="156" width="70" height="38" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                <text x="183" y="18" fontSize="12">🏥</text>
                <text x="164" y="32" fill="#4ade80" fontSize="8.5" fontWeight="700">Relief Camps</text>
              </g>

              <text x="16" y="132" fill="#94a3b8" fontSize="10" fontWeight="500">
                ✓ Auto-syncs to NDRF/SDRF when network returns
              </text>
            </g>

            {/* Loop Indicator bar at card bottom */}
            <g transform="translate(16, 142)">
              <rect width="232" height="3" rx="1.5" fill="#334155" />
              <rect width="60" height="3" rx="1.5" fill="#38bdf8" opacity="0.8">
                <animate attributeName="x" from="0" to="172" dur="7.5s" repeatCount="indefinite" />
              </rect>
            </g>
          </g>
        </svg>
      </div>

      {/* Accessible caption below animation */}
      <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
        See how SATARK works when connectivity is unavailable.
      </div>
    </div>
  );
};
