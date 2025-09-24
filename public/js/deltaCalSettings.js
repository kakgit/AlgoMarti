


function fnShowTraderLoginMdl(objThis){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

    if(bAppStatus === false){
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

function fnClearLoginStatus(){
    localStorage.removeItem("lsDeltaCalLoginValid");
    localStorage.removeItem("isDeltaCalAutoTrader");

    fnGetSetTraderLoginStatus();
}

function fnGetSetTraderLoginStatus(){
    let vTraderStatus = JSON.parse(localStorage.getItem("lsDeltaCalLoginValid"));
    let objTraderStatus = document.getElementById("btnTraderStatus");

    if(vTraderStatus){
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "Trader - Valid");
    }
    else{
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "Trader - Invalid");
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = JSON.parse(localStorage.getItem("isDeltaCalAutoTrader"));
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader)
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isDeltaCalAutoTrader", "false");
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

        fetch("/deltaExcFut/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                console.log(objResult.data);
                localStorage.setItem("lsDeltaApiKey", objApiKey.value);
                localStorage.setItem("lsDeltaApiSecret", objApiSecret.value);

                let objBalances = { BalanceINR: objResult.data.result[0].available_balance_inr, BalanceUSD: objResult.data.result[0].available_balance };
                localStorage.setItem("DeltaNetLimit", JSON.stringify(objBalances));
                console.log(localStorage.getItem("DeltaNetLimit"));

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsDeltaCalLoginValid", "true");
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
	                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else{
                    fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnDeltaLogin");
                    fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
                }
            }
            else if(objResult.status === "warning"){
                fnClearLoginStatus();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnDeltaLogin");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
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

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = JSON.parse(localStorage.getItem("isDeltaCalAutoTrader"));
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === false){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isDeltaCalAutoTrader", true);
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isDeltaCalAutoTrader", false);
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}
