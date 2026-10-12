import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT_DIR = process.cwd();
const SURGE_DIR = path.join(ROOT_DIR, "Surge");
const BETA_DIR = path.join(SURGE_DIR, "Beta");
const OFFICIAL_DIR = path.join(SURGE_DIR, "Official");

const PARSER_URL =
    "https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/Rewrite-Parser.beta.js";
const KELEE_LIST_URL = "https://hub.kelee.one/list.json";
const LOON_UA = "Loon/800 CFNetwork/1496.0.7 Darwin/23.5.0";

// 已有 Official 原生模块替代或 Loon 专属不转换的列表
const EXCLUDED_KELEE_PLUGINS = new Set([
    "Apple天气增强",
    "BoxJs",
    "QQ链接解锁",
    "Script-Hub",
    "Sub-Store",
    "TestFlight地区解锁",
    "WARP节点查询",
    "代理链路检测",
    "航旅纵横去广告",
    "YouTube去广告",
    "网易云音乐去广告",
    "BiliBili每日等级任务",
    "Follow每日签到",
    "GitHub加速",
    "插件仓库",
    "节点检测工具",
]);

// 兼容旧版文件名的映射（如果上游改名，同时更新旧文件名，防止已导入的远程链接失效）
const LEGACY_NAME_ALIASES = {
    滴滴去广告: ["滴滴出行去广告"],
    爱奇艺去广告: ["爱奇艺视频去广告"],
    百度贴吧去广告: ["贴吧去广告"],
    微博轻享版去广告: ["微博国际版去广告"],
    HTTPDNS拦截器: ["拦截HTTPDNS"],
    YouTube双语翻译: ["YouTube翻译"],
    自动加入TestFlight: ["自动加入TF"],
};

