import { app, BrowserWindow, Menu, dialog, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { startServer } from '../server/index.ts'

let closeServer: (() => Promise<void>) | null = null

function installMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: '商标查询',
        submenu: [{ role: 'quit', label: '退出' }],
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'selectAll', label: '全选' },
        ],
      },
      {
        label: '查看',
        submenu: [
          { role: 'reload', label: '重新加载' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetZoom', label: '实际大小' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { role: 'togglefullscreen', label: '全屏' },
        ],
      },
    ]),
  )
}

function guardNavigation(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    const current = new URL(win.webContents.getURL())
    let next: URL
    try {
      next = new URL(url)
    } catch {
      event.preventDefault()
      return
    }
    if (next.origin !== current.origin) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })
}

async function createWindow(): Promise<void> {
  const staticDir = path.join(app.getAppPath(), 'dist')
  if (!existsSync(staticDir)) {
    dialog.showErrorBox('商标查询', '没有找到界面文件。请先在项目目录执行 npm run build。')
    app.quit()
    return
  }
  const started = await startServer({ port: 0, host: '127.0.0.1', staticDir })
  closeServer = started.close
  const win = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 780,
    minHeight: 640,
    title: '商标查询',
    backgroundColor: '#f6f1e8',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  guardNavigation(win)
  await win.loadURL(`http://127.0.0.1:${started.port}/`)
}

installMenu()

void app.whenReady().then(() => {
  void createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  void closeServer?.()
})
