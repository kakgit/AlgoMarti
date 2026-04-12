const logger = require("./logger");
const { addEvent } = require("./stateStore");
const { fetchSnapshot, selectOptionByDteDelta } = require("./marketDataService");
const { calculatePortfolio } = require("./portfolioService");
const { assessRisk } = require("./riskManager");
const { openPaperPosition, closePaperPosition } = require("./executionService");

function sideFactor(side) {
    return side === "buy" ? 1 : -1;
}

function isOpen(pos) {
    return pos && pos.status === "OPEN";
}

function getOpenByLegType(state, legType) {
    return state.positions.find((p) => isOpen(p) && p.legType === legType) || null;
}

function getOptionPriceForSide(opt, side) {
    if (side === "buy") {
        return Number.isFinite(Number(opt.bestAsk)) ? Number(opt.bestAsk) : Number(opt.mark || 0);
    }
    return Number.isFinite(Number(opt.bestBid)) ? Number(opt.bestBid) : Number(opt.mark || 0);
}

function getDynamicQty(state, portfolio) {
    const cfg = state.config;
    const deltaNeed = Math.abs(Number(portfolio.totalDelta) || 0);
    const step = Math.max(1, Math.round(deltaNeed / 12));
    let qty = cfg.minContracts + step;

    const gammaUtil = Math.abs(Number(portfolio.totalGamma) || 0) / Math.max(0.0001, cfg.gammaMaxAbs);
    if (gammaUtil > 0.7) {
        qty = Math.max(cfg.minContracts, Math.floor(qty * cfg.gammaReductionFactor));
    }

    return Math.max(cfg.minContracts, Math.min(cfg.maxContracts, qty));
}

function getReentryState(state, legType) {
    if (!state.reentry) {
        state.reentry = {};
    }
    if (!state.reentry[legType]) {
        state.reentry[legType] = { count: 0, cooldownUntilCycle: 0, consecutiveSl: 0, pauseUntilCycle: 0 };
    }

    const obj = state.reentry[legType];
    if (!Number.isFinite(Number(obj.count))) obj.count = 0;
    if (!Number.isFinite(Number(obj.cooldownUntilCycle))) obj.cooldownUntilCycle = 0;
    if (!Number.isFinite(Number(obj.consecutiveSl))) obj.consecutiveSl = 0;
    if (!Number.isFinite(Number(obj.pauseUntilCycle))) obj.pauseUntilCycle = 0;
    return obj;
}

function getLegEntryQty(state, legType, baseQty) {
    const cfg = state.config;
    const objRe = getReentryState(state, legType);
    if (objRe.consecutiveSl <= 0) {
        return baseQty;
    }

    // Reduce re-entry size progressively while churning.
    const factor = Math.pow(Number(cfg.slChurnQtyReductionFactor || 0.5), objRe.consecutiveSl);
    const reduced = Math.max(cfg.minContracts, Math.floor(baseQty * factor));
    return Math.min(baseQty, reduced);
}

function updateOpenMarksAndGreeks(state, snapshot) {
    const optionsBySymbol = {};
    for (const opt of snapshot.options) {
        optionsBySymbol[opt.symbol] = opt;
    }

    for (const pos of state.positions) {
        if (!isOpen(pos)) {
            continue;
        }
        if (pos.instrumentType === "future") {
            pos.markPrice = Number(snapshot.ticker.mark || snapshot.ticker.spot || pos.markPrice || 0);
            pos.currentGreeks = { delta: 1, gamma: 0, theta: 0 };
            continue;
        }

        const opt = optionsBySymbol[pos.symbol];
        if (!opt) {
            continue;
        }

        const buyMark = Number.isFinite(Number(opt.bestAsk)) ? Number(opt.bestAsk) : Number(opt.mark || pos.markPrice || 0);
        const sellMark = Number.isFinite(Number(opt.bestBid)) ? Number(opt.bestBid) : Number(opt.mark || pos.markPrice || 0);
        pos.markPrice = pos.side === "buy" ? buyMark : sellMark;
        pos.currentGreeks = {
            delta: Number(opt.delta) || 0,
            gamma: Number(opt.gamma) || 0,
            theta: Number(opt.theta) || 0
        };
        pos.meta = {
            ...(pos.meta || {}),
            dte: Number(opt.dte) || 0,
            strike: Number(opt.strike) || 0,
            expiry: opt.expiry
        };
    }
}

