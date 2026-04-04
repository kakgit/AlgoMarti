
function fnPickWalletMetric(pWalletRows, pFieldList){
    if(!Array.isArray(pWalletRows) || pWalletRows.length === 0){
        return NaN;
    }

    let vAnyFinite = NaN;
    for(let i=0; i<pWalletRows.length; i++){
        let objRow = pWalletRows[i] || {};
        for(let j=0; j<pFieldList.length; j++){
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

function fnExtractWalletRows(pRespData){
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

    const vApiKey = localStorage.getItem("DFSL_ApiKey");
    const vApiSecret = localStorage.getItem("DFSL_ApiSecret");
    const vTgBotToken = localStorage.getItem("DFSL_TgBotToken");
    const vTgChatId = localStorage.getItem("DFSL_TgChatId");
    if(vApiKey){
        objApiKey.value = vApiKey;
    }
    if(vApiSecret){
        objApiSecret.value = vApiSecret;
    }
    if(objTgBotToken){
        objTgBotToken.value = vTgBotToken || "";
    }
    if(objTgChatId){
        objTgChatId.value = vTgChatId || "";
    }
}

function fnGetSetTraderLoginStatus(){
    let vTraderStatus = localStorage.getItem("lsDFSLLoginValid");
    let objTraderStatus = document.getElementById("btnTraderStatus");
    let lsPrevSessionDate = localStorage.getItem("lsDFSLLoginDate");

    if(vTraderStatus === "true"){
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "Trader - Valid");
    }
    else{
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "Trader - Invalid");
    }
}

function fnShowTraderLoginMdl(objThis){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    if(bAppStatus === "false"){
        fnGenMessage("First Login to App for Trading Account Login!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objThis.className === "badge bg-danger"){
        $('#mdlDeltaLogin').modal('show');
    }
    else{
        fnClearLoginStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnValidateDeltaLogin(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");

    if(objApiKey.value === ""){
        objApiKey.focus();
        fnGenMessage("Please input API Key", `badge bg-warning`, "spnDeltaLogin");
    }
    else if(objApiSecret.value === ""){
        objApiSecret.focus();
        fnGenMessage("Please input API Secret", `badge bg-warning`, "spnDeltaLogin");
    }
    else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value,
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExcFutR/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                console.log(objResult.data);

                const objWalletRows = fnExtractWalletRows(objResult.data);
                let objBalances = {
                    BalanceINR: fnPickWalletMetric(objWalletRows, ["available_balance_inr", "balance_inr", "wallet_balance_inr"]),
                    BalanceUSD: fnPickWalletMetric(objWalletRows, ["available_balance", "balance", "wallet_balance"])
                };
                localStorage.setItem("DFSL_NetLimit", JSON.stringify(objBalances));
                localStorage.setItem("DFSL_ApiKey", objApiKey.value);
                localStorage.setItem("DFSL_ApiSecret", objApiSecret.value);
                localStorage.setItem("DFSL_TgBotToken", String(objTgBotToken?.value || "").trim());
                localStorage.setItem("DFSL_TgChatId", String(objTgChatId?.value || "").trim());
                console.log(localStorage.getItem("DFSL_NetLimit"));
                if(typeof fnLoadNetLimits === "function"){
                    fnLoadNetLimits();
                }
                if(typeof fnRefreshClosedPositionsFromExchange === "function"){
                    fnRefreshClosedPositionsFromExchange();
                }

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsDFSLLoginDate", vToday);

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsDFSLLoginValid", "true");
                objApiSecret.value = "";
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnGenMessage("Please Input Login Details", `badge bg-primary`, "spnDeltaLogin");
                fnGetSetTraderLoginStatus();
            }
            else if(objResult.status === "danger"){
                fnClearLoginStatus();
                //ip_not_whitelisted_for_api_key
                //invalid_api_key
                const vErrCode = objResult?.data?.response?.body?.error?.code || "";
                const vClientIp = objResult?.data?.response?.body?.error?.context?.client_ip || "";
                if(vErrCode === "ip_not_whitelisted_for_api_key"){
                    fnGenMessage(vErrCode + " IP: " + vClientIp, `badge bg-${objResult.status}`, "spnDeltaLogin");
                }
                else{
                    fnGenMessage((vErrCode || "Login failed") + " Contact Admin!", `badge bg-${objResult.status}`, "spnDeltaLogin");
                }
            }
            else if(objResult.status === "warning"){
                fnClearLoginStatus();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnDeltaLogin");
            }
            else{
                fnClearLoginStatus();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnDeltaLogin");
            }
        })
        .catch(error => {
            fnClearLoginStatus();
            //console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnDeltaLogin");
        });
    }
}

function fnChangeLater(){
    $('#mdlDeltaLogin').modal('show');
}

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isDFSLAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isDFSLAutoTrader", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isDFSLAutoTrader", "false");
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isDFSLAutoTrader");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isDFSLAutoTrader", "false");
    }
}

function fnClearLoginStatus(){
    localStorage.removeItem("lsDFSLLoginValid");
    localStorage.removeItem("isDFSLAutoTrader");
    localStorage.removeItem("DFSL_NetLimit");
    localStorage.removeItem("DFSL_ApiKey");
    localStorage.removeItem("DFSL_ApiSecret");

    fnGetSetTraderLoginStatus();
    if(typeof fnLoadNetLimits === "function"){
        fnLoadNetLimits();
    }
}

function fnClearPrevLoginSession(){
    //let objSession = document.getElementById("txtKotakSession");
    gIsTraderLogin = false;
    localStorage.removeItem("lsDFSLLoginDate");
    localStorage.removeItem("isDFSLAutoTrader");
    localStorage.removeItem("lsDFSLLoginValid");
    localStorage.removeItem("DFSL_NetLimit");
    localStorage.removeItem("DFSL_ApiKey");
    localStorage.removeItem("DFSL_ApiSecret");
    if(typeof fnLoadNetLimits === "function"){
        fnLoadNetLimits();
    }

  //objSession.value = "";
  //fnChangeBtnProps("btnTraderStatus", "badge bg-danger", "Trader - Disconnected");
}

