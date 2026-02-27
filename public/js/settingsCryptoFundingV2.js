const CFV2_KEYS = {
    apiKey: "lsApiKeyCFV2",
    apiSecret: "lsSecretCFV2",
    loginValid: "lsLoginValidCFV2",
    autoTrader: "isAutoTraderCFV2"
};

function fnLoadLoginCredCFV2() {
    const apiKey = sessionStorage.getItem(CFV2_KEYS.apiKey) || "";
    const apiSecret = sessionStorage.getItem(CFV2_KEYS.apiSecret) || "";
    document.getElementById("txtDeltaAPIKeyCFV2").value = apiKey;
    document.getElementById("txtDeltaSecretCFV2").value = apiSecret;
}

function fnShowTraderLoginMdlCFV2(objThis) {
    const appStatus = localStorage.getItem("AppMsgStatusS");
    if (appStatus === "false") {
        fnGenMessage("First login to app for trading account login.", "badge bg-warning", "spnGenMsg");
        return;
    }

    if (objThis.className === "badge bg-danger") {
        $("#mdlDeltaLoginCFV2").modal("show");
        return;
    }

    fnClearLoginStatusCFV2();
    fnGenMessage("Trader disconnected successfully.", "badge bg-warning", "spnGenMsg");
}

function fnGetSetTraderLoginStatusCFV2() {
    const traderStatus = sessionStorage.getItem(CFV2_KEYS.loginValid);
    if (traderStatus === "true") {
        fnChangeBtnProps("btnTraderStatusCFV2", "badge bg-success", "Trader - Valid");
    } else {
        fnChangeBtnProps("btnTraderStatusCFV2", "badge bg-danger", "Trader - Invalid");
    }
}

function fnGetSetAutoTraderStatusCFV2() {
    const autoTraderStatus = sessionStorage.getItem(CFV2_KEYS.autoTrader);
    if (autoTraderStatus === "true") {
        fnChangeBtnProps("btnAutoTraderStatusCFV2", "badge bg-success", "Auto Trader - ON");
    } else {
        fnChangeBtnProps("btnAutoTraderStatusCFV2", "badge bg-danger", "Auto Trader - OFF");
        sessionStorage.setItem(CFV2_KEYS.autoTrader, "false");
    }
}

function fnToggleAutoTraderCFV2() {
    const appStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    if (!appStatus) {
        fnGenMessage("Login to account to start auto trading.", "badge bg-warning", "spnGenMsg");
        return;
    }

    const current = sessionStorage.getItem(CFV2_KEYS.autoTrader);
    if (current === "true") {
        sessionStorage.setItem(CFV2_KEYS.autoTrader, "false");
        fnChangeBtnProps("btnAutoTraderStatusCFV2", "badge bg-danger", "Auto Trader - OFF");
        fnGenMessage("Auto trading mode is OFF.", "badge bg-danger", "spnGenMsg");
    } else {
        sessionStorage.setItem(CFV2_KEYS.autoTrader, "true");
        fnChangeBtnProps("btnAutoTraderStatusCFV2", "badge bg-success", "Auto Trader - ON");
        fnGenMessage("Auto trading mode is ON.", "badge bg-success", "spnGenMsg");
    }
}

async function fnCheckDeltaCredCFV2() {
    const apiKeyInput = document.getElementById("txtDeltaAPIKeyCFV2");
    const apiSecretInput = document.getElementById("txtDeltaSecretCFV2");

    if (!apiKeyInput.value) {
        apiKeyInput.focus();
        fnGenMessage("Please input API key.", "badge bg-warning", "spnLoginMsgsCFV2");
        return;
    }
    if (!apiSecretInput.value) {
        apiSecretInput.focus();
        fnGenMessage("Please input secret code.", "badge bg-warning", "spnLoginMsgsCFV2");
        return;
    }

    try {
        const response = await fetch("/execCryptoFundingV2/DeltaCredValidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ApiKey: apiKeyInput.value, SecretCode: apiSecretInput.value })
        });
        const result = await response.json();

        if (result.status !== "success") {
            const code = result?.data?.code || result?.data?.raw?.error?.code || result?.data?.raw?.body?.error?.code || null;
            const clientIp =
                result?.data?.clientIp ||
                result?.data?.raw?.error?.context?.client_ip ||
                result?.data?.raw?.body?.error?.context?.client_ip ||
                null;

            let finalMsg = result.message || "Login failed.";
            if (code === "ip_not_whitelisted_for_api_key") {
                const ipText = clientIp ? ` IP: ${clientIp}` : "";
                finalMsg = `IP not whitelisted for this Delta API key.${ipText} Update this IP in Delta Exchange API settings.`;
            }

            fnGenMessage(finalMsg, `badge bg-${result.status || "warning"}`, "spnLoginMsgsCFV2");
            fnGenMessage(finalMsg, `badge bg-${result.status || "warning"}`, "spnGenMsg");
            return;
        }

        sessionStorage.setItem(CFV2_KEYS.apiKey, apiKeyInput.value);
        sessionStorage.setItem(CFV2_KEYS.apiSecret, apiSecretInput.value);
        sessionStorage.setItem(CFV2_KEYS.loginValid, "true");

        $("#mdlDeltaLoginCFV2").modal("hide");
        fnGetSetTraderLoginStatusCFV2();
        fnGetSetAutoTraderStatusCFV2();
        fnGenMessage("Delta login successful.", "badge bg-success", "spnGenMsg");
    } catch (error) {
        fnGenMessage("Error validating login.", "badge bg-danger", "spnLoginMsgsCFV2");
    }
}

function fnClearLoginStatusCFV2() {
    sessionStorage.removeItem(CFV2_KEYS.apiKey);
    sessionStorage.removeItem(CFV2_KEYS.apiSecret);
    sessionStorage.removeItem(CFV2_KEYS.loginValid);
    sessionStorage.removeItem(CFV2_KEYS.autoTrader);
    fnGetSetTraderLoginStatusCFV2();
    fnGetSetAutoTraderStatusCFV2();
}
