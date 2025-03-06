let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){

    getSymbolsDataFile();

    fnGetSymbolList();

    fnGetSetAppStatus();
    fnGetSetTraderLoginStatus();
    fnGetSetAutoTraderStatus();
    fnGetSetOptionStrike();
    fnGetSetConfStepsDDL();
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
        //$('#mdlAppLogin').modal('show');
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
        // alert(vStartLots);
    }
}

function fnSetLotsByQtyMulLossAmt(){
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

async function fnInitiateBuyManualRealTrade(pCEorPE){
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

function fnPlaceNormalOrderTest(){
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
    
    fetch("/alice-blue/placeNormalOrder", objRequestOptions)
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
            fnGenMessage("Error to Place Normal Order.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error in Placing New Trade", `badge bg-danger`, "spnGenMsg");
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

function fnCheckRealTradeTimer(){
    var objTimeMS = document.getElementById("txtTimeMS");
    var objTimerSwitch = document.getElementById("swtAutoChkPosition");
    var objCurrPosiLst = localStorage.getItem("RealCurrPositionS");
    
    if (isNaN(parseInt(objTimeMS.value)) || (parseInt(objTimeMS.value) < 5)) {
        objTimeMS.value = 5;
    }

    let vTimer = 1000 * parseInt(objTimeMS.value);

    if (objTimerSwitch.checked)
    {
        localStorage.setItem("TimerSwtS", "true");

        if (objCurrPosiLst !== null) {
            clearInterval(vTradeInst);

            vTradeInst = setInterval(fnGetRealCurrentPrice, vTimer);
            //vTradeInst = setInterval(fnTestMe, vTimer);

            fnGenMessage("Auto Check for Current Price is On!", `badge bg-success`, "spnGenMsg");
        }
        else
        {
            clearInterval(vTradeInst);
            fnGenMessage("No Open Trade, Will start when the trade is Open", `badge bg-warning`, "spnGenMsg");
        }
        // alert("vTradeInst: " + vTradeInst);
    }
    else {
        localStorage.setItem("TimerSwtS", "false");
        clearInterval(vTradeInst);

        fnGenMessage("Auto Check for Current Price is Off!", `badge bg-danger`, "spnGenMsg");
    }
    fnGetRealCurrentPrice();
}

function fnGetRealCurrentPrice(){

}

// check this later for Multiplying lots on Loss
function fnManualCloseRealTrade(){
    // let objLots = document.getElementById("txtManualLots");
    let objCurrPosiLst = localStorage.getItem("RealCurrPositionS");

    if (objCurrPosiLst === null)
    {
        fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
    }
    else
    {
        fnCloseRealTrade();
    }
}

//Transfers data from CurrPositionS to TradesListS
function fnCloseRealTrade(){
    let objTodayTrades = localStorage.getItem("RealTradesListS");

    const vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    let objCurrPosiLst = localStorage.getItem("RealCurrPositionS");
    let objCurrTrade = JSON.parse(objCurrPosiLst);
    objCurrTrade.TradeData[0].ExitDT = vToday;

    let vPL = ((parseFloat(objCurrTrade.TradeData[0].SellPrice) - parseFloat(objCurrTrade.TradeData[0].BuyPrice)) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);

    if (objTodayTrades === null || objTodayTrades === "")
    {
        objTodayTrades = {
            TradeList: [{ TradeID: objCurrTrade.TradeData[0].TradeID, ClientID: objCurrTrade.TradeData[0].ClientID, Symbol: objCurrTrade.TradeData[0].Symbol, Expiry: objCurrTrade.TradeData[0].Expiry, Strike: objCurrTrade.TradeData[0].Strike, OptionType: objCurrTrade.TradeData[0].OptionType, Quantity: objCurrTrade.TradeData[0].Quantity, BuyPrice: objCurrTrade.TradeData[0].BuyPrice, SellPrice: objCurrTrade.TradeData[0].SellPrice, ProfitLoss: vPL, StopLoss: objCurrTrade.TradeData[0].StopLoss, TakeProfit: objCurrTrade.TradeData[0].TakeProfit, EntryDT: objCurrTrade.TradeData[0].EntryDT, ExitDT: vToday }]
        };
        objTodayTrades = JSON.stringify(objTodayTrades);
        localStorage.setItem("RealTradesListS", objTodayTrades);
    }
    else
    {
        let vExistingData = JSON.parse(objTodayTrades);
        vExistingData.TradeList.push({ TradeID: objCurrTrade.TradeData[0].TradeID, ClientID: objCurrTrade.TradeData[0].ClientID, Symbol: objCurrTrade.TradeData[0].Symbol, Expiry: objCurrTrade.TradeData[0].Expiry, Strike: objCurrTrade.TradeData[0].Strike, OptionType: objCurrTrade.TradeData[0].OptionType, Quantity: objCurrTrade.TradeData[0].Quantity, BuyPrice: objCurrTrade.TradeData[0].BuyPrice, SellPrice: objCurrTrade.TradeData[0].SellPrice, ProfitLoss: vPL, StopLoss: objCurrTrade.TradeData[0].StopLoss, TakeProfit: objCurrTrade.TradeData[0].TakeProfit, EntryDT: objCurrTrade.TradeData[0].EntryDT, ExitDT: vToday });
        let vAddNewItem = JSON.stringify(vExistingData);
        localStorage.setItem("RealTradesListS", vAddNewItem);
    }
    let objExcTradeDtls = JSON.stringify(objCurrTrade);

    localStorage.setItem("RealCurrPositionS", objExcTradeDtls);

    fnGenMessage("Position Closed!", `badge bg-success`, "spnGenMsg");
    getSymbolsDataFile();

    clearInterval(vTradeInst);
    localStorage.removeItem("RealCurrPositionS");

    fnSetNextTradeSettings(vPL);
    fnResetOpenPositionDetails();
    fnSetLotsByQtyMulLossAmt();
    fnSetTodayTradeDetails();
    fnPositionStatus();
}
