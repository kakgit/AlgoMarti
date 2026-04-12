const { gState, resetRuntime, addEvent } = require("./stateStore");
const { normalizeConfig } = require("./config");
const logger = require("./logger");
const { safeRunCycle, closeAllPositions } = require("./strategyEngine");
const { calculatePortfolio } = require("./portfolioService");

async function runTick() {
    if (!gState.running || gState.isBusy) {
        return;
    }

    gState.isBusy = true;
    try {
        await safeRunCycle(gState);
    }
    finally {
        gState.isBusy = false;
    }
}

function start(input) {
    if (gState.running) {
        return { status: "warning", message: "Paper engine already running." };
    }

    const apiKey = String(input?.apiKey || "").trim();
    const apiSecret = String(input?.apiSecret || "").trim();
    if (!apiKey || !apiSecret) {
        return { status: "warning", message: "API key/secret are required." };
    }

    const cfg = normalizeConfig(input?.config || {});

    resetRuntime();
    gState.credentials.apiKey = apiKey;
    gState.credentials.apiSecret = apiSecret;
    gState.config = cfg;
    gState.startedAt = new Date().toISOString();
    gState.stoppedAt = null;
    gState.running = true;

    const loopMs = cfg.loopSeconds * 1000;
    gState.timerRef = setInterval(runTick, loopMs);

    addEvent("ENGINE", "Paper engine started", { loopSeconds: cfg.loopSeconds });
    logger.info("paper_engine_started", { loopSeconds: cfg.loopSeconds });

    void runTick();

    return { status: "success", message: "Paper engine started." };
}

function stop(reason = "Manual stop") {
    if (gState.timerRef) {
        clearInterval(gState.timerRef);
        gState.timerRef = null;
    }
    if (gState.running) {
        gState.running = false;
        gState.stoppedAt = new Date().toISOString();
        addEvent("ENGINE", "Paper engine stopped", { reason });
        logger.info("paper_engine_stopped", { reason });
    }

    return { status: "success", message: "Paper engine stopped." };
}

function emergencyStop(reason) {
    stop(reason || "Emergency stop");
    closeAllPositions(gState, reason || "EMERGENCY_STOP");
}

function getStatus() {
    const portfolio = calculatePortfolio(gState);
    return {
        running: gState.running,
        startedAt: gState.startedAt,
        stoppedAt: gState.stoppedAt,
        cycleCount: gState.cycleCount,
        consecutiveFailures: gState.consecutiveFailures,
        lastError: gState.lastError,
        lastCycleAt: gState.lastCycleAt,
        killSwitch: gState.killSwitch,
        config: gState.config,
        portfolio,
        openPositions: gState.positions,
        closedPositions: gState.closedPositions.slice(-100),
        events: gState.events.slice(0, 50)
    };
}

async function runSingleCycle() {
    if (!gState.credentials.apiKey || !gState.credentials.apiSecret) {
        return { status: "warning", message: "No credentials. Start engine first." };
    }

    if (gState.isBusy) {
        return { status: "warning", message: "Cycle already in progress." };
    }

    gState.isBusy = true;
    try {
        const ret = await safeRunCycle(gState);
        return { status: ret.status, message: ret.message || "Cycle completed.", data: getStatus() };
    }
    finally {
        gState.isBusy = false;
    }
}

function resetPaperState() {
    stop("Reset state");
    resetRuntime();
    gState.credentials = { apiKey: "", apiSecret: "" };
    gState.config = normalizeConfig({});
    gState.startedAt = null;
    gState.stoppedAt = null;
    return { status: "success", message: "Paper state reset." };
}

module.exports = {
    start,
    stop,
    emergencyStop,
    getStatus,
    runSingleCycle,
    resetPaperState
};
