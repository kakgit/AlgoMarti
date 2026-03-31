const path = require("path");
const { spawn } = require("child_process");

const gScriptPath = path.resolve(__dirname, "../../tools/renko_dual_pattern_backtest.js");
const gProjectRoot = path.resolve(__dirname, "../../");

function fnCleanText(pVal, pDef = ""){
    if(pVal === undefined || pVal === null){
        return pDef;
    }
    return String(pVal).trim();
}

function fnNumVal(pVal, pDef){
    const v = Number(pVal);
    return Number.isFinite(v) ? v : pDef;
}

function fnIntVal(pVal, pDef){
    const v = Math.trunc(Number(pVal));
    return Number.isFinite(v) ? v : pDef;
}

function fnBoolVal(pVal, pDef = false){
    if(pVal === undefined || pVal === null){
        return pDef;
    }
    const v = String(pVal).toLowerCase().trim();
    if(["1", "true", "yes", "on"].includes(v)){
        return true;
    }
    if(["0", "false", "no", "off"].includes(v)){
        return false;
    }
    return pDef;
}

function fnBuildArgs(pBody){
    const objCfg = {
        symbol: fnCleanText(pBody.symbol, "BTCUSD").toUpperCase(),
        resolution: fnCleanText(pBody.resolution, "1m"),
        source: fnCleanText(pBody.source, "ohlc").toLowerCase(),
        days: fnIntVal(pBody.days, 90),
        chunkDays: fnIntVal(pBody.chunkDays, 1),
        box: fnNumVal(pBody.box, 50),
        sl: fnNumVal(pBody.sl, 150),
        tp: fnNumVal(pBody.tp, 200),
        maxHoldBoxes: fnIntVal(pBody.maxHoldBoxes, 60),
        streakGuardSL: fnIntVal(pBody.streakGuardSL, 2),
        cooldownBoxes: fnIntVal(pBody.cooldownBoxes, 10),
        longPatterns: fnCleanText(pBody.longPatterns, "GGRGG"),
        shortPatterns: fnCleanText(pBody.shortPatterns, "RRGRR"),
        martingale: fnBoolVal(pBody.martingale, false),
        baseQty: fnIntVal(pBody.baseQty, 1),
        maxMultiplier: fnIntVal(pBody.maxMultiplier, 64),
        feePctPerSide: fnNumVal(pBody.feePctPerSide, 0),
        slippagePtsPerSide: fnNumVal(pBody.slippagePtsPerSide, 0),
        startIso: fnCleanText(pBody.startIso, ""),
        endIso: fnCleanText(pBody.endIso, "")
    };

    const objArgs = [
        gScriptPath,
        "--symbol", objCfg.symbol,
        "--resolution", objCfg.resolution,
        "--source", objCfg.source,
        "--days", String(objCfg.days),
        "--chunkDays", String(objCfg.chunkDays),
        "--box", String(objCfg.box),
        "--sl", String(objCfg.sl),
        "--tp", String(objCfg.tp),
        "--maxHoldBoxes", String(objCfg.maxHoldBoxes),
        "--streakGuardSL", String(objCfg.streakGuardSL),
        "--cooldownBoxes", String(objCfg.cooldownBoxes),
        "--longPatterns", objCfg.longPatterns,
        "--shortPatterns", objCfg.shortPatterns,
        "--martingale", objCfg.martingale ? "true" : "false",
        "--baseQty", String(objCfg.baseQty),
        "--maxMultiplier", String(objCfg.maxMultiplier),
        "--feePctPerSide", String(objCfg.feePctPerSide),
        "--slippagePtsPerSide", String(objCfg.slippagePtsPerSide)
    ];

    if(objCfg.startIso){
        objArgs.push("--start", objCfg.startIso);
    }
    if(objCfg.endIso){
        objArgs.push("--end", objCfg.endIso);
    }

    return { objArgs, objCfg };
}

function fnRunScript(objArgs, pTimeoutMs = 300000){
    return new Promise((resolve) => {
        const vStartedAt = Date.now();
        const objChild = spawn(process.execPath, objArgs, { cwd: gProjectRoot, windowsHide: true });
        let vStdOut = "";
        let vStdErr = "";
        let bTimedOut = false;

        const vTimer = setTimeout(() => {
            bTimedOut = true;
            try{
                objChild.kill();
            }
            catch(_err){}
        }, Math.max(10000, pTimeoutMs));

        objChild.stdout.on("data", (pChunk) => {
            vStdOut += pChunk.toString();
        });

        objChild.stderr.on("data", (pChunk) => {
            vStdErr += pChunk.toString();
        });

        objChild.on("close", (pCode) => {
            clearTimeout(vTimer);
            resolve({
                code: pCode,
                stdout: vStdOut,
                stderr: vStdErr,
                timedOut: bTimedOut,
                durationMs: Date.now() - vStartedAt
            });
        });
    });
}

exports.defaultRoute = (req, res) => {
    res.render("RenkoDualBacktest.ejs");
};

exports.fnRunBacktest = async (req, res) => {
    try{
        const { objArgs, objCfg } = fnBuildArgs(req.body || {});
        const objRun = await fnRunScript(objArgs, fnIntVal(req.body?.timeoutMs, 300000));
        const bOk = (objRun.code === 0 && !objRun.timedOut);

        res.send({
            status: bOk ? "success" : "danger",
            message: bOk ? "Backtest completed." : (objRun.timedOut ? "Backtest timed out." : "Backtest failed."),
            data: {
                config: objCfg,
                exitCode: objRun.code,
                durationMs: objRun.durationMs,
                timedOut: objRun.timedOut,
                stdout: objRun.stdout,
                stderr: objRun.stderr
            }
        });
    }
    catch(objErr){
        res.send({
            status: "danger",
            message: "Failed to run backtest.",
            data: { error: objErr?.message || String(objErr) }
        });
    }
};