// Official 目录上游原生 Surge 模块映射
const OFFICIAL_MODULES = {
    "🍟 Apple 天气增强":
        "https://github.com/NSRingo/WeatherKit/releases/latest/download/WeatherKit.sgmodule",
    "🍟 Apple 定位修改":
        "https://github.com/NSRingo/GeoServices/releases/latest/download/Location.sgmodule",
    "🍟 Apple 地图优化":
        "https://github.com/NSRingo/GeoServices/releases/latest/download/Maps.sgmodule",
    "🍟 Apple TV 增强":
        "https://github.com/NSRingo/TV/releases/latest/download/TV.sgmodule",
    "🍟 Apple News 解锁":
        "https://github.com/NSRingo/News/releases/latest/download/News.sgmodule",
    "🍟 Apple TestFlight":
        "https://github.com/NSRingo/TestFlight/releases/latest/download/TestFlight.sgmodule",
    "⭐️ BoxJs":
        "https://raw.githubusercontent.com/chavyleung/scripts/master/box/rewrite/boxjs.rewrite.surge.sgmodule",
    "1.1.1.1配置管理":
        "https://raw.githubusercontent.com/VirgilClyne/Cloudflare/main/modules/Cloudflare.1.1.1.1.sgmodule",
    拦截HTTPDNS:
        "https://raw.githubusercontent.com/VirgilClyne/GetSomeFries/main/sgmodule/HTTPDNS.Block.sgmodule",
    "⭐️ Sub-Store":
        "https://raw.githubusercontent.com/Peng-YM/Sub-Store/master/config/Surge.sgmodule",
    "⭐️ Script Hub":
        "https://raw.githubusercontent.com/Script-Hub-Org/Script-Hub/main/modules/script-hub.surge.sgmodule",
    "网络信息 X":
        "https://raw.githubusercontent.com/xream/scripts/main/surge/modules/network-info/net-lsp-x.sgmodule",
    网易云音乐去广告:
        "https://raw.githubusercontent.com/Keywos/rule/refs/heads/main/script/wy/wy.sgmodule",
    FlushDNS:
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Flush-DNS/Moore/Flush-DNS.sgmodule",
    流媒体解锁检测:
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Stream-All/Moore/Stream-All.sgmodule",
    "流媒体解锁检测 Lite":
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Stream-All-Lite/Moore/Stream-All-Lite.sgmodule",
    "Surge 启动时长":
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Surge-Pro/Moore/SurgePro.sgmodule",
    节假日信息:
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Timecard/Moore/Timecard.sgmodule",
    机场流量信息面板:
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Sub-Info/Moore/Sub-Info.sgmodule",
    联通余量:
        "https://github.com/ChinaTelecomOperators/ChinaUnicom/releases/download/Prerelease-Alpha/10010.sgmodule",
    "隐藏状态栏 VPN 图标":
        "https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Spec/Hide-VPN-Icon/Moore/Hide-VPN-Icon.sgmodule",
    "🍟 DNS 分流":
        "https://raw.githubusercontent.com/VirgilClyne/GetSomeFries/main/sgmodule/DNS.sgmodule",
    "🍟 通用模块":
        "https://raw.githubusercontent.com/VirgilClyne/GetSomeFries/main/sgmodule/General.sgmodule",
    "🍟 DualSubsUniversal":
        "https://github.com/DualSubs/Universal/releases/latest/download/Universal.sgmodule",
    "🍟 DualSubsYouTube":
        "https://github.com/DualSubs/YouTube/releases/latest/download/YouTube.sgmodule",
    "🍟 DualSubsSpotify":
        "https://github.com/DualSubs/Spotify/releases/latest/download/Spotify.sgmodule",
    "🍟 DualSubsNetflix":
        "https://github.com/DualSubs/Netflix/releases/latest/download/Netflix.sgmodule",
    "🍟 BiliEnhanced":
        "https://github.com/BiliUniverse/Enhanced/releases/latest/download/BiliBili.Enhanced.sgmodule",
    "🍟 BiliGlobal":
        "https://github.com/BiliUniverse/Global/releases/latest/download/BiliBili.Global.sgmodule",
    "🍟 BiliRedirect":
        "https://github.com/BiliUniverse/Redirect/releases/latest/download/BiliBili.Redirect.sgmodule",
    "🍟 BiliADBlock":
        "https://github.com/BiliUniverse/ADBlock/releases/latest/download/BiliBili.ADBlock.sgmodule",
    节点测速:
        "https://raw.githubusercontent.com/getsomecat/GetSomeCats/Surge/modules/Panel/Net_Speed/Net_Speed.sgmodule",
    "GPT 可用检测":
        "https://raw.githubusercontent.com/getsomecat/GetSomeCats/Surge/modules/Panel/CFGPT/CFGPT_new.sgmodule",
    "GPT 可用检测-无 WARP":
        "https://raw.githubusercontent.com/getsomecat/GetSomeCats/Surge/modules/Panel/CFGPT/CFGPT_newnowarp.sgmodule",
    网络连通性测试:
        "https://raw.githubusercontent.com/getsomecat/GetSomeCats/Surge/modules/Connectivity_Test.sgmodule",
    流量统计:
        "https://raw.githubusercontent.com/w164955/Config/main/Surge/Panel/TrafficStatistics.sgmodule",
    "VPS 流量信息":
        "https://raw.githubusercontent.com/getsomecat/GetSomeCats/Surge/modules/serverinfo.sgmodule",
    携程旅行签到:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/CtripDailyBonus.sgmodule",
    爱奇艺会员签到:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/iQIYIDailyBonus.sgmodule",
    哔哩漫画签到:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/BiliComicsDailyBonus.sgmodule",
    哔哩漫画抢券:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/BiliComicsExchangePoints.sgmodule",
    百度贴吧签到:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/TieBaDailyBonus.sgmodule",
    快看漫画签到:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/KuaiKanComicsDailyBonus.sgmodule",
    巴哈姆特签到:
        "https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/BahamutDailyBonus.sgmodule",
    广告联盟:
        "https://raw.githubusercontent.com/app2smile/rules/master/module/adsense.sgmodule",
    腾讯新闻去广告:
        "https://raw.githubusercontent.com/app2smile/rules/master/module/qqnews.sgmodule",
    起点中文去广告:
        "https://raw.githubusercontent.com/app2smile/rules/master/module/qidian.sgmodule",
    "Spotify Plus":
        "https://raw.githubusercontent.com/app2smile/rules/master/module/spotify.module",
    贴吧去广告:
        "https://raw.githubusercontent.com/app2smile/rules/master/module/tieba.sgmodule",
    "Youtube 去广告 (不去贴片)":
        "https://raw.githubusercontent.com/app2smile/rules/master/module/youtube.sgmodule",
    新手友好の去广告集合:
        "https://raw.githubusercontent.com/Ananaskop/Profile/main/Surge/Modules/Common_remove_ads.sgmodule",
    小程序和应用懒人去广告合集:
        "https://raw.githubusercontent.com/Ananaskop/Profile/main/Surge/Modules/Common_remove_ads.sgmodule",
    "Bilibili Helper":
        "https://raw.githubusercontent.com/Maasea/sgmodule/master/Bilibili.Helper.sgmodule",
    "Youtube (Music) Enhance":
        "https://raw.githubusercontent.com/Maasea/sgmodule/master/YouTube.Enhance.sgmodule",
    "YouTube去广告[Maasea]":
        "https://raw.githubusercontent.com/Maasea/sgmodule/master/YouTube.Enhance.sgmodule",
    将推特用户转换成RSS订阅:
        "https://raw.githubusercontent.com/Maasea/sgmodule/master/SRSS.sgmodule",
    微信阅读精简:
        "https://raw.githubusercontent.com/Maasea/sgmodule/master/WeRead.sgmodule",
    "阿里 DNS":
        "https://raw.githubusercontent.com/Maasea/sgmodule/master/AliDNS.sgmodule",
};

