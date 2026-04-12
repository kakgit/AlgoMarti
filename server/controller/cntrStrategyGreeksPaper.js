const paperScheduler = require("../services/strategygreeks/scheduler");

exports.fnStartPaperEngine = async (req, res) => {
    try {
        const objCfg = req?.body?.Config || {};
        const vApiKey = String(req?.body?.ApiKey || "").trim();
        const vApiSecret = String(req?.body?.ApiSecret || "").trim();

        const objStart = paperScheduler.start({
            apiKey: vApiKey,
            apiSecret: vApiSecret,
            config: objCfg
        });

        res.send({ status: objStart.status, message: objStart.message, data: paperScheduler.getStatus() });
    }
    catch (err) {
        res.send({ status: "danger", message: err?.message || "Failed to start paper engine.", data: "" });
    }
};

exports.fnStopPaperEngine = async (req, res) => {
    try {
        const vReason = String(req?.body?.Reason || "Manual stop");
        const objStop = paperScheduler.stop(vReason);
        res.send({ status: objStop.status, message: objStop.message, data: paperScheduler.getStatus() });
    }
    catch (err) {
        res.send({ status: "danger", message: err?.message || "Failed to stop paper engine.", data: "" });
    }
};

exports.fnGetPaperStatus = async (_req, res) => {
    try {
        res.send({ status: "success", message: "Paper status fetched.", data: paperScheduler.getStatus() });
    }
    catch (err) {
        res.send({ status: "danger", message: err?.message || "Failed to fetch paper status.", data: "" });
    }
};

exports.fnRunPaperCycle = async (_req, res) => {
    try {
        const objRet = await paperScheduler.runSingleCycle();
        res.send({ status: objRet.status, message: objRet.message, data: objRet.data || paperScheduler.getStatus() });
    }
    catch (err) {
        res.send({ status: "danger", message: err?.message || "Failed to run paper cycle.", data: "" });
    }
};

exports.fnResetPaperState = async (_req, res) => {
    try {
        const objRet = paperScheduler.resetPaperState();
        res.send({ status: objRet.status, message: objRet.message, data: paperScheduler.getStatus() });
    }
    catch (err) {
        res.send({ status: "danger", message: err?.message || "Failed to reset paper state.", data: "" });
    }
};
