import React, { useState, useEffect, useMemo } from 'react';
import { Prize, DrawMethodType } from '../types';
import { X, Check, Calculator, Users, Sparkles, SlidersHorizontal, AlertCircle, Minus, Plus } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface QuickAdjustPrizeModalProps {
  isOpen: boolean;
  prize: Prize | null;
  drawnCount: number;
  onClose: () => void;
  onSave: (
    prizeId: string,
    updates: {
      quota: number;
      content: string;
      drawMethod: DrawMethodType;
      syncExistingWinnersContent: boolean;
    }
  ) => void;
}

interface ParsedAmount {
  value: number;
  rawMatch: string;
  hasComma: boolean;
  index: number;
}

/**
 * 從獎品文字中偵測最可能是金額／數值的數字（排除像 iPhone 16 這類小於 100 的型號數字）
 */
function parseAmountFromContent(text: string): ParsedAmount | null {
  if (!text) return null;
  const regex = /\d{1,3}(?:,\d{3})+|\d+/g;
  let match: RegExpExecArray | null;
  let best: ParsedAmount | null = null;

  while ((match = regex.exec(text)) !== null) {
    const rawMatch = match[0];
    const numericVal = parseInt(rawMatch.replace(/,/g, ''), 10);
    if (!Number.isNaN(numericVal) && numericVal >= 100) {
      if (!best || numericVal >= best.value) {
        best = {
          value: numericVal,
          rawMatch,
          hasComma: rawMatch.includes(','),
          index: match.index,
        };
      }
    }
  }

  return best;
}

function formatAmount(value: number, useComma: boolean): string {
  return useComma ? value.toLocaleString('en-US') : String(value);
}

function replaceParsedAmount(text: string, parsed: ParsedAmount, newValue: number): string {
  const formatted = formatAmount(newValue, parsed.hasComma);
  return (
    text.slice(0, parsed.index) +
    formatted +
    text.slice(parsed.index + parsed.rawMatch.length)
  );
}