import { execFileSync } from "node:child_process";

function curlFetch(url, userAgent) {
    const args = ["-sSL", "--max-time", "20", "-A", userAgent];
    if (process.env.WARP_PROXY) {
        args.push("-x", process.env.WARP_PROXY);
    }
    args.push(url);
    const curlOut = execFileSync("curl", args, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
    });
    if (
        curlOut &&
        !curlOut.includes("<title>Just a moment...</title>") &&
        !curlOut.includes("403 Forbidden") &&
        !curlOut.includes("error code:")
    ) {
        return {
            ok: true,
            status: 200,
            headers: new Map([["content-type", "text/plain"]]),
            text: async () => curlOut,
            json: async () => JSON.parse(curlOut),
        };
    }
    return null;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const headers = {
        "User-Agent": LOON_UA,
        Accept: "*/*",
        ...(options.headers || {}),
    };

    // 如果配置了 WARP_PROXY 且请求的是 kelee.one，优先走 WARP 代理绕过机房 IP 403
    if (process.env.WARP_PROXY && url.includes("kelee.one")) {
        try {
            const proxied = curlFetch(url, headers["User-Agent"]);
            if (proxied) return proxied;
        } catch {
            // fallback to normal fetch
        }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });
        if (res.status === 403) {
            try {
                const fallback = curlFetch(url, headers["User-Agent"]);
                if (fallback) return fallback;
            } catch {
                // ignore curl fallback error and return original response
            }
        }
        return res;
    } finally {
        clearTimeout(timer);
    }
}

async function loadParserCode() {
    console.log("📥 正在拉取最新 Script-Hub 转换核心 (Rewrite-Parser.beta.js)...");
    const res = await fetchWithTimeout(PARSER_URL);
    if (!res.ok) {
        throw new Error(`无法拉取 Script-Hub 解析器: HTTP ${res.status}`);
    }
    let code = await res.text();

    // 1. 保留 #!tag= 标签，避免当指定 category=iKeLee 时把 tag 也改名为第二个 #!category=
    code = code.replace(
        "} else if (!isLooniOS && key == 'tag') {\n            key = 'category'",
        "} else if (!isLooniOS && key == 'tag' && !modInfoObj['category']) {\n            key = 'category'"
    );

    // 2. Loon v2 json.replace / json.add 中 "{}" 与 "[]" 表示空对象与空数组
    code = code.replace(
        "function pushLoonV2JsonRewrite(phase, pattern, operation, paths, values, mark = '') {",
        `function pushLoonV2JsonRewrite(phase, pattern, operation, paths, rawValues, mark = '') {
  const values = Array.isArray(rawValues) ? rawValues.map(v => v === "{}" ? {} : v === "[]" ? [] : v) : rawValues;`
    );

    return code;
}

