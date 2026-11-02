import React, { useState, useEffect, useRef } from 'react';
import { Prize } from '../types';
import { X, Upload, Image as ImageIcon, Trash2, Check, Flame, Gift } from 'lucide-react';

interface PrizeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prizeData: Omit<Prize, 'id'> & { id?: string }) => void;
  initialPrize?: Prize | null;
  existingPrizesCount: number;
}

const PRESET_SAMPLE_IMAGES = [
  { name: '智慧旗艦手機', url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80' },
  { name: '美髮吹風機', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80' },
  { name: '百貨購物禮券', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80' },
  { name: '健康氣炸鍋家電', url: 'https://images.unsplash.com/photo-1584990347449-a297e289bf00?w=600&auto=format&fit=crop&q=80' },
  { name: '厚禮紅包大現金', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80' },
  { name: '高音質抗噪耳機', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
];

export const PrizeEditModal: React.FC<PrizeEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPrize,
  existingPrizesCount,
}) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [quota, setQuota] = useState(1);
  const [order, setOrder] = useState(1);
  const [image, setImage] = useState('');
  const [poolType, setPoolType] = useState<'main' | 'bonus'>('main');
  const [drawMethod, setDrawMethod] = useState<'step' | 'batch'>('step');
  const [drawRule, setDrawRule] = useState('一人一獎 (排除已中獎者)');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPrize) {
      setName(initialPrize.name);
      setContent(initialPrize.content);
      setQuota(initialPrize.quota);
      setOrder(initialPrize.order);
      setImage(initialPrize.image || '');
      setPoolType(initialPrize.poolType || (initialPrize.isAdditional ? 'bonus' : 'main'));
      setDrawMethod(initialPrize.drawMethod || (initialPrize.quota > 5 ? 'batch' : 'step'));
      setDrawRule(initialPrize.drawRule || (initialPrize.allowRepeat ? '全員皆可重複中獎' : '一人一獎 (排除已中獎者)'));
    } else {
      setName('');
      setContent('');
      setQuota(1);
      setOrder(existingPrizesCount + 1);
      setImage('');
      setPoolType('main');
      setDrawMethod('step');
      setDrawRule('一人一獎 (排除已中獎者)');
    }
    setErrorMsg('');
  }, [initialPrize, existingPrizesCount, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('請選取有效的圖片檔案（PNG, JPG, WebP）');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('圖片大小請小於 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setImage(dataUrl);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('請輸入獎項名稱（如：特獎、頭獎、加碼獎）');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('請輸入獎品名稱與內容（如：iPhone 17 Pro）');
      return;
    }
    if (quota < 1) {
      setErrorMsg('數量至少為 1 名');
      return;
    }

    const allowRepeat = drawRule.includes('允許重複') || drawRule.includes('可重複') || drawRule.includes('全員皆可');

    onSave({
      id: initialPrize?.id,
      name: name.trim(),
      content: content.trim(),
      quota: Number(quota),
      order: Number(order) || 1,
      image: image.trim() || undefined,
      poolType: poolType,
      isAdditional: poolType === 'bonus',
      allowRepeat,
      drawRule: drawRule.trim(),
      drawMethod,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl rounded-3xl bg-white border-2 border-amber-300 p-6 sm:p-7 shadow-2xl text-slate-800 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-display">
                {initialPrize ? '編輯獎項與獎品資料' : '新增抽獎獎項與獎品'}
              </h3>
              <p className="text-xs text-slate-500">
                設定獎項名稱、獎品內容、名額數量與上傳專屬展示圖
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 獎池類型 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              所屬獎池類別
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPoolType('main')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  poolType === 'main'
                    ? 'bg-rose-50 border-2 border-rose-600 text-rose-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Gift className="w-4 h-4 text-rose-600" />
                <span>正規獎項池（常規一人一獎）</span>
              </button>

              <button
                type="button"
                onClick={() => setPoolType('bonus')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  poolType === 'bonus'
                    ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span>★ 加碼專區（全員同樂）</span>
              </button>
            </div>
          </div>

          {/* 獎項名稱與名額數量 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                獎項名稱 <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：特獎、頭獎、二獎、加碼獎"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['特獎', '頭獎', '二獎', '三獎', '普獎', '加碼現金獎'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setName(tag)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                名額數量（人） <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={quota}
                onChange={(e) => setQuota(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">該獎項預計抽出的幸運中獎總人數</p>
            </div>
          </div>

          {/* 獎品內容與說明 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              獎品內容與說明 <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如：iPhone 17 Pro 256GB 太空黑、新光三越禮券 3,000 元"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* 抽獎方式與抽獎規則 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                抽獎方式 (逐次抽出 vs 一次抽出)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDrawMethod('step')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    drawMethod === 'step'
                      ? 'bg-rose-50 border-2 border-rose-600 text-rose-800 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ⚡ 逐次抽出
                </button>
                <button
                  type="button"
                  onClick={() => setDrawMethod('batch')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    drawMethod === 'batch'
                      ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  👥 一次抽出
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {drawMethod === 'step' ? '每次依序抽出 1 位同仁' : `整批一次抽出該獎項名額 (${quota}人)`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                抽獎規則
              </label>
              <input
                type="text"
                value={drawRule}
                onChange={(e) => setDrawRule(e.target.value)}
                placeholder="例如：一人一獎 (排除已中獎者)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[
                  '一人一獎 (排除已中獎者)',
                  '全員皆可重複中獎',
                ].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDrawRule(r)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 獎品圖片上傳與預覽 */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>獎品圖片（支援本地上傳、圖片網址與即時預覽）</span>
              </label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage('')}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 移除圖片
                </button>
              )}
            </div>

            {/* Preview Box & Upload Trigger */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-amber-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative group shadow-xs">
                {image ? (
                  <>
                    <img 
                      src={image} 
                      alt="獎品預覽" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[10px] text-white font-bold">點擊更換</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                    <span className="text-[10px]">尚未選取圖片</span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>從本機選取上傳圖片 (JPG, PNG, WebP)</span>
                </button>

                <div className="relative">
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="或直接貼上圖片網址 (https://...)"
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Preset Gift Images */}
            <div>
              <div className="text-[11px] text-slate-500 mb-1.5">或快速選用精選實物圖庫：</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_SAMPLE_IMAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className="group relative rounded-lg border border-amber-200 overflow-hidden h-14 bg-slate-100 cursor-pointer hover:border-rose-500 transition-all shadow-xs"
                    title={preset.name}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent flex items-end justify-center p-0.5">
                      <span className="text-[9px] text-white font-medium truncate">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="festive-primary-btn px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4 text-white" />
              <span>{initialPrize ? '儲存獎項變更' : '確定新增獎項'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
