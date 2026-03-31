#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function num(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? x : d; }
function int(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : d; }

function parseBool(v, d = false){
  if(v === undefined || v === null) return d;
  const s = String(v).trim().toLowerCase();
  if(["1","true","yes","y","on"].includes(s)) return true;
  if(["0","false","no","n","off"].includes(s)) return false;
  return d;
}

function parsePatternList(txt){
  const set = new Set();
  for(const t of String(txt || "").split(",")){
    const s = t.toUpperCase().replace(/[^RG]/g, "").trim();
    if(s) set.add(s);
  }
  return [...set.values()];
}

function parseArgs(argv){
  const out = {
    symbol: "BTCUSD",
    resolution: "1m",
    source: "ohlc",
    days: 90,
    chunkDays: 1,
    box: 50,
    sl: 150,
    tp: 200,
    maxHoldBoxes: 60,
    streakGuardSL: 2,
    cooldownBoxes: 10,
    longPatterns: ["GGRGG"],
    shortPatterns: ["RRGRR"],
    martingale: false,
    baseQty: 1,
    maxMultiplier: 64,
    feePctPerSide: 0,
    slippagePtsPerSide: 0,
    startIso: "",
    endIso: ""
  };

  for(let i=2;i<argv.length;i++){
    const a = argv[i];
    if(a === "--symbol" && argv[i+1]) out.symbol = String(argv[++i]).toUpperCase();
    else if(a === "--resolution" && argv[i+1]) out.resolution = String(argv[++i]);
    else if(a === "--source" && argv[i+1]) out.source = String(argv[++i]).toLowerCase();
    else if(a === "--days" && argv[i+1]) out.days = int(argv[++i], out.days);
    else if(a === "--chunkDays" && argv[i+1]) out.chunkDays = int(argv[++i], out.chunkDays);
    else if(a === "--box" && argv[i+1]) out.box = num(argv[++i], out.box);
    else if(a === "--sl" && argv[i+1]) out.sl = num(argv[++i], out.sl);
    else if(a === "--tp" && argv[i+1]) out.tp = num(argv[++i], out.tp);
    else if(a === "--maxHoldBoxes" && argv[i+1]) out.maxHoldBoxes = int(argv[++i], out.maxHoldBoxes);
    else if(a === "--streakGuardSL" && argv[i+1]) out.streakGuardSL = int(argv[++i], out.streakGuardSL);
    else if(a === "--cooldownBoxes" && argv[i+1]) out.cooldownBoxes = int(argv[++i], out.cooldownBoxes);
    else if(a === "--longPatterns" && argv[i+1]) out.longPatterns = parsePatternList(argv[++i]);
    else if(a === "--shortPatterns" && argv[i+1]) out.shortPatterns = parsePatternList(argv[++i]);
    else if(a === "--martingale" && argv[i+1]) out.martingale = parseBool(argv[++i], out.martingale);
    else if(a === "--martingale") out.martingale = true;
    else if(a === "--baseQty" && argv[i+1]) out.baseQty = int(argv[++i], out.baseQty);
    else if(a === "--maxMultiplier" && argv[i+1]) out.maxMultiplier = int(argv[++i], out.maxMultiplier);
    else if(a === "--feePctPerSide" && argv[i+1]) out.feePctPerSide = num(argv[++i], out.feePctPerSide);
    else if(a === "--slippagePtsPerSide" && argv[i+1]) out.slippagePtsPerSide = num(argv[++i], out.slippagePtsPerSide);
    else if(a === "--start" && argv[i+1]) out.startIso = String(argv[++i]);
    else if(a === "--end" && argv[i+1]) out.endIso = String(argv[++i]);
  }

  if(out.source !== "close" && out.source !== "ohlc") out.source = "ohlc";
  if(out.maxHoldBoxes < 1) out.maxHoldBoxes = 60;
  if(out.streakGuardSL < 0) out.streakGuardSL = 0;
  if(out.cooldownBoxes < 0) out.cooldownBoxes = 0;
  if(out.baseQty < 1) out.baseQty = 1;
  if(out.maxMultiplier < out.baseQty) out.maxMultiplier = out.baseQty;
  if(!Number.isFinite(out.feePctPerSide) || out.feePctPerSide < 0) out.feePctPerSide = 0;
  if(!Number.isFinite(out.slippagePtsPerSide) || out.slippagePtsPerSide < 0) out.slippagePtsPerSide = 0;
  if(!out.longPatterns.length && !out.shortPatterns.length) throw new Error("At least one long or short pattern is required.");
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
    out.push(...(await fetchCandlesChunk(cfg.symbol, cfg.resolution, cursor, to)));
    cursor = to + 1;
  }
  return out;
}

