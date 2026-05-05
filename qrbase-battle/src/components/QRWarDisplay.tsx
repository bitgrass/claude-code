"use client";

import React from "react";

interface QRWarDisplayProps {
  redPR: number;
  bluePR: number;
  greenPR: number;
}

// All dot coordinates extracted from the real QR SVG
const RAW_DOTS: Array<{ cx: number; cy: number }> = [
  // cx=79.5
  ...([322.5,349.5,376.5,403.5,430.5,457.5,538.5,646.5,673.5,700.5].map(cy => ({ cx: 79.5, cy }))),
  // cx=106.5
  ...([322.5,349.5,403.5,430.5,538.5,592.5,619.5,646.5,673.5,727.5].map(cy => ({ cx: 106.5, cy }))),
  // cx=133.5
  ...([295.5,376.5,403.5,430.5,484.5,511.5,673.5,727.5].map(cy => ({ cx: 133.5, cy }))),
  // cx=160.5
  ...([349.5,376.5,457.5,484.5,538.5,565.5,592.5,619.5,646.5,727.5].map(cy => ({ cx: 160.5, cy }))),
  // cx=187.5
  ...([295.5,349.5,430.5,538.5,565.5,592.5,619.5,727.5].map(cy => ({ cx: 187.5, cy }))),
  // cx=214.5
  ...([295.5,376.5,565.5,592.5].map(cy => ({ cx: 214.5, cy }))),
  // cx=241.5
  ...([295.5,349.5,403.5,457.5,511.5,565.5,619.5,673.5,727.5].map(cy => ({ cx: 241.5, cy }))),
  // cx=268.5
  ...([322.5,349.5,376.5,403.5,457.5,538.5,565.5,646.5,700.5].map(cy => ({ cx: 268.5, cy }))),
  // cx=295.5
  ...([106.5,187.5,241.5,295.5,349.5,376.5,403.5,430.5,484.5,538.5,592.5,646.5,673.5,727.5,754.5,808.5,835.5,889.5].map(cy => ({ cx: 295.5, cy }))),
  // cx=322.5
  ...([79.5,106.5,160.5,214.5,322.5,376.5,430.5,457.5,511.5,673.5,700.5,727.5,754.5,862.5,889.5,943.5].map(cy => ({ cx: 322.5, cy }))),
  // cx=349.5
  ...([79.5,106.5,160.5,241.5,268.5,295.5,349.5,376.5,430.5,484.5,538.5,646.5,673.5,700.5,754.5,862.5,916.5].map(cy => ({ cx: 349.5, cy }))),
  // cx=376.5
  ...([133.5,160.5,187.5,268.5,295.5,376.5,403.5,430.5,457.5,484.5,538.5,565.5,592.5,619.5,646.5,727.5,781.5,916.5].map(cy => ({ cx: 376.5, cy }))),
  // cx=403.5
  ...([106.5,133.5,241.5,295.5,349.5,376.5,403.5,457.5,511.5,565.5,619.5,700.5,727.5,781.5,808.5,835.5,862.5,916.5].map(cy => ({ cx: 403.5, cy }))),
  // cx=430.5
  ...([133.5,160.5,187.5,214.5,268.5,322.5,349.5,403.5,457.5,484.5,511.5,592.5,673.5,754.5,781.5,862.5,889.5].map(cy => ({ cx: 430.5, cy }))),
  // cx=457.5
  ...([160.5,241.5,268.5,295.5,349.5,403.5,484.5,511.5,565.5,592.5,673.5,754.5,781.5,862.5,916.5].map(cy => ({ cx: 457.5, cy }))),
  // cx=484.5
  ...([79.5,214.5,295.5,349.5,376.5,403.5,565.5,592.5,619.5,646.5,673.5,727.5,754.5,781.5,808.5,835.5].map(cy => ({ cx: 484.5, cy }))),
  // cx=511.5
  ...([133.5,160.5,187.5,241.5,268.5,295.5,322.5,349.5,376.5,403.5,430.5,457.5,511.5,619.5,646.5,673.5,700.5,727.5,781.5,835.5,916.5].map(cy => ({ cx: 511.5, cy }))),
  // cx=538.5
  ...([79.5,133.5,160.5,187.5,214.5,268.5,322.5,349.5,376.5,403.5,565.5,619.5,646.5,700.5,862.5,889.5].map(cy => ({ cx: 538.5, cy }))),
  // cx=565.5
  ...([133.5,160.5,187.5,214.5,241.5,376.5,430.5,457.5,511.5,565.5,619.5,700.5,727.5,781.5,808.5,862.5].map(cy => ({ cx: 565.5, cy }))),
  // cx=592.5
  ...([79.5,133.5,214.5,322.5,349.5,511.5,619.5,673.5,700.5,781.5,808.5,916.5,943.5].map(cy => ({ cx: 592.5, cy }))),
  // cx=619.5
  ...([79.5,187.5,214.5,241.5,376.5,430.5,511.5,538.5,565.5,592.5,673.5,727.5,781.5,808.5,835.5,862.5].map(cy => ({ cx: 619.5, cy }))),
  // cx=646.5
  ...([79.5,106.5,133.5,160.5,187.5,295.5,376.5,403.5,430.5,484.5,511.5,565.5,592.5,619.5,727.5,808.5,862.5,889.5,916.5].map(cy => ({ cx: 646.5, cy }))),
  // cx=673.5
  ...([133.5,187.5,214.5,241.5,268.5,349.5,376.5,430.5,484.5,511.5,538.5,619.5,673.5,700.5,727.5,862.5,916.5].map(cy => ({ cx: 673.5, cy }))),
  // cx=700.5
  ...([160.5,187.5,214.5,295.5,349.5,376.5,430.5,484.5,511.5,538.5,565.5,646.5,673.5,700.5,727.5,754.5,781.5,835.5,943.5].map(cy => ({ cx: 700.5, cy }))),
  // cx=727.5
  ...([79.5,106.5,160.5,187.5,241.5,295.5,349.5,403.5,457.5,511.5,538.5,565.5,592.5,619.5,646.5,673.5,727.5,754.5,781.5,808.5,835.5,889.5,916.5,943.5].map(cy => ({ cx: 727.5, cy }))),
  // cx=754.5
  ...([295.5,322.5,403.5,430.5,457.5,484.5,511.5,538.5,727.5,835.5,889.5,916.5].map(cy => ({ cx: 754.5, cy }))),
  // cx=781.5
  ...([349.5,376.5,403.5,484.5,619.5,646.5,673.5,727.5,781.5,835.5,862.5].map(cy => ({ cx: 781.5, cy }))),
  // cx=808.5
  ...([322.5,349.5,376.5,430.5,484.5,511.5,538.5,565.5,592.5,646.5,727.5,835.5,943.5].map(cy => ({ cx: 808.5, cy }))),
  // cx=835.5
  ...([295.5,322.5,376.5,403.5,511.5,592.5,619.5,727.5,754.5,781.5,808.5,835.5,862.5,916.5].map(cy => ({ cx: 835.5, cy }))),
  // cx=862.5
  ...([322.5,349.5,376.5,457.5,511.5,565.5,592.5,673.5,700.5,781.5,808.5,835.5,862.5,916.5].map(cy => ({ cx: 862.5, cy }))),
  // cx=889.5
  ...([322.5,403.5,430.5,457.5,484.5,565.5,592.5,646.5,673.5,700.5,781.5,808.5,835.5,862.5].map(cy => ({ cx: 889.5, cy }))),
  // cx=916.5
  ...([295.5,349.5,376.5,403.5,457.5,484.5,511.5,538.5,565.5,592.5,619.5,646.5,727.5,862.5].map(cy => ({ cx: 916.5, cy }))),
  // cx=943.5
  ...([322.5,376.5,403.5,457.5,511.5,646.5,673.5,700.5,727.5,754.5,781.5,862.5,943.5].map(cy => ({ cx: 943.5, cy }))),
];