async function convertLpxText(parserCode, lpxUrl, lpxText, category = "iKeLee") {
    let doneValue = null;
    const headersParam = encodeURIComponent(`User-Agent: ${LOON_UA}`);
    const requestUrl = `https://script.hub/file/_start_/${lpxUrl}/_end_/out.sgmodule?type=loon-plugin&target=surge-module&category=${encodeURIComponent(
        category
    )}&jqEnabled=true&sni=%2C&pm=%2C&nore=true&noNtf=true&headers=${headersParam}`;

    const httpGet = (options, callback) => {
        const targetUrl = typeof options === "string" ? options : options?.url;
        if (targetUrl === lpxUrl) {
            callback(
                null,
                { status: 200, statusCode: 200, headers: {}, body: lpxText },
                lpxText
            );
            return;
        }
        const headers = (typeof options === "object" && options?.headers) || {};
        fetchWithTimeout(targetUrl, { headers })
            .then(async (r) => {
                const body = await r.text();
                callback(
                    null,
                    {
                        status: r.status,
                        statusCode: r.status,
                        headers: Object.fromEntries(r.headers.entries()),
                        body,
                    },
                    body
                );
            })
            .catch((err) => callback(err.message, null, null));
    };

    const context = {
        console: {
            log: () => {},
            warn: () => {},
            error: () => {},
        },
        Date,
        Error,
        JSON,
        Math,
        RegExp,
        String,
        Number,
        Object,
        Array,
        Map,
        Set,
        URL,
        URLSearchParams,
        Promise,
        Uint8Array,
        TextEncoder,
        TextDecoder,
        encodeURIComponent,
        decodeURIComponent,
        parseInt,
        parseFloat,
        isFinite,
        setTimeout,
        clearTimeout,
        $request: { url: requestUrl, method: "GET", headers: {} },
        $response: { body: "" },
        $done: (val) => {
            doneValue = val;
        },
        $environment: { "surge-version": "5.10.0" },
        $persistentStore: {
            read: () => null,
            write: () => true,
        },
        $notification: {
            post: () => {},
        },
        $httpClient: {
            get: httpGet,
            post: (options, callback) =>
                callback(null, { status: 200, statusCode: 200, headers: {} }, ""),
        },
    };
    context.globalThis = context;

    vm.runInNewContext(parserCode, context, { filename: "Rewrite-Parser.beta.js" });

    for (let i = 0; i < 400 && !doneValue; i++) {
        await new Promise((r) => setTimeout(r, 25));
    }
    if (!doneValue) {
        throw new Error("转换超时");
    }
    const body = doneValue?.response?.body ?? doneValue?.body ?? "";
    return body;
}

async function runPool(items, concurrency, worker) {
    let idx = 0;
    const workers = Array.from({ length: concurrency }, async () => {
        while (idx < items.length) {
            const current = idx++;
            await worker(items[current], current);
        }
    });
    await Promise.all(workers);
}

