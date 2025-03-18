const {app, BrowserWindow, net, ipcMain, globalShortcut, Tray, Menu, nativeImage} = require('electron')
const {clipboard} = require('electron')
const path = require('node:path')

let mainWindow = null
let tray = null
// const isDev = process.env.NODE_ENV !== 'production'
const isDev = true
let isQuitting = false

const createMainWindow = async () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 550,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            devTools: isDev,
        },
        frame: false,
    })
    return new Promise((resolve) => {
        mainWindow.loadFile('index.html')
        // 当页面完全加载并准备显示时
        mainWindow.webContents.on('did-finish-load', () => {
            resolve(mainWindow)
        })
        mainWindow.on('closed', () => {
            mainWindow = null
            tray = null
        })
        mainWindow.on('close', (event) => {
            if (!isQuitting) {
                event.preventDefault()
                mainWindow.hide()
            }
        })
    })
}

const triggerMainWindow = () => {
    if (mainWindow.isVisible()) {
        mainWindow.hide()
    } else {
        mainWindow.show()
    }
}

app.whenReady().then(async () => {
    await createMainWindow()
    await createTray()
    registerShortcut()
})

app.on('activate', async () => {
    await activate()
})

async function activate() {
    if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow()
    }
    if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show()
    }
}

function createTray() {
    const image = nativeImage.createFromPath(path.join(__dirname, 'tray_icon.png')).resize({height: 16})
    image.setTemplateImage(true)
    // tray = new Tray(path.join(__dirname, 'tray_icon.png')) // 指定托盘图标路径
    tray = new Tray(image) // 指定托盘图标路径
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '打开', click: () => {
                mainWindow?.show()
            }
        },
        {
            label: '退出', click: () => {
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip('ATranslate');
    tray.on('click', async () => {
        await activate()
    });
}

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

app.on('before-quit', () => {
    isQuitting = true
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// 监听渲染界面的net http 请求
ipcMain.handle('net:request', async (event, options) => {
    const {data: payload} = options
    return new Promise((resolve, reject) => {
        const request = net.request(options)
        if (payload) {
            if (typeof payload === 'string') {
                request.write(payload)
            } else {
                request.write(JSON.stringify(payload))
            }
        }
        let data = ''
        request.on('response', (response) => {
            response.on('data', (chunk) => {
                data += chunk
            })
            response.on('end', () => {
                resolve(data)
            })
        })

        request.on('error', (error) => {
            reject(error)
        })

        request.end()
    })
})

ipcMain.handle('clipboard:readText', () => {
    return clipboard.readText()
})

function registerShortcut() {
    // 全局快捷键监听
    globalShortcut.register('Alt+E', async () => {
        mainWindow?.show()
        // 给渲染页面发送, 读取粘贴板数据进行翻译事件
        mainWindow.webContents.send('globalShortcut:Alt+E')
    })
    globalShortcut.register('Alt+G', async () => {
        triggerMainWindow()
    })
}

