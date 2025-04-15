
function fnShowTraderLoginMdl(objThis){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    if(bAppStatus === "false"){
        //$('#mdlAppLogin').modal('show');
        fnGenMessage("First Login to App for Trading Account Login!", `badge bg-warning`, "spnGenMsg");
        // fnGetSetAllStatus();
    }
    else if(objThis.className === "badge bg-danger"){
        $('#mdlDeltaLogin').modal('show');
        // fnGetSetAllStatus();
    }
    else{
        // fnClearPrevTraderSession();
        // fnGetSetTraderLoginStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnToggleAutoTrader(){
    let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isLsAutoTrader = localStorage.getItem("isDelAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(bAppStatus){
        if(isLsAutoTrader === null || isLsAutoTrader === "false"){
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isDelAutoTrader", true);
        }
        else{
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
            fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
            localStorage.setItem("isDelAutoTrader", false);
        }
    }
    else{
        fnGenMessage("Login to Account to Start Auto Trading!", `badge bg-warning`, "spnGenMsg");
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
