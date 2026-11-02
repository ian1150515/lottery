import React, { useState, useRef } from 'react';
import { Employee } from '../types';
import { 
  parseExcelEmployeesWithDiagnostics, 
  parseSmartWorkbook, 
  downloadEmployeeExcelTemplate 
} from '../utils/excelHelper';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Download, 
  X, 
  Plus, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEmployees: (employees: Employee[], mode: 'append' | 'overwrite') => void;
  currentEmployeesCount: number;
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportEmployees,
  currentEmployeesCount,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedEmployees, setParsedEmployees] = useState<Employee[] | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [hasPrizeSheetDetected, setHasPrizeSheetDetected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setParsedEmployees(null);
    setParsedFileName('');
    setErrorMessage(null);
    setWarningMessage(null);
    setHasPrizeSheetDetected(false);
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setWarningMessage(null);
    setHasPrizeSheetDetected(false);
    setIsProcessing(true);

    try {
      // 1. Try specialized employee diagnostic parsing
      const result = await parseExcelEmployeesWithDiagnostics(file);

      if (result.success && result.employees.length > 0) {
        setParsedEmployees(result.employees);
        setParsedFileName(file.name);
        if (result.warnings && result.warnings.length > 0) {
          setWarningMessage(result.warnings.join('；'));
        }
      } else {
        // Fallback: smart workbook parse to see if it's a combined workbook
        const smartResult = await parseSmartWorkbook(file);
        if (smartResult.employees.length > 0) {
          setParsedEmployees(smartResult.employees);
          setParsedFileName(file.name);
          if (smartResult.prizes.length > 0) {
            setHasPrizeSheetDetected(true);
          }
        } else {
          setErrorMessage(
            result.errors.length > 0 
              ? result.errors.join('；') 
              : `未能於檔案「${file.name}」中辨識到有效的員工資料欄位（需包含姓名、員編或部門）。建議下載標準員工範本確認。`
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
    // reset input value so re-uploading same file triggers change
    if (e.target) e.target.value = '';
  };

  const handleConfirmImport = (mode: 'append' | 'overwrite') => {
    if (!parsedEmployees || parsedEmployees.length === 0) return;
    onImportEmployees(parsedEmployees, mode);
    handleClose();
  };

  // Group parsed employees by department for summary
  const deptSummary = (parsedEmployees || []).reduce<Record<string, number>>((acc, emp) => {
    const d = emp.department || '未分配';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

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
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
                  匯入員工名冊 (Excel / CSV)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                  名冊專用
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                目前系統內現有同仁共 <strong className="text-rose-700 font-mono font-bold">{currentEmployeesCount}</strong> 位
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

          {!parsedEmployees ? (
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
                      檔案解析處理中，請稍候...
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-rose-100 group-hover:text-rose-700 transition-all shadow-inner">
                      <FileSpreadsheet className="w-9 h-9" />
                    </div>
                    <div className="text-base font-bold text-slate-800 group-hover:text-rose-700">
                      點擊上傳或拖曳員工名冊 Excel 檔案至此
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
                      支援 <strong>.xlsx、.xls、.csv</strong> 格式。系統智慧容錯欄位抬頭（如：姓名/Name、工號/員編、部門/組別）。
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
                  <span>尚未準備好員工名冊格式？可直接下載官方標準空白範本填寫：</span>
                </div>
                <button
                  type="button"
                  onClick={downloadEmployeeExcelTemplate}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-amber-900 border border-amber-300 rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>下載員工名冊範本 (.xlsx)</span>
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
                    共 {parsedEmployees.length} 位同仁
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
              {hasPrizeSheetDetected && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    💡 偵測到此活頁簿亦包含「獎品清單」，系統已為您自動讀取「員工名冊」。若要匯入獎品，可至「獎項與獎品管理」分頁進行。
                  </span>
                </div>
              )}

              {/* Department Statistics Summary */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>部門分佈（共 {Object.keys(deptSummary).length} 個部門）：</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(deptSummary).map(([dept, count]) => (
                    <span key={dept} className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
                      {dept}：<strong>{count}</strong>人
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>前 {Math.min(parsedEmployees.length, 6)} 筆同仁抽樣預覽：</span>
                  <span className="text-[11px] text-slate-400 font-normal">確認姓名、工號與部門是否正確對應</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-12 text-center font-mono">序號</th>
                        <th className="py-2 px-3 font-mono">員工編號</th>
                        <th className="py-2 px-3">姓名</th>
                        <th className="py-2 px-3">部門單位</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedEmployees.slice(0, 8).map((emp, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/40">
                          <td className="py-1.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-slate-800">{emp.empNo}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="py-1.5 px-3 text-slate-600">{emp.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mode Selection & Import Actions */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border-2 border-amber-300 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>請選擇名冊匯入模式：</span>
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
                        <span>追加合併至現有名冊</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        保留目前已存在的 {currentEmployeesCount} 位同仁，將新名單依工號補入（重複工號自動略過），已有中獎紀錄不受影響。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded self-start">
                      推薦：增補人員
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentEmployeesCount > 0) {
                        if (!window.confirm(`確定以新名冊（${parsedEmployees.length} 人）完全取代現有名冊（${currentEmployeesCount} 人）嗎？`)) {
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
                        <span>完全覆蓋現有名單</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        以本次匯入的 {parsedEmployees.length} 位同仁完全清空取代舊有名單。
                      </p>
                    </div>
                    <span className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded self-start">
                      大會全新開幕初次佈建
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
            支援欄位：部門單位、員工編號、姓名（亦支援英文及大小寫）
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
