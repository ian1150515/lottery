import React, { useState, useRef } from 'react';
import { Prize } from '../types';
import { 
  parseExcelPrizesWithDiagnostics, 
  parseSmartWorkbook, 
  downloadPrizeExcelTemplate 
} from '../utils/excelHelper';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Gift, 
  Download, 
  X, 
  Plus, 
  RotateCcw,
  Sparkles,
  Info,
  Flame,
  Layers
} from 'lucide-react';

interface PrizeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPrizes: (prizes: Prize[], mode: 'append' | 'overwrite') => void;
  currentPrizesCount: number;
}

export const PrizeImportModal: React.FC<PrizeImportModalProps> = ({
  isOpen,
  onClose,
  onImportPrizes,
  currentPrizesCount,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPrizes, setParsedPrizes] = useState<Prize[] | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [hasEmployeeSheetDetected, setHasEmployeeSheetDetected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setParsedPrizes(null);
    setParsedFileName('');
    setErrorMessage(null);
    setWarningMessage(null);
    setHasEmployeeSheetDetected(false);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setWarningMessage(null);
    setHasEmployeeSheetDetected(false);
    setIsProcessing(true);

    try {
      // 1. Try specialized prize diagnostic parsing
      const result = await parseExcelPrizesWithDiagnostics(file);

      if (result.success && result.prizes.length > 0) {
        setParsedPrizes(result.prizes);
        setParsedFileName(file.name);
        if (result.warnings && result.warnings.length > 0) {
          setWarningMessage(result.warnings.join('；'));
        }
      } else {
        // Fallback: smart workbook parse to see if it's a combined workbook
        const smartResult = await parseSmartWorkbook(file);
        if (smartResult.prizes.length > 0) {
          setParsedPrizes(smartResult.prizes);
          setParsedFileName(file.name);
          if (smartResult.employees.length > 0) {
            setHasEmployeeSheetDetected(true);
          }
        } else {
          setErrorMessage(
            result.errors.length > 0 
              ? result.errors.join('；') 
              : `未能於檔案「${file.name}」中辨識到有效的獎品資料欄位（需包含獎項名稱、獎品內容或數量名額）。建議下載標準獎品範本確認。`
          );
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '檔案解析失敗，請確認檔案格式是否正確。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleConfirmImport = (mode: 'append' | 'overwrite') => {
    if (!parsedPrizes || parsedPrizes.length === 0) return;
    onImportPrizes(parsedPrizes, mode);
    handleClose();
  };

  const totalQuota = (parsedPrizes || []).reduce((acc, p) => acc + (p.quota || 1), 0);
  const regularCount = (parsedPrizes || []).filter(p => !p.isAdditional && p.poolType !== 'bonus').length;
  const bonusCount = (parsedPrizes || []).filter(p => p.isAdditional || p.poolType === 'bonus').length;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white border-2 border-amber-300 rounded-3xl shadow-2xl overflow-hidden text-slate-800 ring-4 ring-amber-200/50 max-h-[92vh] flex flex-col">
        {/* Top Gradient Festive Line */}
        <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-amber-400 via-rose-500 to-amber-400 shrink-0" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/60 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                  匯入獎項與獎品清單 (Excel / CSV)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  獎品專用
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                目前系統內現有獎項共 <strong className="text-rose-700 font-mono font-bold">{currentPrizesCount}</strong> 項
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="關閉視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInput}
            className="hidden"
          />

          {!parsedPrizes ? (
            /* Upload Zone */
            <div className="space-y-4">
              <div
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer group flex flex-col items-center justify-center ${
                  isDragOver
                    ? 'border-rose-500 bg-rose-50/70 scale-[1.01]'
                    : 'border-amber-300 hover:border-rose-400 bg-amber-50/40 hover:bg-amber-50/80'
                }`}
              >
                {isProcessing ? (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <RotateCcw className="w-10 h-10 text-rose-600 animate-spin" />
                    <div className="text-sm font-bold text-slate-800">
                      檔案解析處理中（包含圖片解包）...
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-rose-100 group-hover:text-rose-700 transition-all shadow-inner">
                      <FileSpreadsheet className="w-9 h-9" />
                    </div>
                    <div className="text-base font-bold text-slate-800 group-hover:text-rose-700">
                      點擊上傳或拖曳獎品清單 Excel 檔案至此
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
                      支援 <strong>.xlsx、.xls、.csv</strong> 格式。<strong>支援自動擷取 Excel 內嵌商品圖片</strong>！
                    </p>
                    <div className="mt-4 px-4 py-1.5 rounded-full bg-white text-rose-700 border border-amber-300 text-xs font-bold shadow-xs">
                      選擇電腦本機檔案 ➜
                    </div>
                  </>
                )}
              </div>

              {/* Template Download Prompt */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Download className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>尚未準備好獎品清單格式？可直接下載標準空白範本填寫：</span>
                </div>
                <button
                  type="button"
                  onClick={downloadPrizeExcelTemplate}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-amber-900 border border-amber-300 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>下載獎品清單範本 (.xlsx)</span>
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Preview Section */
            <div className="space-y-4 animate-fadeIn">
              {/* File Info Bar */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>已成功解析檔案：{parsedFileName}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-950 font-mono">
                    共 {parsedPrizes.length} 項獎品（總名額 {totalQuota} 名）
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  重選檔案
                </button>
              </div>

              {/* Warning if dual sheets detected */}
              {hasEmployeeSheetDetected && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    💡 偵測到此活頁簿亦包含「員工名單」，系統已為您自動讀取「獎品清單」。若要匯入員工名冊，可至「同仁名冊」分頁進行。
                  </span>
                </div>
              )}

              {/* Prize Categories Summary */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>獎項級距統計：</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700">
                    正規獎項：<strong className="text-amber-800">{regularCount}</strong> 項
                  </span>
                  {bonusCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-600" />
                      現場加碼：<strong>{bonusCount}</strong> 項
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-bold font-mono">
                    總名額：{totalQuota} 名
                  </span>
                </div>
              </div>

              {/* Sample Preview List */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>獎項解析預覽（共 {parsedPrizes.length} 項）：</span>
                  <span className="text-[11px] text-slate-400 font-normal">確認名稱、名額與抽出方式</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {parsedPrizes.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 hover:bg-amber-50/40 text-xs">
                      {p.image ? (
                        <img 
                          src={p.image} 
                          alt={p.name} 
                          className="w-10 h-10 rounded-xl object-cover border border-amber-200 shadow-xs shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-100/60 border border-amber-200 flex items-center justify-center text-[10px] text-amber-800 font-bold shrink-0">
                          無圖
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{p.name}</span>
                          {(p.poolType === 'bonus' || p.isAdditional) && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                              加碼
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {p.drawMethod === 'batch' ? '一次全抽' : '逐次抽出'}
                          </span>
                        </div>
                        <div className="text-slate-600 text-[11px] truncate mt-0.5">
                          {p.content}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-sm text-rose-700">
                          {p.quota} <span className="text-xs font-normal text-slate-400">名</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode Selection & Import Actions */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border-2 border-amber-300 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>請選擇獎品匯入模式：</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleConfirmImport('append')}
                    className="p-3 rounded-xl bg-white hover:bg-amber-50 border-2 border-amber-300 hover:border-amber-400 text-left transition-all cursor-pointer shadow-xs active:scale-98 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-black text-xs sm:text-sm text-amber-950 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-amber-600" />
                        <span>追加合併至現有獎項</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        保留目前已設定的 {currentPrizesCount} 項獎品，將這 {parsedPrizes.length} 項新獎品加入清單後方。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded self-start">
                      推薦：增補現場獎項
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentPrizesCount > 0) {
                        if (!window.confirm(`確定以新獎項清單（${parsedPrizes.length} 項）完全取代現有獎項（${currentPrizesCount} 項）嗎？`)) {
                          return;
                        }
                      }
                      handleConfirmImport('overwrite');
                    }}
                    className="p-3 rounded-xl bg-white hover:bg-rose-50 border-2 border-rose-300 hover:border-rose-400 text-left transition-all cursor-pointer shadow-xs active:scale-98 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-black text-xs sm:text-sm text-rose-950 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        <span>完全覆蓋現有獎品</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        清空並重設為本次匯入的 {parsedPrizes.length} 項獎項清單。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded self-start">
                      大會全新設定初次佈建
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            支援欄位：獎項名稱、獎品內容、名額數量、抽獎方式、圖片（或網址）
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
          >
            取消關閉
          </button>
        </div>
      </div>
    </div>
  );
};
