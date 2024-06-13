/*
此文件为Node.js专用。其他用户请忽略
 */
//此处填写京东账号cookie。
console.log("\n==============🚀 启动各作者自定义变量代理中==============\n");
let CookieJDs = [
]
// 判断环境变量里面是否有京东ck
if (process.env.JD_COOKIE) {
    if (process.env.JD_COOKIE.indexOf('&') > -1) {
        CookieJDs = process.env.JD_COOKIE.split('&')
    } else if (process.env.JD_COOKIE.indexOf('\n') > -1) {
        CookieJDs = process.env.JD_COOKIE.split('\n')
    } else {
        CookieJDs = [process.env.JD_COOKIE]
    }
}
if (JSON.stringify(process.env).indexOf('GITHUB') > -1) {
    console.log(`请勿使用github action运行此脚本,无论你是从你自己的私库还是其他哪里拉取的源代码，都会导致我被封号\n`)
    !(async () => {
        await require('./sendNotify').sendNotify('提醒', `请勿使用github action、滥用github资源会封我仓库以及账号`)
        await process.exit(0)
    })()
}
CookieJDs = [...new Set(CookieJDs.filter((item) => !!item))]
if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {}
console.log(`\n====================共${CookieJDs.length}个京东账号Cookie=================\n`)
console.log(`===========脚本执行时间：${formatdate(new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000))}============\n`)
console.log(`=================推荐使用本地网络环境运行================\n`)
console.log('===============提示：有问题先更新不行在反馈==============\n')
console.log('===============脚本问题请先运行依赖安装脚本==============\n')
for (let i = 0; i < CookieJDs.length; i++) {
    if (!CookieJDs[i].match(/pt_pin=(.+?);/) || !CookieJDs[i].match(/pt_key=(.+?);/)) console.log(`\n提示:京东cookie 【${CookieJDs[i]}】填写不规范,可能会影响部分脚本正常使用。正确格式为: pt_key=xxx;pt_pin=xxx;（分号;不可少）\n`)
    CookieJDs[i] = CookieJDs[i].replace(/[\u4e00-\u9fa5]/g, (str) => encodeURI(str))
    const index = i + 1 === 1 ? '' : i + 1
    exports['CookieJD' + index] = CookieJDs[i].trim()
}
let RS_PROXY_OPEN = process.env.RS_PROXY_OPEN === 'true' //默认不启用
let RS_PROXY_TUNNRL = process.env.RS_PROXY_TUNNRL || '' //默认不启用
let RS_NO_PROXY = process.env.RS_NO_PROXY || '127.0.0.1,*.baidu.com' //过滤不走代理
let permit = process.env.RS_WHITRLIST ? process.env.RS_WHITRLIST.split('&') : '' //使用代理池白名单（js文件名关键字如fruit）,多个用 & 隔开

if (RS_PROXY_OPEN) {
    if (RS_PROXY_TUNNRL) {
        if (permit && permit.filter((x) => process.mainModule.filename.includes(x)).length != 0) {
            try {
                require('global-agent/bootstrap')
                global.GLOBAL_AGENT.HTTP_PROXY = RS_PROXY_TUNNRL
                global.GLOBAL_AGENT.NO_PROXY = `${RS_NO_PROXY}`
                console.log(`\n==================使用全局代理池模式(旧)=================\n`)
                console.log('代理池地址为：' + RS_PROXY_TUNNRL + '\n')
            } catch {
                throw new Error(`请安装global-agent依赖，才能启用代理！`)
            }
        }
    }
}

