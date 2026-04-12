function sgPaperMsg(pTxt, pType = "warning") {
    const obj = document.getElementById("spnPaperStatus");
    if (!obj) {
        return;
    }
    obj.className = `badge bg-${pType}`;
    obj.innerText = pTxt;
}

function sgPaperGetCreds() {
    const apiKey = String(document.getElementById("txtUserAPIKey")?.value || "").trim();
    const apiSecret = String(document.getElementById("txtAPISecret")?.value || "").trim();
    return { apiKey, apiSecret };
}

function sgPaperConfigFromUi() {
    const loopSeconds = Number(document.getElementById("txtPaperLoopSec")?.value || 10);
    const deltaTolerance = Number(document.getElementById("txtPaperDeltaTol")?.value || 20);
    const gammaMaxAbs = Number(document.getElementById("txtPaperGammaMax")?.value || 25);
    const profitExitPct = Number(document.getElementById("txtPaperProfitPct")?.value || 0.35);
    const maxLossPct = Number(document.getElementById("txtPaperMaxLossPct")?.value || 0.20);

    return {
        loopSeconds,
        deltaTolerance,
        gammaMaxAbs,
        profitExitPct,
        maxLossPct
    };
}

async function sgPaperFetchJson(url, method = "GET", body = null) {
    const objReq = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body !== null) {
        objReq.body = JSON.stringify(body);
    }
    const response = await fetch(url, objReq);
    return response.json();
}

function sgPaperRenderStatus(objData) {
    const objPre = document.getElementById("prePaperStatus");
    if (!objPre || !objData) {
        return;
    }

    const p = objData.portfolio || {};
    const lines = [];
    lines.push(`Running: ${objData.running ? "YES" : "NO"}`);
    lines.push(`Cycles: ${objData.cycleCount || 0}`);
    lines.push(`Last Cycle: ${objData.lastCycleAt || "-"}`);
    lines.push(`Failures: ${objData.consecutiveFailures || 0}`);
    lines.push(`Kill Switch: ${objData.killSwitch?.enabled ? `ON (${objData.killSwitch.reason || ""})` : "OFF"}`);
    lines.push(`Open Positions: ${p.openCount || 0}`);
    lines.push(`Closed Positions: ${p.closedCount || 0}`);
    lines.push(`Delta: ${Number(p.totalDelta || 0).toFixed(4)}`);
    lines.push(`Gamma: ${Number(p.totalGamma || 0).toFixed(6)}`);
    lines.push(`Theta: ${Number(p.totalTheta || 0).toFixed(6)}`);
    lines.push(`Margin Used: ${Number(p.marginUsed || 0).toFixed(2)}`);
    lines.push(`Gross Unrealized PnL: ${Number(p.grossUnrealizedPnl || 0).toFixed(4)}`);
    lines.push(`Net Unrealized PnL: ${Number(p.unrealizedPnl || 0).toFixed(4)}`);
    lines.push(`Gross Realized PnL: ${Number(p.grossRealizedPnl || 0).toFixed(4)}`);
    lines.push(`Net Realized PnL: ${Number(p.realizedPnl || 0).toFixed(4)}`);
    lines.push(`Total Charges: ${Number(p.totalCharges || 0).toFixed(4)}`);
    lines.push(`Net Total PnL: ${Number(p.totalPnl || 0).toFixed(4)}`);
    lines.push(`Net PnL/Margin: ${(Number(p.pnlOnMarginPct || 0) * 100).toFixed(2)}%`);

    objPre.textContent = lines.join("\n");

    const objEvents = document.getElementById("prePaperEvents");
    if (objEvents) {
        const list = (objData.events || []).slice(0, 10).map((e) => {
            const metaTxt = (e && e.meta && Object.keys(e.meta).length > 0) ? ` | ${JSON.stringify(e.meta)}` : "";
            return `${e.ts} | ${e.type} | ${e.message}${metaTxt}`;
        });
        objEvents.textContent = list.length > 0 ? list.join("\n") : "No events yet.";
    }

    sgPaperRenderOpenLegs(objData.openPositions || [], objData.config || {});
    sgPaperRenderClosedLegs(objData.closedPositions || []);
}

function sgPaperFmtNum(v, d = 2) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(d) : "-";
}

