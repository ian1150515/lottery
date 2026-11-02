import * as XLSX from 'xlsx';
import { Employee, Prize, WinningRecord, AbsentRecord, DonationRecord } from '../types';
import { extractImagesFromExcel, findMatchingImageForPrize, ExtractedExcelImage } from './excelImageExtractor';

/**
 * Normalizes string keys for flexible column header matching
 */
function normalizeStr(str: unknown): string {
  if (str == null) return '';
  return String(str).trim().toLowerCase().replace(/[\s\-_]+/g, '');
}

export interface SheetDiagnostic {
  sheetName: string;
  totalRows: number;
  headerRowIndex: number;
  foundHeaders: string[];
  matchedEmployeeColumns: {
    nameCol?: number;
    nameHeader?: string;
    empNoCol?: number;
    empNoHeader?: string;
    deptCol?: number;
    deptHeader?: string;
  };
  matchedPrizeColumns: {
    imageCol?: number;
    imageHeader?: string;
    prizeNameCol?: number;
    prizeNameHeader?: string;
    contentCol?: number;
    contentHeader?: string;
    quotaCol?: number;
    quotaHeader?: string;
    ruleCol?: number;
    ruleHeader?: string;
    methodCol?: number;
    methodHeader?: string;
  };
  missingEmployeeHeaders: string[]; // e.g. ['姓名', '員工編號 / 工號']
  missingPrizeHeaders: string[]; // e.g. ['獎項名稱 / 獎品內容']
  blankNameCount: number;
  extractedEmployeesCount: number;
  extractedPrizesCount: number;
}

export interface ParseResult {
  employees: Employee[];
  prizes: Prize[];
  sheetNames: string[];
  totalRowsScanned: number;
  detectedDetails: string[];
  sheetDiagnostics: SheetDiagnostic[];
  errors: string[];
  warnings: string[];
}

export interface EmployeeValidationResult {
  success: boolean;
  employees: Employee[];
  errors: string[];
  warnings: string[];
  missingFields: string[]; // e.g. ['姓名', '員工編號 / 工號']
  foundHeaders: string[];
  sheetName: string;
  totalRows: number;
}

export interface PrizeValidationResult {
  success: boolean;
  prizes: Prize[];
  errors: string[];
  warnings: string[];
  missingFields: string[]; // e.g. ['獎項名稱 / 獎品內容']
  foundHeaders: string[];
  sheetName: string;
  totalRows: number;
}

export interface CombinedValidationResult {
  success: boolean;
  employees: Employee[];
  prizes: Prize[];
  errors: string[];
  warnings: string[];
  missingFields: string[];
  sheetSummaries: {
    sheetName: string;
    foundHeaders: string[];
    empCount: number;
    prizeCount: number;
    missingFields: string[];
  }[];
  totalRows: number;
}

/**
 * Extracts raw buffer safely from File, Blob, or ArrayBuffer
 */
async function getFileBuffer(file: File | Blob | ArrayBuffer): Promise<Uint8Array> {
  if (file instanceof ArrayBuffer) {
    return new Uint8Array(file);
  }
  if (file && typeof (file as Blob).arrayBuffer === 'function') {
    const ab = await (file as Blob).arrayBuffer();
    return new Uint8Array(ab);
  }
  // Fallback for older environments with FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('無法讀取檔案內容'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('檔案讀取失敗'));
    reader.readAsArrayBuffer(file as Blob);
  });
}

/**
 * Master Smart Parser: Reads any Excel (.xlsx, .xls) or CSV file.
 * Handles:
 * 1. Multiple or single sheets (with standard or custom names like Sheet1, 工作表1)
 * 2. Header row detection anywhere in the first 15 rows (handles titles/empty rows at top)
 * 3. Both employees and prizes on the same sheet or separate sheets
 * 4. Flexible column headers (e.g. 工號/員編/ID, 姓名/員工/同仁/Name, 部門/單位/處/Team, 獎項/獎品/名額/數量)
 * 5. Raw data without headers (heuristic detection for name lists or columns)
 */
