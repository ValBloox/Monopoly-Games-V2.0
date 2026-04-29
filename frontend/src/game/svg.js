import React, { useState } from "react";
import { BOARD, ORI_DENOM, TOKEN_OPTIONS } from "./data";

// Use AI-generated etching images. Fallback to simple SVG if missing.
export const PropertyIllustration = ({ id, w = 56, h = 44 }) => {
  const cell = BOARD[id];
  const name = (cell?.name || "").toLowerCase();
  const imgKey = cell?.img;
  const [imgPhase, setImgPhase] = useState(imgKey ? "monuments" : "svg");

  // Prefer generated monument portraits (stored under public/img/etch/{imgKey}.png).
  // If the image file isn't found, fall back to the original SVG etching.
  if (imgKey && imgPhase === "monuments") {
    return (
      <div className="prop-illus" aria-hidden="true">
        <img
          className="prop-illus-img"
          src={`${process.env.PUBLIC_URL}/img/monuments/${imgKey}.png`}
          alt=""
          width={w}
          height={h}
          loading="lazy"
          onError={() => setImgPhase("etch")}
        />
      </div>
    );
  }
  if (imgKey && imgPhase === "etch") {
    return (
      <div className="prop-illus" aria-hidden="true">
        <img
          className="prop-illus-img"
          src={`${process.env.PUBLIC_URL}/img/etch/${imgKey}.png`}
          alt=""
          width={w}
          height={h}
          loading="lazy"
          onError={() => setImgPhase("svg")}
        />
      </div>
    );
  }

  if (cell?.type === "railroad") {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.5">
          <line x1="8" y1="10" x2="52" y2="10" />
          <line x1="8" y1="38" x2="52" y2="38" />
          <line x1="12" y1="10" x2="12" y2="38" />
          <line x1="20" y1="10" x2="20" y2="38" />
          <line x1="28" y1="10" x2="28" y2="38" />
          <line x1="36" y1="10" x2="36" y2="38" />
          <line x1="44" y1="10" x2="44" y2="38" />
        </g>
      </svg>
    );
  }
  if (cell?.type === "tax") {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.4">
          <circle cx="30" cy="24" r="14" />
          <path d="M24 20 H36" />
          <path d="M24 28 H36" />
        </g>
      </svg>
    );
  }
  if (name.includes("monumen nasional") || name.includes("monas")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <path d="M30 8 L34 34 L26 34 Z" />
          <rect x="22" y="34" width="16" height="6" />
          <circle cx="30" cy="7" r="1.5" fill="#3D2410" />
        </g>
      </svg>
    );
  }
  if (name.includes("masjid")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <path d="M12 36 H48" />
          <path d="M18 36 V24 H42 V36" />
          <path d="M20 24 Q30 12 40 24" />
          <path d="M46 36 V18" />
        </g>
      </svg>
    );
  }
  if (name.includes("candi") || name.includes("borobudur") || name.includes("prambanan")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <rect x="14" y="30" width="32" height="8" />
          <rect x="18" y="24" width="24" height="6" />
          <rect x="22" y="18" width="16" height="6" />
          <circle cx="30" cy="15" r="2" />
        </g>
      </svg>
    );
  }
  if (name.includes("benteng") || name.includes("fort")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <rect x="10" y="20" width="40" height="18" />
          <path d="M10 20 H16 V16 H22 V20 H28 V16 H34 V20 H40 V16 H46 V20 H50" />
          <rect x="26" y="28" width="8" height="10" />
        </g>
      </svg>
    );
  }
  if (name.includes("istana")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <rect x="12" y="22" width="36" height="16" />
          <path d="M12 22 L30 12 L48 22" />
          <line x1="22" y1="22" x2="22" y2="38" />
          <line x1="30" y1="22" x2="30" y2="38" />
          <line x1="38" y1="22" x2="38" y2="38" />
        </g>
      </svg>
    );
  }
  if (name.includes("tugu") || name.includes("jam gadang")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <rect x="26" y="14" width="8" height="24" />
          <rect x="22" y="10" width="16" height="6" />
          <rect x="18" y="38" width="24" height="4" />
        </g>
      </svg>
    );
  }
  if (name.includes("museum")) {
    return (
      <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
        <g fill="none" stroke="#3D2410" strokeWidth="1.2">
          <path d="M10 20 L30 10 L50 20" />
          <rect x="12" y="20" width="36" height="16" />
          <line x1="20" y1="20" x2="20" y2="36" />
          <line x1="30" y1="20" x2="30" y2="36" />
          <line x1="40" y1="20" x2="40" y2="36" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 48" width={w} height={h} className="prop-illus" aria-hidden="true">
      <g fill="none" stroke="#3D2410" strokeWidth="1.2">
        <rect x="10" y="18" width="40" height="20" />
        <path d="M10 18 L30 8 L50 18" />
        <rect x="26" y="24" width="8" height="14" />
      </g>
    </svg>
  );
};

