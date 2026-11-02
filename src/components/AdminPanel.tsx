import React, { useState, useEffect, useRef } from 'react';
import { Employee, Prize, WinningRecord, AbsentRecord, DonationRecord, CelebrationEffectType } from '../types';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Save, 
  Sparkles, 
  Trash2, 
  Users, 
  Gift, 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Search,
  CheckCircle2,
  FolderUp,
  Folder,
  FolderCheck,
  HardDrive,
  AlertCircle,
  Sliders,
  Plus,
  Edit2,
  Image as ImageIcon,
  Flame,
  Clock,
  Play,
  HeartHandshake,
  Music,
  Volume2,
  Square
} from 'lucide-react';
import { 
  downloadSampleExcelTemplates, 
  downloadEmployeeExcelTemplate, 
  downloadPrizeExcelTemplate, 
  parseSmartWorkbook, 
  ParseResult 
} from '../utils/excelHelper';
import { CELEBRATION_EFFECTS, triggerCelebrationEffect } from '../utils/confettiHelper';
import { soundEffects } from '../utils/soundEffects';
import { PrizeEditModal } from './PrizeEditModal';
import { RestoreJsonModal } from './RestoreJsonModal';
import { EmployeeImportModal } from './EmployeeImportModal';
import { PrizeImportModal } from './PrizeImportModal';
import { StorageSnapshotData } from '../utils/storageHelper';
import {
  selectBackupDirectory,
  disconnectBackupDirectory,
  getConnectedDirectoryName,
  hasConnectedDirectory,
  getLastBackupTime,
  getLastBackupFileName,
  isAutoFolderBackupEnabled,
  setAutoFolderBackupEnabled,
  isAutoDownloadBackupEnabled,
  setAutoDownloadBackupEnabled,
  isFileSystemAccessSupported,
} from '../utils/localBackupHelper';

interface AdminPanelProps {
  activityTitle: string;
  onUpdateActivityTitle: (title: string) => void;
  drawDurationSeconds: number;
  onUpdateDrawDuration: (seconds: number) => void;
  celebrationEffect: CelebrationEffectType;
  onUpdateCelebrationEffect: (effect: CelebrationEffectType) => void;
  employees: Employee[];
  prizes: Prize[];
  winningRecords: WinningRecord[];
  absentRecords: AbsentRecord[];
  donationRecords?: DonationRecord[];
  onAddPrize: (prizeData: Omit<Prize, 'id'>) => void;
  onUpdatePrize: (prize: Prize) => void;
  onDeletePrize: (prizeId: string) => void;
  onImportComplete: (employees: Employee[], prizes: Prize[]) => void;
  onImportEmployees?: (employees: Employee[], mode: 'append' | 'overwrite') => void;
  onImportPrizes?: (prizes: Prize[], mode: 'append' | 'overwrite') => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onExportJsonBackup: () => void;
  onRestoreFromJson: (file: File) => void;
  onRestoreFromJsonData?: (data: StorageSnapshotData) => void;
  onLoadMock: () => void;
  onResetAll: () => void;
  onSecureWipe: () => void;
  onOpenSecureReset?: (mode?: 'wipe' | 'reset-progress' | 'factory-reset') => void;
  onManualLocalBackup?: () => Promise<{ success: boolean; fileName?: string; fallbackDownload?: boolean; error?: string }>;
  hasSnapshot: boolean;
}