function normalizeRows(rows){
  const byTs = new Map();
  for(const r of rows){
    const t = int(r.time, NaN), o = num(r.open, NaN), h = num(r.high, NaN), l = num(r.low, NaN), c = num(r.close, NaN);
    if(Number.isFinite(t) && Number.isFinite(o) && Number.isFinite(h) && Number.isFinite(l) && Number.isFinite(c)) byTs.set(t, { t, o, h, l, c });
  }
  return [...byTs.values()].sort((a,b)=>a.t-b.t);
}

function buildRenko(rows, brick, source){
  if(!rows || rows.length < 2) return [];
  const out = [];
  let lastClose = Math.round(rows[0].c / brick) * brick;
  let rangeMin = lastClose, rangeMax = lastClose;

  function consider(price, ts){
    if(!Number.isFinite(price)) return;
    if(price < rangeMin) rangeMin = price;
    if(price > rangeMax) rangeMax = price;

    while(price >= lastClose + brick){
      const open = lastClose, close = lastClose + brick;
      out.push({ Open: open, Close: close, High: Math.max(close, rangeMax), Low: Math.min(open, rangeMin), Color: "G", Ts: ts });
      lastClose = close; rangeMin = lastClose; rangeMax = price;
    }
    while(price <= lastClose - brick){
      const open = lastClose, close = lastClose - brick;
      out.push({ Open: open, Close: close, High: Math.max(open, rangeMax), Low: Math.min(close, rangeMin), Color: "R", Ts: ts });
      lastClose = close; rangeMax = lastClose; rangeMin = price;
    }
  }

  for(const r of rows){
    if(source === "close"){
      consider(r.c, r.t);
    } else {
      const seq = r.c >= r.o ? [r.o, r.h, r.l, r.c] : [r.o, r.l, r.h, r.c];
      for(const p of seq) consider(p, r.t);
    }
  }
  return out;
}

function pathForBox(box){ return box.Color === "R" ? [box.Open, box.Low, box.High, box.Close] : [box.Open, box.High, box.Low, box.Close]; }

function firstHit(path, sl, tp){
  for(let k=1;k<path.length;k++){
    const a = path[k-1], b = path[k], mn = Math.min(a,b), mx = Math.max(a,b);
    const hitSL = sl >= mn && sl <= mx;
    const hitTP = tp >= mn && tp <= mx;
    if(hitSL && hitTP) return Math.abs(sl-a) <= Math.abs(tp-a) ? "SL" : "TP";
    if(hitSL) return "SL";
    if(hitTP) return "TP";
  }
  return "";
}

function matchAt(colors, i, patterns){
  let best = "";
  for(const p of patterns){
    const L = p.length;
    if(i - L + 1 < 0) continue;
    let ok = true;
    for(let j=0;j<L;j++){
      if(colors[i - L + 1 + j] !== p[j]){ ok = false; break; }
    }
    if(ok && p.length > best.length) best = p;
  }
  return best;
}

