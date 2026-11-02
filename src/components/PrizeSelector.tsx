import React, { useState, useMemo } from 'react';
import { Prize, WinningRecord } from '../types';
import { 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Filter
} from 'lucide-react';

interface PrizeSelectorProps {
  prizes: Prize[];
  selectedPrizeId: string;
  onSelectPrize: (prizeId: string) => void;
  winningRecords: WinningRecord[];
  isDrawing: boolean;
  currentPool: 'main' | 'bonus';
  onSwitchPool: (pool: 'main' | 'bonus') => void;
  isMainPoolCompleted: boolean;
}

export const PrizeSelector: React.FC<PrizeSelectorProps> = ({
  prizes,
  selectedPrizeId,
  onSelectPrize,
  winningRecords,
  isDrawing,
  currentPool,
  onSwitchPool,
  isMainPoolCompleted,
}) => {
  // Default to collapsed so the DrawStage is prominently visible without endless scrolling
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  const mainPrizes = prizes.filter(p => p.poolType !== 'bonus' && !p.isAdditional);
  const bonusPrizes = prizes.filter(p => p.poolType === 'bonus' || p.isAdditional);

  // Active list based on pool selection tab
  const displayedPrizes = currentPool === 'main' ? mainPrizes : bonusPrizes;

  // Precomputed map for each prize's winning records count
  const prizeWinnersCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of winningRecords) {
      map.set(record.prizeId, (map.get(record.prizeId) || 0) + 1);
    }
    return map;
  }, [winningRecords]);

  // Current active prize details
  const currentPrize = prizes.find(p => p.id === selectedPrizeId) || displayedPrizes[0] || null;
  const currentIndex = displayedPrizes.findIndex(p => p.id === currentPrize?.id);
  const currentDrawnCount = currentPrize ? (prizeWinnersCountMap.get(currentPrize.id) || 0) : 0;
  const currentRemaining = currentPrize ? Math.max(0, currentPrize.quota - currentDrawnCount) : 0;
  const isCurrentCompleted = currentPrize ? currentDrawnCount >= currentPrize.quota : false;

  // Counts for status filters
  const completedPrizesCount = useMemo(() => {
    return displayedPrizes.filter(p => (prizeWinnersCountMap.get(p.id) || 0) >= p.quota).length;
  }, [displayedPrizes, prizeWinnersCountMap]);

  const pendingPrizesCount = displayedPrizes.length - completedPrizesCount;

  // Filtered prizes when expanded
  const filteredPrizes = useMemo(() => {
    if (filterMode === 'pending') {
      return displayedPrizes.filter(p => (prizeWinnersCountMap.get(p.id) || 0) < p.quota);
    }
    if (filterMode === 'completed') {
      return displayedPrizes.filter(p => (prizeWinnersCountMap.get(p.id) || 0) >= p.quota);
    }
    return displayedPrizes;
  }, [displayedPrizes, filterMode, prizeWinnersCountMap]);

  // Stepper handlers
  const handlePrevPrize = () => {
    if (isDrawing || currentIndex <= 0) return;
    onSelectPrize(displayedPrizes[currentIndex - 1].id);
  };

  const handleNextPrize = () => {
    if (isDrawing || currentIndex < 0 || currentIndex >= displayedPrizes.length - 1) return;
    onSelectPrize(displayedPrizes[currentIndex + 1].id);
  };

  return (
    <section className="w-full space-y-3">
      {/* Top Row: Pool Tabs + Collapse/Expand Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        {/* Pool Switcher Tabs */}
        <div className="flex items-center gap-2">
          {/* Main Pool Tab */}
          <button
            id="tab-pool-main"
            disabled={isDrawing}
            onClick={() => {
              onSwitchPool('main');
              setFilterMode('all');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
              currentPool === 'main'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/20'
                : 'bg-white text-slate-700 border-amber-200/80 hover:bg-amber-50 hover:text-amber-900'
            }`}
          >
            <Award className={`w-4 h-4 ${currentPool === 'main' ? 'text-amber-200' : 'text-amber-600'}`} />
            <span>正規獎項專區</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentPool === 'main' ? 'bg-rose-700 text-amber-100' : 'bg-amber-100 text-amber-800'
            }`}>
              {mainPrizes.length}
            </span>
            {isMainPoolCompleted && (
              <span className={`flex items-center text-[10px] font-semibold ml-1 ${
                currentPool === 'main' ? 'text-emerald-200' : 'text-emerald-600'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" /> 已全抽完
              </span>
            )}
          </button>

          {/* Bonus Pool Tab */}
          <button
            id="tab-pool-bonus"
            disabled={isDrawing}
            onClick={() => {
              onSwitchPool('bonus');
              setFilterMode('all');
            }}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
              currentPool === 'bonus'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border-amber-400 shadow-sm shadow-amber-500/25'
                : 'bg-white text-slate-700 border-amber-200/80 hover:bg-amber-50 hover:text-amber-900'
            }`}
          >
            <Flame className={`w-4 h-4 ${currentPool === 'bonus' ? 'text-yellow-200' : 'text-amber-600'}`} />
            <span>★ 加碼專區</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              currentPool === 'bonus' ? 'bg-rose-800/80 text-amber-100' : 'bg-amber-100 text-amber-800'
            }`}>
              {bonusPrizes.length}
            </span>
            {isMainPoolCompleted && currentPool !== 'bonus' && (
              <span className="relative flex h-2.5 w-2.5 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Right: Progress Summary & Toggle Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
            <span>進度：</span>
            <span className="font-mono font-bold text-emerald-600">{completedPrizesCount}</span>
            <span>/</span>
            <span className="font-mono text-slate-700">{displayedPrizes.length} 獎項已開出</span>
          </div>

          <button
            onClick={() => setIsExpanded(prev => !prev)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-xs ${
              isExpanded
                ? 'bg-amber-100/80 text-amber-900 border-amber-300 hover:bg-amber-200/80'
                : 'bg-white text-rose-700 border-amber-300 hover:bg-rose-50 hover:border-rose-300'
            }`}
            title={isExpanded ? '收合獎項清單' : '展開全部獎項清單'}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>{isExpanded ? '收合獎項清單' : `展開全部獎項 (${displayedPrizes.length})`}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-amber-700" />
            ) : (
              <ChevronDown className="w-4 h-4 text-rose-600" />
            )}
          </button>
        </div>
      </div>

      {/* COMPACT VIEW (Default when collapsed): Only takes ~65px height */}
      {!isExpanded && currentPrize && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-white to-rose-50/70 border border-amber-300/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Quick Steppers & Active Prize Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Prev Prize Stepper */}
            <button
              onClick={handlePrevPrize}
              disabled={isDrawing || currentIndex <= 0}
              className="p-2 rounded-xl bg-white border border-amber-200 text-slate-600 hover:text-slate-900 hover:bg-amber-50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
              title="上一個獎項"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Current Active Prize Card Preview */}
            <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
              {currentPrize.image ? (
                <img
                  src={currentPrize.image}
                  alt={currentPrize.name}
                  className="w-11 h-11 rounded-xl object-cover border border-amber-300 bg-white shrink-0 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-rose-100 border border-amber-300 flex items-center justify-center shrink-0 text-rose-600 shadow-2xs">
                  <Gift className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono shadow-xs">
                    目前抽獎 #{currentIndex + 1}
                  </span>
                  {currentPrize.isAdditional && (
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-white">
                      特別加碼
                    </span>
                  )}
                  {isCurrentCompleted ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 已全抽完
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.2 rounded-full font-mono">
                      剩餘 {currentRemaining} 名
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {currentPrize.name}
                  </h3>
                  <span className="text-xs text-slate-500 truncate hidden xs:inline" title={currentPrize.content}>
                    • {currentPrize.content}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Prize Stepper */}
            <button
              onClick={handleNextPrize}
              disabled={isDrawing || currentIndex < 0 || currentIndex >= displayedPrizes.length - 1}
              className="p-2 rounded-xl bg-white border border-amber-200 text-slate-600 hover:text-slate-900 hover:bg-amber-50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-xs"
              title="下一個獎項"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Quick Expand Prompt */}
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-200/60">
            <div className="text-xs text-slate-600 font-mono">
              進度：<strong className="text-rose-700 font-bold">{currentDrawnCount}</strong> / {currentPrize.quota} 名
            </div>

            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>查看全部 {displayedPrizes.length} 個獎項</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* EXPANDED VIEW: Shows when isExpanded is true */}
      {isExpanded && (
        <div className="rounded-3xl bg-white border-2 border-amber-300/80 p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
          {/* Header Bar inside Expanded Area */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-rose-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-600" />
                全部獎項總覽 ({displayedPrizes.length} 個獎項)
              </span>
              <span className="text-xs text-slate-600 hidden md:inline">
                • 點選任一卡片可立即切換抽獎舞台
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部 ({displayedPrizes.length})
              </button>
              <button
                onClick={() => setFilterMode('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'pending'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                待抽/進行中 ({pendingPrizesCount})
              </button>
              <button
                onClick={() => setFilterMode('completed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === 'completed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                已抽完 ({completedPrizesCount})
              </button>
            </div>
          </div>

          {/* Prize Cards Grid */}
          {filteredPrizes.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs sm:text-sm">
              此篩選條件下無符合的獎項
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredPrizes.map((prize) => {
                const globalIndex = displayedPrizes.findIndex(p => p.id === prize.id);
                const drawnCount = prizeWinnersCountMap.get(prize.id) || 0;
                const isCompleted = drawnCount >= prize.quota;
                const isSelected = selectedPrizeId === prize.id;
                const remaining = Math.max(0, prize.quota - drawnCount);
                const isBonus = prize.poolType === 'bonus' || prize.isAdditional;

                return (
                  <button
                    key={prize.id}
                    id={`prize-card-${prize.id}`}
                    disabled={isDrawing}
                    onClick={() => {
                      onSelectPrize(prize.id);
                    }}
                    className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-b from-rose-50/90 to-amber-50/50 border-rose-500 shadow-md shadow-rose-600/10 ring-2 ring-rose-400 -translate-y-1'
                        : isCompleted
                        ? 'bg-slate-50/90 border-slate-200/80 text-slate-400 hover:border-slate-300'
                        : 'bg-white border-amber-200/80 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 text-slate-800'
                    } ${isDrawing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Top tag */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className={`text-[11px] font-mono font-bold ${isSelected ? 'text-rose-600' : 'text-slate-400'}`}>
                        #{globalIndex + 1}
                      </span>

                      {isBonus ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          <Flame className="w-2.5 h-2.5 text-amber-600" />
                          加碼
                        </span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          已抽完
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold font-mono">
                          剩 {remaining}
                        </span>
                      )}
                    </div>

                    {/* Prize Name, Content & Optional Image */}
                    <div className="flex items-center gap-2.5 min-h-[48px]">
                      {prize.image && (
                        <img
                          src={prize.image}
                          alt={prize.name}
                          className="w-10 h-10 rounded-xl object-cover border border-amber-300/80 bg-amber-50/50 shrink-0 shadow-2xs"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-sm font-black truncate font-display ${
                          isSelected ? 'text-rose-700' : isCompleted ? 'text-slate-500' : 'text-slate-900 group-hover:text-rose-600'
                        }`}>
                          {prize.name}
                        </h3>
                        <p className={`text-xs truncate mt-0.5 ${
                          isSelected ? 'text-rose-900 font-medium' : 'text-slate-500'
                        }`} title={prize.content}>
                          {prize.content}
                        </p>
                      </div>
                    </div>

                    {/* Bottom quota bar */}
                    <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                      isSelected ? 'border-rose-200 text-rose-800' : 'border-slate-100 text-slate-400'
                    }`}>
                      <span>抽獎進度</span>
                      <span className={`font-mono font-bold ${
                        isCompleted 
                          ? 'text-emerald-600' 
                          : isSelected 
                          ? 'text-rose-700' 
                          : 'text-slate-700'
                      }`}>
                        {drawnCount}/{prize.quota}
                      </span>
                    </div>

                    {/* Selection indicator pill */}
                    {isSelected && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-xs ring-1 ring-white">
                        目前抽獎
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bottom collapse trigger inside expanded view */}
          <div className="pt-2 border-t border-amber-100 flex justify-center">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-all cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
              <span>收合獎項清單（專注抽獎舞台）</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