export async function parseSmartWorkbook(file: File | Blob | ArrayBuffer): Promise<ParseResult> {
  const data = await getFileBuffer(file);
  // cellDates: true, cellNF: false to preserve formatted numbers like "00123"
  const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });

  const allEmployees: Employee[] = [];
  const allPrizes: Prize[] = [];
  const sheetNames = workbook.SheetNames || [];
  let totalRowsScanned = 0;
  const detectedDetails: string[] = [];
  const sheetDiagnostics: SheetDiagnostic[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract any embedded images directly from the Excel workbook (.xlsx package)
  let extractedImagesMap: Map<string, ExtractedExcelImage[]> = new Map();
  try {
    extractedImagesMap = await extractImagesFromExcel(data, sheetNames);
  } catch (imgErr) {
    console.debug('Failed to extract embedded images from workbook:', imgErr);
  }

  const seenEmpKeys = new Set<string>();
  const seenPrizeKeys = new Set<string>();

  for (const sheetName of sheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // Convert sheet to 2D string array while preserving original row index (0-based)
    const rawAoa = (XLSX.utils.sheet_to_json(ws, { 
      header: 1, 
      raw: false, 
      defval: '' 
    }) as unknown[][]) || [];

    // Filter completely empty rows while retaining the true Excel sheet row index
    const cleanRowsWithIndex: { cells: string[]; originalRowIdx: number }[] = [];
    rawAoa.forEach((row, rIdx) => {
      const cells = Array.isArray(row) ? row.map(c => String(c ?? '').trim()) : [];
      if (cells.some(cell => cell !== '')) {
        cleanRowsWithIndex.push({ cells, originalRowIdx: rIdx });
      }
    });

    const cleanRows = cleanRowsWithIndex.map(item => item.cells);

    if (cleanRows.length === 0) {
      sheetDiagnostics.push({
        sheetName,
        totalRows: 0,
        headerRowIndex: -1,
        foundHeaders: [],
        matchedEmployeeColumns: {},
        matchedPrizeColumns: {},
        missingEmployeeHeaders: ['姓名', '員編 / 員工編號'],
        missingPrizeHeaders: ['獎項名稱 / 獎品內容'],
        blankNameCount: 0,
        extractedEmployeesCount: 0,
        extractedPrizesCount: 0,
      });
      continue;
    }

    totalRowsScanned += cleanRows.length;

    // Step 1: Scan for header row in top 15 rows
    let headerRowIdx = -1;
    let nameCol = -1;
    let nameHeader = '';
    let deptCol = -1;
    let deptHeader = '';
    let empNoCol = -1;
    let empNoHeader = '';
    let prizeImageCol = -1;
    let prizeImageHeader = '';
    let prizeNameCol = -1;
    let prizeNameHeader = '';
    let prizeContentCol = -1;
    let prizeContentHeader = '';
    let quotaCol = -1;
    let quotaHeader = '';
    let ruleCol = -1;
    let ruleHeader = '';
    let methodCol = -1;
    let methodHeader = '';
    let orderCol = -1;

    for (let r = 0; r < Math.min(15, cleanRows.length); r++) {
      const row = cleanRows[r];
      let tName = -1, tNameH = '';
      let tDept = -1, tDeptH = '';
      let tEmpNo = -1, tEmpNoH = '';
      let tPrizeImg = -1, tPrizeImgH = '';
      let tPrize = -1, tPrizeH = '';
      let tContent = -1, tContentH = '';
      let tQuota = -1, tQuotaH = '';
      let tRule = -1, tRuleH = '';
      let tMethod = -1, tMethodH = '';
      let tOrder = -1;

      for (let c = 0; c < row.length; c++) {
        const rawCell = String(row[c] ?? '').trim();
        const cell = normalizeStr(rawCell);
        if (!cell) continue;

        // 1. Check Prize Image header (Must be evaluated first and exclusively so it never intercepts prize content or prize tier)
        const isPrizeImg = (
          cell === '獎品圖片' || cell === '獎項圖片' || cell === '圖片' || cell === '照片' ||
          cell === '圖檔' || cell === '相片' || cell.includes('圖片') || cell.includes('照片') ||
          cell.includes('圖檔') || cell === 'image' || cell === 'photo' || cell === 'picture' ||
          cell === 'img' || cell === 'pic'
        );
        if (tPrizeImg === -1 && isPrizeImg) {
          tPrizeImg = c;
          tPrizeImgH = rawCell;
          continue;
        }

        // 2. Check Draw Method header (抽獎方式)
        const isMethod = (
          cell === '抽獎方式' || cell === '抽出方式' || cell === '開獎方式' || cell === '抽獎模式' ||
          cell === '開獎模式' || cell === '方式' || cell === '模式' || cell === 'method' ||
          cell === 'drawmethod' || cell === 'mode' ||
          (cell.includes('方式') && !cell.includes('聯絡') && !cell.includes('聯繫'))
        );
        if (tMethod === -1 && isMethod) {
          tMethod = c;
          tMethodH = rawCell;
          continue;
        }

        // 3. Check Draw Rule header (抽獎規則)
        const isRule = (
          cell === '抽獎規則' || cell === '中獎規則' || cell === '開獎規則' || cell === '抽獎限制' ||
          cell === '重複規則' || cell === '中獎限制' || cell === '規則' || cell === 'rule' ||
          cell === 'rules' || cell === 'drawrule'
        );
        if (tRule === -1 && isRule) {
          tRule = c;
          tRuleH = rawCell;
          continue;
        }

        // 4. Check Quota header (數量 / 名額)
        const isQuota = (
          cell === '數量' || cell === '名額' || cell === '名額數量' || cell === '獎品數量' ||
          cell === '中獎人數' || cell === '得獎人數' || cell === '人數' || cell === '份數' ||
          cell === '個數' || cell === '台數' || cell === '組數' || cell === '總數' ||
          cell === '幾位' || cell === '幾名' || cell === 'quota' || cell === 'count' ||
          cell === 'qty' || cell === 'amount' || cell.includes('名額') || cell.includes('數量') ||
          cell.includes('份數') || cell.includes('人數')
        );
        if (tQuota === -1 && isQuota) {
          tQuota = c;
          tQuotaH = rawCell;
          continue;
        }

        // 5. Check Order header (排序 / 順序)
        const isOrder = (
          cell === '順序' || cell === '次序' || cell === '排序' || cell === '抽獎順序' ||
          cell === '開獎順序' || cell === '獎項順序' || cell === 'order' || cell === 'seq'
        );
        if (tOrder === -1 && isOrder) {
          tOrder = c;
          continue;
        }

        // 6. Check Employee headers
        if (tName === -1 && (
          cell === '姓名' || cell === '名字' || cell === '員工姓名' || cell === '同仁姓名' ||
          cell === '同仁名字' || cell === '員工' || cell === '同仁' || cell === '人員' ||
          cell === '成員' || cell === '得獎人' || cell === '抽獎人' || cell === '參加者' ||
          cell === '人選' || cell === 'name' || cell === 'fullname'
        )) {
          tName = c;
          tNameH = rawCell;
          continue;
        } else if (tDept === -1 && (
          cell.includes('部門') || cell.includes('單位') || cell.includes('處') || cell.includes('課') ||
          cell.includes('組別') || cell.includes('團隊') || cell.includes('科') || cell.includes('dept') ||
          cell.includes('department') || cell.includes('division') || cell.includes('team') || cell.includes('branch')
        )) {
          tDept = c;
          tDeptH = rawCell;
          continue;
        } else if (tEmpNo === -1 && (
          cell.includes('工號') || cell.includes('員編') || cell.includes('員工編號') || cell.includes('編號') ||
          cell.includes('代碼') || cell.includes('序號') || cell === 'id' || cell === 'no' || cell === 'empno' ||
          cell === 'empid' || cell === 'staffid'
        )) {
          tEmpNo = c;
          tEmpNoH = rawCell;
          continue;
        }

        // 7. Check Prize Item Content/Name (獎品名稱 / 獎品內容 / 品名 / 規格)
        // Matches: 獎品名稱, 獎品, 品名, 獎品內容, 獎品品項, 品項, 商品名稱, 商品, 禮品, 禮品名稱, 內容, 規格
        const isContentCol = (
          cell === '獎品名稱' || cell === '獎品' || cell === '品名' || cell === '獎品內容' ||
          cell === '獎品品項' || cell === '品項' || cell === '商品名稱' || cell === '商品' ||
          cell === '禮品' || cell === '禮品名稱' || cell === '內容' || cell === '規格' ||
          cell === '品名規格' || cell === '獎品規格' || cell === '獎品說明' || cell === '名稱' ||
          cell.includes('品名') || cell.includes('獎品名稱') || cell.includes('獎品內容') ||
          cell.includes('獎品品項') || cell.includes('品項') || cell.includes('商品') ||
          cell.includes('禮品') || cell.includes('規格') ||
          cell === 'content' || cell === 'item' || cell === 'description' || cell === 'product' ||
          cell === 'gift' || cell === 'prizename'
        );
        if (tContent === -1 && isContentCol) {
          tContent = c;
          tContentH = rawCell;
          continue;
        }

        // 8. Check Prize Tier (獎項 / 獎別 / 獎階 / 獎位 / 獎次 / 獎項名稱)
        const isTierCol = (
          cell === '獎項' || cell === '獎項名稱' || cell === '獎別' || cell === '獎階' ||
          cell === '獎位' || cell === '獎次' || cell.includes('獎項') || cell.includes('獎別') ||
          cell.includes('獎階') || cell.includes('獎位') || cell === 'tier' || cell === 'award' ||
          cell === 'prize' || cell === 'rank' || cell === 'level'
        );
        if (tPrize === -1 && isTierCol) {
          tPrize = c;
          tPrizeH = rawCell;
          continue;
        }

        // Fallback: If cell includes 獎品 and not yet matched
        if (tContent === -1 && cell.includes('獎品')) {
          tContent = c;
          tContentH = rawCell;
          continue;
        }
      }

      const hasEmpHeader = tName !== -1 || (tEmpNo !== -1 && tDept !== -1);
      const hasPrizeHeader = 
        (tPrize !== -1 && (tContent !== -1 || tQuota !== -1 || tMethod !== -1 || tRule !== -1 || tPrizeImg !== -1)) || 
        (tContent !== -1 && (tQuota !== -1 || tMethod !== -1 || tRule !== -1 || tPrizeImg !== -1)) ||
        (tPrize !== -1 && tContent !== -1) ||
        (tPrize !== -1 && tQuota !== -1);

      if (hasEmpHeader || hasPrizeHeader) {
        headerRowIdx = r;
        nameCol = tName;
        nameHeader = tNameH;
        deptCol = tDept;
        deptHeader = tDeptH;
        empNoCol = tEmpNo;
        empNoHeader = tEmpNoH;
        prizeImageCol = tPrizeImg;
        prizeImageHeader = tPrizeImgH;
        prizeNameCol = tPrize;
        prizeNameHeader = tPrizeH;
        prizeContentCol = tContent;
        prizeContentHeader = tContentH;
        quotaCol = tQuota;
        quotaHeader = tQuotaH;
        ruleCol = tRule;
        ruleHeader = tRuleH;
        methodCol = tMethod;
        methodHeader = tMethodH;
        orderCol = tOrder;
        break;
      }
    }

    const foundHeaders: string[] = headerRowIdx !== -1
      ? cleanRows[headerRowIdx].filter(Boolean)
      : (cleanRows[0] || []).filter(Boolean);

    let sheetEmpCount = 0;
    let sheetPrizeCount = 0;
    let blankNameCount = 0;

    // Step 2: If Header Found, extract data
    if (headerRowIdx !== -1) {
      const dataRowsWithIndex = cleanRowsWithIndex.slice(headerRowIdx + 1);
      const dataRows = cleanRows.slice(headerRowIdx + 1);

      // Extract Employees if columns detected
      if (nameCol !== -1 || (empNoCol !== -1 && deptCol !== -1)) {
        dataRows.forEach((row, idx) => {
          const rawName = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
          const rawDept = deptCol !== -1 ? String(row[deptCol] || '').trim() : '';
          const rawEmpNo = empNoCol !== -1 ? String(row[empNoCol] || '').trim() : '';

          // Skip if row repeats header or empty
          if (!rawName && !rawEmpNo) {
            blankNameCount++;
            return;
          }
          if (['姓名', '名字', 'name', '員工姓名'].includes(normalizeStr(rawName))) return;

          if (!rawName && rawEmpNo) {
            blankNameCount++;
            // Still allow with placeholder if ID is present
          }

          const finalName = rawName || `同仁${rawEmpNo || idx + 1}`;
          const finalEmpNo = rawEmpNo || `E${String(allEmployees.length + 1).padStart(3, '0')}`;
          const finalDept = rawDept || '一般部門';

          const dedupKey = `${finalEmpNo}_${finalName}`.toLowerCase();
          if (!seenEmpKeys.has(dedupKey)) {
            seenEmpKeys.add(dedupKey);
            allEmployees.push({
              id: `emp-file-${Date.now()}-${allEmployees.length}-${Math.random().toString(36).substring(2, 6)}`,
              empNo: finalEmpNo,
              name: finalName,
              department: finalDept,
            });
            sheetEmpCount++;
          }
        });

        if (sheetEmpCount > 0) {
          detectedDetails.push(`工作表「${sheetName}」辨識到 ${sheetEmpCount} 位同仁名單`);
        }
      }

      // Extract Prizes if columns detected
      if (prizeNameCol !== -1 || prizeContentCol !== -1) {
        // Find extracted images for this sheet
        const sheetImages = extractedImagesMap.get(sheetName) || 
                            extractedImagesMap.get(sheetName.trim()) || 
                            (extractedImagesMap.size === 1 ? Array.from(extractedImagesMap.values())[0] : []);
        let extractedImagesCount = 0;

        dataRowsWithIndex.forEach(({ cells: row, originalRowIdx }) => {
          const rawImage = prizeImageCol !== -1 ? String(row[prizeImageCol] || '').trim() : '';
          const rawPrizeName = prizeNameCol !== -1 ? String(row[prizeNameCol] || '').trim() : '';
          const rawContent = prizeContentCol !== -1 ? String(row[prizeContentCol] || '').trim() : '';
          const rawQuota = quotaCol !== -1 ? String(row[quotaCol] || '').trim() : '';
          const rawRule = ruleCol !== -1 ? String(row[ruleCol] || '').trim() : '';
          const rawMethod = methodCol !== -1 ? String(row[methodCol] || '').trim() : '';
          const rawOrder = orderCol !== -1 ? String(row[orderCol] || '').trim() : '';

          if (!rawPrizeName && !rawContent) return;
          if (['獎項', '獎項名稱', '獎品', '品項', '獎品名稱', '品名'].includes(normalizeStr(rawPrizeName))) return;
          if (['獎項', '獎項名稱', '獎品', '品項', '獎品名稱', '品名'].includes(normalizeStr(rawContent))) return;

          // Parse quota number
          let finalQuota = 1;
          const matchNum = rawQuota.match(/\d+/);
          if (matchNum) {
            const parsed = parseInt(matchNum[0], 10);
            if (!isNaN(parsed) && parsed > 0) finalQuota = parsed;
          }

          let finalOrder = allPrizes.length + 1;
          if (rawOrder) {
            const parsedOrder = parseInt(rawOrder.replace(/[^\d]/g, ''), 10);
            if (!isNaN(parsedOrder) && parsedOrder > 0) finalOrder = parsedOrder;
          }

          // Exact separation between Prize Tier (name) and Prize Item (content)
          let finalName = '';
          let finalContent = '';

          if (rawPrizeName && rawContent) {
            finalName = rawPrizeName;
            finalContent = rawContent;
          } else if (rawPrizeName && !rawContent) {
            finalName = rawPrizeName;
            finalContent = rawPrizeName;
          } else if (!rawPrizeName && rawContent) {
            finalName = rawContent;
            finalContent = rawContent;
          } else {
            finalName = `獎項 ${allPrizes.length + 1}`;
            finalContent = '精緻禮品';
          }

          // Parse 抽獎方式 (逐次抽出 vs 一次抽出)
          let finalDrawMethod: 'step' | 'batch' = 'step';
          const normMethod = normalizeStr(rawMethod);
          if (normMethod.includes('一次') || normMethod.includes('全抽') || normMethod.includes('批次') || normMethod.includes('batch') || normMethod.includes('all')) {
            finalDrawMethod = 'batch';
          } else if (normMethod.includes('逐次') || normMethod.includes('單次') || normMethod.includes('依序') || normMethod.includes('step') || normMethod.includes('seq')) {
            finalDrawMethod = 'step';
          } else {
            // Default: if quota > 5, default to batch or step
            finalDrawMethod = finalQuota > 5 ? 'batch' : 'step';
          }

          // Parse 抽獎規則
          const normRule = normalizeStr(rawRule);
          const allowRepeat = normRule.includes('允許重複') || normRule.includes('可重複') || normRule.includes('全員皆可') || normRule.includes('repeat');
          const finalDrawRule = rawRule || (allowRepeat ? '全員皆可重複中獎' : '一人一獎 (排除已中獎者)');

          // Parse 獎品圖片:
          // 1. First priority: Direct image URL or base64 data URL in the cell text
          // 2. Second priority: Image directly embedded in the Excel worksheet at this row
          let finalImage: string | undefined = undefined;
          if (rawImage) {
            if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('data:image') || rawImage.startsWith('/')) {
              finalImage = rawImage;
            } else if (rawImage.startsWith('www.')) {
              finalImage = `https://${rawImage}`;
            }
          }

          if (!finalImage && sheetImages && sheetImages.length > 0) {
            const matchedImg = findMatchingImageForPrize(sheetImages, originalRowIdx, prizeImageCol);
            if (matchedImg) {
              finalImage = matchedImg;
              extractedImagesCount++;
            }
          }

          const dedupKey = `${finalName}_${finalContent}_${finalQuota}`.toLowerCase();
          if (!seenPrizeKeys.has(dedupKey)) {
            seenPrizeKeys.add(dedupKey);
            allPrizes.push({
              id: `prize-file-${Date.now()}-${allPrizes.length}-${Math.random().toString(36).substring(2, 6)}`,
              name: finalName,
              content: finalContent,
              quota: finalQuota,
              order: finalOrder,
              allowRepeat,
              drawRule: finalDrawRule,
              drawMethod: finalDrawMethod,
              image: finalImage,
              poolType: 'main',
            });
            sheetPrizeCount++;
          }
        });

        // 3. Sequential fallback: If there are unassigned images from the Excel sheet,
        // and prizes on this sheet that didn't match coordinates, assign in sequence
        if (sheetImages && sheetImages.length > 0) {
          const usedImages = new Set(allPrizes.map(p => p.image).filter(Boolean));
          const availableImages = sheetImages.filter(img => !usedImages.has(img.dataUrl));
          if (availableImages.length > 0) {
            let imgCursor = 0;
            for (const p of allPrizes) {
              if (!p.image && imgCursor < availableImages.length) {
                p.image = availableImages[imgCursor++].dataUrl;
                extractedImagesCount++;
              }
            }
          }
        }

        if (sheetPrizeCount > 0) {
          let detailMsg = `工作表「${sheetName}」辨識到 ${sheetPrizeCount} 項獎品`;
          if (extractedImagesCount > 0) {
            detailMsg += `（成功提取並綁定 ${extractedImagesCount} 張 Excel 內置獎品圖片）`;
          }
          detectedDetails.push(detailMsg);
        }
      }

      const missingEmpHeaders: string[] = [];
      if (nameCol === -1) missingEmpHeaders.push('姓名');
      if (empNoCol === -1) missingEmpHeaders.push('員編 / 員工編號');

      const missingPrizeHeaders: string[] = [];
      if (prizeNameCol === -1 && prizeContentCol === -1) missingPrizeHeaders.push('獎項名稱 / 獎品名稱');
      if (quotaCol === -1) missingPrizeHeaders.push('數量');

      sheetDiagnostics.push({
        sheetName,
        totalRows: cleanRows.length,
        headerRowIndex: headerRowIdx,
        foundHeaders,
        matchedEmployeeColumns: {
          nameCol,
          nameHeader,
          empNoCol,
          empNoHeader,
          deptCol,
          deptHeader,
        },
        matchedPrizeColumns: {
          imageCol: prizeImageCol !== -1 ? prizeImageCol : undefined,
          imageHeader: prizeImageHeader || undefined,
          prizeNameCol: prizeNameCol !== -1 ? prizeNameCol : undefined,
          prizeNameHeader: prizeNameHeader || undefined,
          contentCol: prizeContentCol !== -1 ? prizeContentCol : undefined,
          contentHeader: prizeContentHeader || undefined,
          quotaCol: quotaCol !== -1 ? quotaCol : undefined,
          quotaHeader: quotaHeader || undefined,
          ruleCol: ruleCol !== -1 ? ruleCol : undefined,
          ruleHeader: ruleHeader || undefined,
          methodCol: methodCol !== -1 ? methodCol : undefined,
          methodHeader: methodHeader || undefined,
        },
        missingEmployeeHeaders: missingEmpHeaders,
        missingPrizeHeaders,
        blankNameCount,
        extractedEmployeesCount: sheetEmpCount,
        extractedPrizesCount: sheetPrizeCount,
      });

      continue;
    }

    // Step 3: Heuristic Detection for sheets WITHOUT matching header rows
    const sNameLower = sheetName.toLowerCase();
    const isPrizeSheet = sNameLower.includes('獎') || sNameLower.includes('prize') || sNameLower.includes('award');

    // Case A: Single Column of plain text
    const maxCols = Math.max(...cleanRows.map(r => r.length));
    if (maxCols === 1) {
      if (isPrizeSheet) {
        const sheetImages = extractedImagesMap.get(sheetName) || [];
        cleanRowsWithIndex.forEach(({ cells: row, originalRowIdx }, idx) => {
          const val = String(row[0] || '').trim();
          if (!val || ['獎項', '獎品', '內容'].includes(normalizeStr(val))) return;
          const img = findMatchingImageForPrize(sheetImages, originalRowIdx, 0) || sheetImages[idx]?.dataUrl;
          allPrizes.push({
            id: `prize-file-${Date.now()}-${allPrizes.length}-${idx}`,
            name: `獎項 ${allPrizes.length + 1}`,
            content: val,
            quota: 1,
            order: allPrizes.length + 1,
            allowRepeat: false,
            poolType: 'main',
            image: img,
          });
          sheetPrizeCount++;
        });
        detectedDetails.push(`工作表「${sheetName}」單欄直接讀入 ${sheetPrizeCount} 項獎品`);
      } else {
        cleanRows.forEach((row, idx) => {
          const val = String(row[0] || '').trim();
          if (!val || ['姓名', '名字', '員工', '同仁', '名單'].includes(normalizeStr(val))) return;
          allEmployees.push({
            id: `emp-file-${Date.now()}-${allEmployees.length}-${idx}`,
            empNo: `E${String(allEmployees.length + 1).padStart(3, '0')}`,
            name: val,
            department: '一般部門',
          });
          sheetEmpCount++;
        });
        detectedDetails.push(`工作表「${sheetName}」單欄直接讀入 ${sheetEmpCount} 位同仁姓名`);
      }

      sheetDiagnostics.push({
        sheetName,
        totalRows: cleanRows.length,
        headerRowIndex: -1,
        foundHeaders,
        matchedEmployeeColumns: isPrizeSheet ? {} : { nameCol: 0, nameHeader: '(單欄姓名)' },
        matchedPrizeColumns: isPrizeSheet ? { contentCol: 0, contentHeader: '(單欄獎品)' } : {},
        missingEmployeeHeaders: isPrizeSheet ? ['姓名', '員編'] : ['員編 / 員工編號'],
        missingPrizeHeaders: isPrizeSheet ? ['名額數量'] : ['獎項名稱 / 獎品內容'],
        blankNameCount: 0,
        extractedEmployeesCount: sheetEmpCount,
        extractedPrizesCount: sheetPrizeCount,
      });

      continue;
    }

    // Case B: Multiple columns without headers (score columns for empNo, name, dept)
    if (!isPrizeSheet && maxCols >= 2) {
      const sampleRows = cleanRows.slice(0, 20);
      let bestNameCol = -1;
      let bestDeptCol = -1;
      let bestIdCol = -1;
      let maxNameScore = 0;
      let maxDeptScore = 0;
      let maxIdScore = 0;

      for (let c = 0; c < maxCols; c++) {
        let nameScore = 0, deptScore = 0, idScore = 0;
        sampleRows.forEach(r => {
          const val = String(r[c] || '').trim();
          if (!val) return;
          if (/^[0-9A-Za-z\-_]{1,10}$/.test(val)) idScore++;
          if (/(部|處|課|組|科|隊|中心|室|廠|院|team|dept)/i.test(val)) deptScore++;
          if (/^[\u4e00-\u9fa5]{2,4}$/.test(val) || /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(val)) nameScore++;
        });

        if (idScore > maxIdScore) { maxIdScore = idScore; bestIdCol = c; }
        if (deptScore > maxDeptScore) { maxDeptScore = deptScore; bestDeptCol = c; }
        if (nameScore > maxNameScore) { maxNameScore = nameScore; bestNameCol = c; }
      }

      if (bestNameCol === bestIdCol && maxNameScore > 0) {
        bestIdCol = -1;
      }

      if (bestNameCol !== -1) {
        cleanRows.forEach((row, idx) => {
          const name = String(row[bestNameCol] || '').trim();
          if (!name || ['姓名', '名字'].includes(normalizeStr(name))) return;
          const empNo = bestIdCol !== -1 ? String(row[bestIdCol] || '').trim() : `E${String(allEmployees.length + 1).padStart(3, '0')}`;
          const dept = bestDeptCol !== -1 ? String(row[bestDeptCol] || '').trim() : '一般部門';

          const dedupKey = `${empNo}_${name}`.toLowerCase();
          if (!seenEmpKeys.has(dedupKey)) {
            seenEmpKeys.add(dedupKey);
            allEmployees.push({
              id: `emp-file-${Date.now()}-${allEmployees.length}-${idx}`,
              empNo: empNo || `E${String(allEmployees.length + 1).padStart(3, '0')}`,
              name,
              department: dept || '一般部門',
            });
            sheetEmpCount++;
          }
        });
        if (sheetEmpCount > 0) {
          detectedDetails.push(`工作表「${sheetName}」智慧特徵識別載入 ${sheetEmpCount} 位同仁名單`);
        }
      }

      sheetDiagnostics.push({
        sheetName,
        totalRows: cleanRows.length,
        headerRowIndex: -1,
        foundHeaders,
        matchedEmployeeColumns: {
          nameCol: bestNameCol !== -1 ? bestNameCol : undefined,
          empNoCol: bestIdCol !== -1 ? bestIdCol : undefined,
          deptCol: bestDeptCol !== -1 ? bestDeptCol : undefined,
        },
        matchedPrizeColumns: {},
        missingEmployeeHeaders: bestIdCol === -1 ? ['員編 / 員工編號'] : [],
        missingPrizeHeaders: ['獎項名稱 / 獎品內容'],
        blankNameCount: 0,
        extractedEmployeesCount: sheetEmpCount,
        extractedPrizesCount: 0,
      });
    } else {
      // Fallback empty diagnostics
      sheetDiagnostics.push({
        sheetName,
        totalRows: cleanRows.length,
        headerRowIndex: -1,
        foundHeaders,
        matchedEmployeeColumns: {},
        matchedPrizeColumns: {},
        missingEmployeeHeaders: ['姓名', '員編 / 員工編號'],
        missingPrizeHeaders: ['獎項名稱 / 獎品內容'],
        blankNameCount: 0,
        extractedEmployeesCount: 0,
        extractedPrizesCount: 0,
      });
    }
  }

  return {
    employees: allEmployees,
    prizes: allPrizes.sort((a, b) => a.order - b.order),
    sheetNames,
    totalRowsScanned,
    detectedDetails,
    sheetDiagnostics,
    errors,
    warnings,
  };
}

