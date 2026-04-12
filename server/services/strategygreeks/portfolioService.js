function sideFactor(side) {
    return side === "buy" ? 1 : -1;
}

function getMarkToUse(pos) {
    const mark = Number(pos.markPrice);
    if (Number.isFinite(mark) && mark > 0) {
        return mark;
    }
    return Number(pos.entryPrice) || 0;
}

function getBrokerageRate(config, pos) {
    return pos.instrumentType === "future"
        ? Number(config?.futuresBrokerageRate || 0)
        : Number(config?.optionBrokerageRate || 0);
}

function estimateCloseCharges(config, pos) {
    const qty = Math.abs(Number(pos?.qty) || 0);
    const mark = Math.abs(getMarkToUse(pos));
    const rate = getBrokerageRate(config, pos);
    const minChg = Number(config?.minBrokeragePerOrder || 0);
    const raw = mark * qty * rate;
    return Math.max(minChg, raw);
}

function calcUnrealizedPnlGross(pos) {
    const qty = Number(pos.qty) || 0;
    const entry = Number(pos.entryPrice) || 0;
    const mark = getMarkToUse(pos);
    if (pos.side === "buy") {
        return (mark - entry) * qty;
    }
    return (entry - mark) * qty;
}

function calcUnrealizedPnlNet(config, pos) {
    const gross = calcUnrealizedPnlGross(pos);
    const openCharges = Number(pos?.openCharges || 0);
    const closeChargesEst = estimateCloseCharges(config, pos);
    return gross - openCharges - closeChargesEst;
}

function calcGreeksContribution(pos) {
    const qty = Number(pos.qty) || 0;
    const sf = sideFactor(pos.side);
    const g = pos.currentGreeks || pos.entryGreeks || {};

    return {
        delta: (Number(g.delta) || 0) * qty * sf,
        gamma: (Number(g.gamma) || 0) * qty * sf,
        theta: (Number(g.theta) || 0) * qty * sf
    };
}

function calcMarginUsed(positions, config) {
    let total = 0;
    for (const pos of positions) {
        const qty = Number(pos.qty) || 0;
        const refPx = getMarkToUse(pos);
        if (pos.instrumentType === "future") {
            total += Math.abs(refPx * qty * Number(config.futuresMarginRate || 0.12));
            continue;
        }

        if (pos.side === "sell") {
            total += Math.abs(refPx * qty * Number(config.optionShortMarginFactor || 1.25));
        }
        else {
            total += Math.abs(refPx * qty);
        }
    }
    return total;
}

function calculatePortfolio(state) {
    const cfg = state.config || {};
    const open = state.positions.filter((p) => p.status === "OPEN");
    const closed = state.closedPositions;

    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let grossUnrealizedPnl = 0;
    let unrealizedPnl = 0;
    let grossRealizedPnl = 0;
    let realizedPnl = 0;
    let totalCharges = 0;

    for (const pos of open) {
        const g = calcGreeksContribution(pos);
        totalDelta += g.delta;
        totalGamma += g.gamma;
        totalTheta += g.theta;

        const legGross = calcUnrealizedPnlGross(pos);
        const legNet = calcUnrealizedPnlNet(cfg, pos);
        const openChg = Number(pos?.openCharges || 0);
        const estClose = estimateCloseCharges(cfg, pos);

        grossUnrealizedPnl += legGross;
        unrealizedPnl += legNet;
        totalCharges += openChg + estClose;
    }

    for (const pos of closed) {
        grossRealizedPnl += Number(pos.grossRealizedPnl) || 0;
        realizedPnl += Number(pos.realizedPnl) || 0;
        totalCharges += Number(pos.totalCharges) || 0;
    }

    const marginUsed = calcMarginUsed(open, cfg);
    const totalPnl = realizedPnl + unrealizedPnl;

    return {
        openCount: open.length,
        closedCount: closed.length,
        totalDelta,
        totalGamma,
        totalTheta,
        grossUnrealizedPnl,
        unrealizedPnl,
        grossRealizedPnl,
        realizedPnl,
        totalCharges,
        totalPnl,
        marginUsed,
        pnlOnMarginPct: marginUsed > 0 ? (totalPnl / marginUsed) : 0
    };
}

module.exports = {
    calculatePortfolio,
    calcUnrealizedPnlGross,
    calcUnrealizedPnlNet,
    estimateCloseCharges
};
