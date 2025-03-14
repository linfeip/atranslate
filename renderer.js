const srcTextEl = document.getElementById('srcText')
const dstTextEl = document.getElementById('dstText')
const dstLangSelectEl = document.getElementById('dstLangSelect')
const openSettingsBtnEl = document.getElementById('openSettingsBtn')
const settingsModalEl = document.getElementById('settingsModal')
const settingsCloseBtnEl = document.getElementById('settingsCloseBtn')
const modelListTabEl = document.getElementById('modelListTab')
const addModelApiTabEl = document.getElementById('addModelApiTab')
const modelListContentEl = document.getElementById('modelListContent')
const apiModelTableBodyEl = document.getElementById('apiModelTableBody')
const addModelApiContentEl = document.getElementById('addModelApiContent')
const addApiNameInputEl = document.getElementById('addApiNameInput')
const addApiUrlInputEl = document.getElementById('addApiUrlInput')
const addApiKeyInputEl = document.getElementById('addApiKeyInput')
const addApiModelInputEl = document.getElementById('addApiModelInput')
const addApiModelSubmitBtnEl = document.getElementById('addApiModelSubmitBtn')
const srcTextContainerEl = document.getElementById('srcTextContainer')
const dstTextContainerEl = document.getElementById('dstTextContainer')

const localStorageApiModelsName = 'apiModels'
const localStorageDefaultModelName = 'defaultModel'
let defaultApiModel = {
    name: 'internal-default',
    url: 'http://47.99.126.118:8080/default',
    model: 'llama3.3-70b-instruct'
}

let dstLang = 'Auto'
let editApiModelName = ''

const cn2enExample = `
<翻译例子>
<例子1>
输入: 你好世界
输出: Hello world
</例子1>
<例子2>
输入: Artificial intelligence is transforming how we interact with technology, from voice assistants to autonomous driving systems, these innovations are reshaping the future.
输出: 人工智能正在改变我们与技术的互动方式，从语音助手到自动驾驶系统，这些创新正在重塑未来。
</例子2>
</翻译例子>`

const en2cnExample = `
<翻译例子>
<例子1>
输入: Hello world
输出: 你好世界
</例子1>
<例子2>
输入: 人工智能正在改变我们与技术的互动方式，从语音助手到自动驾驶系统，这些创新正在重塑未来。
输出: Artificial intelligence is transforming how we interact with technology, from voice assistants to autonomous driving systems, these innovations are reshaping the future.
</例子2>
</翻译例子>
`

async function sendTranslateApi(text, to) {
    try {
        setTranslateLoading()
        let example = cn2enExample
        if (to !== 'English') {
            example = en2cnExample
        }
        const options = {
            method: 'POST',
            url: `${defaultApiModel.url}`,
            headers: {
                'Authorization': `Bearer ${defaultApiModel.key}`,
                'Content-Type': 'application/json'
            },
            data: {
                "model": `${defaultApiModel.model}`,
                "messages": [
                    {
                        "role": "system",
                        "content": `你是一个专业的翻译工具, 现在将我下面的这段文字, 翻译成${to}, 要求只输出翻译结果, 不需要任何的解释过程, 返回需要纯文本, 不需要解析, 不需要备注.${example}`
                    },
                    {
                        "role": "user",
                        "content": `${text}`
                    }
                ],
                "stream": false
            }
        }
        const rsp = await window.net.request(options)
        console.log('api response: ', rsp)
        const js = JSON.parse(rsp)
        let result = ''
        if (js.choices) {
            for (let i = 0; i < js.choices.length; i++) {
                const choice = js.choices[i]
                result += choice.message.content
            }
        } else if (js.message && js.message.content) {
            // ollama, 如果是思考模型, 把</think>之后的文本输出
            const thinkTag = `</think>`
            const thinkIndex = js.message.content.indexOf(thinkTag)
            if (thinkIndex < 0) {
                result += js.message.content
            } else {
                result += js.message.content.slice(thinkIndex + thinkTag.length)
            }
        }
        console.log(rsp, js, result)
        return result
    } catch (error) {
        console.error('请求失败:', error)
    } finally {
        removeTranslateLoading()
    }
}