function sgPaperBrokerageRate(pos, cfg) {
    return String(pos?.instrumentType || "").toLowerCase() === "future"
        ? Number(cfg?.futuresBrokerageRate || 0)
        : Number(cfg?.optionBrokerageRate || 0);
}

function sgPaperEstimateCloseCharges(pos, cfg) {
    const qty = Math.abs(Number(pos?.qty || 0));
    const mark = Math.abs(Number(pos?.markPrice || pos?.entryPrice || 0));
    const rate = sgPaperBrokerageRate(pos, cfg);
    const minChg = Number(cfg?.minBrokeragePerOrder || 0);
    const raw = mark * qty * rate;
    return Math.max(minChg, raw);
}

function sgPaperCalcLegGrossPnl(pos) {
    const qty = Number(pos?.qty || 0);
    const entry = Number(pos?.entryPrice || 0);
    const mark = Number(pos?.markPrice || entry);
    if (!Number.isFinite(qty) || !Number.isFinite(entry) || !Number.isFinite(mark)) {
        return 0;
    }
    return String(pos?.side || "").toLowerCase() === "buy"
        ? (mark - entry) * qty
        : (entry - mark) * qty;
}

function sgPaperRenderOpenLegs(openPositions, cfg) {
    const objBody = document.getElementById("tBodyPaperOpenLegs");
    if (!objBody) {
        return;
    }

    const rows = Array.isArray(openPositions) ? openPositions : [];
    if (rows.length === 0) {
        objBody.innerHTML = '<tr><td colspan="13" class="text-center text-muted">No open paper positions.</td></tr>';
        return;
    }

    let html = "";
    for (const pos of rows) {
        const leg = String(pos?.legType || "-");
        const symbol = String(pos?.symbol || "-");
        const side = String(pos?.side || "-");
        const qty = sgPaperFmtNum(pos?.qty, 0);
        const entry = sgPaperFmtNum(pos?.entryPrice, 2);
        const mark = sgPaperFmtNum(pos?.markPrice, 2);

        const grossPnl = sgPaperCalcLegGrossPnl(pos);
        const openCharges = Number(pos?.openCharges || 0);
        const estCloseCharges = sgPaperEstimateCloseCharges(pos, cfg);
        const netPnl = grossPnl - openCharges - estCloseCharges;

        const pnlTxt = sgPaperFmtNum(netPnl, 4);
        const pnlCls = netPnl >= 0 ? "text-success" : "text-danger";
        const delta = sgPaperFmtNum(pos?.currentGreeks?.delta, 4);
        const gamma = sgPaperFmtNum(pos?.currentGreeks?.gamma, 6);
        const theta = sgPaperFmtNum(pos?.currentGreeks?.theta, 6);
        const dte = sgPaperFmtNum(pos?.meta?.dte, 2);

        html += "<tr style=\"text-align:center;\">";
        html += `<td style="text-wrap: nowrap;">${leg}</td>`;
        html += `<td style="text-wrap: nowrap;">${symbol}</td>`;
        html += `<td>${side}</td>`;
        html += `<td>${qty}</td>`;
        html += `<td>${entry}</td>`;
        html += `<td>${mark}</td>`;
        html += `<td>${sgPaperFmtNum(grossPnl, 4)}</td>`;
        html += `<td>${sgPaperFmtNum(openCharges + estCloseCharges, 4)}</td>`;
        html += `<td class="${pnlCls}" style="font-weight:bold;">${pnlTxt}</td>`;
        html += `<td>${delta}</td>`;
        html += `<td>${gamma}</td>`;
        html += `<td>${theta}</td>`;
        html += `<td>${dte}</td>`;
        html += "</tr>";
    }

    objBody.innerHTML = html;
}

