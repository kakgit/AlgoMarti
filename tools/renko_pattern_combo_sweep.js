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

function parseIntList(txt, dflt){
  if(!txt) return dflt.slice();
  const arr = String(txt).split(",").map((x) => int(x.trim())).filter((x) => Number.isFinite(x));
  return arr.length ? arr : dflt.slice();
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
    minSubset: 2,
    maxSubset: 6,
    holdList: [20, 40, 60],
    guardList: [0, 2, 3, 4, 5],
    coolList: [0, 5, 10, 20],
    maxConsecSL: 5,
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
    else if(a === "--box" && argv[i + 1]) out.box = num(argv[++i], out.box);
    else if(a === "--sl" && argv[i + 1]) out.sl = num(argv[++i], out.sl);
    else if(a === "--tp" && argv[i + 1]) out.tp = num(argv[++i], out.tp);
    else if(a === "--side" && argv[i + 1]) out.side = String(argv[++i]).toUpperCase();
    else if(a === "--patterns" && argv[i + 1]) out.patterns = parsePatternList(String(argv[++i]));
    else if(a === "--minSubset" && argv[i + 1]) out.minSubset = int(argv[++i], out.minSubset);
    else if(a === "--maxSubset" && argv[i + 1]) out.maxSubset = int(argv[++i], out.maxSubset);
    else if(a === "--holdList" && argv[i + 1]) out.holdList = parseIntList(argv[++i], out.holdList);
    else if(a === "--guardList" && argv[i + 1]) out.guardList = parseIntList(argv[++i], out.guardList);
    else if(a === "--coolList" && argv[i + 1]) out.coolList = parseIntList(argv[++i], out.coolList);
    else if(a === "--maxConsecSL" && argv[i + 1]) out.maxConsecSL = int(argv[++i], out.maxConsecSL);
    else if(a === "--top" && argv[i + 1]) out.top = int(argv[++i], out.top);
    else if(a === "--start" && argv[i + 1]) out.startIso = String(argv[++i]);
    else if(a === "--end" && argv[i + 1]) out.endIso = String(argv[++i]);
    else if(a === "--out" && argv[i + 1]) out.outFile = String(argv[++i]);
  }

  if(out.source !== "close" && out.source !== "ohlc") out.source = "ohlc";
  if(out.side !== "SHORT" && out.side !== "LONG") out.side = "SHORT";
  if(out.minSubset < 1) out.minSubset = 1;
  if(out.maxSubset < out.minSubset) out.maxSubset = out.minSubset;
  if(out.maxConsecSL < 0) out.maxConsecSL = 0;
  if(out.top < 1) out.top = 30;
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

function* subsetGenerator(arr, minK, maxK){
  const n = arr.length;
  const lo = Math.max(1, minK);
  const hi = Math.min(n, maxK);
  for(let mask = 1; mask < (1 << n); mask++){
    const bits = mask.toString(2).replace(/0/g, "").length;
    if(bits < lo || bits > hi) continue;
    const out = [];
    for(let i = 0; i < n; i++){
      if(mask & (1 << i)) out.push(arr[i]);
    }
    yield out;
  }
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

  const subsets = [...subsetGenerator(cfg.patterns, cfg.minSubset, cfg.maxSubset)];
  const results = [];

  for(const sub of subsets){
    for(const hold of cfg.holdList){
      for(const g of cfg.guardList){
        const coolSet = g > 0 ? cfg.coolList.filter((c) => c > 0) : [0];
        for(const c of coolSet){
          const st = simulateCombined(boxes, {
            side: cfg.side,
            patterns: sub,
            sl: cfg.sl,
            tp: cfg.tp,
            maxHoldBoxes: hold,
            streakGuardSL: g,
            cooldownBoxes: c
          });

          results.push({
            patterns: sub,
            patternCount: sub.length,
            hold,
            guardSL: g,
            cooldown: c,
            ...st
          });
        }
      }
    }
  }

  const pass = results.filter((r) => r.maxConsecSL <= cfg.maxConsecSL);
  const passPos = pass.filter((r) => r.totalPts > 0);

  const sortFn = (a, b) => {
    if(b.totalPts !== a.totalPts) return b.totalPts - a.totalPts;
    if(b.avgPts !== a.avgPts) return b.avgPts - a.avgPts;
    if(b.winRatePct !== a.winRatePct) return b.winRatePct - a.winRatePct;
    return b.trades - a.trades;
  };

  pass.sort(sortFn);
  passPos.sort(sortFn);

  console.log("Renko Combined Sweep");
  console.log(`Symbol: ${cfg.symbol} | Resolution: ${cfg.resolution} | Source: ${cfg.source}`);
  console.log(`Window: ${iso(startSec)} -> ${iso(endSec)} | Candles: ${rows.length} | Boxes: ${boxes.length}`);
  console.log(`Side: ${cfg.side} | Box: ${cfg.box} | SL: ${cfg.sl} | TP: ${cfg.tp}`);
  console.log(`Patterns seed (${cfg.patterns.length}): ${cfg.patterns.join(",")}`);
  console.log(`Subsets tested: ${subsets.length} | Total configs tested: ${results.length}`);
  console.log(`Constraint: maxConsecSL <= ${cfg.maxConsecSL}`);
  console.log(`Passing configs: ${pass.length} | Passing + positive PnL: ${passPos.length}`);

  const show = (rowsShow, title) => {
    console.log(`\n${title}`);
    console.log("# | TotPts | AvgPts | Win% | MaxSL | Trades | Hold | Guard | Cool | #Pat | Patterns");
    const lim = Math.min(cfg.top, rowsShow.length);
    for(let i = 0; i < lim; i++){
      const r = rowsShow[i];
      console.log(`${i + 1} | ${fmt(r.totalPts, 2)} | ${fmt(r.avgPts, 2)} | ${fmt(r.winRatePct, 1)} | ${r.maxConsecSL} | ${r.trades} | ${r.hold} | ${r.guardSL} | ${r.cooldown} | ${r.patternCount} | ${r.patterns.join(",")}`);
    }
  };

  show(passPos, "Top Positive Configs (Constraint Satisfied)");
  show(pass, "Top All Passing Configs (including negative)");

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
        side: cfg.side,
        maxConsecSLConstraint: cfg.maxConsecSL,
        subsetsTested: subsets.length,
        configsTested: results.length,
        generatedAt: new Date().toISOString()
      },
      topPositive: passPos.slice(0, cfg.top),
      topPassing: pass.slice(0, cfg.top),
      allPassing: pass
    };
    require("fs").writeFileSync(cfg.outFile, JSON.stringify(payload, null, 2), "utf8");
    console.log(`\nSaved report: ${cfg.outFile}`);
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message || err}`);
  process.exit(1);
});