/**
 * Diagnostics parser for Employee Excel upload
 */
export async function parseExcelEmployeesWithDiagnostics(file: File | Blob | ArrayBuffer): Promise<EmployeeValidationResult> {
  let parseRes: ParseResult;
  try {
    parseRes = await parseSmartWorkbook(file);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err || '無法解析此檔案');
    return {
      success: false,
      employees: [],
      errors: [`檔案讀取失敗：${errorMsg}。請確認是否為有效 Excel (.xlsx / .xls) 或 CSV 檔案。`],
      warnings: [],
      missingFields: ['有效 Excel 檔案格式'],
      foundHeaders: [],
      sheetName: '',
      totalRows: 0,
    };
  }

  if (parseRes.sheetNames.length === 0 || parseRes.totalRowsScanned === 0) {
    return {
      success: false,
      employees: [],
      errors: ['上傳的 Excel 檔案為空，未找到任何可讀取的資料列。'],
      warnings: [],
      missingFields: ['員工名單資料'],
      foundHeaders: [],
      sheetName: parseRes.sheetNames[0] || '',
      totalRows: 0,
    };
  }

  // Find the primary employee sheet or the first sheet
  const empDiag = parseRes.sheetDiagnostics.find(d => 
    d.extractedEmployeesCount > 0 ||
    d.sheetName.includes('員工') || 
    d.sheetName.includes('同仁') || 
    d.sheetName.includes('名冊') ||
    d.sheetName.includes('staff') ||
    d.sheetName.includes('user') ||
    d.sheetName.includes('member')
  ) || parseRes.sheetDiagnostics[0];

  const foundHeaders = empDiag?.foundHeaders || [];
  const missingFields: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [...parseRes.warnings];

  const hasName = empDiag?.matchedEmployeeColumns?.nameCol !== undefined && empDiag.matchedEmployeeColumns.nameCol !== -1;
  const hasEmpNo = empDiag?.matchedEmployeeColumns?.empNoCol !== undefined && empDiag.matchedEmployeeColumns.empNoCol !== -1;

  if (!hasName) {
    missingFields.push('姓名');
  }
  if (!hasEmpNo) {
    missingFields.push('員編 / 員工編號');
  }

  // Fatal check: If no name was found at all and 0 employees were extracted
  if (!hasName && parseRes.employees.length === 0) {
    errors.push(`缺少必要欄位【姓名】：未在工作表「${empDiag?.sheetName || 'Sheet1'}」中偵測到「姓名」欄位標題。`);
    if (!hasEmpNo) {
      errors.push(`同時缺少【員編 / 員工編號】欄位。目前工作表偵測到的表頭為：[${foundHeaders.length > 0 ? foundHeaders.join('、') : '(無有效標題)'}]。`);
    } else {
      errors.push(`目前工作表僅偵測到員編，缺少抽獎必備之同仁姓名。`);
    }

    return {
      success: false,
      employees: [],
      errors,
      warnings,
      missingFields,
      foundHeaders,
      sheetName: empDiag?.sheetName || '',
      totalRows: empDiag?.totalRows || 0,
    };
  }

  if (parseRes.employees.length === 0) {
    errors.push(`未能在工作表中提取到有效員工資料（可能是姓名資料全為空值或表頭設定有誤）。`);
    return {
      success: false,
      employees: [],
      errors,
      warnings,
      missingFields,
      foundHeaders,
      sheetName: empDiag?.sheetName || '',
      totalRows: empDiag?.totalRows || 0,
    };
  }

  // If employees extracted, but empNo was auto-generated (missing in original file)
  if (!hasEmpNo) {
    warnings.push('檔案未偵測到【員編 / 員工編號】欄位，系統已自動依序生成臨時員編（如 E001, E002...）。建議提供正式員編以防重名衝突。');
  }

  if (empDiag?.blankNameCount && empDiag.blankNameCount > 0) {
    warnings.push(`發現 ${empDiag.blankNameCount} 筆資料因姓名空白已自動略過。`);
  }

  return {
    success: true,
    employees: parseRes.employees,
    errors: [],
    warnings,
    missingFields: hasEmpNo ? [] : ['員編 / 員工編號（已自動生成）'],
    foundHeaders,
    sheetName: empDiag?.sheetName || '',
    totalRows: parseRes.employees.length,
  };
}

