let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){

    getSymbolsDataFile();

    fnLoadCnfStatus();

    fnGetSetAllStatus();

    fnGetSetOptionStrike();

    fnGetSetConfStepsDDL();

    fnSetUserProfileDets();

    const objTxtMsg = document.getElementById("txtMessageToAll");

    socket.on("ServerEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");
        const objMsg = JSON.parse(pMsg);
        let vDirec = "";

        if(objMsg.direction === "CE")
            vDirec = true;
        else if(objMsg.direction === "PE")
            vDirec = false;
        else
            vDirec = objMsg.direction;

        if((objMsg.cnf === "cnf2") || (objMsg.cnf === "cnf3"))
        {
            document[objMsg.cnf][objMsg.symbolName].value = vDirec;
            fnSaveConfirmations(objMsg.cnf, objMsg.symbolName, vDirec);
        }
        else
        {
            objDivMsgs.innerHTML += "<p>" + objMsg.symbolName + " - "  + objMsg.direction + " - " + objMsg.strike + "</p>";
            objDivMsgs.scrollTop = objDivMsgs.scrollHeight;

            if(localStorage.getItem("isAutoTrader") === "true")
            {
                fnCheckTradeStep(objMsg);
            }
            else
            {
                fnGenMessage("Signal Received! - But the Auto Trader is Off!", `badge bg-warning`, "spnGenMsg");
            }
        }
    });

    socket.on("ClientEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");

        objDivMsgs.innerHTML += "<p>" + pMsg + "</p>";
        objDivMsgs.scrollTop = objDivMsgs.scrollHeight;
    });

    socket.on("UpdateSym", (pMsg) => {
        getSymbolsDataFile();
        console.log(pMsg);
    });

    objTxtMsg.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
          // Cancel the default action, if needed
          event.preventDefault();
          // Trigger the button element with a click
          document.getElementById("btnSendMsg").click();
        }
    });
});

function fnCheckTradeStep(pObjMsg){
    let objConfSteps = document.getElementById("ddlConfSteps");

    let vVal = objConfSteps.value;
    let vConfNo = vVal[localStorage.getItem("TradeStep")];

    if(vConfNo === "1"){
        fnInitiateAutoTrade(pObjMsg);
    }
    else if(vConfNo === "2"){
        //alert(document["cnf2"][pObjMsg.symbolName].value + " - " + pObjMsg.direction);
        
        if((document["cnf2"][pObjMsg.symbolName].value === "true" && pObjMsg.direction === "CE") || (document["cnf2"][pObjMsg.symbolName].value === "false" && pObjMsg.direction === "PE")){
            fnInitiateAutoTrade(pObjMsg);

            //fnGenMessage("Signal Received! - Trade Executed with 2 confirmations!", `badge bg-success`, "spnGenMsg");
        }
        else{
            fnGenMessage("Signal Received! - But Waiting for 2nd Confirmation Signal!", `badge bg-warning`, "spnGenMsg");
        }
    }
    else if(vConfNo === "3"){
        //alert(document["cnf3"][pObjMsg.symbolName].value + " - " + document["cnf2"][pObjMsg.symbolName].value + " - " + pObjMsg.direction);
        
        if((document["cnf3"][pObjMsg.symbolName].value === "true" && document["cnf2"][pObjMsg.symbolName].value === "true" && pObjMsg.direction === "CE") || (document["cnf3"][pObjMsg.symbolName].value === "false" && document["cnf2"][pObjMsg.symbolName].value === "false" && pObjMsg.direction === "PE")){
            fnInitiateAutoTrade(pObjMsg);

            //fnGenMessage("Signal Received! - Trade Executed with 3 confirmations!", `badge bg-success`, "spnGenMsg");
        }
        else{
            fnGenMessage("Signal Received! - But Waiting for 2nd & 3rd Confirmation Signal!", `badge bg-warning`, "spnGenMsg");
        }
    }
    else{
        fnGenMessage("Signal Received! - But Invalid Trade Step!", `badge bg-danger`, "spnGenMsg");
    }
}

function fnGetSetAllStatus(){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");
    let objLoginTxt = document.getElementById("lblAppLoginTxt");

    //var objAppStatus = document.getElementById("spnAppStatus");

    // console.log("Res: " + bAppStatus)
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
    fnLoadDefaultSLTP();
    fnSetLotsByQtyMulLossAmt();
    fnLoadTimerSwitchSetting();
    fnSetDefaultLotNos();

    //fnSetCurrentTradeDetails();
    fnSetTodayTradeDetails();
}

function fnLoadDefaultSLTP(){
    let vDefSLTPLS = localStorage.getItem("DDLDefSLTP");
    let objDefSLTP = document.getElementById("ddlTrailSLTP");

    if(vDefSLTPLS === null || vDefSLTPLS === ""){
        localStorage.setItem("DDLDefSLTP", objDefSLTP.value);
    }
    else
    {
        objDefSLTP.value = localStorage.getItem("DDLDefSLTP");
    }
    //alert(localStorage.getItem("DDLDefSLTP"));
}

function fnSetDDLTrailSLTP(objThis){
    localStorage.setItem("DDLDefSLTP", objThis.value);
}

function fnSetDefaultLotNos(){
    let vStartLots = localStorage.getItem("StartLotNo");
    let objTxtLots = document.getElementById("txtStartLotNos");

    if(vStartLots === null || vStartLots === "" || vStartLots === "0"){
        localStorage.setItem("StartLotNo", 1);
        objTxtLots.value = 1;
    }
}

function fnSetLotsByQtyMulLossAmt(){
    let vQtyMul = localStorage.getItem("QtyMul");
    let objLots = document.getElementById("txtManualLots");
    let vTotLossAmt = localStorage.getItem("TotLossAmt");

    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("QtyMul", 1);
        objLots.value = 1;
    }
    else {
        objLots.value = vQtyMul;
    }
    
    if (vTotLossAmt == null || vTotLossAmt == "") {
        localStorage.setItem("QtyMul", 1);
        localStorage.setItem("TotLossAmt", 0);
        objLots.value = 1;
    }
    else {
        objLots.value = vQtyMul;
    }
}

function fnLoadTimerSwitchSetting(){
    let vTimerSwitchS = localStorage.getItem("TimerSwtS");
    let objTimerSwitch = document.getElementById("swtAutoChkPosition");

    if (vTimerSwitchS === "true") {
        objTimerSwitch.checked = true;
    }
    else {
        objTimerSwitch.checked = false;
    }
    fnCheckTradeTimer();
}

function fnSetTodayTradeDetails(){
    let objTodayTrades = localStorage.getItem("TradesListS");
    let objTodayTradeList = document.getElementById("divTodayTrades");

    if (objTodayTrades == null || objTodayTrades == "") {
        objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
    }
    else {
        let vTempHtml = "";
        let vJsonData = JSON.parse(objTodayTrades);
        let vNetProfit = 0;

        for (let i = 0; i < vJsonData.TradeList.length; i++) {
            vTempHtml += '<tr>';
            //vTempHtml += '<td>' + vJsonData.TradeList[i].TradeID + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + vJsonData.TradeList[i].TradeID + ');\'>' + vJsonData.TradeList[i].EntryDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vJsonData.TradeList[i].ExitDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + vJsonData.TradeList[i].Symbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vJsonData.TradeList[i].Expiry + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + vJsonData.TradeList[i].Strike + vJsonData.TradeList[i].OptionType + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vJsonData.TradeList[i].Quantity + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + vJsonData.TradeList[i].BuyPrice + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + vJsonData.TradeList[i].SellPrice + '</td>';

            let vCapital = vJsonData.TradeList[i].Quantity * vJsonData.TradeList[i].BuyPrice;
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vCapital).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;text-align:right;">' + vJsonData.TradeList[i].ProfitLoss + '</td>';

            vNetProfit += parseFloat(vJsonData.TradeList[i].ProfitLoss);
            vTempHtml += '</tr>';
        }
        vTempHtml += '<tr><td colspan="8" Style="text-align:right;font-weight:bold;color:orange;">NET PROFIT & LOSS</td><td></td><td style="font-weight:bold;text-align:right;color:orange;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objTodayTradeList.innerHTML = vTempHtml;
    }
}

