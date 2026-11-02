import React from 'react';
import { Prize } from '../types';
import { Layers, Sparkles, Trophy, CheckCircle, RotateCcw, HeartHandshake, X, ChevronRight, Gift } from 'lucide-react';
import { Mascot } from './Mascot';
import { GoldIngot, LuckyLantern } from './FestiveIllustrations';

interface RoundTransitionModalProps {
  isOpen: boolean;
  completedRound: number;
  nextRound: number;
  totalEmployees: number;
  currentPrize?: Prize | null;
  currentPrizeRemainingQuota: number;
  onClose: () => void;
  onConfirmNextRound: () => void;
  onAdjustPrizeQuota?: () => void;
  onSwitchToBonus?: () => void;
  isReadonly?: boolean; // When opened from badge just to review rules
}

export const RoundTransitionModal: React.FC<RoundTransitionModalProps> = ({
  isOpen,
  completedRound = 1,
  nextRound = 2,
  totalEmployees,
  currentPrize,
  currentPrizeRemainingQuota,
  onClose,
  onConfirmNextRound,
  onAdjustPrizeQuota,
  onSwitchToBonus,
  isReadonly = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-transition-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white border-2 border-amber-300 rounded-3xl shadow-2xl overflow-hidden text-slate-800 ring-4 ring-amber-200/50 max-h-[94vh] flex flex-col">
        {/* Top Decorative Festive Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-amber-400 via-rose-500 to-amber-400 shrink-0" />

        {/* Floating Lantern Decorations */}
        <div className="absolute top-4 left-4 pointer-events-none hidden sm:block opacity-75">
          <LuckyLantern size={36} />
        </div>
        <div className="absolute top-4 right-14 pointer-events-none hidden sm:block opacity-75">
          <LuckyLantern size={36} />
        </div>

        {/* Close Button in Header */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
          title="關閉彈窗"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto px-5 sm:px-8 pt-6 pb-6 space-y-5">
          {/* Header Trophy & Mascot Celebration */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              <Mascot
                state="celebrate"
                size={84}
                speechText="第 1 輪全員人人有獎達成！🎉"
                speechSide="top"
                className="filter drop-shadow-md"
              />
              <div className="absolute -left-6 top-3 pointer-events-none hidden sm:block">
                <GoldIngot size={28} className="animate-bounce-subtle" />
              </div>
              <div className="absolute -right-6 top-3 pointer-events-none hidden sm:block">
                <GoldIngot size={28} className="animate-bounce-subtle" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 text-rose-800 text-xs sm:text-sm font-black border border-amber-300 shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>全體同仁 100% 圓滿獲獎達成！</span>
            </div>

            <h3
              id="round-transition-modal-title"
              className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex flex-col sm:flex-row items-center justify-center gap-1.5"
            >
              <span className="text-rose-600">🎉 第 {completedRound} 輪抽獎圓滿結束！</span>
              <span className="text-amber-800 font-display">即將開啟【第 {nextRound} 輪平準抽獎】</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
              現場全體同仁皆已至少抽中 1 份獎品！目前獎項尚有名額，系統已自動為您就緒
              <strong className="text-rose-700 font-bold">「平準輪次抽獎保護機制」</strong>，讓同仁有公平第二次中獎機會，且絕不超抽連莊！
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-gradient-to-br from-amber-50 via-rose-50/50 to-amber-50 p-3 sm:p-4 rounded-2xl border border-amber-200">
            <div className="text-center">
              <div className="text-[11px] font-bold text-slate-500">第 1 輪獲獎人數</div>
              <div className="text-lg sm:text-2xl font-black text-emerald-600 font-mono mt-0.5">
                {totalEmployees} <span className="text-xs text-slate-400 font-normal">位</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">人人有獎 100%</div>
            </div>

            <div className="text-center border-x border-amber-200/80 px-1">
              <div className="text-[11px] font-bold text-slate-500">本獎項尚餘名額</div>
              <div className="text-lg sm:text-2xl font-black text-rose-600 font-mono mt-0.5">
                {currentPrizeRemainingQuota} <span className="text-xs text-slate-400 font-normal">份</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate" title={currentPrize?.name}>
                {currentPrize?.name || '當前獎項'}
              </div>
            </div>

            <div className="text-center">
              <div className="text-[11px] font-bold text-slate-500">第 2 輪候選人數</div>
              <div className="text-lg sm:text-2xl font-black text-amber-700 font-mono mt-0.5">
                {totalEmployees} <span className="text-xs text-slate-400 font-normal">位</span>
              </div>
              <div className="text-[10px] text-amber-800 font-semibold">全員解鎖再抽</div>
            </div>
          </div>

          {/* Three Core Rules of Fair Round */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 space-y-2.5 text-left">
            <div className="flex items-center gap-2 text-emerald-900 font-black text-sm sm:text-base border-b border-emerald-200 pb-2">
              <Layers className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>🛡️ 第 2 輪平準抽獎核心公平規則（三大保證）</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs text-slate-700">
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1. 全員名單全面解鎖</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    全體同仁（<strong>包含第 1 輪愛心捐出與缺席同仁</strong>）全數重返抽籤池，獲得再抽機會！
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>2. 每人本輪限中 1 次</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    第一輪已得獎者第 2 輪最多拿第 2 份；第一輪捐出／缺席者最多拿 1 份，<strong>絕不連莊超抽</strong>！
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-bold text-emerald-800 flex items-center gap-1 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>3. 差距永不超過 1 份</span>
                  </div>
                  <p className="leading-relaxed text-slate-600">
                    實質保有之獎項差距永遠 $\le 1$ 份，直到全員皆滿 2 獎才會推進至第 3 輪。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Guidance Callout */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-950">
            <span className="text-base">💡</span>
            <div className="leading-relaxed">
              <strong>主持人現場話術建議：</strong>
              「感謝大家！第一輪人人有獎已全部開出！現在還有剩餘的名額，我們正式開啟『第 2 輪平準抽獎』，剛才捐出的同仁也可以再抽一次喔！大家準備好了嗎～！」
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onAdjustPrizeQuota && currentPrizeRemainingQuota > 0 && !isReadonly && (
              <button
                type="button"
                id="btn-transition-adjust-quota"
                onClick={() => {
                  onAdjustPrizeQuota();
                  onClose();
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="直接將此獎項名額調整為目前已抽出的數量，乾淨結案此獎項"
              >
                <Trophy className="w-3.5 h-3.5 text-slate-500" />
                <span>結案本獎項 (名額調為已抽數)</span>
              </button>
            )}

            {onSwitchToBonus && !isReadonly && (
              <button
                type="button"
                id="btn-transition-switch-bonus"
                onClick={() => {
                  onSwitchToBonus();
                  onClose();
                }}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="將剩餘獎品保留，直接轉入老闆加碼專區"
              >
                <Gift className="w-3.5 h-3.5 text-rose-500" />
                <span>轉入加碼專區</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="btn-confirm-next-round"
              onClick={() => {
                onConfirmNextRound();
                onClose();
              }}
              className="w-full sm:w-auto festive-primary-btn px-7 py-3 rounded-2xl font-black text-sm sm:text-base text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ring-2 ring-amber-300"
            >
              <Sparkles className="w-5 h-5 text-amber-200" />
              <span>{isReadonly ? '確認並繼續抽獎' : `🚀 確認開啟第 ${nextRound} 輪平準抽獎！`}</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
