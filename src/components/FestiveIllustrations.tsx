import React from 'react';

// ==========================================
// Cute Soft-3D Style Festive Illustration Assets
// Modern, rounded, clean, high-DPI scalable SVG
// ==========================================

interface IllustrationProps {
  className?: string;
  size?: number | string;
}

/**
 * 金元寶 (Cute Golden Ingot)
 * Plump, soft 3D gradient, sparkling highlight
 */
export const GoldIngot: React.FC<IllustrationProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block drop-shadow-sm select-none ${className}`}
    >
      <defs>
        <linearGradient id="ingotGoldTop" x1="32" y1="12" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="60%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#F57F17" />
        </linearGradient>
        <linearGradient id="ingotGoldBody" x1="10" y1="26" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDD835" />
          <stop offset="45%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="ingotGlow" x1="20" y1="28" x2="44" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDE7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFF59D" stopOpacity="0" />
        </linearGradient>
        <filter id="ingotShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#B45309" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ingot Base Bottom Curve */}
      <path
        d="M10 26C10 26 14 50 32 50C50 50 54 26 54 26C54 36 46 54 32 54C18 54 10 36 10 26Z"
        fill="#C2410C"
        opacity="0.35"
      />

      {/* Main Ingot Body */}
      <path
        d="M10 26C14 48 50 48 54 26C58 29 55 35 48 42C41 49 23 49 16 42C9 35 6 29 10 26Z"
        fill="url(#ingotGoldBody)"
        filter="url(#ingotShadow)"
      />

      {/* Central Round Crown / Mound */}
      <ellipse cx="32" cy="24" rx="14" ry="10" fill="url(#ingotGoldTop)" />
      <ellipse cx="32" cy="22" rx="10" ry="6" fill="#FFF59D" opacity="0.6" />

      {/* Rim Lips left & right */}
      <path
        d="M10 26C12 21 21 26 32 26C43 26 52 21 54 26C52 31 43 33 32 33C21 33 12 31 10 26Z"
        fill="url(#ingotGoldTop)"
      />

      {/* Specular highlights */}
      <ellipse cx="26" cy="21" rx="4" ry="2" fill="#FFFFFF" opacity="0.85" />
      <circle cx="48" cy="28" r="1.5" fill="#FFFFFF" opacity="0.9" />
      <circle cx="16" cy="28" r="1.5" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};

/**
 * 開運紅包 (Cute Plump Red Envelope)
 * With shining gold seal and soft rounded corner
 */
export const RedPacket: React.FC<IllustrationProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block drop-shadow-sm select-none ${className}`}
    >
      <defs>
        <linearGradient id="envelopeRed" x1="14" y1="10" x2="50" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="50%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="envelopeFlap" x1="32" y1="10" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="40%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="sealGold" x1="26" y1="26" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="60%" stopColor="#FBC02D" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>

      {/* Main Envelope Body */}
      <rect x="14" y="10" width="36" height="46" rx="8" fill="url(#envelopeRed)" />

      {/* Gold bottom trim accent */}
      <path d="M14 48C20 51 44 51 50 48V50C50 53.3 47.3 56 44 56H20C16.7 56 14 53.3 14 50V48Z" fill="#F59E0B" opacity="0.6" />

      {/* Top Flap Curve */}
      <path
        d="M14 18C14 13.58 17.58 10 22 10H42C46.42 10 50 13.58 50 18C50 22 41 33 32 33C23 33 14 22 14 18Z"
        fill="url(#envelopeFlap)"
      />

      {/* Golden Seal Button */}
      <circle cx="32" cy="32" r="7" fill="url(#sealGold)" stroke="#FFF9C4" strokeWidth="1.2" />
      {/* Chinese character "福" or "吉" simplified cute icon on seal */}
      <path
        d="M32 28V36M29 32H35M28 29.5H36"
        stroke="#78350F"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      
      {/* Highlight Shine */}
      <path
        d="M18 14C18 14 24 12 34 12"
        stroke="#FFE4E6"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
};

/**
 * 喜慶圓滿燈籠 (Cute Round Lantern)
 */
