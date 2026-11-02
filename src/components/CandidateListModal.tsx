import React, { useState, useMemo } from 'react';
import { Employee } from '../types';
import { Users, Search, CheckCircle2, ShieldCheck, HeartHandshake, UserX, X, Sparkles, Filter } from 'lucide-react';

interface CandidateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Employee[];
  allEmployees: Employee[];
  winCounts: Map<string, number>;
  currentRound: number;
  absentEmpIds: Set<string>;
  donatedEmpIds: Set<string>;
  currentPool: 'main' | 'bonus';
  activityTitle?: string;
}

export const CandidateListModal: React.FC<CandidateListModalProps> = ({
  isOpen,
  onClose,
  candidates,
  allEmployees,
  winCounts,
  currentRound,
  absentEmpIds,
  donatedEmpIds,
  currentPool,
  activityTitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in_pool' | 'absent_unlocked' | 'donated_unlocked' | 'capped'>('all');

  const candidateIdSet = useMemo(() => new Set(candidates.map(c => c.id)), [candidates]);

  const detailedList = useMemo(() => {
    return allEmployees.map(emp => {
      const wins = winCounts.get(emp.id) || 0;
      const isInPool = candidateIdSet.has(emp.id);
      const isAbsent = absentEmpIds.has(emp.id);
      const isDonated = donatedEmpIds.has(emp.id);
      
      let statusTag: { label: string; bg: string; text: string; border: string; desc: string };

      if (isInPool) {
        if (isAbsent) {
          statusTag = {
            label: '缺席解鎖候選',
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-200',
            desc: `第 1 輪缺席，第 ${currentRound} 輪已全面解鎖重返候選池（本輪上限 1 次）`,
          };
        } else if (isDonated) {
          statusTag = {
            label: '捐出解鎖候選',
            bg: 'bg-amber-50',
            text: 'text-amber-800',
            border: 'border-amber-200',
            desc: `第 1 輪捐出，第 ${currentRound} 輪已全面解鎖重返候選池（本輪上限 1 次）`,
          };
        } else {
          statusTag = {
            label: '合格候選中',
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            desc: `目前具備抽獎資格（已得 ${wins} 份，本輪上限 ${currentRound} 次）`,
          };
        }
      } else {
        if (isAbsent && currentRound === 1) {
          statusTag = {
            label: '第1輪排除(缺席)',
            bg: 'bg-slate-100',
            text: 'text-slate-500',
            border: 'border-slate-300',
            desc: '第 1 輪缺席棄權，第 2 輪平準抽獎時將自動解鎖重返獎池',
          };
        } else if (isDonated && currentRound === 1) {
          statusTag = {
            label: '第1輪排除(捐出)',
            bg: 'bg-slate-100',
            text: 'text-slate-500',
            border: 'border-slate-300',
            desc: '第 1 輪愛心捐出，第 2 輪平準抽獎時將自動解鎖重返獎池',
          };
        } else {
          statusTag = {
            label: '已達本輪上限',
            bg: 'bg-slate-100',
            text: 'text-slate-600',
            border: 'border-slate-200',
            desc: `已獲獎 ${wins} 次，已達第 ${currentRound} 輪上限，待下一輪開放`,
          };
        }
      }

      return {
        ...emp,
        wins,
        isInPool,
        isAbsent,
        isDonated,
        statusTag,
      };
    });
  }, [allEmployees, winCounts, candidateIdSet, absentEmpIds, donatedEmpIds, currentRound]);

  const filteredList = useMemo(() => {
    return detailedList.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.empNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'in_pool') return item.isInPool;
      if (filterType === 'absent_unlocked') return item.isAbsent;
      if (filterType === 'donated_unlocked') return item.isDonated;
      if (filterType === 'capped') return !item.isInPool;
      return true;
    });
  }, [detailedList, searchTerm, filterType]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-modal-title"
    >
      <div className="relative w-full max-w-3xl bg-white border-2 border-amber-300 rounded-3xl shadow-2xl overflow-hidden text-slate-800 ring-4 ring-amber-200/50 max-h-[90vh] flex flex-col">
        {/* Top Gradient Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-amber-400 via-rose-500 to-amber-400 shrink-0" />

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/60 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="candidate-modal-title" className="text-lg sm:text-xl font-black text-slate-900 font-display">
                  即時抽籤候選名冊檢視
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  第 {currentRound} 輪抽獎
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  {currentPool === 'bonus' ? '加碼專區' : '正規專區'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                目前抽籤池內合格同仁共 <strong className="text-emerald-700 font-mono font-bold">{candidates.length}</strong> 人（全體名冊共 {allEmployees.length} 人）
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            title="關閉視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋姓名、工號、部門..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              全部 ({detailedList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('in_pool')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'in_pool'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>池內候選 ({candidates.length})</span>
            </button>
            {absentEmpIds.size > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('absent_unlocked')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'absent_unlocked'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>缺席同仁 ({absentEmpIds.size})</span>
              </button>
            )}
            {donatedEmpIds.size > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('donated_unlocked')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'donated_unlocked'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>捐出同仁 ({donatedEmpIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Candidate List Table */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              無符合篩選條件的同仁資料
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5 w-16 text-center">序號</th>
                    <th className="py-2.5 px-3.5 font-mono">員編</th>
                    <th className="py-2.5 px-3.5">姓名</th>
                    <th className="py-2.5 px-3.5">部門單位</th>
                    <th className="py-2.5 px-3.5 text-center">已得獎數</th>
                    <th className="py-2.5 px-3.5 text-center">本輪資格狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={`transition-colors ${
                        emp.isInPool ? 'hover:bg-amber-50/50' : 'bg-slate-50/60 opacity-60'
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700">
                        {emp.empNo}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {emp.isAbsent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-300 font-semibold">
                              曾缺席
                            </span>
                          )}
                          {emp.isDonated && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                              曾捐出
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-mono font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          emp.wins > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {emp.wins} 份
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${emp.statusTag.bg} ${emp.statusTag.text} ${emp.statusTag.border}`}
                          title={emp.statusTag.desc}
                        >
                          {emp.isInPool && <Sparkles className="w-3 h-3" />}
                          {emp.statusTag.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              💡 <strong>平準輪次規則</strong>：第 1 輪未獲獎同仁優先；第 2 輪全員（含第 1 輪缺席與捐出者）全面解鎖再抽，每人限中 1 次。
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all text-xs"
          >
            關閉檢視
          </button>
        </div>
      </div>
    </div>
  );
};
