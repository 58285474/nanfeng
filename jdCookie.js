/*
================================================================================
魔改自 https://github.com/shufflewzc/faker2/blob/main/jdCookie.js
修改内容：与task_before.sh配合，由task_before.sh设置要设置要做互助的活动的 ShareCodeConfigName 和 ShareCodeEnvName 环境变量，
        然后在这里实际解析/ql/log/.ShareCode中该活动对应的配置信息（由code.sh生成和维护），注入到nodejs的环境变量中
修改原因：原先的task_before.sh直接将互助信息注入到shell的env中，在ck超过45以上时，互助码环境变量过大会导致调用一些系统命令
        （如date/cat）时报 Argument list too long，而在node中修改环境变量不会受这个限制，也不会影响外部shell环境，确保脚本可以正常运行
魔改作者：风之凌殇
================================================================================

此文件为Node.js专用。其他用户请忽略
 */
//此处填写京东账号cookie。
require("global-agent/bootstrap");
console.log("🚀 启动 global-agent全局代理中...");
let CookieJDs = [
]
// 判断环境变量里面是否有京东ck
if (process.env.JD_COOKIE) {
  if (process.env.JD_COOKIE.indexOf('&') > -1) {
    CookieJDs = process.env.JD_COOKIE.split('&');
  } else if (process.env.JD_COOKIE.indexOf('\n') > -1) {
    CookieJDs = process.env.JD_COOKIE.split('\n');
  } else {
    CookieJDs = [process.env.JD_COOKIE];
  }
}
if (JSON.stringify(process.env).indexOf('GITHUB')>-1) {
  console.log(`请勿使用github action运行此脚本,无论你是从你自己的私库还是其他哪里拉取的源代码，都会导致我被封号\n`);
  !(async () => {
    await require('./sendNotify').sendNotify('提醒', `请勿使用github action、滥用github资源会封我仓库以及账号`)
    await process.exit(0);
  })()
}
CookieJDs = [...new Set(CookieJDs.filter(item => !!item))]
console.log(`\n====================共${CookieJDs.length}个京东账号Cookie=========\n`);
console.log(`==================脚本执行- 北京时间(UTC+8)：${new Date(new Date().getTime() + new Date().getTimezoneOffset()*60*1000 + 8*60*60*1000).toLocaleString('zh', {hour12: false}).replace(' 24:',' 00:')}=====================\n`)
if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
for (let i = 0; i < CookieJDs.length; i++) {
  if (!CookieJDs[i].match(/pt_pin=(.+?);/) || !CookieJDs[i].match(/pt_key=(.+?);/)) console.log(`\n提示:京东cookie 【${CookieJDs[i]}】填写不规范,可能会影响部分脚本正常使用。正确格式为: pt_key=xxx;pt_pin=xxx;（分号;不可少）\n`);
  const index = (i + 1 === 1) ? '' : (i + 1);
  exports['CookieJD' + index] = CookieJDs[i].trim();
}

// 以下为注入互助码环境变量（仅nodejs内起效）的代码
function SetShareCodesEnv(nameChinese = "", nameConfig = "", envName = "") {
    let rawCodeConfig = {}

    // 读取互助码
    let shareCodeLogPath = `${process.env.QL_DIR}/log/.ShareCode/${nameConfig}.log`
    let fs = require('fs')
    if (fs.existsSync(shareCodeLogPath)) {
        // 因为faker2目前没有自带ini，改用已有的dotenv来解析
        // // 利用ini模块读取原始互助码和互助组信息
        // let ini = require('ini')
        // rawCodeConfig = ini.parse(fs.readFileSync(shareCodeLogPath, 'utf-8'))

        // 使用env模块
        require('dotenv').config({path: shareCodeLogPath})
        rawCodeConfig = process.env
    }

    // 解析每个用户的互助码
    let codes = {}
    Object.keys(rawCodeConfig).forEach(function (key) {
        if (key.startsWith(`My${nameConfig}`)) {
            codes[key] = rawCodeConfig[key]
        }
    });

    // 解析每个用户要帮助的互助码组，将用户实际的互助码填充进去
    let helpOtherCodes = {}
    Object.keys(rawCodeConfig).forEach(function (key) {
        if (key.startsWith(`ForOther${nameConfig}`)) {
            let helpCode = rawCodeConfig[key]
            for (const [codeEnv, codeVal] of Object.entries(codes)) {
                helpCode = helpCode.replace("${" + codeEnv + "}", codeVal)
            }

            helpOtherCodes[key] = helpCode
        }
    });

    // 按顺序用&拼凑到一起，并放入环境变量，供目标脚本使用
    let shareCodes = []
    let leftIndex = 1, rightIndex = Object.keys(helpOtherCodes).length

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
    console.info(`${nameChinese}的 互助码环境变量 ${envName}，共计 ${totalCodeCount} 组互助码，总大小为 ${shareCodesStr.length} 字节`)
}

// 判断当前活动脚本是否在互助脚本列表中
function IsShareJsFile() {
    // 尝试获取在task_before.sh中设置的 互助活动的脚本文件名的关键部分 列表
    let rawJsNameList = process.env.ShareCodeJSNameList
    if (!rawJsNameList) {
        return false
    }

    // 转换为list
    let jsNameList = process.env.ShareCodeJSNameList.split(" ")

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
