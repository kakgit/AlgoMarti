#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function toInt(v, dflt){
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : dflt;
}

function toNum(v, dflt){
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
}

function fmtTs(sec){
    return new Date(sec * 1000).toISOString();
}

function parseArgs(argv){
    const args = {
        symbol: "BTCUSD",
        resolution: "1m",
        brick: 20,
        days: 30,
        chunkDays: 3
    };
    for(let i = 2; i < argv.length; i++){
        const a = argv[i];
        if(a === "--symbol" && argv[i + 1]){ args.symbol = String(argv[++i]).toUpperCase(); }
        else if(a === "--resolution" && argv[i + 1]){ args.resolution = String(argv[++i]); }
        else if(a === "--brick" && argv[i + 1]){ args.brick = toNum(argv[++i], 20); }
        else if(a === "--days" && argv[i + 1]){ args.days = toInt(argv[++i], 30); }
        else if(a === "--chunkDays" && argv[i + 1]){ args.chunkDays = toInt(argv[++i], 3); }
    }
    return args;
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
        throw new Error(`HTTP ${resp.status} for ${url}`);
    }
    const data = await resp.json();
    if(!data || data.success !== true || !Array.isArray(data.result)){
        throw new Error(`Unexpected candle payload for ${symbol}`);
    }
    return data.result;
}

function buildRenkoColorsFromCloses(closes, brickSize){
    if(!Array.isArray(closes) || closes.length < 2 || !Number.isFinite(brickSize) || brickSize <= 0){
        return [];
    }
    const colors = [];
    let lastBrickClose = closes[0];

    for(let i = 1; i < closes.length; i++){
        const c = closes[i];
        if(!Number.isFinite(c)){ continue; }

        while((c - lastBrickClose) >= brickSize){
            colors.push("green");
            lastBrickClose += brickSize;
        }
        while((lastBrickClose - c) >= brickSize){
            colors.push("red");
            lastBrickClose -= brickSize;
        }
    }
    return colors;
}

function calcGreenRunStats(colors){
    const runs = [];
    let greenCount = 0;

    for(const color of colors){
        if(color === "green"){
            greenCount += 1;
        }
        else if(color === "red"){
            if(greenCount > 0){
                runs.push(greenCount);
            }
            greenCount = 0;
        }
    }

    if(runs.length === 0){
        return {
            runs,
            average: 0,
            median: 0,
            max: 0
        };
    }

    const total = runs.reduce((a, b) => a + b, 0);
    const average = total / runs.length;
    const sorted = [...runs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const max = sorted[sorted.length - 1];
    return { runs, average, median, max };
}

async function main(){
    const opts = parseArgs(process.argv);
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = nowSec - (opts.days * 86400);
    const chunkSec = Math.max(1, opts.chunkDays) * 86400;

    let cursor = startSec;
    const all = [];
    while(cursor < nowSec){
        const end = Math.min(nowSec, cursor + chunkSec);
        const rows = await fetchCandles(opts.symbol, opts.resolution, cursor, end);
        all.push(...rows);
        cursor = end + 1;
    }

    const byTs = new Map();
    for(const row of all){
        const ts = toInt(row.time, NaN);
        const close = toNum(row.close, NaN);
        if(Number.isFinite(ts) && Number.isFinite(close)){
            byTs.set(ts, close);
        }
    }
    const closes = [...byTs.entries()]
        .sort((a, b) => a[0] - b[0])
        .map((x) => x[1]);

    if(closes.length < 2){
        console.log("Not enough candles returned to build Renko stats.");
        process.exit(0);
    }

    const colors = buildRenkoColorsFromCloses(closes, opts.brick);
    const stats = calcGreenRunStats(colors);

    console.log("Renko Green-Run Stats (until first red)");
    console.log(`Symbol      : ${opts.symbol}`);
    console.log(`Resolution  : ${opts.resolution}`);
    console.log(`Brick Size  : ${opts.brick} points`);
    console.log(`Lookback    : ${opts.days} days`);
    console.log(`Range       : ${fmtTs(startSec)} -> ${fmtTs(nowSec)}`);
    console.log(`Candles     : ${closes.length}`);
    console.log(`Renko Bricks: ${colors.length}`);
    console.log(`Runs Count  : ${stats.runs.length}`);
    console.log(`Average G   : ${stats.average.toFixed(3)}`);
    console.log(`Median G    : ${stats.median.toFixed(3)}`);
    console.log(`Max G       : ${stats.max}`);
}

main().catch((err) => {
    console.error("Failed:", err.message || err);
    process.exit(1);
});

