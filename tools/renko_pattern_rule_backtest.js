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

function expandPatternToken(raw){
  if(!raw) return "";
  let s = String(raw).toUpperCase().trim();
  if(s === "") return "";

  s = s.replace(/GREEN/g, "G").replace(/RED/g, "R");
  s = s.replace(/[^0-9RG]/g, "");
  if(s === "") return "";

  if(/^[RG]+$/.test(s)){
    return s;
  }

  const parts = [...s.matchAll(/(\d+)([RG])/g)];
  if(parts.length === 0) return "";

  let out = "";
  for(const m of parts){
    const k = int(m[1], 0);
    const c = m[2];
    if(k > 0 && (c === "R" || c === "G")){
      out += c.repeat(k);
    }
  }
  return /^[RG]+$/.test(out) ? out : "";
}

function parsePatternList(txt){
  const set = new Set();
  for(const token of String(txt || "").split(",")){
    const p = expandPatternToken(token);
    if(p) set.add(p);
  }
  return [...set.values()];
}

function parseArgs(argv){
  const out = {
    symbol: "BTCUSD",
    resolution: "1s",
    source: "ohlc",
    days: 30,
    chunkDays: 1,
    box: 50,
    sl: 150,
    tp: 200,
    minLen: 2,
    maxLen: 5,
    minTrades: 20,
    maxConsecSL: 3,
    maxHoldBoxes: 40,
    top: 50,
    patterns: [],
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
    else if(a === "--box" && argv[i + 1]) out.box = num(argv[++i], out.box);
    else if(a === "--sl" && argv[i + 1]) out.sl = num(argv[++i], out.sl);
    else if(a === "--tp" && argv[i + 1]) out.tp = num(argv[++i], out.tp);
    else if(a === "--minLen" && argv[i + 1]) out.minLen = int(argv[++i], out.minLen);
    else if(a === "--maxLen" && argv[i + 1]) out.maxLen = int(argv[++i], out.maxLen);
    else if(a === "--minTrades" && argv[i + 1]) out.minTrades = int(argv[++i], out.minTrades);
    else if(a === "--maxConsecSL" && argv[i + 1]) out.maxConsecSL = int(argv[++i], out.maxConsecSL);
    else if(a === "--maxHoldBoxes" && argv[i + 1]) out.maxHoldBoxes = int(argv[++i], out.maxHoldBoxes);
    else if(a === "--top" && argv[i + 1]) out.top = int(argv[++i], out.top);
    else if(a === "--patterns" && argv[i + 1]) out.patterns = parsePatternList(String(argv[++i]));
    else if(a === "--start" && argv[i + 1]) out.startIso = String(argv[++i]);
    else if(a === "--end" && argv[i + 1]) out.endIso = String(argv[++i]);
    else if(a === "--out" && argv[i + 1]) out.outFile = String(argv[++i]);
  }

  if(out.source !== "close" && out.source !== "ohlc") out.source = "ohlc";
  if(out.maxLen < out.minLen) out.maxLen = out.minLen;
  if(out.minLen < 1) out.minLen = 1;
  if(out.maxHoldBoxes < 1) out.maxHoldBoxes = 40;
  if(out.minTrades < 1) out.minTrades = 1;
  if(out.maxConsecSL < 0) out.maxConsecSL = 0;

  if(out.patterns.length > 0){
    const lens = out.patterns.map((p) => p.length);
    out.minLen = Math.min(...lens);
    out.maxLen = Math.max(...lens);
  }
  return out;
}

async function fetchCandlesChunk(symbol, resolution, startSec, endSec){
  const url = `${BASE_URL}?resolution=${encodeURIComponent(resolution)}&symbol=${encodeURIComponent(symbol)}&start=${startSec}&end=${endSec}`;
  const resp = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
  if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if(!data?.success || !Array.isArray(data.result)) throw new Error("Bad candles payload");
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
  if(!Array.isArray(rows) || rows.length < 2) return [];
  const out = [];
  let lastClose = Math.round(rows[0].c / brick) * brick;
  let rangeMin = lastClose;
  let rangeMax = lastClose;

  function consider(price, ts){
    if(!Number.isFinite(price)) return;
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
    for(const p of seq) consider(p, r.t);
  }
  return out;
}

function pathForBox(box){
  if(box.Color === "R") return [box.Open, box.Low, box.High, box.Close];
  return [box.Open, box.High, box.Low, box.Close];
}

