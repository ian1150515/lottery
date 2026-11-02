import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Employee, Prize, WinningRecord, AbsentRecord, DonationRecord, CelebrationEffectType, AppSettings, RepeatWinningMode } from './types';
import { MOCK_EMPLOYEES, MOCK_PRIZES } from './utils/mockData';
import { exportWinnersToExcel, exportWinnersToCsv } from './utils/excelHelper';
import { 
  saveStorageSnapshot, 
  getStorageSnapshot, 
  clearStorageSnapshot, 
  downloadStateAsJson, 
  parseJsonBackupFile,
  StorageSnapshotData,
  DEFAULT_APP_SETTINGS
} from './utils/storageHelper';
import { 
  performAutoFolderBackup, 
  tryRestoreDirectoryHandle, 
  getConnectedDirectoryName, 
  hasConnectedDirectory 
} from './utils/localBackupHelper';
import { soundEffects } from './utils/soundEffects';
import { triggerCelebrationEffect } from './utils/confettiHelper';

import { Header, AppPage } from './components/Header';
import { PrizeSelector } from './components/PrizeSelector';
import { DrawStage } from './components/DrawStage';
import { WinnersWall } from './components/WinnersWall';
import { AdminPanel } from './components/AdminPanel';
import { AdditionalDrawModal } from './components/AdditionalDrawModal';
import { ImportModal } from './components/ImportModal';
import { ProjectorView } from './components/ProjectorView';
import { AbsenteeRedrawModal } from './components/AbsenteeRedrawModal';
import { ConfirmLoadMockModal } from './components/ConfirmLoadMockModal';
import { SecureResetModal, ResetModalMode } from './components/SecureResetModal';
import { RoundTransitionModal } from './components/RoundTransitionModal';
import { RefreshCw, Sparkles, Trophy, Settings, Award, Users, CheckCircle2, HeartHandshake, X } from 'lucide-react';

