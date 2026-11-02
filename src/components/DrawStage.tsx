import React, { useState, useEffect, useRef } from 'react';
import { Employee, Prize, WinningRecord, DonationRecord, CelebrationEffectType, RepeatWinningMode } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { triggerCelebrationEffect } from '../utils/confettiHelper';
import { drawRandomWinners, getSecureRandomInt } from '../utils/lotteryRandom';
import { DonatePrizeModal } from './DonatePrizeModal';
import { 
  Play, 
  Sparkles, 
  Award, 
  RotateCcw, 
  Gift,
  Check,
  Flame,
  Building2,
  HeartHandshake,
  CheckCircle2,
  Users,
  AlertTriangle,
  Layers,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot } from './Mascot';
import { GoldIngot, RedPacket, LotteryBall, SparkleStar } from './FestiveIllustrations';

interface DrawStageProps {
  currentPrize: Prize | null;
  candidates: Employee[];
  winningRecords: WinningRecord[];
  donations?: DonationRecord[];
  absentRecords?: import('../types').AbsentRecord[];
  onInspectCandidates?: () => void;
  onAddWinners: (winners: WinningRecord[]) => void;
  onReplaceAbsentee: (record: WinningRecord | string, reason?: string, onCompleted?: (newRecord: WinningRecord) => void) => void;
  onDonatePrize?: (record: WinningRecord, options?: { note?: string }) => void;
  allowRepeatWinning: boolean;
  repeatWinningMode?: RepeatWinningMode;
  currentDrawRound?: number;
  onToggleAllowRepeat: () => void;
  onSetRepeatWinningMode?: (mode: RepeatWinningMode) => void;
  currentPool: 'main' | 'bonus';
  onSwitchToBonus?: () => void;
  isMainPoolCompleted?: boolean;
  onOpenAdditional?: () => void;
  onGoToWall?: () => void;
  onGoToAdmin?: () => void;
  onAdjustPrizeQuota?: (prizeId: string, newQuota: number) => void;

  // New settings parameters
  drawDurationSeconds?: number;
  celebrationEffect?: CelebrationEffectType;
  activityTitle?: string;

  // Round transition modal props
  acknowledgedRound?: number;
  isNextRoundModalOpen?: boolean;
  onOpenNextRoundModal?: (readonly?: boolean) => void;
  onConfirmNextRound?: () => void;
}

