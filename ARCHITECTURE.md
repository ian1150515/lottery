# 抽獎系統架構說明書與隨機演算法技術文件
**系統版本**：v1.2.0 (Gala Lottery Pro)  
**更新日期**：2026 年 11 月  

本文件詳細說明系統之整體軟體架構、各模組檔案（Components / Utilities / Types / Configs）之核心功能職責，以及系統內部完整的**「Fisher-Yates 洗牌抽獎演算法（Random Logic）」**與候選人過濾管線。

---

## 目錄
1. [系統技術棧與架構總覽](#1-系統技術棧與架構總覽)
2. [原始碼目錄檔案職責一覽](#2-原始碼目錄檔案職責一覽)
   - [2.1 核心入口與全域狀態](#21-核心入口與全域狀態)
   - [2.2 四大核心視圖 (Views)](#22-四大核心視圖-views)
   - [2.3 彈窗與業務處置組件 (Modals)](#23-彈窗與業務處置組件-modals)
   - [2.4 介面導航與慶典視覺組件 (UI & Festive)](#24-介面導航與慶典視覺組件-ui--festive)
   - [2.5 底層工具模組 (Utilities)](#25-底層工具模組-utilities)
   - [2.6 CI/CD 與部署配置](#26-cicd-與部署配置)
3. [抽獎隨機邏輯 (Random Logic) 深度解析](#3-抽獎隨機邏輯-random-logic-深度解析)
   - [3.1 傳統寫法缺陷與 Fisher-Yates + Web Crypto 演算法升級](#31-傳統寫法缺陷與-fisher-yates--web-crypto-演算法升級)
   - [3.2 候選同仁池動態過濾管線 (Eligibility Pipeline)](#32-候選同仁池動態過濾管線-eligibility-pipeline)
   - [3.3 逐次連抽 vs 一次全抽隨機模型](#33-逐次連抽-vs-一次全抽隨機模型)
   - [3.4 缺席棄權補抽隨機機制](#34-缺席棄權補抽隨機機制)
   - [3.5 物理減速煞車滾動動畫演算法 (Deceleration Easing Curve)](#35-物理減速煞車滾動動畫演算法-deceleration-easing-curve)
   - [3.6 唯一識別碼與防偽稽核機制 (Audit Trace)](#36-唯一識別碼與防偽稽核機制-audit-trace)
   - [3.7 平準輪次抽獎數學模型 (Round-Robin Fair Capped Draw)](#37-平準輪次抽獎數學模型-round-robin-fair-capped-draw)

---

## 1. 系統技術棧與架構總覽

本系統為專為大型宴會、尾牙聯歡晚會、春酒盛典設計之**高可用純前端單頁應用（SPA）**，具備離線運行、高對比大螢幕投射與無外部音效檔依賴等特點。

- **前端框架**：React 19 + TypeScript 5.8 + Vite 6
- **排版與樣式**：Tailwind CSS v4 + 自訂慶典特效動畫（金紅漸層、高亮發光、旋轉閃爍）
- **動畫渲染**：Framer Motion (`motion/react`)
- **圖示庫**：Lucide React
- **抽獎隨機核心**：Fisher-Yates 洗牌演算法 + Web Crypto API (CSPRNG) + 拒絕取樣
- **音效引擎**：Web Audio API 純代碼合成音頻震盪器（零外部 MP3/WAV 網路依賴）
- **慶典特效**：Canvas Confetti（禮花爆破、金幣雨、彩帶噴泉）
- **試算表處理**：SheetJS (XLSX) + JSZip（支援名冊匯入、圖片自動解壓縮抽取、中獎匯出）
- **持久化層**：HTML5 LocalStorage 附版本控管快照機制 ＋ W3C File System Access API 本機檔案自動備份

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
│   ├── ProjectorView.tsx        # 大螢幕投影專用模式（下拉直選、步進按鈕、鍵盤快捷鍵）
│   ├── PrizeSelector.tsx        # 67+ 獎項自適應折疊切換導覽（預設折疊、狀態篩選）
│   ├── WinnersWall.tsx          # 星光榜（得獎名冊、表格結構、搜尋、匯出）
│   ├── AdminPanel.tsx           # 後台管理中心（名冊、獎項、參數設定）
│   ├── EmployeeImportModal.tsx  # 員工名冊專屬 Excel 匯入與範本彈窗
│   ├── PrizeImportModal.tsx     # 獎項清單專屬 Excel 匯入與範本彈窗（含圖片解包）
│   ├── PrizeEditModal.tsx       # 獎項新增與編輯彈窗（配額、圖片、方式）
│   ├── AbsenteeRedrawModal.tsx  # 缺席補抽彈窗（標記棄權、無偏獨立補抽）
│   ├── AdditionalDrawModal.tsx  # 現場特別加碼彈窗（即時建立加碼獎項）
│   ├── DonatePrizeModal.tsx     # 獎項捐出確認彈窗（釋出名額供重抽）
│   ├── CandidateListModal.tsx   # 即時抽籤候選名冊檢視彈窗
│   ├── RoundTransitionModal.tsx # 平準輪次自動解鎖與開啟確認彈窗
│   ├── RestoreJsonModal.tsx     # 系統 JSON 快照還原預覽彈窗
│   ├── SecureResetModal.tsx     # 雙重驗證安全性重置彈窗
│   ├── ConfirmLoadMockModal.tsx # 載入示範資料確認彈窗
│   ├── FestiveHeaderBanner.tsx  # 走馬燈節慶標語橫額（選用備用組件）
│   ├── FestiveIllustrations.tsx # 向量慶典插畫（元寶、紅包、星光、燈籠）
│   └── Mascot.tsx               # 向量吉祥物狀態動畫
│
└── utils/                       # 核心輔助工具函式庫
    ├── lotteryRandom.ts         # 【核心演算法】Fisher-Yates 洗牌與 Web Crypto 安全隨機取樣
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
  5. 負責 LocalStorage 自動備份快照 (`StorageSnapshotData`) 與 File System Access API 儲存。

- **`src/types.ts`**  
  定義全系統資料型態契約：`Employee`、`Prize`、`WinningRecord`、`AbsentRecord`、`DonationRecord`、`RepeatWinningMode` 等。

- **`src/index.css`**  
  全域 Tailwind 指令及客製化慶典按鈕（`festive-gold-btn`）、光影流動動畫（`shimmer`）。

---

### 2.2 四大核心視圖 (Views)

- **`src/components/DrawStage.tsx`（舞台抽獎模式）**  
  主持人主要操作介面。包含大型動態輪盤滾動卡、獎品縮圖與配額統計、快速切換獎項按鈕，支援「單人抽取」與「一次全抽」，核心呼叫 `drawRandomWinners` 進行無偏抽籤，具備音效同步與視覺減速煞車開獎效果。

- **`src/components/ProjectorView.tsx`（大螢幕投影模式）**  
  專為現場大型 LED 屏幕或投影機設計的沉浸式模式：
  1. **左右 50% / 50% 等比對稱配置**：左側為巨型候選人滾動卡與控制列；右側為現場中獎名冊（固定一頁 10 位）。
  2. **全獎項直選下拉選單 (Popover)**：點擊頂部中央獎項，即展開所有獎項清單，標示進度（已完抽 / 進行中剩餘 X 名 / 待抽）一鍵直達。
  3. **快捷鍵控制**：`←` / `→` 切換獎項、`P` 鍵展開選單、`Space` 開始/暫停抽獎、`ESC` 關閉選單或返回舞台。
  4. 支援現場直接點擊「獎項捐出」或「缺席重抽」。

- **`src/components/PrizeSelector.tsx`（67+ 獎項自適應折疊切換導覽）**  
  位於抽獎舞台上方的獎項輪播標籤列：
  1. **預設精簡模式 (Collapsed)**：高度僅約 65px，確保下方抽獎舞台不被推擠，顯示當前獎項卡片預覽與快速 `‹` `›` 步進切換。
  2. **展開檢視模式 (Expanded)**：點擊「展開全部獎項」平滑呈現網格，支援「全部」、「待抽/進行中」、「已抽完」三態過濾。

- **`src/components/WinnersWall.tsx`（星光榜）**  
  得獎名冊總覽專區。採用結構化 HTML 表格分群展示，支援依姓名、部門、員編即時搜尋過濾，並提供一鍵匯出 Excel / CSV 檔案。

- **`src/components/AdminPanel.tsx`（後台管理中心）**  
  活動後勤控制台：包含同仁名冊管理、獎項清單管理、活動標題與節奏設定、手動備份 JSON 匯入匯出與重置。

---

### 2.3 彈窗與業務處置組件 (Modals)

- **`EmployeeImportModal.tsx`（員工名冊專屬匯入彈窗）**：位於後台「同仁名冊」內。支援拖曳 Excel/CSV 上傳、自動欄位比對、下載範本、追加合併與完全覆蓋。
- **`PrizeImportModal.tsx`（獎項清單專屬匯入彈窗）**：位於後台「獎項管理」內。支援拖曳獎項 Excel 上傳、從 `.xlsx` 壓縮包自動提取商品圖片、設定配額與抽獎方式。
- **`AbsenteeRedrawModal.tsx`（缺席補抽彈窗）**：唱名三次未到時，標記棄權並使用 `drawSingleWinner` 無偏補抽新得主。
- **`AdditionalDrawModal.tsx`（現場特別加碼彈窗）**：長官臨時贊助時，現場快速新增獎項並切換至加碼池。
- **`DonatePrizeModal.tsx`（獎項捐出彈窗）**：同仁好意捐出獎品時釋出配額供重抽。
- **`RoundTransitionModal.tsx`（平準輪次開啟確認彈窗）**：第 1 輪人人有獎全數達成後自動跳出，確認後解鎖第 2 輪平準抽獎。

---

### 2.5 底層工具模組 (Utilities)

- **`src/utils/lotteryRandom.ts`（抽獎核心演算法模組）**  
  - `fisherYatesShuffle<T>(items)`：純函數實作 Durstenfeld 版 Fisher-Yates 洗牌。
  - `getSecureRandomInt(max)`：使用 `crypto.getRandomValues` 搭配拒絕取樣排除模數偏差。
  - `drawRandomWinners<T>(candidates, count)`：批次公平抽出多名得獎者。
  - `drawSingleWinner<T>(candidates)`：單名抽出公平取樣。

- **`src/utils/soundEffects.ts`（Web Audio API 純代碼合成音效引擎）**  
  100% 離線可用，透過音頻震盪器合成點擊齒輪聲、號角樂曲與硬幣鈴聲。

- **`src/utils/localBackupHelper.ts`（本機資料夾直接寫入自動備份）**  
  利用 File System Access API 在本機磁碟直接保存 JSON 備份檔，防止斷電或當機。

---

### 2.6 CI/CD 與部署配置

- **`.github/workflows/deploy.yml`**：  
  GitHub Actions 自動化部署工作流程。運行於 `ubuntu-24.04` 環境，使用 `Node.js 22`，自動執行 `npm run lint` 型別檢查與 `npm run build` 打包，並自動發布至 GitHub Pages。
- **`vite.config.ts`**：  
  設定 `base: './'` 相對路徑，保證專案發布於 GitHub Pages 子路徑時靜態資源均能正確讀取。

---

## 3. 抽獎隨機邏輯 (Random Logic) 深度解析

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
│  階段二：Fisher-Yates 密碼學安全隨機取樣      │
│  - Web Crypto API (crypto.getRandomValues)   │
│  - 拒絕取樣 (Rejection Sampling 排除模數偏差) │
│  - Fisher-Yates O(N) 均勻洗牌                │
│  - 截取指定配額名單: drawRandomWinners()       │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  階段三：視覺與音效煞車模擬 (Deceleration)    │
│  - 前 65%：40ms 高頻極速跳動                 │
│  - 後 35%：二次方指數煞車、定格揭曉            │
└──────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  階段四：生成防偽中獎紀錄與原子寫入 (Commit)   │
│  - 產出唯一 win-xxxx ID 與時間戳記            │
│  - 自動持久化至 LocalStorage 快照            │
│  - 本機資料夾背景靜默寫入備份檔              │
└──────────────────────────────────────────────┘
```

---

### 3.1 傳統寫法缺陷與 Fisher-Yates + Web Crypto 演算法升級

過去許多抽獎系統採用簡易的陣列排序隨機：
```javascript
// ❌ 存在重大數學偏差的反模式（本系統已徹底廢除）：
const winners = candidates.sort(() => 0.5 - Math.random()).slice(0, count);
```
**缺陷分析**：
1. **破壞排序傳遞律**：JavaScript 引擎（如 V8 TimSort）要求比較函數符合傳遞律。隨機正負值會導致二元搜尋樹排序混亂，特定索引位置被抽中的機率高達原本的 1.5 倍至 2 倍。
2. **偽隨機數缺陷**：`Math.random()` 僅是簡單演算法，種子週期固定，理論上可被推算。

**現行解決方案 (`src/utils/lotteryRandom.ts`)**：
```typescript
export function getSecureRandomInt(max: number): number {
  if (max <= 1) return 0;
  const uint32 = new Uint32Array(1);
  const maxUint32 = 0xffffffff;
  const limit = maxUint32 - (maxUint32 % max); // 排除模數偏差
  let rand = 0;
  do {
    window.crypto.getRandomValues(uint32);
    rand = uint32[0];
  } while (rand >= limit);
  return rand % max;
}

export function fisherYatesShuffle<T>(items: T[]): T[] {
  const result: T[] = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
```
**數學保證**：長度為 $N$ 的陣列，其全部 $N!$ 種排列組合中，每一種排列出現的機率嚴格等於 $\frac{1}{N!}$。

---

### 3.2 候選同仁池動態過濾管線 (Eligibility Pipeline)

定義於 `src/App.tsx` 中的 `useMemo`：
- **正規獎項專區棄權**：該同仁不能在此獎池再抽到其他獎項；但進入**加碼專區**時，獎池名冊內**依然包含在正規獎項專區棄權的同仁**，保有加碼資格！
- **加碼專區棄權**：該同仁不可再抽其他加碼獎項。

---

### 3.5 物理減速煞車滾動動畫演算法 (Deceleration Easing Curve)

系統採用二次方非線性指數曲線（Quadratic Easing）：
```typescript
const progress = Math.min(elapsed / durationMs, 1);
if (progress < 0.65) {
  delay = 40; // 前 65% 時間：維持 40ms 極速跳動
} else {
  const brakeProgress = (progress - 0.65) / 0.35;
  delay = 40 + Math.pow(brakeProgress, 2) * 350; // 後 35% 漸變至 390ms
}
rollingTimerRef.current = setTimeout(runRoll, delay);
```

---

### 3.7 平準輪次抽獎數學模型 (Round-Robin Fair Capped Draw)

全體同仁中過第 1 輪後，系統啟動平準極小值過濾演算法（`minWins`）：
- 確保所有同仁實質保有之獎項差距永遠 $\le 1$。
- 第 1 輪全數完成後，彈出《第 2 輪平準抽獎開啟確認彈窗》（`RoundTransitionModal.tsx`），由控台確認後正式開啟第 2 輪。
