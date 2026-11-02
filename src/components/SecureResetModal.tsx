import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Trash2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  X,
  Check,
  Download,
  FileSpreadsheet,
  Users,
  Trophy,
  Database,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  RefreshCw
} from 'lucide-react';

export type ResetModalMode = 'wipe' | 'reset-progress' | 'factory-reset';

interface SecureResetModalProps {
  isOpen: boolean;
  initialMode?: ResetModalMode;
  onClose: () => void;
  onConfirmWipe: (clearMemoryData: boolean) => void;
  onConfirmResetProgress: () => void;
  onConfirmFactoryReset: () => void;
  onExportExcel: () => void;
  onExportJsonBackup: () => void;
  employeesCount: number;
  prizesCount: number;
  winnersCount: number;
  absenteesCount: number;
  donationsCount: number;
  hasSnapshot: boolean;
}

export const SecureResetModal: React.FC<SecureResetModalProps> = ({
  isOpen,
  initialMode = 'wipe',
  onClose,
  onConfirmWipe,
  onConfirmResetProgress,
  onConfirmFactoryReset,
  onExportExcel,
  onExportJsonBackup,
  employeesCount,
  prizesCount,
  winnersCount,
  absenteesCount,
  donationsCount,
  hasSnapshot,
}) => {
  const [selectedMode, setSelectedMode] = useState<ResetModalMode>(initialMode);
  
  // Secondary Confirmation States
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [clearMemoryDataOnWipe, setClearMemoryDataOnWipe] = useState(true);
  const [hasExportedBackupNotice, setHasExportedBackupNotice] = useState(false);

  // Sync initial mode when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedMode(initialMode);
      setHasAcknowledged(false);
      setConfirmationInput('');
      setClearMemoryDataOnWipe(true);
      setHasExportedBackupNotice(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Verification requirements
  const isWipeMode = selectedMode === 'wipe';
  const isResetProgressMode = selectedMode === 'reset-progress';
  const isFactoryResetMode = selectedMode === 'factory-reset';

  // For wipe mode: require typing '確認銷毀' or '銷毀'
  const isKeywordValid = isWipeMode 
    ? (confirmationInput.trim() === '確認銷毀' || confirmationInput.trim() === '銷毀')
    : isFactoryResetMode 
    ? (confirmationInput.trim() === '確認重置' || confirmationInput.trim() === '重置')
    : true; // progress reset only requires acknowledge checkbox

  const isConfirmedAndUnlocked = hasAcknowledged && isKeywordValid;

  const handleExecute = () => {
    if (!isConfirmedAndUnlocked) return;

    if (isWipeMode) {
      onConfirmWipe(clearMemoryDataOnWipe);
    } else if (isResetProgressMode) {
      onConfirmResetProgress();
    } else if (isFactoryResetMode) {
      onConfirmFactoryReset();
    }
    onClose();
  };

  const handleExportExcelWithFeedback = () => {
    onExportExcel();
    setHasExportedBackupNotice(true);
  };

  const handleExportJsonWithFeedback = () => {
    onExportJsonBackup();
    setHasExportedBackupNotice(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-2xl rounded-3xl bg-white border-2 border-rose-300 shadow-2xl text-slate-800 overflow-hidden my-auto"
        >
          {/* Top Danger Accent Bar */}
          <div className={`h-2 w-full transition-colors ${
            isWipeMode 
              ? 'bg-gradient-to-r from-rose-500 via-red-600 to-amber-500' 
              : isResetProgressMode 
              ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500' 
              : 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-500'
          }`} />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-rose-100 flex items-start justify-between gap-3 bg-gradient-to-b from-rose-50/40 to-transparent">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md border ${
                isWipeMode 
                  ? 'bg-gradient-to-br from-rose-600 to-red-700 border-rose-300' 
                  : isResetProgressMode 
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300' 
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-300'
              }`}>
                {isWipeMode ? (
                  <Trash2 className="w-6 h-6 animate-pulse" />
                ) : isResetProgressMode ? (
                  <RotateCcw className="w-6 h-6" />
                ) : (
                  <RefreshCw className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                    安全銷毀與系統重設中心
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                    二次安全確認機制
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  保護現場隱私個資、防誤觸清空機制與即時資料備份防護
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              id="btn-close-secure-reset-modal"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="關閉視窗"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('wipe');
                  setHasAcknowledged(false);
                  setConfirmationInput('');
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === 'wipe'
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200 scale-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>1. 安全銷毀快照</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">活動結束・銷毀個資</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMode('reset-progress');
                  setHasAcknowledged(false);
                  setConfirmationInput('');
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === 'reset-progress'
                    ? 'bg-white text-amber-800 shadow-sm border border-amber-200 scale-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. 僅重設中獎進度</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">保留名單・重新開抽</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMode('factory-reset');
                  setHasAcknowledged(false);
                  setConfirmationInput('');
                }}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMode === 'factory-reset'
                    ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200 scale-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. 恢復出廠示範</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">重置為官方 Demo</span>
              </button>
            </div>

            {/* Mode Description Banner */}
            <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
              isWipeMode
                ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                : isResetProgressMode
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
            }`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isWipeMode ? 'text-rose-600' : isResetProgressMode ? 'text-amber-600' : 'text-indigo-600'
                }`} />
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {isWipeMode && '🔴 執行【安全銷毀本機快照與現場個資】'}
                    {isResetProgressMode && '🟡 執行【僅重設現場中獎進度（保留名單與獎項）】'}
                    {isFactoryResetMode && '🔵 執行【完全重設回出廠示範環境】'}
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {isWipeMode && (
                      <>
                        本操作將<strong>徹底抹除瀏覽器 LocalStorage 中的所有暫存快照</strong>，不留下任何同仁員編、姓名與中獎個資。
                        適合於<strong>尾牙宴席圓滿結束、撤場或歸還公用筆電</strong>前使用，確保企業機密與同仁個資隱私安全。
                      </>
                    )}
                    {isResetProgressMode && (
                      <>
                        本操作將清空<strong>目前所有的中獎名冊、棄權缺席註記與捐出紀錄</strong>，將抽獎進度歸零。
                        <strong className="underline">您所匯入的同仁名冊與獎項設定將予以完整保留</strong>，非常適合彩排演練完畢後重置為開場準備狀態！
                      </>
                    )}
                    {isFactoryResetMode && (
                      <>
                        本操作將清空目前快照並<strong>重新載入標準官方彩排資料庫</strong>（50 位跨部門同仁 + 5 項熱門獎項），適合初次體驗系統或展示操作。
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Data Impact Stats Grid */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-slate-500" />
                  目前系統中受影響之即時數據：
                </span>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                  hasSnapshot ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {hasSnapshot ? '● 本機快照已存在' : '○ 無暫存快照'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    同仁名單
                  </div>
                  <div className="font-bold text-slate-800 font-mono text-base">
                    {employeesCount} <span className="text-[10px] font-normal font-sans text-slate-500">位</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isWipeMode ? (clearMemoryDataOnWipe ? '將全數清空' : '保留在記憶體') : '完整保留'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    獎項設定
                  </div>
                  <div className="font-bold text-slate-800 font-mono text-base">
                    {prizesCount} <span className="text-[10px] font-normal font-sans text-slate-500">項</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isWipeMode ? (clearMemoryDataOnWipe ? '將全數清空' : '保留在記憶體') : '完整保留'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-500" />
                    已開中獎
                  </div>
                  <div className="font-bold text-rose-700 font-mono text-base">
                    {winnersCount} <span className="text-[10px] font-normal font-sans text-slate-500">位</span>
                  </div>
                  <div className="text-[10px] text-rose-600 font-medium">
                    {winnersCount > 0 ? '即將全數歸零' : '尚無紀錄'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-orange-500" />
                    缺席/加碼
                  </div>
                  <div className="font-bold text-slate-800 font-mono text-base">
                    {absenteesCount + donationsCount} <span className="text-[10px] font-normal font-sans text-slate-500">筆</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    即將全數清空
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Backup Toolbar (Fail-Safe) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-amber-600" />
                  防誤失安全備份防線（強烈建議在銷毀或重設前先留存）：
                </span>
                {hasExportedBackupNotice && (
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" />
                    已匯出備份檔案
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportExcelWithFeedback}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>立即匯出中獎名單 Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJsonWithFeedback}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-white hover:bg-amber-50 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                >
                  <Database className="w-3.5 h-3.5 text-amber-600" />
                  <span>下載完整現場備份檔 (.json)</span>
                </button>
              </div>
            </div>

            {/* Extra Wipe Option */}
            {isWipeMode && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={clearMemoryDataOnWipe}
                  onChange={(e) => setClearMemoryDataOnWipe(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900">同步清空目前記憶體中的名冊與獎項</span>
                  <span className="text-slate-500 block text-[11px]">
                    若勾選，畫面將完全清空重回初始狀態；若取消勾選，僅銷毀 LocalStorage 快照，暫留記憶體供立即檢閱。
                  </span>
                </div>
              </label>
            )}

            {/* Secondary Confirmation Gate (二次確認機制) */}
            <div className={`p-4 rounded-2xl border-2 space-y-3 ${
              isConfirmedAndUnlocked
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-rose-50/30 border-rose-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-900">
                  {isConfirmedAndUnlocked ? (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-rose-600" />
                  )}
                  <span>二次防誤觸確認檢核</span>
                </span>
                <span className={`text-[11px] font-bold ${
                  isConfirmedAndUnlocked ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {isConfirmedAndUnlocked ? '✓ 驗證已通過，解鎖執行按鈕' : '尚未解鎖'}
                </span>
              </div>

              {/* Checkbox Acknowledgment */}
              <button
                type="button"
                onClick={() => setHasAcknowledged(!hasAcknowledged)}
                className="w-full flex items-start gap-2.5 text-left text-xs p-2.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer select-none"
              >
                {hasAcknowledged ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <span className={`leading-relaxed ${
                  hasAcknowledged ? 'text-slate-900 font-bold' : 'text-slate-600'
                }`}>
                  {isWipeMode && '我已充分確認且理解此動作將不可逆地銷毀此電腦上的所有尾牙抽獎快照與個資。'}
                  {isResetProgressMode && `我已確認要清空目前 ${winnersCount} 筆中獎進度紀錄，並重新開始抽獎。`}
                  {isFactoryResetMode && '我確認要重置為系統官方出廠示範環境。'}
                </span>
              </button>

              {/* Keyword Typing Verification for High-Risk Actions */}
              {(isWipeMode || isFactoryResetMode) && (
                <div className="pt-1 border-t border-rose-100/80 space-y-1.5">
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>
                      請在下方輸入「<strong className="text-rose-700 font-bold font-mono">{isWipeMode ? '確認銷毀' : '確認重置'}</strong>」以解除安全鎖定：
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfirmationInput(isWipeMode ? '確認銷毀' : '確認重置')}
                      className="text-[10px] text-slate-500 hover:text-rose-700 underline cursor-pointer"
                    >
                      點擊自動填入
                    </button>
                  </div>
                  <input
                    type="text"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder={isWipeMode ? '請輸入「確認銷毀」或「銷毀」' : '請輸入「確認重置」或「重置」'}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold border-2 transition-all outline-hidden ${
                      isKeywordValid && confirmationInput
                        ? 'border-emerald-500 bg-white text-emerald-800'
                        : 'border-slate-300 bg-white text-slate-800 focus:border-rose-400'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              取消返回
            </button>

            <button
              type="button"
              disabled={!isConfirmedAndUnlocked}
              onClick={handleExecute}
              id="btn-confirm-secure-action"
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md ${
                !isConfirmedAndUnlocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                  : isWipeMode
                  ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white active:scale-98 cursor-pointer ring-2 ring-rose-400/50'
                  : isResetProgressMode
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white active:scale-98 cursor-pointer ring-2 ring-amber-400/50'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white active:scale-98 cursor-pointer ring-2 ring-indigo-400/50'
              }`}
            >
              {isConfirmedAndUnlocked ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {isWipeMode && (clearMemoryDataOnWipe ? '確認執行完全銷毀（清空快照與個資）' : '確認銷毀快照資料')}
                {isResetProgressMode && '確認重設現場中獎進度'}
                {isFactoryResetMode && '確認恢復出廠示範狀態'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