export const HeroToken = ({ color = "#1A0A00", size = 24, glow = false, tokenId = null }) => {
  const heroImg = tokenId !== null ? TOKEN_OPTIONS[tokenId]?.heroImg : null;
  if (heroImg) {
    return (
      <span
        className={`hero-token token-sprite ${glow ? "glow" : ""}`}
        style={{ width: size, height: size }}
      >
        <img
          src={`${process.env.PUBLIC_URL}/img/heroes/${heroImg}.png`}
          alt=""
          width={size}
          height={size}
          draggable={false}
          style={{ width: size, height: size, objectFit: "contain", imageRendering: "pixelated" }}
        />
      </span>
    );
  }
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={`hero-token ${glow ? "glow" : ""}`}>
      <ellipse cx="16" cy="29" rx="10" ry="2.2" fill="#000" opacity="0.26" />
      <circle cx="16" cy="8" r="4.2" fill="#F2C8A0" stroke="#4A2C17" strokeWidth="0.6" />
      <path d="M11 17 C11 13.8 13.6 11.5 16 11.5 C18.4 11.5 21 13.8 21 17 L21 24 L11 24 Z" fill={color} stroke="#2C1A0E" strokeWidth="0.7" />
      <rect x="9" y="16.4" width="2.8" height="6.6" rx="1.3" fill="#F2C8A0" />
      <rect x="20.2" y="16.4" width="2.8" height="6.6" rx="1.3" fill="#F2C8A0" />
      <rect x="12.3" y="24" width="2.8" height="5.6" rx="1.2" fill="#2C1A0E" />
      <rect x="16.9" y="24" width="2.8" height="5.6" rx="1.2" fill="#2C1A0E" />
      <path d="M12.6 6.2 Q16 3.5 19.4 6.2" fill="none" stroke="#2C1A0E" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
};

export const TopHat = HeroToken;

export const PawnToken = ({ color = "#1A0A00", size = 24, glow = false }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} className={`pawn-token ${glow ? "glow" : ""}`}>
    <ellipse cx="16" cy="29" rx="11" ry="2.4" fill="#000" opacity="0.24" />
    <circle cx="16" cy="8.4" r="4.2" fill={color} stroke="#2C1A0E" strokeWidth="0.9" />
    <path d="M10.6 21.8 C10.6 16 12.8 13.2 16 13.2 C19.2 13.2 21.4 16 21.4 21.8 Z" fill={color} stroke="#2C1A0E" strokeWidth="0.9" />
    <rect x="8.2" y="21.8" width="15.6" height="3.8" rx="1.4" fill={color} stroke="#2C1A0E" strokeWidth="0.9" />
    <rect x="6.5" y="25.2" width="19" height="2.8" rx="1.2" fill={color} stroke="#2C1A0E" strokeWidth="0.9" />
  </svg>
);