export const QuickAdjustPrizeModal: React.FC<QuickAdjustPrizeModalProps> = ({
  isOpen,
  prize,
  drawnCount,
  onClose,
  onSave,
}) => {
  const [quota, setQuota] = useState<number>(1);
  const [content, setContent] = useState<string>('');
  const [drawMethod, setDrawMethod] = useState<DrawMethodType>('step');
  const [autoSplitEnabled, setAutoSplitEnabled] = useState<boolean>(true);
  const [hasEditedContentManually, setHasEditedContentManually] = useState<boolean>(false);
  const [syncExistingWinnersContent, setSyncExistingWinnersContent] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const minQuota = Math.max(1, drawnCount);

  // Reset form when modal opens or prize changes
  useEffect(() => {
    if (isOpen && prize) {
      setQuota(Math.max(1, prize.quota));
      setContent(prize.content);
      setDrawMethod(prize.drawMethod || (prize.quota > 5 ? 'batch' : 'step'));
      setAutoSplitEnabled(true);
      setHasEditedContentManually(false);
      setSyncExistingWinnersContent(true);
      setErrorMsg('');
    }
  }, [isOpen, prize]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const originalParsedAmount = useMemo(() => {
    if (!prize) return null;
    return parseAmountFromContent(prize.content);
  }, [prize]);

  const totalBudget = useMemo(() => {
    if (!prize || !originalParsedAmount) return null;
    return originalParsedAmount.value * Math.max(1, prize.quota);
  }, [prize, originalParsedAmount]);

  const splitCalculation = useMemo(() => {
    if (!totalBudget || !originalParsedAmount || quota <= 0) return null;
    const exact = totalBudget / quota;
    const isExactInteger = totalBudget % quota === 0;
    const rounded = Math.round(exact);
    return {
      totalBudget,
      perPersonRounded: rounded,
      isExactInteger,
      suggestedContent: replaceParsedAmount(prize!.content, originalParsedAmount, rounded),
    };
  }, [totalBudget, originalParsedAmount, quota, prize]);

  const applyQuotaChange = (nextQuotaRaw: number) => {
    const nextQuota = Math.min(999, Math.max(minQuota, nextQuotaRaw));
    setQuota(nextQuota);
    setErrorMsg('');

    if (
      prize &&
      autoSplitEnabled &&
      !hasEditedContentManually &&
      originalParsedAmount &&
      totalBudget !== null
    ) {
      if (totalBudget % nextQuota === 0) {
        const perPerson = totalBudget / nextQuota;
        setContent(replaceParsedAmount(prize.content, originalParsedAmount, perPerson));
      }
    }
  };

  if (!isOpen || !prize) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quota < minQuota) {
      setErrorMsg(`名額不可少於目前已抽出的 ${drawnCount} 人`);
      return;
    }
    if (!content.trim()) {
      setErrorMsg('請輸入調整後的獎品內容與說明');
      return;
    }

    soundEffects.playTick();
    onSave(prize.id, {
      quota,
      content: content.trim(),
      drawMethod,
      syncExistingWinnersContent: drawnCount > 0 ? syncExistingWinnersContent : false,
    });
    onClose();
  };

  const quickQuotaOptions = [1, 2, 3, 4, 5, 6, 8, 10].filter(n => n >= minQuota);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border-2 border-amber-300 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="關閉調整視窗"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-5 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-sm shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                現場調整名額與獎品（拆獎）
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                保留原獎池資格
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              目前獎項：<strong className="text-rose-700">{prize.name}</strong>
              <span className="mx-1.5 text-slate-300">|</span>
              原設定：{prize.quota} 名（已抽出 {drawnCount} 名）
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. 名額調整區塊 */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/90 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-rose-600" />
                <span>調整抽出名額（人數）</span>
              </label>
              {drawnCount > 0 && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                  已抽出 {drawnCount} 人，最少需 {minQuota} 人
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyQuotaChange(quota - 1)}
                disabled={quota <= minQuota}
                className="w-10 h-10 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 disabled:opacity-35 flex items-center justify-center text-slate-800 font-bold cursor-pointer active:scale-95 transition-all"
                title="減少 1 名"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min={minQuota}
                max={999}
                value={quota}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  if (!Number.isNaN(parsed)) {
                    applyQuotaChange(parsed);
                  }
                }}
                className="flex-1 h-10 px-3 rounded-xl bg-white border-2 border-amber-300 text-center font-mono font-black text-lg text-rose-700 focus:outline-none focus:border-rose-500"
              />

              <button
                type="button"
                onClick={() => applyQuotaChange(quota + 1)}
                className="w-10 h-10 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 flex items-center justify-center text-slate-800 font-bold cursor-pointer active:scale-95 transition-all"
                title="增加 1 名"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 快速人數點選 */}
            {quickQuotaOptions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium mr-1">快速切換：</span>
                {quickQuotaOptions.map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => applyQuotaChange(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      quota === num
                        ? 'festive-gold-btn shadow-2xs'
                        : 'bg-white border border-amber-200 text-slate-700 hover:bg-amber-100'
                    }`}
                  >
                    {num} 人
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. 獎品內容與智慧拆算小幫手 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs sm:text-sm font-bold text-slate-800">
                調整後獎品內容／每位金額 <span className="text-rose-600">*</span>
              </label>

              {originalParsedAmount && (
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSplitEnabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setAutoSplitEnabled(next);
                      if (next && splitCalculation?.isExactInteger) {
                        setHasEditedContentManually(false);
                        setContent(splitCalculation.suggestedContent);
                      }
                    }}
                    className="rounded accent-emerald-600 cursor-pointer"
                  />
                  <span>依原總預算自動均分金額</span>
                </label>
              )}
            </div>

            <input
              type="text"
              value={content}
              onChange={(e) => {
                setHasEditedContentManually(true);
                setContent(e.target.value);
                setErrorMsg('');
              }}
              placeholder="例如：現金 2,000 元"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
            />

            {/* 智慧試算提示條 */}
            {splitCalculation && quota !== prize.quota && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 flex-wrap ${
                  splitCalculation.isExactInteger
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 shrink-0" />
                  <span>
                    原總額 <strong>{splitCalculation.totalBudget.toLocaleString('en-US')}</strong> ÷{' '}
                    <strong>{quota}</strong> 人
                    {splitCalculation.isExactInteger ? (
                      <>
                        {' '}
                        = 每人 <strong className="font-mono">{splitCalculation.perPersonRounded.toLocaleString('en-US')}</strong>
                      </>
                    ) : (
                      <>
                        {' '}
                        ≈ 每人 <strong className="font-mono">{splitCalculation.perPersonRounded.toLocaleString('en-US')}</strong>（無法整除，請自行微調）
                      </>
                    )}
                  </span>
                </div>

                {content.trim() !== splitCalculation.suggestedContent && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasEditedContentManually(false);
                      setContent(splitCalculation.suggestedContent);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] cursor-pointer shadow-2xs"
                  >
                    套用試算 ({splitCalculation.perPersonRounded.toLocaleString('en-US')})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. 抽獎方式快捷切換 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              本獎項抽獎方式
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDrawMethod('step')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  drawMethod === 'step'
                    ? 'bg-rose-50 border-2 border-rose-600 text-rose-800 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 逐次抽出（1 位 1 位抽）</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawMethod('batch')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  drawMethod === 'batch'
                    ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>👥 一次全抽（共 {quota} 位）</span>
              </button>
            </div>
          </div>

          {/* 4. 若已有得主，提供同步更新既有紀錄選項 */}
          {drawnCount > 0 && content.trim() !== prize.content && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 cursor-pointer">
              <input
                type="checkbox"
                checked={syncExistingWinnersContent}
                onChange={(e) => setSyncExistingWinnersContent(e.target.checked)}
                className="mt-0.5 rounded accent-rose-600 cursor-pointer"
              />
              <span>
                <strong>同步修正已抽出 {drawnCount} 位得主的獎品顯示內容</strong>
                <span className="block text-[11px] text-rose-700 mt-0.5">
                  建議勾選：讓先前已抽出的得主與後續補抽出的得主在星光榜及匯出 Excel 中統一顯示為「{content.trim()}」。
                </span>
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="festive-primary-btn px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-white" />
              <span>確認套用變更 ({quota} 名)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
