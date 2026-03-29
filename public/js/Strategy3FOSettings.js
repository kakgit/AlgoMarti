
function fnLoadLoginCred(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");
    let vApiKey = JSON.parse(localStorage.getItem("lsApiKeyDSS3FO"));
    let vApiSecret = JSON.parse(localStorage.getItem("lsApiSecretDSS3FO"));
    let vTgBotToken = JSON.parse(localStorage.getItem("lsTgBotTokenDSS3FO"));
    let vTgChatId = JSON.parse(localStorage.getItem("lsTgChatIdDSS3FO"));

    if(vApiKey === null || vApiKey === ""){
        objApiKey.value = "";
        objApiSecret.value = "";
    }
    else{
        objApiKey.value = vApiKey;
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
    let vTraderStatus = localStorage.getItem("lsLoginValidDSS3FO");
    let objTraderStatus = document.getElementById("btnTraderStatus");

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
            "ApiSecret" : objApiSecret.value
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/strategy3fo/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                // console.log(objResult.data);
                localStorage.setItem("lsApiKeyDSS3FO", JSON.stringify(objApiKey.value));
                localStorage.setItem("lsApiSecretDSS3FO", JSON.stringify(objApiSecret.value));
                localStorage.setItem("lsTgBotTokenDSS3FO", JSON.stringify(objTgBotToken?.value || ""));
                localStorage.setItem("lsTgChatIdDSS3FO", JSON.stringify(objTgChatId?.value || ""));
                localStorage.removeItem("DFL_SUPPRESS_STREAM_MSG");

                // let objBalances = { Acc1BalINR: objResult.data[0].available_balance_inr, Acc1BalUSD: objResult.data[0].available_balance };
                // document.getElementById("spnBal1").innerText = (parseFloat(objBalances.Acc1BalUSD)).toFixed(2);

                // localStorage.setItem("NetLimitDSS3FO", JSON.stringify(objBalances));
                // console.log(localStorage.getItem("NetLimitDSS3FO"));

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsLoginValidDSS3FO", "true");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnGetSetTraderLoginStatus();
            }
            else if(objResult.status === "danger"){
                fnClearLoginStatus();
                let objErr = fnParseDeltaLoginError(objResult.data);
                if(objErr.code === "ip_not_whitelisted_for_api_key"){
                    let vIPMsg = objErr.clientIp ? (" IP: " + objErr.clientIp) : " IP not available in response.";
                    localStorage.setItem("DFL_SUPPRESS_STREAM_MSG", "true");
                    fnGenMessage(objErr.code + vIPMsg, `badge bg-${objResult.status}`, "spnDeltaLogin");
                }
                else if(objErr.code){
                    fnGenMessage(objErr.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnDeltaLogin");
                }                
                else{
                    fnGenMessage(objResult.message || "Error in Login, Contact Admin.", `badge bg-${objResult.status}`, "spnDeltaLogin");
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
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnDeltaLogin");
        });
    }
}

function fnParseDeltaLoginError(pErrData){
    let objPayload = pErrData;
    let vCode = "";
    let vClientIP = "";

    // Some Delta SDK errors come as JSON text in response.text
    if(objPayload?.response?.text && typeof objPayload.response.text === "string"){
        try{
            objPayload = JSON.parse(objPayload.response.text);
        }
        catch(objErr){
            // keep original payload
        }
    }

    if(typeof objPayload === "string"){
        try{
            objPayload = JSON.parse(objPayload);
        }
        catch(objErr){
            objPayload = { message: objPayload };
        }
    }

    let objErrNode = objPayload?.response?.body?.error || objPayload?.error || null;
    vCode = objErrNode?.code || objPayload?.code || "";
    vClientIP = objErrNode?.context?.client_ip || objPayload?.context?.client_ip || "";

    return { code: vCode, clientIp: vClientIP };
}

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDSS3FO");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoTraderDSS3FO", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isAutoTraderDSS3FO", "false");
            fnAbortPendingFutOrders();
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnClearLoginStatus(){
    fnAbortPendingFutOrders();
    localStorage.removeItem("lsLoginValidDSS3FO");
    localStorage.removeItem("isAutoTraderDSS3FO");
    localStorage.removeItem("DFL_SUPPRESS_STREAM_MSG");

    fnGetSetTraderLoginStatus();
}

function fnAbortPendingFutOrders(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let vApiKey = objApiKey?.value || "";
    let vApiSecret = objApiSecret?.value || "";

    if(!vApiKey || !vApiSecret){
        return;
    }

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ApiKey": vApiKey
    });

    let requestOptions = {
        method: "POST",
        headers: vHeaders,
        body: vAction,
        redirect: "follow"
    };

    fetch("/strategy3fo/abortPendingFutOrders", requestOptions)
    .catch(() => {
        // silent abort helper
    });
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDSS3FO");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTraderDSS3FO", "false");
    }
}


