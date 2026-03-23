#!/usr/bin/env node
"use strict";

const BASE_URL = "https://api.india.delta.exchange/v2/history/candles";

function n(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? x : d; }
function i(v, d = NaN){ const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : d; }

function parseResToSec(res){
  const m = String(res || "").trim().match(/^(\d+)\s*([mhdw])$/i);
  if(!m) return 60;
  const num = Number(m[1]);
  const u = m[2].toLowerCase();
  if(u === "m") return num * 60;
  if(u === "h") return num * 3600;
  if(u === "d") return num * 86400;
  if(u === "w") return num * 604800;
  return 60;
}

function parseArgs(argv){
  const out = {
    symbol: "BTCUSD",
    resolution: "1m",
    brick: 100,
    source: "close",
    minWickPct: 30,
    entryWickPct: 70,
    startIso: "2026-03-23T05:00:00+05:30",
    endIso: "2026-03-23T13:40:00+05:30",
    startQty: 100,
    martiMul: 2,
    maxStepCap: 7,
    chunkDays: 2
  };
  for(let k=2;k<argv.length;k++){
    const a = argv[k];
    if(a==="--symbol" && argv[k+1]) out.symbol = String(argv[++k]).toUpperCase();
    else if(a==="--resolution" && argv[k+1]) out.resolution = String(argv[++k]);
    else if(a==="--brick" && argv[k+1]) out.brick = n(argv[++k], out.brick);
    else if(a==="--source" && argv[k+1]) out.source = String(argv[++k]).toLowerCase();
    else if(a==="--minWickPct" && argv[k+1]) out.minWickPct = n(argv[++k], out.minWickPct);
    else if(a==="--entryWickPct" && argv[k+1]) out.entryWickPct = n(argv[++k], out.entryWickPct);
    else if(a==="--start" && argv[k+1]) out.startIso = String(argv[++k]);
    else if(a==="--end" && argv[k+1]) out.endIso = String(argv[++k]);
    else if(a==="--startQty" && argv[k+1]) out.startQty = n(argv[++k], out.startQty);
    else if(a==="--martiMul" && argv[k+1]) out.martiMul = n(argv[++k], out.martiMul);
    else if(a==="--maxStepCap" && argv[k+1]) out.maxStepCap = i(argv[++k], out.maxStepCap);
    else if(a==="--chunkDays" && argv[k+1]) out.chunkDays = i(argv[++k], out.chunkDays);
  }
  if(out.source !== "close" && out.source !== "ohlc") out.source = "close";
  return out;
}

async function getCandlesChunk(symbol, resolution, startSec, endSec){
  const url = `${BASE_URL}?resolution=${encodeURIComponent(resolution)}&symbol=${encodeURIComponent(symbol)}&start=${startSec}&end=${endSec}`;
  const resp = await fetch(url, {method:"GET", headers:{"Accept":"application/json"}});
  if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if(!data?.success || !Array.isArray(data.result)) throw new Error("Bad candles payload");
  return data.result;
}