function tryOpenOptionLeg(state, snapshot, params) {
    const option = selectOptionByDteDelta(snapshot.options, {
        type: params.type,
        dteMin: params.dteMin,
        dteMax: params.dteMax,
        targetAbsDelta: state.config.targetAbsDeltaOption
    });

    if (!option) {
        const objAll = Array.isArray(snapshot.options) ? snapshot.options : [];
        const vTypeCount = objAll.filter((o) => o?.type === params.type).length;
        const vDteCount = objAll.filter((o) =>
            o?.type === params.type &&
            Number.isFinite(Number(o?.dte)) &&
            o.dte >= params.dteMin &&
            o.dte <= params.dteMax
        ).length;
        addEvent("SKIP", `No option found for ${params.legType}`, {
            ...params,
            totalOptions: objAll.length,
            typeOptions: vTypeCount,
            inDteWindow: vDteCount
        });
        return null;
    }

    const px = getOptionPriceForSide(option, params.side);
    if (!Number.isFinite(px) || px <= 0) {
        addEvent("SKIP", `Invalid price for ${params.legType}`, { symbol: option.symbol });
        return null;
    }

    return openPaperPosition(state, {
        legType: params.legType,
        instrumentType: "option",
        symbol: option.symbol,
        expiry: option.expiry,
        optionType: option.type,
        side: params.side,
        qty: params.qty,
        price: px,
        greeks: {
            delta: option.delta,
            gamma: option.gamma,
            theta: option.theta
        },
        reason: params.reason || "ENTRY",
        meta: {
            dte: option.dte,
            strike: option.strike
        }
    });
}

function closeLegIfExists(state, legType, reason) {
    const leg = getOpenByLegType(state, legType);
    if (!leg) {
        return null;
    }
    return closePaperPosition(state, leg, Number(leg.markPrice || leg.entryPrice || 0), reason);
}

function applyShortPutLegManagement(state) {
    const cfg = state.config;
    const legTypes = ["weekly_put_short", "biweekly_put_short"];

    for (const legType of legTypes) {
        const leg = getOpenByLegType(state, legType);
        if (!leg) {
            continue;
        }

        const absDelta = Math.abs(Number(leg.currentGreeks?.delta) || 0);
        const objRe = getReentryState(state, legType);

        if (absDelta <= cfg.shortPutTPDelta) {
            closePaperPosition(state, leg, Number(leg.markPrice || leg.entryPrice || 0), "TP_DELTA");
            objRe.consecutiveSl = 0;
            objRe.cooldownUntilCycle = state.cycleCount + Math.max(0, Math.floor(cfg.reentryCooldownCycles / 2));
            state.reentry[legType] = objRe;
            continue;
        }

        if (absDelta >= cfg.shortPutSLDelta) {
            closePaperPosition(state, leg, Number(leg.markPrice || leg.entryPrice || 0), "SL_DELTA");
            objRe.count += 1;
            objRe.consecutiveSl += 1;
            const vExtra = objRe.consecutiveSl * cfg.slChurnExtraCooldownPerSL;
            objRe.cooldownUntilCycle = state.cycleCount + cfg.reentryCooldownCycles + vExtra;

            if (objRe.consecutiveSl >= cfg.slChurnPauseAfterConsecutive) {
                objRe.pauseUntilCycle = state.cycleCount + cfg.slChurnPauseCycles;
                addEvent("CHURN", `${legType} paused after repeated SL`, {
                    consecutiveSl: objRe.consecutiveSl,
                    pauseUntilCycle: objRe.pauseUntilCycle,
                    cooldownUntilCycle: objRe.cooldownUntilCycle
                });
            }

            state.reentry[legType] = objRe;
        }
    }
}

