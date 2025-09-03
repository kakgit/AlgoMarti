
function fnShowAdminAccessories(){
    let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));


    if((objAppCred !== null) && (objAppCred.IsAdmin)){
        document.getElementById("cardManualTrader").style.display = "block";
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

        fetch("/deltaExc/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                console.log(objResult.data);
                localStorage.setItem("lsDeltaApiKey", objApiKey.value);
                localStorage.setItem("lsDeltaApiSecret", objApiSecret.value);

                let objBalances = { BalanceINR: objResult.data.result[0].available_balance_inr, BalanceUSD: objResult.data.result[0].available_balance };
                localStorage.setItem("DeltaNetLimit", JSON.stringify(objBalances));
                console.log(localStorage.getItem("DeltaNetLimit"));

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsDeltaLoginDate", vToday);

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsDeltaLoginValid", "true");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnGenMessage("Please Input Login Details", `badge bg-primary`, "spnDeltaLogin");
                fnGetSetTraderLoginStatus();
            }
            else if(objResult.status === "danger"){
                fnClearLoginStatus();
                //ip_not_whitelisted_for_api_key
                //invalid_api_key
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnDeltaLogin");
                }
                else{
                    fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnDeltaLogin");
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

function fnGetSetTraderLoginStatus(){

    let vTraderStatus = localStorage.getItem("lsDeltaLoginValid");
    let objTraderStatus = document.getElementById("btnTraderStatus");
    let lsPrevSessionDate = localStorage.getItem("lsLoginDate");

    if((vTraderStatus === "true")){
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "Trader - Valid");
    }
    else{
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "Trader - Invalid");
    }
}

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isDeltaAutoTrader", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isDeltaAutoTrader", "false");
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnToggleRealTrade(){
    let isLsRealTrader = localStorage.getItem("isDeltaRealTrade");

    let objRealTraderStatus = document.getElementById("btnRealTradeStatus");

    if(isLsRealTrader === null || isLsRealTrader === "true"){
        fnChangeBtnProps(objRealTraderStatus.id, "badge bg-warning", "Paper Trade - ON");
        fnGenMessage("Paper Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("isDeltaRealTrade", "false");
        $('#btnTabClsdPaperTrds').trigger('click');

}
    else{
        fnChangeBtnProps(objRealTraderStatus.id, "badge bg-success", "Real Trade - ON");
        fnGenMessage("Real Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("isDeltaRealTrade", "true");
        $('#btnTabClsdRealTrds').trigger('click');
    }
}

function fnSetCurrTraderTab(pTabType){
    if(pTabType === "futures"){
        localStorage.setItem("DelTraderTab", "futures");
    }
    else{
        localStorage.setItem("DelTraderTab", "options");        
    }
}

function fnSetDefaultTraderTab(){
    let vTraderTab = localStorage.getItem("DelTraderTab");

    if(vTraderTab === "futures"){
        $('#btnTabFutures').trigger('click');
    }
    else{
        $('#btnTabOptions').trigger('click');
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isDeltaAutoTrader", "false");
    }
}

function fnGetSetRealTradeStatus(){
    let isLsRealTrader = localStorage.getItem("isDeltaRealTrade");
    let objRealTraderStatus = document.getElementById("btnRealTradeStatus");

    if(isLsRealTrader === "true")
    {
        fnChangeBtnProps(objRealTraderStatus.id, "badge bg-success", "Real Trade - ON");
        $('#btnTabClsdRealTrds').trigger('click');
    }
    else
    {
        fnChangeBtnProps(objRealTraderStatus.id, "badge bg-warning", "Paper Trade - ON");
        localStorage.setItem("isDeltaRealTrade", "false");
        $('#btnTabClsdPaperTrds').trigger('click');
    }
}

function fnClearLoginStatus(){
  localStorage.removeItem("lsDeltaLoginValid");
  localStorage.removeItem("isDeltaAutoTrader");

  fnGetSetTraderLoginStatus();
}