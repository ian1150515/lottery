import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, AlertTriangle, X, Check, ArrowRight, Database, Users, Trophy } from 'lucide-react';

interface ConfirmLoadMockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentEmployeesCount: number;
  currentPrizesCount: number;
  currentWinnersCount: number;
}

export const ConfirmLoadMockModal: React.FC<ConfirmLoadMockModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentEmployeesCount,
  currentPrizesCount,
  currentWinnersCount,
}) => {
  if (!isOpen) return null;

  const hasExistingData = currentEmployeesCount > 0 || currentPrizesCount > 0 || currentWinnersCount > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg rounded-3xl bg-white border-2 border-amber-300 p-6 sm:p-7 shadow-2xl text-slate-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs border border-amber-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-wide font-display">
                  載入彩排測試資料確認
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  全真抽獎模擬測試資料佈建
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="btn-close-mock-modal"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="py-4 space-y-4 text-xs sm:text-sm">
            {hasExistingData ? (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">注意：目前系統中已有資料</div>
                  <div className="text-xs text-amber-800 leading-relaxed">
                    目前已有 <strong className="font-mono">{currentEmployeesCount}</strong> 位同仁名冊、
                    <strong className="font-mono">{currentPrizesCount}</strong> 個獎項，且已開出 <strong className="font-mono">{currentWinnersCount}</strong> 位得獎紀錄。
                    載入彩排資料將會<strong>完全覆蓋目前資料庫並重設開獎記錄</strong>！
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 leading-relaxed">
                即將為您建立專屬的全真尾牙抽獎體驗環境，包含完整的跨部門同仁名冊與多級距熱門獎項（含圖片）。
              </p>
            )}

            {/* Content summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-600" />
                預計載入內容包含：
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <div>
                    <div className="text-slate-500 text-[11px]">跨部門員工名單</div>
                    <div className="font-bold text-slate-800">50 位完整同仁</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-slate-500 text-[11px]">標準獎項級距</div>
                    <div className="font-bold text-slate-800">5 項熱門大獎</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-1">
                ※ 包含：特獎 iPhone 17 Pro、頭獎 Dyson 吹風機、二獎百貨禮券、三獎氣炸鍋、普獎厚禮紅包
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              取消
            </button>

            <button
              id="btn-confirm-load-mock"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="festive-primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4 text-white" />
              <span>確認載入全真資料</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