function firstHit(path, sl, tp){
  for(let k = 1; k < path.length; k++){
    const a = path[k - 1];
    const b = path[k];
    const mn = Math.min(a, b);
    const mx = Math.max(a, b);
    const hitSL = (sl >= mn && sl <= mx);
    const hitTP = (tp >= mn && tp <= mx);
    if(hitSL && hitTP){
      return Math.abs(sl - a) <= Math.abs(tp - a) ? "SL" : "TP";
    }
    if(hitSL) return "SL";
    if(hitTP) return "TP";
  }
  return "";
}

function initStats(pattern, side){
  return {
    pattern,
    side,
    trades: 0,
    wins: 0,
    losses: 0,
    flats: 0,
    slHits: 0,
    tpHits: 0,
    timeoutHits: 0,
    maxConsecSL: 0,
    totalPts: 0,
    avgPts: 0,
    winRatePct: 0
  };
}

function simulatePattern(boxes, pattern, side, cfg){
  const L = pattern.length;
  const stats = initStats(pattern, side);
  let consecSL = 0;

  let i = L - 1;
  while(i < boxes.length - 1){
    const seq = boxes.slice(i - L + 1, i + 1).map((b) => b.Color).join("");
    if(seq !== pattern){
      i += 1;
      continue;
    }

    const entry = boxes[i].Close;
    let slLevel = 0;
    let tpLevel = 0;
    if(side === "LONG"){
      slLevel = entry - cfg.sl;
      tpLevel = entry + cfg.tp;
    }
    else{
      slLevel = entry + cfg.sl;
      tpLevel = entry - cfg.tp;
    }

    let exitIdx = -1;
    let exitReason = "TIME";
    let pnlPts = 0;

    const lastIdx = Math.min(boxes.length - 1, i + cfg.maxHoldBoxes);
    for(let j = i + 1; j <= lastIdx; j++){
      const p = pathForBox(boxes[j]);
      let hit = "";
      if(side === "LONG"){
        hit = firstHit(p, slLevel, tpLevel);
      }
      else{
        hit = firstHit(p, tpLevel, slLevel);
        if(hit === "SL") hit = "TP";
        else if(hit === "TP") hit = "SL";
      }

      if(hit === "SL"){
        exitIdx = j;
        exitReason = "SL";
        pnlPts = -cfg.sl;
        break;
      }
      if(hit === "TP"){
        exitIdx = j;
        exitReason = "TP";
        pnlPts = cfg.tp;
        break;
      }
    }

    if(exitIdx < 0){
      exitIdx = lastIdx;
      const exitPx = boxes[exitIdx].Close;
      const raw = side === "LONG" ? (exitPx - entry) : (entry - exitPx);
      pnlPts = raw;
      exitReason = "TIME";
    }

    stats.trades += 1;
    stats.totalPts += pnlPts;

    if(exitReason === "SL"){
      stats.losses += 1;
      stats.slHits += 1;
      consecSL += 1;
      if(consecSL > stats.maxConsecSL) stats.maxConsecSL = consecSL;
    }
    else if(exitReason === "TP"){
      stats.wins += 1;
      stats.tpHits += 1;
      consecSL = 0;
    }
    else{
      stats.timeoutHits += 1;
      if(pnlPts > 0){
        stats.wins += 1;
        consecSL = 0;
      }
      else if(pnlPts < 0){
        stats.losses += 1;
        consecSL = 0;
      }
      else{
        stats.flats += 1;
        consecSL = 0;
      }
    }

    i = exitIdx + 1;
  }

  if(stats.trades > 0){
    stats.avgPts = stats.totalPts / stats.trades;
    stats.winRatePct = (stats.wins * 100) / stats.trades;
  }
  return stats;
}

function getObservedPatterns(boxes, minLen, maxLen){
  const out = new Set();
  const n = boxes.length;
  for(let L = minLen; L <= maxLen; L++){
    for(let i = L - 1; i < n; i++){
      const p = boxes.slice(i - L + 1, i + 1).map((b) => b.Color).join("");
      out.add(p);
    }
  }
  return [...out.values()];
}

function bestSide(a, b){
  if(a.avgPts !== b.avgPts) return a.avgPts > b.avgPts ? a : b;
  if(a.winRatePct !== b.winRatePct) return a.winRatePct > b.winRatePct ? a : b;
  return a.totalPts >= b.totalPts ? a : b;
}

function fmt(v, d = 2){
  return Number(v).toFixed(d);
}

function iso(sec){
  return new Date(sec * 1000).toISOString();
}

