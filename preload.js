const {contextBridge, ipcRenderer} = require('electron/renderer')

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
})

contextBridge.exposeInMainWorld('net', {
    request: (options) => ipcRenderer.invoke('net:request', options)
})

contextBridge.exposeInMainWorld('globalShortcut', {
    registerClipboardTranslate: (callback) => {
        ipcRenderer.on('globalShortcut:Alt+E', callback)
    }
})

contextBridge.exposeInMainWorld('clipboard', {
    readText: () => ipcRenderer.invoke('clipboard:readText'),
})