/**
 * Diagnostics parser for Prize Excel upload
 */
export async function parseExcelPrizesWithDiagnostics(file: File | Blob | ArrayBuffer): Promise<PrizeValidationResult> {
  let parseRes: ParseResult;
  try {
    parseRes = await parseSmartWorkbook(file);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err || '無法解析此檔案');
    return {
      success: false,
      prizes: [],
      errors: [`檔案讀取失敗：${errorMsg}。請確認是否為有效 Excel (.xlsx / .xls) 或 CSV 檔案。`],
      warnings: [],
      missingFields: ['有效 Excel 檔案格式'],
      foundHeaders: [],
      sheetName: '',
      totalRows: 0,
    };
  }

  if (parseRes.sheetNames.length === 0 || parseRes.totalRowsScanned === 0) {
    return {
      success: false,
      prizes: [],
      errors: ['上傳的 Excel 檔案為空，未找到任何可讀取的資料列。'],
      warnings: [],
      missingFields: ['獎品清單資料'],
      foundHeaders: [],
      sheetName: parseRes.sheetNames[0] || '',
      totalRows: 0,
    };
  }

  // Find the primary prize sheet or the first sheet
  const prizeDiag = parseRes.sheetDiagnostics.find(d => 
    d.extractedPrizesCount > 0 ||
    d.sheetName.includes('獎') || 
    d.sheetName.includes('prize') || 
    d.sheetName.includes('award') ||
    d.sheetName.includes('gift')
  ) || parseRes.sheetDiagnostics[0];

  const foundHeaders = prizeDiag?.foundHeaders || [];
  const missingFields: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [...parseRes.warnings];

  const hasPrizeName = prizeDiag?.matchedPrizeColumns?.prizeNameCol !== undefined && prizeDiag.matchedPrizeColumns.prizeNameCol !== -1;
  const hasContent = prizeDiag?.matchedPrizeColumns?.contentCol !== undefined && prizeDiag.matchedPrizeColumns.contentCol !== -1;
  const hasQuota = prizeDiag?.matchedPrizeColumns?.quotaCol !== undefined && prizeDiag.matchedPrizeColumns.quotaCol !== -1;

  if (!hasPrizeName && !hasContent) {
    missingFields.push('獎項 / 獎品名稱');
  }
  if (!hasQuota) {
    missingFields.push('數量');
  }

  if ((!hasPrizeName && !hasContent) && parseRes.prizes.length === 0) {
    errors.push(`缺少必要欄位【獎項】或【獎品名稱】：未在工作表「${prizeDiag?.sheetName || 'Sheet1'}」中找到獎項標題。`);
    errors.push(`標準獎品 Excel 格式需包含：【獎品圖片、獎項、獎品名稱、數量、抽獎規則、抽獎方式】。`);
    errors.push(`目前工作表偵測到的表頭欄位為：[${foundHeaders.length > 0 ? foundHeaders.join('、') : '(無有效表頭)'}]。`);
    return {
      success: false,
      prizes: [],
      errors,
      warnings,
      missingFields,
      foundHeaders,
      sheetName: prizeDiag?.sheetName || '',
      totalRows: prizeDiag?.totalRows || 0,
    };
  }

  if (parseRes.prizes.length === 0) {
    errors.push(`未能在工作表中提取到有效獎項資料，請確認資料列非空白。`);
    return {
      success: false,
      prizes: [],
      errors,
      warnings,
      missingFields,
      foundHeaders,
      sheetName: prizeDiag?.sheetName || '',
      totalRows: prizeDiag?.totalRows || 0,
    };
  }

  if (!hasQuota) {
    warnings.push('檔案未偵測到【名額 / 數量】欄位，已自動預設每獎項名額為 1 名。');
  }

  return {
    success: true,
    prizes: parseRes.prizes,
    errors: [],
    warnings,
    missingFields: hasQuota ? [] : ['名額數量（預設1名）'],
    foundHeaders,
    sheetName: prizeDiag?.sheetName || '',
    totalRows: parseRes.prizes.length,
  };
}

