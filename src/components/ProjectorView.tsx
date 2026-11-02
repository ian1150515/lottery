import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Employee, Prize, WinningRecord, DonationRecord, CelebrationEffectType, RepeatWinningMode } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { triggerCelebrationEffect } from '../utils/confettiHelper';
import { fisherYatesShuffle, drawRandomWinners, getSecureRandomInt } from '../utils/lotteryRandom';
import { DonatePrizeModal } from './DonatePrizeModal';
import { 
  Trophy, 
  Sparkles, 
  Minimize2, 
  Play, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw,
  Award,
  Building2,
  Gift,
  Users,
  Pause,
  HeartHandshake
} from 'lucide-react';
import { motion } from 'motion/react';
import { Mascot } from './Mascot';
import { GoldIngot, RedPacket, SparkleStar } from './FestiveIllustrations';

interface ProjectorViewProps {
  currentPrize: Prize | null;
  prizes: Prize[];
  candidates: Employee[];
  winningRecords: WinningRecord[];
  donations?: DonationRecord[];
  onSelectPrize: (prizeId: string) => void;
  onAddWinners: (winners: WinningRecord[]) => void;
  onReplaceAbsentee: (record: WinningRecord | string, reason?: string, onCompleted?: (newRecord: WinningRecord) => void) => void;
  onDonatePrize?: (record: WinningRecord, options?: { note?: string }) => void;
  onExitProjector: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentPool: 'main' | 'bonus';
  onSwitchPool: (pool: 'main' | 'bonus') => void;

  // Settings parameters
  activityTitle?: string;
  drawDurationSeconds?: number;
  celebrationEffect?: CelebrationEffectType;

  // Repeat winning controls
  allowRepeatWinning?: boolean;
  repeatWinningMode?: RepeatWinningMode;
  currentDrawRound?: number;
  acknowledgedRound?: number;
  isNextRoundModalOpen?: boolean;
  onOpenNextRoundModal?: (readonly?: boolean) => void;
  onConfirmNextRound?: () => void;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({
  currentPrize,
  prizes,
  candidates,
  winningRecords,
  donations = [],
  onSelectPrize,
  onAddWinners,
  onReplaceAbsentee,
  onDonatePrize,
  onExitProjector,
  isMuted,
  onToggleMute,
  currentPool,
  activityTitle = '2026 聯歡晚會 • 喜慶年終大抽獎',
  drawDurationSeconds = 3.2,
  celebrationEffect = 'random',
  allowRepeatWinning = false,
  repeatWinningMode = 'none',
  currentDrawRound = 1,
  acknowledgedRound = 1,
  isNextRoundModalOpen = false,
  onOpenNextRoundModal,
  onConfirmNextRound,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'sequential' | 'all'>('sequential');
  const [isSequentialRunning, setIsSequentialRunning] = useState(false);
  const [displayCandidate, setDisplayCandidate] = useState<Employee | null>(null);
  const [latestWinners, setLatestWinners] = useState<WinningRecord[]>([]);
  const [selectedDonationRecord, setSelectedDonationRecord] = useState<WinningRecord | null>(null);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [isPrizeMenuOpen, setIsPrizeMenuOpen] = useState(false);
  const prizeMenuRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const onAddWinnersRef = useRef(onAddWinners);
  useEffect(() => {
    onAddWinnersRef.current = onAddWinners;
  }, [onAddWinners]);

  const rollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sequentialNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSequentialRunningRef = useRef(false);
  const sequentialRemainingCandidatesRef = useRef<Employee[]>([]);
  const sessionWinnersRef = useRef<WinningRecord[]>([]);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Chronologically sorted prize winners
  const prizeWinners = useMemo(() => {
    return winningRecords
      .filter(r => r.prizeId === currentPrize?.id)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [winningRecords, currentPrize?.id]);

  // Precomputed map for each prize's winning count for the dropdown
  const prizeWinnersCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of winningRecords) {
      map.set(record.prizeId, (map.get(record.prizeId) || 0) + 1);
    }
    return map;
  }, [winningRecords]);

  // Index of current prize
  const currentIndex = prizes.findIndex(p => p.id === currentPrize?.id);

  const handlePrevPrize = () => {
    if (isDrawing || isSequentialRunningRef.current) return;
    if (currentIndex > 0) {
      onSelectPrize(prizes[currentIndex - 1].id);
      setIsPrizeMenuOpen(false);
    }
  };

  const handleNextPrize = () => {
    if (isDrawing || isSequentialRunningRef.current) return;
    if (currentIndex < prizes.length - 1) {
      onSelectPrize(prizes[currentIndex + 1].id);
      setIsPrizeMenuOpen(false);
    }
  };

