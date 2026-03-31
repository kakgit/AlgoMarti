#!/usr/bin/env node
"use strict";

const fs = require("fs");

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function num(v, d = NaN){
    const x = Number(v);
    return Number.isFinite(x) ? x : d;
}

function int(v, d = NaN){
    const x = Number(v);
    return Number.isFinite(x) ? Math.trunc(x) : d;
}

function parseArgs(argv){
    const out = {
        symbol: "BTCUSD",
        resolution: "1s",
        source: "ohlc",
        days: 30,
        chunkDays: 1,
        brickSizes: [50, 100],
        minPatternLen: 2,
        maxPatternLen: 5,
        horizon: 1,
        minSamples: 30,
        top: 30,
        startIso: "",
        endIso: "",
        outFile: ""
    };

    for(let i = 2; i < argv.length; i++){
        const a = argv[i];
        if(a === "--symbol" && argv[i + 1]) out.symbol = String(argv[++i]).toUpperCase();
        else if(a === "--resolution" && argv[i + 1]) out.resolution = String(argv[++i]);
        else if(a === "--source" && argv[i + 1]) out.source = String(argv[++i]).toLowerCase();
        else if(a === "--days" && argv[i + 1]) out.days = int(argv[++i], out.days);
        else if(a === "--chunkDays" && argv[i + 1]) out.chunkDays = int(argv[++i], out.chunkDays);
        else if(a === "--boxes" && argv[i + 1]){
            out.brickSizes = String(argv[++i])
                .split(",")
                .map((s) => num(s.trim()))
                .filter((x) => Number.isFinite(x) && x > 0);
        }
        else if(a === "--minLen" && argv[i + 1]) out.minPatternLen = int(argv[++i], out.minPatternLen);
        else if(a === "--maxLen" && argv[i + 1]) out.maxPatternLen = int(argv[++i], out.maxPatternLen);
        else if(a === "--horizon" && argv[i + 1]) out.horizon = int(argv[++i], out.horizon);
        else if(a === "--minSamples" && argv[i + 1]) out.minSamples = int(argv[++i], out.minSamples);
        else if(a === "--top" && argv[i + 1]) out.top = int(argv[++i], out.top);
        else if(a === "--start" && argv[i + 1]) out.startIso = String(argv[++i]);
        else if(a === "--end" && argv[i + 1]) out.endIso = String(argv[++i]);
        else if(a === "--out" && argv[i + 1]) out.outFile = String(argv[++i]);
    }

    if(out.source !== "close" && out.source !== "ohlc"){
        out.source = "ohlc";
    }
    if(!Number.isFinite(out.horizon) || out.horizon < 1){
        out.horizon = 1;
    }
    if(!Number.isFinite(out.minPatternLen) || out.minPatternLen < 1){
        out.minPatternLen = 1;
    }
    if(!Number.isFinite(out.maxPatternLen) || out.maxPatternLen < out.minPatternLen){
        out.maxPatternLen = out.minPatternLen;
    }
    if(!Array.isArray(out.brickSizes) || out.brickSizes.length === 0){
        out.brickSizes = [50, 100];
    }
    return out;
}

