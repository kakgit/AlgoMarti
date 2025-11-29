
function fnLoadLoginCred(){
    // alert(localStorage.getItem("lsApiKeyDFL"));
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let vApiKey = JSON.parse(localStorage.getItem("lsApiKeyDFL"));
    let vApiSecret = JSON.parse(localStorage.getItem("lsApiSecretDFL"));

    if(vApiKey === null || vApiKey === ""){
        objApiKey.value = "";
        objApiSecret.value = "";
    }
    else{
        objApiKey.value = vApiKey;
        objApiSecret.value = vApiSecret;        
    }
}

function fnGetSetTraderLoginStatus(){
    let vTraderStatus = localStorage.getItem("lsLoginValidDFL");
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

        fetch("/deltaSStraddleDemo/validateLogin", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                // console.log(objResult.data);
                localStorage.setItem("lsApiKeyDFL", JSON.stringify(objApiKey.value));
                localStorage.setItem("lsApiSecretDFL", JSON.stringify(objApiSecret.value));

                let objBalances = { Acc1BalINR: objResult.data[0].available_balance_inr, Acc1BalUSD: objResult.data[0].available_balance };
                document.getElementById("spnBal1").innerText = (parseFloat(objBalances.Acc1BalUSD)).toFixed(2);

                localStorage.setItem("DeltaNetLimit", JSON.stringify(objBalances));
                console.log(localStorage.getItem("DeltaNetLimit"));

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsLoginValidDFL", "true");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
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

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDFL");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoTraderDFL", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isAutoTraderDFL", "false");
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDFL");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTraderDFL", "false");
    }
}

function fnClearLoginStatus(){
    localStorage.removeItem("lsLoginValidDFL");
    localStorage.removeItem("isAutoTraderDFL");

    fnGetSetTraderLoginStatus();
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTraderDFL");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTraderDFL", "false");
    }
}
