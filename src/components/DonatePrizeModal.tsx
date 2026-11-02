import React, { useState } from 'react';
import { WinningRecord, Prize } from '../types';
import { Gift, ArrowRight, RotateCcw, X, HeartHandshake } from 'lucide-react';
import { Mascot } from './Mascot';

interface DonatePrizeModalProps {
  isOpen: boolean;
  winner: WinningRecord | null;
  prize?: Prize | null;
  onClose: () => void;
  onConfirmDonate: (options: {
    note?: string;
  }) => void;
  isBonusPool?: boolean;
}

export const DonatePrizeModal: React.FC<DonatePrizeModalProps> = ({
  isOpen,
  winner,
  onClose,
  onConfirmDonate,
  isBonusPool = false,
}) => {
  const [customNote, setCustomNote] = useState('');

  if (!isOpen || !winner) return null;

  const handleConfirm = () => {
    onConfirmDonate({
      note: customNote.trim() || '愛心同仁好意捐出，當前獎項名額釋出重抽',
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
    >
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-white border border-amber-300 shadow-2xl overflow-hidden text-slate-800"
      >
        {/* Top Decorative Festive Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <Mascot state="donated" size={44} className="shrink-0" />
            <div>
              <h3 id="donate-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-1.5 font-display">
                <span>同仁愛心捐出確認</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                  釋出名額
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                將此獎項好意捐出，原獎項立即釋出名額以供現場重新抽獎
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* Winner & Prize Info Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-900 font-bold">中獎同仁資訊</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-amber-200 text-slate-700 font-mono font-bold">
                員編：{winner.employeeNo}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {winner.employeeName}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                {winner.department}
              </span>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">原抽中獎項：</span>
              <span className="font-bold text-rose-700 text-sm">
                {winner.prizeName} • {winner.prizeContent}
              </span>
            </div>
          </div>

          {/* Action Explanation Card */}
          <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>處置規則：當前獎項名額立即釋出</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pl-5 list-disc">
              <li>
                <strong>名額即刻釋出：</strong>此筆中獎紀錄將被移除，【{winner.prizeName}】的剩餘待抽名額立即增加 1 位。
              </li>
              <li>
                <strong>標記該獎池資格：</strong>捐出同仁【{winner.employeeName}】將被系統標記，<strong>不可再參與此獎池（{winner.poolType === 'bonus' || isBonusPool ? '加碼獎池' : '正規獎池'}）之其他獎項抽獎</strong>。
              </li>
              <li>
                <strong>現場直接重抽：</strong>主持人或操作人員可於舞台直接點選抽獎，現場重新抽出一名幸運兒。
              </li>
              <li>
                <strong>愛心紀錄存查：</strong>捐出行為將完整記錄於「愛心捐出明細」與匯出報表，表揚同仁善意！
              </li>
            </ul>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label htmlFor="donate-custom-note" className="block text-xs font-bold text-slate-700">
              備註說明（選填）：
            </label>
            <input
              id="donate-custom-note"
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="例如：同仁加碼愛心捐出、主管好意釋出名額重抽..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            取消
          </button>

          <button
            type="button"
            id="btn-confirm-donate"
            onClick={handleConfirm}
            className="festive-primary-btn flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Gift className="w-4 h-4 text-white" />
            <span>確認捐出並釋出名額</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
