

function fnLoadLoginCred(){
    let objApiKey = document.getElementById("txtDeltaAPIKey");
    let objApiSecret = document.getElementById("txtDeltaSecret");
    let vApiKey = JSON.parse(localStorage.getItem("lsApiKeyCF"));
    let vSecretCode = JSON.parse(localStorage.getItem("lsSecretCF"));

    if(vApiKey === null || vApiKey === ""){
        objApiKey.value = "";
        objApiSecret.value = "";
    }
    else{
        objApiKey.value = vApiKey;
        objApiSecret.value = vSecretCode;        
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

function fnGetSetTraderLoginStatus(){
    let vTraderStatus = localStorage.getItem("lsLoginValidCF");
    let objTraderStatus = document.getElementById("btnTraderStatus");

// alert(vTraderStatus)
    if(vTraderStatus === "true"){
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "Trader - Valid");
    }
    else{
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "Trader - Invalid");
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
    }
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTraderCF");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTraderCF", "false");
    }
}

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isAutoTraderCF");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoTraderCF", "true");
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isAutoTraderCF", "false");
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnCheckDeltaCred(){
    let objApiKey = document.getElementById("txtDeltaAPIKey");
    let objSecretCode = document.getElementById("txtDeltaSecret");

    if(objApiKey.value === ""){
        objApiKey.focus();
        fnGenMessage("Please input API Key", `badge bg-warning`, "spnLoginMsgs");
    }
    else if(objSecretCode.value === ""){
        objSecretCode.focus();
        fnGenMessage("Please input Secret Code", `badge bg-warning`, "spnLoginMsgs");
    }
    else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "SecretCode" : objSecretCode.value
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/execCryptoFunding/DeltaCredValidate", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                console.log(objResult.data);
                localStorage.setItem("lsApiKeyCF", JSON.stringify(objApiKey.value));
                localStorage.setItem("lsSecretCF", JSON.stringify(objSecretCode.value));

                let objBalances = { Acc1BalINR: objResult.data[0].available_balance_inr, Acc1BalUSD: objResult.data[0].available_balance };
                // document.getElementById("spnBal1").innerText = (parseFloat(objBalances.Acc1BalUSD)).toFixed(2);

                localStorage.setItem("DeltaNetLimit", JSON.stringify(objBalances));
                console.log(localStorage.getItem("DeltaNetLimit"));

                $('#mdlDeltaLogin').modal('hide');
                localStorage.setItem("lsLoginValidCF", "true");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                fnGetSetTraderLoginStatus();
                fnGetSetAutoTraderStatus();
            }
            else if(objResult.status === "danger"){
                fnClearLoginStatus();
                //ip_not_whitelisted_for_api_key
                //invalid_api_key
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnLoginMsgs");
                }
                else{
                    fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnLoginMsgs");
                }
            }
            else if(objResult.status === "warning"){
                fnClearLoginStatus();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnLoginMsgs");
            }
            else{
                fnClearLoginStatus();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnLoginMsgs");
            }
        })
        .catch(error => {
            fnClearLoginStatus();
            //console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnLoginMsgs");
        });
    }
}

function fnCheckCoinDCXCred(){

}




function fnClearLoginStatus(){
    // localStorage.removeItem("lsApiKeyDFL");
    // localStorage.removeItem("lsApiSecretDFL");
    localStorage.removeItem("lsLoginValidCF");
    localStorage.removeItem("isAutoTraderCF");

    fnGetSetTraderLoginStatus();
}