// 以下为注入互助码环境变量（仅nodejs内起效）的代码
function SetShareCodesEnv(nameChinese = '', nameConfig = '', envName = '') {
    let rawCodeConfig = {}
    let fs = require('fs')
    // 读取互助码
    let shareCodeLogPath = fs.existsSync(`${process.env.QL_DIR}/data`) ? `${process.env.QL_DIR}/data/log/.ShareCode/${nameConfig}.log` : `${process.env.QL_DIR}/log/.ShareCode/${nameConfig}.log`
    if (fs.existsSync(shareCodeLogPath)) {
        // // 利用ini模块读取原始互助码和互助组信息
        // let ini = require('ini')
        // rawCodeConfig = ini.parse(fs.readFileSync(shareCodeLogPath, 'utf-8'))

        // 使用env模块
        require('dotenv').config({ path: shareCodeLogPath })
        rawCodeConfig = process.env
    }

    // 解析每个用户的互助码
    let codes = {}
    Object.keys(rawCodeConfig).forEach(function (key) {
        if (key.startsWith(`My${nameConfig}`)) {
            codes[key] = rawCodeConfig[key]
        }
    })

    // 解析每个用户要帮助的互助码组，将用户实际的互助码填充进去
    let helpOtherCodes = {}
    Object.keys(rawCodeConfig).forEach(function (key) {
        if (key.startsWith(`ForOther${nameConfig}`)) {
            let helpCode = rawCodeConfig[key]
            for (const [codeEnv, codeVal] of Object.entries(codes)) {
                helpCode = helpCode.replace('${' + codeEnv + '}', codeVal)
            }

            helpOtherCodes[key] = helpCode
        }
    })

    // 按顺序用&拼凑到一起，并放入环境变量，供目标脚本使用
    let shareCodes = []
    let leftIndex = 1,
        rightIndex = Object.keys(helpOtherCodes).length

    // 判断是否是ptask并行触发，若是，则修改实际需要设置的互助码范围
    let ptaskLeft = process.env.PTASK_LEFT
    let ptaskRight = process.env.PTASK_RIGHT
    if (ptaskLeft && ptaskRight) {
        leftIndex = Number(ptaskLeft)
        rightIndex = Number(ptaskRight)
    }

    for (let idx = leftIndex; idx <= rightIndex; idx++) {
        shareCodes.push(helpOtherCodes[`ForOther${nameConfig}${idx}`])
    }
    let shareCodesStr = shareCodes.join('&')
    process.env[envName] = shareCodesStr

    let totalCodeCount = rightIndex - leftIndex + 1
    //console.info(`${nameChinese}的 互助码环境变量 ${envName}，共计 ${totalCodeCount} 组互助码，总大小为 ${shareCodesStr.length} 字节`)
}

// 判断当前活动脚本是否在互助脚本列表中
function IsShareJsFile() {
    // 尝试获取在task_before.sh中设置的 互助活动的脚本文件名的关键部分 列表
    let rawJsNameList = process.env.ShareCodeJSNameList
    if (!rawJsNameList) {
        return false
    }

    // 转换为list
    let jsNameList = process.env.ShareCodeJSNameList.split(' ')

    // 判断当前
    let currentActivityScriptFileName = GetCurrentActivityScriptFileName()

    let isShareJsFile = false
    for (let idx = 0; idx < jsNameList.length; idx++) {
        if (currentActivityScriptFileName.includes(jsNameList[idx])) {
            isShareJsFile = true
            break
        }
    }

    return isShareJsFile
}

// 获取当前活动脚本的文件名
function GetCurrentActivityScriptFileName() {
    const path = require('path')
    return path.basename(process.argv[1])
}

// 若在task_before.sh 中设置了要设置互助码环境变量的活动名称和环境变量名称信息，则在nodejs中处理，供活动使用
let nameChinese = process.env.ShareCodeConfigChineseName
let nameConfig = process.env.ShareCodeConfigName
let envName = process.env.ShareCodeEnvName
if (nameChinese && nameConfig && envName) {
    SetShareCodesEnv(nameChinese, nameConfig, envName)
}
function formatdate(date) {
    const year = date.getFullYear()
    const month = ('0' + (date.getMonth() + 1)).slice(-2)
    const day = ('0' + date.getDate()).slice(-2)
    const hours = ('0' + date.getHours()).slice(-2)
    const minutes = ('0' + date.getMinutes()).slice(-2)
    const seconds = ('0' + date.getSeconds()).slice(-2)
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}