/**
 * Diagnostics parser for Combined Excel upload
 */
export async function parseCombinedExcelWithDiagnostics(file: File | Blob | ArrayBuffer): Promise<CombinedValidationResult> {
  let parseRes: ParseResult;
  try {
    parseRes = await parseSmartWorkbook(file);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err || '無法解析此檔案');
    return {
      success: false,
      employees: [],
      prizes: [],
      errors: [`檔案讀取失敗：${errorMsg}。請確認是否為有效 Excel (.xlsx / .xls) 或 CSV 檔案。`],
      warnings: [],
      missingFields: ['有效 Excel 檔案格式'],
      sheetSummaries: [],
      totalRows: 0,
    };
  }

  if (parseRes.sheetNames.length === 0 || parseRes.totalRowsScanned === 0) {
    return {
      success: false,
      employees: [],
      prizes: [],
      errors: ['上傳的 Excel 檔案為空，未找到任何可讀取的資料列。'],
      warnings: [],
      missingFields: ['檔案無內容'],
      sheetSummaries: [],
      totalRows: 0,
    };
  }

  const sheetSummaries = parseRes.sheetDiagnostics.map(d => {
    const missing: string[] = [];
    if (d.matchedEmployeeColumns.nameCol === undefined || d.matchedEmployeeColumns.nameCol === -1) missing.push('姓名');
    if (d.matchedEmployeeColumns.empNoCol === undefined || d.matchedEmployeeColumns.empNoCol === -1) missing.push('員編');
    if ((d.matchedPrizeColumns.prizeNameCol === undefined || d.matchedPrizeColumns.prizeNameCol === -1) && 
        (d.matchedPrizeColumns.contentCol === undefined || d.matchedPrizeColumns.contentCol === -1)) {
      missing.push('獎品內容');
    }
    return {
      sheetName: d.sheetName,
      foundHeaders: d.foundHeaders,
      empCount: d.extractedEmployeesCount,
      prizeCount: d.extractedPrizesCount,
      missingFields: missing,
    };
  });

  if (parseRes.employees.length === 0 && parseRes.prizes.length === 0) {
    const allHeaders = parseRes.sheetDiagnostics.flatMap(d => d.foundHeaders);
    const uniqueHeaders = Array.from(new Set(allHeaders));
    return {
      success: false,
      employees: [],
      prizes: [],
      errors: [
        `格式不正確或缺少必要欄位：未能在活頁簿中辨識出符合抽獎規格的資料（共掃描工作表：${parseRes.sheetNames.join('、')}）。`,
        `目前工作表偵測到的表頭為：[${uniqueHeaders.length > 0 ? uniqueHeaders.join('、') : '(無有效表頭)'}]。`,
        `員工名單必須包含【姓名】或【員工編號】；獎品清單必須包含【獎項名稱】或【獎品內容】。`
      ],
      warnings: parseRes.warnings,
      missingFields: ['姓名 / 員工編號', '獎項名稱 / 獎品內容'],
      sheetSummaries,
      totalRows: parseRes.totalRowsScanned,
    };
  }

  return {
    success: true,
    employees: parseRes.employees,
    prizes: parseRes.prizes,
    errors: [],
    warnings: parseRes.warnings,
    missingFields: [],
    sheetSummaries,
    totalRows: parseRes.totalRowsScanned,
  };
}

