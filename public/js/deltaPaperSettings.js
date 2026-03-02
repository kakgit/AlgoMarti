const DP_KEYS = {
    apiKey: "DP_apiKey",
    apiSecret: "DP_apiSecret",
    login: "DP_loginValid",
    auto: "DP_autoTrader"
};

function fnShowDPLoginMdl() {
    const traderStatus = localStorage.getItem(DP_KEYS.login);
    if (traderStatus === "true") {
        fnClearDPLogin();
        fnGenMessage("Trader disconnected.", "badge bg-warning", "spnGenMsg");
        return;
    }
    $("#mdlDeltaPaperLogin").modal("show");
}

function fnLoadDPLoginCred() {
    const apiKey = localStorage.getItem(DP_KEYS.apiKey) || "";
    const apiSecret = localStorage.getItem(DP_KEYS.apiSecret) || "";
    const keyInput = document.getElementById("txtDPApiKey");
    const secretInput = document.getElementById("txtDPApiSecret");
    if (keyInput) keyInput.value = apiKey;
    if (secretInput) secretInput.value = apiSecret;
}

function fnGetSetDPTraderStatus() {
    const btn = document.getElementById("btnDPTraderStatus");
    if (!btn) return;
    const ok = localStorage.getItem(DP_KEYS.login) === "true";
    fnChangeBtnProps(btn.id, ok ? "badge bg-success" : "badge bg-danger", ok ? "Trader - Valid" : "Trader - Invalid");
}

function fnGetSetDPAutoStatus() {
    const btn = document.getElementById("btnDPAutoStatus");
    if (!btn) return;
    const on = localStorage.getItem(DP_KEYS.auto) === "true";
    fnChangeBtnProps(btn.id, on ? "badge bg-success" : "badge bg-danger", on ? "Auto Trader - ON" : "Auto Trader - OFF");
}

function fnToggleDPAuto() {
    const appStatus = JSON.parse(localStorage.getItem("AppMsgStatusS") || "false");
    if (!appStatus) {
        fnGenMessage("Login to app first.", "badge bg-warning", "spnGenMsg");
        return;
    }
    const curr = localStorage.getItem(DP_KEYS.auto) === "true";
    localStorage.setItem(DP_KEYS.auto, curr ? "false" : "true");
    fnGetSetDPAutoStatus();
}

function fnClearDPLogin() {
    localStorage.removeItem(DP_KEYS.login);
    localStorage.removeItem(DP_KEYS.auto);
    fnGetSetDPTraderStatus();
    fnGetSetDPAutoStatus();
}

async function fnValidateDPLogin() {
    const keyInput = document.getElementById("txtDPApiKey");
    const secretInput = document.getElementById("txtDPApiSecret");
    const apiKey = keyInput?.value?.trim();
    const apiSecret = secretInput?.value?.trim();

    if (!apiKey || !apiSecret) {
        fnGenMessage("Enter API key and secret.", "badge bg-warning", "spnDeltaPaperLogin");
        return;
    }

    try {
        const response = await fetch("/deltaSStrangleDemo/validateLogin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ApiKey: apiKey, ApiSecret: apiSecret })
        });
        const result = await response.json();
        if (result.status === "success") {
            localStorage.setItem(DP_KEYS.apiKey, apiKey);
            localStorage.setItem(DP_KEYS.apiSecret, apiSecret);
            localStorage.setItem(DP_KEYS.login, "true");
            fnGetSetDPTraderStatus();
            fnGenMessage("Trader login valid.", "badge bg-success", "spnGenMsg");
            $("#mdlDeltaPaperLogin").modal("hide");
            return;
        }
        fnGenMessage(result.message || "Login validation failed.", `badge bg-${result.status || "warning"}`, "spnDeltaPaperLogin");
    } catch (error) {
        fnGenMessage("Validation request failed.", "badge bg-danger", "spnDeltaPaperLogin");
    }
}

