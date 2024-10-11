
window.addEventListener("DOMContentLoaded", function(){

    getSymbolsDataFile();

    fnGetSymbolList();

    fnGetSetAppStatus();
    fnGetSetTraderLoginStatus();
    fnGetSetAutoTraderStatus();
    fnGetSetOptionStrike();
});

function fnGetSetAppStatus(){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");
    let objLoginTxt = document.getElementById("lblAppLoginTxt");

    //var objAppStatus = document.getElementById("spnAppStatus");

    //console.log("Res: " + bAppStatus)
    if (bAppStatus === "true") {
        objLoginTxt.innerText = "LOGOUT";
        fnGenMessage("App is Logged In!", `badge bg-success`, "spnGenMsg");

        // objCUserID.value = JSON.parse(vSamUserID);
        // objApiKey.value = JSON.parse(vApiKey);
    }
    else {
        objLoginTxt.innerText = "LOGIN";
        fnGenMessage("App is Not Logged In!", `badge bg-warning`, "spnGenMsg");
        $('#mdlAppLogin').modal('show');
    }

    fnGetSetTraderLoginStatus();
    fnGetSetAutoTraderStatus();
    //copy code and Activate Later
    ////fnLoadDefaultSLTP();
    //copy code and Activate Later
    fnSetLotsByQtyMulLossAmt();
    //copy code and Activate Later
    ////fnLoadTimerSwitchSetting();
    fnSetDefaultLotNos();
}

function fnSetDefaultLotNos(){
    let vStartLots = localStorage.getItem("RealStartLotNo");
    let objTxtLots = document.getElementById("txtStartLotNos");

    if(vStartLots === null || vStartLots === "" || vStartLots === "0"){
        localStorage.setItem("RealStartLotNo", 1);
        objTxtLots.value = 1;
        alert(vStartLots);
    }
}

function fnSetLotsByQtyMulLossAmt()
{
    let vQtyMul = localStorage.getItem("RealQtyMul");
    let objLots = document.getElementById("txtManualLots");
    let vTotLossAmt = localStorage.getItem("RealTotLossAmt");

    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("RealQtyMul", 1);
        objLots.value = 1;
    }
    else {
        objLots.value = vQtyMul;
    }
    
    if (vTotLossAmt == null || vTotLossAmt == "") {
        localStorage.setItem("RealQtyMul", 1);
        localStorage.setItem("RealTotLossAmt", 0);
        objLots.value = 1;
    }
    else {
        objLots.value = vQtyMul;
    }
}

function fnTestJsFunc(){
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objStrikeOption = document.getElementById("ddlOptionStrike");

    let vDecrVal = parseInt(objStrikeInterval.value) * (-10);
    let vDDLVal = [];

    objStrikeOption.innerHTML = "";

    for(i=-10; i<=10; i++){
        vDDLVal.push(vDecrVal);
        vDecrVal = vDecrVal + parseInt(objStrikeInterval.value);

        objStrikeOption.innerHTML += "<option value=\"" + i + "\">" + i + "</option>";
    }
    //alert(vStartInterval);
    console.log(vDDLVal);
}

