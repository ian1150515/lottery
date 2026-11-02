import React, { useState, useMemo } from 'react';
import { WinningRecord, AbsentRecord, DonationRecord, Prize } from '../types';
import { 
  Trophy, 
  Search, 
  Download, 
  Sparkles, 
  UserX, 
  RotateCcw, 
  Clock, 
  Filter, 
  Flame, 
  ArrowUpDown, 
  Building2, 
  UserCheck, 
  Layers, 
  List, 
  CheckCircle2, 
  Gift, 
  HeartHandshake 
} from 'lucide-react';
import { DonatePrizeModal } from './DonatePrizeModal';
import { Mascot } from './Mascot';
import { GoldIngot, RedPacket, SparkleStar } from './FestiveIllustrations';

interface WinnersWallProps {
  winners: WinningRecord[];
  absentees: AbsentRecord[];
  donations?: DonationRecord[];
  prizes: Prize[];
  onReplaceAbsentee: (record: WinningRecord | string, reason?: string) => void;
  onDonatePrize?: (record: WinningRecord, options?: { note?: string }) => void;
  onExportExcel: () => void;
  onExportCsv?: () => void;
  onGoToStage?: () => void;
  currentDrawRound?: number;
  allowRepeatWinning?: boolean;
  repeatWinningMode?: import('../types').RepeatWinningMode;
}