async function fetchCandlesChunk(symbol, resolution, startSec, endSec){
    const url = `${BASE_URL}?resolution=${encodeURIComponent(resolution)}&symbol=${encodeURIComponent(symbol)}&start=${startSec}&end=${endSec}`;
    const resp = await fetch(url, {
        method: "GET",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    });
    if(!resp.ok){
        throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if(!data?.success || !Array.isArray(data.result)){
        throw new Error("Bad candles payload");
    }
    return data.result;
}

async function fetchCandlesRange(cfg, startSec, endSec){
    const out = [];
    let cursor = startSec;
    const stepSec = Math.max(1, cfg.chunkDays) * 86400;
    while(cursor < endSec){
        const to = Math.min(endSec, cursor + stepSec);
        const part = await fetchCandlesChunk(cfg.symbol, cfg.resolution, cursor, to);
        out.push(...part);
        cursor = to + 1;
    }
    return out;
}

function normalizeRows(rows){
    const byTs = new Map();
    for(const r of rows){
        const t = int(r.time, NaN);
        const o = num(r.open, NaN);
        const h = num(r.high, NaN);
        const l = num(r.low, NaN);
        const c = num(r.close, NaN);
        if(Number.isFinite(t) && Number.isFinite(o) && Number.isFinite(h) && Number.isFinite(l) && Number.isFinite(c)){
            byTs.set(t, { t, o, h, l, c });
        }
    }
    return [...byTs.values()].sort((a, b) => a.t - b.t);
}

function buildRenko(rows, brick, source){
    if(!Array.isArray(rows) || rows.length < 2){
        return [];
    }
    const out = [];
    let lastClose = Math.round(rows[0].c / brick) * brick;
    let rangeMin = lastClose;
    let rangeMax = lastClose;

    function consider(price, ts){
        if(!Number.isFinite(price)){
            return;
        }
        if(price < rangeMin) rangeMin = price;
        if(price > rangeMax) rangeMax = price;

        while(price >= lastClose + brick){
            const open = lastClose;
            const close = lastClose + brick;
            out.push({ Open: open, Close: close, High: Math.max(close, rangeMax), Low: Math.min(open, rangeMin), Color: "G", Ts: ts });
            lastClose = close;
            rangeMin = lastClose;
            rangeMax = price;
        }
        while(price <= lastClose - brick){
            const open = lastClose;
            const close = lastClose - brick;
            out.push({ Open: open, Close: close, High: Math.max(open, rangeMax), Low: Math.min(close, rangeMin), Color: "R", Ts: ts });
            lastClose = close;
            rangeMax = lastClose;
            rangeMin = price;
        }
    }

    for(const r of rows){
        if(source === "close"){
            consider(r.c, r.t);
            continue;
        }
        const seq = r.c >= r.o ? [r.o, r.h, r.l, r.c] : [r.o, r.l, r.h, r.c];
        for(const p of seq){
            consider(p, r.t);
        }
    }
    return out;
}

function newSideStats(){
    return { wins: 0, losses: 0, flats: 0, pnlPts: 0 };
}

function newPatternStats(){
    return {
        pattern: "",
        samples: 0,
        nextGreen: 0,
        nextRed: 0,
        long: newSideStats(),
        short: newSideStats()
    };
}

function finalizeSide(side, samples){
    const total = side.wins + side.losses + side.flats;
    return {
        wins: side.wins,
        losses: side.losses,
        flats: side.flats,
        winRatePct: total > 0 ? (side.wins * 100 / total) : 0,
        avgPts: total > 0 ? (side.pnlPts / total) : 0,
        totalPts: side.pnlPts,
        samples
    };
}

function scanPatterns(colors, brick, cfg){
    const map = new Map();
    const horizon = cfg.horizon;
    const n = colors.length;
    if(n < (cfg.minPatternLen + horizon)){
        return [];
    }

    for(let L = cfg.minPatternLen; L <= cfg.maxPatternLen; L++){
        for(let i = L - 1; i <= (n - horizon - 1); i++){
            const p = colors.slice(i - L + 1, i + 1).join("");
            let st = map.get(p);
            if(!st){
                st = newPatternStats();
                st.pattern = p;
                map.set(p, st);
            }
            st.samples += 1;

            const next = colors[i + 1];
            if(next === "G") st.nextGreen += 1;
            else if(next === "R") st.nextRed += 1;

            let score = 0;
            for(let h = 1; h <= horizon; h++){
                const c = colors[i + h];
                if(c === "G") score += 1;
                else if(c === "R") score -= 1;
            }
            const longPts = score * brick;
            const shortPts = -longPts;

            st.long.pnlPts += longPts;
            st.short.pnlPts += shortPts;

            if(longPts > 0) st.long.wins += 1;
            else if(longPts < 0) st.long.losses += 1;
            else st.long.flats += 1;

            if(shortPts > 0) st.short.wins += 1;
            else if(shortPts < 0) st.short.losses += 1;
            else st.short.flats += 1;
        }
    }

    const out = [];
    for(const st of map.values()){
        if(st.samples < cfg.minSamples){
            continue;
        }
        const longStats = finalizeSide(st.long, st.samples);
        const shortStats = finalizeSide(st.short, st.samples);
        const best = (longStats.avgPts >= shortStats.avgPts)
            ? { side: "LONG", ...longStats }
            : { side: "SHORT", ...shortStats };

        out.push({
            pattern: st.pattern,
            len: st.pattern.length,
            samples: st.samples,
            nextGreenPct: st.samples > 0 ? (st.nextGreen * 100 / st.samples) : 0,
            nextRedPct: st.samples > 0 ? (st.nextRed * 100 / st.samples) : 0,
            long: longStats,
            short: shortStats,
            best
        });
    }

    out.sort((a, b) => {
        if(b.best.avgPts !== a.best.avgPts) return b.best.avgPts - a.best.avgPts;
        if(b.best.winRatePct !== a.best.winRatePct) return b.best.winRatePct - a.best.winRatePct;
        return b.samples - a.samples;
    });

    return out;
}

function fmt(n, d = 2){
    return Number(n).toFixed(d);
}

function iso(sec){
    return new Date(sec * 1000).toISOString();
}

function printTop(rows, top){
    console.log("Pattern | N | Best | AvgPts | Win% | NextG% | NextR%");
    for(let i = 0; i < Math.min(top, rows.length); i++){
        const r = rows[i];
        console.log(
            `${r.pattern} | ${r.samples} | ${r.best.side} | ${fmt(r.best.avgPts, 2)} | ${fmt(r.best.winRatePct, 1)} | ${fmt(r.nextGreenPct, 1)} | ${fmt(r.nextRedPct, 1)}`
        );
    }
}

async function main(){
    const cfg = parseArgs(process.argv);
    const nowSec = Math.floor(Date.now() / 1000);
    let startSec = nowSec - (Math.max(1, cfg.days) * 86400);
    let endSec = nowSec;

    if(cfg.startIso){
        const s = Date.parse(cfg.startIso);
        if(Number.isFinite(s)) startSec = Math.floor(s / 1000);
    }
    if(cfg.endIso){
        const e = Date.parse(cfg.endIso);
        if(Number.isFinite(e)) endSec = Math.floor(e / 1000);
    }
    if(endSec <= startSec){
        throw new Error("Invalid time window. end must be after start.");
    }

    const candles = await fetchCandlesRange(cfg, startSec, endSec);
    const rows = normalizeRows(candles);
    if(rows.length < 10){
        throw new Error(`Not enough candles fetched for ${cfg.symbol} ${cfg.resolution}. Try different resolution/window.`);
    }

    const report = {
        meta: {
            symbol: cfg.symbol,
            resolution: cfg.resolution,
            source: cfg.source,
            horizon: cfg.horizon,
            minPatternLen: cfg.minPatternLen,
            maxPatternLen: cfg.maxPatternLen,
            minSamples: cfg.minSamples,
            candles: rows.length,
            windowStart: iso(startSec),
            windowEnd: iso(endSec),
            generatedAt: new Date().toISOString()
        },
        byBrick: {}
    };

    console.log("Renko Pattern Miner");
    console.log(`Symbol: ${cfg.symbol} | Resolution: ${cfg.resolution} | Source: ${cfg.source}`);
    console.log(`Window: ${iso(startSec)} -> ${iso(endSec)} | Candles: ${rows.length}`);
    console.log(`PatternLen: ${cfg.minPatternLen}-${cfg.maxPatternLen} | Horizon: ${cfg.horizon} | MinSamples: ${cfg.minSamples}`);

    for(const brick of cfg.brickSizes){
        const boxes = buildRenko(rows, brick, cfg.source);
        const colors = boxes.map((b) => b.Color);
        const ranked = scanPatterns(colors, brick, cfg);

        report.byBrick[String(brick)] = {
            brick,
            renkoBoxes: boxes.length,
            patternsQualified: ranked.length,
            top: ranked.slice(0, cfg.top),
            all: ranked
        };

        console.log("");
        console.log(`Brick ${brick} | Boxes: ${boxes.length} | Qualified Patterns: ${ranked.length}`);
        if(ranked.length === 0){
            console.log("No patterns met min sample threshold.");
        }
        else{
            printTop(ranked, cfg.top);
        }
    }

    if(cfg.outFile){
        fs.writeFileSync(cfg.outFile, JSON.stringify(report, null, 2), "utf8");
        console.log("");
        console.log(`Saved report: ${cfg.outFile}`);
    }
}

main().catch((err) => {
    console.error(`Failed: ${err.message || err}`);
    process.exit(1);
});