export const MoneyNoteAsset = ({ value = 10, width = 82, height = 30 }) => {
  const denom = ORI_DENOM.find((d) => d.value === value);
  const base = denom?.color || "#5b4a2f";

  // Simple hex shade helper for SVG fills.
  const shade = (hex, amt) => {
    const h = String(hex).replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = parseInt(full, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
    return `rgb(${r},${g},${b})`;
  };

  const top = shade(base, 30);
  const bottom = shade(base, -18);

  return (
    <svg viewBox="0 0 120 44" width={width} height={height} className="money-note-asset" aria-hidden="true">
      <defs>
        <linearGradient id={`mn-${value}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="118" height="42" rx="4" fill={`url(#mn-${value})`} stroke="#5b4a2f" strokeWidth="1.2" />
      <rect x="8" y="7" width="104" height="30" rx="2.5" fill="none" stroke="#5b4a2f" strokeWidth="0.8" opacity="0.6" />
      <text x="18" y="17" textAnchor="middle" fontSize="6.5" fill="#4a3b22" fontFamily="serif" fontWeight="800">ORI</text>
      <text x="102" y="17" textAnchor="middle" fontSize="6.5" fill="#4a3b22" fontFamily="serif" fontWeight="800">ORI</text>
      <text x="60" y="18" textAnchor="middle" fontSize="8" fill="#4a3b22" fontFamily="serif" fontWeight="800">ORI</text>
      <text x="60" y="30" textAnchor="middle" fontSize="14" fill="#3d2d16" fontFamily="serif" fontWeight="900">{value}</text>
      <line x1="14" y1="34" x2="106" y2="34" stroke="#5b4a2f" strokeWidth="0.6" opacity="0.45" />
    </svg>
  );
};

export const Bendera = ({ size = 80, animate = true }) => (
  <svg viewBox="0 0 100 120" width={size} height={size} className={animate ? "bendera-wave" : ""}>
    <line x1="14" y1="10" x2="14" y2="118" stroke="#3D2410" strokeWidth="2.5" />
    <circle cx="14" cy="10" r="3" fill="#C9922A" />
    <path d="M16 14 Q40 8 70 14 Q88 18 88 26 Q88 34 70 30 Q40 36 16 30 Z" fill="#C0392B" />
    <path d="M16 30 Q40 36 70 30 Q88 34 88 42 Q88 50 70 46 Q40 52 16 46 Z" fill="#F5ECD7" />
  </svg>
);

export const BatikCorner = ({ size = 80 }) => (
  <svg viewBox="0 0 80 80" width={size} height={size} aria-hidden="true">
    <g fill="none" stroke="#C9922A" strokeWidth="0.8" opacity="0.85">
      <path d="M0 80 L0 50 Q15 50 15 35 Q15 20 30 20 Q45 20 45 5 L45 0" />
      <path d="M0 70 Q10 70 10 60 Q10 50 20 50 Q30 50 30 40 Q30 30 40 30 Q50 30 50 20 Q50 10 60 10 Q70 10 70 0" />
      <circle cx="20" cy="20" r="3" />
      <circle cx="35" cy="35" r="2" />
      <circle cx="50" cy="50" r="2.5" />
    </g>
  </svg>
);

export const Garuda = ({ size = 60, opacity = 1 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} style={{ opacity }}>
    <g fill="none" stroke="#8B1A1A" strokeWidth="1.4">
      <path d="M50 18 L42 30 L30 28 L34 40 L24 48 L36 52 L34 64 L46 60 L50 72 L54 60 L66 64 L64 52 L76 48 L66 40 L70 28 L58 30 Z" fill="#C9922A" fillOpacity="0.4" />
      <circle cx="50" cy="46" r="6" />
      <path d="M50 52 L50 78" />
      <path d="M44 78 L56 78" />
    </g>
  </svg>
);

export const DiceFace = ({ value, size = 56 }) => {
  const dots = {
    1: [[2, 2]],
    2: [[1, 1], [3, 3]],
    3: [[1, 1], [2, 2], [3, 3]],
    4: [[1, 1], [3, 1], [1, 3], [3, 3]],
    5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]],
    6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
  }[value] || [];
  return (
    <svg viewBox="0 0 4 4" width={size} height={size} className="dice-face">
      <rect width="4" height="4" rx="0.5" fill="#D4B483" stroke="#8B6914" strokeWidth="0.06" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.3" fill="#8B1A1A" />
      ))}
    </svg>
  );
};

export const FlagWave = () => (
  <svg viewBox="0 0 60 40" width={36} height={24}>
    <line x1="6" y1="2" x2="6" y2="40" stroke="#3D2410" strokeWidth="1.2" />
    <path d="M8 4 Q24 2 42 4 Q52 6 52 12 Q52 18 42 16 Q24 14 8 16 Z" fill="#C0392B" />
    <path d="M8 16 Q24 14 42 16 Q52 18 52 24 Q52 30 42 28 Q24 26 8 28 Z" fill="#F5ECD7" />
  </svg>
);