function setTranslateLoading() {
    srcTextContainerEl.classList.add('is-loading')
    dstTextContainerEl.classList.add('is-loading')
}

function removeTranslateLoading() {
    srcTextContainerEl.classList.remove('is-loading')
    dstTextContainerEl.classList.remove('is-loading')
}

async function translate() {
    const text = srcTextEl.value.trim()
    if (text === '') {
        return
    }
    let lang = dstLang
    if (dstLang === 'Auto' || dstLang === '') {
        let srcLang = detectLang(text)
        // 如果源语言是英文, 那么目标语言就是自动选择中文, 相反同理
        lang = srcLang === 'English' ? 'Chinese' : 'English'
    }
    console.log('translate text: ', text, 'language: ', lang)
    const result = await sendTranslateApi(text, lang)
    console.log('translate api response: ', result)
    dstTextEl.innerText = result
}

window.globalShortcut.registerClipboardTranslate(async () => {
    srcTextEl.value = await window.clipboard.readText()
    await translate()
})

srcTextEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
            // 按下shift+enter, 那么是换行
            insertTextAtCursor('\n')
            return
        }
        await translate()
    }
})

// 在光标位置插入文本的函数
function insertTextAtCursor(text) {
    const start = srcTextEl.selectionStart
    const end = srcTextEl.selectionEnd
    const value = srcTextEl.value

    srcTextEl.value = value.slice(0, start) + text + value.slice(end)
    srcTextEl.selectionStart = srcTextEl.selectionEnd = start + text.length
}

dstLangSelectEl.addEventListener('change', () => {
    dstLang = this.value
    console.log('dst language change selected: ', dstLang)
})

function detectLang(text) {
    let maxDetectChar = 1024
    let englishCharNum = 0
    let totalDetectChar = 0
    for (let i = 0; i < text.length; i++) {
        let c = text[i]
        if (i > maxDetectChar) {
            break
        }
        let code = text.charCodeAt(i)
        totalDetectChar++
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            englishCharNum++
        } else if (code <= 127) {
            // 排除一些标点符号
            totalDetectChar--
        }
    }
    console.log('detect lang total: ', totalDetectChar, 'english: ', englishCharNum)
    return englishCharNum / totalDetectChar >= 0.5 ? 'English' : 'Chinese'
}

openSettingsBtnEl.addEventListener('click', () => {
    settingsModalEl.classList.add('is-active')
})

settingsCloseBtnEl.addEventListener('click', () => {
    settingsModalEl.classList.remove('is-active')
    modelListTabEl.click()
})

modelListTabEl.addEventListener('click', () => {
    modelListTabEl.classList.add('is-active')
    modelListContentEl.classList.remove('is-hidden')

    addModelApiTabEl.classList.remove('is-active')
    addModelApiContentEl.classList.add('is-hidden')
})

addModelApiTabEl.addEventListener('click', () => {
    addModelApiTabEl.classList.add('is-active')
    addModelApiContentEl.classList.remove('is-hidden')

    modelListTabEl.classList.remove('is-active')
    modelListContentEl.classList.add('is-hidden')

    // 清空状态
    editApiModelName = ''
    addApiNameInputEl.value = ''
    addApiUrlInputEl.value = ''
    addApiKeyInputEl.value = ''
    addApiModelInputEl.value = ''
})