const TITLE_TEMPLATES = [
  '2026 聯歡晚會 • 喜慶年終大抽獎',
  '歲末感恩旺年會 • 幸運好禮大放送',
  '春節聯歡晚會 • 祥瑞迎春大抽獎',
  '2026 年度盛典 • 巨星年終狂歡夜',
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  activityTitle,
  onUpdateActivityTitle,
  drawDurationSeconds,
  onUpdateDrawDuration,
  celebrationEffect,
  onUpdateCelebrationEffect,
  onOpenSecureReset,
  employees,
  prizes,
  winningRecords,
  absentRecords,
  donationRecords = [],
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
  onImportComplete,
  onImportEmployees,
  onImportPrizes,
  onExportExcel,
  onExportCsv,
  onExportJsonBackup,
  onRestoreFromJson,
  onRestoreFromJsonData,
  onLoadMock,
  onResetAll,
  onSecureWipe,
  onManualLocalBackup,
  hasSnapshot,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'prizes' | 'employees' | 'backup'>('settings');
  const [isEmployeeImportModalOpen, setIsEmployeeImportModalOpen] = useState(false);
  const [isPrizeImportModalOpen, setIsPrizeImportModalOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeFilterStatus, setEmployeeFilterStatus] = useState<'all' | 'won' | 'waiting' | 'donated'>('all');
  const [prizeSearch, setPrizeSearch] = useState('');
  const [prizeFilterStatus, setPrizeFilterStatus] = useState<'all' | 'main' | 'bonus' | 'completed' | 'remaining'>('all');
  
  const [editingTitle, setEditingTitle] = useState(activityTitle);
  const [titleSavedNotification, setTitleSavedNotification] = useState(false);
  const [isBgmActive, setIsBgmActive] = useState<boolean>(soundEffects.getIsBgmPlaying());

  // Section 3.2: 抽獎節奏設定待套用狀態（調整後需按確認鍵才生效）
  const [pendingDrawDuration, setPendingDrawDuration] = useState<number>(drawDurationSeconds);
  const [rhythmAppliedNotification, setRhythmAppliedNotification] = useState<boolean>(false);

  useEffect(() => {
    setPendingDrawDuration(drawDurationSeconds);
  }, [drawDurationSeconds]);

  const handleApplyDrawDuration = () => {
    onUpdateDrawDuration(pendingDrawDuration);
    setRhythmAppliedNotification(true);
    soundEffects.playFanfare();
    setTimeout(() => setRhythmAppliedNotification(false), 3500);
  };

  // 本機資料夾自動備份狀態
  const [connectedDirName, setConnectedDirName] = useState<string>(getConnectedDirectoryName());
  const [isAutoFolder, setIsAutoFolder] = useState<boolean>(isAutoFolderBackupEnabled());
  const [isAutoDownload, setIsAutoDownload] = useState<boolean>(isAutoDownloadBackupEnabled());
  const [lastBackupTimeState, setLastBackupTimeState] = useState<number | null>(getLastBackupTime());
  const [lastBackupFileState, setLastBackupFileState] = useState<string>(getLastBackupFileName());
  const [backupNotice, setBackupNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isTestingLocalBackup, setIsTestingLocalBackup] = useState<boolean>(false);

  const handleSelectDirectory = async () => {
    const res = await selectBackupDirectory();
    if (res.success) {
      setConnectedDirName(res.dirName || '');
      setBackupNotice({
        type: 'success',
        text: `✅ 已成功連結本機資料夾：【${res.dirName}】，每抽完獎項將自動存入！`
      });
      soundEffects.playFanfare();
      setTimeout(() => setBackupNotice(null), 4500);
    } else if (res.error && res.error !== '已取消選擇資料夾') {
      setBackupNotice({ type: 'error', text: `⚠️ ${res.error}` });
      setTimeout(() => setBackupNotice(null), 4500);
    }
  };

  const handleDisconnectDirectory = () => {
    disconnectBackupDirectory();
    setConnectedDirName('');
    setBackupNotice({ type: 'info', text: 'ℹ️ 已解除本機資料夾連結' });
    setTimeout(() => setBackupNotice(null), 3000);
  };

  const handleToggleAutoFolder = (checked: boolean) => {
    setAutoFolderBackupEnabled(checked);
    setIsAutoFolder(checked);
  };

  const handleToggleAutoDownload = (checked: boolean) => {
    setAutoDownloadBackupEnabled(checked);
    setIsAutoDownload(checked);
  };

  const handleRunManualBackupTest = async () => {
    if (!onManualLocalBackup) return;
    setIsTestingLocalBackup(true);
    try {
      const res = await onManualLocalBackup();
      if (res.success) {
        setLastBackupTimeState(Date.now());
        if (res.fileName) setLastBackupFileState(res.fileName);
        setBackupNotice({
          type: 'success',
          text: `✅ 測試備份寫入成功！檔名：${res.fileName || '即時備份.json'}`
        });
        soundEffects.playFanfare();
      } else {
        setBackupNotice({
          type: 'error',
          text: `⚠️ 備份寫入失敗：${res.error || '請確認資料夾授權'}`
        });
      }
    } catch (err: any) {
      setBackupNotice({ type: 'error', text: `⚠️ 備份發生異常：${err?.message || '未知錯誤'}` });
    } finally {
      setIsTestingLocalBackup(false);
      setTimeout(() => setBackupNotice(null), 5000);
    }
  };

  const handleToggleBgm = () => {
    const isPlaying = soundEffects.toggleFestiveBgm();
    setIsBgmActive(isPlaying);
  };

  useEffect(() => {
    setEditingTitle(activityTitle);
  }, [activityTitle]);

  const [isTestingRhythm, setIsTestingRhythm] = useState(false);
  const [testTimeRemaining, setTestTimeRemaining] = useState<number>(0);

  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);

  const [isRestoreJsonModalOpen, setIsRestoreJsonModalOpen] = useState(false);

  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stagedImport, setStagedImport] = useState<{
    fileName: string;
    fileSize: string;
    employees: Employee[];
    prizes: Prize[];
    sheetNames: string[];
    detectedDetails: string[];
  } | null>(null);

  const wonEmployeeIds = new Set(winningRecords.map(w => w.employeeId));
  const donatedEmployeeIds = new Set((donationRecords || []).map(d => d.employeeId));

  const handleSaveTitle = (newTitle: string) => {
    onUpdateActivityTitle(newTitle);
    setTitleSavedNotification(true);
    setTimeout(() => setTitleSavedNotification(false), 2500);
  };

  const handleTestRhythm = () => {
    if (isTestingRhythm) return;
    setIsTestingRhythm(true);
    setTestTimeRemaining(pendingDrawDuration);

    const startTime = Date.now();
    const durationMs = pendingDrawDuration * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);
      setTestTimeRemaining(Number(remaining.toFixed(1)));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setIsTestingRhythm(false);
        soundEffects.playFanfare();
        triggerCelebrationEffect(celebrationEffect);
      }
    }, 100);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.empNo.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.department.toLowerCase().includes(employeeSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    const hasWon = wonEmployeeIds.has(emp.id);
    const hasDonated = donatedEmployeeIds.has(emp.id);
    if (employeeFilterStatus === 'won') return hasWon;
    if (employeeFilterStatus === 'donated') return hasDonated;
    if (employeeFilterStatus === 'waiting') return !hasWon && !hasDonated;
    return true;
  });

  const departmentStats = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredPrizes = prizes.filter(prize => {
    const matchesSearch = 
      prize.name.toLowerCase().includes(prizeSearch.toLowerCase()) ||
      prize.content.toLowerCase().includes(prizeSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    const wonCount = winningRecords.filter(w => w.prizeId === prize.id).length;
    const isCompleted = wonCount >= prize.quota;
    const isBonus = prize.poolType === 'bonus' || Boolean(prize.isAdditional);

    if (prizeFilterStatus === 'main') return !isBonus;
    if (prizeFilterStatus === 'bonus') return isBonus;
    if (prizeFilterStatus === 'completed') return isCompleted;
    if (prizeFilterStatus === 'remaining') return !isCompleted;
    return true;
  });

  const totalPrizeQuota = prizes.reduce((acc, p) => acc + p.quota, 0);
  const totalPrizeWon = prizes.reduce((acc, p) => {
    return acc + winningRecords.filter(w => w.prizeId === p.id).length;
  }, 0);
  const totalPrizeRemaining = Math.max(0, totalPrizeQuota - totalPrizeWon);
  const regularPrizesCount = prizes.filter(p => p.poolType !== 'bonus' && !p.isAdditional).length;
  const bonusPrizesCount = prizes.filter(p => p.poolType === 'bonus' || p.isAdditional).length;

  const processExcelFile = async (file: File) => {
    setIsProcessing(true);
    setImportMessage(null);
    try {
      const result: ParseResult = await parseSmartWorkbook(file);
      if (result.employees.length === 0 && result.prizes.length === 0) {
        setStagedImport(null);
        const detailedErr = result.errors.length > 0 
          ? `匯入失敗：${result.errors.join('；')}`
          : `未能在檔案「${file.name}」中辨識到有效資料。\n已掃描工作表：[${result.sheetNames.join(', ')}]，共 ${result.totalRowsScanned} 列。\n建議確認工作表欄位抬頭（如：姓名、員編、部門 或 獎項、獎品、名額），或下載下方標準範本。`;
        setImportMessage({
          type: 'error',
          text: detailedErr,
        });
      } else {
        setStagedImport({
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          employees: result.employees,
          prizes: result.prizes,
          sheetNames: result.sheetNames,
          detectedDetails: result.detectedDetails,
        });
        setImportMessage({
          type: 'success',
          text: `檔案「${file.name}」解析成功！共解析出 ${result.employees.length} 位同仁、${result.prizes.length} 項獎品，請在下方確認並點選匯入。`,
        });
      }
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setStagedImport(null);
      setImportMessage({
        type: 'error',
        text: `讀取檔案失敗：${err?.message || '不支援的檔案格式，請確認是否為標準 Excel (.xlsx / .xls) 或 CSV 檔案'}`,
      });
    } finally {
      setIsProcessing(false);
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processExcelFile(file);
  };

  const handleApplyStagedImport = (mode: 'overwrite' | 'append') => {
    if (!stagedImport) return;

    let finalEmployees = employees;
    let finalPrizes = prizes;

    if (mode === 'overwrite') {
      if (stagedImport.employees.length > 0) {
        finalEmployees = stagedImport.employees;
      }
      if (stagedImport.prizes.length > 0) {
        finalPrizes = stagedImport.prizes;
      }
      onImportComplete(finalEmployees, finalPrizes);
      setImportMessage({
        type: 'success',
        text: `已覆蓋匯入成功！目前系統共有 ${finalEmployees.length} 位同仁、${finalPrizes.length} 項獎品。`,
      });
    } else {
      if (stagedImport.employees.length > 0) {
        const existingKeys = new Set(employees.map(e => `${e.empNo}_${e.name}`.toLowerCase()));
        const newEmps = stagedImport.employees.filter(e => !existingKeys.has(`${e.empNo}_${e.name}`.toLowerCase()));
        finalEmployees = [...employees, ...newEmps];
      }
      if (stagedImport.prizes.length > 0) {
        const mergedPrizes = [...prizes];
        stagedImport.prizes.forEach(np => {
          const exists = mergedPrizes.some(p => p.name === np.name && p.content === np.content);
          if (!exists) {
            mergedPrizes.push({ ...np, order: mergedPrizes.length + 1 });
          }
        });
        finalPrizes = mergedPrizes;
      }
      onImportComplete(finalEmployees, finalPrizes);
      setImportMessage({
        type: 'success',
        text: `已追加合併成功！目前系統共有 ${finalEmployees.length} 位同仁、${finalPrizes.length} 項獎品。`,
      });
    }

    setStagedImport(null);
  };

  const handleOpenAddPrize = () => {
    setEditingPrize(null);
    setIsPrizeModalOpen(true);
  };

  const handleOpenEditPrize = (prize: Prize) => {
    setEditingPrize(prize);
    setIsPrizeModalOpen(true);
  };

  const handleSavePrize = (prizeData: Omit<Prize, 'id'> & { id?: string }) => {
    if (prizeData.id) {
      const existing = prizes.find(p => p.id === prizeData.id);
      if (existing) {
        onUpdatePrize({
          ...existing,
          ...prizeData,
          id: prizeData.id,
        });
      }
    } else {
      onAddPrize(prizeData);
    }
  };

  const handleDeletePrizeConfirm = (prize: Prize) => {
    const count = winningRecords.filter(r => r.prizeId === prize.id).length;
    let message = `確定要刪除獎項「${prize.name} (${prize.content})」嗎？`;
    if (count > 0) {
      message += `\n⚠️ 注意：該獎項目前已有 ${count} 位中獎者紀錄！刪除獎項將一併清除該獎項的中獎記錄。`;
    }
    if (window.confirm(message)) {
      onDeletePrize(prize.id);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Admin Title & Overview Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-50/90 via-rose-50/70 to-amber-50/90 border-2 border-amber-300 p-5 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold shadow-xs">
              後台管理者中心
            </span>
            <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {hasSnapshot ? '安全快照即時防斷電保護中' : '未儲存快照'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 flex items-center gap-2 font-display">
            活動設定、獎項圖庫管理與名冊匯出
          </h2>
        </div>

        {/* Global Quick Export / Wipe CTA */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          <button
            id="admin-btn-export-excel"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>匯出中獎名單 Excel</span>
          </button>

          <button
            id="admin-btn-export-csv"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>匯出中獎名單 CSV</span>
          </button>

          <button
            id="admin-btn-secure-wipe"
            onClick={() => onOpenSecureReset ? onOpenSecureReset('wipe') : onSecureWipe()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            title="安全銷毀與系統重設 (含二次確認 Dialog 彈窗)"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>安全銷毀與系統重設</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'festive-gold-btn shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-600" />
          <span>抽獎活動與節奏設定</span>
        </button>

        <button
          onClick={() => setActiveTab('prizes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'prizes'
              ? 'festive-gold-btn shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
          }`}
        >
          <Gift className="w-4 h-4 text-amber-600" />
          <span>獎項與獎品管理 ({prizes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'employees'
              ? 'festive-gold-btn shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
          }`}
        >
          <Users className="w-4 h-4 text-amber-600" />
          <span>同仁名冊 ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'festive-gold-btn shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
          }`}
        >
          <Save className="w-4 h-4 text-amber-600" />
          <span>備份與系統維護</span>
        </button>
      </div>

      {/* TAB 1: 抽獎活動與節奏設定 */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Section 3.1: 活動標題名稱設定 */}
          <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs">
                  🏮
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    3.1 本次抽獎活動標題設定（前台即時同步）
                  </h3>
                </div>
              </div>

              {titleSavedNotification && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full animate-fadeIn font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>已即時同步更新至前台！</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => {
                    setEditingTitle(e.target.value);
                    onUpdateActivityTitle(e.target.value);
                  }}
                  placeholder="請輸入抽獎標題名稱..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-base sm:text-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <button
                onClick={() => handleSaveTitle(editingTitle)}
                className="festive-primary-btn px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>儲存並同步至前台</span>
              </button>
            </div>

            <div className="pt-2">
              <div className="text-xs text-slate-500 mb-2">快速選用常用年終大會標題範本：</div>
              <div className="flex flex-wrap gap-2">
                {TITLE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    onClick={() => {
                      setEditingTitle(tmpl);
                      handleSaveTitle(tmpl);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 transition-all cursor-pointer"
                  >
                    + {tmpl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3.2: 抽獎節奏參數設定 */}
          <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    3.2 抽獎節奏參數設定（按下抽獎後到結果揭曉的等待/轉動時間）
                  </h3>
                  <p className="text-xs text-slate-500">
                    系統依此秒數控制前台抽獎舞台與投影大螢幕輪盤的轉動與減速揭曉時間（調整後請點擊確認生效按鈕）
                  </p>
                </div>
              </div>

              {/* Status indicator badge */}
              <div className="flex items-center gap-2 shrink-0">
                {pendingDrawDuration !== drawDurationSeconds ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1.5 shadow-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>待確認套用：{pendingDrawDuration}s（目前生效：{drawDurationSeconds}s）</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>目前已生效：{drawDurationSeconds}s</span>
                  </span>
                )}
              </div>
            </div>

            {/* Notification when applied */}
            {rhythmAppliedNotification && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>✅ 抽獎節奏參數已成功更新為 {drawDurationSeconds} 秒！已即時生效於前台抽獎舞台與大螢幕模式。</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 items-stretch">
              <div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      等待 / 轉動秒數長度：
                    </span>
                    {pendingDrawDuration !== drawDurationSeconds && (
                      <span className="text-[10px] text-amber-700 font-bold px-1.5 py-0.5 rounded bg-amber-100">
                        未生效
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1.0"
                      max="10.0"
                      step="0.1"
                      value={pendingDrawDuration}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0.5 && val <= 15) {
                          setPendingDrawDuration(Number(val.toFixed(1)));
                        }
                      }}
                      className="w-20 px-2 py-1 bg-white border-2 border-slate-300 rounded-lg text-center font-mono font-black text-rose-700 text-base focus:outline-none focus:border-rose-500 shadow-inner"
                    />
                    <span className="text-sm font-bold text-slate-700">秒 (s)</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.1"
                  value={pendingDrawDuration}
                  onChange={(e) => setPendingDrawDuration(parseFloat(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>1.0s (極速快抽)</span>
                  <span className="text-rose-700 font-bold">★ 3.2s (最佳懸疑感推薦)</span>
                  <span>10.0s (超大壓軸慢轉)</span>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-slate-500">常用節奏範本快速選取：</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '極速快抽', sec: 1.0 },
                      { label: '標準流暢', sec: 2.0 },
                      { label: '★ 懸疑推薦', sec: 3.2 },
                      { label: '高潮大獎', sec: 5.0 },
                      { label: '壓軸特獎', sec: 8.0 },
                    ].map((preset) => (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => setPendingDrawDuration(preset.sec)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                          pendingDrawDuration === preset.sec
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label} ({preset.sec}s)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirm Apply Button - Critical Requirement */}
                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap border-t border-slate-200/80">
                  <span className="text-xs text-slate-500">
                    {pendingDrawDuration !== drawDurationSeconds ? (
                      <span className="text-amber-700 font-bold">
                        ⚠️ 調整完畢，請點擊右方按鈕讓設定即刻生效 ➜
                      </span>
                    ) : (
                      <span>目前的 {drawDurationSeconds} 秒節奏已在線生效</span>
                    )}
                  </span>

                  <button
                    id="btn-apply-draw-duration"
                    type="button"
                    onClick={handleApplyDrawDuration}
                    disabled={pendingDrawDuration === drawDurationSeconds}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
                      pendingDrawDuration !== drawDurationSeconds
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white animate-pulse ring-2 ring-emerald-400/60'
                        : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>確認生效（立即套用 {pendingDrawDuration} 秒）</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 h-full">
                <div className="text-xs text-slate-700 font-bold">現場節奏試跑體驗</div>
                <p className="text-[11px] text-slate-500">
                  可先試跑感受調整中的 {pendingDrawDuration} 秒懸疑感與開獎特效
                </p>
                <button
                  type="button"
                  onClick={handleTestRhythm}
                  disabled={isTestingRhythm}
                  className="w-full py-3 px-4 rounded-xl festive-gold-btn text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isTestingRhythm ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-amber-900" />
                      <span>模擬轉動中：{testTimeRemaining}s</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-amber-950 text-amber-950" />
                      <span>⏱️ 試跑 {pendingDrawDuration} 秒節奏</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-slate-400">
                  倒數結束後將自動觸發一次中獎特效與歡呼音效
                </span>
              </div>
            </div>
          </div>

          {/* Section: 尾牙專用雙音效與 AI 尾牙配樂中心 */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50/60 via-white to-amber-50/60 border-2 border-amber-300/80 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                    <span>尾牙專用雙音效與 AI 尾牙配樂中心</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      ✓ 已全面套用
                    </span>
                  </h3>
                </div>
              </div>

              {/* BGM 狀態指示標籤 */}
              {isBgmActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold animate-pulse">
                  <Volume2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>AI 尾牙配樂播放中</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Feature 1: AI 尾牙喜慶背景配樂 */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-white border border-amber-300/90 flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-rose-600" />
                    <span>AI 尾牙喜慶配樂 (BGM)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    傳統五聲歡騰歡慶旋律，適合開場暖場與中場氣氛烘托
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBgm}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
                    isBgmActive
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 shadow-xs'
                  }`}
                >
                  {isBgmActive ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>⏹ 停止 AI 尾牙配樂</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>▶ 播放 AI 尾牙配樂</span>
                    </>
                  )}
                </button>
              </div>

              {/* Feature 2: 抽獎進行中音效 */}
              <div className="p-4 rounded-2xl bg-white border border-amber-200/90 flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <div className="text-xs font-black text-slate-800">音效 1：抽獎進行中 (6.2s)</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    輪盤加速、歡樂木琴、緊湊高潮、5.8s 懸念煞車停頓
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => soundEffects.playDrawingPreview()}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 cursor-pointer active:scale-95 shadow-xs"
                >
                  ▶ 試聽抽獎音效
                </button>
              </div>

              {/* Feature 3: 中獎揭曉音效 */}
              <div className="p-4 rounded-2xl bg-white border border-amber-200/90 flex flex-col justify-between gap-3 shadow-2xs">
                <div>
                  <div className="text-xs font-black text-amber-900">音效 2：中獎揭曉音效 (4.0s)</div>
                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    瞬間揭曉爆破、金色號角、元寶金幣雨、星光 Chime
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => soundEffects.playWinnerPreview()}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 cursor-pointer active:scale-95 shadow-xs"
                >
                  ▶ 試聽揭曉音效
                </button>
              </div>
            </div>
          </div>

          {/* Section 2.2: 多元中獎慶祝特效模式 */}
          <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  2.2 多元中獎特效設定（支援隨機精彩輪替與多種慶祝動畫）
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {CELEBRATION_EFFECTS.map((eff) => {
                const isSelected = celebrationEffect === eff.id;

                return (
                  <div
                    key={eff.id}
                    onClick={() => onUpdateCelebrationEffect(eff.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-500 shadow-sm ring-1 ring-rose-400'
                        : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">{eff.icon}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                            目前套用中
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-sm text-slate-900">{eff.name}</div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{eff.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          eff.fire();
                        }}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 flex items-center gap-1 cursor-pointer"
                        title="立即預覽此特效"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>立即試噴</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: 系統重設與安全防護快捷操作 */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">安全銷毀與系統重設中心</h4>
                <p className="text-xs text-slate-500">
                  支援一鍵完全銷毀快照個資、僅重設開獎進度或出廠重設，配備二次確認彈窗防誤觸保護
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenSecureReset ? onOpenSecureReset('reset-progress') : onResetAll()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer shadow-2xs"
              >
                重設抽獎進度...
              </button>
              <button
                type="button"
                onClick={() => onOpenSecureReset ? onOpenSecureReset('wipe') : onSecureWipe()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all cursor-pointer shadow-2xs"
              >
                安全銷毀快照...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 獎項與獎品管理（清單方式呈現，參考同仁名冊風格） */}
      {activeTab === 'prizes' && (
        <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                獎項與獎品清單總覽 ({prizes.length} 項)
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋獎項名稱/獎品內容..."
                  value={prizeSearch}
                  onChange={e => setPrizeSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 w-44 sm:w-56"
                />
              </div>

              <select
                value={prizeFilterStatus}
                onChange={e => setPrizeFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="all">全部獎項 ({prizes.length})</option>
                <option value="main">正規獎項 ({regularPrizesCount})</option>
                <option value="bonus">加碼專區 ({bonusPrizesCount})</option>
                <option value="remaining">尚有名額待抽</option>
                <option value="completed">已全數抽出</option>
              </select>

              <button
                type="button"
                onClick={() => setIsPrizeImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="匯入獎項清單 Excel 檔案"
              >
                <Upload className="w-3.5 h-3.5 text-amber-700" />
                <span>匯入獎品 Excel</span>
              </button>

              <button
                type="button"
                onClick={downloadPrizeExcelTemplate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="下載標準空白獎品清單範本 (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>下載獎品範本</span>
              </button>

              <button
                onClick={handleOpenAddPrize}
                className="festive-primary-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>新增抽獎獎項</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
            <span className="text-slate-500 font-medium">獎項統計：</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
              總名額：<strong className="font-mono text-slate-900">{totalPrizeQuota}</strong> 名
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
              已抽出：<strong className="font-mono">{totalPrizeWon}</strong> 名
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800">
              剩餘待抽：<strong className="font-mono">{totalPrizeRemaining}</strong> 名
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900">
              正規 {regularPrizesCount} 項 • 加碼 {bonusPrizesCount} 項
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[520px] rounded-2xl border border-slate-200 shadow-inner">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-amber-50/80 text-amber-950 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-amber-200">
                <tr>
                  <th className="py-3 px-3 text-center w-12 font-mono">序號</th>
                  <th className="py-3 px-3 w-24">獎池類別</th>
                  <th className="py-3 px-3 text-center w-16">獎品圖片</th>
                  <th className="py-3 px-3 font-bold w-36">獎項名稱</th>
                  <th className="py-3 px-3 font-bold">獎品內容</th>
                  <th className="py-3 px-3 w-32">名額進度</th>
                  <th className="py-3 px-3 w-44">抽獎設定</th>
                  <th className="py-3 px-3 text-center w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-sans">
                {filteredPrizes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {prizes.length === 0 ? '目前尚無任何獎項設定，請點擊上方按鈕新增或至 Excel 匯入' : '查無相符之獎項資料'}
                    </td>
                  </tr>
                ) : (
                  filteredPrizes.map((prize, index) => {
                    const wonCount = winningRecords.filter(w => w.prizeId === prize.id).length;
                    const remaining = Math.max(0, prize.quota - wonCount);
                    const isBonus = prize.poolType === 'bonus' || prize.isAdditional;
                    const isCompleted = remaining === 0;

                    return (
                      <tr 
                        key={prize.id} 
                        className={`hover:bg-amber-50/30 transition-colors ${
                          isBonus ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          #{index + 1}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isBonus ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-amber-950 shadow-xs">
                              <Flame className="w-3 h-3 text-amber-950" />
                              加碼專區
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              正規獎項
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="w-10 h-10 rounded-lg border border-amber-200 bg-slate-50 overflow-hidden mx-auto flex items-center justify-center shadow-2xs">
                            {prize.image ? (
                              <img
                                src={prize.image}
                                alt={prize.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-sm font-black text-slate-900 block truncate">
                            {prize.name}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="text-xs text-slate-700 font-medium block max-w-md truncate" title={prize.content}>
                            {prize.content}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono">
                              <span className="font-bold text-rose-700 text-sm">{wonCount}</span>
                              <span className="text-slate-400">/</span>
                              <span className="font-bold text-slate-700">{prize.quota}</span>
                              <span className="text-[11px] text-slate-500">
                                ({isCompleted ? (
                                  <span className="text-emerald-600 font-bold">已抽完</span>
                                ) : (
                                  <span>剩 {remaining}</span>
                                )})
                              </span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.round((wonCount / (prize.quota || 1)) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                              {prize.drawMethod === 'batch' ? '👥 一次全抽' : '⚡ 逐次抽出'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {prize.drawRule || (prize.allowRepeat ? '全員可重複' : '一人一獎')}
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPrize(prize)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-2xs"
                              title="編輯此獎項"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrizeConfirm(prize)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-all cursor-pointer shadow-2xs"
                              title="刪除此獎項"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 人員名冊檢視 */}
      {activeTab === 'employees' && (
        <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900 font-display">
                員工名單總覽 ({employees.length} 人)
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜尋姓名/員編/部門..."
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 w-44 sm:w-56"
                />
              </div>

              <select
                value={employeeFilterStatus}
                onChange={e => setEmployeeFilterStatus(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-rose-500"
              >
                <option value="all">全部狀態</option>
                <option value="won">已中獎同仁 ({wonEmployeeIds.size})</option>
                <option value="donated">愛心捐出同仁 ({donatedEmployeeIds.size})</option>
                <option value="waiting">待中獎候選同仁 ({Math.max(0, employees.length - wonEmployeeIds.size - donatedEmployeeIds.size)})</option>
              </select>

              <button
                type="button"
                onClick={() => setIsEmployeeImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="匯入同仁名冊 Excel 檔案"
              >
                <Upload className="w-3.5 h-3.5 text-amber-700" />
                <span>匯入員工 Excel</span>
              </button>

              <button
                type="button"
                onClick={downloadEmployeeExcelTemplate}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="下載標準空白員工名冊範本 (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>下載員工範本</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
            <span className="text-slate-500 font-medium">部門分佈：</span>
            {Object.entries(departmentStats).map(([dept, count]) => (
              <span key={dept} className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                {dept} ({count})
              </span>
            ))}
          </div>

          <div className="overflow-x-auto max-h-[420px] rounded-2xl border border-slate-200 shadow-inner">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-amber-50/80 text-amber-950 uppercase text-[10px] font-bold sticky top-0 z-10 border-b border-amber-200">
                <tr>
                  <th className="py-3 px-3">員編</th>
                  <th className="py-3 px-3">姓名</th>
                  <th className="py-3 px-3">部門</th>
                  <th className="py-3 px-3">抽獎狀態</th>
                  <th className="py-3 px-3">中獎獎項</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono bg-white">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      查無相符之員工資料
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const win = winningRecords.find(w => w.employeeId === emp.id);
                    const empAbsents = absentRecords.filter(a => a.employeeId === emp.id);
                    const hasMainAbsent = empAbsents.some(a => {
                      if (a.poolType === 'main') return true;
                      if (a.poolType === 'bonus') return false;
                      const p = prizes.find(pr => pr.id === a.prizeId);
                      return !(p?.poolType === 'bonus' || p?.isAdditional);
                    });
                    const hasBonusAbsent = empAbsents.some(a => {
                      if (a.poolType === 'bonus') return true;
                      if (a.poolType === 'main') return false;
                      const p = prizes.find(pr => pr.id === a.prizeId);
                      return !!(p?.poolType === 'bonus' || p?.isAdditional);
                    });
                    const empDonations = (donationRecords || []).filter(d => d.employeeId === emp.id);
                    const hasDonated = empDonations.length > 0;

                    return (
                      <tr key={emp.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 font-bold">{emp.empNo}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-sans font-bold">{emp.name}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-sans">{emp.department}</td>
                        <td className="py-2.5 px-3 font-sans">
                          {win ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              已中獎
                            </span>
                          ) : (hasMainAbsent && !hasBonusAbsent) ? (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300"
                              title="該同仁在正規獎項專區棄權，不能在正規獎池再抽其他獎項；但進入加碼專區時仍保有完整候選資格！"
                            >
                              正規池棄權 (加碼池仍具資格)
                            </span>
                          ) : (hasBonusAbsent && !hasMainAbsent) ? (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300"
                              title="該同仁在加碼專區棄權，不可再抽加碼池獎項"
                            >
                              加碼池棄權 (不可再抽加碼)
                            </span>
                          ) : (hasMainAbsent && hasBonusAbsent) ? (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300"
                              title="該同仁於正規池與加碼池皆有棄權紀錄"
                            >
                              雙池皆棄權
                            </span>
                          ) : hasDonated ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                              <HeartHandshake className="w-3 h-3 text-amber-600 shrink-0" />
                              {empDonations.some(d => d.fromPool === 'bonus') ? '加碼池已捐出' : '正規池已捐出'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                              候選中
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {win ? (
                            <span className="text-rose-700 font-bold text-xs">
                              {win.prizeName} ({win.prizeContent})
                            </span>
                          ) : empAbsents.length > 0 ? (
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>棄權獎項：{empAbsents.map(a => a.prizeName).join(', ')}</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {hasMainAbsent && !hasBonusAbsent
                                  ? '（正規池排除，加碼專區保留完整抽獎資格）'
                                  : hasBonusAbsent && !hasMainAbsent
                                  ? '（已自加碼專區排除抽獎資格）'
                                  : '（已自各對應獎池排除）'}
                              </div>
                            </div>
                          ) : hasDonated ? (
                            <div className="space-y-0.5">
                              <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                                <HeartHandshake className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>已捐出：{empDonations.map(d => d.prizeName).join(', ')}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                （名額已釋出現場重抽，此池排除抽獎資格）
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: 備份、還原與系統重設 */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Card 1: 電腦當機防護 • 本機資料夾即時自動備份中心 (使用者核心需求 2) */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-50/70 via-white to-rose-50/50 border-2 border-amber-300 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-xs">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                    <span>電腦當機防護：自動備份至本機資料夾</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      即時防斷電 • 零遺失
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    指定電腦中的資料夾（如桌面或D槽尾牙資料夾），每抽完一個獎項即自動在背景寫入最新結構化備份檔 (.json)
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {connectedDirName ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-1.5 shadow-xs">
                    <FolderCheck className="w-4 h-4 text-emerald-600" />
                    <span>已連結：{connectedDirName}</span>
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-300 text-slate-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>未指定本機資料夾（已以瀏覽器快照即時防護）</span>
                  </span>
                )}
              </div>
            </div>

            {/* Notification message */}
            {backupNotice && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-fade-in shadow-xs ${
                backupNotice.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                  : backupNotice.type === 'error'
                  ? 'bg-rose-50 border border-rose-300 text-rose-800'
                  : 'bg-slate-50 border border-slate-300 text-slate-800'
              }`}>
                {backupNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{backupNotice.text}</span>
              </div>
            )}

            {/* Folder Connection & Control Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-600" />
                    <span>指定儲存目錄：</span>
                    {connectedDirName ? (
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-bold">
                        📁 {connectedDirName}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-normal">
                        尚未選取本機目錄（點擊右側按鈕授權寫入）
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    系統使用 W3C File System Access API 直接於本機磁碟寫入存檔，毋須連網或上傳伺服器，速度極快且完全私密。
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {connectedDirName ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSelectDirectory}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        更換資料夾
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectDirectory}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer active:scale-95"
                      >
                        解除連結
                      </button>
                    </>
                  ) : (
                    <button
                      id="btn-select-backup-dir"
                      type="button"
                      onClick={handleSelectDirectory}
                      className="festive-gold-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                    >
                      <FolderUp className="w-4 h-4 text-amber-950" />
                      <span>指定本機備份資料夾 (如桌面/尾牙資料夾)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Backup triggers configuration */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-amber-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isAutoFolder}
                    onChange={(e) => handleToggleAutoFolder(e.target.checked)}
                    className="mt-0.5 accent-rose-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">每抽完一個獎項自動存檔至本機（預設開啟 • 推薦）</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      當某獎項名額全部抽出時，自動於該資料夾產生 <code>抽獎備份_【獎項名稱】_時間.json</code> 與即時同步檔。
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-amber-50/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isAutoDownload}
                    onChange={(e) => handleToggleAutoDownload(e.target.checked)}
                    className="mt-0.5 accent-rose-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">備援模式：未指定資料夾時自動下載 JSON 檔</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      若使用不支援本機寫入 API 的非 Chromium 瀏覽器，每抽完獎項時自動觸發瀏覽器下載備份檔案。
                    </span>
                  </div>
                </label>
              </div>

              {/* Test Run & Live Backup Status Details */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">最後備份時間：</span>
                    <strong className="font-mono text-slate-800">
                      {lastBackupTimeState ? new Date(lastBackupTimeState).toLocaleTimeString() : '尚未執行'}
                    </strong>
                    {lastBackupFileState && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400">最新檔名：</span>
                        <code className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">
                          {lastBackupFileState}
                        </code>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunManualBackupTest}
                  disabled={isTestingLocalBackup}
                  className="festive-primary-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {isTestingLocalBackup ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>正在寫入本機...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>立即測試存檔至本機</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Crash Recovery Guide Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-100/60 border border-amber-300/80 text-[11px] text-amber-950 flex items-start gap-2.5">
              <span className="text-base leading-none">💡</span>
              <div className="space-y-1">
                <strong className="font-bold text-amber-950 block">電腦當機/關機現場緊急還原指引：</strong>
                <p className="text-slate-600 leading-relaxed">
                  1. 若電腦重新開機或瀏覽器意外崩潰，重新打開本系統，網頁上方將自動跳出<strong>「🧧 偵測到未完成的抽獎紀錄」</strong>，點擊<strong>「是，立即恢復進度」</strong>即可 1 秒原封不動繼續抽獎！<br />
                  2. 若更換至另一台新筆電或大螢幕電腦，只需點擊下方<strong>「從 JSON 備份檔還原」</strong>，選取本機備份資料夾內的最新 <code>.json</code> 檔案，即可無縫接續現場抽獎。
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Grid: 手動匯出還原 + 安全銷毀重設 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base font-display">
                <Save className="w-5 h-5 text-amber-600" />
                <span>抽獎狀態手動備份與還原 (JSON)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                手動將當前的員工名單、剩餘名額、全部中獎紀錄以及缺席備註打包為完整結構化備份檔 (.json)。萬一更換電腦，點擊還原即可完整重現現場。
              </p>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={onExportJsonBackup}
                  className="festive-gold-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-950" />
                  <span>下載完整歷程備份檔 (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRestoreJsonModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>從 JSON 備份檔還原</span>
                </button>
              </div>
            </div>

            {/* Quick Setup / Mock Data for Rehearsal */}
            <div className="p-6 rounded-3xl bg-white border border-amber-200/90 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base font-display">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>彩排測試與快速模擬</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  一鍵快速佈建
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                在尾牙活動正式開始前，主辦單位可一鍵載入 50 位跨部門員工（研發、行銷、財務、管理、營運）與 5 個標準級距獎項（包含實體商品圖與各種抽出方式），即刻進行全真現場彩排。
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>測試同仁數量：</span>
                  <strong className="font-mono text-slate-900 font-bold">50 位</strong>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>正規獎項名額：</span>
                  <strong className="font-mono text-rose-700 font-bold">44 個名額</strong>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>測試部門涵蓋：</span>
                  <span className="text-slate-500">研發部、行銷部、財務部、管理部、營運部</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">快速重設為示範名單與獎品：</span>
                <button
                  type="button"
                  onClick={onLoadMock}
                  className="festive-gold-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-950" />
                  <span>載入彩排測試資料</span>
                </button>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-rose-200/90 space-y-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-base font-display">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>安全銷毀與系統重設</span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  含二次確認 Dialog 防誤觸
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                活動結束撤場或重新開抽時，點擊以下操作將<strong>彈出二次確認 Dialog 視窗</strong>。
                支援備份防線（一鍵匯出 Excel / JSON）與安全鎖定機制，防止現場工作人員或主持人誤觸清空。
              </p>

              {/* Current Data Scope Info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">目前同仁名冊</span>
                  <strong className="text-slate-800 font-mono">{employees.length} 位</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">已抽出得獎者</span>
                  <strong className="text-rose-700 font-mono">{winningRecords.length} 筆</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">本機暫存快照</span>
                  <strong className="text-emerald-700 font-mono">{hasSnapshot ? '已儲存防護' : '無暫存'}</strong>
                </div>
              </div>

              <div className="pt-1 space-y-2.5">
                <button
                  type="button"
                  onClick={() => onOpenSecureReset ? onOpenSecureReset('wipe') : onSecureWipe()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 shadow-xs active:scale-98 transition-all cursor-pointer ring-1 ring-rose-400/40"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>結束活動清除快照 (安全銷毀個資 • 二次確認)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSecureReset ? onOpenSecureReset('reset-progress') : onResetAll()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>僅重設現場中獎進度 (保留名冊與獎項 • 二次確認)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSecureReset ? onOpenSecureReset('factory-reset') : onLoadMock()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>恢復出廠示範狀態 (重新載入 50 位同仁與 5 項獎項)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prize Add / Edit Modal */}
      <PrizeEditModal
        isOpen={isPrizeModalOpen}
        onClose={() => setIsPrizeModalOpen(false)}
        onSave={handleSavePrize}
        initialPrize={editingPrize}
        existingPrizesCount={prizes.length}
      />

      {/* Restore JSON Backup Modal Dialog */}
      <RestoreJsonModal
        isOpen={isRestoreJsonModalOpen}
        onClose={() => setIsRestoreJsonModalOpen(false)}
        onConfirmRestore={(data) => {
          if (onRestoreFromJsonData) {
            onRestoreFromJsonData(data);
          } else {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            const file = new File([blob], 'restore.json', { type: 'application/json' });
            onRestoreFromJson(file);
          }
          setIsRestoreJsonModalOpen(false);
        }}
        onExportCurrentBackup={onExportJsonBackup}
        currentEmployeesCount={employees.length}
        currentPrizesCount={prizes.length}
        currentWinnersCount={winningRecords.length}
      />

      {/* Employee Import Modal Dialog */}
      <EmployeeImportModal
        isOpen={isEmployeeImportModalOpen}
        onClose={() => setIsEmployeeImportModalOpen(false)}
        onImportEmployees={(emps, mode) => {
          if (onImportEmployees) {
            onImportEmployees(emps, mode);
          } else {
            onImportComplete(emps, prizes);
          }
        }}
        currentEmployeesCount={employees.length}
      />

      {/* Prize Import Modal Dialog */}
      <PrizeImportModal
        isOpen={isPrizeImportModalOpen}
        onClose={() => setIsPrizeImportModalOpen(false)}
        onImportPrizes={(prz, mode) => {
          if (onImportPrizes) {
            onImportPrizes(prz, mode);
          } else {
            onImportComplete(employees, prz);
          }
        }}
        currentPrizesCount={prizes.length}
      />
    </div>
  );
};
