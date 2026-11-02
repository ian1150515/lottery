# 抽獎系統架構說明書與隨機演算法技術文件

本文件詳細說明系統之整體架構、各原始碼檔案（Components / Utilities / Types / Configs）之核心功能職責，以及系統內部完整的**「隨機抽獎演算法（Random Logic）」**與候選人過濾管線。

---

## 目錄
1. [系統技術棧與架構總覽](#1-系統技術棧與架構總覽)
2. [原始碼目錄檔案職責一覽](#2-原始碼目錄檔案職責一覽)
   - [2.1 核心入口與全域狀態](#21-核心入口與全域狀態)
   - [2.2 四大核心視圖 (Views)](#22-四大核心視圖-views)
   - [2.3 彈窗與業務處置組件 (Modals)](#23-彈窗與業務處置組件-modals)
   - [2.4 介面導航與慶典視覺組件 (UI & Festive)](#24-介面導航與慶典視覺組件-ui--festive)
   - [2.5 底層工具模組 (Utilities)](#25-底層工具模組-utilities)
   - [2.6 專案根目錄設定檔](#26-專案根目錄設定檔)
3. [抽獎隨機邏輯 (Random Logic) 深度解析](#3-抽獎隨機邏輯-random-logic-深度解析)
   - [3.1 候選同仁池動態過濾管線 (Eligibility Pipeline)](#31-候選同仁池動態過濾管線-eligibility-pipeline)
   - [3.2 隨機抽取演算法 (Shuffling & Selection Algorithm)](#32-隨機抽取演算法-shuffling--selection-algorithm)
   - [3.3 逐次連抽 vs 一次全抽隨機模型](#33-逐次連抽-vs-一次全抽隨機模型)
   - [3.4 缺席棄權補抽隨機機制](#34-缺席棄權補抽隨機機制)
   - [3.5 物理減速煞車滾動動畫演算法 (Deceleration Easing Curve)](#35-物理減速煞車滾動動畫演算法-deceleration-easing-curve)
   - [3.6 唯一識別碼與防偽稽核機制 (Audit Trace)](#36-唯一識別碼與防偽稽核機制-audit-trace)

---

## 1. 系統技術棧與架構總覽

本系統為專為大型宴會、尾牙聯歡晚會、春酒盛典設計之**高可用純前端單頁應用（SPA）**，具備離線運行、高對比大螢幕投射與無外部音效檔依賴等特點。

- **前端框架**：React 18 + TypeScript + Vite
- **排版與樣式**：Tailwind CSS + 自訂慶典特效動畫（金紅漸層、高亮發光、旋轉閃爍）
- **動畫渲染**：Framer Motion (`motion/react`)
- **圖示庫**：Lucide React
- **音效引擎**：Web Audio API 純代碼合成音頻震盪器（零外部 MP3/WAV 網路依賴）
- **慶典特效**：Canvas Confetti（禮花爆破、金幣雨、彩帶噴泉）
- **試算表處理**：SheetJS (XLSX) + JSZip（支援名冊匯入、圖片自動解壓縮抽取、中獎匯出）
- **持久化層**：HTML5 LocalStorage 附版本控管快照機制（Auto-Save Snapshot）

---

## 2. 原始碼目錄檔案職責一覽

```
src/
├── App.tsx                      # 全域狀態管理與主控制中心
├── main.tsx                     # 應用程式掛載入口
├── index.css                    # Tailwind 與全局樣式
├── types.ts                     # TypeScript 型別定義
│
├── components/                  # UI 與業務邏輯組件
│   ├── Header.tsx               # 頂部導航列與模式切換
│   ├── DrawStage.tsx            # 前台抽獎舞台（輪盤滾動與即時開獎）
│   ├── ProjectorView.tsx        # 大螢幕投影專用模式（50/50等比、一頁10位）
│   ├── WinnersWall.tsx          # 星光榜（得獎名冊、搜尋、匯出）
│   ├── AdminPanel.tsx           # 後台管理中心（名冊、獎項、參數設定）
│   ├── AbsenteeRedrawModal.tsx  # 缺席補抽彈窗（標記棄權、獨立輪盤補抽）
│   ├── AdditionalDrawModal.tsx  # 現場特別加碼彈窗（即時建立加碼獎項）
│   ├── DonatePrizeModal.tsx     # 獎項捐出確認彈窗（釋出名額供重抽）
│   ├── EmployeeImportModal.tsx  # 員工名冊專屬 Excel 匯入與範本彈窗
│   ├── PrizeImportModal.tsx     # 獎項清單專屬 Excel 匯入與範本彈窗（含圖片解包）
│   ├── PrizeEditModal.tsx       # 獎項新增與編輯彈窗（配額、圖片、方式）
│   ├── PrizeSelector.tsx        # 水平獎項切換跑馬輪播器
│   ├── RestoreJsonModal.tsx     # 系統 JSON 快照還原預覽彈窗
│   ├── RoundTransitionModal.tsx # 平準輪次自動解鎖與開啟確認彈窗
│   ├── CandidateListModal.tsx   # 即時抽籤候選名冊檢視彈窗
│   ├── SecureResetModal.tsx     # 雙重驗證安全性重置彈窗
│   ├── ConfirmLoadMockModal.tsx # 載入示範資料確認彈窗
│   ├── FestiveHeaderBanner.tsx  # 節慶動態橫額跑馬燈
│   ├── FestiveIllustrations.tsx # 向量慶典插畫（元寶、紅包、星光、燈籠）
│   └── Mascot.tsx               # 向量吉祥物狀態動畫
│
└── utils/                       # 核心輔助工具函式庫
    ├── soundEffects.ts          # Web Audio API 合成音效引擎
    ├── confettiHelper.ts        # 慶典彩花雨特效控制器
    ├── excelHelper.ts           # Excel 匯入/匯出與範本生成
    ├── excelImageExtractor.ts   # 從 .xlsx 壓縮包自動提取內嵌圖片
    ├── storageHelper.ts         # 本地存儲快照與還原管理
    ├── localBackupHelper.ts     # 本機資料夾直接寫入自動備份 (File System Access API & IDB)
    └── mockData.ts              # 預設示範同仁與獎品清單
```

### 2.1 核心入口與全域狀態

- **`src/main.tsx`**  
  React DOM 入口點，負責將 `<App />` 掛載至 HTML 的 `#root` 節點。

- **`src/App.tsx`**  
  **全應用程式的中樞大腦**：
  1. 管理全局狀態：同仁名單 (`employees`)、獎項清單 (`prizes`)、中獎紀錄 (`winningRecords`)、缺席棄權紀錄 (`absentRecords`)、捐出紀錄 (`donationRecords`)。
  2. 控制當前視圖（舞台抽獎、大螢幕投影、星光榜、後台管理）。
  3. 控制當前抽獎池：正規池 (`main`) 或 現場特別加碼池 (`bonus`)。
  4. 整合並計算**「動態合格候選人池 (`candidates`)」**。
  5. 負責 LocalStorage 自動備份快照 (`StorageSnapshotData`)。

- **`src/types.ts`**  
  定義全系統資料型態契約：
  - `Employee`：員工編號、姓名、部門、是否排除抽獎等。
  - `Prize`：獎項 ID、名稱、內容、配額、獎池種類 (`main` / `bonus`)、抽取方式 (`sequential` / `batch`)、重複中獎規則。
  - `WinningRecord`：中獎流水號、對應獎項、得獎同仁、時間戳記、替補/捐出註記。
  - `AbsentRecord` & `DonationRecord`：缺席放棄與好意捐出的稽核歷程。
  - `AppSettings`：晚會標題、開獎秒數（1~10s）、慶典特效種類。

- **`src/index.css`**  
  全域 Tailwind 指令及客製化慶典按鈕（`festive-primary-btn`、`festive-gold-btn`）、光影流動動畫（`shimmer`）、跑馬燈動畫。

---

### 2.2 四大核心視圖 (Views)

- **`src/components/DrawStage.tsx`（舞台抽獎模式）**  
  主持人主要操作介面。包含大型動態輪盤滾動卡、獎品縮圖與配額統計、快速切換獎項按鈕，支援「單人抽取」與「一次全抽」，具備音效同步與視覺減速煞車開獎效果。

- **`src/components/ProjectorView.tsx`（大螢幕投影模式）**  
  專為現場大型 LED 屏幕或投影機設計的沉浸式模式：
  1. **左右 50% / 50% 等比對稱配置**：左側為巨型候選人滾動卡與控制列；右側為現場中獎名冊。
  2. **中獎清單固定一頁 10 位**：超出時自動分頁，開獎時自動翻頁至最新中獎頁面。
  3. **超大投影字體**：姓名、員編、部門大字體呈現，方便遠距觀眾閱讀。
  4. 支援現場直接點擊「獎項捐出」或「缺席重抽」。

- **`src/components/WinnersWall.tsx`（星光榜）**  
  得獎名冊總覽專區。將所有中獎記錄依獎項分群展示，支援依姓名、部門、員編即時搜尋過濾，並提供將完整得獎名單一鍵匯出為 Excel / CSV 檔案的功能。

- **`src/components/AdminPanel.tsx`（後台管理中心）**  
  活動後勤控制台：
  1. **同仁名單管理**：單筆新增、編輯、刪除、清空，匯入名冊與下載範本。
  2. **獎項池管理**：正規獎項與加碼獎項的配額、圖示、抽獎方式設定。
  3. **活動設定**：晚會標題、輪盤滾動時間、彩帶慶祝特效。
  4. **資料庫與備份**：下載系統完整備份 JSON、還原快照、清除中獎紀錄。

---

### 2.3 彈窗與業務處置組件 (Modals)

- **`AbsenteeRedrawModal.tsx`（缺席補抽彈窗）**  
  當已中獎同仁唱名未到或現場放棄時開啟。在原名額上標記棄權，由獨立滾動輪盤自合格候選池中抽出新得獎者遞補，並將歷程寫入中獎紀錄。
- **`AdditionalDrawModal.tsx`（現場特別加碼彈窗）**  
  長官臨時贊助時，現場快速輸入獎項名稱、獎品內容與名額，即刻生成加碼獎項並切換至加碼獎池。
- **`DonatePrizeModal.tsx`（獎項捐出彈窗）**  
  高階主管或幸運同仁好意捐出獎品時使用。系統標記該名額已捐出，釋出該獎項配額重新開抽，並依規則避免捐出者重複抽取該獎池。
- **`EmployeeImportModal.tsx`（員工名冊專屬匯入彈窗）**  
  位於後台「同仁名冊」內。提供拖曳上傳員工 Excel (`.xlsx`, `.xls`, `.csv`)，智慧容錯姓名、工號、部門欄位，提供「追加合併」與「完全覆蓋」兩種模式，並附帶一鍵下載標準員工範本功能。
- **`PrizeImportModal.tsx`（獎項清單專屬匯入彈窗）**  
  位於後台「獎項與獎品管理」內。提供拖曳上傳獎品 Excel，支援從 .xlsx 自動解包抽取內嵌商品圖片，支援「追加合併」與「完全覆蓋」，並附帶一鍵下載標準獎品範本功能。
- **`CandidateListModal.tsx`（即時抽籤候選名冊檢視彈窗）**  
  可自前台抽獎舞台或大螢幕投影即時點開。透明列出當前池內所有合格同仁、已得獎次數、第一輪缺席/捐出同仁於第二輪解鎖狀態，支援姓名/工號/部門即時搜尋。
- **`RoundTransitionModal.tsx`（平準輪次開啟確認彈窗）**  
  當第 1 輪人人有獎全數達成且獎品尚有名額時自動觸發。展示大會全體中獎率 100%、宣布即將進入第 2 輪平準抽獎、公布三大公平規則保證，由操作員確認後正式解鎖第 2 輪候選池。
- **`PrizeEditModal.tsx`（獎項設定彈窗）**  
  設定獎項基本屬性、抽獎方式（逐次/全抽）與抽獎規則（一人一獎/重複中獎）。
- **`RestoreJsonModal.tsx`**：系統快照 JSON 還原的預覽與確認介面。
- **`SecureResetModal.tsx`**：重置抽獎數據前需輸入指定驗證碼，防止現場人員誤按清空。
- **`ConfirmLoadMockModal.tsx`**：測試時快速一鍵載入示範資料。

---

### 2.4 介面導航與慶典視覺組件 (UI & Festive)

- **`Header.tsx`**：主導航列，包含活動標題、音效開關、各功能分頁切換按鈕。
- **`PrizeSelector.tsx`**：位於抽獎舞台上方的獎項輪播標籤列。
- **`FestiveHeaderBanner.tsx`**：走馬燈節慶標語橫額。
- **`FestiveIllustrations.tsx`**：手繪風格的向量金元寶、紅包袋、星光、燈籠裝飾。
- **`Mascot.tsx`**：向量生肖/吉祥物動畫組件，會隨開獎狀態切換「待命」、「開獎中」、「慶祝慶典」等表情動作。

---

### 2.5 底層工具模組 (Utilities)

- **`src/utils/soundEffects.ts`（純程式合成音效引擎）**  
  使用瀏覽器原生 **Web Audio API**，動態建立 `AudioContext` 與 `OscillatorNode`：
  - `playTick()`：滾動時的高頻短脈衝齒輪點擊聲（600Hz ~ 900Hz 方波）。
  - `startRollingSound()`：背景低頻環境輪盤滾動轟鳴。
  - `playFanfare()`：揭曉瞬間的大三和弦金屬銅管慶祝號角（Do-Mi-Sol-High Do 音階合成）。
  - `playCoinSound()`：硬幣灑落碰撞的鈴響聲。
  - **特點**：無需請求任何外部音頻檔，100% 離線可用，無網路延遲。

- **`src/utils/confettiHelper.ts`（慶典彩帶特效）**  
  封裝 `canvas-confetti`，支援多種預設慶典動效：
  - `fireGrandConfetti`：全場金紅雙側噴泉爆破。
  - `fireworkBurst`：隨機星光煙火彈跳。
  - `goldRain`：金幣碎片自畫面頂端灑落。

- **`src/utils/excelHelper.ts`**  
  使用 SheetJS 解析 Excel/CSV，支援格式容錯辨識，並將星光榜以格式化表格匯出。

- **`src/utils/excelImageExtractor.ts`**  
  使用 `jszip` 解開 `.xlsx` 檔案，尋找 `xl/media/` 資料夾中夾帶的獎品實物圖片，並轉換為 `blob` / `dataURL` 供即時預覽。

- **`src/utils/storageHelper.ts`**  
  管理 LocalStorage 中的快照儲存、版本比對與防損修復。

- **`src/utils/localBackupHelper.ts`（本機資料夾直接寫入自動備份）**  
  運用 W3C **File System Access API** (`showDirectoryPicker`)，讓使用者指定電腦本機任一目錄（如桌面或隨身碟）。每當獎項抽滿或得獎更新時，自動靜默在背景寫入格式化 JSON 備份檔（`抽獎備份_【獎項名稱】_時間.json`），結合 IndexedDB 快取授權憑證，防止電腦當機或斷電導致抽獎紀錄遺失。

- **`src/utils/mockData.ts`**  
  提供 40+ 位跨部門同仁名單（工程、營運、行銷等）與 6 級預設常態獎項。

---

## 3. 抽獎隨機邏輯 (Random Logic) 深度解析

本系統的抽獎機制由 **「合格池過濾 (Filtering) -> 隨機排序取樣 (Sampling) -> 動態減速過渡 (Animation) -> 狀態原子寫入 (Commit)」** 四個階段組成。

```
[ 全體同仁名單 (Employees) ]
           │
           ▼
┌──────────────────────────────────────────────┐
│  階段一：動態資格過濾管線 (Candidate Pipeline)  │
│  - 排除缺席棄權者 (Absentee Excluded)          │
│  - 排除獎項捐出者 (Donor Excluded)            │
│  - 排除已獲獎者 (若設定一人一獎)               │
│  - 獎池隔離 (正規池 vs 加碼池)                 │
└──────────────────────────────────────────────┘
           │
           ▼ 產出合格候選同仁清單: candidates[]
┌──────────────────────────────────────────────┐
│  階段二：隨機亂數取樣 (Objective Random Draw) │
│  - 均勻混淆洗牌 (Shuffling)                   │
│  - 截取指定配額名單 (Slice Sample)            │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  階段三：視覺與音效煞車模擬 (Deceleration)    │
│  - 前 70%：高頻快速跳動                      │
│  - 後 30%：指數減速、定格揭曉                 │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  階段四：生成防偽中獎紀錄與原子寫入 (Commit)   │
│  - 產出唯一 win-xxxx ID 與時間戳記            │
│  - 自動持久化至 LocalStorage 快照            │
└──────────────────────────────────────────────┘
```

---

### 3.1 候選同仁池動態過濾管線 (Eligibility Pipeline)

定義於 `src/App.tsx` 中的 `useMemo`，當任何名冊、紀錄或規則改變時即時運算。

**獎池隔離棄權原則 (Pool-Scoped Forfeiture Isolation)**：
- **正規獎項專區棄權**：該同仁不能在此獎池再抽到其他獎項；但進入**加碼專區**時，獎池名冊內**依然包含在正規獎項專區棄權的同仁**，保有完整加碼抽獎資格！
- **加碼專區棄權**：該同仁不可再抽其他加碼獎項。

```typescript
const candidates = useMemo(() => {
  // 1. 正規獎池已缺席棄權之同仁 ID (排除在正規池再抽獎)
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

  // 2. 加碼獎池已缺席棄權之同仁 ID (排除在加碼池再抽獎)
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

  // 加碼獎池 (Bonus Pool) 分支
  if (currentPool === 'bonus') {
    const bonusWonEmpIds = new Set(
      winningRecords
        .filter(w => w.poolType === 'bonus' || w.isAdditional)
        .map(w => w.employeeId)
    );
    // 加碼獎池已捐出之同仁不可再抽加碼池
    const bonusDonatedEmpIds = new Set(
      donationRecords.filter(d => d.fromPool === 'bonus').map(d => d.employeeId)
    );

    return employees.filter(emp => {
      // 加碼池僅排除在加碼池棄權者；在正規專區棄權者在加碼池依然具備完整抽獎資格！
      if (bonusAbsentEmpIds.has(emp.id)) return false;
      if (!allowRepeatWinning && bonusWonEmpIds.has(emp.id)) return false;
      if (bonusDonatedEmpIds.has(emp.id)) return false;
      return true;
    });
  }

  // 正規獎池 (Main Pool) 分支
  const mainWonEmpIds = new Set(
    winningRecords
      .filter(w => w.poolType !== 'bonus' && !w.isAdditional)
      .map(w => w.employeeId)
  );
  // 正規獎池已捐出之同仁不可再抽正規池
  const mainDonatedEmpIds = new Set(
    donationRecords.filter(d => d.fromPool !== 'bonus').map(d => d.employeeId)
  );

  return employees.filter(emp => {
    // 在正規獎項專區棄權者，不能在該正規獎池再抽到其他獎項
    if (mainAbsentEmpIds.has(emp.id)) return false;
    if (mainDonatedEmpIds.has(emp.id)) return false;         // 排除捐出者
    if (!allowRepeatWinning && mainWonEmpIds.has(emp.id)) {
      return false;                                           // 排除已中獎者 (一人一獎)
    }
    return true;
  });
}, [employees, absentRecords, winningRecords, donationRecords, currentPool, allowRepeatWinning, prizes]);
```

---

### 3.2 隨機抽取演算法 (Shuffling & Selection Algorithm)

在點擊開獎時，系統執行客觀隨機抽取。核心隨機函數採用現代 JavaScript 引擎底層 PRNG（虛擬隨機數生成器，在 V8 / WebKit 中基於 **xorshift128+** 演算法，具備週期極長、均勻離散分佈的數學特性）：

```typescript
// 1. 複製當前合格候選池並進行亂數打散洗牌 (Array Shuffle)
const shuffled = [...candidates].sort(() => 0.5 - Math.random());

// 2. 取出本次開獎所需的名額數量 (countToDraw)
const selectedEmployees = shuffled.slice(0, countToDraw);
```

- **公平性驗證**：在候選人長度為 $N$ 的陣列中，任意同仁被排在第一位的機率為 $P = \frac{1}{N}$。
- **無重覆保障**：同一批次中抽取的同仁是由洗牌後的陣列執行切片（`slice`），同一批開出之名單彼此獨立且**絕不重複**。

---

### 3.3 逐次連抽 vs 一次全抽隨機模型

大螢幕模式提供兩種開獎模式：

1. **一次全抽（Batch Draw / All-in）**：
   - 預先截取 `countToDraw` 位中獎人。
   - 滾動過程中畫面不斷隨機顯示同仁以製造視覺緊張感：
     ```typescript
     const poolCandidate = candidates[Math.floor(Math.random() * candidates.length)];
     setDisplayCandidate(poolCandidate);
     ```
   - 時間到後定格，一次將所有中獎名額寫入名冊。

2. **逐次連抽（Sequential Draw）**：
   - 先將池中候選人進行隨機洗牌存入暫存佇列：
     ```typescript
     sequentialRemainingCandidatesRef.current = [...candidates].sort(() => 0.5 - Math.random());
     ```
   - 透過遞迴定時器，逐位進行單人滾動（約 1.8 秒）。
   - 每位得獎人揭曉時從佇列首端彈出：
     ```typescript
     const winnerEmp = sequentialRemainingCandidatesRef.current.shift()!;
     ```
   - 即時將該名得獎人寫入全局狀態，並自動觸發名冊更新與翻頁。
   - 系統自動啟動下一名抽取，直到該獎項名額全部抽完為止。

---

### 3.4 缺席棄權補抽隨機機制

當原中獎人缺席或放棄時，觸發 `AbsenteeRedrawModal.tsx`：
1. 該名中獎同仁被移入 `absentRecords`，並在舊紀錄上標記棄權。
2. 系統重新計算剩餘合格候選人（自動剔除棄權同仁與不符規則者）。
3. 抽出替補得獎人：
   ```typescript
   const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
   const finalWinner = eligibleCandidates[randomIndex];
   ```
4. 產生帶有 `replacesAbsenteeId` 標記的新中獎紀錄，完成名額遞補。

---

### 3.5 物理減速煞車滾動動畫演算法 (Deceleration Easing Curve)

為模擬實體輪盤轉動時由疾速至減速停止的物理慣性，系統採用時間進度比例 ($progress = \frac{elapsed}{duration}$) 與非線性指數曲線（Quadratic Easing）：

```typescript
// progress 從 0 (開始) 增長至 1 (定格)
const progress = Math.min(elapsed / durationMs, 1);

// 動態計算下次跳動的間隔毫秒 (delay / interval)
if (progress < 0.65) {
  // 前 65% 時間：維持 40ms 超高頻極速跳動
  delay = 40;
} else {
  // 後 35% 時間：按二次方指數快速遞增間隔，產生明顯的「剎車」沉降感
  const brakeProgress = (progress - 0.65) / 0.35; // 0 ~ 1
  delay = 40 + Math.pow(brakeProgress, 2) * 350;  // 40ms 漸變至 390ms
}

rollingTimerRef.current = setTimeout(runRoll, delay);
```

- **前段**：每秒刷新約 25 次，同仁姓名如幻燈片飛速閃爍，搭配齒輪音效。
- **後段**：姓名停留時間迅速拉長，最後一兩位同仁緩慢滑過，最後穩穩停在中獎者姓名上，營造最高潮之現場氛圍。

---

### 3.6 唯一識別碼與防偽稽核機制 (Audit Trace)

每筆中獎紀錄均生成由時間戳記與 36 進制高熵亂數組成的唯一標識：

```typescript
const recordId = `win-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
```

- 紀錄包含：中獎人 ID、工號、姓名、部門、中獎時精確毫秒戳記 (`timestamp`)、獎項 ID、獎品名稱、是否為加碼或補抽。
- 所有中獎紀錄存入 LocalStorage，即使中途意外重新整理網頁、關閉瀏覽器或投影片切換，資料亦毫髮無損。

---

### 3.7 獎池抽完但獎品尚存應對機制 (Candidate Pool Exhausted Handling)

當名冊合格人數少於獎品總配額（`candidates.length === 0 && remainingQuota > 0`），系統將自動啟動 `isPoolExhausted` 引導機制：
1. **主舞台與大螢幕提示**：吉祥物及狀態列顯示「全員已獲獎！」，告知主持人與控台目前已無未中獎同仁。
2. **現場即時處置方案**：
   - **方案 A（解鎖第二輪平準抽獎・推薦首選）**：設定 `repeatWinningMode = 'fair_round'`，全員皆可抽剩餘獎品，但每人在第二輪限中一次！一旦中第 2 次立即排除，絕不超抽連莊，直到全體滿 2 獎才開第 3 輪。
   - **方案 A-2（完全自由重複）**：設定 `repeatWinningMode = 'unlimited'`，完全不限制中獎次數。
   - **方案 B（一鍵下修名額結案）**：調用 `handleAdjustPrizeQuota`，直接將獎項名額調整為目前已開出數，乾淨結案該獎項。
   - **方案 C（匯入第二批/遞補名冊）**：點擊跳轉至後台管理專區（Admin Panel），即時上傳或補填外部嘉賓/新進同仁名單。
   - **方案 D（轉入加碼抽獎專區）**：保留剩餘獎項，直接切換至「加碼專區」供現場長官另外指定或全體再抽。

---

### 3.7.1 平準輪次抽獎數學模型 (Round-Robin Fair Capped Draw Algorithm)

為滿足「全體都中過獎後，全員皆可再抽剩下的獎品，但每人本輪限中一次，絕不可有人中 3 次而其他人只有 1 次」之嚴格公平性需求，系統設計了動態平準極小值過濾演算法：

```typescript
// 1. 取得當前獎池所有合格同仁之已中獎次數分布
const winCounts = new Map<string, number>();
winningRecords
  .filter(w => isBonus ? (w.poolType === 'bonus' || w.isAdditional) : (w.poolType !== 'bonus' && !w.isAdditional))
  .forEach(w => {
    winCounts.set(w.employeeId, (winCounts.get(w.employeeId) || 0) + 1);
  });

// 2. 計算全體合格同仁中的最低中獎次數 (minWins)
const minWins = eligibleEmployees.reduce((min, emp) => {
  const count = winCounts.get(emp.id) || 0;
  return count < min ? count : min;
}, Infinity);

// 3. 嚴格過濾：僅允許目前得獎次數 === minWins 的同仁進入候選抽籤池！
const candidates = eligibleEmployees.filter(emp => {
  const count = winCounts.get(emp.id) || 0;
  return count === minWins;
});
```

* **數學保證**：
  - **第一輪保護期**：所有未曾獲獎的合格同仁（$count = 0$）享有第一輪優先獲獎權。在此期間，第一輪「缺席棄權」或「捐出獎項」之同仁暫時排除，確保不擠佔其他尚未得獎同仁的第一份基本權益。
  - **第二輪全面解鎖（含缺席與捐出同仁）**：當所有未缺席/未捐出的同仁皆完成第一輪獲獎時，系統判定第一輪圓滿結束（`round1Pending.length === 0`），自動無縫解鎖第二輪（$Round = 2$）！
  - **第二輪平準資格分流**：
    - **第一輪已正常獲獎同仁**：本輪上限為 2 份，中獎後累計達 2 份即自動退出第二輪候選池。
    - **第一輪捐出或缺席同仁**：因第一輪並無實質保有獎項（保留數為 0 份），在第二輪中獲獎後累計達 1 份，即達本輪上限並退出第二輪候選池。
  - **絕不跳級**：在任何時刻，全公司同仁實質保有之獎項差距永遠 $\le 1$，愛心捐出與缺席同仁在第二輪亦能獲得公平的再參與機會，絕對符合人性與活動現場常理。
  - **自動晉級彈窗防線 (Round Transition Modal Barrier)**：當第 1 輪抽完全員人人有獎時，系統自動阻斷誤按連抽，並由全局偵測器立即彈出《第 2 輪平準抽獎開啟確認彈窗》（`RoundTransitionModal.tsx`）。彈窗內列出全體同仁達成率、三大規則保證與現場主持人引導話術，由控台或主持人點擊「確認開啟第 2 輪平準抽獎」後，正式解除安全鎖定並全體解鎖開跑。同時在大螢幕與主舞台常駐輪次徽章，支援隨時點擊回顧規則說明。

---

## 總結

本系統結合了**嚴謹的集合過濾邏輯**（保證資格正確性與池隔離）、**客觀公平的均勻離散隨機取樣**（保證人人機會均等）、**擬真物理減速煞車動畫**（營造晚會高潮氣氛），以及**高容錯快照存檔機制**，是一套穩定、透明且值得信賴的專業抽獎架構。