function enforceGammaProtection(state, snapshot, portfolio) {
    const cfg = state.config;
    if (Math.abs(portfolio.totalGamma) <= cfg.gammaMaxAbs) {
        return;
    }

    const shorts = state.positions
        .filter((p) => isOpen(p) && (p.legType === "weekly_put_short" || p.legType === "biweekly_put_short"))
        .map((p) => ({
            pos: p,
            absGamma: Math.abs((Number(p.currentGreeks?.gamma) || 0) * (Number(p.qty) || 0))
        }))
        .sort((a, b) => b.absGamma - a.absGamma);

    if (shorts.length > 0) {
        closePaperPosition(state, shorts[0].pos, Number(shorts[0].pos.markPrice || shorts[0].pos.entryPrice || 0), "GAMMA_SPIKE_REDUCTION");
    }

    const monthly = getOpenByLegType(state, "monthly_call_long");
    if (!monthly) {
        tryOpenOptionLeg(state, snapshot, {
            legType: "monthly_call_long",
            type: "call",
            side: "buy",
            dteMin: cfg.monthlyDteMin,
            dteMax: cfg.monthlyDteMax,
            qty: cfg.minContracts,
            reason: "GAMMA_HEDGE"
        });
    }
}

function getNetFuturesContracts(state) {
    return state.positions
        .filter((p) => isOpen(p) && p.instrumentType === "future")
        .reduce((acc, p) => acc + ((Number(p.qty) || 0) * sideFactor(p.side)), 0);
}

function closeAllFutures(state, reason) {
    const openFutures = state.positions.filter((p) => isOpen(p) && p.instrumentType === "future");
    for (const f of openFutures) {
        closePaperPosition(state, f, Number(f.markPrice || f.entryPrice || 0), reason);
    }
}

function rebalanceDeltaWithFutures(state, portfolio, snapshot) {
    const cfg = state.config;
    const absDelta = Math.abs(portfolio.totalDelta);
    let targetContracts = 0;

    if (absDelta > cfg.deltaTolerance) {
        targetContracts = Math.round((-1 * portfolio.totalDelta) / cfg.futuresDeltaPerContract);
    }

    const currContracts = getNetFuturesContracts(state);
    let diff = targetContracts - currContracts;
    if (diff === 0) {
        return;
    }

    const cap = cfg.maxFuturesAdjustPerCycle;
    if (Math.abs(diff) > cap) {
        diff = diff > 0 ? cap : -cap;
    }

    if (targetContracts === 0) {
        closeAllFutures(state, "DELTA_BACK_IN_RANGE");
        return;
    }

    openPaperPosition(state, {
        legType: "futures_hedge",
        instrumentType: "future",
        symbol: cfg.symbol,
        optionType: "future",
        side: diff > 0 ? "buy" : "sell",
        qty: Math.abs(diff),
        price: Number(snapshot.ticker.mark || snapshot.ticker.spot || 0),
        greeks: { delta: 1, gamma: 0, theta: 0 },
        reason: "DELTA_REBALANCE"
    });
}

function canReenter(state, legType) {
    const cfg = state.config;
    const obj = getReentryState(state, legType);

    if (obj.count >= cfg.maxReentriesPerLeg && cfg.maxReentriesPerLeg >= 0) {
        return false;
    }
    if (state.cycleCount < obj.cooldownUntilCycle) {
        return false;
    }
    if (state.cycleCount < obj.pauseUntilCycle) {
        return false;
    }
    if (state.cycleCount >= obj.pauseUntilCycle && obj.pauseUntilCycle > 0) {
        // Pause window finished; allow fresh re-entry cycle.
        obj.pauseUntilCycle = 0;
        obj.consecutiveSl = 0;
        state.reentry[legType] = obj;
    }
    return true;
}

