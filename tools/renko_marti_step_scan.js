#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function num(v, d = NaN){
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
}

function int(v, d = NaN){
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : d;
}

function parseArgs(argv){
    const out = {
        symbol: "BTCUSD",
        resolution: "1m",
        days: 90,
        chunkDays: 2,
        step: 7,
        sizes: [20, 30, 40, 50, 60, 80, 100, 120, 150, 200]
    };
    for(let i = 2; i < argv.length; i++){
        const a = argv[i];
        if(a === "--symbol" && argv[i + 1]) out.symbol = String(argv[++i]).toUpperCase();
        else if(a === "--resolution" && argv[i + 1]) out.resolution = String(argv[++i]);
        else if(a === "--days" && argv[i + 1]) out.days = int(argv[++i], out.days);
        else if(a === "--chunkDays" && argv[i + 1]) out.chunkDays = int(argv[++i], out.chunkDays);
        else if(a === "--step" && argv[i + 1]) out.step = int(argv[++i], out.step);
        else if(a === "--sizes" && argv[i + 1]){
            out.sizes = String(argv[++i]).split(",").map(s => num(s.trim())).filter(n => Number.isFinite(n) && n > 0);
        }
    }
    return out;
}

async function fetchCandles(symbol, resolution, startSec, endSec){
    const url = `${BASE_URL}?resolution=${encodeURIComponent(resolution)}&symbol=${encodeURIComponent(symbol)}&start=${startSec}&end=${endSec}`;
    const resp = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    });
    if(!resp.ok){
        throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if(!data?.success || !Array.isArray(data.result)){
        throw new Error("Invalid candles payload");
    }
    return data.result;
}

function buildBrickColors(closes, brick){
    if(!Array.isArray(closes) || closes.length < 2) return [];
    const out = [];
    let last = closes[0];
    for(let i = 1; i < closes.length; i++){
        const c = closes[i];
        if(!Number.isFinite(c)) continue;
        while(c - last >= brick){
            out.push("G");
            last += brick;
        }
        while(last - c >= brick){
            out.push("R");
            last -= brick;
        }
    }
    return out;
}

function runStats(colors, step){
    if(colors.length === 0){
        return { runs: 0, maxRun: 0, crossRuns: 0, crossed: false };
    }
    let prev = colors[0];
    let len = 1;
    let runs = 0;
    let maxRun = 1;
    let crossRuns = 0;
    for(let i = 1; i < colors.length; i++){
        const c = colors[i];
        if(c === prev){
            len += 1;
        }
        else{
            runs += 1;
            if(len > maxRun) maxRun = len;
            if(len >= step) crossRuns += 1;
            prev = c;
            len = 1;
        }
    }
    runs += 1;
    if(len > maxRun) maxRun = len;
    if(len >= step) crossRuns += 1;
    return { runs, maxRun, crossRuns, crossed: maxRun >= step };
}

function iso(sec){
    return new Date(sec * 1000).toISOString();
}

async function main(){
    const cfg = parseArgs(process.argv);
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = nowSec - (cfg.days * 86400);
    const chunkSec = Math.max(1, cfg.chunkDays) * 86400;

    let cursor = startSec;
    const rows = [];
    while(cursor < nowSec){
        const end = Math.min(nowSec, cursor + chunkSec);
        const part = await fetchCandles(cfg.symbol, cfg.resolution, cursor, end);
        rows.push(...part);
        cursor = end + 1;
    }

    const byTs = new Map();
    for(const r of rows){
        const t = int(r.time, NaN);
        const c = num(r.close, NaN);
        if(Number.isFinite(t) && Number.isFinite(c)) byTs.set(t, c);
    }
    const closes = [...byTs.entries()].sort((a, b) => a[0] - b[0]).map(x => x[1]);
    if(closes.length < 2){
        throw new Error("Not enough candle data");
    }

    console.log(`Martingale Step Risk Scan`);
    console.log(`Symbol: ${cfg.symbol} | Resolution: ${cfg.resolution} | Days: ${cfg.days} | StepThreshold: ${cfg.step}`);
    console.log(`Range: ${iso(startSec)} -> ${iso(nowSec)} | Candles: ${closes.length}`);
    console.log("Size | Bricks | Runs | MaxRun | Runs>=Step | CrossStep?");

    const safeSizes = [];
    for(const s of cfg.sizes){
        const colors = buildBrickColors(closes, s);
        const st = runStats(colors, cfg.step);
        const cross = st.crossed ? "YES" : "NO";
        if(!st.crossed) safeSizes.push(s);
        console.log(`${s} | ${colors.length} | ${st.runs} | ${st.maxRun} | ${st.crossRuns} | ${cross}`);
    }

    if(safeSizes.length){
        console.log(`Safe sizes in this sample (no run >= ${cfg.step}): ${safeSizes.join(", ")}`);
    }
    else{
        console.log(`No tested size avoided run >= ${cfg.step} in this sample.`);
    }
}

main().catch((err) => {
    console.error(`Failed: ${err.message || err}`);
    process.exit(1);
});
