import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { WinningRecord, Employee } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { fireGrandConfetti } from '../utils/confettiHelper';
import { drawSingleWinner, getSecureRandomInt } from '../utils/lotteryRandom';
import { 
  AlertTriangle, 
  RotateCcw, 
  Award, 
  X, 
  UserX, 
  Sparkles, 
  Flame, 
  CheckCircle2 
} from 'lucide-react';

interface AbsenteeRedrawModalProps {
  isOpen: boolean;
  record: WinningRecord | null;
  eligibleCandidates: Employee[];
  onClose: () => void;
  onConfirmRedraw: (
    record: WinningRecord,
    replacementEmployee: Employee,
    reason: string
  ) => void;
}

type RedrawStep = 'confirm' | 'drawing' | 'revealed';

export const AbsenteeRedrawModal: React.FC<AbsenteeRedrawModalProps> = ({
  isOpen,
  record,
  eligibleCandidates,
  onClose,
  onConfirmRedraw,
}) => {
  const [step, setStep] = useState<RedrawStep>('confirm');
  const [displayCandidate, setDisplayCandidate] = useState<Employee | null>(null);
  const [chosenWinner, setChosenWinner] = useState<Employee | null>(null);
  const [redrawReason] = useState<string>('現場缺席未到場領取');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setDisplayCandidate(null);
      setChosenWinner(null);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      soundEffects.stopRollingSound();
    }
  }, [isOpen, record]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      soundEffects.stopRollingSound();
    };
  }, []);

  if (!isOpen || !record) return null;

  const isBonusPool = record.poolType === 'bonus' || record.isAdditional;

  const handleStartRedrawAnimation = () => {
    if (eligibleCandidates.length === 0) {
      alert('目前符合資格之候選人名單中已無多餘人員可供補抽！');
      return;
    }

    setStep('drawing');
    soundEffects.startRollingSound();

    // Pick single winner using Web Crypto & uniform distribution
    const finalWinner = drawSingleWinner(eligibleCandidates);
    if (!finalWinner) return;
    setChosenWinner(finalWinner);

    const totalDuration = 2800;
    const startTime = Date.now();

    const runShuffle = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      const poolIndex = getSecureRandomInt(eligibleCandidates.length);
      setDisplayCandidate(eligibleCandidates[poolIndex]);
      soundEffects.playTick();

      if (progress < 1) {
        const delay = progress < 0.7 ? 50 : 50 + (progress - 0.7) * 400;
        timerRef.current = setTimeout(runShuffle, delay);
      } else {
        soundEffects.stopRollingSound();
        setDisplayCandidate(finalWinner);
        setStep('revealed');
        soundEffects.playFanfare();
        fireGrandConfetti();
      }
    };

    runShuffle();
  };

  const handleCompleteRedraw = () => {
    if (!chosenWinner) return;
    onConfirmRedraw(record, chosenWinner, redrawReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="relative w-full max-w-xl bg-white border-2 border-amber-300 rounded-3xl shadow-2xl overflow-hidden text-slate-800"
      >
        {/* Top Accent Light Bar */}
        <div className={`h-1.5 w-full ${
          step === 'revealed' 
            ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 animate-pulse'
            : step === 'drawing'
              ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 animate-pulse'
              : 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400'
        }`} />

        {/* Modal Close Button */}
        {step === 'confirm' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* STEP 1: 確認對話框 */}
        {step === 'confirm' && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 font-display">
                  <span>缺席棄權 • 補抽確認</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  現場缺席棄權處理與即時補抽程序
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Prize Details Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-amber-300 flex items-center justify-center text-amber-700">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      抽獎獎項資訊
                    </div>
                    <div className="text-sm font-bold text-rose-700">
                      {record.prizeName}
                      <span className="text-xs font-normal text-slate-600 ml-1.5">
                        （{record.prizeContent}）
                      </span>
                    </div>
                  </div>
                </div>

                {isBonusPool ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <Flame className="w-3 h-3 text-yellow-200" />
                    現場加碼
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold">
                    正規獎項
                  </span>
                )}
              </div>

              {/* Current Absentee Winner Details Card */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-600">
                    <UserX className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-rose-800 uppercase tracking-wider font-semibold">
                      原中獎同仁（缺席棄權）
                    </div>
                    <div className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span className="line-through decoration-rose-500">{record.employeeName}</span>
                      <span className="text-xs font-mono text-slate-500 font-bold">
                        員編 #{record.employeeNo}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">
                    {record.department}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
              <div className="flex items-start gap-2 text-slate-800">
                <span className="text-base leading-none">📢</span>
                <span className="font-bold">
                  經現場大會確認未到場領取，是否確定將【{record.prizeName}】得主【{record.employeeName}】判定為缺席放棄，並立即啟動搖獎機補抽一位新得獎幸運同仁？
                </span>
              </div>
              <div className="text-[11px] text-slate-500 pl-6 border-t border-slate-200 pt-2 flex items-center justify-between">
                <span>⚠️ 原同仁將歸檔至「缺席棄權名單」，不影響其他合資格同仁權益。</span>
                <span className="text-emerald-700 font-mono font-bold">
                  可替補候選：{eligibleCandidates.length} 人
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="festive-secondary-btn px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                保留資格 / 取消返回
              </button>

              <button
                type="button"
                id="btn-confirm-absentee-redraw"
                disabled={eligibleCandidates.length === 0}
                onClick={handleStartRedrawAnimation}
                className="festive-primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4 text-white" />
                <span>確認棄權，立即開始補抽 ➜</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: 動態抽獎動畫 */}
        {step === 'drawing' && (
          <div className="p-8 sm:p-10 text-center space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold mb-2 animate-pulse shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>現場即時補抽中 • 緊張搖獎中</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-display">
                正在為【{record.prizeName}】抽出替補得獎者
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                原中獎同仁：{record.employeeName}（已標記棄權）• 獎品：{record.prizeContent}
              </p>
            </div>

            {/* Slot Display Box */}
            <div className="relative my-6 p-8 rounded-3xl bg-gradient-to-b from-[#881324] via-[#9f1239] to-[#881324] border-2 border-amber-300 shadow-xl ring-4 ring-amber-200 overflow-hidden text-white">
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white text-slate-900 border border-amber-300 shadow-sm">
                    員編 #{displayCandidate?.empNo || '---'}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-400 text-amber-950 border border-amber-300 shadow-sm">
                    {displayCandidate?.department || '---'}
                  </span>
                </div>

                <div className="text-4xl sm:text-5xl font-black text-white tracking-wider font-display drop-shadow-md py-1">
                  {displayCandidate?.name || '抽獎中...'}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-amber-200 font-bold font-mono">
                <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>候選池滾動中（共 {eligibleCandidates.length} 位同仁）...</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              幸運即將降臨，請全場同仁屏息以待...
            </p>
          </div>
        )}

        {/* STEP 3: 結果揭曉 */}
        {step === 'revealed' && chosenWinner && (
          <div className="p-6 sm:p-8 text-center space-y-5 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md mb-1 border border-amber-200">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-1 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>REPLACEMENT WINNER • 補抽得主誕生</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                恭喜新得獎同仁幸運遞補！
              </h3>

              {/* 著重放大獎項名稱與獎品名稱 */}
              <div className="mt-3.5 mb-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-100/90 via-rose-100/80 to-amber-100/90 border-2 border-amber-300 shadow-sm inline-flex flex-col sm:flex-row items-center justify-center gap-2 max-w-full">
                <span className="text-base sm:text-lg font-black text-rose-800 bg-rose-200/80 px-3 py-1 rounded-xl border border-rose-300/80 tracking-wide font-display shrink-0 shadow-xs">
                  【{record.prizeName}】
                </span>
                <span className="text-lg sm:text-2xl font-black text-slate-900 tracking-wide font-display break-words">
                  {record.prizeContent}
                </span>
              </div>
            </div>

            {/* Revealed Winner Showcase Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-amber-50 border-2 border-amber-300 shadow-sm text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-200">
                  員編 #{chosenWinner.empNo}
                </span>
                <span className="text-xs px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  {chosenWinner.department}
                </span>
                <span className="text-xs px-3 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                  ★ 遞補中獎
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-wide py-1 font-display">
                {chosenWinner.name}
              </div>

              <div className="text-xs text-slate-500 pt-2 border-t border-amber-200 flex items-center justify-center gap-2">
                <span>原棄權同仁：{record.employeeName}</span>
                <span>•</span>
                <span>替補時間：{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Final Confirmation Button */}
            <div className="pt-2 flex items-center justify-center">
              <button
                type="button"
                id="btn-complete-absentee-redraw"
                onClick={handleCompleteRedraw}
                className="festive-primary-btn flex items-center gap-2 px-10 py-3.5 rounded-2xl text-base font-black shadow-lg active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>確認領獎</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