function runEntries(state, snapshot, portfolio, risk) {
    const cfg = state.config;
    if (risk.blockNewEntries) {
        return;
    }

    const baseQty = getDynamicQty(state, portfolio);

    const weekly = getOpenByLegType(state, "weekly_put_short");
    if (!weekly && canReenter(state, "weekly_put_short")) {
        const qty = getLegEntryQty(state, "weekly_put_short", baseQty);
        tryOpenOptionLeg(state, snapshot, {
            legType: "weekly_put_short",
            type: "put",
            side: "sell",
            dteMin: cfg.weeklyDteMin,
            dteMax: cfg.weeklyDteMax,
            qty,
            reason: "ENTRY_WEEKLY_PUT"
        });
    }

    const biweekly = getOpenByLegType(state, "biweekly_put_short");
    if (!biweekly && canReenter(state, "biweekly_put_short")) {
        const qty = getLegEntryQty(state, "biweekly_put_short", baseQty);
        tryOpenOptionLeg(state, snapshot, {
            legType: "biweekly_put_short",
            type: "put",
            side: "sell",
            dteMin: cfg.biWeeklyDteMin,
            dteMax: cfg.biWeeklyDteMax,
            qty,
            reason: "ENTRY_BIWEEKLY_PUT"
        });
    }

    const monthly = getOpenByLegType(state, "monthly_call_long");
    if (!monthly) {
        const hedgeQty = Math.max(cfg.minContracts, Math.floor(baseQty * 0.6));
        tryOpenOptionLeg(state, snapshot, {
            legType: "monthly_call_long",
            type: "call",
            side: "buy",
            dteMin: cfg.monthlyDteMin,
            dteMax: cfg.monthlyDteMax,
            qty: hedgeQty,
            reason: "ENTRY_MONTHLY_HEDGE"
        });
    }
}

function closeAllPositions(state, reason) {
    const open = state.positions.filter((p) => isOpen(p));
    for (const pos of open) {
        closePaperPosition(state, pos, Number(pos.markPrice || pos.entryPrice || 0), reason);
    }
}

async function runStrategyCycle(state) {
    const snapshot = await fetchSnapshot(state.credentials.apiKey, state.credentials.apiSecret, state.config);

    updateOpenMarksAndGreeks(state, snapshot);

    let portfolio = calculatePortfolio(state);
    let risk = assessRisk(state, portfolio);

    if (risk.closeAll) {
        closeAllPositions(state, risk.closeAllReason || "GLOBAL_EXIT");
        portfolio = calculatePortfolio(state);
        return { snapshot, portfolio, risk };
    }

    applyShortPutLegManagement(state);
    portfolio = calculatePortfolio(state);

    risk = assessRisk(state, portfolio);
    if (risk.gammaProtection) {
        enforceGammaProtection(state, snapshot, portfolio);
        portfolio = calculatePortfolio(state);
    }

    runEntries(state, snapshot, portfolio, risk);
    portfolio = calculatePortfolio(state);

    rebalanceDeltaWithFutures(state, portfolio, snapshot);
    portfolio = calculatePortfolio(state);

    if (state.config.requirePositiveTheta && portfolio.totalTheta <= 0) {
        addEvent("WARN", "Theta is non-positive after cycle", {
            totalTheta: Number(portfolio.totalTheta.toFixed(6))
        });
    }

    return { snapshot, portfolio, risk };
}

async function safeRunCycle(state) {
    try {
        const result = await runStrategyCycle(state);
        state.cycleCount += 1;
        state.lastCycleAt = new Date().toISOString();
        state.consecutiveFailures = 0;
        logger.info("paper_cycle_ok", {
            cycle: state.cycleCount,
            openCount: result.portfolio.openCount,
            delta: Number(result.portfolio.totalDelta.toFixed(4)),
            gamma: Number(result.portfolio.totalGamma.toFixed(6)),
            theta: Number(result.portfolio.totalTheta.toFixed(6)),
            pnl: Number(result.portfolio.totalPnl.toFixed(4))
        });
        return { status: "success", data: result };
    }
    catch (err) {
        state.consecutiveFailures += 1;
        state.lastError = err?.message || String(err);
        logger.error("paper_cycle_error", {
            error: state.lastError,
            consecutiveFailures: state.consecutiveFailures
        });
        if (state.consecutiveFailures >= state.config.maxConsecutiveFailures) {
            state.killSwitch.enabled = true;
            state.killSwitch.reason = "Consecutive failures threshold breached";
        }
        return { status: "danger", message: state.lastError };
    }
}

module.exports = {
    safeRunCycle,
    closeAllPositions
};
