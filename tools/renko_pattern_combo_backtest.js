#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function num(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? x : d; }
function int(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : d; }

function expandPatternToken(raw){
  if(!raw) return "";
  let s = String(raw).toUpperCase().trim();
  if(s === "") return "";
  s = s.replace(/GREEN/g, "G").replace(/RED/g, "R");
  s = s.replace(/[^0-9RG]/g, "");
  if(s === "") return "";
  if(/^[RG]+$/.test(s)) return s;
  const parts = [...s.matchAll(/(\d+)([RG])/g)];
  if(parts.length === 0) return "";
  let out = "";
  for(const m of parts){
    const k = int(m[1], 0);
    const c = m[2];
    if(k > 0 && (c === "R" || c === "G")) out += c.repeat(k);
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
    resolution: "1m",
    source: "ohlc",
    days: 90,
    chunkDays: 1,
    box: 50,
    sl: 150,
    tp: 200,
    side: "SHORT",
    patterns: ["GGRGG", "GRRG", "GRRRG", "GGRRG", "RGGRR", "RGRR"],
    maxHoldBoxes: 40,
    streakGuardSL: 0,
    cooldownBoxes: 0,
    minTrades: 1,
    startIso: "",
    endIso: ""
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
    else if(a === "--side" && argv[i + 1]) out.side = String(argv[++i]).toUpperCase();
    else if(a === "--patterns" && argv[i + 1]) out.patterns = parsePatternList(String(argv[++i]));
    else if(a === "--maxHoldBoxes" && argv[i + 1]) out.maxHoldBoxes = int(argv[++i], out.maxHoldBoxes);
    else if(a === "--streakGuardSL" && argv[i + 1]) out.streakGuardSL = int(argv[++i], out.streakGuardSL);
    else if(a === "--cooldownBoxes" && argv[i + 1]) out.cooldownBoxes = int(argv[++i], out.cooldownBoxes);
    else if(a === "--minTrades" && argv[i + 1]) out.minTrades = int(argv[++i], out.minTrades);
    else if(a === "--start" && argv[i + 1]) out.startIso = String(argv[++i]);
    else if(a === "--end" && argv[i + 1]) out.endIso = String(argv[++i]);
  }

  if(out.source !== "close" && out.source !== "ohlc") out.source = "ohlc";
  if(out.side !== "SHORT" && out.side !== "LONG") out.side = "SHORT";
  if(out.maxHoldBoxes < 1) out.maxHoldBoxes = 40;
  if(out.streakGuardSL < 0) out.streakGuardSL = 0;
  if(out.cooldownBoxes < 0) out.cooldownBoxes = 0;
  if(out.minTrades < 1) out.minTrades = 1;
  if(!Array.isArray(out.patterns) || out.patterns.length === 0) throw new Error("No valid patterns provided.");
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
    const hitSL = sl >= mn && sl <= mx;
    const hitTP = tp >= mn && tp <= mx;
    if(hitSL && hitTP) return Math.abs(sl - a) <= Math.abs(tp - a) ? "SL" : "TP";
    if(hitSL) return "SL";
    if(hitTP) return "TP";
  }
  return "";
}

