import fs from "node:fs";
import { execSync } from "node:child_process";

// 用户在 Surge 中重点开启的 13 个主力模块
const FOCUS_MODULES = new Set([
    "广告平台拦截器",
    "可莉广告过滤器",
    "HTTPDNS拦截器",
    "DREAME去广告",
    "京东去广告",
    "什么值得买去广告",
    "喜马拉雅去广告",
    "斗鱼去广告",
    "淘宝去广告",
    "百度网盘去广告",
    "百度贴吧去广告",
    "高德地图去广告",
    "Youtube (Music) Enhance",
]);

function getChangedModules() {
    let output = "";
    try {
        // 先检查暂存区
        output = execSync("git -c core.quotepath=false diff --cached --name-only Surge/", {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
    } catch {
        // fallback
    }

    if (!output.trim()) {
        try {
            // 如果已经 commit，对比最近一次提交
            output = execSync("git -c core.quotepath=false diff HEAD~1 HEAD --name-only Surge/", {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            });
        } catch {
            // fallback
        }
    }

    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const moduleNames = new Set();

    for (const file of lines) {
        // 过滤一级 Surge/ 目录下的 .sgmodule，忽略 Beta/ 和全家桶
        if (
            file.startsWith("Surge/") &&
            !file.startsWith("Surge/Beta/") &&
            file.endsWith(".sgmodule")
        ) {
            const name = file
                .replace(/^Surge\/(?:Official\/)?/, "")
                .replace(/\.sgmodule$/, "")
                .replace(/\.official$/, "");
            if (name && name !== "去广告全家桶") {
                moduleNames.add(name);
            }
        }
    }

    return Array.from(moduleNames).sort();
}

async function sendServerChan(key, title, content) {
    const url = `https://sctapi.ftqq.com/${key}.send`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ title, desp: content }),
    });
    const data = await res.json();
    if (data.code === 0) {
        console.log("✅ Server酱微信推送成功！");
    } else {
        console.warn(`⚠️ Server酱推送响应: ${data.message || JSON.stringify(data)}`);
    }
}

async function sendWeCom(webhook, content) {
    const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            msgtype: "markdown",
            markdown: { content },
        }),
    });
    const data = await res.json();
    if (data.errcode === 0) {
        console.log("✅ 企业微信机器人推送成功！");
    } else {
        console.warn(`⚠️ 企业微信推送响应: ${data.errmsg}`);
    }
}

async function sendWxPusher(appToken, uid, content) {
    const url = "https://wxpusher.zjiecode.com/api/send/message";
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            appToken,
            content,
            contentType: 3, // Markdown
            uids: [uid],
        }),
    });
    const data = await res.json();
    if (data.code === 1000) {
        console.log("✅ WxPusher 微信推送成功！");
    } else {
        console.warn(`⚠️ WxPusher 推送响应: ${data.msg}`);
    }
}

async function main() {
    const changed = getChangedModules();
    if (changed.length === 0) {
        console.log("ℹ️ 本次没有检测到独立的 .sgmodule 模块文件变动，无需发送微信通知。");
        return;
    }

    const focusUpdated = changed.filter((m) => FOCUS_MODULES.has(m));
    const otherUpdated = changed.filter((m) => !FOCUS_MODULES.has(m));

    const now = new Date();
    const timeStr = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(now);

    let title = "Surge 模块规则更新提醒";
    if (focusUpdated.length > 0) {
        title = `Surge 模块更新: ${focusUpdated.slice(0, 2).join("、")}${focusUpdated.length > 2 ? " 等" : ""}`;
    }

    const markdownLines = [];
    markdownLines.push(`## 🔔 Surge 模块更新提醒`);
    markdownLines.push(`> ⏰ 更新时间：${timeStr}`);
    markdownLines.push("");

    if (focusUpdated.length > 0) {
        markdownLines.push(`### ⭐ 常用主力模块更新 (${focusUpdated.length} 个)`);
        for (const m of focusUpdated) {
            markdownLines.push(`* **${m}.sgmodule**`);
        }
        markdownLines.push("");
    }

    if (otherUpdated.length > 0) {
        markdownLines.push(`### 📦 其他同步更新模块 (${otherUpdated.length} 个)`);
        for (const m of otherUpdated) {
            markdownLines.push(`* ${m}.sgmodule`);
        }
        markdownLines.push("");
    }

    markdownLines.push(`---`);
    markdownLines.push(`👉 **更新指引**：打开 iPhone Surge -> 进入「模块」列表，点击对应模块并点击「更新」即可拉取最新版规则。`);

    const markdownText = markdownLines.join("\n");

    const serverChanKey = process.env.SERVERCHAN_KEY?.trim();
    const wecomWebhook = process.env.WECHAT_WEBHOOK?.trim();
    const wxPusherToken = process.env.WXPUSHER_APP_TOKEN?.trim();
    const wxPusherUid = process.env.WXPUSHER_UID?.trim();

    let sent = false;

    if (serverChanKey) {
        try {
            await sendServerChan(serverChanKey, title, markdownText);
            sent = true;
        } catch (err) {
            console.error("Server酱发送失败:", err.message);
        }
    }

    if (wecomWebhook) {
        try {
            await sendWeCom(wecomWebhook, markdownText);
            sent = true;
        } catch (err) {
            console.error("企业微信发送失败:", err.message);
        }
    }

    if (wxPusherToken && wxPusherUid) {
        try {
            await sendWxPusher(wxPusherToken, wxPusherUid, markdownText);
            sent = true;
        } catch (err) {
            console.error("WxPusher 发送失败:", err.message);
        }
    }

    if (!sent) {
        console.log("ℹ️ 未配置任何微信推送环境变量 (SERVERCHAN_KEY / WECHAT_WEBHOOK / WXPUSHER)，跳过推送。");
        console.log("📝 本次通知预览内容如下:\n" + markdownText);
    }
}

main().catch((err) => {
    console.error("通知执行出错:", err);
});
