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

// Sort by diagonal (cx+cy) for sweep effect
const SORTED_DOTS = [...RAW_DOTS].sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));

const TEAM_COLORS = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#10B981",
};

export function QRWarDisplay({ redPR, bluePR, greenPR }: QRWarDisplayProps) {
  const total = redPR + bluePR + greenPR;
  const n = SORTED_DOTS.length;

  let redCount: number, blueCount: number, greenCount: number;

  if (total === 0) {
    // Even distribution
    redCount = Math.floor(n / 3);
    blueCount = Math.floor(n / 3);
    greenCount = n - redCount - blueCount;
  } else {
    redCount = Math.round((redPR / total) * n);
    blueCount = Math.round((bluePR / total) * n);
    greenCount = n - redCount - blueCount;
    if (greenCount < 0) {
      greenCount = 0;
      blueCount = n - redCount;
    }
  }

  const redDots = SORTED_DOTS.slice(0, redCount);
  const blueDots = SORTED_DOTS.slice(redCount, redCount + blueCount);
  const greenDots = SORTED_DOTS.slice(redCount + blueCount);

  // Determine top team color for finder patterns
  let topColor = "#6366f1";
  if (total > 0) {
    if (redPR >= bluePR && redPR >= greenPR) topColor = TEAM_COLORS.red;
    else if (bluePR >= redPR && bluePR >= greenPR) topColor = TEAM_COLORS.blue;
    else topColor = TEAM_COLORS.green;
  }

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
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feComposite in="SourceGraphic" in2="coloredBlur" operator="over" />
        </filter>
      </defs>

      {/* Dark background */}
      <rect width="1024" height="1024" fill="#050714" />

      {/* Red team dots */}
      <g fill={TEAM_COLORS.red} filter="url(#glow)">
        {redDots.map((d, i) => {
          const delay = ((d.cx + d.cy) / 1900 * 2.4).toFixed(2);
          return (
            <circle key={`r-${i}`} cx={d.cx} cy={d.cy} r={13.5}>
              <animate attributeName="opacity" values="1;0.45;1" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="13.5;11.5;13.5" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
      </g>

      {/* Blue team dots */}
      <g fill={TEAM_COLORS.blue} filter="url(#glow)">
        {blueDots.map((d, i) => {
          const delay = ((d.cx + d.cy) / 1900 * 2.4).toFixed(2);
          return (
            <circle key={`b-${i}`} cx={d.cx} cy={d.cy} r={13.5}>
              <animate attributeName="opacity" values="1;0.45;1" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="13.5;11.5;13.5" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
      </g>

      {/* Green team dots */}
      <g fill={TEAM_COLORS.green} filter="url(#glow)">
        {greenDots.map((d, i) => {
          const delay = ((d.cx + d.cy) / 1900 * 2.4).toFixed(2);
          return (
            <circle key={`g-${i}`} cx={d.cx} cy={d.cy} r={13.5}>
              <animate attributeName="opacity" values="1;0.45;1" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="13.5;11.5;13.5" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          );
        })}
      </g>

      {/* Finder patterns */}
      {finderPositions.map(({ X, Y }, i) => (
        <g key={`finder-${i}`}>
          <rect
            x={X + 12}
            y={Y + 12}
            width={165}
            height={165}
            rx={48}
            fill="none"
            stroke={topColor}
            strokeWidth={23}
          />
          <rect
            x={X + 54}
            y={Y + 54}
            width={81}
            height={81}
            rx={10}
            fill={topColor}
          />
        </g>
      ))}

      {/* QR-WAR watermark */}
      <text
        x="512"
        y="985"
        textAnchor="middle"
        fill="#ffffff20"
        fontSize="18"
        fontFamily="monospace"
        letterSpacing="8"
      >
        QR-WAR
      </text>
    </svg>
  );
}