function fnDeleteThisTrade(pTradeId){
    let objTodayTrades = localStorage.getItem("TradesListS");
    let vJsonData = JSON.parse(objTodayTrades);

    if(confirm("Are You Sure, You Want to Delete This Trade?")){
        for (let i = 0; i < vJsonData.TradeList.length; i++) {
            if(vJsonData.TradeList[i].TradeID === pTradeId) {
                vJsonData.TradeList.splice(i, 1);
            }
        }
        let vEditedItems = JSON.stringify(vJsonData);
        localStorage.setItem("TradesListS", vEditedItems);
        fnSetTodayTradeDetails();
    }
}

function fnCheckTradeTimer(){
    var objTimeMS = document.getElementById("txtTimeMS");
    var objTimerSwitch = document.getElementById("swtAutoChkPosition");
    var objCurrPosiLst = localStorage.getItem("CurrPositionS");
    
    if (isNaN(parseInt(objTimeMS.value)) || (parseInt(objTimeMS.value) < 5)) {
        objTimeMS.value = 5;
    }

    let vTimer = 1000 * parseInt(objTimeMS.value);

    if (objTimerSwitch.checked)
    {
        localStorage.setItem("TimerSwtS", "true");

        if (objCurrPosiLst !== null) {
            clearInterval(vTradeInst);

            vTradeInst = setInterval(fnGetCurrentPrice, vTimer);
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
    fnGetCurrentPrice();
}

function fnShowTraderLoginMdl(objThis){
    let isAppLoginStatus = localStorage.getItem("AppMsgStatusS");

    //console.log(isAppLoginStatus);
    if(isAppLoginStatus === "false")
    {
        $('#mdlAppLogin').modal('show');
    }
    else if(objThis.className === "badge bg-danger")
    {
        $('#mdlAliceLogin').modal('show');
    }
    else
    {
        fnClearPrevLoginSession();
        fnGetSetAutoTraderStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnClearLocalStorageTemp(){
    // console.log("Before: " + localStorage.getItem("isTraderLogin"));
    // localStorage.removeItem("lsAliceBlueID");
    // localStorage.removeItem("lsAliceBlueApiKey");
    // localStorage.removeItem("lsLoginDate");
    // localStorage.removeItem("isTraderLogin");
    // localStorage.removeItem("isAutoTrader");
    localStorage.removeItem("CurrPositionS");
    localStorage.removeItem("TradesListS");
    localStorage.setItem("StartLotNo", 1);
    localStorage.setItem("QtyMul", 1);
    localStorage.removeItem("TotLossAmt");
    localStorage.removeItem("UserDetS");
    localStorage.setItem("TradeStep", 0);
    localStorage.removeItem("ConfStepsS");
    // console.log(localStorage.getItem("CurrPositionS"));
    // console.log(localStorage.getItem("TradesListS"));

    fnSetTodayTradeDetails();
    fnSetUserProfileDets();
}

function fnSendMessageToAll(){
    const objMsg = document.getElementById("txtMessageToAll");

    socket.emit("UserMessage", objMsg.value);

    objMsg.value = "";
}

function fnExecTradeToAll(pSymbol, pDirec){
    const objMsg = JSON.stringify({ symbolName: pSymbol, indType: 'Test', direction: pDirec, strike: '', cnf: 'cnf1' });

    socket.emit("SendTrdToAll", objMsg);
}

function fnClearMessage(){
    const objDivMsgs = document.getElementById("divMessages");

    objDivMsgs.innerHTML = "";
}

function fnLoadCnfStatus(){
    let lsCnfAtr = localStorage.getItem("lsCnfAtr");
    //console.log(lsCnfAtr);

    let vCnfJson = {
        "cnf2": {
          "BANKNIFTY": -1,
          "NIFTY": -1,
          "FINNIFTY": -1,
          "SENSEX": -1
        },
        "cnf3": {
          "BANKNIFTY": -1,
          "NIFTY": -1,
          "FINNIFTY": -1,
          "SENSEX": -1
        }
      }

    if(lsCnfAtr)
    {
        //alert("exists");
        //console.log(lsCnfAtr);
    }
    else
    {
    localStorage.setItem("lsCnfAtr", JSON.stringify(vCnfJson));
    lsCnfAtr = localStorage.getItem("lsCnfAtr");
    }

    lsCnfAtr = JSON.parse(lsCnfAtr);
    //console.log(lsCnfAtr);
      for(let frm in lsCnfAtr){
        //console.log(frm); // It gives you property name
        //console.log(vCnfJson[frm]); // And this gives you its value
        
        for(let a in lsCnfAtr[frm]){
            //console.log(a + " - " + lsCnfAtr[frm][a]);
            document[frm][a].value = lsCnfAtr[frm][a];
        }
    }
}

function fnGetUserProfileDets(){
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");

    if(objSession.value === "")
    {
        fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
    }
    else
    {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ClientID: objClientId.value, Session: objSession.value}),
        redirect: 'follow'
        };

        fetch("/alice-blue/getUserProfileDetails", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success")
            {
                //console.log(objResult);
                document.getElementById("txtClientIdUP").value = objResult.data.accountId;
                document.getElementById("txtFullNameUP").value = objResult.data.accountName;
                document.getElementById("txtClientMobileUP").value = objResult.data.cellAddr;
                document.getElementById("txtClientEmailUP").value = objResult.data.emailAddr;
                document.getElementById("txtRealMarginUP").value = objResult.data.dataMargins.cashmarginavailable;
                document.getElementById("divMarginData").innerText = JSON.stringify(objResult.data.dataMargins);
                document.getElementById("txtClientStatusUP").value = objResult.data.accountStatus;

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
                fnGenMessage("Error in Obtaining User Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch User Details.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnSaveConfirmations(pFrm, pSymName, pStatus){
    let lsCnfAtr = localStorage.getItem("lsCnfAtr");

    lsCnfAtr = JSON.parse(lsCnfAtr);

    lsCnfAtr[pFrm][pSymName] = pStatus;

    var objSavelsCnfAtr = JSON.stringify(lsCnfAtr);
        localStorage.setItem("lsCnfAtr", objSavelsCnfAtr);

    //console.log(lsCnfAtr[pFrm][pSymName] = pStatus);
    //console.log(localStorage.getItem("lsCnfAtr"));

    let vAction = JSON.stringify({
        "jsonName" : "tvConfs",
        "JsonStr" : objSavelsCnfAtr,
        "JsonFileName" : "tvConfirmations.json"
    });

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/json/uorcJSON", requestOptions)
    .then(response => response.json())
    .then(result => {        
        if(result.status === "danger")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
        }
        else if(result.status === "warning")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
        }
        else
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("ErrorC: Unable to Update JSON Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnSaveProfileDetails(){
    let objClientId = document.getElementById("txtClientIdUP");
    let objFullName = document.getElementById("txtFullNameUP");
    let objMobileNumber = document.getElementById("txtClientMobileUP");
    let objEmailId = document.getElementById("txtClientEmailUP");
    let objStatus = document.getElementById("txtClientStatusUP");
    let objRealMargin = document.getElementById("txtRealMarginUP");
    let objPaperMargin = document.getElementById("txtPaperMarginUP");
    let objUserDets = localStorage.getItem("UserDetS");

    if(objClientId.value === ""){
        fnGenMessage("Please Login to Trading Account to Get Your Profile Data", `badge bg-danger`, "spnABProfile");
    }
    else if(objPaperMargin.value === ""){
        fnGenMessage("Please Input Paper Trade Margin", `badge bg-warning`, "spnABProfile");
    }
    else if (objUserDets == null || objUserDets == "") {
        let vUserDet = { ClientId: objClientId.value, FullName: objFullName.value, Mobile: objMobileNumber.value, EmailId: objEmailId.value, Status: objStatus.value, CashMargin: objRealMargin.value, PaperMargin: objPaperMargin.value };
        let vFirstTime= JSON.stringify(vUserDet);
        localStorage.setItem("UserDetS", vFirstTime);

        fnGenMessage("Paper Trading Margin Saved!", `badge bg-success`, "spnGenMsg");
        $('#mdlUserProfile').modal('hide');
    }
    else {
        let vExistingData = JSON.parse(objUserDets);

        vExistingData.ClientId = objClientId.value;
        vExistingData.FullName = objFullName.value;
        vExistingData.Mobile = objMobileNumber.value;
        vExistingData.EmailId = objEmailId.value;
        vExistingData.Status = objStatus.value;
        vExistingData.CashMargin = objRealMargin.value;
        vExistingData.PaperMargin = objPaperMargin.value;

        let vUpdData = JSON.stringify(vExistingData);
        localStorage.setItem("UserDetS", vUpdData);

        fnGenMessage("Paper Trading Margin Updated!", `badge bg-success`, "spnGenMsg");
        $('#mdlUserProfile').modal('hide');
    }
}

function fnGetCurrentPrice(){
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    if (objCurrPosiLst === null)
    {
        fnGenMessage("Ready to Start a New Trade!", `badge bg-warning`, "spnGenMsg");
    }
    else
    {
        let objCurrTrade = JSON.parse(objCurrPosiLst);
        let objSession = document.getElementById("hidSession");

        if(objSession.value === "")
        {
            fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
        }
        else
        {
            let vHeaders = new Headers();
            vHeaders.append("Content-Type", "application/json");

            let objRequestOptions = {
                method: 'POST',
                headers: vHeaders,
                body: JSON.stringify({ Contract: objCurrTrade.TradeData[0].Contract, Token: objCurrTrade.TradeData[0].Token, ClientID: objCurrTrade.TradeData[0].ClientID, Session: objSession.value }),
                redirect: 'follow'
            };
            
            fetch("/alice-blue/getOpenTradeRate", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {
                if(objResult.status === "success")
                {
                    if (objResult.data.ReqStatus == "Ok")
                    {
                        fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                        var objMCurrPrice = document.getElementById("txtMCurrPrice");

                        var vBestAsk = objResult.data.SellRate;
                        var vBestBid = objResult.data.BuyPrice;
                        
                        if(objMCurrPrice.value !== "")
                        {
                            vBestAsk = objMCurrPrice.value;
                            vBestBid = objMCurrPrice.value;
                        }
        
                        if(objCurrTrade.TradeData[0].ByorSl === "buy")
                        {
                            objCurrTrade.TradeData[0].SellPrice = vBestBid;
                        }   
                        else if(objCurrTrade.TradeData[0].ByorSl === "sell")
                        {
                            objCurrTrade.TradeData[0].BuyPrice = vBestAsk;
                        }
                        else
                        {

                        }
                        var objExcTradeDtls = JSON.stringify(objCurrTrade);
                        localStorage.setItem("CurrPositionS", objExcTradeDtls);
                        fnSetCurrTradeSLTP();

                        //fnSetCurrentTradeDetails();

                        //console.log(localStorage.getItem("CurrPositionS"));
                    }
                    else
                    {
                        fnGenMessage("Option Code Not Found! No Data Received!", `badge bg-danger`, "spnGenMsg");
                    }    
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
                    fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
                }
            })
            .catch(error => {
                console.log('error: ', error);
                fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
            });
        }
    }
    fnPositionStatus();
}

async function fnInitiateBuyManualTrade(pCEorPE){
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    //check if any position is Open. Only One Open trade is allowed here.
    if (objCurrPosiLst === null)
    {
        fnExecPaperTrade(pCEorPE);
    }
    else
    {
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnExecPaperTrade(pDirec){
    let objManualStrike = document.getElementById("txtManualStrike");
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");
    let objSymbol = document.getElementById("ddlManualSymbol");
    let objExpiry = document.getElementById("ddlManualExpiry");
    let objExchange = document.getElementById("hidExchange");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objManualStrikePrice = document.getElementById("txtManualStrike");
    let objActualStrikePrice = document.getElementById("txtActualStrike");
    let objManualTradePrice = document.getElementById("txtManualTradePrice");
    let objSelToken = document.getElementById("hidToken");
    let objManualQty = document.getElementById("txtManualBuyQty");
    let objManualLots = document.getElementById("txtManualLots");
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
        let vStartLotNo = localStorage.getItem("StartLotNo");
        let vStrikeOption = parseInt(objDDLStrikeOption.value) * parseInt(objStrikeInterval.value);

        if(pDirec === "PE"){
            vStrikeOption = -(vStrikeOption);
        }

        if(parseInt(objManualLots.value) === 1){
            objManualLots.value = vStartLotNo;
            localStorage.setItem("QtyMul", vStartLotNo);
        }

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
            body: JSON.stringify({ ActualStrikeRate: objActualStrikePrice.value, CurrStrikeRate: objManualStrike.value, StrikeOption: vStrikeOption, ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value, BorS: "buy", CorP: pDirec, Contract: objContract.value, Source: objSource.value, Symbol: objSymbol.value, DateToTime: objDateToTime.value }),
            redirect: 'follow'
            };

            fetch("/alice-blue/getExecutedTradeRate", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {
                if(objResult.status === "success"){
                    //Code Later to check the available Capital and adjust the Qty as per available Capital if Qty exceeds
                    var vQtyToTrade = parseInt(objManualLots.value) * parseInt(objManualQty.value);

                    objManualStrikePrice.value = objResult.data.RoundedStrike;
                    objActualStrikePrice.value = objResult.data.ActualStrike;
                    objTradeToken.value = objResult.data.TradeToken;
                    var vBestAsk = objResult.data.SellRate;
                    var vBestBid = objResult.data.BuyPrice;
        
                    var vTrailSL = 0;

                    if(vBestAsk === null || vBestAsk === "")
                    vBestAsk = 100;
                    if(vBestBid === null || vBestBid === "")
                    vBestBid = 100;
                    
                    vTrailSL = parseFloat(vBestAsk) - parseInt(objManualStopLoss.value);
                    objManualTradePrice.value = vBestAsk;

                    // else if(pBYorSL === "sell")
                    // {
                    //     vTrailSL = parseFloat(vBestBid) + parseInt(objManualStopLoss.value);
                    //     objManualTradePrice.value = vBestBid;
                    // }
                    // else
                    // {
                    //     vTrailSL = 0;
                    //     objManualTradePrice.value = 0;
                    // }
                    
                    var vExcTradeDtls = {
                        TradeData: [{ TradeID: vRandId, Token: objTradeToken.value, ClientID: objClientId.value, Symbol: objSymbol.value, Expiry: objExpiry.value, Strike: objManualStrikePrice.value, ByorSl: "buy", OptionType: pDirec, Quantity: vQtyToTrade, BuyPrice: vBestAsk, SellPrice: vBestBid, ProfitLoss: 0, StopLoss: objManualStopLoss.value, TakeProfit: objManualTakeProfit.value, TrailSL: vTrailSL, EntryDT: vToday, ExitDT: "", Exchange: objExchange.value, Contract: objContract.value, ExpVal: objDateToTime.value }]
                    };

                    var objExcTradeDtls = JSON.stringify(vExcTradeDtls);

                    //console.log(objExcTradeDtls);

                    if (objResult.data.ReqStatus == "Ok")
                    {
                        localStorage.setItem("CurrPositionS", objExcTradeDtls);

                        //fnSetCurrentTradeDetails();
                        fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                        fnClearTradedFields();
                        fnLoadTimerSwitchSetting();
                        
                        //console.log(localStorage.getItem("CurrPositionS"));
                    }
                    else
                    {
                        fnGenMessage("Option Code Not Found! No Trade Executed!", `badge bg-danger`, "spnGenMsg");
                    }
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
                    fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
                }
            })
            .catch(error => {
                console.log('error: ', error);
                fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnClearTradedFields(){
    let objSymbol = document.getElementById("ddlManualSymbol");

    objSymbol.value = "";
    fnGetSelSymbolData(objSymbol.value);
}

/* Change Later
This Function is called from "fnAPTGetCurrentPrice", "fnAPTGetStatus".
If Position is available, Displays the current trade details on the right side in AMT Page.
Calculates profit and loss as per Stop Loss and Take Profit and sends it "fnAPTUpdateTradeStatus" to further processing
*/
function fnSetCurrentTradeDetails(){
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");
    let objSymbol = document.getElementById("lblSymbol");
    let objExpiry = document.getElementById("lblExpiry");
    let objStrike = document.getElementById("lblStrike");
    let objOptionType = document.getElementById("lblOptionType");
    let objQuantity = document.getElementById("lblQty");
    let objBuyPriceInd = document.getElementById("lblBuyPriceInd");
    let objSellPriceInd = document.getElementById("lblSellPriceInd");
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let objStopLoss = document.getElementById("txtUpdStopLoss");
    let objTakeProfit = document.getElementById("txtUpdTakeProfit");
    let objEntryDate = document.getElementById("lblEntryDate");
    let objTrailSL = document.getElementById("lblTrailSL");
    let objLossOnSL = document.getElementById("lblLossOnSL");
    let objProfitOnTP = document.getElementById("lblProfitOnTP");
    let objCapital = document.getElementById("lblCapital");

    if (objCurrPosiLst === null) {
        objSymbol.innerText = "";
        objExpiry.innerText = "";
        objStrike.innerText = "";
        objOptionType.innerText = "";
        objQuantity.innerText = "";
        objBuyPrice.innerText = "";
        objSellPrice.innerText = "";
        objProfitLoss.innerText = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";
        objEntryDate.innerText = "";
        objTrailSL.innerText = "0.00";
        objLossOnSL.innerText = "0.00";
        objProfitOnTP.innerText = "0.00";
        objCapital.innerText = "0.00";

        fnGenMessage("No Open Position", `badge bg-danger`, "btnPositionStatus");
    }
    else
    {
        let objCurrTrade = JSON.parse(objCurrPosiLst);
        let vCurrBuyingPrice, vCurrSellingPrice, vTrailSLStart = 0;
        let vBorS = "";

        objSymbol.innerText = objCurrTrade.TradeData[0].Symbol;
        objExpiry.innerText = objCurrTrade.TradeData[0].Expiry;
        objStrike.innerText = objCurrTrade.TradeData[0].Strike;
        objOptionType.innerText = objCurrTrade.TradeData[0].OptionType;
        objQuantity.innerText = objCurrTrade.TradeData[0].Quantity;
        objBuyPrice.innerText = objCurrTrade.TradeData[0].BuyPrice;
        vCurrBuyingPrice = objCurrTrade.TradeData[0].BuyPrice;
        objSellPrice.innerText = objCurrTrade.TradeData[0].SellPrice;
        vCurrSellingPrice = objCurrTrade.TradeData[0].SellPrice;

        vBorS = objCurrTrade.TradeData[0].ByorSl;

        let vPL = ((parseFloat(objCurrTrade.TradeData[0].SellPrice) - parseFloat(objCurrTrade.TradeData[0].BuyPrice)) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);
        objProfitLoss.innerText = vPL;
        objStopLoss.value = objCurrTrade.TradeData[0].StopLoss;
        objTakeProfit.value = objCurrTrade.TradeData[0].TakeProfit;
        objEntryDate.innerText = objCurrTrade.TradeData[0].EntryDT;
        let vTrailSLAmt = objCurrTrade.TradeData[0].TrailSL;

        let vSLAmt = - (parseFloat(objCurrTrade.TradeData[0].StopLoss) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);
        objLossOnSL.innerText = vSLAmt;
        let vTPAmt = (parseFloat(objCurrTrade.TradeData[0].TakeProfit) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);
        objProfitOnTP.innerText = vTPAmt;

        // if(vBorS === "buy")
        // {
        objCapital.innerText = (parseFloat(objCurrTrade.TradeData[0].BuyPrice) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);
        objSellPriceInd.innerText = "CURR PRICE";
        objBuyPriceInd.innerText = "BUY PRICE";

        vTrailSLStart = parseFloat(objCurrTrade.TradeData[0].BuyPrice) + parseFloat(objCurrTrade.TradeData[0].StopLoss);
        let isTSL = false;

        if(parseFloat(objCurrTrade.TradeData[0].SellPrice) >= parseFloat(vTrailSLStart))
        {
            isTSL = true;
        }

        if(isTSL)
        {
            vTrailSLAmt = parseFloat(objCurrTrade.TradeData[0].SellPrice) - parseFloat(objCurrTrade.TradeData[0].StopLoss);
        }

        let vTSLAmt = ((parseFloat(vTrailSLAmt) - parseFloat(objCurrTrade.TradeData[0].BuyPrice)) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);
        objTrailSL.innerText = vTSLAmt;
        // }
        // else if(vBorS === "sell")
        // {
        //     objCapital.innerText = (parseFloat(objCurrTrade.TradeData[0].SellPrice) * parseFloat(objCurrTrade.TradeData[0].Quantity) * 30).toFixed(2);
        //     objBuyPriceInd.innerText = "CURR PRICE";
        //     objSellPriceInd.innerText = "SELL PRICE";

        //     vTrailSLStart = parseFloat(objCurrTrade.TradeData[0].SellPrice) - parseFloat(objCurrTrade.TradeData[0].StopLoss);
        //     let isTSL = false;

        //     if(parseFloat(objCurrTrade.TradeData[0].BuyPrice) <= parseFloat(vTrailSLStart))
        //     {
        //         isTSL = true;
        //     }

        //     if(isTSL)
        //     {
        //         vTrailSLAmt = parseFloat(objCurrTrade.TradeData[0].BuyPrice) + parseFloat(objCurrTrade.TradeData[0].StopLoss);
        //     }

        //     let vTSLAmt = ((parseFloat(objCurrTrade.TradeData[0].SellPrice) - parseFloat(vTrailSLAmt)) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);
        //     objTrailSL.innerText = vTSLAmt;
        // }

        objCurrTrade.TradeData[0].TrailSL = vTrailSLAmt;
        objCurrTrade.TradeData[0].ProfitLoss = vPL;

        let objExcTradeDtls = JSON.stringify(objCurrTrade);
        localStorage.setItem("CurrPositionS", objExcTradeDtls);

        fnGenMessage("Position Is Open", `badge bg-warning`, "btnPositionStatus");

        fnUpdateTradeStatus(vPL, vSLAmt, vTPAmt, vTrailSLAmt, vCurrBuyingPrice, vCurrSellingPrice, vBorS);
    }
}

function fnUpdateTradeStatus(pPL, pSLAmt, pTPAmt, pTrailSLAmt, pCurrBuyingPrice, pCurrSellingPrice, pBorS){

    let objLots = document.getElementById("txtManualLots");
    let objQty = document.getElementById("txtManualBuyQty");
    let objTSLChecked = document.getElementById("cbTrailingSL");
    let vTotLossAmt = localStorage.getItem("TotLossAmt");
    let vDiffLoss = parseInt(pPL) - Math.abs(parseInt(vTotLossAmt));
    let vTradeStep = localStorage.getItem("TradeStep");


    // console.log("SP: " + pCurrSellingPrice + " T-SL: " + pTrailSLAmt + " PL: " + pPL + " DiffLoss: " + vDiffLoss)
    // console.log("TP: " + pTPAmt)
    if (objTSLChecked.checked){
        if (parseFloat(pCurrSellingPrice) <= parseFloat(pTrailSLAmt)){
            if (parseInt(pPL) < 0){
                localStorage.setItem("TotLossAmt", parseInt(vTotLossAmt) + parseInt(pPL));
                let vNextQty = parseInt(objLots.value) * 2;
                localStorage.setItem("QtyMul", vNextQty);
                objLots.value = vNextQty;

                vTradeStep++;

                if(vTradeStep < 6){
                    localStorage.setItem("TradeStep", vTradeStep);
                }
                else{
                    localStorage.setItem("TradeStep", 0);
                }
            }
            else if (parseInt(vDiffLoss) < 0){
                localStorage.setItem("TotLossAmt", parseInt(vTotLossAmt) - parseInt(pPL));
                let vNextQty = Math.round(Math.abs(parseInt(vDiffLoss)) / Math.abs(parseInt(vTotLossAmt))) * parseInt(objLots.value);
                localStorage.setItem("QtyMul", vNextQty);
                objLots.value = vNextQty;

                vTradeStep++;

                if(vTradeStep < 6){
                    localStorage.setItem("TradeStep", vTradeStep);
                }
                else{
                    localStorage.setItem("TradeStep", 0);
                }
            }
            else{
                localStorage.setItem("TotLossAmt", 0);
                localStorage.setItem("QtyMul", 1);
                localStorage.setItem("TradeStep", 0);
                objLots.value = 1;
            }
            fnCloseTrade();
        }
        else{
            fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        }
    }
    else{
        if (parseInt(pPL) >= parseInt(pTPAmt)){
            localStorage.setItem("QtyMul", 1);
            objLots.value = 1;

            localStorage.setItem("TradeStep", 0);

            fnCloseTrade();
        }
        else if (parseInt(pPL) <= parseInt(pSLAmt)){
            let vNextQty = parseInt(objLots.value) * 2;
            localStorage.setItem("QtyMul", vNextQty);
            objLots.value = vNextQty;

            vTradeStep++;

            if(vTradeStep < 6){
                localStorage.setItem("TradeStep", vTradeStep);
            }
            else{
                localStorage.setItem("TradeStep", 0);
            }

            fnCloseTrade();
        }
        else{
            fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        }
    }
}

function fnUpdateSLTP(){
    let objStopLoss = document.getElementById("txtUpdStopLoss");
    let objTakeProfit = document.getElementById("txtUpdTakeProfit");
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    if (objCurrPosiLst === null) {
        fnGenMessage("No Open Positions to Update SL / TP!", `badge bg-warning`, "spnGenMsg");
    }
    else {
        let objCurrTrade = JSON.parse(objCurrPosiLst);

        if (objStopLoss.value === "")
            objCurrTrade.TradeData[0].StopLoss = "0";
        else
            objCurrTrade.TradeData[0].StopLoss = objStopLoss.value;

        if (objTakeProfit.value === "")
            objCurrTrade.TradeData[0].TakeProfit = "0";
        else
            objCurrTrade.TradeData[0].TakeProfit = objTakeProfit.value;

        // if(objCurrTrade.TradeData[0].ByorSl === "buy")
        // {
            objCurrTrade.TradeData[0].TrailSL = parseFloat(objCurrTrade.TradeData[0].BuyPrice) - parseFloat(objCurrTrade.TradeData[0].StopLoss);
        // }
        // else if(objCurrTrade.TradeData[0].ByorSl === "sell")
        // {
        //     objCurrTrade.TradeData[0].TrailSL = parseFloat(objCurrTrade.TradeData[0].SellPrice) + parseFloat(objCurrTrade.TradeData[0].StopLoss);
        // }
        // else
        // {
        //     objCurrTrade.TradeData[0].TrailSL = 0;
        // }

        let objExcTradeDtls = JSON.stringify(objCurrTrade);
        localStorage.setItem("CurrPositionS", objExcTradeDtls);
        fnGenMessage("SL / TP Updated!", `badge bg-success`, "spnGenMsg");

        // console.log(localStorage.getItem("CurrPositionS"))
        //fnSetCurrentTradeDetails();
    }
}

// check this later for Multiplying lots on Loss
function fnManualCloseTrade(){

    // let objLots = document.getElementById("txtManualLots");
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    if (objCurrPosiLst === null)
    {
        fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
    }
    else
    {
        // let objCurrTrade = JSON.parse(objCurrPosiLst);
        // let vPL = objCurrTrade.TradeData[0].ProfitLoss;

        // if (parseFloat(vPL) < 0) {
        //     let vNextQty = parseInt(objLots.value) * 2;
        //     localStorage.setItem("QtyMul", vNextQty);
        // }
        // else {
        //     localStorage.setItem("QtyMul", 1);
        // }
        fnCloseTrade();
    }
}

//Transfers data from CurrPositionS to TradesListS
function fnCloseTrade(){
    let objTodayTrades = localStorage.getItem("TradesListS");

    const vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    let objCurrPosiLst = localStorage.getItem("CurrPositionS");
    let objCurrTrade = JSON.parse(objCurrPosiLst);
    objCurrTrade.TradeData[0].ExitDT = vToday;

    let vPL = ((parseFloat(objCurrTrade.TradeData[0].SellPrice) - parseFloat(objCurrTrade.TradeData[0].BuyPrice)) * parseFloat(objCurrTrade.TradeData[0].Quantity)).toFixed(2);

    if (objTodayTrades === null || objTodayTrades === "")
    {
        objTodayTrades = {
            TradeList: [{ TradeID: objCurrTrade.TradeData[0].TradeID, ClientID: objCurrTrade.TradeData[0].ClientID, Symbol: objCurrTrade.TradeData[0].Symbol, Expiry: objCurrTrade.TradeData[0].Expiry, Strike: objCurrTrade.TradeData[0].Strike, OptionType: objCurrTrade.TradeData[0].OptionType, Quantity: objCurrTrade.TradeData[0].Quantity, BuyPrice: objCurrTrade.TradeData[0].BuyPrice, SellPrice: objCurrTrade.TradeData[0].SellPrice, ProfitLoss: vPL, StopLoss: objCurrTrade.TradeData[0].StopLoss, TakeProfit: objCurrTrade.TradeData[0].TakeProfit, EntryDT: objCurrTrade.TradeData[0].EntryDT, ExitDT: vToday }]
        };
        objTodayTrades = JSON.stringify(objTodayTrades);
        localStorage.setItem("TradesListS", objTodayTrades);
        //console.log(localStorage.getItem("TradesListS"));
    }
    else
    {
        let vExistingData = JSON.parse(objTodayTrades);
        vExistingData.TradeList.push({ TradeID: objCurrTrade.TradeData[0].TradeID, ClientID: objCurrTrade.TradeData[0].ClientID, Symbol: objCurrTrade.TradeData[0].Symbol, Expiry: objCurrTrade.TradeData[0].Expiry, Strike: objCurrTrade.TradeData[0].Strike, OptionType: objCurrTrade.TradeData[0].OptionType, Quantity: objCurrTrade.TradeData[0].Quantity, BuyPrice: objCurrTrade.TradeData[0].BuyPrice, SellPrice: objCurrTrade.TradeData[0].SellPrice, ProfitLoss: vPL, StopLoss: objCurrTrade.TradeData[0].StopLoss, TakeProfit: objCurrTrade.TradeData[0].TakeProfit, EntryDT: objCurrTrade.TradeData[0].EntryDT, ExitDT: vToday });
        let vAddNewItem = JSON.stringify(vExistingData);
        localStorage.setItem("TradesListS", vAddNewItem);
        //console.log(localStorage.getItem("TradesListS"));
    }
    let objExcTradeDtls = JSON.stringify(objCurrTrade);
    ////const obj = JSON.parse(objExcTradeDtls);
    localStorage.setItem("CurrPositionS", objExcTradeDtls);

    fnGenMessage("Position Closed!", `badge bg-success`, "spnGenMsg");
    getSymbolsDataFile();

    // objInstance.invokeMethodAsync("fnAPTFromJSCloseTrade").then(result => {
    //     console.log("Result: " + result);
    // });
    clearInterval(vTradeInst);
    localStorage.removeItem("CurrPositionS");

    //fnSetCurrentTradeDetails();
    fnSetNextTradeSettings(vPL);
    fnResetOpenPositionDetails();
    fnSetLotsByQtyMulLossAmt();
    fnSetTodayTradeDetails();
    fnPositionStatus();
}

function fnInitiateAutoTrade(pObjMsg){
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    if (objCurrPosiLst === null){
        let objSession = document.getElementById("hidSession");

        if(objSession.value === ""){
            fnGenMessage("Signal Received! - But Trading Account is Not Connected!", `badge bg-danger`, "spnGenMsg");
        }
        else {
            fnExecAutoPaperTrade(pObjMsg);
        }
    }
    else{
        fnGenMessage("Signal Received! - But a Position is still Open!", `badge bg-warning`, "spnGenMsg");
    } 
}

function fnExecAutoPaperTrade(pObjMsg){
    let objSession = document.getElementById("hidSession");
    let objSymbol = document.getElementById("ddlManualSymbol");
    let objExpiry = document.getElementById("ddlManualExpiry");
    let objDateToTime = document.getElementById("txtDateToTime");
    let objActualStrikePrice = document.getElementById("txtActualStrike");
    let objManualStrike = document.getElementById("txtManualStrike");
    let objClientId = document.getElementById("txtClientId");
    let objExchange = document.getElementById("hidExchange");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objSelToken = document.getElementById("hidToken");
    let objContract = document.getElementById("hidContract");
    let objSource = document.getElementById("ddlManualSource");
    let objManualStrikePrice = document.getElementById("txtManualStrike");

    let objManualLots = document.getElementById("txtManualLots");
    let objManualQty = document.getElementById("txtManualBuyQty");
    let objTradeToken = document.getElementById("hidTradeToken");
    let objManualStopLoss = document.getElementById("txtManualStopLoss");
    let objManualTradePrice = document.getElementById("txtManualTradePrice");
    let objManualTakeProfit = document.getElementById("txtManualTakeProfit");

    let vStartLotNo = localStorage.getItem("StartLotNo");
    let objDDLStrikeOption = document.getElementById("ddlOptionStrike");

    if(parseInt(objManualLots.value) === 1){
        objManualLots.value = vStartLotNo;
        localStorage.setItem("QtyMul", vStartLotNo);
    }

    objSymbol.value = pObjMsg.symbolName;
    fnGetSelSymbolData(pObjMsg.symbolName);

    let objDate = new Date(objExpiry.value);
    let vDate = new Date();

    objDateToTime.value = objDate.getTime();
    let vRandId = vDate.valueOf();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    let vStrikeOption = parseInt(objDDLStrikeOption.value) * parseInt(objStrikeInterval.value);

    if(pObjMsg.direction === "PE"){
        vStrikeOption = -(vStrikeOption);
    }

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ ActualStrikeRate: objActualStrikePrice.value, CurrStrikeRate: objManualStrike.value, StrikeOption: vStrikeOption, ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value, BorS: "buy", CorP: pObjMsg.direction, Contract: objContract.value, Source: objSource.value, Symbol: objSymbol.value, DateToTime: objDateToTime.value }),
        redirect: 'follow'
        };

        fetch("/alice-blue/getExecutedTradeRate", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success")
            {
                let vQtyToTrade = parseInt(objManualLots.value) * parseInt(objManualQty.value);

                objManualStrikePrice.value = objResult.data.RoundedStrike;
                objActualStrikePrice.value = objResult.data.ActualStrike;
                objTradeToken.value = objResult.data.TradeToken;
                let vBestAsk = objResult.data.SellRate;
                let vBestBid = objResult.data.BuyPrice;
    
                let vTrailSL = 0;

                if(vBestAsk === null || vBestAsk === "")
                vBestAsk = 100;
                if(vBestBid === null || vBestBid === "")
                vBestBid = 100;
                
                vTrailSL = parseFloat(vBestAsk) - parseInt(objManualStopLoss.value);
                objManualTradePrice.value = vBestAsk;
                
                let vExcTradeDtls = {
                    TradeData: [{ TradeID: vRandId, Token: objTradeToken.value, ClientID: objClientId.value, Symbol: objSymbol.value, Expiry: objExpiry.value, Strike: objManualStrikePrice.value, ByorSl: "buy", OptionType: pObjMsg.direction, Quantity: vQtyToTrade, BuyPrice: vBestAsk, SellPrice: vBestBid, ProfitLoss: 0, StopLoss: objManualStopLoss.value, TakeProfit: objManualTakeProfit.value, TrailSL: vTrailSL, EntryDT: vToday, ExitDT: "", Exchange: objExchange.value, Contract: objContract.value, ExpVal: objDateToTime.value }]
                };

                let objExcTradeDtls = JSON.stringify(vExcTradeDtls);

                //console.log(objExcTradeDtls);

                if (objResult.data.ReqStatus == "Ok")
                {
                    localStorage.setItem("CurrPositionS", objExcTradeDtls);

                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                    fnClearTradedFields();
                    fnLoadTimerSwitchSetting();

                    //Check it needs to be removed Later
                    // fnSetCurrTradeSLTP();
                    //console.log(localStorage.getItem("CurrPositionS"));
                }
                else
                {
                    fnGenMessage("Option Code Not Found! No Trade Executed!", `badge bg-danger`, "spnGenMsg");
                }
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
                fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
        });
}

function fnSetCurrTradeSLTP(){
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");
    let objSymbol = document.getElementById("lblSymbol");
    let objExpiry = document.getElementById("lblExpiry");
    let objStrike = document.getElementById("lblStrike");
    let objOptionType = document.getElementById("lblOptionType");
    let objQuantity = document.getElementById("lblQty");
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let objStopLoss = document.getElementById("txtUpdStopLoss");
    let objTakeProfit = document.getElementById("txtUpdTakeProfit");
    let objEntryDate = document.getElementById("lblEntryDate");
    let objTrailSL = document.getElementById("lblTrailSL");
    let objLossOnSL = document.getElementById("lblLossOnSL");
    let objProfitOnTP = document.getElementById("lblProfitOnTP");
    let objCapital = document.getElementById("lblCapital");
    let objSellPriceInd = document.getElementById("lblSellPriceInd");
    objSellPriceInd.innerText = "CURR PRICE";

    let vNoLots = localStorage.getItem("QtyMul");

    //console.log("At fnSetCurrTradeSLTP: " + objCurrPosiLst);

    if (objCurrPosiLst === null){
        objSymbol.innerText = "";
        objExpiry.innerText = "";
        objStrike.innerText = "";
        objOptionType.innerText = "";
        objQuantity.innerText = "";
        objBuyPrice.innerText = "";
        objSellPrice.innerText = "";
        objProfitLoss.innerText = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";
        objEntryDate.innerText = "";
        objLossOnSL.innerText = "0.00";
        objProfitOnTP.innerText = "0.00";
        objCapital.innerText = "0.00";
    }
    else{
        let objDDLTrailSLTP = document.getElementById("ddlTrailSLTP");
        let objCurrTrade = JSON.parse(objCurrPosiLst);
        let vCurrBuyingPrice = objCurrTrade.TradeData[0].BuyPrice;
        let vCurrSellingPrice = objCurrTrade.TradeData[0].SellPrice;
        let vSLPoints = objCurrTrade.TradeData[0].StopLoss;
        let vTPPoints = objCurrTrade.TradeData[0].TakeProfit;
        let vSLPrice, vTPPrice = 0;
        let vTotQtyToTrade = parseFloat(objCurrTrade.TradeData[0].Quantity);
        let vTrailSLPrice = objCurrTrade.TradeData[0].TrailSL;
        let vPL = ((parseFloat(vCurrSellingPrice) - parseFloat(vCurrBuyingPrice)) * parseFloat(vTotQtyToTrade)).toFixed(2);

        objEntryDate.innerText = objCurrTrade.TradeData[0].EntryDT;
        objSymbol.innerText = objCurrTrade.TradeData[0].Symbol;
        objExpiry.innerText = objCurrTrade.TradeData[0].Expiry;
        objStrike.innerText = objCurrTrade.TradeData[0].Strike;
        objOptionType.innerText = objCurrTrade.TradeData[0].OptionType;

        objQuantity.innerText = parseFloat(vTotQtyToTrade).toFixed(0);
        objBuyPrice.innerText = parseFloat(vCurrBuyingPrice).toFixed(2);
        objSellPrice.innerText = parseFloat(vCurrSellingPrice).toFixed(2);
        objProfitLoss.innerText = vPL;

        objStopLoss.value = vSLPoints;
        objTakeProfit.value = vTPPoints;

        if(objDDLTrailSLTP.value === "1") {
            //Strict SL & TP
            vSLPrice = parseFloat(vCurrBuyingPrice) - parseFloat(vSLPoints);
            vTPPrice = parseFloat(vCurrBuyingPrice) + parseFloat(vTPPoints);

            objTrailSL.innerText = "NO T-SL";
            objLossOnSL.innerText = -(parseFloat(vSLPoints) * parseFloat(vTotQtyToTrade)).toFixed(2);
            objProfitOnTP.innerText = (parseFloat(vTPPoints) * parseFloat(vTotQtyToTrade)).toFixed(2);
            objCapital.innerText = (parseFloat(vCurrBuyingPrice) * parseFloat(vTotQtyToTrade)).toFixed(2);

            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            //It is Important to Not to Save CurrPositionS After fnCloseTrade Function
            let objExcTradeDtls = JSON.stringify(objCurrTrade);
            localStorage.setItem("CurrPositionS", objExcTradeDtls);

            if((vCurrSellingPrice <= vSLPrice) || (vCurrSellingPrice >= vTPPrice)){
                fnCloseTrade();
            }
        }
        else if(objDDLTrailSLTP.value === "2"){
            //Trail by SL Points
            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            if(parseFloat(vCurrSellingPrice) >= (parseFloat(vTrailSLPrice) + parseFloat(vSLPoints)) && (parseFloat(vCurrSellingPrice) > (parseFloat(vCurrBuyingPrice) + parseFloat(vSLPoints)))){
                vTrailSLPrice = parseFloat(vCurrSellingPrice) - parseFloat(vSLPoints);
                objCurrTrade.TradeData[0].TrailSL = vTrailSLPrice;

                //It is Important Not to Save CurrPositionS After fnCloseTrade Function
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);
            }

            objTrailSL.innerText = parseFloat(vTrailSLPrice).toFixed(2);
            objLossOnSL.innerText = ((parseFloat(vTrailSLPrice) - parseFloat(vCurrBuyingPrice)) * parseFloat(vTotQtyToTrade)).toFixed(2);
            objProfitOnTP.innerText = "Trailling";
            objCapital.innerText = (parseFloat(vCurrBuyingPrice) * parseFloat(vTotQtyToTrade)).toFixed(2);
            
            if(parseFloat(vCurrSellingPrice) <= parseFloat(vTrailSLPrice)){
                //It is Important, Not to Save CurrPositionS After fnCloseTrade Function
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);

                fnCloseTrade();
            }
        }
        else if(objDDLTrailSLTP.value === "3"){
            //Trail SL After TP
            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            if(parseFloat(vCurrSellingPrice) >= (parseFloat(vTrailSLPrice) + parseFloat(vSLPoints)) && (parseFloat(vCurrSellingPrice) >= (parseFloat(vCurrBuyingPrice) + parseFloat(vTPPoints)))){
                vTrailSLPrice = parseFloat(vCurrSellingPrice) - parseFloat(vSLPoints);
                objCurrTrade.TradeData[0].TrailSL = vTrailSLPrice;
                //It is Important, Not to Save CurrPositionS After fnCloseTrade Function
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);
            }

            objTrailSL.innerText = parseFloat(vTrailSLPrice).toFixed(2);
            objLossOnSL.innerText = ((parseFloat(vTrailSLPrice) - parseFloat(vCurrBuyingPrice)) * parseFloat(vTotQtyToTrade)).toFixed(2);
            objProfitOnTP.innerText = "Trailling";
            objCapital.innerText = (parseFloat(vCurrBuyingPrice) * parseFloat(vTotQtyToTrade)).toFixed(2);
            
            if(parseFloat(vCurrSellingPrice) <= parseFloat(vTrailSLPrice)){
                //It is Important to Not to Save CurrPositionS After fnCloseTrade Function
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);

                fnCloseTrade();
            }
        }
        else if(objDDLTrailSLTP.value === "4"){
            let vLossPoints = (Math.abs(localStorage.getItem("TotLossAmt")))/objCurrTrade.TradeData[0].Quantity;
            let vBufferAmt = (parseFloat(vLossPoints) * 20)/100;
            let vFirstTSL = parseFloat(vLossPoints) + parseFloat(vBufferAmt);

            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            // console.log("Loss Points: " + vLossPoints);
            // console.log("vFirstTSL: " + vFirstTSL);
            // console.log("Curr PL: " + vPL);

            if(parseFloat(vCurrSellingPrice) >= (parseFloat(vTrailSLPrice) + parseFloat(vSLPoints)) && (parseFloat(vCurrSellingPrice) > (parseFloat(vCurrBuyingPrice) + parseFloat(vSLPoints)))){
                vTrailSLPrice = parseFloat(vCurrSellingPrice) - parseFloat(vSLPoints);
                objCurrTrade.TradeData[0].TrailSL = vTrailSLPrice;

                //It is Important Not to Save CurrPositionS After fnCloseTrade Function
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);
            }
            else if((parseFloat(vCurrSellingPrice) >= (parseFloat(vCurrBuyingPrice) +  vFirstTSL)) && (parseFloat(vLossPoints) > 0)){
                vTrailSLPrice = parseFloat(vCurrBuyingPrice) + parseFloat(vFirstTSL);
                objCurrTrade.TradeData[0].TrailSL = vTrailSLPrice;
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);
                // console.log("Else condition");
            }

            objTrailSL.innerText = parseFloat(vTrailSLPrice).toFixed(2);
            objLossOnSL.innerText = ((parseFloat(vTrailSLPrice) - parseFloat(vCurrBuyingPrice)) * parseFloat(vTotQtyToTrade)).toFixed(2);
            objProfitOnTP.innerText = "Trailling";
            objCapital.innerText = (parseFloat(vCurrBuyingPrice) * parseFloat(vTotQtyToTrade)).toFixed(2);
            
            if(parseFloat(vCurrSellingPrice) <= parseFloat(vTrailSLPrice)){
                //It is Important to Not to Save CurrPositionS After fnCloseTrade Function
                let objExcTradeDtls = JSON.stringify(objCurrTrade);
                localStorage.setItem("CurrPositionS", objExcTradeDtls);

                fnCloseTrade();
            }
        }
        else {
            //No SL or TP
            objTrailSL.innerText = "NO T-SL";
            objLossOnSL.innerText = "NO SL";
            objProfitOnTP.innerText = "NO TP";
            
            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            let objExcTradeDtls = JSON.stringify(objCurrTrade);
            localStorage.setItem("CurrPositionS", objExcTradeDtls);
        }
    }
    // console.log("Res: " + localStorage.getItem("CurrPositionS"));
}

function fnResetOpenPositionDetails(){
    let objSymbol = document.getElementById("lblSymbol");
    let objExpiry = document.getElementById("lblExpiry");
    let objStrike = document.getElementById("lblStrike");
    let objOptionType = document.getElementById("lblOptionType");
    let objQuantity = document.getElementById("lblQty");
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let objStopLoss = document.getElementById("txtUpdStopLoss");
    let objTakeProfit = document.getElementById("txtUpdTakeProfit");
    let objEntryDate = document.getElementById("lblEntryDate");
    let objTrailSL = document.getElementById("lblTrailSL");
    let objLossOnSL = document.getElementById("lblLossOnSL");
    let objProfitOnTP = document.getElementById("lblProfitOnTP");
    let objCapital = document.getElementById("lblCapital");
    let objBuyPriceInd = document.getElementById("lblBuyPriceInd");
    let objSellPriceInd = document.getElementById("lblSellPriceInd");
 
    objSymbol.innerText = "SYMBOL NAME";
    objExpiry.innerText = "YYYY-MM-DD";
    objStrike.innerText = "000000";
    objOptionType.innerText = "OT";
    objQuantity.innerText = "0";
    objBuyPrice.innerText = "0.00";
    objSellPrice.innerText = "0.00";
    objProfitLoss.innerText = "0.00";
    objStopLoss.value = "";
    objTakeProfit.value = "";
    objEntryDate.innerText = "00-00-0000 00:00:00";
    objTrailSL.innerText = "0.00";
    objLossOnSL.innerText = "0.00";
    objProfitOnTP.innerText = "0.00";
    objCapital.innerText = "0.00";
    objBuyPriceInd.innerText = "BUY PRICE";
    objSellPriceInd.innerText = "SELL PRICE";
}

function fnSetNextTradeSettings(pPL){
    let objLots = document.getElementById("txtManualLots");
    let vOldLossAmt = localStorage.getItem("TotLossAmt");
    let vOldQtyMul = localStorage.getItem("QtyMul");

    let vNewLossAmt = parseFloat(vOldLossAmt) + parseFloat(pPL);

    if(parseFloat(pPL) < 0) {
        localStorage.setItem("TotLossAmt", vNewLossAmt);
        let vNextQty = parseInt(vOldQtyMul) * 2;
        localStorage.setItem("QtyMul", vNextQty);
        objLots.value = vNextQty;

        fnSetTradeStep();
    }
    else if(parseFloat(vNewLossAmt) < 0) {
        localStorage.setItem("TotLossAmt", vNewLossAmt);
        let vDivAmt = parseFloat(vNewLossAmt) / parseFloat(vOldLossAmt);
        let vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));

        //alert(vDivAmt + " - " + vNewQty);
        //let vNextQty = Math.round(Math.abs(parseFloat(vNewLossAmt)) / Math.abs(parseFloat(vOldLossAmt))) * parseFloat(vOldQtyMul);

        // console.log("New Loss: " + Math.abs(parseFloat(vNewLossAmt)));
        // console.log("Old Loss: " + Math.abs(parseFloat(vOldLossAmt)));
        // console.log("New Loss: " + parseFloat(vOldQtyMul));
        // console.log("vNextQty:  " + vNextQty);
        
        if(vNextQty < 1)
            vNextQty = 1;

        localStorage.setItem("QtyMul", vNextQty);
        objLots.value = vNextQty;

        fnSetTradeStep();
    }
    else {
        localStorage.setItem("TotLossAmt", 0);
        localStorage.setItem("QtyMul", 1);
        localStorage.setItem("TradeStep", 0);
        objLots.value = 1;
    }
}

function fnChangeQtyMultiplier(pThis){
    localStorage.setItem("QtyMul", pThis.value);
}

function fnSetTradeStep(){
    let vTradeStep = localStorage.getItem("TradeStep");

    if(localStorage.getItem("isAutoTrader") === "true") {
        vTradeStep++;

        if(vTradeStep < 6)
        {
            localStorage.setItem("TradeStep", vTradeStep);
        }
        else
        {
            localStorage.setItem("TradeStep", 0);
        }
    }
}

function fnTestMe(){
    console.log("TotLossAmt - " + localStorage.getItem("TotLossAmt"));
    console.log("TradeStep - " + localStorage.getItem("TradeStep"));
    console.log("QtyMul - " + localStorage.getItem("QtyMul"));
}