function sgPaperRenderClosedLegs(closedPositions) {
    const objBody = document.getElementById("tBodyPaperClosedLegs");
    if (!objBody) {
        return;
    }

    const rows = (Array.isArray(closedPositions) ? closedPositions : []).slice().reverse();
    if (rows.length === 0) {
        objBody.innerHTML = '<tr><td colspan="11" class="text-center text-muted">No closed paper positions yet.</td></tr>';
        return;
    }

    let html = "";
    for (const pos of rows) {
        const gross = Number(pos?.grossRealizedPnl || 0);
        const charges = Number(pos?.totalCharges || 0);
        const net = Number(pos?.realizedPnl || 0);
        const netCls = net >= 0 ? "text-success" : "text-danger";

        html += "<tr style=\"text-align:center;\">";
        html += `<td style="text-wrap: nowrap;">${String(pos?.legType || "-")}</td>`;
        html += `<td style="text-wrap: nowrap;">${String(pos?.symbol || "-")}</td>`;
        html += `<td>${String(pos?.side || "-")}</td>`;
        html += `<td>${sgPaperFmtNum(pos?.qty, 0)}</td>`;
        html += `<td>${sgPaperFmtNum(pos?.entryPrice, 2)}</td>`;
        html += `<td>${sgPaperFmtNum(pos?.closePrice, 2)}</td>`;
        html += `<td>${sgPaperFmtNum(gross, 4)}</td>`;
        html += `<td>${sgPaperFmtNum(charges, 4)}</td>`;
        html += `<td class="${netCls}" style="font-weight:bold;">${sgPaperFmtNum(net, 4)}</td>`;
        html += `<td>${String(pos?.closeReason || "-")}</td>`;
        html += `<td style="text-wrap: nowrap;">${String(pos?.closedAt || "-")}</td>`;
        html += "</tr>";
    }

    objBody.innerHTML = html;
}

async function fnStartGreeksPaperEngine() {
    try {
        const creds = sgPaperGetCreds();
        if (!creds.apiKey || !creds.apiSecret) {
            sgPaperMsg("Please login first with API key/secret.", "warning");
            return;
        }

        sgPaperMsg("Starting paper engine...", "info");
        const objRes = await sgPaperFetchJson("/strategygreeks/paper/start", "POST", {
            ApiKey: creds.apiKey,
            ApiSecret: creds.apiSecret,
            Config: sgPaperConfigFromUi()
        });
        sgPaperMsg(objRes.message || "Done", objRes.status === "success" ? "success" : "warning");
        sgPaperRenderStatus(objRes.data);
    }
    catch (err) {
        sgPaperMsg(err?.message || "Failed to start paper engine.", "danger");
    }
}

async function fnStopGreeksPaperEngine() {
    try {
        sgPaperMsg("Stopping paper engine...", "warning");
        const objRes = await sgPaperFetchJson("/strategygreeks/paper/stop", "POST", { Reason: "Manual stop from UI" });
        sgPaperMsg(objRes.message || "Stopped", objRes.status === "success" ? "success" : "warning");
        sgPaperRenderStatus(objRes.data);
    }
    catch (err) {
        sgPaperMsg(err?.message || "Failed to stop paper engine.", "danger");
    }
}

async function fnRunGreeksPaperCycle() {
    try {
        sgPaperMsg("Running one cycle...", "info");
        const objRes = await sgPaperFetchJson("/strategygreeks/paper/cycle", "POST", {});
        sgPaperMsg(objRes.message || "Cycle done", objRes.status === "success" ? "success" : "warning");
        sgPaperRenderStatus(objRes.data);
    }
    catch (err) {
        sgPaperMsg(err?.message || "Failed to run cycle.", "danger");
    }
}

async function fnResetGreeksPaperState() {
    try {
        sgPaperMsg("Resetting paper state...", "warning");
        const objRes = await sgPaperFetchJson("/strategygreeks/paper/reset", "POST", {});
        sgPaperMsg(objRes.message || "Reset done", objRes.status === "success" ? "success" : "warning");
        sgPaperRenderStatus(objRes.data);
    }
    catch (err) {
        sgPaperMsg(err?.message || "Failed to reset paper state.", "danger");
    }
}

async function fnRefreshGreeksPaperStatus(pSilent = false) {
    try {
        const objRes = await sgPaperFetchJson("/strategygreeks/paper/status", "GET");
        sgPaperRenderStatus(objRes.data);
        if (!pSilent) {
            sgPaperMsg("Paper status updated.", objRes.status === "success" ? "success" : "warning");
        }
    }
    catch (err) {
        if (!pSilent) {
            sgPaperMsg(err?.message || "Failed to fetch paper status.", "danger");
        }
    }
}

window.addEventListener("DOMContentLoaded", function () {
    void fnRefreshGreeksPaperStatus(true);
    setInterval(() => {
        void fnRefreshGreeksPaperStatus(true);
    }, 5000);
});
