function fnPickWalletMetricCCDE(pWalletRows, pFieldList){
    if(!Array.isArray(pWalletRows) || pWalletRows.length === 0){
        return NaN;
    }

    let vAnyFinite = NaN;
    for(let i = 0; i < pWalletRows.length; i += 1){
        let objRow = pWalletRows[i] || {};
        for(let j = 0; j < pFieldList.length; j += 1){
            let vNum = Number(objRow[pFieldList[j]]);
            if(Number.isFinite(vNum)){
                if(!Number.isFinite(vAnyFinite)){
                    vAnyFinite = vNum;
                }
                if(vNum > 0){
                    return vNum;
                }
            }
        }
    }
    return vAnyFinite;
}

function fnPickWalletMetricCcdeByPriority(pWalletRows, pPrimaryFields, pFallbackFields = []){
    const vPrimary = fnPickWalletMetricCCDE(pWalletRows, pPrimaryFields);
    if(Number.isFinite(vPrimary)){
        return vPrimary;
    }
    return fnPickWalletMetricCCDE(pWalletRows, pFallbackFields);
}

function fnExtractWalletRowsCCDE(pRespData){
    if(Array.isArray(pRespData?.result)){
        return pRespData.result;
    }
    if(Array.isArray(pRespData)){
        return pRespData;
    }
    return [];
}

function fnLoadLoginCreds(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    const objTgBotToken = document.getElementById("txtTelegramBotToken");
    const objTgChatId = document.getElementById("txtTelegramChatId");
    if(!objApiKey || !objApiSecret){
        return;
    }

    objApiKey.value = localStorage.getItem("CCDE_ApiKey") || "";
    objApiSecret.value = localStorage.getItem("CCDE_ApiSecret") || "";
    if(objTgBotToken){
        objTgBotToken.value = localStorage.getItem("CCDE_TgBotToken") || "";
    }
    if(objTgChatId){
        objTgChatId.value = localStorage.getItem("CCDE_TgChatId") || "";
    }
}

function fnPersistCoveredCallLoginCreds(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    const objTgBotToken = document.getElementById("txtTelegramBotToken");
    const objTgChatId = document.getElementById("txtTelegramChatId");

    if(objApiKey){
        localStorage.setItem("CCDE_ApiKey", String(objApiKey.value || "").trim());
    }
    if(objApiSecret){
        localStorage.setItem("CCDE_ApiSecret", String(objApiSecret.value || "").trim());
    }
    if(objTgBotToken){
        localStorage.setItem("CCDE_TgBotToken", String(objTgBotToken.value || "").trim());
    }
    if(objTgChatId){
        localStorage.setItem("CCDE_TgChatId", String(objTgChatId.value || "").trim());
    }
}

function fnBindCoveredCallLoginPersist(){
    const objApiKey = document.getElementById("txtUserAPIKey");
    const objApiSecret = document.getElementById("txtAPISecret");
    const objTgBotToken = document.getElementById("txtTelegramBotToken");
    const objTgChatId = document.getElementById("txtTelegramChatId");

    [objApiKey, objApiSecret, objTgBotToken, objTgChatId].forEach((objEl) => {
        if(!objEl || objEl.dataset.ccdePersistBound === "true"){
            return;
        }
        objEl.addEventListener("change", fnPersistCoveredCallLoginCreds);
        objEl.addEventListener("blur", fnPersistCoveredCallLoginCreds);
        objEl.dataset.ccdePersistBound = "true";
    });
}

function fnGetSetTraderLoginStatus(){
    let vTraderStatus = localStorage.getItem("lsCCDELoginValid");
    let objTraderStatus = document.getElementById("btnTraderStatus");
    if(!objTraderStatus){
        return;
    }

    if(vTraderStatus === "true"){
        if(typeof fnSafeSetButton === "function"){
            fnSafeSetButton(objTraderStatus.id, "badge bg-success", "Trader - Valid");
        }
        else{
            fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "Trader - Valid");
        }
    }
    else{
        if(typeof fnSafeSetButton === "function"){
            fnSafeSetButton(objTraderStatus.id, "badge bg-danger", "Trader - Invalid");
        }
        else{
            fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "Trader - Invalid");
        }
    }
}