async function fnInitiateBuyManualRealTrade(pCEorPE)
{
    let objCurrPosiLst = localStorage.getItem("RealCurrPositionS");

    //check if any position is Open. Only One Open trade is allowed here.
    if (objCurrPosiLst === null)
    {
        fnExecManualRealTrade(pCEorPE);
    }
    else
    {
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnExecManualRealTrade(pDirec){
    let objManualStrike = document.getElementById("txtManualStrike");
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");
    let objSymbol = document.getElementById("ddlManualSymbol");
    let objExpiry = document.getElementById("ddlManualExpiry");
    let objExchange = document.getElementById("hidExchange");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objActualStrikePrice = document.getElementById("txtActualStrike");
    let objSelToken = document.getElementById("hidToken");
    let objManualQty = document.getElementById("txtManualBuyQty");
    let objManualLots = document.getElementById("txtManualLots");
    let objManualTradePrice = document.getElementById("txtManualTradePrice");
    let objManualStopLoss = document.getElementById("txtManualStopLoss");
    let objManualTakeProfit = document.getElementById("txtManualTakeProfit");
    let objDateToTime = document.getElementById("txtDateToTime");
    let objContract = document.getElementById("hidContract");
    let objSource = document.getElementById("ddlManualSource");
    let objTradeToken = document.getElementById("hidTradeToken");
    let objDDLStrikeOption = document.getElementById("ddlOptionStrike");

    if(objSession.value === "")
    {
        fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objSymbol.value === "")
    {
        fnGenMessage("Please Select Symbol to Trade!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objExpiry.value === "")
    {
        fnGenMessage("Please Select Expiry to Trade!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objManualQty.value === "")
    {
        fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objManualLots.value === "")
    {
        fnGenMessage("Please Input Valid No Of Lots!", `badge bg-danger`, "spnGenMsg");
    }
    else
    {
        let vStartLotNo = localStorage.getItem("RealStartLotNo");
        let vStrikeOption = parseInt(objDDLStrikeOption.value) * parseInt(objStrikeInterval.value);

        if(pDirec === "PE"){
            vStrikeOption = -(vStrikeOption);
        }

        if(parseInt(objManualLots.value) === 1){
            objManualLots.value = vStartLotNo;
            localStorage.setItem("RealQtyMul", vStartLotNo);
        }
        let vQtyToTrade = parseInt(objManualLots.value) * parseInt(objManualQty.value);

        //Execute the trade based on Buy on CE or PE
        let objDate = new Date(objExpiry.value);
        let vDate = new Date();

        objDateToTime.value = objDate.getTime();
        let vRandId = vDate.valueOf();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ ActualStrikeRate: objActualStrikePrice.value, CurrStrikeRate: objManualStrike.value, StrikeOption: vStrikeOption, ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value, BorS: "buy", CorP: pDirec, Contract: objContract.value, Source: objSource.value, Symbol: objSymbol.value, DateToTime: objDateToTime.value, QtyToTrade: vQtyToTrade, RandID: vRandId }),
            redirect: 'follow'
            };

            fetch("/alice-blue/getOrderPlacedDetails", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {
                if(objResult.status === "success")
                {
                    console.log(objResult);
                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else if(objResult.status === "danger")
                {
                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else if(objResult.status === "warning")
                {
                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else
                {
                    fnGenMessage("Error in fnOrderPlacedDetails, Please Check.", `badge bg-danger`, "spnGenMsg");
                }
            })
            .catch(error => {
                fnGenMessage("Error in fnOrderPlacedDetails.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnPlaceBasketOrderTest(){
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");
    let vDate = new Date();
    let vRandId = vDate.valueOf();

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ ClientID: objClientId.value, Session: objSession.value, RandId: vRandId }),
        redirect: 'follow'
    };
    
    fetch("/alice-blue/placeBasketOrder", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success")
        {
            console.log(objResult);
        }
        else if(objResult.status === "danger")
        {
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning")
        {
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else
        {
            fnGenMessage("Error to Place Basket ORder.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Start New Trade", `badge bg-danger`, "spnGenMsg");
    });
}

function fnCloseRealPositionsTest(){
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ ClientID: objClientId.value, Session: objSession.value, scripToken: "14003", pCode: "MIS" }),
        redirect: 'follow'
    };
    
    fetch("/alice-blue/sqOffPositions", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success")
        {
            console.log(objResult);
        }
        else if(objResult.status === "danger")
        {
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning")
        {
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else
        {
            fnGenMessage("Error to Close the Position.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Close the Open Position.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnShowRealPositionsTest(){
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ ClientID: objClientId.value, Session: objSession.value }),
        redirect: 'follow'
    };
    
    fetch("/alice-blue/getTradeBook", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success")
        {
            console.log(objResult);
        }
        else if(objResult.status === "danger")
        {
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning")
        {
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else
        {
            fnGenMessage("Tradebook Error, COntact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Receive Tradebook.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnClearLocalStorageRealTemp(){
    localStorage.removeItem("RealCurrPositionS");
    localStorage.setItem("RealStartLotNo", 1);
    localStorage.setItem("RealQtyMul", 1);
    localStorage.removeItem("RealTotLossAmt");
    localStorage.setItem("RealTradeStep", 0);
    console.log("LS Cleared!");
}