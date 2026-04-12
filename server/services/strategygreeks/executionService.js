const { nextPositionId, addEvent } = require("./stateStore");

function applySlippage(price, side, bps) {
    const px = Number(price) || 0;
    const slip = (Number(bps) || 0) / 10000;
    if (side === "buy") {
        return px * (1 + slip);
    }
    return px * (1 - slip);
}

function calcOrderCharges(state, instrumentType, price, qty) {
    const px = Math.abs(Number(price) || 0);
    const q = Math.abs(Number(qty) || 0);
    const cfg = state?.config || {};
    const rate = instrumentType === "future"
        ? Number(cfg.futuresBrokerageRate || 0)
        : Number(cfg.optionBrokerageRate || 0);
    const minChg = Number(cfg.minBrokeragePerOrder || 0);
    const raw = px * q * rate;
    return Math.max(minChg, raw);
}

function openPaperPosition(state, input) {
    const qty = Math.max(1, Math.floor(Number(input.qty) || 0));
    const rawPrice = Number(input.price) || 0;
    const entryPrice = applySlippage(rawPrice, input.side, state.config.entrySlippageBps);
    const openCharges = calcOrderCharges(state, input.instrumentType, entryPrice, qty);

    const pos = {
        id: nextPositionId(),
        legType: input.legType,
        instrumentType: input.instrumentType,
        symbol: input.symbol,
        expiry: input.expiry || "",
        optionType: input.optionType || "",
        side: input.side,
        qty,
        entryPrice,
        markPrice: entryPrice,
        entryGreeks: {
            delta: Number(input.greeks?.delta) || 0,
            gamma: Number(input.greeks?.gamma) || 0,
            theta: Number(input.greeks?.theta) || 0
        },
        currentGreeks: {
            delta: Number(input.greeks?.delta) || 0,
            gamma: Number(input.greeks?.gamma) || 0,
            theta: Number(input.greeks?.theta) || 0
        },
        openCharges,
        estimatedCloseCharges: 0,
        totalCharges: openCharges,
        meta: input.meta || {},
        status: "OPEN",
        openedAt: new Date().toISOString(),
        closedAt: "",
        closeReason: "",
        grossRealizedPnl: 0,
        realizedPnl: 0
    };

    state.positions.push(pos);
    addEvent("OPEN", `${input.legType} ${input.side} ${qty} ${input.symbol}`, {
        reason: input.reason || "",
        openCharges: Number(openCharges.toFixed(6))
    });
    return pos;
}

function closePaperPosition(state, pos, closePrice, reason) {
    const px = applySlippage(closePrice, pos.side === "buy" ? "sell" : "buy", state.config.exitSlippageBps);
    const qty = Number(pos.qty) || 0;
    const entry = Number(pos.entryPrice) || 0;
    const gross = pos.side === "buy"
        ? (px - entry) * qty
        : (entry - px) * qty;

    const closeCharges = calcOrderCharges(state, pos.instrumentType, px, qty);
    const openCharges = Number(pos.openCharges || 0);
    const totalCharges = openCharges + closeCharges;
    const net = gross - totalCharges;

    pos.status = "CLOSED";
    pos.closedAt = new Date().toISOString();
    pos.closePrice = px;
    pos.closeReason = reason || "CLOSE";
    pos.closeCharges = closeCharges;
    pos.totalCharges = totalCharges;
    pos.grossRealizedPnl = gross;
    pos.realizedPnl = net;

    state.closedPositions.push(pos);
    state.positions = state.positions.filter((p) => p.id !== pos.id);

    addEvent("CLOSE", `${pos.legType} ${pos.side} ${pos.qty} ${pos.symbol}`, {
        reason: pos.closeReason,
        grossPnl: Number(gross.toFixed(6)),
        charges: Number(totalCharges.toFixed(6)),
        netPnl: Number(net.toFixed(6))
    });

    return pos;
}

module.exports = {
    openPaperPosition,
    closePaperPosition,
    calcOrderCharges
};
