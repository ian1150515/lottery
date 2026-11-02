import { StorageSnapshotData } from './storageHelper';

let localDirectoryHandle: any = null;
let localDirectoryName: string = localStorage.getItem('gala_backup_dir_name') || '';
let lastBackupTimestamp: number | null = null;
let lastBackupFileName: string = '';

const STORAGE_KEY_AUTO_FOLDER = 'gala_auto_folder_backup_enabled';
const STORAGE_KEY_AUTO_DOWNLOAD = 'gala_auto_download_backup_enabled';

// IndexedDB persistence for FileSystemHandle
const DB_NAME = 'gala_backup_idb';
const STORE_NAME = 'handles';

function getDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not supported'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandleToDb(handle: any) {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, 'backup_dir');
  } catch (err) {
    console.warn('Could not save dir handle to IndexedDB:', err);
  }
}

/**
 * Attempt to restore directory handle from IndexedDB on startup
 */
export async function tryRestoreDirectoryHandle(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) return false;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('backup_dir');
      req.onsuccess = async () => {
        const handle = req.result;
        if (handle) {
          try {
            if (handle.queryPermission) {
              const status = await handle.queryPermission({ mode: 'readwrite' });
              if (status === 'granted') {
                localDirectoryHandle = handle;
                localDirectoryName = handle.name || '本機備份資料夾';
                resolve(true);
                return;
              }
            }
          } catch {
            // Permission check failed
          }
        }
        resolve(false);
      };
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Check if the browser supports the File System Access API (showDirectoryPicker)
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Ask user to pick a local folder on their computer for automatic backups
 */
export async function selectBackupDirectory(): Promise<{ success: boolean; dirName?: string; error?: string }> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      error: '此瀏覽器不支援本機資料夾直接寫入 API（建議使用 Google Chrome 或 Microsoft Edge）',
    };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'desktop',
    });

    localDirectoryHandle = handle;
    localDirectoryName = handle.name || '本機備份資料夾';
    localStorage.setItem('gala_backup_dir_name', localDirectoryName);
    setAutoFolderBackupEnabled(true);
    await saveHandleToDb(handle);

    return {
      success: true,
      dirName: localDirectoryName,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: '已取消選擇資料夾' };
    }
    return {
      success: false,
      error: err?.message || '選擇資料夾失敗',
    };
  }
}

/**
 * Disconnect local folder handle
 */
export function disconnectBackupDirectory(): void {
  localDirectoryHandle = null;
  localDirectoryName = '';
  localStorage.removeItem('gala_backup_dir_name');
  getDb().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('backup_dir');
  }).catch(() => {});
}

export function getConnectedDirectoryName(): string {
  return localDirectoryName;
}

export function hasConnectedDirectory(): boolean {
  return Boolean(localDirectoryHandle && localDirectoryName);
}

export function getLastBackupTime(): number | null {
  return lastBackupTimestamp;
}

export function getLastBackupFileName(): string {
  return lastBackupFileName;
}

export function isAutoFolderBackupEnabled(): boolean {
  const val = localStorage.getItem(STORAGE_KEY_AUTO_FOLDER);
  return val === null ? true : val === 'true'; // Default true
}

export function setAutoFolderBackupEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_AUTO_FOLDER, String(enabled));
}

export function isAutoDownloadBackupEnabled(): boolean {
  const val = localStorage.getItem(STORAGE_KEY_AUTO_DOWNLOAD);
  return val === 'true'; // Default false unless enabled
}

export function setAutoDownloadBackupEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_AUTO_DOWNLOAD, String(enabled));
}

function formatSafeDateTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${hh}${mm}${ss}`;
}

/**
 * Execute automatic backup directly into the chosen local folder
 */
export async function performAutoFolderBackup(
  snapshot: StorageSnapshotData,
  prizeLabel?: string
): Promise<{ success: boolean; fileName?: string; fallbackDownload?: boolean; error?: string }> {
  lastBackupTimestamp = Date.now();
  const timeStr = formatSafeDateTime();
  const safePrizeName = prizeLabel ? `_${prizeLabel.replace(/[\\/:*?"<>|]/g, '_')}` : '';

  // 1. If FileSystem Directory Handle is available, write directly to user's OS folder
  if (localDirectoryHandle && isAutoFolderBackupEnabled()) {
    try {
      // Always maintain a "latest" snapshot file in that folder
      const latestFileHandle = await localDirectoryHandle.getFileHandle(
        '抽獎最新備份_即時自動同步.json',
        { create: true }
      );
      const writableLatest = await latestFileHandle.createWritable();
      await writableLatest.write(JSON.stringify(snapshot, null, 2));
      await writableLatest.close();

      // Also create a timestamped archive record file
      const archiveFileName = `抽獎備份${safePrizeName}_${timeStr}.json`;
      const archiveFileHandle = await localDirectoryHandle.getFileHandle(
        archiveFileName,
        { create: true }
      );
      const writableArchive = await archiveFileHandle.createWritable();
      await writableArchive.write(JSON.stringify(snapshot, null, 2));
      await writableArchive.close();

      lastBackupFileName = archiveFileName;

      return {
        success: true,
        fileName: archiveFileName,
      };
    } catch (err: any) {
      console.warn('Direct local folder write failed, handle may have expired permission:', err);
      // Fall through to auto-download if enabled
    }
  }

  // 2. If directory handle is not set or write failed, check if auto-download fallback is enabled
  if (isAutoDownloadBackupEnabled()) {
    try {
      triggerDownloadJsonBackup(snapshot, safePrizeName);
      return {
        success: true,
        fallbackDownload: true,
        fileName: `抽獎自動下載備份${safePrizeName}_${timeStr}.json`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || '自動下載失敗',
      };
    }
  }

  return {
    success: false,
    error: '未授權本機資料夾且未開啟自動下載',
  };
}

/**
 * Trigger immediate JSON file download
 */
export function triggerDownloadJsonBackup(snapshot: StorageSnapshotData, suffix = ''): void {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `抽獎自動備份${suffix}_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
