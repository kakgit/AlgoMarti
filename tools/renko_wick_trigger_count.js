#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function n(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? x : d; }
function i(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : d; }

function args(argv){
  const out = {
    symbol: "BTCUSD",
    resolution: "1m",
    brick: 100,
    minWickPct: 30,
    entryWickPct: 70,
    source: "close",
    startIso: "2026-03-23T05:00:00+05:30",
    endIso: "2026-03-23T13:40:00+05:30"
  };
  for(let k=2;k<argv.length;k++){
    const a = argv[k];
    if(a==="--symbol" && argv[k+1]) out.symbol = String(argv[++k]).toUpperCase();
    else if(a==="--resolution" && argv[k+1]) out.resolution = String(argv[++k]);
    else if(a==="--brick" && argv[k+1]) out.brick = n(argv[++k], out.brick);
    else if(a==="--minWickPct" && argv[k+1]) out.minWickPct = n(argv[++k], out.minWickPct);
    else if(a==="--entryWickPct" && argv[k+1]) out.entryWickPct = n(argv[++k], out.entryWickPct);
    else if(a==="--source" && argv[k+1]) out.source = String(argv[++k]).toLowerCase();
    else if(a==="--start" && argv[k+1]) out.startIso = String(argv[++k]);
    else if(a==="--end" && argv[k+1]) out.endIso = String(argv[++k]);
  }
  if(out.source !== "close" && out.source !== "ohlc") out.source = "close";
  return out;
}

async function getCandles(symbol, resolution, startSec, endSec){
  const url = `${BASE_URL}?resolution=${encodeURIComponent(resolution)}&symbol=${encodeURIComponent(symbol)}&start=${startSec}&end=${endSec}`;
  const resp = await fetch(url, {method:"GET", headers:{"Accept":"application/json"}});
  if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if(!data?.success || !Array.isArray(data.result)) throw new Error("Bad candles payload");
  return data.result;
}

function normalizeRows(candles){
  return candles
    .map(r => ({
      t: i(r.time, NaN),
      o: n(r.open, NaN),
      h: n(r.high, NaN),
      l: n(r.low, NaN),
      c: n(r.close, NaN)
    }))
    .filter(r => Number.isFinite(r.t) && Number.isFinite(r.o) && Number.isFinite(r.h) && Number.isFinite(r.l) && Number.isFinite(r.c))
    .sort((a,b)=>a.t-b.t);
}

function buildRenkoFromRows(rows, brick, source){
  if(rows.length < 2) return [];

  let lastClose = Math.round(rows[0].c / brick) * brick;
  let rangeMin = lastClose;
  let rangeMax = lastClose;
  const out = [];

  function considerPrice(p){
    if(!Number.isFinite(p)) return;
    if(p < rangeMin) rangeMin = p;
    if(p > rangeMax) rangeMax = p;

    while(p >= lastClose + brick){
      const open = lastClose;
      const close = lastClose + brick;
      const high = Math.max(close, rangeMax);
      const low = Math.min(open, rangeMin);
      out.push({Open: open, High: high, Low: low, Close: close, Color: "green"});
      lastClose = close;
      rangeMin = lastClose;
      rangeMax = p;
    }

    while(p <= lastClose - brick){
      const open = lastClose;
      const close = lastClose - brick;
      const high = Math.max(open, rangeMax);
      const low = Math.min(close, rangeMin);
      out.push({Open: open, High: high, Low: low, Close: close, Color: "red"});
      lastClose = close;
      rangeMax = lastClose;
      rangeMin = p;
    }
  }

  for(const r of rows){
    if(source === "close"){
      considerPrice(r.c);
      continue;
    }
    const seq = r.c >= r.o ? [r.o, r.h, r.l, r.c] : [r.o, r.l, r.h, r.c];
    for(const p of seq) considerPrice(p);
  }

  return out;
}

function upperWick(b){ return b.High - Math.max(b.Open, b.Close); }
function lowerWick(b){ return Math.min(b.Open, b.Close) - b.Low; }

function firstOppositeSignalStats(boxes, brick, minWickPct, entryWickPct){
  const minWick = brick * (minWickPct / 100);
  const ePct = entryWickPct / 100;

  let triggers = 0;
  let fills = 0;
  let sellTriggers = 0;
  let buyTriggers = 0;
  let sellFills = 0;
  let buyFills = 0;

  for(let idx=1; idx<boxes.length-1; idx++){
    const prev = boxes[idx-1];
    const cur = boxes[idx];
    const nxt = boxes[idx+1];

    if(prev.Color === "green" && cur.Color === "red"){
      const uw = upperWick(cur);
      if(uw >= minWick){
        triggers++; sellTriggers++;
        const entry = cur.Close + (uw * ePct);
        if(nxt.High >= entry){ fills++; sellFills++; }
      }
    }
    else if(prev.Color === "red" && cur.Color === "green"){
      const lw = lowerWick(cur);
      if(lw >= minWick){
        triggers++; buyTriggers++;
        const entry = cur.Close - (lw * ePct);
        if(nxt.Low <= entry){ fills++; buyFills++; }
      }
    }
  }

  return {triggers, fills, sellTriggers, buyTriggers, sellFills, buyFills, minWick};
}

async function main(){
  const a = args(process.argv);
  const startMs = Date.parse(a.startIso);
  const endMs = Date.parse(a.endIso);
  if(!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs){
    throw new Error("Invalid start/end window");
  }
  const startSec = Math.floor(startMs / 1000);
  const endSec = Math.floor(endMs / 1000);
  const candles = await getCandles(a.symbol, a.resolution, startSec, endSec);
  const rows = normalizeRows(candles);
  const boxes = buildRenkoFromRows(rows, a.brick, a.source);
  const st = firstOppositeSignalStats(boxes, a.brick, a.minWickPct, a.entryWickPct);

  console.log("Wick Filter Trigger Count");
  console.log(`Symbol: ${a.symbol} | Res: ${a.resolution} | Source: ${a.source}`);
  console.log(`Window: ${a.startIso} -> ${a.endIso}`);
  console.log(`Brick: ${a.brick} | MinWickPct: ${a.minWickPct}% | EntryWickPct: ${a.entryWickPct}%`);
  console.log(`Candles: ${rows.length} | RenkoBoxes(model): ${boxes.length}`);
  console.log(`MinWickPts: ${st.minWick.toFixed(2)}`);
  console.log(`Triggers Total: ${st.triggers}`);
  console.log(`  Sell Triggers: ${st.sellTriggers}`);
  console.log(`  Buy Triggers : ${st.buyTriggers}`);
  console.log(`Fills (next-box touch model): ${st.fills}`);
  console.log(`  Sell Fills: ${st.sellFills}`);
  console.log(`  Buy Fills : ${st.buyFills}`);
}

main().catch(err => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