async function updateKeleePlugins(parserCode, forceAll = false) {
    console.log("📥 正在获取可莉插件列表 (https://hub.kelee.one/list.json)...");
    const listRes = await fetchWithTimeout(KELEE_LIST_URL);
    if (!listRes.ok) {
        throw new Error(`获取 list.json 失败: HTTP ${listRes.status}`);
    }
    const listData = await listRes.json();
    const plugins = listData.lists || [];
    console.log(`📋 共发现 ${plugins.length} 个上游 Loon 插件`);

    const mapFilePath = path.join(SURGE_DIR, "pluginhub_map.yaml");
    const existingMap = {};
    if (fs.existsSync(mapFilePath)) {
        const rawYaml = fs.readFileSync(mapFilePath, "utf8");
        for (const line of rawYaml.split(/\r?\n/)) {
            const m = line.match(/^"(.+?)":\s*"(.+?)"$/);
            if (m) existingMap[m[1]] = m[2];
        }
    }

    let updatedCount = 0;
    let skippedUpToDate = 0;
    let skippedExcluded = 0;
    let failedCount = 0;
    const pluginDateMap = {};

    await runPool(plugins, 10, async (item) => {
        const name = item.name.trim();
        if (EXCLUDED_KELEE_PLUGINS.has(name)) {
            skippedExcluded++;
            return;
        }

        const lpxUrl = (item.url || "").replace(/^loon:\/\/import\?plugin=/i, "").trim();
        if (!lpxUrl) return;

        const surgeFilePath = path.join(SURGE_DIR, `${name}.sgmodule`);
        const betaFilePath = path.join(BETA_DIR, `${name}.beta.sgmodule`);
        const listDate = (item.date || "").trim();

        if (!forceAll && fs.existsSync(surgeFilePath) && fs.existsSync(betaFilePath)) {
            if (existingMap[name] && existingMap[name] === listDate) {
                pluginDateMap[name] = listDate;
                skippedUpToDate++;
                return;
            }
        }

        try {
            const lpxRes = await fetchWithTimeout(lpxUrl, {
                headers: { "User-Agent": LOON_UA },
            });
            if (!lpxRes.ok) {
                throw new Error(`HTTP ${lpxRes.status}`);
            }
            const lpxText = await lpxRes.text();
            if (!lpxText.includes("#!name=")) {
                console.warn(`⚠️ 跳过加密或空插件: ${name}`);
                failedCount++;
                return;
            }

            const surgeBody = await convertLpxText(parserCode, lpxUrl, lpxText, "iKeLee");
            if (
                !surgeBody ||
                surgeBody.includes("Script Hub 重写转换: ❌") ||
                surgeBody.includes("读取不到 Loon 插件头内容")
            ) {
                throw new Error("解析器返回错误内容");
            }

            const betaBody = surgeBody.replace(
                /^#!category=iKeLee$/m,
                "#!category=BetaModule"
            );

            fs.writeFileSync(surgeFilePath, surgeBody, "utf8");
            fs.writeFileSync(betaFilePath, betaBody, "utf8");

            // 同步更新旧版改名别名文件
            const aliases = LEGACY_NAME_ALIASES[name] || [];
            for (const aliasName of aliases) {
                fs.writeFileSync(
                    path.join(SURGE_DIR, `${aliasName}.sgmodule`),
                    surgeBody,
                    "utf8"
                );
                fs.writeFileSync(
                    path.join(BETA_DIR, `${aliasName}.beta.sgmodule`),
                    betaBody,
                    "utf8"
                );
            }

            pluginDateMap[name] = listDate || surgeBody.match(/^#!date=(.+)$/m)?.[1]?.trim() || "";
            updatedCount++;
            process.stdout.write(`\r✅ 已转换更新: ${updatedCount} 个 (当前: ${name})          `);
        } catch (err) {
            failedCount++;
            console.warn(`\n❌ 转换失败 [${name}]: ${err.message}`);
        }
    });

    console.log(
        `\n🎉 iKeLee 插件处理完成: 更新 ${updatedCount} 个, 已是最新跳过 ${skippedUpToDate} 个, 排除 ${skippedExcluded} 个, 失败/跳过 ${failedCount} 个`
    );

    const yamlLines = Object.entries(pluginDateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `"${k}": "${v}"`);
    fs.writeFileSync(
        mapFilePath,
        yamlLines.length > 0 ? yamlLines.join("\n") + "\n" : "{}\n",
        "utf8"
    );
}

async function updateOfficialModules() {
    console.log("📥 正在检查并更新 Surge/Official 原生模块...");
    const entries = Object.entries(OFFICIAL_MODULES);
    let updated = 0;
    let failed = 0;

    await runPool(entries, 8, async ([name, url]) => {
        const targetPath = path.join(OFFICIAL_DIR, `${name}.official.sgmodule`);
        try {
            const res = await fetchWithTimeout(url);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const text = await res.text();
            if (!text.trim() || text.trim().startsWith("<!DOCTYPE html")) {
                throw new Error("返回内容不是有效的 sgmodule");
            }
            fs.writeFileSync(targetPath, text, "utf8");
            updated++;
        } catch (err) {
            failed++;
            console.warn(`⚠️ Official 模块拉取跳过 [${name}]: ${err.message} (保留本地版本)`);
        }
    });

    console.log(`🎉 Official 模块更新完成: 成功同步 ${updated} 个, 保留本地 ${failed} 个`);
}

async function main() {
    const args = process.argv.slice(2);
    const forceAll = args.includes("--force");
    const skipOfficial = args.includes("--skip-official");

    fs.mkdirSync(SURGE_DIR, { recursive: true });
    fs.mkdirSync(BETA_DIR, { recursive: true });
    fs.mkdirSync(OFFICIAL_DIR, { recursive: true });

    const parserCode = await loadParserCode();
    await updateKeleePlugins(parserCode, forceAll);

    if (!skipOfficial) {
        await updateOfficialModules();
    }

    console.log("🔨 正在重新构建索引页面 (build.ts)...");
    await import("./build.ts");
    console.log("✨ 全部更新完成！");
}

main().catch((err) => {
    console.error("更新过程中出错:", err);
    process.exit(1);
});