// Stable ordering
const SORTED_DOTS = [...RAW_DOTS].sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));

const FINDER_COLOR = "var(--qr-finder-outer)";
const FINDER_INNER_COLOR = "var(--qr-finder-inner)";
const PANEL_BG = "var(--qr-panel-bg)";

export function QRWarDisplay({ redPR: _redPR, bluePR: _bluePR, greenPR: _greenPR }: QRWarDisplayProps) {

  // Finder pattern positions
  const finderPositions = [
    { X: 66, Y: 66 },    // top-left
    { X: 768, Y: 66 },   // top-right
    { X: 66, Y: 768 },   // bottom-left
  ];

  return (
    <svg
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <filter id="panelGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="18" floodColor="#1f3da6" floodOpacity="0.36" />
        </filter>

        <filter id="dotAura" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>

        {/* Full QR palette: blue -> purple -> green */}
        <radialGradient id="fullQrSpectrum" gradientUnits="userSpaceOnUse" cx="512" cy="512" r="520">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="48%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#10B981" />
        </radialGradient>
      </defs>

      <rect width="1024" height="1024" fill="var(--qr-outer-bg)" />
      <rect x="22" y="22" width="980" height="980" rx="32" fill={PANEL_BG} filter="url(#panelGlow)" />
      <rect x="22" y="22" width="980" height="980" rx="32" fill="none" stroke="var(--qr-panel-stroke-1)" strokeOpacity="0.56" strokeWidth="2" />
      <rect x="22" y="22" width="980" height="980" rx="32" fill="none" stroke="var(--qr-panel-stroke-2)" strokeOpacity="0.92" strokeWidth="1" />

      <g>
        {SORTED_DOTS.map((d, i) => {
          const dx = d.cx - 512;
          const dy = d.cy - 512;
          const dist = Math.hypot(dx, dy);
          const keepGray = dist > 392 && ((i + Math.floor(dist)) % 3 !== 0);
          const fillColor = keepGray ? "rgba(130,141,162,0.42)" : "url(#fullQrSpectrum)";
          const coreColor = keepGray ? "rgba(151,160,176,0.72)" : "url(#fullQrSpectrum)";
          const strokeColor = keepGray ? "rgba(170,178,192,0.52)" : "rgba(33,232,166,0.88)";
          return (
            <g key={`dot-${i}`}>
              <circle cx={d.cx} cy={d.cy} r={13.8} fill={fillColor} opacity={keepGray ? 0.2 : 0.38} filter="url(#dotAura)" />
              <circle cx={d.cx} cy={d.cy} r={8.8} fill={coreColor} stroke={strokeColor} strokeWidth="1.8" />
            </g>
          );
        })}
      </g>

      <g fill="none" stroke="url(#fullQrSpectrum)" strokeWidth="2.4" strokeOpacity="0.38">
        {[0, 1, 2].map((waveIndex) => (
          <circle key={`wave-${waveIndex}`} cx="512" cy="512" r={130 + waveIndex * 85}>
            <animate attributeName="r" values={`${120 + waveIndex * 85};${360 + waveIndex * 90}`} dur="4.2s" begin={`${waveIndex * 0.7}s`} repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.55;0" dur="4.2s" begin={`${waveIndex * 0.7}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>

      {/* Finder patterns */}
      {finderPositions.map(({ X, Y }, i) => (
        <g key={`finder-${i}`}>
          <rect
            x={X}
            y={Y}
            width={190}
            height={190}
            rx={52}
            fill={FINDER_COLOR}
          />
          <rect
            x={X + 34}
            y={Y + 34}
            width={122}
            height={122}
            rx={34}
            fill={PANEL_BG}
          />
          <rect
            x={X + 57}
            y={Y + 57}
            width={76}
            height={76}
            rx={12}
            fill={FINDER_INNER_COLOR}
          />
        </g>
      ))}

      {/* QR-WAR watermark */}
      <text
        x="512"
        y="985"
        textAnchor="middle"
        fill="rgba(62, 90, 152, 0.58)"
        fontSize="20"
        fontFamily="monospace"
        letterSpacing="10"
      >
        QR-WAR
      </text>
    </svg>
  );
}
