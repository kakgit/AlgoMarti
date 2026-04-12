const DEFAULT_CONFIG = {
    symbol: "BTCUSD",
    underlying: "BTC",
    loopSeconds: 10,
    targetDelta: 0,
    deltaTolerance: 20,
    targetAbsDeltaOption: 0.33,
    shortPutTPDelta: 0.15,
    shortPutSLDelta: 0.50,
    weeklyDteMin: 5,
    weeklyDteMax: 10,
    biWeeklyDteMin: 9,
    biWeeklyDteMax: 14,
    monthlyDteMin: 30,
    monthlyDteMax: 60,
    gammaMaxAbs: 25,
    requirePositiveTheta: true,
    profitExitPct: 0.35,
    maxLossPct: 0.20,
    maxOpenPositions: 12,
    maxConsecutiveFailures: 5,
    maxReentriesPerLeg: 3,
    reentryCooldownCycles: 2,
    slChurnPauseAfterConsecutive: 2,
    slChurnPauseCycles: 6,
    slChurnExtraCooldownPerSL: 2,
    slChurnQtyReductionFactor: 0.5,
    minContracts: 1,
    maxContracts: 8,
    maxFuturesAdjustPerCycle: 15,
    futuresDeltaPerContract: 1,
    optionShortMarginFactor: 1.25,
    futuresMarginRate: 0.12,
    optionBrokerageRate: 0.0005,
    futuresBrokerageRate: 0.0004,
    minBrokeragePerOrder: 0,
    entrySlippageBps: 2,
    exitSlippageBps: 2,
    gammaReductionFactor: 0.6
};

function n(v, fallback) {
    const num = Number(v);
    return Number.isFinite(num) ? num : fallback;
}

function normalizeConfig(input = {}) {
    return {
        ...DEFAULT_CONFIG,
        ...input,
        loopSeconds: Math.max(5, n(input.loopSeconds, DEFAULT_CONFIG.loopSeconds)),
        deltaTolerance: Math.max(1, n(input.deltaTolerance, DEFAULT_CONFIG.deltaTolerance)),
        gammaMaxAbs: Math.max(0.01, n(input.gammaMaxAbs, DEFAULT_CONFIG.gammaMaxAbs)),
        profitExitPct: Math.max(0.05, Math.min(0.95, n(input.profitExitPct, DEFAULT_CONFIG.profitExitPct))),
        maxLossPct: Math.max(0.01, Math.min(0.95, n(input.maxLossPct, DEFAULT_CONFIG.maxLossPct))),
        minContracts: Math.max(1, Math.floor(n(input.minContracts, DEFAULT_CONFIG.minContracts))),
        maxContracts: Math.max(1, Math.floor(n(input.maxContracts, DEFAULT_CONFIG.maxContracts))),
        maxOpenPositions: Math.max(1, Math.floor(n(input.maxOpenPositions, DEFAULT_CONFIG.maxOpenPositions))),
        maxConsecutiveFailures: Math.max(1, Math.floor(n(input.maxConsecutiveFailures, DEFAULT_CONFIG.maxConsecutiveFailures))),
        maxReentriesPerLeg: Math.max(0, Math.floor(n(input.maxReentriesPerLeg, DEFAULT_CONFIG.maxReentriesPerLeg))),
        reentryCooldownCycles: Math.max(0, Math.floor(n(input.reentryCooldownCycles, DEFAULT_CONFIG.reentryCooldownCycles))),
        slChurnPauseAfterConsecutive: Math.max(1, Math.floor(n(input.slChurnPauseAfterConsecutive, DEFAULT_CONFIG.slChurnPauseAfterConsecutive))),
        slChurnPauseCycles: Math.max(1, Math.floor(n(input.slChurnPauseCycles, DEFAULT_CONFIG.slChurnPauseCycles))),
        slChurnExtraCooldownPerSL: Math.max(0, Math.floor(n(input.slChurnExtraCooldownPerSL, DEFAULT_CONFIG.slChurnExtraCooldownPerSL))),
        slChurnQtyReductionFactor: Math.max(0.1, Math.min(1, n(input.slChurnQtyReductionFactor, DEFAULT_CONFIG.slChurnQtyReductionFactor))),
        maxFuturesAdjustPerCycle: Math.max(1, Math.floor(n(input.maxFuturesAdjustPerCycle, DEFAULT_CONFIG.maxFuturesAdjustPerCycle))),
        optionBrokerageRate: Math.max(0, n(input.optionBrokerageRate, DEFAULT_CONFIG.optionBrokerageRate)),
        futuresBrokerageRate: Math.max(0, n(input.futuresBrokerageRate, DEFAULT_CONFIG.futuresBrokerageRate)),
        minBrokeragePerOrder: Math.max(0, n(input.minBrokeragePerOrder, DEFAULT_CONFIG.minBrokeragePerOrder)),
        entrySlippageBps: Math.max(0, n(input.entrySlippageBps, DEFAULT_CONFIG.entrySlippageBps)),
        exitSlippageBps: Math.max(0, n(input.exitSlippageBps, DEFAULT_CONFIG.exitSlippageBps))
    };
}

module.exports = {
    DEFAULT_CONFIG,
    normalizeConfig
};
