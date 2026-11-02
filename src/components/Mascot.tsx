import React from 'react';

export type MascotState = 'idle' | 'ready' | 'drawing' | 'celebrate' | 'empty' | 'donated';

interface MascotProps {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  speechText?: string;
  speechSide?: 'top' | 'right' | 'left' | 'bottom';
  onClick?: () => void;
}

export const Mascot: React.FC<MascotProps> = ({
  state = 'idle',
  size = 'md',
  className = '',
  speechText,
  speechSide = 'top',
  onClick,
}) => {
  // Determine pixel size
  let pxSize = 64;
  if (typeof size === 'number') {
    pxSize = size;
  } else {
    switch (size) {
      case 'sm':
        pxSize = 40;
        break;
      case 'md':
        pxSize = 64;
        break;
      case 'lg':
        pxSize = 96;
        break;
      case 'xl':
        pxSize = 136;
        break;
    }
  }

  // Expression & accessory flags
  const isDrawing = state === 'drawing';
  const isCelebrate = state === 'celebrate';
  const isEmpty = state === 'empty';
  const isDonated = state === 'donated';
  const isReady = state === 'ready';

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Optional Speech Bubble */}
      {speechText && (
        <div
          className={`absolute z-20 pointer-events-none whitespace-nowrap px-3 py-1 rounded-2xl bg-white/95 text-slate-800 text-xs font-bold border-2 border-amber-300 shadow-md flex items-center gap-1 animate-bounce-subtle ${
            speechSide === 'top'
              ? '-top-9 left-1/2 -translate-x-1/2'
              : speechSide === 'right'
              ? 'left-full ml-2 top-1/2 -translate-y-1/2'
              : speechSide === 'left'
              ? 'right-full mr-2 top-1/2 -translate-y-1/2'
              : '-bottom-9 left-1/2 -translate-x-1/2'
          }`}
        >
          <span className="text-amber-500">✨</span>
          <span>{speechText}</span>
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-white border-amber-300 transform rotate-45 ${
              speechSide === 'top'
                ? '-bottom-1 left-1/2 -translate-x-1/2 border-b-2 border-r-2'
                : speechSide === 'right'
                ? '-left-1 top-1/2 -translate-y-1/2 border-b-2 border-l-2'
                : speechSide === 'left'
                ? '-right-1 top-1/2 -translate-y-1/2 border-t-2 border-r-2'
                : '-top-1 left-1/2 -translate-x-1/2 border-t-2 border-l-2'
            }`}
          />
        </div>
      )}

      {/* Mascot Animated Vector Body */}
      <svg
        width={pxSize}
        height={pxSize}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`overflow-visible ${
          isDrawing
            ? 'animate-bounce'
            : isCelebrate
            ? 'animate-pulse'
            : isEmpty
            ? 'hover:rotate-6 transition-transform'
            : 'animate-bounce-subtle'
        }`}
      >
        <defs>
          {/* Main Gold/Orange Fur Grad */}
          <radialGradient id="mascotFur" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          {/* Lion Mane / Ear Tuft Red-Orange Grad */}
          <linearGradient id="mascotMane" x1="20" y1="10" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="50%" stopColor="#E11D48" />
            <stop offset="100%" stopColor="#9F1239" />
          </linearGradient>

          {/* Face Cream Grad */}
          <radialGradient id="mascotFace" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#FFFBEB" />
            <stop offset="100%" stopColor="#FEF3C7" />
          </radialGradient>

          {/* Gold Accent Grad */}
          <linearGradient id="mascotGold" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF59D" />
            <stop offset="60%" stopColor="#FBC02D" />
            <stop offset="100%" stopColor="#E65100" />
          </linearGradient>

          {/* Halo Glow for Donated state */}
          <radialGradient id="angelGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- BACK EFFECTS & ACCESSORIES --- */}

        {/* Celebration Confetti & Sparkles */}
        {isCelebrate && (
          <g className="animate-spin-slow origin-center">
            <circle cx="15" cy="18" r="3" fill="#F43F5E" />
            <circle cx="105" cy="15" r="3.5" fill="#F59E0B" />
            <circle cx="12" cy="70" r="2.5" fill="#10B981" />
            <circle cx="108" cy="72" r="3" fill="#6366F1" />
            {/* Sparkle stars */}
            <path d="M60 4L62 9L67 11L62 13L60 18L58 13L53 11L58 9Z" fill="#F59E0B" />
            <path d="M22 30L23.5 34L27.5 35.5L23.5 37L22 41L20.5 37L16.5 35.5L20.5 34Z" fill="#E11D48" />
            <path d="M98 32L99.5 36L103.5 37.5L99.5 39L98 43L96.5 39L92.5 37.5L96.5 36Z" fill="#F59E0B" />
          </g>
        )}

        {/* Donated Angel Halo */}
        {isDonated && (
          <g>
            <ellipse cx="60" cy="16" rx="24" ry="7" fill="url(#angelGlow)" />
            <ellipse cx="60" cy="16" rx="22" ry="5.5" stroke="#F59E0B" strokeWidth="2.5" fill="none" />
          </g>
        )}

        {/* --- LION / MASCOT MANE (Puffy Festive Ruffles) --- */}
        <g>
          {/* Festive Ruffle Mane Circling Head */}
          <circle cx="34" cy="30" r="14" fill="url(#mascotMane)" />
          <circle cx="86" cy="30" r="14" fill="url(#mascotMane)" />
          <circle cx="24" cy="50" r="14" fill="url(#mascotMane)" />
          <circle cx="96" cy="50" r="14" fill="url(#mascotMane)" />
          <circle cx="26" cy="72" r="13" fill="url(#mascotMane)" />
          <circle cx="94" cy="72" r="13" fill="url(#mascotMane)" />
          <circle cx="60" cy="20" r="14" fill="url(#mascotMane)" />
        </g>

        {/* Ears */}
        <g>
          {/* Left Ear */}
          <circle cx="34" cy="32" r="10" fill="url(#mascotFur)" />
          <circle cx="34" cy="32" r="6" fill="#FDE047" />
          {/* Right Ear */}
          <circle cx="86" cy="32" r="10" fill="url(#mascotFur)" />
          <circle cx="86" cy="32" r="6" fill="#FDE047" />
        </g>

        {/* --- MAIN HEAD & BODY --- */}
        {/* Rounded Chubby Head */}
        <ellipse cx="60" cy="58" rx="36" ry="32" fill="url(#mascotFur)" />

        {/* Inner Face Mask (Creamy White Chubby Cheeks) */}
        <path
          d="M34 60C34 76 46 84 60 84C74 84 86 76 86 60C86 50 78 44 60 44C42 44 34 50 34 60Z"
          fill="url(#mascotFace)"
        />

        {/* Rosy Cheeks */}
        <ellipse cx="40" cy="65" rx="6" ry="4" fill="#FB7185" opacity="0.65" />
        <ellipse cx="80" cy="65" rx="6" ry="4" fill="#FB7185" opacity="0.65" />

        {/* --- EYES & EXPRESSION --- */}
        {isDrawing ? (
          // Excited Stars / Spinning eyes
          <g>
            {/* Left Star Eye */}
            <path d="M48 55L49.5 59L53.5 60.5L49.5 62L48 66L46.5 62L42.5 60.5L46.5 59Z" fill="#D97706" />
            <circle cx="48" cy="60.5" r="1.5" fill="#FFFFFF" />
            {/* Right Star Eye */}
            <path d="M72 55L73.5 59L77.5 60.5L73.5 62L72 66L70.5 62L66.5 60.5L70.5 59Z" fill="#D97706" />
            <circle cx="72" cy="60.5" r="1.5" fill="#FFFFFF" />
            {/* Cheerful Open Mouth */}
            <path d="M54 68C54 74 66 74 66 68H54Z" fill="#BE123C" />
            <ellipse cx="60" cy="72" rx="3.5" ry="1.5" fill="#FB7185" />
          </g>
        ) : isCelebrate ? (
          // Joyful Closed Happy Arcs (Smiling eyes)
          <g>
            <path d="M44 59C45 55 51 55 52 59" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            <path d="M68 59C69 55 75 55 76 59" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            {/* Big Smile with Tongue */}
            <path d="M53 66C53 74 67 74 67 66H53Z" fill="#BE123C" />
            <ellipse cx="60" cy="71" rx="4" ry="2" fill="#FB7185" />
          </g>
        ) : isEmpty ? (
          // Curious Puzzled expression
          <g>
            <circle cx="48" cy="58" r="4.5" fill="#78350F" />
            <circle cx="49.5" cy="56.5" r="1.8" fill="#FFFFFF" />
            <circle cx="72" cy="56" r="3.5" fill="#78350F" />
            <circle cx="73" cy="55" r="1.2" fill="#FFFFFF" />
            {/* Small 'o' mouth */}
            <circle cx="60" cy="70" r="2.5" fill="#78350F" />
            <circle cx="60" cy="71" r="1.5" fill="#FB7185" />
          </g>
        ) : isReady ? (
          // Determined & Winking / Focused
          <g>
            <circle cx="48" cy="58" r="4.5" fill="#78350F" />
            <circle cx="49.5" cy="56.5" r="1.8" fill="#FFFFFF" />
            <path d="M68 58C69 55 75 55 76 58" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
            {/* Confident Smile */}
            <path d="M54 67C56 71 64 71 66 67" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        ) : (
          // Standard Friendly Big Eyes (Idle)
          <g>
            <ellipse cx="48" cy="58" rx="4.5" ry="5.5" fill="#78350F" />
            <circle cx="46.5" cy="56" r="2" fill="#FFFFFF" />
            <circle cx="50" cy="60" r="1" fill="#FFFFFF" />

            <ellipse cx="72" cy="58" rx="4.5" ry="5.5" fill="#78350F" />
            <circle cx="70.5" cy="56" r="2" fill="#FFFFFF" />
            <circle cx="74" cy="60" r="1" fill="#FFFFFF" />

            {/* Cute Smile */}
            <path d="M55 68C57 71 63 71 65 68" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* Cute Triangular Red/Pink Nose */}
        <path d="M58 63L62 63L60 65.5Z" fill="#F43F5E" />

        {/* Whisker Dots */}
        <circle cx="43" cy="67" r="1" fill="#D97706" opacity="0.6" />
        <circle cx="41" cy="69" r="1" fill="#D97706" opacity="0.6" />
        <circle cx="77" cy="67" r="1" fill="#D97706" opacity="0.6" />
        <circle cx="79" cy="69" r="1" fill="#D97706" opacity="0.6" />

        {/* Head Center Ornament (Little Fortune Crown or Tuft) */}
        <path
          d="M56 34C56 30 60 27 60 27C60 27 64 30 64 34C64 36 62 38 60 38C58 38 56 36 56 34Z"
          fill="url(#mascotGold)"
        />
        <circle cx="60" cy="34" r="2" fill="#FFFFFF" opacity="0.8" />

        {/* --- FESTIVE COLLAR & GOLDEN BELL --- */}
        <g>
          {/* Red Collar Ribbon */}
          <path
            d="M40 82C40 82 50 88 60 88C70 88 80 82 80 82C80 86 70 92 60 92C50 92 40 86 40 82Z"
            fill="#E11D48"
          />
          {/* Golden Bell / Coin */}
          <circle cx="60" cy="91" r="6" fill="url(#mascotGold)" stroke="#B45309" strokeWidth="1" />
          <line x1="56" y1="91" x2="64" y2="91" stroke="#78350F" strokeWidth="1" />
          <circle cx="60" cy="93" r="1.2" fill="#78350F" />
        </g>

        {/* --- PAWS & ACCESSORIES --- */}
        {isCelebrate ? (
          // Raising a Golden Trophy or Streamers
          <g>
            {/* Left Cheering Paw */}
            <circle cx="28" cy="62" r="7" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            {/* Right Cheering Paw with Golden Trophy */}
            <circle cx="92" cy="62" r="7" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            {/* Tiny Golden Trophy */}
            <path d="M88 50H102V57C102 61 98 64 95 64C92 64 88 61 88 57V50Z" fill="url(#mascotGold)" />
            <path d="M93 64V68H97V64" stroke="#D97706" strokeWidth="2" />
            <rect x="91" y="68" width="8" height="3" rx="1" fill="#B45309" />
          </g>
        ) : isDonated ? (
          // Holding Glowing Heart Envelope
          <g>
            {/* Heart Red Envelope */}
            <rect x="48" y="86" width="24" height="20" rx="4" fill="#E11D48" />
            <path d="M60 94C58 91 54 92 54 95C54 98 60 102 60 102C60 102 66 98 66 95C66 92 62 91 60 94Z" fill="#FDE047" />
            {/* Paws Holding */}
            <circle cx="46" cy="94" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            <circle cx="74" cy="94" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
          </g>
        ) : isDrawing ? (
          // Cheering Upward Paws (Rolling luck!)
          <g>
            <circle cx="32" cy="72" r="7" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            <circle cx="88" cy="72" r="7" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            {/* Mini spinning lucky ball */}
            <circle cx="60" cy="104" r="9" fill="url(#mascotGold)" />
            <text x="60" y="108" textAnchor="middle" fill="#78350F" fontSize="8" fontWeight="bold">
              中
            </text>
          </g>
        ) : isReady ? (
          // Holding a Lucky Star / Ready to push button
          <g>
            <circle cx="36" cy="86" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            <circle cx="84" cy="86" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            {/* Mini Red Button */}
            <circle cx="60" cy="102" r="8" fill="#E11D48" stroke="#B45309" strokeWidth="1.5" />
            <circle cx="60" cy="100" r="5" fill="#FB7185" />
          </g>
        ) : isEmpty ? (
          // Paws under chin
          <g>
            <circle cx="48" cy="84" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            <circle cx="72" cy="84" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
          </g>
        ) : (
          // Idle: Holding Shiny Gold Ingot (金元寶)
          <g>
            {/* Gold Ingot */}
            <path
              d="M48 94C48 94 50 106 60 106C70 106 72 94 72 94C76 96 73 103 60 107C47 103 44 96 48 94Z"
              fill="#D97706"
            />
            <path
              d="M48 94C52 89 68 89 72 94C70 99 68 102 60 102C52 102 50 99 48 94Z"
              fill="url(#mascotGold)"
            />
            <ellipse cx="60" cy="92" rx="7" ry="4" fill="#FFF59D" />

            {/* Left and Right Paws Holding */}
            <circle cx="44" cy="94" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
            <circle cx="76" cy="94" r="6" fill="url(#mascotFur)" stroke="#D97706" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};