function fnShowTraderLoginMdl(objThis){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");
    let bIsValid = localStorage.getItem("lsCCDELoginValid") === "true";

    if(bAppStatus === "false"){
        if(typeof fnSafeGenMessage === "function"){
            fnSafeGenMessage("First login to App for trading account login!", "badge bg-warning", "spnGenMsg");
        }
        else{
            fnGenMessage("First login to App for trading account login!", "badge bg-warning", "spnGenMsg");
        }
    }
    else if(!bIsValid){
        $("#mdlDeltaLogin").modal("show");
    }
    else{
        fnClearLoginStatus();
        if(typeof fnAppendCoveredCallLog === "function"){
            fnAppendCoveredCallLog("Trader disconnected and session cleared.");
        }
        if(typeof fnSafeGenMessage === "function"){
            fnSafeGenMessage("Trader disconnected successfully!", "badge bg-warning", "spnGenMsg");
        }
        else{
            fnGenMessage("Trader disconnected successfully!", "badge bg-warning", "spnGenMsg");
        }
    }
}

function fnFormatCoveredCallDeltaError(pResult, pFallback = "Login failed."){
    const vErrCode = String(pResult?.data?.response?.body?.error?.code || "").trim();
    const vClientIp = String(pResult?.data?.response?.body?.error?.context?.client_ip || "").trim();
    const vBaseMsg = String(pResult?.message || pFallback || "Login failed.").trim();

    if(vErrCode === "ip_not_whitelisted_for_api_key"){
        let vMsg = "Delta rejected this API login because the current IP is not whitelisted.";
        if(vClientIp){
            vMsg += " Whitelist this IP in Delta Exchange API settings: " + vClientIp + ".";
        }
        else{
            vMsg += " Please whitelist the current network IP in Delta Exchange API settings.";
        }
        return vMsg;
    }

    if(vErrCode){
        return vBaseMsg && vBaseMsg !== vErrCode
            ? vBaseMsg + " (" + vErrCode + ")"
            : vErrCode.replaceAll("_", " ");
    }

    return vBaseMsg || "Login failed.";
}