  const handleSelectPrizeItem = (prizeId: string) => {
    if (isDrawing || isSequentialRunningRef.current) return;
    onSelectPrize(prizeId);
    setIsPrizeMenuOpen(false);
  };

  const remainingQuota = currentPrize ? Math.max(0, currentPrize.quota - prizeWinners.length) : 0;
  const isCompleted = currentPrize ? remainingQuota === 0 : false;

  // Reset pagination on prize change
  useEffect(() => {
    setCurrentPage(1);
  }, [currentPrize?.id]);

  // Auto-switch to page containing the latest winner
  useEffect(() => {
    if (latestWinners.length > 0) {
      const lastWinner = latestWinners[latestWinners.length - 1];
      const winnerIndex = prizeWinners.findIndex(w => w.id === lastWinner.id);
      if (winnerIndex >= 0) {
        const targetPage = Math.floor(winnerIndex / pageSize) + 1;
        setCurrentPage(targetPage);
      }
    }
  }, [latestWinners, prizeWinners, pageSize]);

  // Cleanup rolling and sequential timers on unmount
  useEffect(() => {
    return () => {
      isSequentialRunningRef.current = false;
      if (rollingTimerRef.current) clearTimeout(rollingTimerRef.current);
      if (sequentialNextTimerRef.current) clearTimeout(sequentialNextTimerRef.current);
      soundEffects.stopRollingSound();
    };
  }, []);

