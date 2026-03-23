#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function n(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? x : d; }
function i(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : d; }

function parseArgs(argv){
  const out = {
    symbol: "BTCUSD",
    resolution: "1m",
    source: "close",
    brick: 100,
    activationBelowOpen: 10,
    slPts: 200,
    tpPts: 200,
    startIso: "2026-03-23T05:00:00+05:30",
    endIso: "2026-03-23T13:40:00+05:30",
    chunkDays: 2
  };
  for(let k = 2; k < argv.length; k++){
    const a = argv[k];
    if(a === "--symbol" && argv[k + 1]) out.symbol = String(argv[++k]).toUpperCase();
    else if(a === "--resolution" && argv[k + 1]) out.resolution = String(argv[++k]);
    else if(a === "--source" && argv[k + 1]) out.source = String(argv[++k]).toLowerCase();
    else if(a === "--brick" && argv[k + 1]) out.brick = n(argv[++k], out.brick);
    else if(a === "--activationBelowOpen" && argv[k + 1]) out.activationBelowOpen = n(argv[++k], out.activationBelowOpen);
    else if(a === "--sl" && argv[k + 1]) out.slPts = n(argv[++k], out.slPts);
    else if(a === "--tp" && argv[k + 1]) out.tpPts = n(argv[++k], out.tpPts);
    else if(a === "--start" && argv[k + 1]) out.startIso = String(argv[++k]);
    else if(a === "--end" && argv[k + 1]) out.endIso = String(argv[++k]);
    else if(a === "--chunkDays" && argv[k + 1]) out.chunkDays = i(argv[++k], out.chunkDays);
  }
  if(out.source !== "close" && out.source !== "ohlc") out.source = "close";
  return out;
}

async function getCandlesChunk(symbol, resolution, startSec, endSec){
  const url = `${BASE_URL}?resolution=${encodeURIComponent(resolution)}&symbol=${encodeURIComponent(symbol)}&start=${startSec}&end=${endSec}`;
  const resp = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
  if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if(!data?.success || !Array.isArray(data.result)) throw new Error("Bad candles payload");
  return data.result;
}

async function getCandlesRange(symbol, resolution, startSec, endSec, chunkDays){
  const out = [];
  let cursor = startSec;
  const step = Math.max(1, chunkDays) * 86400;
  while(cursor < endSec){
    const to = Math.min(endSec, cursor + step);
    const rows = await getCandlesChunk(symbol, resolution, cursor, to);
    out.push(...rows);
    cursor = to + 1;
  }
  return out;
}

function normalizeRows(candles){
  const byTs = new Map();
  for(const r of candles){
    const row = { t: i(r.time, NaN), o: n(r.open, NaN), h: n(r.high, NaN), l: n(r.low, NaN), c: n(r.close, NaN) };
    if(Number.isFinite(row.t) && Number.isFinite(row.o) && Number.isFinite(row.h) && Number.isFinite(row.l) && Number.isFinite(row.c)){
      byTs.set(row.t, row);
    }
  }
  return [...byTs.values()].sort((a,b)=>a.t-b.t);
}