export const DrawStage: React.FC<DrawStageProps> = ({
  currentPrize,
  candidates,
  winningRecords,
  donations = [],
  absentRecords = [],
  onInspectCandidates,
  onAddWinners,
  onReplaceAbsentee,
  onDonatePrize,
  allowRepeatWinning,
  repeatWinningMode = 'none',
  currentDrawRound = 1,
  onToggleAllowRepeat,
  onSetRepeatWinningMode,
  currentPool,
  onSwitchToBonus,
  isMainPoolCompleted,
  onOpenAdditional,
  onGoToWall,
  onGoToAdmin,
  onAdjustPrizeQuota,
  drawDurationSeconds = 3.2,
  celebrationEffect = 'random',
  activityTitle,
  acknowledgedRound = 1,
  isNextRoundModalOpen = false,
  onOpenNextRoundModal,
  onConfirmNextRound,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [displayCandidate, setDisplayCandidate] = useState<Employee | null>(null);
  const [batchCount, setBatchCount] = useState<number>(1);
  const [latestWinners, setLatestWinners] = useState<WinningRecord[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [selectedDonationRecord, setSelectedDonationRecord] = useState<WinningRecord | null>(null);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  const rollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Remaining quota for the selected prize
  const prizeWinners = winningRecords.filter(r => r.prizeId === currentPrize?.id);
  const totalQuota = currentPrize?.quota || 0;
  const drawnCount = prizeWinners.length;
  const remainingQuota = currentPrize ? Math.max(0, currentPrize.quota - drawnCount) : 0;
  const isCompleted = currentPrize ? remainingQuota === 0 : false;
  const isPoolExhausted = Boolean(currentPrize && remainingQuota > 0 && candidates.length === 0);

  // Cleanup rolling on unmount
  useEffect(() => {
    return () => {
      if (rollingTimerRef.current) clearTimeout(rollingTimerRef.current);
      soundEffects.stopRollingSound();
    };
  }, []);

  // Reset candidate preview when prize changes (do not display any employee name initially)
  useEffect(() => {
    setDisplayCandidate(null);
  }, [currentPrize?.id]);

  // Adjust batch count if remaining quota is smaller
  useEffect(() => {
    if (remainingQuota > 0 && batchCount > remainingQuota) {
      setBatchCount(Math.min(batchCount, remainingQuota));
    }
  }, [remainingQuota, batchCount]);

  // Synchronize batch count when switching prizes based on drawMethod
  useEffect(() => {
    if (currentPrize) {
      if (currentPrize.drawMethod === 'batch') {
        const target = remainingQuota > 0 ? remainingQuota : currentPrize.quota;
        setBatchCount(target > 0 ? target : 1);
      } else {
        setBatchCount(1);
      }
    }
  }, [currentPrize?.id]);

  // Handle keyboard shortcut (Space to start automated roll)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const activeElement = document.activeElement;
        const isInputField = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
        if (!isInputField) {
          e.preventDefault();
          if (!isDrawing && !isCompleted && candidates.length > 0 && currentPrize) {
            handleStartDraw();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, isCompleted, candidates, currentPrize, batchCount, remainingQuota]);

  // Execute the Automated Timed Draw Roll
  const handleStartDraw = () => {
    if (!currentPrize || candidates.length === 0 || remainingQuota <= 0) return;

    const actualCount = Math.min(batchCount, remainingQuota, candidates.length);
    if (actualCount <= 0) return;

    setIsDrawing(true);
    soundEffects.startRollingSound();

    const startTime = Date.now();
    const durationMs = Math.max(1200, (drawDurationSeconds || 3.2) * 1000);

    const runRoll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Random candidate display during roll
      const randomIndex = getSecureRandomInt(candidates.length);
      setDisplayCandidate(candidates[randomIndex]);
      soundEffects.playTick();

      if (progress < 1) {
        const interval = progress < 0.7 ? 60 : 60 + (progress - 0.7) * 350;
        rollingTimerRef.current = setTimeout(runRoll, interval);
      } else {
        // Stop roll sound
        soundEffects.stopRollingSound();
        setIsDrawing(false);

        // Pick winners objectively using Fisher-Yates algorithm & Web Crypto
        const selectedEmployees = drawRandomWinners<Employee>(candidates, actualCount);

        const newRecords: WinningRecord[] = selectedEmployees.map(emp => ({
          id: `win-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          prizeId: currentPrize.id,
          prizeName: currentPrize.name,
          prizeContent: currentPrize.content,
          prizeImage: currentPrize.image,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeNo: emp.empNo,
          department: emp.department,
          timestamp: Date.now(),
          poolType: currentPrize.poolType,
          isAdditional: currentPrize.isAdditional,
        }));

        setDisplayCandidate(selectedEmployees[selectedEmployees.length - 1]);
        setLatestWinners(newRecords);
        setShowWinnerModal(true);

        // Save winners to global state
        onAddWinners(newRecords);

        // Fanfare Sound & Celebration Effect
        soundEffects.playFanfare();
        triggerCelebrationEffect(celebrationEffect);
      }
    };

    runRoll();
  };

  return (
    <div className="relative w-full rounded-3xl bg-white border-2 border-amber-300/80 p-5 sm:p-8 shadow-[0_16px_40px_-8px_rgba(225,29,72,0.08),0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300">
      
      {/* Decorative subtle festive top line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 via-rose-500 to-amber-400" />

      {/* Main Pool Completed Alert Notice */}
      {currentPool === 'main' && isMainPoolCompleted && onSwitchToBonus && (
        <div className="relative mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white font-black shadow-sm text-lg">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-rose-900 flex items-center gap-2">
                🎉 正規獎項已全數抽完！
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 font-bold">
                  階段達成
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                是否切換至「加碼專區」？資格將重置全體同仁名單（維持加碼池一人一獎）。
              </p>
            </div>
          </div>
          <button
            onClick={onSwitchToBonus}
            className="festive-gold-btn px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer"
          >
            前往老闆加碼專區 ➜
          </button>
        </div>
      )}

      {/* Top Banner: Current Prize Info & Image */}
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-amber-200/80">
        <div className="flex items-start sm:items-center gap-4">
          {/* Optional Prize Image with glowing gold frame */}
          {currentPrize?.image && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-amber-300 bg-amber-50/50 overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-amber-200">
              <img
                src={currentPrize.image}
                alt={currentPrize.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {activityTitle && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-xs flex items-center gap-1">
                  🏮 {activityTitle}
                </span>
              )}

              <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full border ${
                currentPool === 'bonus'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-rose-100 text-rose-900 border-rose-200 shadow-xs'
              }`}>
                {currentPool === 'bonus' ? '★ 老闆加碼專區' : '正規抽獎專區'}
              </span>

              {currentPrize?.isAdditional && (
                <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white border border-amber-300 flex items-center gap-1 shadow-xs animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-yellow-200" />
                  現場特別加碼
                </span>
              )}

              <span className="text-xs sm:text-sm text-emerald-800 font-bold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                {currentPool === 'bonus' ? '加碼候選池 ' : '正規候選池 '}
                <strong className="text-emerald-700 font-mono font-black text-sm sm:text-base ml-1">{candidates.length}</strong> 人
              </span>

              {(() => {
                const poolDonatedCount = (donations || []).filter(d => currentPool === 'bonus' ? d.fromPool === 'bonus' : d.fromPool !== 'bonus').length;
                if (poolDonatedCount === 0) return null;
                return (
                  <span className="text-xs sm:text-sm text-amber-800 font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 flex items-center gap-1" title="同仁好意捐出獎項後，名額已釋出重抽，捐出人已自此獎池名單中標記排除，不可再抽此獎池其他獎品">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                    已排除 {poolDonatedCount} 位捐出者
                  </span>
                );
              })()}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2 flex items-center gap-3 font-display">
              {currentPrize ? currentPrize.name : '請先建立或選擇獎項'}
            </h2>

            <div className="flex items-center gap-2 mt-1 flex-wrap text-slate-600 text-sm sm:text-base font-medium">
              <span>獎品內容：</span>
              <span className="text-rose-700 font-bold">{currentPrize ? currentPrize.content : '尚無獎項設定'}</span>
              {currentPrize && (
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {currentPrize.drawMethod === 'batch' ? '👥 一次抽出' : '⚡ 逐次抽出'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Big High-Visibility Metric Boxes */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
          {onOpenAdditional && (
            <button
              onClick={onOpenAdditional}
              className="festive-pink-btn flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              title="現場臨時追加加碼獎項"
            >
              <Flame className="w-4 h-4 text-white" />
              <span>+ 現場加碼</span>
            </button>
          )}

          {onGoToWall && winningRecords.length > 0 && (
            <button
              onClick={onGoToWall}
              className="festive-emerald-btn flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              title="前往中獎星光榜查看完整名單"
            >
              <Award className="w-4 h-4 text-white" />
              <span>星光榜 ({winningRecords.length}) ➜</span>
            </button>
          )}

          {/* Enormously Enlarged Quota Counter */}
          <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-amber-50 border-2 border-rose-300 shadow-xs text-right min-w-[130px] relative">
            {allowRepeatWinning && repeatWinningMode === 'fair_round' && currentDrawRound > 1 && (
              <button
                type="button"
                onClick={() => onOpenNextRoundModal && onOpenNextRoundModal(true)}
                className="absolute -top-3 right-2 px-2.5 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-xs flex items-center gap-1 border border-emerald-300 cursor-pointer active:scale-95 transition-all"
                title="點擊查看第 2 輪平準抽獎規則說明"
              >
                <Layers className="w-3 h-3 text-emerald-200" />
                <span>第 {currentDrawRound} 輪平準中獎 (查看說明 ℹ️)</span>
              </button>
            )}
            <div className="text-xs sm:text-sm font-bold text-rose-800 tracking-wider flex items-center justify-end gap-1">
              <span>剩餘抽獎名額</span>
            </div>
            <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
              <span className="text-3xl sm:text-5xl font-black font-mono text-rose-600">
                {remainingQuota}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-400 font-mono">
                / {totalQuota}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-medium">
              已抽出 {drawnCount} 名
            </div>
          </div>
        </div>
      </div>

      {/* Centerpiece: Dynamic Rolling Display Slot with Retro Carnival Marquee Light Bulbs & Mascot */}
      <div className="relative my-7 sm:my-9 flex flex-col items-center justify-center">
        
        {/* Responsive Mascot Cheering Station Flanking the Stage */}
        <div className="hidden md:flex flex-col items-center absolute -left-20 lg:-left-24 top-1/2 -translate-y-1/2 z-20">
          <Mascot
            state={isDrawing ? 'drawing' : isCompleted ? 'celebrate' : candidates.length === 0 ? 'empty' : 'ready'}
            size={76}
            speechText={
              isDrawing
                ? '好運轉轉轉～！'
                : isCompleted
                ? '大獎開出囉！🎉'
                : isPoolExhausted
                ? '同仁已全員獲獎！'
                : allowRepeatWinning && repeatWinningMode === 'fair_round' && currentDrawRound > 1
                ? `第 ${currentDrawRound} 輪平準抽獎！`
                : candidates.length === 0
                ? '等待名單匯入中'
                : '準備抽大獎！'
            }
            speechSide="top"
          />
        </div>

        {/* Right Festive Illustration Cluster */}
        <div className="hidden md:flex flex-col items-center gap-3 absolute -right-16 lg:-right-20 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <GoldIngot size={42} className="animate-bounce-subtle" />
          <LotteryBall size={38} number="福" color="gold" className="animate-pulse" />
          <RedPacket size={36} className="transform rotate-12" />
        </div>

        {/* Mobile Mascot Dock */}
        <div className="md:hidden flex items-center justify-center gap-3 mb-2">
          <Mascot
            state={isDrawing ? 'drawing' : isCompleted ? 'celebrate' : candidates.length === 0 ? 'empty' : 'ready'}
            size={48}
          />
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            {isDrawing
              ? '好運轉轉轉～！'
              : isCompleted
              ? '本獎名額全開出！🎉'
              : isPoolExhausted
              ? '全員已獲獎！'
              : allowRepeatWinning && repeatWinningMode === 'fair_round' && currentDrawRound > 1
              ? `第 ${currentDrawRound} 輪平準抽獎！`
              : '準備抽大獎！'}
          </span>
          <GoldIngot size={28} />
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <div className={`relative rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-rose-600 via-red-600 to-amber-500 shadow-xl shadow-rose-900/15 ring-4 ring-amber-300/80 transition-all ${
            isDrawing ? 'marquee-fast ring-yellow-300 scale-[1.01]' : ''
          }`}>
            
            {/* Top Row of Marquee Carnival Bulbs */}
            <div className="flex justify-between items-center px-3 mb-2.5">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={`top-bulb-${idx}`}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-amber-900/40 transition-all ${
                    idx % 2 === 0 ? 'marquee-bulb-odd' : 'marquee-bulb-even'
                  }`}
                />
              ))}
            </div>

            <div className="relative rounded-2xl bg-gradient-to-b from-[#881324] via-[#9f1239] to-[#881324] px-6 py-10 sm:py-12 text-center flex flex-col items-center justify-center overflow-hidden border-2 border-amber-300/60 shadow-inner">
              
              {/* Spinning visual pulse effects during active draw */}
              {isDrawing && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-pulse pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300" />
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300" />
                </>
              )}

              {/* Status pill */}
              <div className="mb-4">
                {isDrawing ? (
                  <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-black bg-gradient-to-r from-amber-300 to-yellow-400 text-amber-950 border-2 border-white animate-pulse shadow-md">
                    <Sparkles className="w-4 h-4 text-amber-950 animate-spin" />
                    高速滾動開獎中... ({drawDurationSeconds}秒客觀定格)
                  </span>
                ) : isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-900/90 text-emerald-100 border border-emerald-400/60 shadow-md">
                    <Check className="w-4 h-4 text-emerald-300" />
                    本獎項名額已全部開出
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-red-950/70 text-amber-200 border border-amber-300/60 shadow-xs">
                    🏮 準備開獎（點擊下方開始或按下空白鍵）
                  </span>
                )}
              </div>

              {/* Rolling candidate name with Grand High-Contrast Typography */}
              <div className="min-h-[130px] sm:min-h-[160px] flex flex-col items-center justify-center">
                {displayCandidate ? (
                  <motion.div
                    key={displayCandidate.id}
                    initial={{ opacity: 0.85, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.05 }}
                    className="flex flex-col items-center"
                  >
                    <div className="text-5xl sm:text-7xl font-black tracking-tight text-white font-display filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                      {displayCandidate.name}
                    </div>

                    <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
                      <span className="px-4 py-1.5 rounded-full text-sm sm:text-base font-bold bg-white text-slate-900 border border-amber-300 font-mono shadow-sm">
                        員編：{displayCandidate.empNo}
                      </span>
                      <span className="px-4 py-1.5 rounded-full text-sm sm:text-base font-bold bg-amber-400 text-amber-950 border border-amber-300 shadow-sm">
                        {displayCandidate.department}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
                      <Sparkles className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="text-3xl sm:text-5xl font-black text-amber-200 font-display tracking-wider drop-shadow-md">
                      等待開獎中
                    </div>
                    <div className="text-xs sm:text-sm text-rose-100/90 font-medium text-center px-4">
                      {candidates.length === 0
                        ? isPoolExhausted
                          ? `全體合格同仁已獲獎！尚餘 ${remainingQuota} 份名額，可解除限制重複抽或調整名額結案`
                          : '目前候選名單為空，請至後台匯入名冊'
                        : '點擊下方開始按鈕或按空白鍵 Space 開始抽獎'}
                    </div>
                  </div>
                )}
              </div>

              {/* Sub hint */}
              <div className="mt-4 text-xs sm:text-sm text-rose-100/90 font-medium">
                {isDrawing ? (
                  <span className="text-amber-200 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    輪盤轉動中... 系統將於 {drawDurationSeconds} 秒後揭曉得主！
                  </span>
                ) : (
                  <span>
                    🧧 點擊「開始抽獎」即啟動輪盤自動客觀滾動定格 • 支援按空白鍵 [Space] 快速啟動
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row of Marquee Carnival Bulbs */}
            <div className="flex justify-between items-center px-3 mt-2.5">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={`bot-bulb-${idx}`}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-amber-900/40 transition-all ${
                    idx % 2 === 1 ? 'marquee-bulb-odd' : 'marquee-bulb-even'
                  }`}
                />
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* 待開啟第 2 輪平準抽獎提示卡片 */}
      {(acknowledgedRound ?? 1) < 2 && currentDrawRound >= 2 && remainingQuota > 0 && currentPrize && (
        <div className="w-full max-w-3xl mx-auto mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300 shadow-lg text-slate-800 text-left animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shrink-0 mt-0.5">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-black text-base sm:text-lg text-rose-950 flex items-center gap-2">
                  <span>🎉 第 1 輪全員已圓滿獲獎！本獎項尚有 <strong className="font-mono text-rose-600 text-xl">{remainingQuota}</strong> 份獎品未抽出</span>
                </h4>
                <span className="text-xs px-3 py-1 bg-amber-200 text-amber-900 font-bold rounded-full border border-amber-300">
                  人人有獎 100% 達成
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                全體同仁皆已至少抽中 1 份獎品。系統已就緒「第 2 輪平準抽獎」，全員（含第 1 輪捐出與缺席同仁）將全面解鎖重返獎池，每人本輪限中 1 次！
              </p>
              
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  id="btn-trigger-round2-modal"
                  onClick={() => onOpenNextRoundModal && onOpenNextRoundModal(false)}
                  className="festive-primary-btn px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all ring-2 ring-amber-300"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>👉 彈出確認視窗，開啟第 2 輪平準抽獎！</span>
                </button>

                {onAdjustPrizeQuota && (
                  <button
                    type="button"
                    id="btn-adjust-quota-round1-done"
                    onClick={() => {
                      if (window.confirm(`確定將「${currentPrize.name}」的名額由 ${currentPrize.quota} 份調降為已抽出的 ${drawnCount} 份並直接結案嗎？`)) {
                        onAdjustPrizeQuota(currentPrize.id, drawnCount);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <span>結案本獎項 (名額調為已抽數)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pool Exhausted Guidance Card (當獎池抽完但獎品未完時提供一鍵應對方案) */}
      {isPoolExhausted && currentPrize && !((acknowledgedRound ?? 1) < 2 && currentDrawRound >= 2) && (
        <div className="w-full max-w-3xl mx-auto mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300/90 shadow-md text-slate-800 text-left">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-black text-base sm:text-lg text-amber-950 flex items-center gap-2">
                  <span>獎池同仁已全數獲獎，本獎項尚有 <strong className="font-mono text-rose-600 text-xl">{remainingQuota}</strong> 份獎品未抽出！</span>
                </h4>
                <span className="text-xs px-3 py-1 bg-amber-200/80 text-amber-900 font-bold rounded-full border border-amber-300">
                  已抽出 {drawnCount} / {currentPrize.quota} 份
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                在「一人一獎限制」下，合格同仁已全數獲獎。現場若有剩餘獎項，可選擇以下常見處理方式繼續活動：
              </p>
              
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {/* 方案 1: 開啟平準第二輪（推薦首選） */}
                <button
                  type="button"
                  id="btn-exhausted-fair-round"
                  onClick={() => {
                    if (onOpenNextRoundModal) onOpenNextRoundModal(false);
                    else if (onSetRepeatWinningMode) onSetRepeatWinningMode('fair_round');
                    else onToggleAllowRepeat();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:to-teal-700 shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all ring-2 ring-emerald-300"
                  title="最公平！全員皆可抽剩餘獎品，但每人在本輪限中一次；已中第二獎者自動排除，直到所有人皆滿 2 獎才開第三輪，絕不超抽連莊！"
                >
                  <Layers className="w-4 h-4 text-emerald-200" />
                  <span>彈出確認視窗：開啟第 2 輪平準抽獎（推薦首選）</span>
                </button>

                {/* 方案 1-B: 自由模式完全不限 */}
                <button
                  type="button"
                  id="btn-exhausted-unlimited"
                  onClick={() => {
                    if (onSetRepeatWinningMode) onSetRepeatWinningMode('unlimited');
                    else onToggleAllowRepeat();
                  }}
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  title="完全解除限制，手氣好者可能連中 3 次以上"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-700" />
                  <span>自由模式：不限重複次數</span>
                </button>

                {/* 方案 2: 一鍵調降配額結案 */}
                {onAdjustPrizeQuota && (
                  <button
                    type="button"
                    id="btn-exhausted-adjust-quota"
                    onClick={() => {
                      if (window.confirm(`確定將「${currentPrize.name}」的名額由 ${currentPrize.quota} 份調降為已抽出的 ${drawnCount} 份並直接結案嗎？\n\n剩餘 ${remainingQuota} 份獎品可轉為人人有獎伴手禮、活動公基金或留在最後驚喜抽。`)) {
                        onAdjustPrizeQuota(currentPrize.id, drawnCount);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-300/80 border border-amber-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    title="將獎項總名額調整為已抽出數量，此獎項即刻標記為已抽完"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span>此獎結案：名額調整為已抽數 ({drawnCount}份)</span>
                  </button>
                )}

                {/* 方案 3: 前往後台追加名單 */}
                {onGoToAdmin && (
                  <button
                    type="button"
                    id="btn-exhausted-goto-admin"
                    onClick={onGoToAdmin}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    title="前往後台名冊管理，追加匯入現場同仁、眷屬或特別嘉賓名冊"
                  >
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>前往後台追加名單 (眷屬/貴賓)</span>
                  </button>
                )}

                {/* 方案 4: 切換至加碼專區 */}
                {currentPool === 'main' && onSwitchToBonus && (
                  <button
                    type="button"
                    id="btn-exhausted-goto-bonus"
                    onClick={onSwitchToBonus}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    title="切換至現場加碼專區，正規獎項已中獎者在加碼池依然擁有完整抽獎資格"
                  >
                    <Flame className="w-4 h-4 text-rose-600" />
                    <span>前往現場加碼專區</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Station: Quantity Selector & Start Button */}
      <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 pt-6 border-t border-amber-200/80">
        
        {/* Quick Batch Quantity Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm text-slate-700 font-bold">單次抽出名額：</span>
          <div className="flex items-center gap-1.5 bg-amber-50/80 p-1.5 rounded-2xl border border-amber-200/90">
            {[1, 3, 5, 10].map(num => (
              <button
                key={num}
                id={`btn-batch-${num}`}
                disabled={isDrawing || remainingQuota < num}
                onClick={() => setBatchCount(num)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  batchCount === num
                    ? 'festive-gold-btn shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 disabled:opacity-30'
                }`}
              >
                {num} 位
              </button>
            ))}

            {remainingQuota > 1 && (
              <button
                id="btn-batch-all"
                disabled={isDrawing}
                onClick={() => setBatchCount(remainingQuota)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  batchCount === remainingQuota
                    ? 'festive-gold-btn shadow-xs'
                    : 'text-amber-800 hover:text-amber-950 font-bold'
                }`}
              >
                全抽 ({remainingQuota})
              </button>
            )}
          </div>
        </div>

        {/* Hero Automated Draw Action Button */}
        <div className="flex items-center gap-3">
          {!isDrawing ? (
            <button
              id="btn-start-draw"
              disabled={isCompleted || candidates.length === 0 || !currentPrize}
              onClick={handleStartDraw}
              className="festive-primary-btn flex items-center gap-3 px-10 py-4 sm:px-14 sm:py-5 rounded-2xl font-black text-lg sm:text-xl transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-rose-600/30 cursor-pointer ring-4 ring-amber-300/80"
              title="一鍵啟動自動滾動抽獎（系統客觀定格，杜絕人為作弊）"
            >
              <Play className="w-6 h-6 fill-white text-white" />
              <span>開始抽獎（自動滾動）</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/20 text-white">Space</span>
            </button>
          ) : (
            <div
              id="btn-rolling-draw"
              className="flex items-center gap-3 px-10 py-4 sm:px-12 sm:py-5 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 border-2 border-yellow-200 shadow-xl shadow-rose-600/30 select-none animate-pulse"
            >
              <RotateCcw className="w-6 h-6 animate-spin text-white" />
              <span>輪盤高速開獎中...（自動定格）</span>
            </div>
          )}
        </div>
      </div>

      {/* Winner Reveal Modal Stage */}
      <AnimatePresence>
        {showWinnerModal && latestWinners.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white border-2 border-amber-300 rounded-3xl p-5 sm:p-7 shadow-2xl text-center ring-4 ring-amber-200/50 max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Top hairline */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500" />

              {/* Header Trophy & Mascot Celebration Banner */}
              <div className="flex-shrink-0 pt-2 flex flex-col items-center">
                <div className="relative mb-2">
                  <Mascot
                    state="celebrate"
                    size={80}
                    speechText="恭喜幸運得獎同仁！🎉"
                    speechSide="top"
                    className="filter drop-shadow-md"
                  />
                  <div className="absolute -left-8 top-2 pointer-events-none hidden sm:block">
                    <GoldIngot size={32} className="animate-bounce-subtle" />
                  </div>
                  <div className="absolute -right-8 top-2 pointer-events-none hidden sm:block">
                    <RedPacket size={30} className="transform rotate-12" />
                  </div>
                </div>

                <div className="text-xs uppercase tracking-widest text-amber-700 font-black mb-1">
                  CONGRATULATIONS • 金榜題名 恭喜中獎
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                  {currentPrize?.name} 得獎名單揭曉！
                </h3>

                {/* Prize Details & Image in Modal */}
                <div className="mt-2 flex items-center justify-center gap-3 text-slate-600 text-xs sm:text-sm flex-wrap">
                  {currentPrize?.image && (
                    <img
                      src={currentPrize.image}
                      alt={currentPrize.name}
                      className="w-9 h-9 rounded-lg object-cover border border-amber-300 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span>獎品內容：<strong className="text-rose-700 font-bold">{currentPrize?.content}</strong></span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-mono">
                    本次抽出 {latestWinners.length} 位
                  </span>
                </div>
              </div>

              {/* Winners Table Presentation */}
              <div className="my-5 overflow-hidden rounded-2xl border border-amber-200 shadow-xs bg-white flex-1 flex flex-col min-h-0">
                <div className="overflow-y-auto overflow-x-auto max-h-[46vh] flex-1">
                  <table className="w-full text-left text-sm text-slate-800 border-collapse">
                    <thead className="bg-amber-50/80 text-amber-900 uppercase text-xs sm:text-sm font-bold border-b border-amber-200 sticky top-0 z-10">
                      <tr>
                        <th scope="col" className="py-3 px-3 sm:px-4 text-center font-mono w-16 whitespace-nowrap">項次</th>
                        <th scope="col" className="py-3 px-3 sm:px-4 font-mono w-28 whitespace-nowrap">員工編號</th>
                        <th scope="col" className="py-3 px-3 sm:px-4 whitespace-nowrap">部門單位</th>
                        <th scope="col" className="py-3 px-3 sm:px-4 font-bold whitespace-nowrap">中獎人（姓名）</th>
                        <th scope="col" className="py-3 px-3 sm:px-4 text-center w-36 whitespace-nowrap">獎項捐出</th>
                        <th scope="col" className="py-3 px-3 sm:px-4 text-center w-28 whitespace-nowrap">狀態處置</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {latestWinners.map((winner, idx) => {
                        return (
                          <tr 
                            key={winner.id}
                            className="hover:bg-amber-50/50 transition-colors group"
                          >
                            {/* 項次流水號 */}
                            <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-slate-600">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold">
                                {idx + 1}
                              </span>
                            </td>

                            {/* 員工編號 */}
                            <td className="py-3 px-3 sm:px-4 font-mono font-bold text-slate-700 text-sm sm:text-base whitespace-nowrap">
                              {winner.employeeNo}
                            </td>

                            {/* 部門單位 */}
                            <td className="py-3 px-3 sm:px-4 text-slate-700 font-medium whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                {winner.department}
                              </span>
                            </td>

                            {/* 中獎人姓名 */}
                            <td className="py-3 px-3 sm:px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-base sm:text-lg font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                                  {winner.employeeName}
                                </span>
                                {winner.replacesAbsenteeId && (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                                    補抽
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 獎項捐出操作按鈕 */}
                            <td className="py-3 px-3 sm:px-4 text-center">
                              <button
                                type="button"
                                id={`btn-donate-stage-${winner.id}`}
                                onClick={() => {
                                  setSelectedDonationRecord(winner);
                                  setIsDonateModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300 cursor-pointer whitespace-nowrap active:scale-95 shadow-xs transition-all"
                                title="同仁好意捐出獎項（立即釋出名額供現場重新抽獎）"
                              >
                                <Gift className="w-3.5 h-3.5 text-amber-600" />
                                <span>獎項捐出</span>
                              </button>
                            </td>

                            {/* 缺席重抽操作按鈕 */}
                            <td className="py-3 px-3 sm:px-4 text-center">
                              <button
                                type="button"
                                id={`btn-redraw-modal-${winner.id}`}
                                onClick={() => {
                                  onReplaceAbsentee(winner, '現場確認放棄領取', (newRecord) => {
                                    setLatestWinners(prev => prev.map(w => w.id === winner.id ? newRecord : w));
                                  });
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-white px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                                title="此同仁若缺席或放棄，確認並啟動補抽輪盤"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>缺席重抽</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with guidance */}
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-700 font-bold">💡 現場操作提醒：</span>
                    <span>支援「獎項捐出」立即釋出名額重新抽獎；若缺席可點擊「缺席重抽」</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-700 font-bold">
                    本次名額：{latestWinners.length} 名
                  </div>
                </div>

                {/* Round 1 Completed Banner inside Modal */}
                {currentDrawRound >= 2 && (acknowledgedRound ?? 1) < 2 && (
                  <div className="bg-gradient-to-r from-amber-100 via-rose-100 to-amber-100 px-4 py-2.5 border-t border-amber-300 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-rose-900 flex-shrink-0 animate-pulse">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>🎉 恭喜！本批抽完，第 1 輪抽獎全員已 100% 圓滿獲獎！點擊下方將正式開啟【第 2 輪平準抽獎】！</span>
                  </div>
                )}
              </div>

              {/* Close / Next Button */}
              <div className="flex items-center justify-center gap-3 pt-1 flex-wrap flex-shrink-0">
                <button
                  id="btn-close-winner-modal"
                  onClick={() => {
                    setShowWinnerModal(false);
                    if (currentDrawRound >= 2 && (acknowledgedRound ?? 1) < 2 && onOpenNextRoundModal) {
                      onOpenNextRoundModal(false);
                    }
                  }}
                  className="festive-primary-btn px-8 py-3 rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  {currentDrawRound >= 2 && (acknowledgedRound ?? 1) < 2 ? (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>確認領獎並開啟第 2 輪平準抽獎 ➜</span>
                    </>
                  ) : (
                    <span>確認領獎並繼續</span>
                  )}
                </button>

                {onGoToWall && (
                  <button
                    onClick={() => {
                      setShowWinnerModal(false);
                      onGoToWall();
                    }}
                    className="festive-secondary-btn px-6 py-3 rounded-xl text-sm font-bold active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    前往中獎星光榜 ➜
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 獎項捐出確認彈窗 */}
      <DonatePrizeModal
        isOpen={isDonateModalOpen}
        winner={selectedDonationRecord}
        prize={currentPrize}
        onClose={() => {
          setIsDonateModalOpen(false);
          setSelectedDonationRecord(null);
        }}
        onConfirmDonate={(options) => {
          if (selectedDonationRecord && onDonatePrize) {
            onDonatePrize(selectedDonationRecord, options);
            setLatestWinners(prev => prev.filter(w => w.id !== selectedDonationRecord.id));
          }
          setIsDonateModalOpen(false);
          setSelectedDonationRecord(null);
        }}
        isBonusPool={currentPool === 'bonus'}
      />
    </div>
  );
};