function simulateDual(boxes, cfg){
  const colors = boxes.map((b)=>b.Color);
  const st = {
    trades: 0, wins: 0, losses: 0, flats: 0,
    tpHits: 0, slHits: 0, timeoutHits: 0,
    maxConsecSL: 0, totalPts: 0, avgPts: 0, winRatePct: 0,
    grossTotalPts: 0, totalCostPts: 0,
    guardActivations: 0, skippedByCooldown: 0,
    longTriggers: 0, shortTriggers: 0,
    avgQty: 0, maxQty: 0
  };

  let consecSL = 0, cooldown = 0;
  let qty = cfg.baseQty;
  let qtySum = 0;
  const maxLen = Math.max(1, ...cfg.longPatterns.map((p)=>p.length), ...cfg.shortPatterns.map((p)=>p.length));

  let i = maxLen - 1;
  while(i < boxes.length - 1){
    const longP = matchAt(colors, i, cfg.longPatterns);
    const shortP = matchAt(colors, i, cfg.shortPatterns);

    if(!longP && !shortP){
      if(cooldown > 0) cooldown -= 1;
      i += 1;
      continue;
    }

    if(cooldown > 0){
      st.skippedByCooldown += 1;
      cooldown -= 1;
      i += 1;
      continue;
    }

    let side = "";
    if(longP && shortP){
      side = longP.length >= shortP.length ? "LONG" : "SHORT";
    } else {
      side = longP ? "LONG" : "SHORT";
    }
    if(side === "LONG") st.longTriggers += 1; else st.shortTriggers += 1;

    const entry = boxes[i].Close;
    const sl = side === "LONG" ? (entry - cfg.sl) : (entry + cfg.sl);
    const tp = side === "LONG" ? (entry + cfg.tp) : (entry - cfg.tp);

    let exitIdx = -1, exitReason = "TIME", pnlPtsUnit = 0;
    const lastIdx = Math.min(boxes.length - 1, i + cfg.maxHoldBoxes);
    for(let j=i+1;j<=lastIdx;j++){
      const path = pathForBox(boxes[j]);
      let hit;
      if(side === "LONG"){
        hit = firstHit(path, sl, tp);
      } else {
        hit = firstHit(path, tp, sl);
        if(hit === "SL") hit = "TP";
        else if(hit === "TP") hit = "SL";
      }
      if(hit === "SL") { exitIdx = j; exitReason = "SL"; pnlPtsUnit = -cfg.sl; break; }
      if(hit === "TP") { exitIdx = j; exitReason = "TP"; pnlPtsUnit = cfg.tp; break; }
    }

    if(exitIdx < 0){
      exitIdx = lastIdx;
      const exitPx = boxes[exitIdx].Close;
      pnlPtsUnit = side === "LONG" ? (exitPx - entry) : (entry - exitPx);
      exitReason = "TIME";
    }

    const grossTradePts = pnlPtsUnit * qty;
    const feePtsPerUnit = entry * (cfg.feePctPerSide / 100) * 2;
    const slipPtsPerUnit = cfg.slippagePtsPerSide * 2;
    const costTradePts = (feePtsPerUnit + slipPtsPerUnit) * qty;
    const netTradePts = grossTradePts - costTradePts;

    st.trades += 1;
    st.grossTotalPts += grossTradePts;
    st.totalCostPts += costTradePts;
    st.totalPts += netTradePts;
    qtySum += qty;
    if(qty > st.maxQty) st.maxQty = qty;

    if(exitReason === "SL"){
      st.losses += 1; st.slHits += 1;
      consecSL += 1;
      if(consecSL > st.maxConsecSL) st.maxConsecSL = consecSL;

      if(cfg.martingale){
        qty = Math.min(qty * 2, cfg.maxMultiplier);
      }

      if(cfg.streakGuardSL > 0 && cfg.cooldownBoxes > 0 && consecSL >= cfg.streakGuardSL){
        cooldown = cfg.cooldownBoxes;
        consecSL = 0;
        st.guardActivations += 1;
      }
    } else if(exitReason === "TP"){
      st.wins += 1; st.tpHits += 1; consecSL = 0;
      if(cfg.martingale) qty = cfg.baseQty;
    } else {
      st.timeoutHits += 1;
      if(netTradePts > 0) st.wins += 1;
      else if(netTradePts < 0) st.losses += 1;
      else st.flats += 1;
      consecSL = 0;
      if(cfg.martingale) qty = cfg.baseQty;
    }

    i = exitIdx + 1;
  }

  if(st.trades > 0){
    st.avgPts = st.totalPts / st.trades;
    st.winRatePct = (st.wins * 100) / st.trades;
    st.avgQty = qtySum / st.trades;
  }
  return st;
}