function buildRenko(rows, brick, source){
  if(rows.length < 2) return [];
  const out = [];
  let lastClose = Math.round(rows[0].c / brick) * brick;
  let rangeMin = lastClose;
  let rangeMax = lastClose;

  function consider(p, ts){
    if(!Number.isFinite(p)) return;
    if(p < rangeMin) rangeMin = p;
    if(p > rangeMax) rangeMax = p;

    while(p >= lastClose + brick){
      const open = lastClose;
      const close = lastClose + brick;
      out.push({ Open: open, Close: close, High: Math.max(close, rangeMax), Low: Math.min(open, rangeMin), Color: "green", Ts: ts });
      lastClose = close;
      rangeMin = lastClose;
      rangeMax = p;
    }
    while(p <= lastClose - brick){
      const open = lastClose;
      const close = lastClose - brick;
      out.push({ Open: open, Close: close, High: Math.max(open, rangeMax), Low: Math.min(close, rangeMin), Color: "red", Ts: ts });
      lastClose = close;
      rangeMax = lastClose;
      rangeMin = p;
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

function boxPath(box){
  // Approx intrabox order for tie-breaking when both levels touched.
  if(box.Color === "red") return [box.Open, box.Low, box.High, box.Close];
  return [box.Open, box.High, box.Low, box.Close];
}

function touchedInPath(path, level){
  for(let k = 1; k < path.length; k++){
    const a = path[k - 1];
    const b = path[k];
    if((level >= Math.min(a,b)) && (level <= Math.max(a,b))) return true;
  }
  return false;
}

function simulateSellOnly(boxes, activationBelowOpen, slPts, tpPts){
  let pending = null;
  let pos = null;

  let created = 0;
  let activated = 0;
  let triggered = 0;
  let tp = 0;
  let sl = 0;
  let openEnd = 0;

  for(let idx = 0; idx < boxes.length; idx++){
    const b = boxes[idx];
    const path = boxPath(b);

    if(!pending && !pos && b.Color === "green"){
      pending = {
        entry: b.Close,
        act: b.Open - activationBelowOpen,
        activated: false,
        createdIdx: idx
      };
      created += 1;
    }

    if(pending && !pos){
      if(!pending.activated){
        if(touchedInPath(path, pending.act)){
          pending.activated = true;
          activated += 1;
        }
      }

      if(pending.activated && touchedInPath(path, pending.entry)){
        pos = {
          entry: pending.entry,
          sl: pending.entry + slPts,
          tp: pending.entry - tpPts
        };
        pending = null;
        triggered += 1;
      }
    }

    if(pos){
      const hitSL = touchedInPath(path, pos.sl);
      const hitTP = touchedInPath(path, pos.tp);
      if(hitSL && hitTP){
        // Tie-break with path order: whichever is first on path wins.
        let slFirst = false;
        for(let k = 1; k < path.length; k++){
          const a = path[k - 1];
          const c = path[k];
          const slSeg = (pos.sl >= Math.min(a,c) && pos.sl <= Math.max(a,c));
          const tpSeg = (pos.tp >= Math.min(a,c) && pos.tp <= Math.max(a,c));
          if(slSeg && tpSeg){
            slFirst = (Math.abs(pos.sl - a) <= Math.abs(pos.tp - a));
            break;
          }
          if(slSeg){ slFirst = true; break; }
          if(tpSeg){ slFirst = false; break; }
        }
        if(slFirst) sl += 1; else tp += 1;
        pos = null;
      }
      else if(hitSL){
        sl += 1;
        pos = null;
      }
      else if(hitTP){
        tp += 1;
        pos = null;
      }
    }
  }

  if(pos) openEnd = 1;

  return { created, activated, triggered, tp, sl, openEnd };
}

async function main(){
  const a = parseArgs(process.argv);
  const startMs = Date.parse(a.startIso);
  const endMs = Date.parse(a.endIso);
  if(!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs){
    throw new Error("Invalid start/end window");
  }

  const startSec = Math.floor(startMs / 1000);
  const endSec = Math.floor(endMs / 1000);
  const candles = await getCandlesRange(a.symbol, a.resolution, startSec, endSec, a.chunkDays);
  const rows = normalizeRows(candles);
  const boxes = buildRenko(rows, a.brick, a.source);
  const st = simulateSellOnly(boxes, a.activationBelowOpen, a.slPts, a.tpPts);

  console.log("Sell-Only Conditional Model");
  console.log(`Symbol: ${a.symbol} | Res: ${a.resolution} | Source: ${a.source}`);
  console.log(`Window: ${a.startIso} -> ${a.endIso}`);
  console.log(`Brick: ${a.brick}`);
  console.log(`Rule: for each green box create SELL limit @ greenClose; activate when price <= greenOpen-${a.activationBelowOpen}; SL=${a.slPts}, TP=${a.tpPts}`);
  console.log(`Candles: ${rows.length} | RenkoBoxes: ${boxes.length}`);
  console.log(`Orders Created   : ${st.created}`);
  console.log(`Orders Activated : ${st.activated}`);
  console.log(`Sell Triggers    : ${st.triggered}`);
  console.log(`TP Hits          : ${st.tp}`);
  console.log(`SL Hits          : ${st.sl}`);
  console.log(`Open at End      : ${st.openEnd}`);
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