export const WinnersWall: React.FC<WinnersWallProps> = ({
  winners,
  absentees,
  donations = [],
  prizes,
  onReplaceAbsentee,
  onDonatePrize,
  onExportExcel,
  onExportCsv,
  onGoToStage,
  currentDrawRound = 1,
  allowRepeatWinning = true,
  repeatWinningMode = 'fair_round',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrizeFilter, setSelectedPrizeFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<'winners' | 'donations' | 'absentees'>('winners');
  const [displayMode, setDisplayMode] = useState<'grouped' | 'flat'>('grouped');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDonationRecord, setSelectedDonationRecord] = useState<WinningRecord | null>(null);
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

  // Map of prize id to prize object
  const prizeMap = useMemo(() => {
    return new Map(prizes.map(p => [p.id, p]));
  }, [prizes]);

  // Filtered winners based on search and dropdown
  const filteredWinners = useMemo(() => {
    return winners.filter(record => {
      const matchesSearch = 
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.prizeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.prizeContent.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPrize = selectedPrizeFilter === 'all' || record.prizeId === selectedPrizeFilter;

      return matchesSearch && matchesPrize;
    });
  }, [winners, searchTerm, selectedPrizeFilter]);

  // Filtered absentees
  const filteredAbsentees = useMemo(() => {
    return absentees.filter(record => {
      return (
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.prizeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [absentees, searchTerm]);

  // Process flat table data with stable chronological sequence
  const tableData = useMemo(() => {
    const indexed = filteredWinners.map((record) => {
      const originalIndex = winners.findIndex(w => w.id === record.id);
      const chronologicalSeq = winners.length - originalIndex;
      return {
        ...record,
        seqNo: chronologicalSeq,
      };
    });

    if (sortOrder === 'asc') {
      return indexed.sort((a, b) => a.seqNo - b.seqNo);
    } else {
      return indexed.sort((a, b) => b.seqNo - a.seqNo);
    }
  }, [filteredWinners, winners, sortOrder]);

  // Group winners by prize classification
  const groupedWinners = useMemo(() => {
    const groups: {
      prizeId: string;
      prizeName: string;
      prizeContent: string;
      prizeImage?: string;
      quota: number;
      isAdditional: boolean;
      poolType: 'main' | 'bonus';
      order: number;
      records: Array<WinningRecord & { seqNo: number }>;
    }[] = [];

    const recordedPrizeIds = new Set<string>();

    prizes.forEach(prize => {
      recordedPrizeIds.add(prize.id);
      const matched = tableData.filter(r => r.prizeId === prize.id);
      if (selectedPrizeFilter === 'all' || selectedPrizeFilter === prize.id) {
        if (matched.length > 0 || (searchTerm === '' && selectedPrizeFilter === prize.id)) {
          groups.push({
            prizeId: prize.id,
            prizeName: prize.name,
            prizeContent: prize.content,
            prizeImage: prize.image,
            quota: prize.quota,
            isAdditional: Boolean(prize.isAdditional),
            poolType: prize.poolType || 'main',
            order: prize.order ?? 999,
            records: matched,
          });
        }
      }
    });

    tableData.forEach(record => {
      if (!recordedPrizeIds.has(record.prizeId)) {
        recordedPrizeIds.add(record.prizeId);
        const matched = tableData.filter(r => r.prizeId === record.prizeId);
        groups.push({
          prizeId: record.prizeId,
          prizeName: record.prizeName,
          prizeContent: record.prizeContent,
          prizeImage: record.prizeImage,
          quota: matched.length,
          isAdditional: Boolean(record.isAdditional),
          poolType: record.poolType || 'main',
          order: 9999,
          records: matched,
        });
      }
    });

    return groups;
  }, [prizes, tableData, selectedPrizeFilter, searchTerm]);

  return (
    <section className="w-full rounded-3xl bg-white border border-amber-300/80 p-5 sm:p-7 shadow-[0_12px_36px_-6px_rgba(225,29,72,0.08),0_4px_16px_rgba(0,0,0,0.04)] space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-amber-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Mascot state="celebrate" size={38} className="shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              中獎星光榜 • 榮譽獲獎名冊
            </h2>
            <span className="text-xs sm:text-sm px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold">
              累計已抽出 {winners.length} 位
            </span>
          </div>
         
        </div>

        {/* Action Controls & Tab Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch between winners, donations and absentees */}
          <div className="flex items-center bg-amber-50/80 p-1 rounded-xl border border-amber-200/80 text-xs sm:text-sm">
            <button
              onClick={() => setActiveView('winners')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeView === 'winners'
                  ? 'festive-primary-btn shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              中獎名冊 ({winners.length})
            </button>
            <button
              onClick={() => setActiveView('donations')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeView === 'donations'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span>愛心捐出 ({donations.length})</span>
            </button>
            <button
              onClick={() => setActiveView('absentees')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeView === 'absentees'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>缺席放棄紀錄 ({absentees.length})</span>
            </button>
          </div>

          {/* Export Excel button */}
          <button
            onClick={onExportExcel}
            className="festive-emerald-btn flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            title="匯出完整中獎名冊 Excel 檔"
          >
            <Download className="w-4 h-4 text-white" />
            <span>匯出 Excel (.xlsx)</span>
          </button>

          {/* Export CSV button */}
          {onExportCsv && (
            <button
              id="btn-export-csv-wall"
              onClick={onExportCsv}
              className="festive-gold-btn flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
              title="匯出 UTF-8 格式 CSV 中獎名冊"
            >
              <Download className="w-4 h-4" />
              <span>匯出 CSV</span>
            </button>
          )}

          {/* Return to Draw Stage */}
          {onGoToStage && (
            <button
              id="btn-return-stage-from-wall"
              onClick={onGoToStage}
              className="festive-secondary-btn flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>返回抽獎舞台 ➜</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter, Search & View Mode Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-amber-50/60 p-3 rounded-2xl border border-amber-200/70">
        {/* Search field */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋員工編號、姓名、部門單位或獎項名稱..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-amber-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
          />
        </div>

        {/* View Mode Toggle: Grouped by Prize vs Flat Table */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-amber-200 text-xs sm:text-sm self-stretch md:self-auto justify-center">
          <button
            onClick={() => setDisplayMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              displayMode === 'grouped'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="依獎項分類分組顯示"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>依獎項分類</span>
          </button>
          <button
            onClick={() => setDisplayMode('flat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              displayMode === 'flat'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="全部獲獎名單連續表格"
          >
            <List className="w-3.5 h-3.5" />
            <span>全名冊清單</span>
          </button>
        </div>

        {/* Prize Filter & Sort Toggle */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-amber-200 flex-1 md:flex-none">
            <Filter className="w-4 h-4 text-amber-600" />
            <select
              value={selectedPrizeFilter}
              onChange={(e) => setSelectedPrizeFilter(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-slate-700 focus:outline-none cursor-pointer w-full"
            >
              <option value="all">全部獎項級距</option>
              {prizes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isAdditional ? '(加碼)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-amber-200 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 cursor-pointer transition-all whitespace-nowrap"
            title="切換流水號排序"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
            <span>項次：{sortOrder === 'asc' ? '由小到大 ↑' : '最新居首 ↓'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeView === 'winners' ? (
        winners.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-amber-200 rounded-3xl bg-amber-50/40 flex flex-col items-center justify-center">
            <Mascot
              state="empty"
              size={96}
              speechText="尚無中獎紀錄，快去舞台抽獎吧！"
              speechSide="top"
              className="mb-3"
            />
            <div className="text-base sm:text-lg font-bold text-slate-800">目前尚未抽出任何得獎者</div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              可點擊上方「返回抽獎舞台」開始抽獎，中獎名單將即時分類呈現在星光榮譽榜！
            </p>
          </div>
        ) : filteredWinners.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 border border-amber-200 rounded-2xl bg-amber-50/30">
            無符合「{searchTerm}」條件的中獎紀錄
          </div>
        ) : displayMode === 'grouped' ? (
          /* Grouped by Prize Classification View */
          <div className="space-y-6">
            {groupedWinners.map(group => {
              const prizeObj = prizeMap.get(group.prizeId);
              const isBonus = group.poolType === 'bonus' || group.isAdditional;
              const hasCompleted = group.records.length >= group.quota && group.quota > 0;

              return (
                <div 
                  key={group.prizeId}
                  className="rounded-2xl border border-amber-200/90 bg-white shadow-xs overflow-hidden transition-all hover:border-amber-400"
                >
                  {/* Prize Category Header Card */}
                  <div className="bg-gradient-to-r from-rose-50 via-amber-50/60 to-rose-50 p-4 sm:px-6 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {(group.prizeImage || prizeObj?.image) && (
                        <img 
                          src={group.prizeImage || prizeObj?.image} 
                          alt={group.prizeName}
                          className="w-12 h-12 rounded-xl object-cover border border-amber-300 shadow-xs flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-black text-rose-950 font-display">
                            {group.prizeName}
                          </h3>
                          {isBonus && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                              <Flame className="w-3 h-3 text-yellow-200" /> 加碼獎池
                            </span>
                          )}
                          {hasCompleted ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 全數開出
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-mono">
                              名額 {group.records.length} / {group.quota}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
                          獎品內容：<strong className="text-rose-700">{group.prizeContent}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Badge showing count */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-xs text-slate-500">
                        本獎中獎人數：
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-white border border-amber-300 text-rose-700 font-mono font-black text-sm sm:text-base shadow-xs">
                        {group.records.length} 位
                      </span>
                    </div>
                  </div>

                  {/* Prize Table of Winners */}
                  {group.records.length === 0 ? (
                    <div className="p-6 text-center text-xs sm:text-sm text-slate-400 bg-slate-50/50 italic">
                      此獎項尚未抽出中獎者
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-800 border-collapse">
                        <thead className="bg-amber-50/50 text-slate-600 text-xs font-bold uppercase border-b border-amber-100">
                          <tr>
                            <th scope="col" className="py-3 px-4 sm:px-5 font-mono text-center w-20">項次</th>
                            <th scope="col" className="py-3 px-4 sm:px-5 font-mono">員編</th>
                            <th scope="col" className="py-3 px-4 sm:px-5">部門單位</th>
                            <th scope="col" className="py-3 px-4 sm:px-5 font-bold">中獎人（姓名）</th>
                            <th scope="col" className="py-3 px-4 sm:px-5 text-center hidden md:table-cell">中獎時間</th>
                            <th scope="col" className="py-3 px-4 sm:px-5 text-center w-48">獎項處置 / 重抽</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {group.records.map((record) => {
                            const timeStr = new Date(record.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            });

                            return (
                              <tr 
                                key={record.id} 
                                className="hover:bg-amber-50/40 transition-colors group"
                              >
                                <td className="py-3 px-4 sm:px-5 text-center font-mono font-bold text-slate-600 text-sm">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 border border-amber-200 text-amber-900 text-xs sm:text-sm">
                                    {record.seqNo}
                                  </span>
                                </td>

                                <td className="py-3 px-4 sm:px-5 font-mono font-bold text-slate-700 text-sm">
                                  {record.employeeNo}
                                </td>

                                <td className="py-3 px-4 sm:px-5 text-slate-700 font-medium">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    {record.department}
                                  </span>
                                </td>

                                <td className="py-3 px-4 sm:px-5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                                      {record.employeeName}
                                    </span>
                                    {record.replacesAbsenteeId && (
                                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        補抽得獎
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4 sm:px-5 text-center text-xs text-slate-500 font-mono hidden md:table-cell">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {timeStr}
                                  </span>
                                </td>

                                <td className="py-3 px-4 sm:px-5 text-center">
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    {onDonatePrize && (
                                      <button
                                        id={`btn-donate-grouped-${record.id}`}
                                        onClick={() => {
                                          setSelectedDonationRecord(record);
                                          setIsDonateModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs cursor-pointer whitespace-nowrap"
                                        title="同仁好意捐出獎項（立即釋出名額供現場重新抽獎）"
                                      >
                                        <Gift className="w-3 h-3 text-amber-600" />
                                        <span>獎項捐出</span>
                                      </button>
                                    )}
                                    <button
                                      id={`btn-redraw-grouped-${record.id}`}
                                      onClick={() => onReplaceAbsentee(record, '現場確認未到場領取')}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs cursor-pointer whitespace-nowrap"
                                      title="確認放棄並啟動重抽"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>缺席重抽</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat Table Presentation */
          <div className="overflow-hidden rounded-2xl border border-amber-200/90 shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800 border-collapse">
                <thead className="bg-amber-50/80 text-amber-950 uppercase text-xs sm:text-sm font-bold border-b border-amber-200">
                  <tr>
                    <th scope="col" className="py-3.5 px-4 sm:px-5 font-mono text-center w-24">
                      項次
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-5 font-mono">
                      員編
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-5">
                      部門單位
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-5 font-bold">
                      中獎人（姓名）
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-5">
                      中獎獎項與內容
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-5 text-center hidden md:table-cell">
                      中獎時間
                    </th>
                    <th scope="col" className="py-3.5 px-4 sm:px-5 text-center w-48">
                      獎項處置 / 重抽
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-sans">
                  {tableData.map((record) => {
                    const timeStr = new Date(record.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    });
                    const prizeObj = prizeMap.get(record.prizeId);
                    const isBonus = record.poolType === 'bonus' || record.isAdditional;

                    return (
                      <tr 
                        key={record.id} 
                        className="hover:bg-amber-50/40 transition-colors group"
                      >
                        <td className="py-3.5 px-4 sm:px-5 text-center font-mono font-bold text-slate-700 text-sm sm:text-base">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 border border-amber-200 text-amber-900">
                            {record.seqNo}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-slate-700 text-sm sm:text-base">
                          {record.employeeNo}
                        </td>

                        <td className="py-3.5 px-4 sm:px-5 text-slate-700 font-medium">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {record.department}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 sm:px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                              {record.employeeName}
                            </span>
                            {record.replacesAbsenteeId && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                補抽得獎
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 sm:px-5">
                          <div className="flex items-center gap-2.5">
                            {prizeObj?.image && (
                              <img 
                                src={prizeObj.image} 
                                alt={record.prizeName}
                                className="w-9 h-9 rounded-lg object-cover border border-amber-200 shadow-xs flex-shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div>
                              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                                <span>{record.prizeName}</span>
                                {isBonus && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-white">
                                    <Flame className="w-2.5 h-2.5 text-yellow-200" /> 加碼
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                                {record.prizeContent}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 sm:px-5 text-center text-xs text-slate-500 font-mono hidden md:table-cell">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {timeStr}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 sm:px-5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {onDonatePrize && (
                              <button
                                id={`btn-donate-table-${record.id}`}
                                onClick={() => {
                                  setSelectedDonationRecord(record);
                                  setIsDonateModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs cursor-pointer whitespace-nowrap"
                                title="同仁好意捐出獎項（立即釋出名額供現場重新抽獎）"
                              >
                                <Gift className="w-3 h-3 text-amber-600" />
                                <span>獎項捐出</span>
                              </button>
                            )}
                            <button
                              id={`btn-redraw-table-${record.id}`}
                              onClick={() => onReplaceAbsentee(record, '現場確認未到場領取')}
                              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-xs cursor-pointer whitespace-nowrap"
                              title="確認放棄並啟動重抽"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>缺席重抽</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer summary bar */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span>目前顯示</span>
                <strong className="text-slate-900 font-mono font-bold text-sm">{filteredWinners.length}</strong>
                <span>筆中獎記錄（共 {winners.length} 筆）</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                💡 欄位包含：項次流水號、員編、部門單位、中獎人姓名、獎項內容、捐出與缺席處置
              </div>
            </div>
          </div>
        )
      ) : activeView === 'donations' ? (
        /* Donations List */
        donations.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-amber-200 rounded-3xl bg-amber-50/40 text-sm text-slate-600 flex flex-col items-center justify-center">
            <Mascot
              state="donated"
              size={80}
              speechText="期待熱心同仁愛心捐出加碼！❤️"
              speechSide="top"
              className="mb-2"
            />
            <div className="font-bold text-slate-800">目前尚無同仁愛心捐出紀錄</div>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              若同仁現場好意將獎品捐出，點擊各獎項旁「獎項捐出」即可釋出名額並供現場重抽！
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-amber-200/90 shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800 border-collapse">
                <thead className="bg-amber-50/80 text-amber-950 uppercase text-xs sm:text-sm font-bold border-b border-amber-200">
                  <tr>
                    <th className="py-3 px-4 text-center w-20">項次</th>
                    <th className="py-3 px-4 font-mono">員編</th>
                    <th className="py-3 px-4">部門單位</th>
                    <th className="py-3 px-4">愛心捐出同仁</th>
                    <th className="py-3 px-4">原中獎獎項</th>
                    <th className="py-3 px-4">處置去向</th>
                    <th className="py-3 px-4 text-center">捐出時間</th>
                    <th className="py-3 px-4">備註說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {donations.map((item, idx) => {
                    const timeStr = new Date(item.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    });

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                          {item.employeeNo}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {item.department}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-amber-600" />
                          <span>{item.employeeName}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-800">
                          <div className="font-bold">{item.prizeName}</div>
                          <div className="text-xs text-slate-500">{item.prizeContent}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                              <RotateCcw className="w-3 h-3 text-amber-600" />
                              當前獎項名額釋出重抽
                            </span>
                            <span className="block text-[10px] text-slate-500 font-medium">
                              {allowRepeatWinning && repeatWinningMode === 'fair_round'
                                ? currentDrawRound >= 2
                                  ? '🎉 第 2 輪已全面解鎖重返候選池（本輪上限 1 次）'
                                  : '※ 第 1 輪保護期排除 • 第 2 輪平準抽獎時自動解鎖重抽（上限 1 次）'
                                : '※ 捐出同仁已標記，不可再抽該獎池其他獎品'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-500">
                          {timeStr}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {item.note || '愛心同仁好意捐出'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Banner guidance */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-700 font-bold">💡 獎項捐出規則說明：</span>
                <span>
                  {allowRepeatWinning && repeatWinningMode === 'fair_round'
                    ? '同仁捐出之獎項已自該獎項釋出名額供現場重抽；第一輪保護未獲獎同仁，第二輪平準抽獎將自動全員解鎖（含捐出者）享有上限 1 份抽獎機會！'
                    : '同仁捐出之獎項已自該獎項扣除中獎席位並釋出名額；系統已自動標記捐出同仁，不可再參與該獎池之其他獎項抽獎！'}
                </span>
              </div>
              <div className="text-rose-700 font-mono font-bold">
                累計捐出：{donations.length} 份獎項
              </div>
            </div>
          </div>
        )
      ) : (
        /* Absentee / Waived list */
        absentees.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-emerald-200 rounded-3xl bg-emerald-50/40 text-sm text-slate-600">
            <UserCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <div className="font-bold text-emerald-800">目前無任何缺席棄權紀錄</div>
            <p className="text-xs text-slate-500 mt-1">所有得獎同仁皆已順利受獎確認！</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-rose-200 shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800 border-collapse">
                <thead className="bg-rose-50 text-rose-900 uppercase text-xs sm:text-sm font-bold border-b border-rose-200">
                  <tr>
                    <th className="py-3 px-4 text-center w-16">項次</th>
                    <th className="py-3 px-4 font-mono">員編</th>
                    <th className="py-3 px-4">部門單位</th>
                    <th className="py-3 px-4">原中獎人姓名</th>
                    <th className="py-3 px-4">原中獎獎項</th>
                    <th className="py-3 px-4">棄權所屬專區</th>
                    <th className="py-3 px-4">獎池資格影響</th>
                    <th className="py-3 px-4">放棄原因 / 備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredAbsentees.map((item, idx) => {
                    const prize = prizeMap.get(item.prizeId);
                    const isBonus = item.poolType ? item.poolType === 'bonus' : (prize?.poolType === 'bonus' || prize?.isAdditional);

                    return (
                      <tr key={item.id} className="hover:bg-rose-50/30">
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                          {item.employeeNo}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {item.department}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-400 line-through decoration-rose-500">
                          {item.employeeName}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-bold">
                          {item.prizeName}
                        </td>
                        <td className="py-3 px-4">
                          {isBonus ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              現場加碼專區
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              正規獎項專區
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium">
                          {isBonus ? (
                            <span className="text-slate-500">加碼池排除抽獎</span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {allowRepeatWinning && repeatWinningMode === 'fair_round' ? (
                                currentDrawRound >= 2 ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    <span>第 2 輪已全面解鎖重返候選池（上限 1 次）</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-600">
                                    第 1 輪保護期排除 • <strong className="text-emerald-700">第 2 輪自動解鎖再抽（上限 1 次）</strong>
                                  </span>
                                )
                              ) : (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <span>正規池排除</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-purple-700 underline decoration-purple-300">加碼池仍具完整資格</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-rose-700">
                          <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 font-medium">
                            {item.reason}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 獎項捐出確認彈窗 */}
      <DonatePrizeModal
        isOpen={isDonateModalOpen}
        winner={selectedDonationRecord}
        prize={selectedDonationRecord ? prizeMap.get(selectedDonationRecord.prizeId) : undefined}
        onClose={() => {
          setIsDonateModalOpen(false);
          setSelectedDonationRecord(null);
        }}
        onConfirmDonate={(options) => {
          if (selectedDonationRecord && onDonatePrize) {
            onDonatePrize(selectedDonationRecord, options);
          }
          setIsDonateModalOpen(false);
          setSelectedDonationRecord(null);
        }}
        isBonusPool={selectedDonationRecord?.poolType === 'bonus' || selectedDonationRecord?.isAdditional}
      />
    </section>
  );
};
