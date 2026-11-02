import React, { useState, useRef, useEffect } from 'react';
import { 
  FileJson, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Download, 
  RotateCcw, 
  Calendar, 
  Users, 
  Gift, 
  Trophy, 
  Clock, 
  FileText,
  ShieldAlert,
  Sparkles,
  HeartHandshake
} from 'lucide-react';
import { StorageSnapshotData, validateJsonBackupContent } from '../utils/storageHelper';
import { soundEffects } from '../utils/soundEffects';

interface RestoreJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRestore: (data: StorageSnapshotData) => void;
  onExportCurrentBackup: () => void;
  currentEmployeesCount: number;
  currentPrizesCount: number;
  currentWinnersCount: number;
}

export const RestoreJsonModal: React.FC<RestoreJsonModalProps> = ({
  isOpen,
  onClose,
  onConfirmRestore,
  onExportCurrentBackup,
  currentEmployeesCount,
  currentPrizesCount,
  currentWinnersCount,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<StorageSnapshotData | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasExportedCurrent, setHasExportedCurrent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setIsDragging(false);
      setIsParsing(false);
      setParseError(null);
      setParsedData(null);
      setIsConfirmed(false);
      setHasExportedCurrent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setParsedData(null);
    setIsConfirmed(false);

    try {
      const text = await file.text();
      const result = validateJsonBackupContent(text);

      if (!result.success || !result.data) {
        setParseError(result.error || '無法識別該備份檔案格式。');
        soundEffects.playRedrawSound();
      } else {
        setParsedData(result.data);
        soundEffects.playTick();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setParseError(`讀取檔案失敗：${errMsg}`);
      soundEffects.playRedrawSound();
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleExportSafetyBackup = () => {
    onExportCurrentBackup();
    setHasExportedCurrent(true);
    soundEffects.playTick();
  };

  const handleExecuteRestore = () => {
    if (!parsedData || !isConfirmed) return;
    onConfirmRestore(parsedData);
    onClose();
  };

  const totalQuota = parsedData?.prizes.reduce((sum, p) => sum + (p.quota || 1), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl border-2 border-amber-300 shadow-2xl p-5 sm:p-7 overflow-hidden max-h-[92vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Festive Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 via-amber-300 to-rose-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-sm ring-2 ring-amber-200">
              <FileJson className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 font-display flex items-center gap-2">
                <span>從 JSON 備份檔還原抽獎狀態</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  安全檢核
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                完整復原同仁名冊、獎項清單、中獎歷史、缺席棄權與愛心捐出紀錄
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="關閉視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Overwrite Warning Notice */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-amber-300 shadow-2xs space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-black text-rose-900 text-sm">
                  ⚠️ 重要提醒：還原操作將全面覆蓋當前資料
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  系統將依您上傳的備份檔還原。目前現存的 <strong className="text-slate-900">{currentEmployeesCount} 位同仁</strong>、<strong className="text-slate-900">{currentPrizesCount} 項獎品</strong> 及 <strong className="text-rose-700">{currentWinnersCount} 筆中獎紀錄</strong> 將被備份檔內容取代。
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-600">
                {hasExportedCurrent ? '✓ 已為當前進度完成下載備份！' : '建議在還原前先備份目前狀態：'}
              </span>
              <button
                type="button"
                onClick={handleExportSafetyBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>{hasExportedCurrent ? '再次下載當前進度 (JSON)' : '先下載當前最新備份 (防失誤)'}</span>
              </button>
            </div>
          </div>

          {/* File Picker & Dropzone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                isDragging
                  ? 'border-amber-500 bg-amber-50 shadow-inner'
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                點擊此處選擇 JSON 備份檔，或將檔案拖曳至此
              </p>
              <p className="text-xs text-slate-500 mt-1">
                僅支援本抽獎系統匯出之標準 .json 備份檔
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <FileJson className="w-5 h-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    大小：{(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 transition-colors cursor-pointer shrink-0"
              >
                更換其他檔案
              </button>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-900 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4 animate-spin text-amber-600" />
              <span>正在讀取並校驗備份檔結構...</span>
            </div>
          )}

          {/* Parse Error Box */}
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">驗證未通過：</strong>
                <span className="ml-1">{parseError}</span>
                <div className="text-rose-600/80 text-[11px] mt-1">
                  請確認您所選取的檔案為從系統「下載完整歷程備份檔 (JSON)」所匯出的檔案。
                </div>
              </div>
            </div>
          )}

          {/* Validated Backup Content Details Preview */}
          {parsedData && (
            <div className="space-y-3 pt-1 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl w-fit">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>備份檔案結構驗證通過，符合全域還原規格！</span>
              </div>

              {/* Data Scope Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>備份存檔時間</span>
                  </div>
                  <div className="font-bold text-slate-800 mt-1 truncate" title={new Date(parsedData.savedAt).toLocaleString()}>
                    {new Date(parsedData.savedAt).toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>活動標題</span>
                  </div>
                  <div className="font-bold text-slate-800 mt-1 truncate" title={parsedData.settings?.activityTitle || '標準抽獎'}>
                    {parsedData.settings?.activityTitle || '標準抽獎'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Users className="w-3 h-3 text-rose-500" />
                    <span>同仁名冊人數</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 font-mono">
                    {parsedData.employees.length} 位
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Gift className="w-3 h-3 text-amber-500" />
                    <span>獎項清單</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 font-mono">
                    {parsedData.prizes.length} 項 ({totalQuota} 名額)
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-600" />
                    <span>已抽出得獎紀錄</span>
                  </div>
                  <div className="font-bold text-rose-700 mt-1 font-mono">
                    {parsedData.winningRecords.length} 筆
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1">
                    <HeartHandshake className="w-3 h-3 text-emerald-600" />
                    <span>缺席與捐出紀錄</span>
                  </div>
                  <div className="font-bold text-slate-800 mt-1 font-mono">
                    {parsedData.absentRecords.length} 缺席 / {parsedData.donationRecords?.length || 0} 捐出
                  </div>
                </div>
              </div>

              {/* Secondary Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-300 text-xs text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => setIsConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="font-bold text-rose-950">
                  我已詳細核對上述備份資訊無誤，確定要將當前抽獎狀態還原為此備份檔的內容（覆蓋現有資料）。
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
          >
            取消
          </button>

          <button
            type="button"
            disabled={!parsedData || !isConfirmed}
            onClick={handleExecuteRestore}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              parsedData && isConfirmed
                ? 'festive-gold-btn cursor-pointer active:scale-95 text-amber-950 font-black'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>確認還原並載入抽獎狀態</span>
          </button>
        </div>
      </div>
    </div>
  );
};