function simulateCombined(boxes, cfg){
  const patternSet = new Set(cfg.patterns);
  const lens = [...new Set(cfg.patterns.map((p) => p.length))].sort((a, b) => a - b);
  const maxLen = Math.max(...lens);

  const st = {
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
    winRatePct: 0,
    triggerByPattern: {},
    skippedByCooldown: 0,
    guardActivations: 0
  };

  let consecSL = 0;
  let cooldownLeft = 0;

  let i = maxLen - 1;
  while(i < boxes.length - 1){
    let matched = "";
    for(const L of lens){
      if(i - L + 1 < 0) continue;
      const seq = boxes.slice(i - L + 1, i + 1).map((b) => b.Color).join("");
      if(patternSet.has(seq) && seq.length > matched.length){
        matched = seq;
      }
    }

    if(!matched){
      if(cooldownLeft > 0) cooldownLeft -= 1;
      i += 1;
      continue;
    }

    if(cooldownLeft > 0){
      st.skippedByCooldown += 1;
      cooldownLeft -= 1;
      i += 1;
      continue;
    }

    st.triggerByPattern[matched] = (st.triggerByPattern[matched] || 0) + 1;

    const entry = boxes[i].Close;
    let slLevel = 0;
    let tpLevel = 0;
    if(cfg.side === "LONG"){
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
      if(cfg.side === "LONG"){
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
      pnlPts = cfg.side === "LONG" ? (exitPx - entry) : (entry - exitPx);
      exitReason = "TIME";
    }

    st.trades += 1;
    st.totalPts += pnlPts;

    if(exitReason === "SL"){
      st.losses += 1;
      st.slHits += 1;
      consecSL += 1;
      if(consecSL > st.maxConsecSL) st.maxConsecSL = consecSL;
      if(cfg.streakGuardSL > 0 && cfg.cooldownBoxes > 0 && consecSL >= cfg.streakGuardSL){
        cooldownLeft = cfg.cooldownBoxes;
        consecSL = 0;
        st.guardActivations += 1;
      }
    }
    else if(exitReason === "TP"){
      st.wins += 1;
      st.tpHits += 1;
      consecSL = 0;
    }
    else{
      st.timeoutHits += 1;
      if(pnlPts > 0) st.wins += 1;
      else if(pnlPts < 0) st.losses += 1;
      else st.flats += 1;
      consecSL = 0;
    }

    i = exitIdx + 1;
  }

  if(st.trades > 0){
    st.avgPts = st.totalPts / st.trades;
    st.winRatePct = (st.wins * 100) / st.trades;
  }
  return st;
}

function iso(sec){ return new Date(sec * 1000).toISOString(); }
function fmt(v, d = 2){ return Number(v).toFixed(d); }

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
  if(boxes.length < 20) throw new Error("Not enough Renko boxes.");

  const st = simulateCombined(boxes, cfg);

  console.log("Renko Combined-Pattern Backtest");
  console.log(`Symbol: ${cfg.symbol} | Resolution: ${cfg.resolution} | Source: ${cfg.source}`);
  console.log(`Window: ${iso(startSec)} -> ${iso(endSec)} | Candles: ${rows.length} | Boxes: ${boxes.length}`);
  console.log(`Side: ${cfg.side} | Box: ${cfg.box} | SL: ${cfg.sl} | TP: ${cfg.tp} | MaxHoldBoxes: ${cfg.maxHoldBoxes}`);
  console.log(`Streak guard: ${cfg.streakGuardSL > 0 ? `${cfg.streakGuardSL} SL -> cooldown ${cfg.cooldownBoxes} boxes` : "OFF"}`);
  console.log(`Patterns (${cfg.patterns.length}): ${cfg.patterns.join(",")}`);
  console.log("-");
  console.log(`Trades: ${st.trades}`);
  console.log(`Wins: ${st.wins} | Losses: ${st.losses} | Flats: ${st.flats}`);
  console.log(`TP hits: ${st.tpHits} | SL hits: ${st.slHits} | TIME exits: ${st.timeoutHits}`);
  console.log(`Win%: ${fmt(st.winRatePct, 1)} | AvgPts: ${fmt(st.avgPts, 2)} | TotalPts: ${fmt(st.totalPts, 2)}`);
  console.log(`Max consecutive SL: ${st.maxConsecSL}`);
  console.log(`Guard activations: ${st.guardActivations} | Triggers skipped in cooldown: ${st.skippedByCooldown}`);

  console.log("Pattern trigger counts:");
  const keys = Object.keys(st.triggerByPattern).sort((a, b) => (st.triggerByPattern[b] - st.triggerByPattern[a]));
  for(const k of keys){
    console.log(`${k}: ${st.triggerByPattern[k]}`);
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message || err}`);
  process.exit(1);
});
