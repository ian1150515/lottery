import React, { useState, useRef } from 'react';
import { Employee, Prize } from '../types';
import { 
  parseExcelEmployeesWithDiagnostics,
  parseExcelPrizesWithDiagnostics,
  parseCombinedExcelWithDiagnostics,
  downloadSampleExcelTemplates 
} from '../utils/excelHelper';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  CheckCircle, 
  Download, 
  AlertCircle, 
  ShieldCheck, 
  FileText,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (employees: Employee[], prizes: Prize[]) => void;
  currentEmployeesCount: number;
  currentPrizesCount: number;
}

interface ImportErrorInfo {
  title: string;
  sheetName?: string;
  missingFields?: string[];
  detectedHeaders?: string[];
  details: string[];
  warnings?: string[];
  troubleshooting?: string[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  currentEmployeesCount,
  currentPrizesCount,
}) => {
  const [activeTab, setActiveTab] = useState<'combined' | 'separate'>('combined');
  
  // Staging parsed states
  const [parsedEmployees, setParsedEmployees] = useState<Employee[] | null>(null);
  const [parsedPrizes, setParsedPrizes] = useState<Prize[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ImportErrorInfo | null>(null);
  const [warningList, setWarningList] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const empFileInputRef = useRef<HTMLInputElement>(null);
  const prizeFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetErrors = () => {
    setErrorInfo(null);
    setWarningList([]);
    setStatusMessage(null);
  };

  const handleCombinedFile = async (file: File) => {
    try {
      setIsProcessing(true);
      resetErrors();
      setStatusMessage('正在解析活頁簿中...');

      const result = await parseCombinedExcelWithDiagnostics(file);
      
      if (!result.success || (result.employees.length === 0 && result.prizes.length === 0)) {
        setErrorInfo({
          title: 'Excel 匯入失敗：格式不正確或缺少必要欄位',
          missingFields: result.missingFields.length > 0 ? result.missingFields : ['員工姓名 / 員編', '獎項 / 獎品名稱'],
          details: result.errors.length > 0 ? result.errors : [
            '未在活頁簿中找到符合抽獎規格的資料欄位。',
            '請確認活頁簿內包含員工名單或獎品清單資料。'
          ],
          warnings: result.warnings,
          troubleshooting: [
            '員工名單欄位：【部門】、【員工編號】、【姓名】',
            '獎品清單標準 6 欄位：【獎品圖片】、【獎項】、【獎品名稱】、【數量】、【抽獎規則】、【抽獎方式】',
            '【獎品圖片】支援直接在 Excel 儲存格中插入／貼上圖檔（系統自動解析提取顯示），亦支援填寫公開網址',
            '【抽獎方式】支援填寫：「逐次抽出」（單人滾動揭曉）或「一次抽出」（整批全開）',
            '【抽獎規則】支援填寫：「一人一獎 (排除已中獎者)」或「全員皆可重複中獎」',
            '若使用多工作表，請命名為「員工名單」與「獎品清單」以便精確辨識',
            '若表頭上方有標題說明列，請確認欄位標題位於前 15 列內'
          ],
        });
        setParsedEmployees(null);
        setParsedPrizes(null);
        setStatusMessage(null);
        soundEffects.playRedrawSound();
        return;
      }

      setParsedEmployees(result.employees.length > 0 ? result.employees : null);
      setParsedPrizes(result.prizes.length > 0 ? result.prizes : null);
      setWarningList(result.warnings);

      let msg = '解析成功！';
      if (result.employees.length > 0 && result.prizes.length > 0) {
        msg += `讀取到 ${result.employees.length} 位員工、${result.prizes.length} 個獎項。`;
      } else if (result.employees.length > 0) {
        msg += `讀取到 ${result.employees.length} 位員工名單（未偵測到獎品工作表）。`;
      } else if (result.prizes.length > 0) {
        msg += `讀取到 ${result.prizes.length} 個獎項（未偵測到員工工作表）。`;
      }
      setStatusMessage(msg);
      soundEffects.playFanfare();
    } catch (err) {
      console.error(err);
      setErrorInfo({
        title: '檔案讀取失敗',
        details: ['請確認檔案為有效的 Excel 格式 (.xlsx、.xls 或 .csv)，且未被其他軟體佔用鎖定。'],
        troubleshooting: ['建議重新開啟 Excel 將檔案另存為標準 .xlsx 活頁簿後重新上傳。'],
      });
      soundEffects.playRedrawSound();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmployeesFile = async (file: File) => {
    try {
      setIsProcessing(true);
      resetErrors();
      setStatusMessage('正在讀取員工名單...');

      const result = await parseExcelEmployeesWithDiagnostics(file);

      if (!result.success || result.employees.length === 0) {
        setErrorInfo({
          title: '員工名單匯入失敗：格式不正確或缺少必要欄位',
          sheetName: result.sheetName,
          missingFields: result.missingFields.length > 0 ? result.missingFields : ['姓名', '員編 / 員工編號'],
          detectedHeaders: result.foundHeaders,
          details: result.errors.length > 0 ? result.errors : ['未能在檔案中讀取到任何有效的員工姓名資料。'],
          warnings: result.warnings,
          troubleshooting: [
            '員工名單必須包含【姓名】欄位（支援抬頭：姓名、名字、員工姓名、同仁、Name 等）',
            '強烈建議包含【員編 / 員工編號】欄位以避免同名同姓衝突（支援抬頭：員編、員工編號、工號、ID 等）',
            '可包含【部門 / 單位】欄位（支援抬頭：部門、單位、處、課、Team 等）',
            '若資料列第一列不是標題列，請確認標題列位於前 15 列之內'
          ],
        });
        setParsedEmployees(null);
        setStatusMessage(null);
        soundEffects.playRedrawSound();
        return;
      }

      setParsedEmployees(result.employees);
      setWarningList(result.warnings);
      setStatusMessage(`員工名單解析成功：共載入 ${result.employees.length} 位同仁資料！`);
      soundEffects.playTick();
    } catch (err) {
      console.error(err);
      setErrorInfo({
        title: '員工名單解析發生未預期錯誤',
        details: ['無法解析上傳的檔案內容，請確認檔案格式正確。'],
        troubleshooting: ['請確認檔案為標準 .xlsx 或 .csv 格式。'],
      });
      soundEffects.playRedrawSound();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrizesFile = async (file: File) => {
    try {
      setIsProcessing(true);
      resetErrors();
      setStatusMessage('正在讀取獎品清單...');

      const result = await parseExcelPrizesWithDiagnostics(file);

      if (!result.success || result.prizes.length === 0) {
        setErrorInfo({
          title: '獎品清單匯入失敗：格式不正確或缺少必要欄位',
          sheetName: result.sheetName,
          missingFields: result.missingFields.length > 0 ? result.missingFields : ['獎項', '獎品名稱'],
          detectedHeaders: result.foundHeaders,
          details: result.errors.length > 0 ? result.errors : ['未能在檔案中讀取到任何符合規格的獎品資料。'],
          warnings: result.warnings,
          troubleshooting: [
            '獎品清單標準 6 欄位：【獎品圖片、獎項、獎品名稱、數量、抽獎規則、抽獎方式】',
            '【獎品圖片】：支援直接在 Excel 儲存格內插入／放置圖片（自動直接提取並展示），亦可填入圖片網址或留空',
            '【獎項】：例如 特獎、頭獎、二獎、三獎、普獎、老闆加碼獎',
            '【獎品名稱】：例如 iPhone 16 Pro Max、Dyson 吹風機旗艦組、萬元禮券',
            '【數量】：該獎項抽出幸運得獎名額（整數）',
            '【抽獎規則】：填寫「一人一獎 (排除已中獎者)」或「全員皆可重複中獎」',
            '【抽獎方式】：填寫「逐次抽出」或「一次抽出」',
            '若資料列第一列不是標題列，請確認標題列位於前 15 列之內'
          ],
        });
        setParsedPrizes(null);
        setStatusMessage(null);
        soundEffects.playRedrawSound();
        return;
      }

      setParsedPrizes(result.prizes);
      setWarningList(result.warnings);
      setStatusMessage(`獎品清單解析成功：共載入 ${result.prizes.length} 項獎品資料！`);
      soundEffects.playTick();
    } catch (err) {
      console.error(err);
      setErrorInfo({
        title: '獎品清單解析發生未預期錯誤',
        details: ['無法解析上傳的檔案內容，請確認檔案格式正確。'],
        troubleshooting: ['請確認檔案為標準 .xlsx 或 .csv 格式。'],
      });
      soundEffects.playRedrawSound();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedEmployees || parsedPrizes) {
      onImportComplete(parsedEmployees || [], parsedPrizes || []);
      soundEffects.playFanfare();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display">
              匯入抽獎名冊與獎項 (Excel / CSV)
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                純前端記憶體暫存
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              支援智慧欄位辨識，可使用單檔統合活頁簿或分別匯入名冊
            </p>
          </div>
        </div>

        {/* Tab Switcher & Sample Template Download */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-amber-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('combined');
                resetErrors();
              }}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'combined'
                  ? 'festive-gold-btn shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              單一統合 Excel (推薦)
            </button>
            <button
              onClick={() => {
                setActiveTab('separate');
                resetErrors();
              }}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'separate'
                  ? 'festive-gold-btn shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              分開匯入名單與獎項
            </button>
          </div>

          <button
            onClick={downloadSampleExcelTemplates}
            className="flex items-center gap-1.5 text-xs text-amber-900 hover:text-amber-950 font-bold px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>下載標準 Excel 範本 (.xlsx)</span>
          </button>
        </div>

        {/* Scrollable Main Body */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {/* Upload Dropzones */}
          {activeTab === 'combined' ? (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleCombinedFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragOver
                    ? 'border-rose-500 bg-rose-50/60'
                    : 'border-amber-300 hover:border-rose-400 bg-amber-50/30 hover:bg-amber-50/60'
                }`}
              >
                <Upload className="w-9 h-9 text-rose-600 mb-2" />
                <div className="text-sm font-bold text-slate-800 mb-1">
                  拖曳 Excel 檔案至此，或點擊選取檔案
                </div>
                <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  支援含「員工名單」與「獎品清單」活頁簿，獎品標準 6 欄位：獎品圖片、獎項、獎品名稱、數量、抽獎規則、抽獎方式
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCombinedFile(e.target.files[0]);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Employee Dropzone */}
              <div
                onClick={() => empFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition-all flex flex-col items-center"
              >
                <FileText className="w-7 h-7 text-emerald-600 mb-1.5" />
                <div className="text-xs font-bold text-slate-800">上傳「員工名單」Excel</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  必要欄位：姓名、員編（員工編號）
                </p>
                {parsedEmployees && (
                  <span className="mt-2 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    已載入 {parsedEmployees.length} 筆
                  </span>
                )}
                <input
                  ref={empFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleEmployeesFile(e.target.files[0]);
                    }
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Prize Dropzone */}
              <div
                onClick={() => prizeFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-amber-500 rounded-2xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all flex flex-col items-center"
              >
                <FileSpreadsheet className="w-7 h-7 text-amber-600 mb-1.5" />
                <div className="text-xs font-bold text-slate-800">上傳「獎品清單」Excel</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  格式：獎品圖片、獎項、獎品名稱、數量、抽獎規則、抽獎方式
                </p>
                {parsedPrizes && (
                  <span className="mt-2 text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    已載入 {parsedPrizes.length} 個獎項
                  </span>
                )}
                <input
                  ref={prizeFileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePrizesFile(e.target.files[0]);
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
          )}

          {/* Prominent UI Error Diagnostic Card */}
          {errorInfo && (
            <div 
              id="import-error-banner"
              className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm text-rose-900 space-y-3 animate-fadeIn"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm sm:text-base">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{errorInfo.title}</span>
                </div>
                <button
                  onClick={() => setErrorInfo(null)}
                  className="text-xs text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  關閉提示
                </button>
              </div>

              {errorInfo.missingFields && errorInfo.missingFields.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                    <span>缺少必要欄位：</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {errorInfo.missingFields.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-800 font-mono text-xs font-bold shadow-xs flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {errorInfo.detectedHeaders && errorInfo.detectedHeaders.length > 0 && (
                <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-xs space-y-1">
                  <div className="text-rose-800 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>
                      {errorInfo.sheetName ? `工作表「${errorInfo.sheetName}」` : '檔案'}目前偵測到的表頭欄位：
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {errorInfo.detectedHeaders.map((hdr, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px]"
                      >
                        {hdr || '(空白標題)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {errorInfo.details && errorInfo.details.length > 0 && (
                <div className="text-xs text-rose-800 space-y-1 bg-white p-2.5 rounded-xl border border-rose-200">
                  <div className="font-bold text-rose-900">問題診斷：</div>
                  <ul className="space-y-1 list-disc list-inside text-rose-800">
                    {errorInfo.details.map((detail, idx) => (
                      <li key={idx} className="leading-relaxed">{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errorInfo.troubleshooting && errorInfo.troubleshooting.length > 0 && (
                <div className="text-xs text-slate-700 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="font-bold text-amber-800 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>格式建議與修復指引：</span>
                  </div>
                  <ul className="space-y-0.5 list-disc list-inside text-slate-600 text-[11px]">
                    {errorInfo.troubleshooting.map((tip, idx) => (
                      <li key={idx} className="leading-relaxed">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="text-rose-800 text-[11px]">
                  💡 建議下載標準範本，確認欄位格式後再行上傳。
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (activeTab === 'combined') {
                        fileInputRef.current?.click();
                      } else {
                        empFileInputRef.current?.click();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>重新選取檔案</span>
                  </button>
                  <button
                    onClick={downloadSampleExcelTemplates}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-700" />
                    <span>下載標準範本</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Warnings List */}
          {warningList.length > 0 && !errorInfo && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>匯入注意事項：</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                {warningList.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Status preview banner */}
          {statusMessage && !errorInfo && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-800">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                {statusMessage}
              </span>
              {isProcessing && <span className="animate-spin text-amber-600">⏳</span>}
            </div>
          )}

          {/* Parsed Data Preview */}
          {(parsedEmployees || parsedPrizes) && (
            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              {parsedEmployees && parsedEmployees.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-700">員工預覽 (前 3 筆)：</span>
                    <span className="text-slate-500 text-[11px]">共 {parsedEmployees.length} 位同仁</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parsedEmployees.slice(0, 3).map((emp, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-mono border border-slate-200">
                        {emp.name} ({emp.department} - {emp.empNo})
                      </span>
                    ))}
                    {parsedEmployees.length > 3 && (
                      <span className="text-slate-400 self-center text-xs">等共 {parsedEmployees.length} 筆</span>
                    )}
                  </div>
                </div>
              )}

              {parsedPrizes && parsedPrizes.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800">獎項預覽 (前 3 筆)：</span>
                    <span className="text-slate-500 text-[11px]">共 {parsedPrizes.length} 個獎項</span>
                  </div>
                  <div className="space-y-1.5 mt-1.5">
                    {parsedPrizes.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-950 border border-amber-200 text-xs">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-7 h-7 rounded-lg object-cover border border-amber-300 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-amber-200/50 flex items-center justify-center text-[10px] text-amber-800 font-bold shrink-0">無圖</div>
                        )}
                        <span className="font-bold text-rose-800 whitespace-nowrap bg-rose-100/70 px-2 py-0.5 rounded-md border border-rose-200 shrink-0" title="獎項階級">
                          {p.name}
                        </span>
                        <span className="truncate text-slate-900 font-bold" title={`獎品名稱：${p.content}`}>
                          {p.content}
                        </span>
                        <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-200/60 font-mono font-bold text-amber-900 whitespace-nowrap">{p.quota}名</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold whitespace-nowrap">
                          {p.drawMethod === 'batch' ? '一次抽出' : '逐次抽出'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold whitespace-nowrap hidden sm:inline">
                          {p.drawRule || (p.allowRepeat ? '全員皆可重複' : '一人一獎')}
                        </span>
                      </div>
                    ))}
                    {parsedPrizes.length > 3 && (
                      <div className="text-slate-400 text-center text-xs pt-0.5">等共 {parsedPrizes.length} 個獎項</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 shrink-0">
          <div className="text-[11px] text-slate-500">
            目前記憶體已有：{currentEmployeesCount} 位員工、{currentPrizesCount} 個獎項
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              取消
            </button>
            <button
              id="btn-confirm-import"
              disabled={(!parsedEmployees || parsedEmployees.length === 0) && (!parsedPrizes || parsedPrizes.length === 0)}
              onClick={handleConfirmImport}
              className="festive-primary-btn flex items-center gap-2 px-5 py-2 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>確認載入記憶體</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