export const LuckyLantern: React.FC<IllustrationProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block drop-shadow-sm select-none ${className}`}
    >
      <defs>
        <linearGradient id="lanternRed" x1="16" y1="16" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="40%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="lanternGold" x1="24" y1="10" x2="40" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Hanging Cord */}
      <line x1="32" y1="4" x2="32" y2="12" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />

      {/* Top Cap */}
      <rect x="25" y="11" width="14" height="4" rx="2" fill="url(#lanternGold)" />

      {/* Round Body */}
      <ellipse cx="32" cy="28" rx="17" ry="15" fill="url(#lanternRed)" />

      {/* Lantern Ribs */}
      <path d="M32 13V43M24 15C21 21 21 35 24 41M40 15C43 21 43 35 40 41" stroke="#FDE047" strokeWidth="1.2" strokeOpacity="0.85" />

      {/* Bottom Cap */}
      <rect x="26" y="42" width="12" height="3.5" rx="1.75" fill="url(#lanternGold)" />

      {/* Gold Ring */}
      <circle cx="32" cy="47" r="2.5" fill="#F59E0B" />

      {/* Golden Tassels */}
      <line x1="30" y1="49" x2="28" y2="59" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="49" x2="32" y2="61" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="49" x2="36" y2="59" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" />

      {/* Soft Specular Highlight */}
      <ellipse cx="24" cy="22" rx="3.5" ry="5.5" fill="#FFFFFF" opacity="0.3" transform="rotate(-20 24 22)" />
    </svg>
  );
};

/**
 * 幸運抽獎球 (Cute Shiny Lottery Ball)
 */
export const LotteryBall: React.FC<IllustrationProps & { number?: string | number; color?: 'gold' | 'red' | 'coral' }> = ({
  className = '',
  size = 36,
  number = '★',
  color = 'gold',
}) => {
  const isGold = color === 'gold';
  const isCoral = color === 'coral';

  const grad1 = isGold ? '#FEF08A' : isCoral ? '#FDBA74' : '#FDA4AF';
  const grad2 = isGold ? '#F59E0B' : isCoral ? '#EA580C' : '#E11D48';
  const grad3 = isGold ? '#B45309' : isCoral ? '#9A3412' : '#9F1239';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block drop-shadow-sm select-none ${className}`}
    >
      <defs>
        <radialGradient id={`ballGrad_${color}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={grad1} />
          <stop offset="55%" stopColor={grad2} />
          <stop offset="100%" stopColor={grad3} />
        </radialGradient>
      </defs>

      {/* Ball Sphere */}
      <circle cx="24" cy="24" r="20" fill={`url(#ballGrad_${color})`} />

      {/* White Badge Center */}
      <circle cx="24" cy="24" r="10" fill="#FFFFFF" opacity="0.95" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill={grad3}
        fontSize="11"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {number}
      </text>

      {/* Specular highlight */}
      <ellipse cx="17" cy="15" rx="5" ry="3" fill="#FFFFFF" opacity="0.6" transform="rotate(-30 17 15)" />
    </svg>
  );
};

/**
 * 禮物盒 (Cute Gift Box)
 */
export const GiftBoxCute: React.FC<IllustrationProps> = ({ className = '', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block drop-shadow-sm select-none ${className}`}
    >
      <defs>
        <linearGradient id="boxBody" x1="12" y1="24" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="boxLid" x1="10" y1="18" x2="54" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="ribbonGold" x1="28" y1="8" x2="36" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Box base */}
      <rect x="14" y="24" width="36" height="30" rx="6" fill="url(#boxBody)" />

      {/* Box lid */}
      <rect x="10" y="17" width="44" height="10" rx="4" fill="url(#boxLid)" />

      {/* Vertical Ribbon */}
      <rect x="28" y="17" width="8" height="37" fill="url(#ribbonGold)" />

      {/* Horizontal Ribbon */}
      <rect x="14" y="35" width="36" height="7" fill="url(#ribbonGold)" />

      {/* Ribbon Bow on top */}
      <path
        d="M32 17C29 11 20 9 22 14C23 17 28 17 32 17Z"
        fill="url(#ribbonGold)"
      />
      <path
        d="M32 17C35 11 44 9 42 14C41 17 36 17 32 17Z"
        fill="url(#ribbonGold)"
      />
      <circle cx="32" cy="17" r="3" fill="#FEF08A" stroke="#D97706" strokeWidth="1" />

      {/* Shimmer dot */}
      <circle cx="18" cy="28" r="1.5" fill="#FFFFFF" opacity="0.75" />
    </svg>
  );
};

/**
 * 耀眼金星 (Cute Golden Star Sparkle)
 */
export const SparkleStar: React.FC<IllustrationProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none ${className}`}
    >
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
      </defs>
      {/* 4-point Sparkle */}
      <path
        d="M16 2C16 9.5 22.5 16 30 16C22.5 16 16 22.5 16 30C16 22.5 9.5 16 2 16C9.5 16 16 9.5 16 2Z"
        fill="url(#starGlow)"
      />
      {/* Mini secondary cross */}
      <path
        d="M16 8C16 12 20 16 24 16C20 16 16 20 16 24C16 20 12 16 8 16C12 16 16 12 16 8Z"
        fill="#FFFFFF"
        opacity="0.8"
      />
    </svg>
  );
};
