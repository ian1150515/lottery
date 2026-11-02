import React from 'react';
import { Sparkles, Trophy, Users, Award } from 'lucide-react';
import { Mascot } from './Mascot';
import { GoldIngot, RedPacket, SparkleStar, LuckyLantern } from './FestiveIllustrations';

interface FestiveHeaderBannerProps {
  activityTitle?: string;
  title?: string;
  totalEmployees?: number;
  remainingCandidates?: number;
  remainingQuota?: number;
  totalWinnersCount?: number;
  drawnCount?: number;
  totalPrizesQuota?: number;
  totalPrizes?: number;
  totalQuota?: number;
  currentPrizeName?: string;
  currentPrizeRemainingQuota?: number;
  currentPrizeTotalQuota?: number;
}

export const FestiveHeaderBanner: React.FC<FestiveHeaderBannerProps> = ({
  activityTitle,
  title,
  totalEmployees = 0,
  remainingCandidates,
  totalWinnersCount,
  drawnCount,
  totalPrizesQuota,
  totalQuota,
  currentPrizeName,
  currentPrizeRemainingQuota = 0,
  currentPrizeTotalQuota = 0,
}) => {
  // Resolve effective dynamic title
  const effectiveTitle = (activityTitle && activityTitle.trim() !== '')
    ? activityTitle
    : (title && title.trim() !== '')
      ? title
      : '2026 聯歡晚會 • 喜慶年終大抽獎';

  // Resolve metrics with fallbacks
  const effectiveCandidates = remainingCandidates ?? (totalEmployees - (drawnCount ?? totalWinnersCount ?? 0));
  const effectiveWinners = totalWinnersCount ?? drawnCount ?? 0;
  const effectiveTotalQuota = totalPrizesQuota ?? totalQuota ?? 0;

  return (
    <div className="relative w-full rounded-3xl bg-white border border-amber-300/80 p-5 sm:p-7 shadow-[0_12px_36px_-6px_rgba(225,29,72,0.08),0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden text-center">
      {/* Subtle warm festive radiant gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 via-rose-500 to-amber-400" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-36 bg-gradient-to-r from-rose-500/10 via-amber-400/15 to-rose-500/10 blur-3xl pointer-events-none" />

      {/* Decorative Cartoon & Festive Accents on Corners (Hidden on tiny mobile to preserve room) */}
      <div className="hidden lg:flex items-center gap-2 absolute top-4 left-6 z-10 pointer-events-none">
        <Mascot
          state="idle"
          size={58}
          speechText="好運連連！"
          speechSide="right"
          className="filter drop-shadow-sm"
        />
        <LuckyLantern size={32} className="animate-bounce-subtle opacity-90 -mt-2" />
      </div>

      <div className="hidden lg:flex items-center gap-1.5 absolute top-5 right-6 z-10 pointer-events-none">
        <GoldIngot size={36} className="animate-bounce-subtle" />
        <RedPacket size={32} className="transform rotate-12 -mt-1" />
        <SparkleStar size={24} className="text-amber-400 animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center space-y-3.5">
        
        {/* Top Auspicious Ribbon */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 border border-amber-300/80 shadow-xs">
          <span className="text-rose-600 text-sm">🏮</span>
          <span className="text-xs sm:text-sm font-black text-rose-800 tracking-wider flex items-center gap-1.5">
            <span>🎉 歲末旺年盛典 • 金玉滿堂 • 歡樂慶典</span>
          </span>
          <span className="text-rose-600 text-sm">🏮</span>
        </div>

        {/* Dynamic Activity Title */}
        <div className="relative py-1 px-4 max-w-5xl mx-auto flex items-center justify-center gap-3">
          <div className="lg:hidden shrink-0">
            <Mascot state="idle" size={44} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 bg-clip-text text-transparent leading-tight font-display">
              {effectiveTitle}
            </h1>
            <div className="h-1 w-36 sm:w-64 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-2 rounded-full" />
          </div>
          <div className="lg:hidden shrink-0">
            <GoldIngot size={30} />
          </div>
        </div>

        {/* 4 Crisp, Legible Festive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl pt-2">
          
          {/* Card 1: 待抽候選同仁 (Emerald Green) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 shadow-xs flex flex-col items-center justify-center transition-all hover:shadow-sm">
            <div className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>待抽候選同仁</span>
            </div>
            <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-900 mt-1">
              {Math.max(0, effectiveCandidates)}
              <span className="text-xs sm:text-sm font-medium text-emerald-700 ml-1">/ {totalEmployees} 人</span>
            </div>
          </div>

          {/* Card 2: 已誕生幸運兒 (Warm Amber) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 shadow-xs flex flex-col items-center justify-center transition-all hover:shadow-sm">
            <div className="text-xs sm:text-sm font-bold text-amber-800 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>已誕生幸運兒</span>
            </div>
            <div className="text-2xl sm:text-4xl font-black font-mono text-amber-900 mt-1">
              {effectiveWinners}
              <span className="text-xs sm:text-sm font-medium text-amber-700 ml-1">/ {effectiveTotalQuota} 位</span>
            </div>
          </div>

          {/* Card 3: 進行中獎項 (Festive Crimson) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/70 border border-rose-200/90 shadow-xs flex flex-col items-center justify-center transition-all hover:shadow-sm">
            <div className="text-xs sm:text-sm font-bold text-rose-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-rose-600" />
              <span>進行中獎項</span>
            </div>
            <div className="text-base sm:text-xl font-black text-rose-950 mt-1.5 truncate max-w-full px-2 font-display" title={currentPrizeName}>
              {currentPrizeName || '未選擇獎項'}
            </div>
          </div>

          {/* Card 4: 本獎項剩餘名額 (Champagne Gold Highlight) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border-2 border-amber-300 shadow-sm flex flex-col items-center justify-center transition-all hover:shadow-md">
            <div className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>本獎剩餘名額</span>
            </div>
            <div className="text-2xl sm:text-4xl font-black font-mono text-amber-950 mt-1">
              {currentPrizeRemainingQuota}
              <span className="text-xs sm:text-base font-bold text-amber-700 ml-1">/ {currentPrizeTotalQuota}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
