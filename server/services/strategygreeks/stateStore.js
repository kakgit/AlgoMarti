const { normalizeConfig, DEFAULT_CONFIG } = require("./config");

function createLegReentryState() {
    return {
        count: 0,
        cooldownUntilCycle: 0,
        consecutiveSl: 0,
        pauseUntilCycle: 0
    };
}

function createInitialState() {
    return {
        running: false,
        startedAt: null,
        stoppedAt: null,
        isBusy: false,
        timerRef: null,
        cycleCount: 0,
        consecutiveFailures: 0,
        lastError: "",
        lastCycleAt: null,
        credentials: {
            apiKey: "",
            apiSecret: ""
        },
        config: normalizeConfig(DEFAULT_CONFIG),
        positions: [],
        closedPositions: [],
        reentry: {
            weekly_put_short: createLegReentryState(),
            biweekly_put_short: createLegReentryState()
        },
        killSwitch: {
            enabled: false,
            reason: ""
        },
        events: []
    };
}

const gState = createInitialState();

function addEvent(type, message, meta = {}) {
    gState.events.unshift({
        ts: new Date().toISOString(),
        type,
        message,
        meta
    });
    if (gState.events.length > 250) {
        gState.events.length = 250;
    }
}

function nextPositionId() {
    return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function resetRuntime() {
    gState.cycleCount = 0;
    gState.consecutiveFailures = 0;
    gState.lastError = "";
    gState.lastCycleAt = null;
    gState.positions = [];
    gState.closedPositions = [];
    gState.events = [];
    gState.reentry = {
        weekly_put_short: createLegReentryState(),
        biweekly_put_short: createLegReentryState()
    };
    gState.killSwitch = { enabled: false, reason: "" };
}

module.exports = {
    gState,
    createInitialState,
    resetRuntime,
    addEvent,
    nextPositionId
};