  // Click outside to close prize menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (prizeMenuRef.current && !prizeMenuRef.current.contains(e.target as Node)) {
        setIsPrizeMenuOpen(false);
      }
    };
    if (isPrizeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPrizeMenuOpen]);

  // Stop sequential run if prize switches and sync drawMode with prize drawMethod
  useEffect(() => {
    if (isSequentialRunningRef.current) {
      handleStopSequential();
    }
    setDisplayCandidate(null);
    setLatestWinners([]);
    setIsPrizeMenuOpen(false);
    if (currentPrize) {
      if (currentPrize.drawMethod === 'batch') {
        setDrawMode('all');
      } else {
        setDrawMode('sequential');
      }
    }
  }, [currentPrize?.id]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isNextRoundModalOpen || isDonateModalOpen) return;

      // Escape key: close dropdown if open, else exit projector
      if (e.code === 'Escape') {
        if (isPrizeMenuOpen) {
          e.preventDefault();
          setIsPrizeMenuOpen(false);
          return;
        }
        if (isSequentialRunningRef.current) {
          handleStopSequential();
        }
        onExitProjector();
        return;
      }

      // Space key: trigger or stop draw
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPrizeMenuOpen(false);
        if (isSequentialRunningRef.current) {
          handleStopSequential();
        } else if (!isDrawing && !isCompleted && candidates.length > 0 && currentPrize) {
          handleStart();
        }
        return;
      }

      // Prize navigation shortcuts (when not drawing)
      if (!isDrawing && !isSequentialRunningRef.current) {
        if (e.code === 'ArrowLeft' || e.code === 'PageUp') {
          e.preventDefault();
          handlePrevPrize();
        } else if (e.code === 'ArrowRight' || e.code === 'PageDown') {
          e.preventDefault();
          handleNextPrize();
        } else if (e.code === 'KeyP') {
          e.preventDefault();
          setIsPrizeMenuOpen(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, isCompleted, candidates, currentPrize, drawMode, drawDurationSeconds, remainingQuota, isNextRoundModalOpen, isDonateModalOpen, isPrizeMenuOpen, currentIndex, prizes]);

  const handleStopSequential = () => {
    isSequentialRunningRef.current = false;
    setIsSequentialRunning(false);
    setIsDrawing(false);
    if (rollingTimerRef.current) clearTimeout(rollingTimerRef.current);
    if (sequentialNextTimerRef.current) clearTimeout(sequentialNextTimerRef.current);
    soundEffects.stopRollingSound();
  };

  // 1. 逐次抽出 (Sequential Drawing)
  const startSequentialDraw = () => {
    if (isDrawing || !currentPrize || candidates.length === 0 || remainingQuota <= 0) return;

    const totalToDrawThisRun = Math.min(remainingQuota, candidates.length);
    if (totalToDrawThisRun <= 0) return;

    setIsDrawing(true);
    setIsSequentialRunning(true);
    isSequentialRunningRef.current = true;
    sessionWinnersRef.current = [];
    setLatestWinners([]);
    // Fisher-Yates uniform shuffle
    sequentialRemainingCandidatesRef.current = fisherYatesShuffle<Employee>(candidates);

    let drawnCountInRun = 0;

    const runNextStep = () => {
      if (!isSequentialRunningRef.current) return;
      if (drawnCountInRun >= totalToDrawThisRun || sequentialRemainingCandidatesRef.current.length === 0) {
        isSequentialRunningRef.current = false;
        setIsSequentialRunning(false);
        setIsDrawing(false);
        soundEffects.playFanfare();
        triggerCelebrationEffect(celebrationEffect);
        return;
      }

      soundEffects.startRollingSound();

      const singleRollDuration = Math.min(2400, Math.max(900, (drawDurationSeconds || 2.4) * 750));
      const startTime = Date.now();

      const runSingleRoll = () => {
        if (!isSequentialRunningRef.current) {
          soundEffects.stopRollingSound();
          return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / singleRollDuration, 1);

        const pool = sequentialRemainingCandidatesRef.current;
        const poolCandidate = pool[getSecureRandomInt(pool.length)];
        setDisplayCandidate(poolCandidate);
        soundEffects.playTick();

        if (progress < 1) {
          const delay = progress < 0.7 ? 40 : 40 + Math.pow((progress - 0.7) / 0.3, 2) * 260;
          rollingTimerRef.current = setTimeout(runSingleRoll, delay);
        } else {
          soundEffects.stopRollingSound();

          const winnerEmp = sequentialRemainingCandidatesRef.current.shift()!;
          drawnCountInRun++;

          const now = Date.now();
          const isBonus = currentPool === 'bonus' || Boolean(currentPrize.isAdditional);
          const newRecord: WinningRecord = {
            id: `win-proj-${now}-${Math.random().toString(36).substring(2, 8)}`,
            prizeId: currentPrize.id,
            prizeName: currentPrize.name,
            prizeContent: currentPrize.content,
            prizeImage: currentPrize.image,
            employeeId: winnerEmp.id,
            employeeNo: winnerEmp.empNo,
            employeeName: winnerEmp.name,
            department: winnerEmp.department,
            timestamp: now,
            isAdditional: isBonus,
            poolType: isBonus ? 'bonus' : 'main',
          };

          setDisplayCandidate(winnerEmp);
          sessionWinnersRef.current = [...sessionWinnersRef.current, newRecord];
          setLatestWinners([newRecord]);

          onAddWinnersRef.current([newRecord]);
          soundEffects.playFanfare();

          setTimeout(() => {
            if (tableContainerRef.current) {
              tableContainerRef.current.scrollTo({
                top: tableContainerRef.current.scrollHeight,
                behavior: 'smooth',
              });
            }
          }, 80);

          if (drawnCountInRun >= totalToDrawThisRun || sequentialRemainingCandidatesRef.current.length === 0) {
            isSequentialRunningRef.current = false;
            setIsSequentialRunning(false);
            setIsDrawing(false);
            soundEffects.playFanfare();
            triggerCelebrationEffect(celebrationEffect);
          } else {
            sequentialNextTimerRef.current = setTimeout(() => {
              if (isSequentialRunningRef.current) {
                runNextStep();
              }
            }, 1400);
          }
        }
      };

      runSingleRoll();
    };

    runNextStep();
  };

  // 2. 一次全抽 (All-in Drawing)
  const startAllInDraw = () => {
    if (isDrawing || !currentPrize || candidates.length === 0 || remainingQuota <= 0) return;

    const countToDraw = Math.min(remainingQuota, candidates.length);
    if (countToDraw <= 0) return;

    // Pick winners objectively using Fisher-Yates shuffle & Web Crypto
    const selectedEmployees = drawRandomWinners<Employee>(candidates, countToDraw);

    setIsDrawing(true);
    setLatestWinners([]);
    soundEffects.startRollingSound();

    const totalDuration = Math.max(1000, (drawDurationSeconds || 3.2) * 1000);
    const startTime = Date.now();

    const runRoll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      const poolCandidate = candidates[getSecureRandomInt(candidates.length)];
      setDisplayCandidate(poolCandidate);
      soundEffects.playTick();

      if (progress < 1) {
        const delay = progress < 0.65 ? 40 : 40 + Math.pow((progress - 0.65) / 0.35, 2) * 350;
        rollingTimerRef.current = setTimeout(runRoll, delay);
      } else {
        soundEffects.stopRollingSound();

        const now = Date.now();
        const isBonus = currentPool === 'bonus' || Boolean(currentPrize.isAdditional);
        const records: WinningRecord[] = selectedEmployees.map(emp => ({
          id: `win-proj-${now}-${Math.random().toString(36).substring(2, 8)}`,
          prizeId: currentPrize.id,
          prizeName: currentPrize.name,
          prizeContent: currentPrize.content,
          prizeImage: currentPrize.image,
          employeeId: emp.id,
          employeeNo: emp.empNo,
          employeeName: emp.name,
          department: emp.department,
          timestamp: now,
          isAdditional: isBonus,
          poolType: isBonus ? 'bonus' : 'main',
        }));

        setDisplayCandidate(selectedEmployees[0]);
        setIsDrawing(false);
        sessionWinnersRef.current = records;
        setLatestWinners(records);

        onAddWinnersRef.current(records);
        soundEffects.playFanfare();
        triggerCelebrationEffect(celebrationEffect);

        setTimeout(() => {
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTo({
              top: tableContainerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }
        }, 100);
      }
    };

    runRoll();
  };

  const handleStart = () => {
    if (drawMode === 'sequential') {
      startSequentialDraw();
    } else {
      startAllInDraw();
    }
  };


  const totalSlotsCount = currentPrize ? Math.max(currentPrize.quota, prizeWinners.length) : 0;
  const totalPages = Math.max(1, Math.ceil(totalSlotsCount / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);

  const tableSlots = useMemo(() => {
    return Array.from({ length: totalSlotsCount }, (_, idx) => {
      const winner = prizeWinners[idx] || null;
      return {
        slotIndex: idx + 1,
        winner,
        isFilled: Boolean(winner),
        isJustDrawn: winner ? latestWinners.some(w => w.id === winner.id) : false,
      };
    });
  }, [totalSlotsCount, prizeWinners, latestWinners]);

  const paginatedSlots = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return tableSlots.slice(start, start + pageSize);
  }, [tableSlots, activePage, pageSize]);

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#fffcf7] via-[#fff5f5] to-[#fef2f2] text-slate-800 flex flex-col justify-between p-3 sm:p-5 lg:p-6 overflow-hidden select-none">
      
      {/* Top Bar: Floating Navigation with Dynamic Title & Upgraded Prize Switcher */}
      <div className="relative z-30 flex items-center justify-between gap-2 sm:gap-3 shrink-0 pb-2.5 border-b border-amber-200/80">
        {/* Left: Gala Branding with Dynamic Activity Title & Mascot */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Mascot
            state={isDrawing ? 'drawing' : isCompleted ? 'celebrate' : 'idle'}
            size={42}
            className="shrink-0 hidden sm:block"
          />
          <div>
            <div className="text-sm sm:text-lg lg:text-2xl font-black font-display tracking-wider bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 bg-clip-text text-transparent truncate max-w-[130px] xs:max-w-[200px] sm:max-w-xs md:max-w-none">
              {activityTitle}
            </div>
          </div>
        </div>

        {/* Center: Enhanced Prize Switcher with Dropdown Popover & Stepper */}
        <div ref={prizeMenuRef} className="relative flex items-center">
          <div className="flex items-center bg-white/95 border border-amber-300 backdrop-blur-md rounded-2xl shadow-sm p-1">
            {/* Prev Prize Button */}
            <button
              onClick={handlePrevPrize}
              disabled={currentIndex <= 0 || isDrawing}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-amber-100/60 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="上一個獎項 (快捷鍵: ← 或 PageUp)"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Direct Selection Trigger Dropdown Button */}
            <button
              onClick={() => !isDrawing && setIsPrizeMenuOpen(prev => !prev)}
              disabled={isDrawing}
              className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl hover:bg-amber-50 active:bg-amber-100/60 transition-all cursor-pointer group text-left disabled:opacity-50"
              title="點擊展開所有獎項選單 (快捷鍵: P)"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-xs font-bold text-amber-700 tracking-wider">
                    {currentPrize ? `獎項 ${currentIndex + 1}/${prizes.length}` : '未選獎項'}
                  </span>
                  {currentPrize?.isAdditional && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white leading-none">
                      特別加碼
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 leading-none">
                      已抽完
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-sm lg:text-base font-black text-rose-900 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-[260px]">
                    {currentPrize?.name || '請選擇獎項'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-500 shrink-0">
                    ({prizeWinners.length}/{currentPrize?.quota || 0})
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 transition-transform duration-200 shrink-0 ${isPrizeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Next Prize Button */}
            <button
              onClick={handleNextPrize}
              disabled={currentIndex >= prizes.length - 1 || isDrawing}
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-amber-100/60 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-all"
              title="下一個獎項 (快捷鍵: → 或 PageDown)"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Keyboard shortcut hint tags (visible on desktop) */}
          <div className="hidden xl:flex items-center gap-1 ml-2 text-[10px] text-slate-500 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-amber-100/80 border border-amber-200 font-bold" title="按左右方向鍵切換獎項">←/→</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100/80 border border-amber-200 font-bold" title="按 P 鍵開啟或收合獎項清單">P</span>
          </div>

          {/* Dropdown Menu Popover */}
          {isPrizeMenuOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 sm:w-96 max-h-[70vh] bg-white border-2 border-amber-300 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
              <div className="px-3.5 py-2.5 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-b border-amber-200 flex items-center justify-between shrink-0">
                <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  切換抽獎獎項 ({prizes.length} 個獎項)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  快捷鍵 P / ESC 關閉
                </span>
              </div>
              
              <div className="overflow-y-auto divide-y divide-amber-100/80 max-h-[calc(70vh-45px)] p-1.5">
                {prizes.map((p, idx) => {
                  const drawn = prizeWinnersCountMap.get(p.id) || 0;
                  const isDone = drawn >= p.quota;
                  const isSelected = p.id === currentPrize?.id;
                  const remaining = Math.max(0, p.quota - drawn);

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPrizeItem(p.id)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-amber-100/90 to-rose-100/80 border border-amber-300 text-slate-900 font-bold shadow-xs' 
                          : 'hover:bg-amber-50/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg text-xs font-mono font-black flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm truncate ${isSelected ? 'font-black text-rose-900' : 'font-bold text-slate-800'}`}>
                              {p.name}
                            </span>
                            {p.isAdditional && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500 text-white shrink-0">
                                加碼
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[170px] sm:max-w-[210px]">
                            {p.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold">
                            <span className={isDone ? 'text-emerald-600' : drawn > 0 ? 'text-amber-600' : 'text-slate-600'}>
                              {drawn}
                            </span>
                            <span className="text-slate-600"> / {p.quota}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${
                            isDone 
                              ? 'text-emerald-700' 
                              : drawn > 0 
                                ? 'text-amber-700' 
                                : 'text-slate-600'
                          }`}>
                            {isDone ? '已完抽' : drawn > 0 ? `餘 ${remaining} 名` : '待抽'}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Sound & Exit Projector */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 rounded-2xl bg-white border border-amber-200 text-slate-700 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
            title={isMuted ? '開啟音效' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
          </button>

          <button
            id="btn-exit-projector"
            onClick={onExitProjector}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white border border-amber-200 hover:bg-rose-50 text-xs sm:text-sm font-bold text-slate-700 hover:text-rose-700 transition-all shadow-xs cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" />
            <span className="hidden sm:inline">返回舞台</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-mono font-bold">ESC</span>
          </button>
        </div>
      </div>

      {/* Prize Header Banner */}
      <div className="relative z-10 shrink-0 py-2 sm:py-3 text-center flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {currentPrize?.image && (
            <img
              src={currentPrize.image}
              alt={currentPrize.name}
              className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl object-cover border-2 border-amber-300 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
          )}

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
            <span className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-rose-700 font-display">
              {currentPrize?.name}
            </span>
            <span className="text-2xl sm:text-4xl lg:text-5xl text-amber-500 font-black">
              :
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 font-display">
              {currentPrize?.content}
            </h2>

            {currentPrize?.isAdditional && (
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs sm:text-sm font-black shadow-xs animate-pulse">
                現場特別加碼
              </span>
            )}
          </div>
        </div>

        {/* Quota Progress line */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-base text-slate-600 font-mono mt-1.5 flex-wrap">
          <span>
            已抽出：<strong className="text-rose-600 font-black text-sm sm:text-xl">{prizeWinners.length}</strong> / {currentPrize?.quota} 名
          </span>
          <span className="text-amber-400">•</span>
          <span>
            剩餘名額：<strong className="text-amber-600 font-black text-sm sm:text-xl">{remainingQuota}</strong> 名
          </span>
          <span className="text-amber-400">•</span>
          <span>
            候選同仁池：<strong className="text-emerald-700 font-bold">{candidates.length}</strong> 人
          </span>
          {(() => {
            const poolDonatedCount = (donations || []).filter(d => currentPool === 'bonus' ? d.fromPool === 'bonus' : d.fromPool !== 'bonus').length;
            if (poolDonatedCount === 0) return null;
            return (
              <>
                <span className="text-amber-400">•</span>
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <HeartHandshake className="w-4 h-4 text-amber-600 inline" />
                  已標記排除 {poolDonatedCount} 位捐出者
                </span>
              </>
            );
          })()}
        </div>
      </div>

      {/* Main Stage Grid: Left Slot Drum Card + Right Embedded Winners Table */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 min-h-0 overflow-hidden items-stretch my-1">
        
        {/* LEFT COLUMN: Giant Slot Machine Rolling Drum & Controls (50% equal width) */}
        <div className="flex flex-col justify-between gap-2.5 sm:gap-3 h-full min-h-0">
          
          {/* Giant Rolling Lucky Card */}
          <div className="relative rounded-3xl p-2 bg-gradient-to-b from-rose-600 via-red-600 to-amber-500 shadow-xl shadow-rose-900/10 ring-4 ring-amber-300/80 flex-1 flex flex-col min-h-[220px] sm:min-h-[280px]">
            <div className="relative rounded-[20px] bg-gradient-to-b from-[#881324] via-[#9f1239] to-[#881324] p-5 sm:p-8 text-center flex flex-col items-center justify-center overflow-hidden border border-amber-300/60 flex-1 text-white shadow-inner">
              
              {displayCandidate ? (
                <motion.div
                  key={displayCandidate.id}
                  initial={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.05 }}
                  className="flex flex-col items-center w-full"
                >
                  <div className="text-4xl sm:text-7xl xl:text-8xl font-black tracking-tight text-white font-display filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] leading-tight">
                    {displayCandidate.name}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6 flex-wrap justify-center">
                    <span className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl text-sm sm:text-xl font-black bg-white text-slate-900 font-mono shadow-md border border-amber-300">
                      員編：{displayCandidate.empNo}
                    </span>
                    <span className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-2xl text-sm sm:text-xl font-bold bg-amber-400 text-amber-950 shadow-md border border-amber-300">
                      {displayCandidate.department}
                    </span>
                  </div>

                  {latestWinners.length > 0 && !isDrawing && (
                    <div className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs sm:text-sm font-bold shadow-md">
                      <Sparkles className="w-4 h-4 text-amber-950" />
                      <span>剛抽出 {latestWinners.length} 位得獎者，右方名冊已即時補齊！</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 border-2 border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
                    <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
                  </div>
                  <div className="text-3xl sm:text-5xl font-black tracking-wider text-amber-200 font-display drop-shadow-md">
                    等待開獎中
                  </div>
                  <div className="text-xs sm:text-sm text-rose-200/90 font-medium tracking-wide">
                    {candidates.length === 0
                      ? remainingQuota > 0
                        ? (acknowledgedRound ?? 1) < 2 && currentDrawRound >= 2
                          ? '🎉 第 1 輪抽獎全員已圓滿完成！請在彈窗確認開啟【第 2 輪平準抽獎】'
                          : allowRepeatWinning && repeatWinningMode === 'fair_round'
                          ? `第 ${currentDrawRound || 2} 輪平準名額皆已開出！`
                          : '全體同仁皆已獲獎！請至控制台開啟重複中獎或追加名單'
                        : '此獎項名單已抽完'
                      : allowRepeatWinning && repeatWinningMode === 'fair_round' && currentDrawRound > 1
                      ? `第 ${currentDrawRound} 輪平準抽獎進行中（每人本輪限中 1 次）• 剩餘合格候選人：${candidates.length} 人`
                      : '請點擊下方開始按鈕或按空白鍵 Space 開獎'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Draw Controller Bar: Mode Selector + Start/Pause Button */}
          <div className="bg-white p-3 sm:p-4 rounded-3xl border border-amber-200 shadow-sm flex flex-col gap-3 shrink-0">
            {/* Draw Mode Selector */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-slate-700 font-bold whitespace-nowrap">抽獎規則：</span>
                {currentPrize && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold shadow-xs">
                    {allowRepeatWinning && repeatWinningMode === 'fair_round'
                      ? `平準輪次（第 ${currentDrawRound || 2} 輪・每人限中 1 次）`
                      : allowRepeatWinning && repeatWinningMode === 'unlimited'
                      ? '自由重複抽獎'
                      : '一人一獎 (排除已中獎者)'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50/80 p-1 rounded-2xl border border-amber-200 flex-wrap">
                <button
                  id="btn-projector-mode-sequential"
                  type="button"
                  disabled={isDrawing || isCompleted}
                  onClick={() => setDrawMode('sequential')}
                  className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    drawMode === 'sequential'
                      ? 'festive-gold-btn shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-30'
                  }`}
                  title="點選開始抽獎後，系統將自動依序逐次抽出同仁並即時補齊名冊，直到此獎項全數抽完為止"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>逐次抽出（自動連抽至完）</span>
                </button>

                <button
                  id="btn-projector-mode-all"
                  type="button"
                  disabled={isDrawing || isCompleted}
                  onClick={() => setDrawMode('all')}
                  className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    drawMode === 'all'
                      ? 'festive-gold-btn shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-30'
                  }`}
                  title="一次將本獎項剩餘所有名額全數抽出"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>一次全抽 ({remainingQuota} 位)</span>
                </button>
              </div>
            </div>

            {/* Action Buttons: Start or Pause / Rolling Indicator */}
            {!isDrawing ? (
              (acknowledgedRound ?? 1) < 2 && currentDrawRound >= 2 && remainingQuota > 0 ? (
                <button
                  id="btn-projector-open-round2"
                  type="button"
                  onClick={() => onOpenNextRoundModal && onOpenNextRoundModal(false)}
                  className="festive-primary-btn flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-rose-600/30 transition-all transform active:scale-95 cursor-pointer w-full ring-4 ring-amber-300"
                >
                  <Sparkles className="w-5 h-5 text-amber-200" />
                  <span>🎉 第 1 輪全員已獲獎！點此開啟【第 2 輪平準抽獎】</span>
                </button>
              ) : (
                <button
                  id="btn-projector-start"
                  type="button"
                  disabled={isCompleted || candidates.length === 0}
                  onClick={handleStart}
                  className="festive-primary-btn flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-black text-base sm:text-lg shadow-md transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-full"
                >
                  <Play className="w-5 h-5 fill-white text-white" />
                  <span>
                    {isCompleted
                      ? '本獎項已全數抽出完畢'
                      : drawMode === 'sequential'
                      ? `開始逐次抽獎（抽出剩餘 ${remainingQuota} 位）`
                      : `開始全數抽獎（一次抽 ${remainingQuota} 位）`}
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">Space</span>
                </button>
              )
            ) : drawMode === 'sequential' && isSequentialRunning ? (
              <button
                id="btn-projector-pause"
                type="button"
                onClick={handleStopSequential}
                className="flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-amber-600 to-rose-600 border border-amber-300 shadow-md cursor-pointer active:scale-95 transition-all w-full"
                title="點擊暫停逐次抽獎程序"
              >
                <Pause className="w-5 h-5 fill-white text-white" />
                <span>暫停逐次抽獎（已抽 {prizeWinners.length} / {currentPrize?.quota} 人）</span>
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-black/20 text-white font-mono">點擊暫停</span>
              </button>
            ) : (
              <div
                id="btn-projector-rolling"
                className="flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-rose-600 to-amber-600 shadow-md select-none w-full animate-pulse"
              >
                <RotateCcw className="w-5 h-5 animate-spin text-white" />
                <span>全數開獎滾動中...（{drawDurationSeconds}秒後定格）</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Embedded Live Winners Table (50% equal width) */}
        <div className="flex flex-col h-full min-h-0 bg-white border-2 border-amber-300 rounded-3xl p-2.5 sm:p-3.5 shadow-md overflow-hidden">
          
          {/* Table Header Banner */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-1.5 border-b border-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5 font-display">
                  <span>【{currentPrize?.name}】中獎名冊</span>
                  <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">（一頁 10 位）</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-xl border border-amber-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={activePage <= 1}
                    className="p-1 rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 cursor-pointer transition-colors"
                    title="上一頁"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-black text-rose-800 font-mono whitespace-nowrap">
                    {activePage} / {totalPages} 頁
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={activePage >= totalPages}
                    className="p-1 rounded-lg text-slate-700 hover:bg-white disabled:opacity-30 cursor-pointer transition-colors"
                    title="下一頁"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <span className="text-xs font-mono font-bold px-2 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 whitespace-nowrap">
                已抽 {prizeWinners.length} / {currentPrize?.quota} 名
              </span>
            </div>
          </div>

          {/* Scrollable Table Container */}
          <div 
            ref={tableContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-100 bg-white shadow-inner min-h-0"
          >
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-amber-50/90 text-amber-950 uppercase text-xs sm:text-sm font-black border-b border-amber-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th scope="col" className="py-1.5 sm:py-2 px-1 text-center font-mono w-[8%] whitespace-nowrap">#</th>
                  <th scope="col" className="py-1.5 sm:py-2 px-1.5 font-mono w-[18%] whitespace-nowrap">員編</th>
                  <th scope="col" className="py-1.5 sm:py-2 px-1.5 w-[22%] whitespace-nowrap">部門</th>
                  <th scope="col" className="py-1.5 sm:py-2 px-2 font-black w-[34%] whitespace-nowrap">中獎人姓名</th>
                  <th scope="col" className="py-1.5 sm:py-2 px-1 text-center w-[9%] whitespace-nowrap">捐出</th>
                  <th scope="col" className="py-1.5 sm:py-2 px-1 text-center w-[9%] whitespace-nowrap">處置</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {paginatedSlots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                      尚未設定任何獎品名額
                    </td>
                  </tr>
                ) : (
                  paginatedSlots.map(slot => {
                    const winner = slot.winner;

                    if (winner) {
                      return (
                        <tr 
                          key={winner.id}
                          className={`group ${
                            slot.isJustDrawn
                              ? 'bg-rose-50/70 hover:bg-rose-50'
                              : 'hover:bg-amber-50/30'
                          }`}
                        >
                          <td className="py-1.5 sm:py-2 px-1 text-center font-mono font-bold text-slate-600">
                            <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-100 border border-amber-200 text-amber-950 text-xs sm:text-sm font-black shadow-xs">
                              {slot.slotIndex}
                            </span>
                          </td>

                          <td className="py-1.5 sm:py-2 px-1.5 font-mono font-black text-slate-800 text-sm sm:text-base whitespace-nowrap truncate">
                            {winner.employeeNo}
                          </td>

                          <td className="py-1.5 sm:py-2 px-1.5 text-slate-700 whitespace-nowrap truncate">
                            <span className="text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200 inline-block max-w-full truncate">
                              {winner.department}
                            </span>
                          </td>

                          <td className="py-1.5 sm:py-2 px-2 whitespace-nowrap truncate">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 group-hover:text-rose-700 font-display tracking-wide truncate">
                                {winner.employeeName}
                              </span>
                              {winner.replacesAbsenteeId && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 whitespace-nowrap shrink-0">
                                  補
                                </span>
                              )}
                              {slot.isJustDrawn && (
                                <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded border border-amber-300 animate-pulse whitespace-nowrap shrink-0">
                                  新
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-1.5 sm:py-2 px-1 text-center whitespace-nowrap">
                            <button
                              type="button"
                              id={`btn-projector-table-donate-${winner.id}`}
                              onClick={() => {
                                setSelectedDonationRecord(winner);
                                setIsDonateModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center p-1 sm:px-2 sm:py-1 rounded-lg border bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300 cursor-pointer active:scale-95 shadow-xs text-xs font-bold"
                              title="同仁好意捐出獎項（立即釋出名額供現場重新抽獎）"
                            >
                              <Gift className="w-3.5 h-3.5 text-amber-600 sm:mr-0.5" />
                              <span className="hidden sm:inline">捐出</span>
                            </button>
                          </td>

                          <td className="py-1.5 sm:py-2 px-1 text-center whitespace-nowrap">
                            <button
                              type="button"
                              id={`btn-projector-table-redraw-${winner.id}`}
                              onClick={() => {
                                onReplaceAbsentee(winner, '現場確認放棄領取', (newRecord) => {
                                  setLatestWinners([newRecord]);
                                });
                              }}
                              className="inline-flex items-center justify-center p-1 sm:px-2 sm:py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95 text-xs font-bold"
                              title="此同仁若缺席或放棄，確認並啟動補抽輪盤"
                            >
                              <RotateCcw className="w-3.5 h-3.5 sm:mr-0.5" />
                              <span className="hidden sm:inline">重抽</span>
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr 
                        key={`pending-slot-${slot.slotIndex}`}
                        className="hover:bg-slate-50/50 border-dashed"
                      >
                        <td className="py-1.5 sm:py-2 px-1 text-center font-mono">
                          <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 text-xs font-mono">
                            {slot.slotIndex}
                          </span>
                        </td>

                        <td className="py-1.5 sm:py-2 px-1.5 font-mono text-slate-300 text-sm">
                          ---
                        </td>

                        <td className="py-1.5 sm:py-2 px-1.5 text-slate-300 text-sm">
                          ---
                        </td>

                        <td className="py-1.5 sm:py-2 px-2">
                          <span className="text-slate-400 italic text-sm sm:text-base flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>待開獎席位</span>
                          </span>
                        </td>

                        <td className="py-1.5 sm:py-2 px-1 text-center text-slate-300 text-xs">
                          -
                        </td>

                        <td className="py-1.5 sm:py-2 px-1 text-center text-slate-300 text-xs">
                          -
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Banner */}
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 gap-2 shrink-0 mt-1 rounded-b-xl">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-amber-700 font-bold">💡 現場：</span>
              <span className="truncate">開獎即時補齊；支援現場「捐出」釋出名額與「重抽」</span>
            </div>
            <div className="font-mono text-rose-700 font-black whitespace-nowrap shrink-0">
              已開出：{prizeWinners.length} / {currentPrize?.quota}
            </div>
          </div>
        </div>

      </div>

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
          }
          setIsDonateModalOpen(false);
          setSelectedDonationRecord(null);
        }}
        isBonusPool={currentPool === 'bonus'}
      />
    </div>
  );
};
