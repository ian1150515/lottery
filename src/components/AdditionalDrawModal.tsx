import React, { useState } from 'react';
import { Prize } from '../types';
import { Sparkles, X, Flame, ArrowRight } from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';
import { Mascot } from './Mascot';
import { GoldIngot } from './FestiveIllustrations';

interface AdditionalDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAdditionalPrize: (prize: Prize, drawImmediately: boolean) => void;
  existingPrizeCount: number;
}

const PRESET_ADDITIONAL_PRIZES = [
  { name: '老闆特別加碼紅包', content: '現金紅包 10,000 元', quota: 5 },
  { name: '總經理加碼現金獎', content: '新台幣 20,000 元現金', quota: 2 },
  { name: '董事長尊榮大紅包', content: '新台幣 50,000 元大紅包', quota: 1 },
  { name: '贊助商特別獎', content: 'Dyson 吹風機或最新 iPad', quota: 3 },
  { name: '加碼驚喜好禮', content: '星巴克千元隨行卡 + 禮盒', quota: 10 },
];

export const AdditionalDrawModal: React.FC<AdditionalDrawModalProps> = ({
  isOpen,
  onClose,
  onAddAdditionalPrize,
  existingPrizeCount,
}) => {
  const [prizeName, setPrizeName] = useState('');
  const [prizeContent, setPrizeContent] = useState('');
  const [quota, setQuota] = useState(1);
  const [drawImmediately, setDrawImmediately] = useState(true);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof PRESET_ADDITIONAL_PRIZES[0]) => {
    setPrizeName(preset.name);
    setPrizeContent(preset.content);
    setQuota(preset.quota);
    soundEffects.playTick();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeName.trim() || quota <= 0) return;

    const newPrize: Prize = {
      id: `prize-add-${Date.now()}`,
      name: prizeName.trim(),
      content: prizeContent.trim() || prizeName.trim(),
      quota: quota,
      order: drawImmediately ? 0 : existingPrizeCount + 1,
      isAdditional: true,
      poolType: 'bonus',
      allowRepeat: false,
    };

    onAddAdditionalPrize(newPrize, drawImmediately);
    soundEffects.playFanfare();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-800">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <Mascot state="celebrate" size={44} className="shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
              現場臨時追加抽獎
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                即時加碼
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              主管或老闆現場即興加碼，名單獨立標註便於活動核銷
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <div className="text-xs text-slate-600 mb-2 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            常用現場加碼範本 (點擊快速套用)：
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ADDITIONAL_PRIZES.map((preset, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 transition-colors cursor-pointer"
              >
                + {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              加碼獎項名稱 <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={prizeName}
              onChange={(e) => setPrizeName(e.target.value)}
              placeholder="例如：董事長特別加碼、現場驚喜大紅包"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              獎品內容與備註
            </label>
            <input
              type="text"
              value={prizeContent}
              onChange={(e) => setPrizeContent(e.target.value)}
              placeholder="例如：現金 10,000 元 / 蘋果手錶"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                加碼名額數量 <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quota}
                onChange={(e) => setQuota(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                抽獎順位
              </label>
              <div className="flex items-center h-[42px] px-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={drawImmediately}
                    onChange={(e) => setDrawImmediately(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 accent-rose-600"
                  />
                  <span>立即置頂插隊抽</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="festive-primary-btn flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-95 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-white" />
              <span>確認建立並開始加碼</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
