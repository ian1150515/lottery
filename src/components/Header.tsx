import React from 'react';
import { 
  Trophy, 
  Volume2, 
  VolumeX, 
  Tv, 
  ShieldCheck,
  Users,
  Settings,
  Sparkles
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { Mascot } from './Mascot';

export type AppPage = 'stage' | 'wall' | 'admin';

interface HeaderProps {
  currentPage: AppPage;
  onSelectPage: (page: AppPage) => void;
  totalEmployees: number;
  remainingEmployees: number;
  totalPrizesQuota: number;
  totalWinnersCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onEnterProjector: () => void;
  hasSnapshot: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onSelectPage,
  totalEmployees,
  remainingEmployees,
  totalPrizesQuota,
  totalWinnersCount,
  isMuted,
  onToggleMute,
  onEnterProjector,
  hasSnapshot,
}) => {
  return (
    <header className="relative border-b border-amber-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.12)]">
      {/* Top subtle festive gold hairline */}
      <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-amber-400 via-rose-500 to-amber-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Left: Brand Identity & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group" 
            onClick={() => onSelectPage('stage')}
          >
            <div className="relative group-hover:scale-105 transition-transform shrink-0">
              <Mascot state="idle" size={42} className="filter drop-shadow-sm" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5 font-display">
                  <span className="bg-gradient-to-r from-rose-600 to-red-700 bg-clip-text text-transparent">抽獎系統</span>
                </h1>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-xs">
                  🧧 年終盛典
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  即時快照保護
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-medium">歡樂開獎 • 慶祝好運</span>
              </div>
            </div>
          </div>

          {/* Primary View Switcher Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-amber-50/80 p-1 rounded-xl border border-amber-200/80 shadow-xs">
            <button
              id="nav-tab-stage"
              onClick={() => onSelectPage('stage')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 'stage'
                  ? 'festive-primary-btn shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>現場抽獎舞台</span>
            </button>

            <button
              id="nav-tab-wall"
              onClick={() => onSelectPage('wall')}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 'wall'
                  ? 'festive-primary-btn shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>中獎星光榜</span>
              {totalWinnersCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  currentPage === 'wall' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {totalWinnersCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => onSelectPage('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentPage === 'admin'
                  ? 'festive-primary-btn shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>後台管理者</span>
            </button>
          </nav>
        </div>

        {/* Right: Live Metrics & Quick Utility Controls */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between md:justify-end">
          {/* Quick Metrics (Clean, legible badges) */}
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 hidden sm:flex items-center gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>名單</span>
              <strong className="text-slate-900 font-mono font-bold">{totalEmployees}</strong>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-emerald-800">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700">候選</span>
              <strong className="text-emerald-900 font-mono font-bold">{remainingEmployees}</strong>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-amber-900">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-amber-800">已開</span>
              <strong className="text-amber-900 font-mono font-bold">{totalWinnersCount}/{totalPrizesQuota}</strong>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={() => {
              onToggleMute();
              soundEffects.playTick();
            }}
            title={isMuted ? '開啟現場音效' : '靜音'}
            className={`p-2 rounded-lg border transition-all active:scale-95 cursor-pointer shadow-xs ${
              isMuted
                ? 'bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-700'
                : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Projector Mode (Big Screen) */}
          <button
            id="btn-projector-mode"
            onClick={onEnterProjector}
            title="切換大螢幕投射模式 (LED/投影機專用)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold festive-gold-btn rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Tv className="w-4 h-4" />
            <span>大螢幕模式</span>
          </button>
        </div>
      </div>
    </header>
  );
};
