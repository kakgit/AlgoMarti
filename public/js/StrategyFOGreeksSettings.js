
function fnLoadLoginCred(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");
    let vApiKey = JSON.parse(localStorage.getItem("lsApiKeyDSSDV2"));
    let vApiSecret = JSON.parse(localStorage.getItem("lsApiSecretDSSDV2"));
    let vTgBotToken = JSON.parse(localStorage.getItem("lsTgBotTokenDSSDV2"));
    let vTgChatId = JSON.parse(localStorage.getItem("lsTgChatIdDSSDV2"));

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
    let vTraderStatus = localStorage.getItem("lsLoginValidDSSDV2");
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

        fetch("/strategyfogreeks/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                // console.log(objResult.data);
                localStorage.setItem("lsApiKeyDSSDV2", JSON.stringify(objApiKey.value));
                localStorage.setItem("lsApiSecretDSSDV2", JSON.stringify(objApiSecret.value));
                localStorage.setItem("lsTgBotTokenDSSDV2", JSON.stringify(objTgBotToken?.value || ""));
                localStorage.setItem("lsTgChatIdDSSDV2", JSON.stringify(objTgChatId?.value || ""));

                // let objBalances = { Acc1BalINR: objResult.data[0].available_balance_inr, Acc1BalUSD: objResult.data[0].available_balance };
                // document.getElementById("spnBal1").innerText = (parseFloat(objBalances.Acc1BalUSD)).toFixed(2);

                // localStorage.setItem("NetLimitDSSDV2", JSON.stringify(objBalances));
                // console.log(localStorage.getItem("NetLimitDSSDV2"));

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsLoginValidDSSDV2", "true");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnGetSetTraderLoginStatus();
            }
            else if(objResult.status === "danger"){
                fnClearLoginStatus();
                let objErr = fnParseDeltaLoginError(objResult.data);
                if(objErr.code === "ip_not_whitelisted_for_api_key"){
                    let vIPMsg = objErr.clientIp ? (" IP: " + objErr.clientIp) : " IP not available in response.";
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
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnDeltaLogin");
        });
    }
}

function fnParseDeltaLoginError(pErrData){
    let objPayload = pErrData;
    let vCode = "";
    let vClientIP = "";

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
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSDV2");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoTraderDSSDV2", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isAutoTraderDSSDV2", "false");
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSDV2");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTraderDSSDV2", "false");
    }
}

function fnClearLoginStatus(){
    localStorage.removeItem("lsLoginValidDSSDV2");
    localStorage.removeItem("isAutoTraderDSSDV2");

    fnGetSetTraderLoginStatus();
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSDV2");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTraderDSSDV2", "false");
    }
}