function printRows(rows, top){
  console.log("Pattern | Side | Trades | MaxSLStreak | Win% | AvgPts | TotPts | TP | SL | TIME");
  const lim = Math.min(rows.length, top);
  for(let i = 0; i < lim; i++){
    const r = rows[i];
    console.log(`${r.pattern} | ${r.side} | ${r.trades} | ${r.maxConsecSL} | ${fmt(r.winRatePct, 1)} | ${fmt(r.avgPts, 2)} | ${fmt(r.totalPts, 2)} | ${r.tpHits} | ${r.slHits} | ${r.timeoutHits}`);
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
  if(endSec <= startSec) throw new Error("Invalid time window.");

  const candles = await fetchCandlesRange(cfg, startSec, endSec);
  const rows = normalizeRows(candles);
  if(rows.length < 10) throw new Error("Not enough candles.");

  const boxes = buildRenko(rows, cfg.box, cfg.source);
  if(boxes.length < cfg.maxLen + 2) throw new Error("Not enough Renko boxes for selected pattern lengths.");

  const observedPatterns = getObservedPatterns(boxes, cfg.minLen, cfg.maxLen);
  const patterns = cfg.patterns.length > 0
    ? cfg.patterns.filter((p) => observedPatterns.includes(p))
    : observedPatterns;

  const passing = [];
  const all = [];

  for(const p of patterns){
    const longStats = simulatePattern(boxes, p, "LONG", cfg);
    const shortStats = simulatePattern(boxes, p, "SHORT", cfg);

    if(longStats.trades >= cfg.minTrades){
      all.push(longStats);
      if(longStats.maxConsecSL <= cfg.maxConsecSL) passing.push(longStats);
    }
    if(shortStats.trades >= cfg.minTrades){
      all.push(shortStats);
      if(shortStats.maxConsecSL <= cfg.maxConsecSL) passing.push(shortStats);
    }
  }

  const bestPerPattern = new Map();
  for(const r of passing){
    const k = r.pattern;
    if(!bestPerPattern.has(k)){
      bestPerPattern.set(k, r);
    }
    else{
      bestPerPattern.set(k, bestSide(bestPerPattern.get(k), r));
    }
  }

  const bestRows = [...bestPerPattern.values()].sort((a, b) => {
    if(b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
    if(b.avgPts !== a.avgPts) return b.avgPts - a.avgPts;
    if(b.winRatePct !== a.winRatePct) return b.winRatePct - a.winRatePct;
    return b.trades - a.trades;
  });

  const passRows = passing.sort((a, b) => {
    if(b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
    if(b.avgPts !== a.avgPts) return b.avgPts - a.avgPts;
    if(b.winRatePct !== a.winRatePct) return b.winRatePct - a.winRatePct;
    return b.trades - a.trades;
  });

  console.log("Renko Pattern Rule Backtest");
  console.log(`Symbol: ${cfg.symbol} | Resolution: ${cfg.resolution} | Source: ${cfg.source}`);
  console.log(`Window: ${iso(startSec)} -> ${iso(endSec)} | Candles: ${rows.length}`);
  console.log(`Box: ${cfg.box} | SL: ${cfg.sl} | TP: ${cfg.tp}`);
  console.log(`PatternLen: ${cfg.minLen}-${cfg.maxLen} | MinTrades: ${cfg.minTrades} | MaxConsecSL allowed: ${cfg.maxConsecSL}`);
  if(cfg.patterns.length > 0){
    console.log(`Requested patterns: ${cfg.patterns.length} | Available in window: ${patterns.length}`);
  }
  console.log(`Observed patterns: ${observedPatterns.length} | Tested patterns: ${patterns.length} | Tested rows (long+short): ${all.length} | Passing rows: ${passRows.length}`);

  console.log("\nTop Passing Pattern-Side Rows");
  printRows(passRows, cfg.top);

  console.log("\nTop Passing Best-Side Per Pattern");
  printRows(bestRows, cfg.top);

  if(cfg.outFile){
    const payload = {
      meta: {
        symbol: cfg.symbol,
        resolution: cfg.resolution,
        source: cfg.source,
        windowStart: iso(startSec),
        windowEnd: iso(endSec),
        candles: rows.length,
        renkoBoxes: boxes.length,
        box: cfg.box,
        sl: cfg.sl,
        tp: cfg.tp,
        minLen: cfg.minLen,
        maxLen: cfg.maxLen,
        minTrades: cfg.minTrades,
        maxConsecSL: cfg.maxConsecSL,
        maxHoldBoxes: cfg.maxHoldBoxes,
        requestedPatterns: cfg.patterns,
        observedPatterns: observedPatterns.length,
        testedPatterns: patterns.length,
        generatedAt: new Date().toISOString()
      },
      topPassingRows: passRows.slice(0, cfg.top),
      topBestPerPattern: bestRows.slice(0, cfg.top),
      allPassingRows: passRows
    };
    fs.writeFileSync(cfg.outFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`\nSaved report: ${cfg.outFile}`);
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message || err}`);
  process.exit(1);
});