/**
 * Backward-compatible parse function for single integrated Excel file
 */
export async function parseCombinedExcel(file: File | Blob | ArrayBuffer): Promise<{ employees: Employee[]; prizes: Prize[] }> {
  const result = await parseSmartWorkbook(file);
  return {
    employees: result.employees,
    prizes: result.prizes,
  };
}

/**
 * Alias for parseCombinedExcel
 */
export const parseIntegratedExcelWorkbook = parseCombinedExcel;

/**
 * Backward-compatible function for parsing employees from an Excel file
 */
export async function parseExcelEmployees(file: File | Blob | ArrayBuffer): Promise<Employee[]> {
  const result = await parseSmartWorkbook(file);
  return result.employees;
}

/**
 * Backward-compatible function for parsing prizes from an Excel file
 */
export async function parseExcelPrizes(file: File | Blob | ArrayBuffer): Promise<Prize[]> {
  const result = await parseSmartWorkbook(file);
  return result.prizes;
}

/**
 * Export winners to Excel with formatted time, remarks, absentees, and donations
 */
export function exportWinnersToExcel(
  winners: WinningRecord[], 
  title = '中獎名單', 
  absentees: AbsentRecord[] = [], 
  donations: DonationRecord[] = []
) {
  if (winners.length === 0 && absentees.length === 0 && donations.length === 0) {
    alert('目前尚無中獎或處置紀錄可匯出！');
    return;
  }

  const wb = XLSX.utils.book_new();

  if (winners.length > 0) {
    const data = winners.map((record, index) => {
      const date = new Date(record.timestamp);
      const timeString = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      
      let note = '正規獎項';
      if (record.poolType === 'bonus' || record.isAdditional) note = '★ 現場加碼獎項 (加碼獎池)';
      if (record.replacesAbsenteeId) note += ' (缺席補抽)';

      return {
        '中獎順序': index + 1,
        '獎項類別': (record.poolType === 'bonus' || record.isAdditional) ? '加碼獎項' : '正規獎項',
        '獎項名稱': record.prizeName,
        '獎品內容': record.prizeContent,
        '得獎者員編': record.employeeNo,
        '得獎者姓名': record.employeeName,
        '所屬部門': record.department,
        '開獎時間': timeString,
        '備註說明': note,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 22 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '中獎名冊');
  }

  // Append Donations Sheet if any
  if (donations.length > 0) {
    const donationData = donations.map((d, index) => {
      const date = new Date(d.timestamp);
      const timeString = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

      return {
        '項次': index + 1,
        '捐出同仁員編': d.employeeNo,
        '捐出同仁姓名': d.employeeName,
        '所屬部門': d.department,
        '原中獎獎項': d.prizeName,
        '獎品內容': d.prizeContent,
        '處置去向': '當前獎項名額釋出重抽（捐出同仁已標記該獎池不可再抽）',
        '捐出時間': timeString,
        '備註說明': d.note || '愛心同仁好意捐出',
      };
    });

    const wsDonations = XLSX.utils.json_to_sheet(donationData);
    wsDonations['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 30 },
      { wch: 26 },
      { wch: 22 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDonations, '愛心捐出明細');
  }

  // Append Absentees Sheet if any
  if (absentees.length > 0) {
    const absentData = absentees.map((a, index) => {
      const date = new Date(a.timestamp);
      const timeString = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

      return {
        '項次': index + 1,
        '原得獎者員編': a.employeeNo,
        '原得獎者姓名': a.employeeName,
        '所屬部門': a.department,
        '原抽中獎項': a.prizeName,
        '放棄處置時間': timeString,
        '放棄原因': a.reason,
      };
    });

    const wsAbsent = XLSX.utils.json_to_sheet(absentData);
    wsAbsent['!cols'] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 22 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsAbsent, '缺席棄權紀錄');
  }

  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  XLSX.writeFile(wb, `${title}_${dateSuffix}.xlsx`);
}

/**
 * Export winners to CSV with standard UTF-8 BOM encoding for Excel/Numbers compatibility
 */
export function exportWinnersToCsv(winners: WinningRecord[], title = '尾牙中獎名單') {
  if (winners.length === 0) {
    alert('目前尚無得獎名單可匯出！');
    return;
  }

  const headers = ['中獎順序', '獎項類別', '獎項名稱', '獎品內容', '得獎者員編', '得獎者姓名', '所屬部門', '開獎時間', '備註說明'];
  
  const escapeCsv = (str: string | number) => {
    const s = String(str ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = winners.map((record, index) => {
    const date = new Date(record.timestamp);
    const timeString = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
    
    let note = '正規獎項';
    if (record.poolType === 'bonus' || record.isAdditional) note = '★ 現場加碼獎項 (加碼獎池)';
    if (record.replacesAbsenteeId) note += ' (缺席補抽)';

    const poolCategory = (record.poolType === 'bonus' || record.isAdditional) ? '加碼獎項' : '正規獎項';

    return [
      escapeCsv(index + 1),
      escapeCsv(poolCategory),
      escapeCsv(record.prizeName),
      escapeCsv(record.prizeContent),
      escapeCsv(record.employeeNo),
      escapeCsv(record.employeeName),
      escapeCsv(record.department),
      escapeCsv(timeString),
      escapeCsv(note),
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens Chinese text correctly without garbled characters
  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  a.href = url;
  a.download = `${title}_${dateSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download sample templates for employees and prizes
 */
export function downloadSampleExcelTemplates() {
  const wb = XLSX.utils.book_new();

  // Employee Sheet
  const empData = [
    { '部門': '研發部', '員工編號': 'RD001', '姓名': '王小明' },
    { '部門': '行銷部', '員工編號': 'MK001', '姓名': '李美麗' },
    { '部門': '財務部', '員工編號': 'FN001', '姓名': '張大同' },
    { '部門': '管理部', '員工編號': 'MG001', '姓名': '陳志豪' },
    { '部門': '營運部', '員工編號': 'OP001', '姓名': '林美琪' },
  ];
  const wsEmp = XLSX.utils.json_to_sheet(empData);
  wsEmp['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsEmp, '員工名單');

  // Prize Sheet (符合標準格式：獎品圖片、獎項、獎品名稱、數量、抽獎規則、抽獎方式)
  const prizeData = [
    {
      '獎品圖片': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
      '獎項': '特獎',
      '獎品名稱': 'iPhone 16 Pro Max 256GB 太空黑',
      '數量': 1,
      '抽獎規則': '一人一獎 (排除已中獎者)',
      '抽獎方式': '逐次抽出',
    },
    {
      '獎品圖片': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
      '獎項': '頭獎',
      '獎品名稱': 'Dyson Supersonic 吹風機旗艦組',
      '數量': 3,
      '抽獎規則': '一人一獎 (排除已中獎者)',
      '抽獎方式': '逐次抽出',
    },
    {
      '獎品圖片': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
      '獎項': '二獎',
      '獎品名稱': '新光三越百貨禮券 5,000 元',
      '數量': 5,
      '抽獎規則': '一人一獎 (排除已中獎者)',
      '抽獎方式': '一次抽出',
    },
    {
      '獎品圖片': 'https://images.unsplash.com/photo-1584990347449-a297e289bf00?w=600&auto=format&fit=crop&q=80',
      '獎項': '三獎',
      '獎品名稱': '飛利浦健康氣炸料理鍋',
      '數量': 10,
      '抽獎規則': '一人一獎 (排除已中獎者)',
      '抽獎方式': '一次抽出',
    },
    {
      '獎品圖片': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
      '獎項': '普獎',
      '獎品名稱': '家樂福千元現金禮券',
      '數量': 20,
      '抽獎規則': '一人一獎 (排除已中獎者)',
      '抽獎方式': '一次抽出',
    },
  ];
  const wsPrize = XLSX.utils.json_to_sheet(prizeData);
  wsPrize['!cols'] = [
    { wch: 36 }, // 獎品圖片
    { wch: 14 }, // 獎項
    { wch: 34 }, // 獎品名稱
    { wch: 10 }, // 數量
    { wch: 24 }, // 抽獎規則
    { wch: 16 }, // 抽獎方式
  ];
  XLSX.utils.book_append_sheet(wb, wsPrize, '獎品清單');

  XLSX.writeFile(wb, '尾牙抽獎範本_名單與獎項.xlsx');
}

/**
 * Download sample template strictly for employees
 */
export function downloadEmployeeExcelTemplate() {
  const wb = XLSX.utils.book_new();
  const empData = [
    { '部門單位': '研發部', '員工編號': 'RD001', '姓名': '王小明' },
    { '部門單位': '行銷部', '員工編號': 'MK001', '姓名': '李美麗' },
    { '部門單位': '財務部', '員工編號': 'FN001', '姓名': '張大同' },
    { '部門單位': '管理部', '員工編號': 'MG001', '姓名': '陳志豪' },
    { '部門單位': '營運部', '員工編號': 'OP001', '姓名': '林美琪' },
    { '部門單位': '業務部', '員工編號': 'SL001', '姓名': '黃建國' },
    { '部門單位': '客服部', '員工編號': 'CS001', '姓名': '趙淑芬' },
    { '部門單位': '設計部', '員工編號': 'DS001', '姓名': '周文華' },
  ];
  const wsEmp = XLSX.utils.json_to_sheet(empData);
  wsEmp['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsEmp, '員工名單');
  XLSX.writeFile(wb, '員工名冊範本.xlsx');
}

/**
 * Download sample template strictly for prizes
 */
export function downloadPrizeExcelTemplate() {
  const wb = XLSX.utils.book_new();
  const prizeData = [
    {
      '獎項名稱': '特獎',
      '獎品內容': 'iPhone 16 Pro Max 256GB 太空黑',
      '名額數量': 1,
      '抽獎方式': '逐次抽出',
      '獎池分類': '正規獎項',
      '獎品圖片網址': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
    },
    {
      '獎項名稱': '頭獎',
      '獎品內容': 'Dyson Supersonic 吹風機旗艦組',
      '名額數量': 3,
      '抽獎方式': '逐次抽出',
      '獎池分類': '正規獎項',
      '獎品圖片網址': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
    },
    {
      '獎項名稱': '二獎',
      '獎品內容': '新光三越百貨禮券 5,000 元',
      '名額數量': 5,
      '抽獎方式': '一次抽出',
      '獎池分類': '正規獎項',
      '獎品圖片網址': 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80',
    },
    {
      '獎項名稱': '三獎',
      '獎品內容': '飛利浦健康氣炸料理鍋',
      '名額數量': 10,
      '抽獎方式': '一次抽出',
      '獎池分類': '正規獎項',
      '獎品圖片網址': 'https://images.unsplash.com/photo-1584990347449-a297e289bf00?w=600&auto=format&fit=crop&q=80',
    },
    {
      '獎項名稱': '普獎',
      '獎品內容': '家樂福千元現金禮券',
      '名額數量': 20,
      '抽獎方式': '一次抽出',
      '獎池分類': '正規獎項',
      '獎品圖片網址': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    },
    {
      '獎項名稱': '現場加碼紅包',
      '獎品內容': '董事長特別加碼現金 $8,888',
      '名額數量': 2,
      '抽獎方式': '逐次抽出',
      '獎池分類': '加碼專區',
      '獎品圖片網址': '',
    },
  ];
  const wsPrize = XLSX.utils.json_to_sheet(prizeData);
  wsPrize['!cols'] = [
    { wch: 16 }, // 獎項名稱
    { wch: 34 }, // 獎品內容
    { wch: 12 }, // 名額數量
    { wch: 14 }, // 抽獎方式
    { wch: 14 }, // 獎池分類
    { wch: 38 }, // 獎品圖片網址
  ];
  XLSX.utils.book_append_sheet(wb, wsPrize, '獎品清單');
  XLSX.writeFile(wb, '獎項清單範本.xlsx');
}