function iso(sec){ return new Date(sec * 1000).toISOString(); }
function fmt(v,d=2){ return Number(v).toFixed(d); }

async function main(){
  const cfg = parseArgs(process.argv);
  const nowSec = Math.floor(Date.now() / 1000);
  let startSec = nowSec - Math.max(1, cfg.days) * 86400;
  let endSec = nowSec;
  if(cfg.startIso){ const s = Date.parse(cfg.startIso); if(Number.isFinite(s)) startSec = Math.floor(s/1000); }
  if(cfg.endIso){ const e = Date.parse(cfg.endIso); if(Number.isFinite(e)) endSec = Math.floor(e/1000); }
  if(endSec <= startSec) throw new Error("Invalid time window.");

  const candles = await fetchCandlesRange(cfg, startSec, endSec);
  const rows = normalizeRows(candles);
  const boxes = buildRenko(rows, cfg.box, cfg.source);
  const st = simulateDual(boxes, cfg);

  console.log("Renko Dual-Pattern Backtest");
  console.log(`Symbol: ${cfg.symbol} | Resolution: ${cfg.resolution} | Source: ${cfg.source}`);
  console.log(`Window: ${iso(startSec)} -> ${iso(endSec)} | Candles: ${rows.length} | Boxes: ${boxes.length}`);
  console.log(`Box: ${cfg.box} | SL: ${cfg.sl} | TP: ${cfg.tp} | MaxHoldBoxes: ${cfg.maxHoldBoxes}`);
  console.log(`Costs: feePctPerSide=${cfg.feePctPerSide}% | slippagePtsPerSide=${cfg.slippagePtsPerSide}`);
  console.log(`Streak guard: ${cfg.streakGuardSL > 0 ? `${cfg.streakGuardSL} SL -> cooldown ${cfg.cooldownBoxes} boxes` : "OFF"}`);
  console.log(`Martingale: ${cfg.martingale ? `ON (baseQty=${cfg.baseQty}, maxMultiplier=${cfg.maxMultiplier})` : "OFF"}`);
  console.log(`Long patterns: ${cfg.longPatterns.join(",") || "(none)"}`);
  console.log(`Short patterns: ${cfg.shortPatterns.join(",") || "(none)"}`);
  console.log("-");
  console.log(`Trades: ${st.trades}`);
  console.log(`Wins: ${st.wins} | Losses: ${st.losses} | Flats: ${st.flats}`);
  console.log(`TP hits: ${st.tpHits} | SL hits: ${st.slHits} | TIME exits: ${st.timeoutHits}`);
  console.log(`Win%: ${fmt(st.winRatePct,1)} | AvgPts/trade (net): ${fmt(st.avgPts)} | NetTotalPts: ${fmt(st.totalPts)}`);
  console.log(`GrossTotalPts: ${fmt(st.grossTotalPts)} | TotalCostPts: ${fmt(st.totalCostPts)}`);
  console.log(`Max consecutive SL: ${st.maxConsecSL}`);
  console.log(`AvgQty: ${fmt(st.avgQty,2)} | MaxQty: ${st.maxQty}`);
  console.log(`Guard activations: ${st.guardActivations} | Skipped by cooldown: ${st.skippedByCooldown}`);
  console.log(`Triggers -> LONG: ${st.longTriggers} | SHORT: ${st.shortTriggers}`);
}

main().catch((err)=>{
  console.error(`Failed: ${err.message || err}`);
  process.exit(1);
});