addApiModelSubmitBtnEl.addEventListener('click', () => {
    const name = addApiNameInputEl.value.trim()
    const url = addApiUrlInputEl.value.trim()
    const key = addApiKeyInputEl.value.trim()
    const model = addApiModelInputEl.value.trim()

    let apiModels = getLocalStorageApiModels()
    let apiModel = {
        name: name,
        url: url,
        key: key,
        model: model
    }

    if (editApiModelName) {
        // 如果修改, 等于删了老的, 新增新的
        let oldApiModel = apiModels.get(editApiModelName)
        if (oldApiModel.isDefault) {
            setDefaultModel(apiModel)
        }
        apiModels.delete(editApiModelName)
    } else {
        apiModel.isDefault = apiModels.size === 0
        if (apiModel.isDefault) {
            setDefaultModel(apiModel)
        }
    }

    apiModels.set(name, apiModel)

    setLocalStorageApiModels(apiModels)
    refreshApiModelsTable()
    modelListTabEl.click()
})

function getLocalStorageApiModels() {
    const apiModels = localStorage.getItem(localStorageApiModelsName)
    if (!apiModels) {
        return new Map()
    }
    let jsObj = JSON.parse(apiModels)
    return new Map(Object.entries(jsObj))
}

function setLocalStorageApiModels(apiModels) {
    localStorage.setItem(localStorageApiModelsName, JSON.stringify(Object.fromEntries(apiModels)))
}

function setDefaultModel(apiModel) {
    defaultApiModel = apiModel
    localStorage.setItem(localStorageDefaultModelName, JSON.stringify(apiModel))
}

function init() {
    const defaultModel = localStorage.getItem(localStorageDefaultModelName)
    if (defaultModel) {
        defaultApiModel = JSON.parse(defaultModel)
    }
    refreshApiModelsTable()
    console.log(defaultModel)
}

function refreshApiModelsTable() {
    apiModelTableBodyEl.replaceChildren()
    const apiModels = getLocalStorageApiModels()
    console.log(apiModels)
    for (const apiModel of apiModels.values()) {
        const row = document.createElement('tr')
        row.innerHTML = `
            <td>${apiModel.name}</td>
            <td>${apiModel.model}</td>
            <td>${apiModel.isDefault ? '是' : '否'}</td>
            <td>
            <a class="apiModelsRowDel" data-name="${apiModel.name}">删除</a> | <a class="apiModelsRowEdit" data-name="${apiModel.name}">修改</a> | <a class="apiModelsRowSetDefault" data-name="${apiModel.name}">设默认</a>
            </td>
        `
        apiModelTableBodyEl.appendChild(row)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init()
})

apiModelTableBodyEl.addEventListener('click', (event) => {
    const el = event.target
    const apiModelName = el.getAttribute('data-name')
    if (event.target.classList.contains('apiModelsRowDel')) {
        handleDelApiModel(apiModelName)
    }

    if (event.target.classList.contains('apiModelsRowSetDefault')) {
        handleSetDefaultApiModel(apiModelName)
    }

    if (event.target.classList.contains('apiModelsRowEdit')) {
        handleEditApiModel(apiModelName)
    }
})

function handleDelApiModel(apiModelName) {
    let apiModels = getLocalStorageApiModels()
    let model = apiModels.get(apiModelName)
    apiModels.delete(apiModelName)
    if (model.isDefault) {
        if (apiModels.size === 0) {
            setDefaultModel(null)
        }
    }
    setLocalStorageApiModels(apiModels)
    refreshApiModelsTable()
}

function handleSetDefaultApiModel(apiModelName) {
    let apiModels = getLocalStorageApiModels()
    for (const apiModel of apiModels.values()) {
        apiModel.isDefault = false
    }
    apiModels.get(apiModelName).isDefault = true
    setLocalStorageApiModels(apiModels)
    refreshApiModelsTable()
}

function handleEditApiModel(apiModelName) {
    let apiModels = getLocalStorageApiModels()
    let model = apiModels.get(apiModelName)

    addModelApiTabEl.click()

    editApiModelName = model.name
    addApiNameInputEl.value = model.name
    addApiUrlInputEl.value = model.url
    addApiKeyInputEl.value = model.key
    addApiModelInputEl.value = model.model
}