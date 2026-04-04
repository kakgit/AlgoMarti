
function fnGetSetTraderLoginStatus(){
    let vTraderStatus = localStorage.getItem("lsHLFSDLoginValid");
    let objTraderStatus = document.getElementById("btnTraderStatus");
    let lsPrevSessionDate = localStorage.getItem("lsHLFSDLoginDate");

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

        fetch("/hlFutSclprDemo/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                console.log(objResult.data);

                let objBalances = { BalanceINR: objResult.data.result[0].available_balance_inr, BalanceUSD: objResult.data.result[0].available_balance };
                localStorage.setItem("HLFSD_NetLimit", JSON.stringify(objBalances));
                console.log(localStorage.getItem("HLFSD_NetLimit"));
                localStorage.setItem("lsTgBotTokenHLFSD", JSON.stringify(objTgBotToken?.value || ""));
                localStorage.setItem("lsTgChatIdHLFSD", JSON.stringify(objTgChatId?.value || ""));

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsHLFSDLoginDate", vToday);

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsHLFSDLoginValid", "true");
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

window.addEventListener("DOMContentLoaded", function(){
    let objTgBotToken = document.getElementById("txtTelegramBotToken");
    let objTgChatId = document.getElementById("txtTelegramChatId");
    let vTgBotToken = JSON.parse(localStorage.getItem("lsTgBotTokenHLFSD") || "null");
    let vTgChatId = JSON.parse(localStorage.getItem("lsTgChatIdHLFSD") || "null");

    if(objTgBotToken){
        objTgBotToken.value = vTgBotToken || "";
    }
    if(objTgChatId){
        objTgChatId.value = vTgChatId || "";
    }
});

function fnChangeLater(){
    $('#mdlDeltaLogin').modal('show');
}

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isHLFSDAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isHLFSDAutoTrader", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isHLFSDAutoTrader", "false");
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isHLFSDAutoTrader");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isHLFSDAutoTrader", "false");
    }
}

function fnClearLoginStatus(){
    localStorage.removeItem("lsHLFSDLoginValid");
    localStorage.removeItem("isHLFSDAutoTrader");

    fnGetSetTraderLoginStatus();
}

function fnClearPrevLoginSession(){
    //let objSession = document.getElementById("txtKotakSession");
    gIsTraderLogin = false;
    localStorage.removeItem("lsHLFSDLoginDate");
    localStorage.removeItem("isHLFSDAutoTrader");
    localStorage.removeItem("lsHLFSDLoginValid");
    localStorage.removeItem("HLFSD_NetLimit");

  //objSession.value = "";
  //fnChangeBtnProps("btnTraderStatus", "badge bg-danger", "Trader - Disconnected");
}


