function assessRisk(state, portfolio) {
    const cfg = state.config;
    const actions = {
        closeAll: false,
        closeAllReason: "",
        blockNewEntries: false,
        gammaProtection: false,
        needsThetaRepair: false
    };

    if (state.killSwitch.enabled) {
        actions.closeAll = true;
        actions.closeAllReason = `Kill switch: ${state.killSwitch.reason || "Triggered"}`;
        actions.blockNewEntries = true;
        return actions;
    }

    if (state.consecutiveFailures >= cfg.maxConsecutiveFailures) {
        actions.closeAll = true;
        actions.closeAllReason = "API failure threshold reached";
        actions.blockNewEntries = true;
        return actions;
    }

    if (portfolio.marginUsed > 0 && portfolio.pnlOnMarginPct >= cfg.profitExitPct) {
        actions.closeAll = true;
        actions.closeAllReason = "Profit target reached";
    }

    if (portfolio.marginUsed > 0 && portfolio.pnlOnMarginPct <= (-1 * cfg.maxLossPct)) {
        actions.closeAll = true;
        actions.closeAllReason = "Max loss cutoff reached";
    }

    if (Math.abs(portfolio.totalGamma) > cfg.gammaMaxAbs) {
        actions.gammaProtection = true;
        actions.blockNewEntries = true;
    }

    if (cfg.requirePositiveTheta && portfolio.totalTheta <= 0) {
        actions.needsThetaRepair = true;
    }

    if (portfolio.openCount >= cfg.maxOpenPositions) {
        actions.blockNewEntries = true;
    }

    return actions;
}

module.exports = {
    assessRisk
};
