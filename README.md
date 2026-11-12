# 🎊 企業年會與尾牙智能抽獎系統 (Gala Lottery Pro)

![GitHub Actions Workflow](https://img.shields.io/badge/Deploy-GitHub%20Pages-success?logo=github-actions&style=flat-square)
![React](https://img.shields.io/badge/React-19-blue?logo=react&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss&style=flat-square)
![License](https://img.shields.io/badge/License-MIT-amber?style=flat-square)

專為企業尾牙、春酒盛典、晚會聯歡與福委會年會設計的**現代化純前端智能抽獎與活動控台系統**。
具備「高雅熱鬧慶典視覺」、「密碼學安全公平抽獎演算法」、「67+ 大量獎項自適應折疊排版」、「大螢幕 LED 投影模式」與「本機即時備份與快照防損」等企業級規格。

---

## 🌟 核心特色 (Core Features)

### 1. 🎲 數學證明絕對公平抽獎演算法 (Fisher-Yates + Web Crypto)
* **Fisher-Yates (Knuth) 洗牌演算法**：時間複雜度 $O(N)$，數學嚴格證明每種排列出現機率完全相等（$1/N!$）。
* **Web Crypto API (CSPRNG)**：呼叫瀏覽器原生 `crypto.getRandomValues` 密碼學安全硬體熵源，防止人為預測。
* **無模數偏差 (No Modulo Bias)**：採用拒絕取樣技術（Rejection Sampling），排除整數取餘數的機率傾斜。
* **多模式支援**：舞台單抽、一次全抽、大螢幕逐次連抽，以及缺席棄權補抽均全面套用。

### 2. 🖥️ 大螢幕 LED 投影模式 (Projector View)
* **對稱視覺排版**：左側超大候選人即時滾動卡（大字體遠距易讀），右側分頁式中獎名冊（一頁 10 位）。
* **全獎項直選下拉選單**：支援點擊頂部展開全獎項 Popover，標示獎項進度（`待抽`、`進行中 (餘 X 名)`、`已完抽`）一鍵直達。
* **控台快捷鍵**：支援 `←` / `→` 切換獎項、`P` 鍵開啟獎項選單、`Space` 開始/暫停抽獎、`ESC` 退出或關閉選單。
* **現場緊急處置**：大螢幕現場直接支援「唱名未到缺席重抽」與「長官愛心捐出再抽」。

### 3. 📦 67+ 大量獎項自適應折疊導覽 (Prize Selector)
* **預設精簡收合模式 (~65px)**：進入首頁自動收合獎項卡片，開屏即見核心抽獎舞台，解決獎品過多造成頁面無限拉長的痛點。
* **當前獎項即時預覽**：提供快速 `‹` `›` 步進切換按鈕，免展開即可依序開獎。
* **一鍵展開完整總覽**：提供 `展開全部獎項`，附帶狀態過濾標籤（`全部`、`待抽/進行中`、`已抽完`），點擊卡片平滑切換。

### 4. 📂 Excel 匯入情境化拆分 (Data Management)
* **同仁名冊專屬匯入 (`EmployeeImportModal`)**：後台員工管理專區獨立支援工號、姓名、部門的 Excel/CSV 拖曳匯入、欄位模糊辨識、範本下載、追加合併與完全覆蓋。
* **獎項獎品專屬匯入 (`PrizeImportModal`)**：獎項管理專區獨立支援獎品清單匯入，支援從 `.xlsx` 壓縮包自動提取商品內嵌圖片與配額設定。

### 5. 🛡️ 雙軌資料備份與防當機復原 (Reliability)
* **LocalStorage 自動快照**：每次抽獎後毫秒級自動持久化儲存，意外重新整理、關閉分頁均不丟失紀錄。
* **本機資料夾直接寫入備份 (File System Access API)**：指定隨身碟或桌面資料夾，每抽完一個獎項自動背景靜默儲存 JSON 備份檔。
* **多輪抽獎平準機制 (Fair Round)**：全體人人有獎後，自動防呆阻斷並可無縫開啟第 2 輪平準抽獎，確保每人獲獎差距永遠 $\le 1$。

---

## 🎨 介面視覺規範 (Visual & Theme)

* **慶典配色**：採用「典雅深棗紅 (`#240307` ➔ `#180104`)」搭配「璀璨亮金 (`#facc15`、`#eab308`)」與「烈焰朱紅 (`#dc2626`)」。
* **純程式合成音效 (Web Audio API)**：零外部 MP3/WAV 依賴，內建齒輪滾動點擊聲（Tick）、金屬號角慶祝奏樂（Fanfare）與金幣碰撞聲。
* **動態粒子特效 (Canvas Confetti)**：提供雙側彩帶加農砲、流金星辰雨、滿堂吉慶花雨等多種隨機/指定特效。

---

## 🚀 快速開始 (Getting Started)

### 環境需求
* **Node.js**：建議 20.x 或 22.x LTS 以上
* **套件管理工具**：`npm` (隨附於 Node.js)

### 安裝與啟動
```bash
# 1. 複製專案庫
git clone https://github.com/your-username/lottery.git
cd lottery

# 2. 安裝套件
npm install

# 3. 啟動本機開發伺服器
npm run dev
# 瀏覽器造訪 http://localhost:3000
```

### 生產環境編譯
```bash
npm run build
# 打包產物輸出至 dist/ 目錄
```

### 靜態程式碼檢查
```bash
npm run lint
```

---

## 💻 自動打包 Windows .exe 執行檔 (GitHub Actions)

本專案配置了專屬的 GitHub Actions 自動打包工作流程（`.github/workflows/build-exe.yml`）：

1. **自動觸發**：
   - 每當推送程式碼至 `main` 或 `master` 分支時，GitHub Actions 會自動在 Windows 虛擬機環境中打包。
   - 支援打 Tag 發布（例如 `git tag v1.0.0 && git push --tags`），系統會自動產出 GitHub Release。
2. **下載方式**：
   - 前往 GitHub 儲存庫的 **「Actions」** 分頁。
   - 點擊最新的 **「Build Windows Executable (.exe)」** 執行紀錄。
   - 在頁面下方的 **Artifacts（產物）** 區域，即可直接下載包含 **安裝版（NSIS Setup .exe）** 與 **免安裝免設定的綠色可執行版（Portable .exe）**！

---

## 📂 專案檔案結構 (Directory Structure)

```
lottery/
├── .github/workflows/
│   ├── deploy.yml               # GitHub Pages 網頁自動化部署
│   └── build-exe.yml            # Windows .exe 自動打包建置流程
├── electron/
│   └── main.cjs                 # Electron 桌面端主程序設定
├── public/                      # 靜態資源（吉祥物圖片、字型、示範檔案）
├── src/
│   ├── components/              # React 功能模組與業務視圖
│   │   ├── DrawStage.tsx        # 舞台抽獎模式（跑馬燈與開獎）
│   │   ├── ProjectorView.tsx    # 大螢幕 LED 投影模式（下拉直選、快捷鍵）
│   │   ├── PrizeSelector.tsx    # 67+ 獎項自適應折疊切換列
│   │   ├── WinnersWall.tsx      # 中獎星光榜（表格呈現、Excel/CSV 匯出）
│   │   ├── AdminPanel.tsx       # 後台管理中心（分頁式管理）
│   │   ├── EmployeeImportModal  # 同仁名冊專屬 Excel 匯入
│   │   ├── PrizeImportModal     # 獎項清單專屬 Excel 匯入（含圖片解包）
│   │   ├── AbsenteeRedrawModal  # 缺席棄權公平補抽彈窗
│   │   └── RoundTransitionModal # 第 2 輪平準抽獎開啟確認彈窗
│   ├── utils/                   # 核心工具函式庫
│   │   ├── lotteryRandom.ts     # Fisher-Yates + Web Crypto 抽獎核心演算法
│   │   ├── soundEffects.ts      # Web Audio API 合成音效引擎
│   │   ├── confettiHelper.ts    # 慶典彩花雨特效控制器
│   │   ├── excelHelper.ts       # SheetJS 資料解析與匯出
│   │   └── localBackupHelper.ts # 本機資料夾自動備份模組
│   ├── types.ts                 # 系統 TypeScript 型別定義契約
│   ├── App.tsx                  # 全域狀態管理與主控制中心
│   └── main.tsx                 # 應用程式掛載入口
├── ARCHITECTURE.md              # 系統完整架構與演算法技術文件
├── CHANGELOG_UPDATE_SUMMARY.md  # 近期改版歷程與升級重點記錄
└── vite.config.ts               # Vite 建置設定（支援相對路徑部署）
```

---

## 📄 相關技術文件

* [系統架構與隨機演算法深度解析 (ARCHITECTURE.md)](./ARCHITECTURE.md)
* [抽獎演算法數學原理與業務問答說明書 (lottery_algorithm_documentation.md)](./lottery_algorithm_documentation.md)
* [近期功能改版總結報告 (CHANGELOG_UPDATE_SUMMARY.md)](./CHANGELOG_UPDATE_SUMMARY.md)

---

## 📜 授權協議 (License)

本專案基於 [MIT License](./LICENSE) 開源授權。