function fnValidateDeltaLogin(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");

    if(objApiKey.value === ""){
        objApiKey.focus();
        fnGenMessage("Please input API Key", "badge bg-warning", "spnDeltaLogin");
        return;
    }
    if(objApiSecret.value === ""){
        objApiSecret.focus();
        fnGenMessage("Please input API Secret", "badge bg-warning", "spnDeltaLogin");
        return;
    }

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        ApiKey: objApiKey.value,
        ApiSecret: objApiSecret.value
    });

    fetch("/coveredCallDE/validateLogin", {
        method: "POST",
        headers: vHeaders,
        body: vAction,
        redirect: "follow"
    })
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            const objWalletRows = fnExtractWalletRowsCCDE(objResult.data);
            const vWalletUsd = fnPickWalletMetricCcdeByPriority(objWalletRows, ["available_balance"], ["balance", "wallet_balance"]);
            const vWalletInr = fnPickWalletMetricCcdeByPriority(objWalletRows, ["available_balance_inr"], ["balance_inr", "wallet_balance_inr"]);
            const vTotalMargin = fnPickWalletMetricCcdeByPriority(objWalletRows, ["total_margin"], ["total_margin_inr", "balance", "wallet_balance"]);
            const vBlockedMargin = fnPickWalletMetricCcdeByPriority(objWalletRows, ["blocked_margin"], ["blocked_margin_inr"]);
            const vAvailableMargin = fnPickWalletMetricCcdeByPriority(objWalletRows, ["available_balance"], ["available_balance_inr", "balance", "wallet_balance"]);

            localStorage.setItem("CCDE_ApiKey", objApiKey.value);
            localStorage.setItem("CCDE_ApiSecret", objApiSecret.value);
            localStorage.setItem("CCDE_TgBotToken", String(objTgBotToken?.value || "").trim());
            localStorage.setItem("CCDE_TgChatId", String(objTgChatId?.value || "").trim());
            localStorage.setItem("lsCCDELoginValid", "true");
            fnCCDESetStorage("WalletUsd", Number.isFinite(vWalletUsd) ? String(vWalletUsd) : "");
            fnCCDESetStorage("WalletInr", Number.isFinite(vWalletInr) ? String(vWalletInr) : "");
            fnCCDESetStorage("TotalMargin", Number.isFinite(vTotalMargin) ? String(vTotalMargin) : "");
            fnCCDESetStorage("BlockedMargin", Number.isFinite(vBlockedMargin) ? String(vBlockedMargin) : "0");
            fnCCDESetStorage("AvailableMargin", Number.isFinite(vAvailableMargin) ? String(vAvailableMargin) : "");

            $("#mdlDeltaLogin").modal("hide");
            if(typeof fnSafeGenMessage === "function"){
                fnSafeGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnSafeGenMessage("Please Input Login Details", "badge bg-primary", "spnDeltaLogin");
            }
            else{
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnGenMessage("Please Input Login Details", "badge bg-primary", "spnDeltaLogin");
            }
            fnGetSetTraderLoginStatus();
            if(typeof fnRefreshCoveredCallShell === "function"){
                fnRefreshCoveredCallShell();
            }
            if(typeof fnAppendCoveredCallLog === "function"){
                fnAppendCoveredCallLog("Trader login validated. Wallet snapshot loaded into shell.");
            }
        }
        else if(objResult.status === "danger"){
            fnClearLoginStatus();
            const vErrMsg = fnFormatCoveredCallDeltaError(objResult, "Login failed.");
            if(typeof fnSafeGenMessage === "function"){
                fnSafeGenMessage(vErrMsg, `badge bg-${objResult.status}`, "spnDeltaLogin");
            }
            else{
                fnGenMessage(vErrMsg, `badge bg-${objResult.status}`, "spnDeltaLogin");
            }
        }
        else{
            fnClearLoginStatus();
            if(typeof fnSafeGenMessage === "function"){
                fnSafeGenMessage(objResult.message || "Error in login.", `badge bg-${objResult.status || "warning"}`, "spnDeltaLogin");
            }
            else{
                fnGenMessage(objResult.message || "Error in login.", `badge bg-${objResult.status || "warning"}`, "spnDeltaLogin");
            }
        }
    })
    .catch(() => {
        fnClearLoginStatus();
        if(typeof fnSafeGenMessage === "function"){
            fnSafeGenMessage("Error to fetch with login details.", "badge bg-danger", "spnDeltaLogin");
        }
        else{
            fnGenMessage("Error to fetch with login details.", "badge bg-danger", "spnDeltaLogin");
        }
    });
}

function fnClearLoginStatus(){
    localStorage.removeItem("lsCCDELoginValid");
    localStorage.removeItem("isCCDEAutoTrader");
    fnCCDESetStorage("WalletUsd", "");
    fnCCDESetStorage("WalletInr", "");
    fnCCDESetStorage("TotalMargin", "");
    fnCCDESetStorage("BlockedMargin", "0");
    fnCCDESetStorage("AvailableMargin", "");
    fnGetSetTraderLoginStatus();
    if(typeof fnGetSetAutoTraderStatus === "function"){
        fnGetSetAutoTraderStatus();
    }
    if(typeof fnRefreshCoveredCallShell === "function"){
        fnRefreshCoveredCallShell();
    }
}

window.addEventListener("DOMContentLoaded", function(){
    fnLoadLoginCreds();
    fnBindCoveredCallLoginPersist();
    fnGetSetTraderLoginStatus();
});