async function getCandlesRange(symbol, resolution, startSec, endSec, chunkDays){
  const stepSec = Math.max(1, chunkDays) * 86400;
  const all = [];
  let cursor = startSec;
  while(cursor < endSec){
    const to = Math.min(endSec, cursor + stepSec);
    const rows = await getCandlesChunk(symbol, resolution, cursor, to);
    all.push(...rows);
    cursor = to + 1;
  }
  return all;
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

function buildRenkoFromRows(rows, brick, source){
  if(rows.length < 2) return [];
  let lastClose = Math.round(rows[0].c / brick) * brick;
  let rangeMin = lastClose;
  let rangeMax = lastClose;
  const out = [];

  function considerPrice(p, ts){
    if(!Number.isFinite(p)) return;
    if(p < rangeMin) rangeMin = p;
    if(p > rangeMax) rangeMax = p;

    while(p >= lastClose + brick){
      const open = lastClose;
      const close = lastClose + brick;
      const high = Math.max(close, rangeMax);
      const low = Math.min(open, rangeMin);
      out.push({Open: open, High: high, Low: low, Close: close, Color: "green", Ts: ts});
      lastClose = close;
      rangeMin = lastClose;
      rangeMax = p;
    }
    while(p <= lastClose - brick){
      const open = lastClose;
      const close = lastClose - brick;
      const high = Math.max(open, rangeMax);
      const low = Math.min(close, rangeMin);
      out.push({Open: open, High: high, Low: low, Close: close, Color: "red", Ts: ts});
      lastClose = close;
      rangeMax = lastClose;
      rangeMin = p;
    }
  }

  for(const r of rows){
    if(source === "close"){
      considerPrice(r.c, r.t);
      continue;
    }
    const seq = r.c >= r.o ? [r.o, r.h, r.l, r.c] : [r.o, r.l, r.h, r.c];
    for(const p of seq) considerPrice(p, r.t);
  }
  return out;
}

function upperWick(b){ return b.High - Math.max(b.Open, b.Close); }
function lowerWick(b){ return Math.min(b.Open, b.Close) - b.Low; }

function generateTrades(boxes, brick, minWickPct, entryWickPct){
  const minWick = brick * (minWickPct / 100);
  const ep = entryWickPct / 100;
  const trades = [];

  let idx = 1;
  while(idx < boxes.length - 2){
    const prev = boxes[idx - 1];
    const cur = boxes[idx];
    const nxt = boxes[idx + 1];

    let side = "";
    let entry = NaN;

    if(prev.Color === "green" && cur.Color === "red"){
      const uw = upperWick(cur);
      if(uw >= minWick){
        side = "sell";
        entry = cur.Close + (uw * ep);
        if(!(nxt.High >= entry)){
          idx += 1;
          continue;
        }
      }
    }
    else if(prev.Color === "red" && cur.Color === "green"){
      const lw = lowerWick(cur);
      if(lw >= minWick){
        side = "buy";
        entry = cur.Close - (lw * ep);
        if(!(nxt.Low <= entry)){
          idx += 1;
          continue;
        }
      }
    }

    if(!side){
      idx += 1;
      continue;
    }

    const fillIdx = idx + 1;
    let exitIdx = -1;
    let exit = NaN;
    for(let j = fillIdx; j < boxes.length; j++){
      if(side === "sell" && boxes[j].Color === "green"){
        exitIdx = j;
        exit = boxes[j].Close;
        break;
      }
      if(side === "buy" && boxes[j].Color === "red"){
        exitIdx = j;
        exit = boxes[j].Close;
        break;
      }
    }

    if(exitIdx === -1){
      break;
    }

    const points = side === "sell" ? (entry - exit) : (exit - entry);
    trades.push({ side, entry, exit, points, signalIdx: idx, fillIdx, exitIdx });
    idx = exitIdx + 1;
  }

  return trades;
}

function runMarti(trades, startQty, martiMul, maxStepCap){
  let qty = startQty;
  let step = 1;
  let maxStep = 1;
  let capHits = 0;
  let totalPnL = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;
  let stepUps = 0;

  for(const t of trades){
    const pnl = t.points * qty;
    totalPnL += pnl;

    if(pnl >= 0){
      wins += 1;
      grossProfit += pnl;
      step = 1;
      qty = startQty;
    }
    else{
      losses += 1;
      grossLoss += Math.abs(pnl);
      stepUps += 1;
      step += 1;
      if(step > maxStep) maxStep = step;
      if(maxStepCap > 0 && step > maxStepCap){
        capHits += 1;
        step = 1;
        qty = startQty;
      }
      else{
        qty = qty * martiMul;
      }
    }
  }

  return { totalPnL, grossProfit, grossLoss, wins, losses, maxStep, capHits, stepUps, totalTrades: trades.length };
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
  const boxes = buildRenkoFromRows(rows, a.brick, a.source);
  const trades = generateTrades(boxes, a.brick, a.minWickPct, a.entryWickPct);
  const st = runMarti(trades, a.startQty, a.martiMul, a.maxStepCap);

  console.log("Martingale Backtest (Wick Filter Model)");
  console.log(`Symbol: ${a.symbol} | Res: ${a.resolution} | Source: ${a.source}`);
  console.log(`Window: ${a.startIso} -> ${a.endIso}`);
  console.log(`Brick: ${a.brick} | MinWickPct: ${a.minWickPct}% | EntryWickPct: ${a.entryWickPct}%`);
  console.log(`StartQty: ${a.startQty} | MartiMul: ${a.martiMul} | MaxStepCap: ${a.maxStepCap}`);
  console.log(`Candles: ${rows.length} | RenkoBoxes: ${boxes.length} | Trades: ${st.totalTrades}`);
  console.log(`Wins: ${st.wins} | Losses: ${st.losses}`);
  console.log(`Gross Profit: ${st.grossProfit.toFixed(2)}`);
  console.log(`Gross Loss  : ${st.grossLoss.toFixed(2)}`);
  console.log(`Net PnL     : ${st.totalPnL.toFixed(2)}`);
  console.log(`Martingale step-ups: ${st.stepUps}`);
  console.log(`Max step reached  : ${st.maxStep}`);
  console.log(`Step-cap hits     : ${st.capHits}`);
}

main().catch(err => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