export default function App() {
  // Navigation State: 'stage' (抽獎舞台) | 'wall' (中獎星光榜) | 'admin' (後台管理者)
  const [currentPage, setCurrentPage] = useState<AppPage>('stage');

  // Interactive Toast Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; id: number } | null>(null);

  // Activity & Rhythm Settings State (Section 3.1 & 3.2)
  const [activityTitle, setActivityTitle] = useState<string>(DEFAULT_APP_SETTINGS.activityTitle);
  const [drawDurationSeconds, setDrawDurationSeconds] = useState<number>(DEFAULT_APP_SETTINGS.drawDurationSeconds);
  const [celebrationEffect, setCelebrationEffect] = useState<CelebrationEffectType>(DEFAULT_APP_SETTINGS.celebrationEffect);

  // Core Application Data State
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [prizes, setPrizes] = useState<Prize[]>(MOCK_PRIZES);
  const [winningRecords, setWinningRecords] = useState<WinningRecord[]>([]);
  const [absentRecords, setAbsentRecords] = useState<AbsentRecord[]>([]);
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>([]);

  // Pool state: 'main' (正規獎項) vs 'bonus' (加碼專區)
  const [currentPool, setCurrentPool] = useState<'main' | 'bonus'>('main');
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(MOCK_PRIZES[0]?.id || '');
  const [allowRepeatWinning, setAllowRepeatWinning] = useState<boolean>(true);
  const [repeatWinningMode, setRepeatWinningMode] = useState<RepeatWinningMode>('fair_round');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Crash resilience & Snapshot recovery state
  const [detectedSnapshot, setDetectedSnapshot] = useState<StorageSnapshotData | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState<boolean>(false);
  const [hasSnapshotSaved, setHasSnapshotSaved] = useState<boolean>(false);

  // Modals & Mode States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isAdditionalModalOpen, setIsAdditionalModalOpen] = useState<boolean>(false);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [isLoadMockConfirmOpen, setIsLoadMockConfirmOpen] = useState<boolean>(false);

  // Secure Reset & Destruction Modal State (二次確認 Dialog)
  const [isSecureResetModalOpen, setIsSecureResetModalOpen] = useState<boolean>(false);
  const [secureResetInitialMode, setSecureResetInitialMode] = useState<ResetModalMode>('wipe');

  const handleOpenSecureResetModal = (mode: ResetModalMode = 'wipe') => {
    setSecureResetInitialMode(mode);
    setIsSecureResetModalOpen(true);
  };

  // Absentee Redraw Confirmation & Dynamic Animation Modal State
  const [pendingRedrawRecord, setPendingRedrawRecord] = useState<WinningRecord | null>(null);
  const [isRedrawModalOpen, setIsRedrawModalOpen] = useState<boolean>(false);
  const [redrawCompletedCallback, setRedrawCompletedCallback] = useState<((newRecord: WinningRecord) => void) | null>(null);

  // Round Transition & Fair Round Robin Confirmation State
  const [acknowledgedRound, setAcknowledgedRound] = useState<number>(1);
  const [isNextRoundModalOpen, setIsNextRoundModalOpen] = useState<boolean>(false);
  const [isNextRoundModalReadonly, setIsNextRoundModalReadonly] = useState<boolean>(false);

  // Synchronize document title with dynamic activity title
  useEffect(() => {
    if (activityTitle) {
      document.title = activityTitle;
    }
  }, [activityTitle]);

  // On mount: Check for existing crash-recovery snapshot in localStorage & try restoring directory handle
  useEffect(() => {
    tryRestoreDirectoryHandle().then(restored => {
      if (restored) {
        console.log('Restored directory handle for local backup:', getConnectedDirectoryName());
      }
    });

    const existing = getStorageSnapshot();
    if (existing && (existing.winningRecords.length > 0 || existing.employees.length > 0 || existing.settings)) {
      setDetectedSnapshot(existing);
      setShowRestoreBanner(true);
      setHasSnapshotSaved(true);

      // Restore settings if present
      if (existing.settings) {
        if (existing.settings.activityTitle) setActivityTitle(existing.settings.activityTitle);
        if (existing.settings.drawDurationSeconds) setDrawDurationSeconds(existing.settings.drawDurationSeconds);
        if (existing.settings.celebrationEffect) setCelebrationEffect(existing.settings.celebrationEffect);
      }
    }
  }, []);

  // Filter prizes by pool
  const mainPrizes = useMemo(() => {
    return prizes.filter(p => p.poolType !== 'bonus' && !p.isAdditional);
  }, [prizes]);

  const bonusPrizes = useMemo(() => {
    return prizes.filter(p => p.poolType === 'bonus' || p.isAdditional);
  }, [prizes]);

  // Check if all main pool prizes have been fully completed
  const isMainPoolCompleted = useMemo(() => {
    if (mainPrizes.length === 0) return false;
    return mainPrizes.every(prize => {
      const drawn = winningRecords.filter(r => r.prizeId === prize.id).length;
      return drawn >= prize.quota;
    });
  }, [mainPrizes, winningRecords]);

  // Current active prize
  const currentPrize = useMemo(() => {
    const found = prizes.find(p => p.id === selectedPrizeId);
    if (found) return found;

    const activePoolPrizes = currentPool === 'main' ? mainPrizes : bonusPrizes;
    return activePoolPrizes[0] || prizes[0] || null;
  }, [prizes, selectedPrizeId, currentPool, mainPrizes, bonusPrizes]);

  // Current Prize remaining quota
  const currentPrizeRemainingQuota = useMemo(() => {
    if (!currentPrize) return 0;
    const drawn = winningRecords.filter(r => r.prizeId === currentPrize.id).length;
    return Math.max(0, currentPrize.quota - drawn);
  }, [currentPrize, winningRecords]);

  // Dynamic Candidate Pool Logic (獎池隔離棄權原則：在正規獎項專區棄權不可再抽正規獎項，但仍具備加碼專區抽獎資格；加碼池棄權則不可再抽加碼池)
  const candidates = useMemo(() => {
    // 1. 正規獎池已缺席棄權之同仁 (在正規獎池不可再抽其他正規獎項)
    const mainAbsentEmpIds = new Set(
      absentRecords
        .filter(a => {
          if (a.poolType === 'main') return true;
          if (a.poolType === 'bonus') return false;
          const p = prizes.find(pr => pr.id === a.prizeId);
          return !(p?.poolType === 'bonus' || p?.isAdditional);
        })
        .map(a => a.employeeId)
    );

    // 2. 加碼獎池已缺席棄權之同仁
    const bonusAbsentEmpIds = new Set(
      absentRecords
        .filter(a => {
          if (a.poolType === 'bonus') return true;
          if (a.poolType === 'main') return false;
          const p = prizes.find(pr => pr.id === a.prizeId);
          return !!(p?.poolType === 'bonus' || p?.isAdditional);
        })
        .map(a => a.employeeId)
    );

    // 3. 獎池已捐出之同仁
    const mainDonatedEmpIds = new Set(
      donationRecords
        .filter(d => d.fromPool !== 'bonus')
        .map(d => d.employeeId)
    );
    const bonusDonatedEmpIds = new Set(
      donationRecords
        .filter(d => d.fromPool === 'bonus')
        .map(d => d.employeeId)
    );

    const isBonus = currentPool === 'bonus';
    const poolWinners = winningRecords.filter(w => isBonus ? (w.poolType === 'bonus' || w.isAdditional) : (w.poolType !== 'bonus' && !w.isAdditional));
    const poolAbsentEmpIds = isBonus ? bonusAbsentEmpIds : mainAbsentEmpIds;
    const poolDonatedEmpIds = isBonus ? bonusDonatedEmpIds : mainDonatedEmpIds;

    // 計算每位同仁在當前獎池的已獲獎次數
    const winCounts = new Map<string, number>();
    poolWinners.forEach(w => {
      winCounts.set(w.employeeId, (winCounts.get(w.employeeId) || 0) + 1);
    });

    // 1. 若非平準輪次模式 (傳統一人一獎)：嚴格排除已獲獎、缺席、捐出者
    if (!allowRepeatWinning || repeatWinningMode === 'none') {
      return employees.filter(emp => {
        if (poolAbsentEmpIds.has(emp.id)) return false;
        if (poolDonatedEmpIds.has(emp.id)) return false;
        if ((winCounts.get(emp.id) || 0) > 0) return false;
        return true;
      });
    }

    // 2. 若為自由重複模式
    if (repeatWinningMode === 'unlimited') {
      return employees;
    }

    // 3. 平準輪次模式 (fair_round - 預設首選)：
    // 檢查第一輪是否「尚有未曾獲獎且未缺席、未捐出的同仁」
    const round1Pending = employees.filter(emp => {
      const hasWon = (winCounts.get(emp.id) || 0) > 0;
      const isAbsent = poolAbsentEmpIds.has(emp.id);
      const isDonated = poolDonatedEmpIds.has(emp.id);
      return !hasWon && !isAbsent && !isDonated;
    });

    // 若第一輪尚未抽完：候選人嚴格為尚未獲獎的同仁（第一輪中缺席與捐出者維持在第一輪中排除）
    if (round1Pending.length > 0) {
      return round1Pending;
    }

    // ★ 若第一輪已全數抽完：
    // 若現場尚未在彈窗確認進入第 2 輪 (acknowledgedRound < 2)：
    // 候選人池暫緩開放（返回空陣列），確保現場主持人先看過/宣告「第 2 輪平準抽獎」彈窗！
    if (acknowledgedRound < 2) {
      return [];
    }

    // 正式進入第二輪（或更高輪次）！
    // 依使用者需求：在第一輪抽完後，第一輪缺席與捐出者全面解鎖，在第二輪均可再次抽到！
    // 同時嚴守平準機制（每人在該輪限中 1 次）：
    // - 第一輪正常中獎同仁：第二輪可中第 2 次 (上限 2)
    // - 第一輪捐出或缺席同仁：第一輪無保有獎項(0份)，在第二輪中獎後累計 1 份 (上限 1)
    const normalEmployees = employees.filter(emp => !poolAbsentEmpIds.has(emp.id) && !poolDonatedEmpIds.has(emp.id));
    const normalMinWins = normalEmployees.reduce((min, emp) => {
      const c = winCounts.get(emp.id) || 0;
      return c < min ? c : min;
    }, Infinity);

    const currentRound = Math.max(2, (normalMinWins === Infinity ? 1 : normalMinWins) + 1);

    return employees.filter(emp => {
      const count = winCounts.get(emp.id) || 0;
      const isRound1Special = poolAbsentEmpIds.has(emp.id) || poolDonatedEmpIds.has(emp.id);
      const allowedCap = isRound1Special ? (currentRound - 1) : currentRound;
      return count < allowedCap;
    });
  }, [employees, absentRecords, winningRecords, donationRecords, currentPool, allowRepeatWinning, repeatWinningMode, prizes, acknowledgedRound]);

  // 當前抽獎輪次 (例如第 1 輪、第 2 輪平準抽獎)
  const currentDrawRound = useMemo(() => {
    if (!allowRepeatWinning || repeatWinningMode !== 'fair_round') return 1;
    const isBonus = currentPool === 'bonus';

    const poolWinners = winningRecords.filter(w => isBonus ? (w.poolType === 'bonus' || w.isAdditional) : (w.poolType !== 'bonus' && !w.isAdditional));
    const poolAbsents = absentRecords.filter(a => 
      isBonus 
        ? (a.poolType === 'bonus' || (!a.poolType && prizes.some(pr => pr.id === a.prizeId && (pr.poolType === 'bonus' || pr.isAdditional))))
        : (a.poolType === 'main' || (!a.poolType && prizes.some(pr => pr.id === a.prizeId && pr.poolType !== 'bonus' && !pr.isAdditional)))
    );
    const poolDonations = donationRecords.filter(d => isBonus ? d.fromPool === 'bonus' : d.fromPool !== 'bonus');

    const poolAbsentEmpIds = new Set(poolAbsents.map(a => a.employeeId));
    const poolDonatedEmpIds = new Set(poolDonations.map(d => d.employeeId));

    const winCounts = new Map<string, number>();
    poolWinners.forEach(w => {
      winCounts.set(w.employeeId, (winCounts.get(w.employeeId) || 0) + 1);
    });

    const round1Pending = employees.filter(emp => {
      const hasWon = (winCounts.get(emp.id) || 0) > 0;
      const isAbsent = poolAbsentEmpIds.has(emp.id);
      const isDonated = poolDonatedEmpIds.has(emp.id);
      return !hasWon && !isAbsent && !isDonated;
    });

    if (round1Pending.length > 0) return 1;

    const normalEmployees = employees.filter(emp => !poolAbsentEmpIds.has(emp.id) && !poolDonatedEmpIds.has(emp.id));
    if (normalEmployees.length === 0) return 2;

    const normalMinWins = normalEmployees.reduce((min, emp) => {
      const c = winCounts.get(emp.id) || 0;
      return c < min ? c : min;
    }, Infinity);

    return Math.max(2, (normalMinWins === Infinity ? 1 : normalMinWins) + 1);
  }, [employees, absentRecords, winningRecords, donationRecords, currentPool, allowRepeatWinning, repeatWinningMode, prizes]);

  // 自動偵測第 1 輪抽獎完成：若第 1 輪全體同仁皆已獲獎且尚有獎品，若尚未確認第 2 輪，立即自動跳出「第 2 輪平準抽獎」彈窗！
  useEffect(() => {
    if (employees.length === 0) return;
    const isBonus = currentPool === 'bonus';
    const poolWinners = winningRecords.filter(w => isBonus ? (w.poolType === 'bonus' || w.isAdditional) : (w.poolType !== 'bonus' && !w.isAdditional));
    const poolAbsents = absentRecords.filter(a => 
      isBonus 
        ? (a.poolType === 'bonus' || (!a.poolType && prizes.some(pr => pr.id === a.prizeId && (pr.poolType === 'bonus' || pr.isAdditional))))
        : (a.poolType === 'main' || (!a.poolType && prizes.some(pr => pr.id === a.prizeId && pr.poolType !== 'bonus' && !pr.isAdditional)))
    );
    const poolDonations = donationRecords.filter(d => isBonus ? d.fromPool === 'bonus' : d.fromPool !== 'bonus');

    const poolAbsentEmpIds = new Set(poolAbsents.map(a => a.employeeId));
    const poolDonatedEmpIds = new Set(poolDonations.map(d => d.employeeId));

    const winCounts = new Map<string, number>();
    poolWinners.forEach(w => {
      winCounts.set(w.employeeId, (winCounts.get(w.employeeId) || 0) + 1);
    });

    const round1Pending = employees.filter(emp => {
      const hasWon = (winCounts.get(emp.id) || 0) > 0;
      const isAbsent = poolAbsentEmpIds.has(emp.id);
      const isDonated = poolDonatedEmpIds.has(emp.id);
      return !hasWon && !isAbsent && !isDonated;
    });

    const totalRemainingQuota = prizes.reduce((acc, p) => {
      const pDrawn = winningRecords.filter(w => w.prizeId === p.id).length;
      return acc + Math.max(0, p.quota - pDrawn);
    }, 0);

    // 當第 1 輪已抽完（round1Pending 為 0），且尚有剩餘獎品配額，且尚未確認開啟第 2 輪 (acknowledgedRound < 2)：
    if (round1Pending.length === 0 && totalRemainingQuota > 0 && acknowledgedRound < 2) {
      setIsNextRoundModalOpen(true);
    }
  }, [employees, absentRecords, winningRecords, donationRecords, currentPool, prizes, acknowledgedRound]);

  // Total Quota across both pools
  const totalPrizesQuota = useMemo(() => {
    return prizes.reduce((acc, p) => acc + p.quota, 0);
  }, [prizes]);

  // Auto snapshot update helper
  const triggerAutoSaveSnapshot = useCallback((
    updatedEmployees: Employee[],
    updatedPrizes: Prize[],
    updatedWinners: WinningRecord[],
    updatedAbsentees: AbsentRecord[],
    pool: 'main' | 'bonus',
    prizeId: string,
    allowRepeat: boolean,
    customSettings?: Partial<AppSettings>,
    updatedDonations?: DonationRecord[],
    mode?: RepeatWinningMode,
    acknowledgedRoundParam?: number
  ) => {
    const snapshot: StorageSnapshotData = {
      version: '1.0.0',
      savedAt: Date.now(),
      settings: {
        activityTitle: customSettings?.activityTitle ?? activityTitle,
        drawDurationSeconds: customSettings?.drawDurationSeconds ?? drawDurationSeconds,
        celebrationEffect: customSettings?.celebrationEffect ?? celebrationEffect,
      },
      employees: updatedEmployees,
      prizes: updatedPrizes,
      winningRecords: updatedWinners,
      absentRecords: updatedAbsentees,
      donationRecords: updatedDonations ?? donationRecords,
      currentPool: pool,
      selectedPrizeId: prizeId,
      allowRepeatWinning: allowRepeat,
      repeatWinningMode: mode ?? repeatWinningMode,
      acknowledgedRound: acknowledgedRoundParam !== undefined ? acknowledgedRoundParam : acknowledgedRound,
    };
    saveStorageSnapshot(snapshot);
    setHasSnapshotSaved(true);
  }, [activityTitle, drawDurationSeconds, celebrationEffect, donationRecords, repeatWinningMode, acknowledgedRound]);

  // Handler: Confirm Entering Round 2 (平準輪次確認)
  const handleConfirmNextRound = () => {
    const targetRound = Math.max(2, currentDrawRound);
    setAcknowledgedRound(targetRound);
    setAllowRepeatWinning(true);
    setRepeatWinningMode('fair_round');
    setIsNextRoundModalOpen(false);
    setIsNextRoundModalReadonly(false);
    soundEffects.playFanfare();
    triggerCelebrationEffect(celebrationEffect || 'fireworks');
    setToastMessage({
      id: Date.now(),
      text: `🎉 已正式開啟第 ${targetRound} 輪平準抽獎！全員名單（含愛心捐出與缺席同仁）已全面重返候選池！`,
    });
    triggerAutoSaveSnapshot(
      employees,
      prizes,
      winningRecords,
      absentRecords,
      currentPool,
      selectedPrizeId,
      true,
      undefined,
      donationRecords,
      'fair_round',
      targetRound
    );
  };

  const handleOpenNextRoundModal = (readonly: boolean = false) => {
    setIsNextRoundModalReadonly(readonly);
    setIsNextRoundModalOpen(true);
  };

  const handleCloseNextRoundModal = () => {
    setIsNextRoundModalOpen(false);
    setIsNextRoundModalReadonly(false);
  };

  // Settings Handlers (Section 3.1 & 3.2)
  const handleUpdateActivityTitle = (newTitle: string) => {
    setActivityTitle(newTitle);
    triggerAutoSaveSnapshot(
      employees,
      prizes,
      winningRecords,
      absentRecords,
      currentPool,
      selectedPrizeId,
      allowRepeatWinning,
      { activityTitle: newTitle }
    );
  };

  // Auto-dismiss toast notification
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleUpdateDrawDuration = (newSeconds: number) => {
    setDrawDurationSeconds(newSeconds);
    triggerAutoSaveSnapshot(
      employees,
      prizes,
      winningRecords,
      absentRecords,
      currentPool,
      selectedPrizeId,
      allowRepeatWinning,
      { drawDurationSeconds: newSeconds }
    );
  };

  const handleUpdateCelebrationEffect = (newEffect: CelebrationEffectType) => {
    setCelebrationEffect(newEffect);
    triggerAutoSaveSnapshot(
      employees,
      prizes,
      winningRecords,
      absentRecords,
      currentPool,
      selectedPrizeId,
      allowRepeatWinning,
      { celebrationEffect: newEffect }
    );
  };

  // Prize CRUD Handlers (Section 3.3)
  const handleAddPrize = (prizeData: Omit<Prize, 'id'>) => {
    const newPrize: Prize = {
      ...prizeData,
      id: `prize-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    const updated = [...prizes, newPrize];
    setPrizes(updated);

    triggerAutoSaveSnapshot(
      employees,
      updated,
      winningRecords,
      absentRecords,
      currentPool,
      newPrize.id,
      allowRepeatWinning
    );
    soundEffects.playTick();
  };

  const handleUpdatePrize = (updatedPrize: Prize) => {
    const updated = prizes.map(p => p.id === updatedPrize.id ? updatedPrize : p);
    setPrizes(updated);

    triggerAutoSaveSnapshot(
      employees,
      updated,
      winningRecords,
      absentRecords,
      currentPool,
      selectedPrizeId,
      allowRepeatWinning
    );
    soundEffects.playTick();
  };

  const handleAdjustPrizeQuota = (prizeId: string, newQuota: number) => {
    const targetPrize = prizes.find(p => p.id === prizeId);
    if (!targetPrize) return;
    const updatedPrize: Prize = { ...targetPrize, quota: newQuota };
    handleUpdatePrize(updatedPrize);
  };

  const handleToggleAllowRepeat = () => {
    if (!allowRepeatWinning) {
      setAllowRepeatWinning(true);
      setRepeatWinningMode('fair_round');
      triggerAutoSaveSnapshot(
        employees,
        prizes,
        winningRecords,
        absentRecords,
        currentPool,
        selectedPrizeId,
        true,
        undefined,
        donationRecords,
        'fair_round'
      );
    } else {
      setAllowRepeatWinning(false);
      setRepeatWinningMode('none');
      triggerAutoSaveSnapshot(
        employees,
        prizes,
        winningRecords,
        absentRecords,
        currentPool,
        selectedPrizeId,
        false,
        undefined,
        donationRecords,
        'none'
      );
    }
  };

  const handleSetRepeatWinningMode = (mode: RepeatWinningMode) => {
    setRepeatWinningMode(mode);
    const isAllowed = mode !== 'none';
    setAllowRepeatWinning(isAllowed);
    triggerAutoSaveSnapshot(
      employees,
      prizes,
      winningRecords,
      absentRecords,
      currentPool,
      selectedPrizeId,
      isAllowed,
      undefined,
      donationRecords,
      mode
    );
  };

  const handleDeletePrize = (prizeId: string) => {
    const updatedPrizes = prizes.filter(p => p.id !== prizeId);
    const updatedWinners = winningRecords.filter(w => w.prizeId !== prizeId);
    const updatedAbsentees = absentRecords.filter(a => a.prizeId !== prizeId);

    setPrizes(updatedPrizes);
    setWinningRecords(updatedWinners);
    setAbsentRecords(updatedAbsentees);

    const nextSelected = updatedPrizes[0]?.id || '';
    setSelectedPrizeId(nextSelected);

    triggerAutoSaveSnapshot(
      employees,
      updatedPrizes,
      updatedWinners,
      updatedAbsentees,
      currentPool,
      nextSelected,
      allowRepeatWinning
    );
    soundEffects.playTick();
  };

  // Handler: Switch between Main Pool and Bonus Pool
  const handleSwitchPool = (newPool: 'main' | 'bonus') => {
    setCurrentPool(newPool);
    const targetPrizes = newPool === 'main' ? mainPrizes : bonusPrizes;
    if (targetPrizes.length > 0) {
      const nextIncomplete = targetPrizes.find(p => {
        const count = winningRecords.filter(r => r.prizeId === p.id).length;
        return count < p.quota;
      });
      setSelectedPrizeId(nextIncomplete ? nextIncomplete.id : targetPrizes[0].id);
    }
  };

  // Handler: Add new winners from standard or batch draw
  const handleAddWinners = (newWinners: WinningRecord[]) => {
    setWinningRecords(prevWinners => {
      // Ensure no duplicate records by ID
      const existingIds = new Set(prevWinners.map(r => r.id));
      const freshNewWinners = newWinners.filter(w => !existingIds.has(w.id));
      const updatedWinners = [...freshNewWinners, ...prevWinners];

      const snapshot: StorageSnapshotData = {
        version: '1.0.0',
        savedAt: Date.now(),
        settings: {
          activityTitle,
          drawDurationSeconds,
          celebrationEffect,
        },
        employees,
        prizes,
        winningRecords: updatedWinners,
        absentRecords,
        donationRecords,
        currentPool,
        selectedPrizeId,
        allowRepeatWinning,
      };

      saveStorageSnapshot(snapshot);
      setHasSnapshotSaved(true);

      // 檢查此獎項是否已抽滿（每抽完一個獎項就自動存檔至本機資料夾，防止當機遺失）
      if (currentPrize) {
        const allPrizeWinners = updatedWinners.filter(r => r.prizeId === currentPrize.id);
        const isQuotaReached = allPrizeWinners.length >= currentPrize.quota;

        if (isQuotaReached) {
          performAutoFolderBackup(snapshot, `${currentPrize.name}_全數抽完`).then(res => {
            if (res.success) {
              setToastMessage({
                id: Date.now(),
                text: `💾 【${currentPrize.name}】已全數開出！已自動存檔至本機備份 (${res.fileName || '即時備份'})`,
              });
            }
          });
        }
      }

      // Check if current prize reached quota, auto switch to next incomplete prize (only in non-projector view)
      if (currentPrize && !isProjectorMode) {
        const allPrizeWinners = updatedWinners.filter(r => r.prizeId === currentPrize.id);
        if (allPrizeWinners.length >= currentPrize.quota) {
          const poolPrizes = currentPool === 'main' ? mainPrizes : bonusPrizes;
          const nextIncomplete = poolPrizes.find(p => {
            const count = updatedWinners.filter(r => r.prizeId === p.id).length;
            return count < p.quota && p.id !== currentPrize.id;
          });

          if (nextIncomplete) {
            setTimeout(() => {
              setSelectedPrizeId(nextIncomplete.id);
            }, 1500);
          } else if (currentPool === 'main' && isMainPoolCompleted) {
            soundEffects.playFanfare();
          }
        }
      }

      return updatedWinners;
    });
  };

  // Candidates eligible for absentee replacement (補抽候選人名單，遵循獎池隔離棄權原則)
  const eligibleCandidatesForReplacement = useMemo(() => {
    if (!pendingRedrawRecord) return [];

    const isBonus = pendingRedrawRecord.poolType === 'bonus' || pendingRedrawRecord.isAdditional;

    const poolWinners = winningRecords.filter(w => isBonus ? (w.poolType === 'bonus' || w.isAdditional) : (w.poolType !== 'bonus' && !w.isAdditional));
    const poolAbsents = absentRecords.filter(a => 
      isBonus 
        ? (a.poolType === 'bonus' || (!a.poolType && prizes.some(pr => pr.id === a.prizeId && (pr.poolType === 'bonus' || pr.isAdditional))))
        : (a.poolType === 'main' || (!a.poolType && prizes.some(pr => pr.id === a.prizeId && pr.poolType !== 'bonus' && !pr.isAdditional)))
    );
    const poolDonations = donationRecords.filter(d => isBonus ? d.fromPool === 'bonus' : d.fromPool !== 'bonus');

    const poolAbsentEmpIds = new Set(poolAbsents.map(a => a.employeeId));
    const poolDonatedEmpIds = new Set(poolDonations.map(d => d.employeeId));

    const winCounts = new Map<string, number>();
    poolWinners
      .filter(w => w.id !== pendingRedrawRecord.id)
      .forEach(w => {
        winCounts.set(w.employeeId, (winCounts.get(w.employeeId) || 0) + 1);
      });

    // 檢查第一輪是否尚有未抽到同仁
    const round1Pending = employees.filter(emp => {
      if (emp.id === pendingRedrawRecord.employeeId) return false;
      const hasWon = (winCounts.get(emp.id) || 0) > 0;
      const isAbsent = poolAbsentEmpIds.has(emp.id);
      const isDonated = poolDonatedEmpIds.has(emp.id);
      return !hasWon && !isAbsent && !isDonated;
    });

    if (!allowRepeatWinning || repeatWinningMode === 'none') {
      return round1Pending;
    }

    if (repeatWinningMode === 'unlimited') {
      return employees.filter(emp => emp.id !== pendingRedrawRecord.employeeId);
    }

    // fair_round
    if (round1Pending.length > 0) {
      return round1Pending;
    }

    // 第二輪+：第一輪缺席與捐出者全面解鎖參與補抽
    const normalEmployees = employees.filter(emp => emp.id !== pendingRedrawRecord.employeeId && !poolAbsentEmpIds.has(emp.id) && !poolDonatedEmpIds.has(emp.id));
    const normalMinWins = normalEmployees.reduce((min, emp) => {
      const c = winCounts.get(emp.id) || 0;
      return c < min ? c : min;
    }, Infinity);

    const currentRound = Math.max(2, (normalMinWins === Infinity ? 1 : normalMinWins) + 1);

    return employees.filter(emp => {
      if (emp.id === pendingRedrawRecord.employeeId) return false;
      const count = winCounts.get(emp.id) || 0;
      const isRound1Special = poolAbsentEmpIds.has(emp.id) || poolDonatedEmpIds.has(emp.id);
      const allowedCap = isRound1Special ? (currentRound - 1) : currentRound;
      return count < allowedCap;
    });
  }, [employees, absentRecords, winningRecords, donationRecords, pendingRedrawRecord, allowRepeatWinning, repeatWinningMode, prizes]);

  // Handler: Absentee / Re-draw request
  const handleReplaceAbsentee = (
    target: WinningRecord | string,
    defaultReason: string = '唱名三次未到場領取',
    onCompleted?: (newRecord: WinningRecord) => void
  ) => {
    let recordToReplace: WinningRecord | undefined;
    if (typeof target === 'string') {
      recordToReplace = winningRecords.find(r => r.id === target);
    } else {
      recordToReplace = target;
    }

    if (!recordToReplace) return;

    setPendingRedrawRecord(recordToReplace);
    setRedrawCompletedCallback(() => onCompleted || null);
    setIsRedrawModalOpen(true);
  };

  // Handler: Confirm and finalize absentee redraw
  const handleConfirmAbsenteeRedraw = (
    recordToReplace: WinningRecord,
    replacementEmp: Employee,
    reason: string
  ) => {
    const isBonus = recordToReplace.poolType === 'bonus' || recordToReplace.isAdditional;
    const newAbsent: AbsentRecord = {
      id: `absent-${Date.now()}`,
      employeeId: recordToReplace.employeeId,
      employeeNo: recordToReplace.employeeNo,
      employeeName: recordToReplace.employeeName,
      department: recordToReplace.department,
      prizeId: recordToReplace.prizeId,
      prizeName: recordToReplace.prizeName,
      poolType: isBonus ? 'bonus' : 'main',
      timestamp: Date.now(),
      reason: reason || '唱名三次未到場領獎',
    };
    const updatedAbsentees = [newAbsent, ...absentRecords];
    setAbsentRecords(updatedAbsentees);

    const replacementRecord: WinningRecord = {
      id: `win-replace-${Date.now()}`,
      prizeId: recordToReplace.prizeId,
      prizeName: recordToReplace.prizeName,
      prizeContent: recordToReplace.prizeContent,
      prizeImage: recordToReplace.prizeImage,
      employeeId: replacementEmp.id,
      employeeNo: replacementEmp.empNo,
      employeeName: replacementEmp.name,
      department: replacementEmp.department,
      timestamp: Date.now(),
      isAdditional: isBonus,
      poolType: isBonus ? 'bonus' : 'main',
      replacesAbsenteeId: recordToReplace.employeeId,
    };

    setWinningRecords(prevWinningRecords => {
      const updatedWinningRecords = [
        replacementRecord,
        ...prevWinningRecords.filter(r => r.id !== recordToReplace.id)
      ];

      const snapshot: StorageSnapshotData = {
        version: '1.0.0',
        savedAt: Date.now(),
        settings: {
          activityTitle,
          drawDurationSeconds,
          celebrationEffect,
        },
        employees,
        prizes,
        winningRecords: updatedWinningRecords,
        absentRecords: updatedAbsentees,
        donationRecords,
        currentPool,
        selectedPrizeId,
        allowRepeatWinning,
      };

      saveStorageSnapshot(snapshot);
      setHasSnapshotSaved(true);

      performAutoFolderBackup(snapshot, `補抽_${recordToReplace.prizeName}`).then(res => {
        if (res.success) {
          setToastMessage({
            id: Date.now(),
            text: `💾 遞補完成！已自動同步存檔至本機備份 (${res.fileName || '已存檔'})`,
          });
        }
      });

      return updatedWinningRecords;
    });

    if (redrawCompletedCallback) {
      redrawCompletedCallback(replacementRecord);
      setRedrawCompletedCallback(null);
    }

    setToastMessage({
      text: `🎉 缺席遞補得主【${replacementEmp.name}】已成功寫入中獎星光榜！`,
      id: Date.now(),
    });

    setIsRedrawModalOpen(false);
    setPendingRedrawRecord(null);
  };

  // Handler: Prize Donation (同仁好意捐出獎項，釋出名額供現場重抽)
  const handleDonatePrize = (
    record: WinningRecord, 
    options?: { note?: string }
  ) => {
    const newDonation: DonationRecord = {
      id: `donate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: record.employeeId,
      employeeNo: record.employeeNo,
      employeeName: record.employeeName,
      department: record.department,
      prizeId: record.prizeId,
      prizeName: record.prizeName,
      prizeContent: record.prizeContent,
      fromPool: record.poolType || (record.isAdditional ? 'bonus' : 'main'),
      targetPool: 'current',
      timestamp: Date.now(),
      note: options?.note || '愛心同仁好意捐出，當前獎項名額釋出重抽',
    };

    const updatedDonations = [newDonation, ...donationRecords];
    setDonationRecords(updatedDonations);

    // Remove the winning record so the quota is immediately released back to currentPrize
    setWinningRecords(prevWinningRecords => {
      const updatedWinners = prevWinningRecords.filter(r => r.id !== record.id);

      const snapshot: StorageSnapshotData = {
        version: '1.0.0',
        savedAt: Date.now(),
        settings: {
          activityTitle,
          drawDurationSeconds,
          celebrationEffect,
        },
        employees,
        prizes,
        winningRecords: updatedWinners,
        absentRecords,
        donationRecords: updatedDonations,
        currentPool,
        selectedPrizeId,
        allowRepeatWinning,
      };

      saveStorageSnapshot(snapshot);
      setHasSnapshotSaved(true);

      performAutoFolderBackup(snapshot, `捐出_${record.prizeName}`).then(res => {
        if (res.success) {
          setToastMessage({
            id: Date.now(),
            text: `💾 獎項捐出成功！已自動同步存檔至本機備份 (${res.fileName || '已存檔'})`,
          });
        }
      });

      return updatedWinners;
    });

    soundEffects.playFanfare();

    const poolLabel = (record.poolType === 'bonus' || record.isAdditional) ? '加碼獎池' : '正規獎池';
    setToastMessage({
      text: `✨ 感謝同仁【${record.employeeName}】好意捐出「${record.prizeName}」！名額已即刻釋出現場重抽，該同仁已標記不可再於${poolLabel}抽獎。`,
      id: Date.now()
    });
  };

  // Handler: Manual Local Folder Backup Test
  const handleManualLocalBackup = async (): Promise<{ success: boolean; fileName?: string; fallbackDownload?: boolean; error?: string }> => {
    const snapshot: StorageSnapshotData = {
      version: '1.0.0',
      savedAt: Date.now(),
      settings: {
        activityTitle,
        drawDurationSeconds,
        celebrationEffect,
      },
      employees,
      prizes,
      winningRecords,
      absentRecords,
      donationRecords,
      currentPool,
      selectedPrizeId,
      allowRepeatWinning,
    };
    saveStorageSnapshot(snapshot);
    setHasSnapshotSaved(true);
    return await performAutoFolderBackup(snapshot, '手動備份測試');
  };

  // Handler: Dynamic Additional Draw (現場臨時加碼)
  const handleAddAdditionalPrize = (newPrize: Prize, drawImmediately: boolean) => {
    const updatedPrizes = drawImmediately ? [newPrize, ...prizes] : [...prizes, newPrize];
    setPrizes(updatedPrizes);
    setCurrentPool('bonus');
    setSelectedPrizeId(newPrize.id);

    triggerAutoSaveSnapshot(
      employees,
      updatedPrizes,
      winningRecords,
      absentRecords,
      'bonus',
      newPrize.id,
      allowRepeatWinning
    );
  };

  // Handler: Import Excel files (legacy full import)
  const handleImportComplete = (importedEmployees: Employee[], importedPrizes: Prize[]) => {
    let finalEmps = employees;
    let finalPrizes = prizes;

    if (importedEmployees.length > 0) {
      finalEmps = importedEmployees;
      setEmployees(finalEmps);
      setWinningRecords([]);
      setAbsentRecords([]);
      setAcknowledgedRound(1);
      setIsNextRoundModalOpen(false);
    }
    if (importedPrizes.length > 0) {
      finalPrizes = importedPrizes.map(p => ({
        ...p,
        poolType: p.poolType || 'main',
      }));
      setPrizes(finalPrizes);
      setSelectedPrizeId(finalPrizes[0]?.id || '');
    }

    triggerAutoSaveSnapshot(
      finalEmps,
      finalPrizes,
      [],
      [],
      'main',
      finalPrizes[0]?.id || '',
      allowRepeatWinning,
      undefined,
      [],
      repeatWinningMode,
      1
    );
  };

  // Handler: Import Employees directly with append or overwrite mode
  const handleImportEmployees = (importedEmployees: Employee[], mode: 'append' | 'overwrite') => {
    let finalEmps: Employee[] = [];
    if (mode === 'append') {
      const existingNos = new Set(employees.map(e => e.empNo.trim().toLowerCase()));
      const newOnly = importedEmployees.filter(e => !existingNos.has(e.empNo.trim().toLowerCase()));
      finalEmps = [...employees, ...newOnly];
      setEmployees(finalEmps);
      setToastMessage({
        id: Date.now(),
        text: `📥 成功追加 ${newOnly.length} 位同仁！目前名冊共 ${finalEmps.length} 人。`,
      });
      triggerAutoSaveSnapshot(
        finalEmps,
        prizes,
        winningRecords,
        absentRecords,
        currentPool,
        selectedPrizeId,
        allowRepeatWinning,
        undefined,
        donationRecords,
        repeatWinningMode,
        acknowledgedRound
      );
    } else {
      // overwrite
      finalEmps = importedEmployees;
      setEmployees(finalEmps);
      setWinningRecords([]);
      setAbsentRecords([]);
      setDonationRecords([]);
      setAcknowledgedRound(1);
      setIsNextRoundModalOpen(false);
      setToastMessage({
        id: Date.now(),
        text: `📥 已成功覆蓋建立 ${finalEmps.length} 位同仁名冊！`,
      });
      triggerAutoSaveSnapshot(
        finalEmps,
        prizes,
        [],
        [],
        currentPool,
        selectedPrizeId,
        allowRepeatWinning,
        undefined,
        [],
        repeatWinningMode,
        1
      );
    }
  };

  // Handler: Import Prizes directly with append or overwrite mode
  const handleImportPrizes = (importedPrizes: Prize[], mode: 'append' | 'overwrite') => {
    let finalPrizes: Prize[] = [];
    if (mode === 'append') {
      const existingNames = new Set(prizes.map(p => p.name.trim().toLowerCase()));
      const newItems = importedPrizes.map((p, idx) => ({
        ...p,
        id: existingNames.has(p.name.trim().toLowerCase()) ? `prize-${Date.now()}-${idx}` : p.id,
        poolType: p.poolType || 'main',
      }));
      finalPrizes = [...prizes, ...newItems];
      setPrizes(finalPrizes);
      setToastMessage({
        id: Date.now(),
        text: `📥 成功追加 ${newItems.length} 項新獎品！目前共 ${finalPrizes.length} 項。`,
      });
      triggerAutoSaveSnapshot(
        employees,
        finalPrizes,
        winningRecords,
        absentRecords,
        currentPool,
        selectedPrizeId || finalPrizes[0]?.id || '',
        allowRepeatWinning,
        undefined,
        donationRecords,
        repeatWinningMode,
        acknowledgedRound
      );
    } else {
      // overwrite
      finalPrizes = importedPrizes.map(p => ({
        ...p,
        poolType: p.poolType || 'main',
      }));
      setPrizes(finalPrizes);
      const nextSelected = finalPrizes[0]?.id || '';
      setSelectedPrizeId(nextSelected);
      setWinningRecords([]);
      setAbsentRecords([]);
      setDonationRecords([]);
      setAcknowledgedRound(1);
      setIsNextRoundModalOpen(false);
      setToastMessage({
        id: Date.now(),
        text: `📥 已成功覆蓋重設 ${finalPrizes.length} 項抽獎獎品！`,
      });
      triggerAutoSaveSnapshot(
        employees,
        finalPrizes,
        [],
        [],
        'main',
        nextSelected,
        allowRepeatWinning,
        undefined,
        [],
        repeatWinningMode,
        1
      );
    }
  };

  // Handler: Open confirmation modal before loading mock data
  const handleLoadMock = () => {
    setIsLoadMockConfirmOpen(true);
  };

  // Handler: Confirm and execute loading of mock data
  const handleConfirmLoadMock = () => {
    setEmployees(MOCK_EMPLOYEES);
    setPrizes(MOCK_PRIZES);
    setWinningRecords([]);
    setAbsentRecords([]);
    setCurrentPool('main');
    setSelectedPrizeId(MOCK_PRIZES[0].id);
    setAllowRepeatWinning(true);
    setRepeatWinningMode('fair_round');
    setAcknowledgedRound(1);
    setIsNextRoundModalOpen(false);
    soundEffects.playFanfare();
    triggerCelebrationEffect(celebrationEffect);

    triggerAutoSaveSnapshot(
      MOCK_EMPLOYEES,
      MOCK_PRIZES,
      [],
      [],
      'main',
      MOCK_PRIZES[0].id,
      true,
      undefined,
      [],
      'fair_round',
      1
    );
  };

  // Restore snapshot from crash recovery
  const handleRestoreSnapshot = () => {
    if (!detectedSnapshot) return;
    setEmployees(detectedSnapshot.employees || []);
    setPrizes(detectedSnapshot.prizes || []);
    setWinningRecords(detectedSnapshot.winningRecords || []);
    setAbsentRecords(detectedSnapshot.absentRecords || []);
    if (detectedSnapshot.donationRecords) {
      setDonationRecords(detectedSnapshot.donationRecords);
    }
    setCurrentPool(detectedSnapshot.currentPool || 'main');
    setSelectedPrizeId(detectedSnapshot.selectedPrizeId || (detectedSnapshot.prizes[0]?.id ?? ''));
    setAllowRepeatWinning(Boolean(detectedSnapshot.allowRepeatWinning));
    setRepeatWinningMode(
      detectedSnapshot.repeatWinningMode || (detectedSnapshot.allowRepeatWinning ? 'fair_round' : 'none')
    );
    setAcknowledgedRound(detectedSnapshot.acknowledgedRound ?? 1);

    if (detectedSnapshot.settings) {
      if (detectedSnapshot.settings.activityTitle) setActivityTitle(detectedSnapshot.settings.activityTitle);
      if (detectedSnapshot.settings.drawDurationSeconds) setDrawDurationSeconds(detectedSnapshot.settings.drawDurationSeconds);
      if (detectedSnapshot.settings.celebrationEffect) setCelebrationEffect(detectedSnapshot.settings.celebrationEffect);
    }

    setShowRestoreBanner(false);
    soundEffects.playFanfare();
  };

  // Dismiss snapshot recovery banner
  const handleDismissSnapshotBanner = () => {
    setShowRestoreBanner(false);
  };

  // Restore from parsed JSON snapshot data
  const handleRestoreFromJsonData = (data: StorageSnapshotData) => {
    setEmployees(data.employees || []);
    setPrizes(data.prizes || []);
    setWinningRecords(data.winningRecords || []);
    setAbsentRecords(data.absentRecords || []);
    if (data.donationRecords) {
      setDonationRecords(data.donationRecords);
    } else {
      setDonationRecords([]);
    }
    setCurrentPool(data.currentPool || 'main');
    setSelectedPrizeId(data.selectedPrizeId || (data.prizes[0]?.id ?? ''));
    setAllowRepeatWinning(Boolean(data.allowRepeatWinning));
    setRepeatWinningMode(
      data.repeatWinningMode || (data.allowRepeatWinning ? 'fair_round' : 'none')
    );
    setAcknowledgedRound(data.acknowledgedRound ?? 1);

    if (data.settings) {
      if (data.settings.activityTitle) setActivityTitle(data.settings.activityTitle);
      if (data.settings.drawDurationSeconds) setDrawDurationSeconds(data.settings.drawDurationSeconds);
      if (data.settings.celebrationEffect) setCelebrationEffect(data.settings.celebrationEffect);
    }

    triggerAutoSaveSnapshot(
      data.employees,
      data.prizes,
      data.winningRecords,
      data.absentRecords,
      data.currentPool,
      data.selectedPrizeId,
      data.allowRepeatWinning,
      data.settings,
      data.donationRecords || [],
      data.repeatWinningMode,
      data.acknowledgedRound ?? 1
    );
    soundEffects.playFanfare();
    setToastMessage({
      text: `🎉 已成功從 JSON 備份檔還原抽獎狀態！（共復原 ${data.employees.length} 位同仁、${data.prizes.length} 項獎品、${data.winningRecords.length} 筆得獎紀錄）`,
      id: Date.now()
    });
  };

  // Restore from uploaded JSON backup file
  const handleRestoreFromJson = async (file: File) => {
    const data = await parseJsonBackupFile(file);
    if (!data) {
      setToastMessage({
        text: '無法解析該 JSON 檔案，請確認是否為本系統匯出的備份檔。',
        id: Date.now()
      });
      return;
    }
    handleRestoreFromJsonData(data);
  };

  // Open Secure Reset Modal with 'wipe' mode
  const handleSecureWipe = () => {
    handleOpenSecureResetModal('wipe');
  };

  // Open Secure Reset Modal with 'reset-progress' mode
  const handleResetAll = () => {
    handleOpenSecureResetModal('reset-progress');
  };

  // Confirmed Secure Wipe from Modal (after secondary confirmation)
  const handleConfirmSecureWipe = (clearMemoryData: boolean) => {
    clearStorageSnapshot();
    setHasSnapshotSaved(false);
    setShowRestoreBanner(false);
    setDetectedSnapshot(null);
    setAcknowledgedRound(1);
    setIsNextRoundModalOpen(false);

    if (clearMemoryData) {
      setEmployees([]);
      setPrizes([]);
      setWinningRecords([]);
      setAbsentRecords([]);
      setDonationRecords([]);
      setSelectedPrizeId('');
    }

    soundEffects.playTick();
    setToastMessage({
      text: clearMemoryData
        ? '已完全銷毀本機快照與現場同仁個資！系統已重置為純淨初始狀態。'
        : '已成功銷毀所有本機快照！現場個資已自 LocalStorage 徹底清除。',
      id: Date.now()
    });
  };

  // Confirmed Reset Progress from Modal (after secondary confirmation)
  const handleConfirmResetProgress = () => {
    setWinningRecords([]);
    setAbsentRecords([]);
    setDonationRecords([]);
    setAcknowledgedRound(1);
    setIsNextRoundModalOpen(false);
    triggerAutoSaveSnapshot(
      employees,
      prizes,
      [],
      [],
      currentPool,
      selectedPrizeId,
      allowRepeatWinning,
      undefined,
      [],
      repeatWinningMode,
      1
    );
    soundEffects.playTick();
    setToastMessage({
      text: '已成功重設現場抽獎進度！已匯入之同仁名單與獎項設定已完整保留。',
      id: Date.now()
    });
  };

  // Confirmed Factory Reset from Modal (after secondary confirmation)
  const handleConfirmFactoryReset = () => {
    handleConfirmLoadMock();
    setToastMessage({
      text: '已成功重置為系統官方出廠示範環境（50 位跨部門同仁 + 5 項標準獎項）！',
      id: Date.now()
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    exportWinnersToExcel(winningRecords, activityTitle || '中獎名單', absentRecords, donationRecords);
  };

  // Export to CSV (.csv)
  const handleExportCsv = () => {
    exportWinnersToCsv(winningRecords);
  };

  // Download JSON Backup file
  const handleExportJsonBackup = () => {
    const data: StorageSnapshotData = {
      version: '1.0.0',
      savedAt: Date.now(),
      settings: {
        activityTitle,
        drawDurationSeconds,
        celebrationEffect,
      },
      employees,
      prizes,
      winningRecords,
      absentRecords,
      donationRecords,
      currentPool,
      selectedPrizeId,
      allowRepeatWinning,
    };
    downloadStateAsJson(data, 'draw_backup');
  };

  // Sound Mute Toggle
  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundEffects.setMuted(newMuted);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffdfa] via-[#fff5f5] to-[#fef2f2] text-slate-800 flex flex-col relative overflow-x-hidden selection:bg-amber-300 selection:text-slate-900">
      {/* Festive Background Ambient Radiance */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-rose-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-36 right-1/4 w-[500px] h-[350px] bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Crash Recovery Notification Banner */}
      {showRestoreBanner && detectedSnapshot && (
        <div className="bg-gradient-to-r from-amber-100 via-rose-100 to-amber-100 text-slate-800 border-b border-amber-300 px-4 py-2.5 shadow-sm z-40 relative flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-200/60 border border-amber-300 flex items-center justify-center font-bold text-amber-900">
              <RefreshCw className="w-4 h-4 animate-spin-slow text-amber-700" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5 font-display">
                <span>🧧 偵測到未完成的抽獎紀錄</span>
                <span className="text-xs text-amber-800 font-normal">（已開出 {detectedSnapshot.winningRecords.length} 位得獎者，名單 {detectedSnapshot.employees.length} 人）</span>
              </div>
              <div className="text-xs text-slate-600">
                暫存快照時間：{new Date(detectedSnapshot.savedAt).toLocaleString()}。是否回復至當前進度？
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreSnapshot}
              className="festive-gold-btn px-4 py-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              是，立即恢復進度
            </button>
            <button
              onClick={handleDismissSnapshotBanner}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            >
              稍後再說
            </button>
          </div>
        </div>
      )}

      {/* Floating Dynamic Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto animate-bounce-subtle pointer-events-auto">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border-2 border-amber-400 shadow-xl text-slate-800 text-xs sm:text-sm font-bold">
            <HeartHandshake className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
            <span className="flex-1">{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar with Navigation Tabs */}
      <Header
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        totalEmployees={employees.length}
        remainingEmployees={candidates.length}
        totalPrizesQuota={totalPrizesQuota}
        totalWinnersCount={winningRecords.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onEnterProjector={() => setIsProjectorMode(true)}
        hasSnapshot={hasSnapshotSaved}
      />

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* PAGE 1: 現場抽獎舞台 (Focus purely on draw stage) */}
        {currentPage === 'stage' && (
          <div className="space-y-6 animate-fade-in">
            {/* Prize Sequence Ribbon with Pool Switcher */}
            <PrizeSelector
              prizes={prizes}
              selectedPrizeId={selectedPrizeId}
              onSelectPrize={setSelectedPrizeId}
              winningRecords={winningRecords}
              isDrawing={false}
              currentPool={currentPool}
              onSwitchPool={handleSwitchPool}
              isMainPoolCompleted={isMainPoolCompleted}
            />

            {/* Core Draw Interactive Stage with Custom Rhythm & Effects */}
            <DrawStage
              currentPrize={currentPrize}
              candidates={candidates}
              winningRecords={winningRecords}
              donations={donationRecords}
              onAddWinners={handleAddWinners}
              onReplaceAbsentee={handleReplaceAbsentee}
              onDonatePrize={handleDonatePrize}
              allowRepeatWinning={allowRepeatWinning}
              repeatWinningMode={repeatWinningMode}
              currentDrawRound={currentDrawRound}
              onToggleAllowRepeat={handleToggleAllowRepeat}
              onSetRepeatWinningMode={handleSetRepeatWinningMode}
              currentPool={currentPool}
              onSwitchToBonus={() => handleSwitchPool('bonus')}
              isMainPoolCompleted={isMainPoolCompleted}
              onOpenAdditional={() => setIsAdditionalModalOpen(true)}
              onGoToWall={() => setCurrentPage('wall')}
              onGoToAdmin={() => setCurrentPage('admin')}
              onAdjustPrizeQuota={handleAdjustPrizeQuota}
              drawDurationSeconds={drawDurationSeconds}
              celebrationEffect={celebrationEffect}
              activityTitle={activityTitle}
              acknowledgedRound={acknowledgedRound}
              isNextRoundModalOpen={isNextRoundModalOpen}
              onOpenNextRoundModal={handleOpenNextRoundModal}
              onConfirmNextRound={handleConfirmNextRound}
            />

            {/* Quick Stage Status Bar */}
            <div className="rounded-2xl bg-white p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm border border-amber-200 shadow-xs">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="flex items-center gap-1.5 font-bold">
                  <Award className="w-5 h-5 text-rose-600" />
                  目前已誕生 <strong className="font-mono text-rose-700 text-base">{winningRecords.length}</strong> 位得獎幸運兒
                </span>
                {winningRecords.length > 0 && (
                  <span className="text-slate-500 hidden md:inline font-medium">
                    最新中獎：<span className="text-slate-900 font-bold">{winningRecords[0].employeeName}</span> ({winningRecords[0].prizeName})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-goto-wall-bottom"
                  onClick={() => setCurrentPage('wall')}
                  className="festive-gold-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-950" />
                  <span>查看完整中獎星光榜 ➜</span>
                </button>

                <button
                  id="btn-goto-admin-bottom"
                  onClick={() => setCurrentPage('admin')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer text-xs"
                >
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span>活動與節奏設定</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: 中獎星光動態榮譽榜 (Dedicated Winners Wall Page with Table Layout - Requirement 2.3) */}
        {currentPage === 'wall' && (
          <div className="animate-fade-in">
            <WinnersWall
              winners={winningRecords}
              absentees={absentRecords}
              donations={donationRecords}
              prizes={prizes}
              onReplaceAbsentee={handleReplaceAbsentee}
              onDonatePrize={handleDonatePrize}
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onGoToStage={() => setCurrentPage('stage')}
            />
          </div>
        )}

        {/* PAGE 3: 後台管理者頁面 (Admin Panel for Import, Export, Management - Requirement 3.1, 3.2, 3.3) */}
        {currentPage === 'admin' && (
          <div className="animate-fade-in">
            <AdminPanel
              activityTitle={activityTitle}
              onUpdateActivityTitle={handleUpdateActivityTitle}
              drawDurationSeconds={drawDurationSeconds}
              onUpdateDrawDuration={handleUpdateDrawDuration}
              celebrationEffect={celebrationEffect}
              onUpdateCelebrationEffect={handleUpdateCelebrationEffect}
              onOpenSecureReset={handleOpenSecureResetModal}
              employees={employees}
              prizes={prizes}
              winningRecords={winningRecords}
              absentRecords={absentRecords}
              donationRecords={donationRecords}
              onAddPrize={handleAddPrize}
              onUpdatePrize={handleUpdatePrize}
              onDeletePrize={handleDeletePrize}
              onImportComplete={handleImportComplete}
              onImportEmployees={handleImportEmployees}
              onImportPrizes={handleImportPrizes}
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onExportJsonBackup={handleExportJsonBackup}
              onRestoreFromJson={handleRestoreFromJson}
              onRestoreFromJsonData={handleRestoreFromJsonData}
              onLoadMock={handleLoadMock}
              onResetAll={handleResetAll}
              onSecureWipe={handleSecureWipe}
              onManualLocalBackup={handleManualLocalBackup}
              hasSnapshot={hasSnapshotSaved}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-200/80 py-5 text-center text-xs text-slate-500 bg-white/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">🏮</span>
            <span className="font-medium text-slate-700">抽獎系統 • 喜慶年終盛典 • 舞台抽獎 / 星光榮譽榜 / 後台管理中心</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>活動圓滿結束可於後台管理者執行「結束活動清除快照」一鍵銷毀個資</span>
          </div>
        </div>
      </footer>

      {/* Modal: Secure Reset & Wipe Secondary Confirmation Dialog (安全銷毀與系統重設二次確認彈窗) */}
      <SecureResetModal
        isOpen={isSecureResetModalOpen}
        initialMode={secureResetInitialMode}
        onClose={() => setIsSecureResetModalOpen(false)}
        onConfirmWipe={handleConfirmSecureWipe}
        onConfirmResetProgress={handleConfirmResetProgress}
        onConfirmFactoryReset={handleConfirmFactoryReset}
        onExportExcel={handleExportExcel}
        onExportJsonBackup={handleExportJsonBackup}
        employeesCount={employees.length}
        prizesCount={prizes.length}
        winnersCount={winningRecords.length}
        absenteesCount={absentRecords.length}
        donationsCount={donationRecords.length}
        hasSnapshot={hasSnapshotSaved}
      />

      {/* Modal: Additional Draw (現場追加加碼) */}
      <AdditionalDrawModal
        isOpen={isAdditionalModalOpen}
        onClose={() => setIsAdditionalModalOpen(false)}
        onAddAdditionalPrize={handleAddAdditionalPrize}
        existingPrizeCount={prizes.length}
      />

      {/* Modal: Excel Data Import */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        currentEmployeesCount={employees.length}
        currentPrizesCount={prizes.length}
      />

      {/* Fullscreen Big Screen Projector Mode */}
      {isProjectorMode && (
        <ProjectorView
          currentPrize={currentPrize}
          prizes={currentPool === 'bonus' ? bonusPrizes : mainPrizes}
          candidates={candidates}
          winningRecords={winningRecords}
          donations={donationRecords}
          onSelectPrize={setSelectedPrizeId}
          onAddWinners={handleAddWinners}
          onReplaceAbsentee={handleReplaceAbsentee}
          onDonatePrize={handleDonatePrize}
          onExitProjector={() => setIsProjectorMode(false)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          currentPool={currentPool}
          onSwitchPool={handleSwitchPool}
          activityTitle={activityTitle}
          drawDurationSeconds={drawDurationSeconds}
          celebrationEffect={celebrationEffect}
          allowRepeatWinning={allowRepeatWinning}
          repeatWinningMode={repeatWinningMode}
          currentDrawRound={currentDrawRound}
          acknowledgedRound={acknowledgedRound}
          isNextRoundModalOpen={isNextRoundModalOpen}
          onOpenNextRoundModal={handleOpenNextRoundModal}
          onConfirmNextRound={handleConfirmNextRound}
        />
      )}

      {/* Modal: Absentee Redraw Confirmation & Dynamic Slot Animation (確保覆蓋大螢幕) */}
      <AbsenteeRedrawModal
        isOpen={isRedrawModalOpen}
        record={pendingRedrawRecord}
        eligibleCandidates={eligibleCandidatesForReplacement}
        onClose={() => {
          setIsRedrawModalOpen(false);
          setPendingRedrawRecord(null);
          setRedrawCompletedCallback(null);
        }}
        onConfirmRedraw={handleConfirmAbsenteeRedraw}
      />

      {/* Modal: Round Transition & Fair Round Robin Confirmation (平準輪次開啟彈窗 - 確保位於最頂層，涵蓋大螢幕模式) */}
      <RoundTransitionModal
        isOpen={isNextRoundModalOpen}
        completedRound={1}
        nextRound={Math.max(2, currentDrawRound)}
        totalEmployees={employees.length}
        currentPrize={currentPrize}
        currentPrizeRemainingQuota={currentPrizeRemainingQuota}
        onClose={handleCloseNextRoundModal}
        onConfirmNextRound={handleConfirmNextRound}
        onAdjustPrizeQuota={currentPrize ? () => handleAdjustPrizeQuota(currentPrize.id, winningRecords.filter(w => w.prizeId === currentPrize.id).length) : undefined}
        onSwitchToBonus={() => handleSwitchPool('bonus')}
        isReadonly={isNextRoundModalReadonly}
      />
    </div>
  );
}
