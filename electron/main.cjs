const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: '尾牙智能抽獎系統',
    backgroundColor: '#fffdfa',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 隱藏頂部預設選單
  Menu.setApplicationMenu(null);

  // 載入 Vite 打包好的 index.html
  win.loadFile(path.join(__dirname, '../dist/index.html'));

  // 視窗最大化（適合活動現場使用）
  win.maximize();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
