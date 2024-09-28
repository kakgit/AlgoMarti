let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){
    // const ws = new WebSocket("wss://ws1.aliceblueonline.com/NorenWS");

    getSymbolsDataFile();

    fnLoadCnfStatus();

    fnGetSymbolList();

    fnGetSetAllStatus();

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
        //console.log(pMsg);
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

function fnChangeStartLotNos(pThisVal){

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNo", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNo", 1);
    }
    else{
        fnGenMessage("No of Lots to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartLotNo", pThisVal.value);
    }
}

function fnCheckTradeStep(pObjMsg)
{
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

function fnGetSetAllStatus()
{
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
        $('#mdlAppLogin').modal('show');
    }

    fnGetSetTraderLoginStatus();
    fnGetSetAutoTraderStatus();
    fnGetSetRealTradeStatus();
    fnLoadDefaultSLTP();
    fnSetLotsByQtyMulLossAmt();
    fnLoadTimerSwitchSetting();
    fnSetDefaultLotNos();

    //fnSetCurrentTradeDetails();
    fnSetTodayTradeDetails();
}

function fnLoadDefaultSLTP()
{
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

function fnSetUserProfileDets()
{
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let objUserDets = localStorage.getItem("UserDetS");
    let objClientId = document.getElementById("txtClientIdUP");
    let objFullName = document.getElementById("txtFullNameUP");
    let objMobileNumber = document.getElementById("txtClientMobileUP");
    let objEmailId = document.getElementById("txtClientEmailUP");
    let objStatus = document.getElementById("txtClientStatusUP");
    let objRealMargin = document.getElementById("txtRealMarginUP");
    let objPaperMargin = document.getElementById("txtPaperMarginUP");

    if(isLsTraderLogin === "true") {
        if (objUserDets == null || objUserDets == ""){
        //Empty all Fields
        objClientId.value = "";
        objFullName.value = "";
        objMobileNumber.value = "";
        objEmailId.value = "";
        objStatus.value = "";
        objRealMargin.value = 0;
        }
        else{
        //Fill all Fields
        let vExistingData = JSON.parse(objUserDets);

        objClientId.value = vExistingData.ClientId;
        objFullName.value = vExistingData.FullName;
        objMobileNumber.value = vExistingData.Mobile;
        objEmailId.value = vExistingData.EmailId;
        objStatus.value = vExistingData.Status;
        objRealMargin.value = vExistingData.CashMargin;
        objPaperMargin.value = vExistingData.PaperMargin;
        }
        //fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else {
        //Empty all Fields
        objClientId.value = "";
        objFullName.value = "";
        objMobileNumber.value = "";
        objEmailId.value = "";
        objStatus.value = "";
        objRealMargin.value = 0;
    }
}

function fnSetDefaultLotNos(){
    let vStartLots = localStorage.getItem("StartLotNo");
    let objTxtLots = document.getElementById("txtStartLotNos");

    if(vStartLots === null || vStartLots === "" || vStartLots === "0"){
        localStorage.setItem("StartLotNo", 1);
        objTxtLots.value = 1;
    }
}

function fnSetLotsByQtyMulLossAmt()
{
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

function fnLoadTimerSwitchSetting()
{
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

function fnSetTodayTradeDetails()
{
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

function fnDeleteThisTrade(pTradeId)
{
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

function fnCheckTradeTimer() {
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

function getSymbolsDataFile(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
    method: 'POST',
    headers: vHeaders,
    body: "", //JSON.stringify({ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value}),
    redirect: 'follow'
    };

    fetch("/alice-blue/getJsonFiles", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success")
        {
            console.log(objResult.data);
            localStorage.setItem("SymbolListS", objResult.data);
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
            fnGenMessage("Error in JSON Data, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to fetch JSON Data", `badge bg-danger`, "spnGenMsg");
    });
}

function fnUploadFiles()
{
    const objFiles = document.getElementById("flsSelectFiles");
    const objFormData = new FormData();

    if(objFiles.files.length === 0)
    {
        fnGenMessage("Please Select a File to Upload!", `badge bg-danger`, "spnSettingsMsg");
    }
    else
    {
        for(let i=0; i<objFiles.files.length; i++)
        {
            objFormData.append("files", objFiles.files[i]);
        }
    
        //console.log(...objFormData);
    
        fetch("/uploadsAB", {
            method: 'POST',
            body: objFormData
        })
        .then(res => res.json())
        .then(result => {
            //console.log(result);
            fnGenMessage(result.status, `badge bg-${result.status}`, "spnSettingsMsg");
        });
    }
}

function fnGetSetTraderLoginStatus()
{
    let lsPrevSessionDate = localStorage.getItem("lsLoginDate");
    let lsAliceBlueID = localStorage.getItem("lsAliceBlueID");
    let lsApiKey = localStorage.getItem("lsAliceBlueApiKey");
    let lsSessionID = localStorage.getItem("lsAliceBlueSession");
    let objClientId = document.getElementById("txtClientId");
    let objApiKey = document.getElementById("txtApiKey");
    let objSession = document.getElementById("hidSession");
    
    let objTraderStatus = document.getElementById("btnTraderStatus");

    const vDate = new Date();
    let vToday = vDate.getDate();

    objClientId.value = lsAliceBlueID;
    objApiKey.value = lsApiKey;
    objSession.value = lsSessionID;

    if (lsPrevSessionDate != (vToday) || objClientId.value == "") {
        localStorage.removeItem("lsAliceBlueSession", "");
        objSession.value = "";
    }

    if (objSession.value == "") {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
        localStorage.setItem("isTraderLogin", false);
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        localStorage.setItem("isTraderLogin", true);
    }
}

function fnGetSetAutoTraderStatus()
{
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");

    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsTraderLogin === "true" && isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
    }
}

function fnGetSetRealTradeStatus(){
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let isLsRealTrade = localStorage.getItem("isRealTrade");

    let objRealTradeStatus = document.getElementById("btnRealTradeStatus");

    if(isLsTraderLogin === "true" && isLsRealTrade === "true")
    {
        fnChangeBtnProps(objRealTradeStatus.id, "badge bg-warning", "Real Trade - ON");
    }
    else
    {
        fnChangeBtnProps(objRealTradeStatus.id, "badge bg-success", "Paper Trade - ON");
    }
}

function fnToggleRealTrade(){
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let isLsRealTrade = localStorage.getItem("isRealTrade");

    let objRealTradeStatus = document.getElementById("btnRealTradeStatus");

    if(isLsRealTrade === null || isLsRealTrade === "false"){
        if(isLsTraderLogin === "true"){
            fnChangeBtnProps(objRealTradeStatus.id, "badge bg-warning", "Real Trade - ON");
            fnGenMessage("Real Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isRealTrade", true);
        }
        else
        {
            fnGenMessage("Login to Trading Account to Start Real Trades", `badge bg-warning`, "spnGenMsg");
            localStorage.setItem("isRealTrade", false);
        }
    }
    else{
        fnChangeBtnProps(objRealTradeStatus.id, "badge bg-success", "Paper Trade - ON");
        fnGenMessage("Real Trading Mode is Off!", `badge bg-danger`, "spnGenMsg");
        localStorage.setItem("isRealTrade", false);
    }
}

function fnToggleAutoTrader()
{
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === null || isLsAutoTrader === "false")
    {
        if(isLsTraderLogin === "true")
        {
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoTrader", true);
        }
        else
        {
            fnGenMessage("Login to Trading Account to Activate Auto Trader", `badge bg-warning`, "spnGenMsg");
            localStorage.setItem("isAutoTrader", false);
        }
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
        localStorage.setItem("isAutoTrader", false);
    }
}

function fnShowTraderLoginMdl(objThis)
{
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

function fnLoginAliceBlue()
{
    let objClientId = document.getElementById("txtClientId");
    let objApiKey = document.getElementById("txtApiKey");
    let objEncKey = document.getElementById("hidEncKey");
    let objSession = document.getElementById("hidSession");
    
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ClientID" : objClientId.value,
        "ApiKey" : objApiKey.value
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    if(objClientId.value === "")
    {
        fnGenMessage("Please Enter Client ID", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objApiKey.value === "")
    {
        fnGenMessage("Please Enter API KEY", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else
    {
        fetch("/alice-blue/getSession", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            //console.log(objResult);
            if(objResult.status === "success")
            {
                //console.log(objResult);
                objEncKey.value = objResult.data.EncKey;
                objSession.value = objResult.data.Session;
    
                localStorage.setItem("lsAliceBlueID", objClientId.value);
                localStorage.setItem("lsAliceBlueApiKey", objApiKey.value);
                localStorage.setItem("lsAliceBlueSession", objSession.value);

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsLoginDate", vToday);
                localStorage.setItem("isTraderLogin", true);
                let objUserDets = localStorage.getItem("UserDetS");

                if (objUserDets == null || objUserDets == "") {
                    let vUserDet = { ClientId: objResult.data.accountId, FullName: objResult.data.accountName, Mobile: objResult.data.cellAddr, EmailId: objResult.data.emailAddr, Status: objResult.data.accountStatus, CashMargin: objResult.data.dataMargins.cashmarginavailable, PaperMargin: 500000 };
                    let vFirstTime= JSON.stringify(vUserDet);
                    localStorage.setItem("UserDetS", vFirstTime);
                }
                else {
                    let vExistingData = JSON.parse(objUserDets);
            
                    vExistingData.ClientId = objResult.data.accountId;
                    vExistingData.FullName = objResult.data.accountName;
                    vExistingData.Mobile = objResult.data.cellAddr;
                    vExistingData.EmailId = objResult.data.emailAddr;
                    vExistingData.Status = objResult.data.accountStatus;
                    vExistingData.CashMargin = objResult.data.dataMargins.cashmarginavailable;
            
                    let vUpdData = JSON.stringify(vExistingData);
                    localStorage.setItem("UserDetS", vUpdData);
                }

                fnSetUserProfileDets();
                fnChangeBtnProps("btnTraderStatus", "badge bg-success", "TRADER - Connected");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                getSymbolsDataFile();
                $('#mdlAliceLogin').modal('hide');
            }
            else if(objResult.status === "danger")
            {
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnAliceBlueLogin");
            }
            else if(objResult.status === "warning")
            {
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnAliceBlueLogin");
            }
            else
            {
                fnClearPrevLoginSession();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnAliceBlueLogin");
            }
        })
        .catch(error => {
            fnClearPrevLoginSession();
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnAliceBlueLogin");
        });
    }
}

function fnClearLocalStorageTemp()
{
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
    // console.log(localStorage.getItem("CurrPositionS"));
    // console.log(localStorage.getItem("TradesListS"));

    fnSetTodayTradeDetails();
    fnSetUserProfileDets();
}

function fnClearPrevLoginSession()
{
    let objSession = document.getElementById("hidSession");

    localStorage.removeItem("lsLoginDate");
    localStorage.removeItem("lsAliceBlueSession");
    localStorage.removeItem("isTraderLogin");
    localStorage.removeItem("isAutoTrader");
    localStorage.removeItem("UserDetS");

    objSession.value = "";

    fnGetSetTraderLoginStatus();
    fnSetUserProfileDets();
}

function fnSendMessageToAll()
{
    const objMsg = document.getElementById("txtMessageToAll");

    socket.emit("UserMessage", objMsg.value);

    objMsg.value = "";
}

function fnUpdateSymbolsForAll(){
    socket.emit("SymbolsUpdated", "Updated Ur Symbol!");
}

function fnExecTradeToAll(pSymbol, pDirec){
    const objMsg = JSON.stringify({ symbolName: pSymbol, indType: 'Test', direction: pDirec, strike: '', cnf: 'cnf1' });

    socket.emit("SendTrdToAll", objMsg);
}

function fnClearMessage()
{
    const objDivMsgs = document.getElementById("divMessages");

    objDivMsgs.innerHTML = "";
}

function fnLoadCnfStatus()
{
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

function fnGetUserProfileDets()
{
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

function fnShowHideMarginData()
{
    let objDivMarginData = document.getElementById("divMarginData");

    if(objDivMarginData.style.display === "none")
        {
            objDivMarginData.style.display = "block";
        }
    else
        {
            objDivMarginData.style.display = "none";
        }
}

function fnSaveConfirmations(pFrm, pSymName, pStatus)
{
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

function fnShowSettingsMdl()
{
    $('#mdlSettingsAB').modal('show');
}

function fnShowMyProfileMdl()
{
    fnGenMessage("Profile Details", `badge bg-primary`, "spnABProfile");
    $('#mdlUserProfile').modal('show');

    //console.log("Profile - " + localStorage.getItem("UserDetS"));
}

function fnSaveProfileDetails()
{
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

function fnAddEditSymbolDetails()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objGDispMessage = document.getElementById("spnSettingsMsg");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objExchange = document.getElementById("ddlExchange");
    var objContracts = document.getElementById("ddlContracts");
    var objEditCB = document.getElementById("swtEditSymbol");

    var objSybLst = localStorage.getItem("SymbolListS");

    if (objSymName.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Symbol Name!";
    }
    else if (objTradeName.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Index Name!";
    }
    else if (objToken.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Token No!";
    }
    else if (objLotSize.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Lot Size!";
    }
    else if (objStrikeInterval.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Strike Interval!";
    }
    else if ((objSybLst == null) || (objSybLst == "")) {
        const vSymDet = { Symbol: [{ SymbolName: objSymName.value, TradeName: objTradeName.value, Token: objToken.value, Exchange: objExchange.options[objExchange.selectedIndex].text, Contract: objContracts.value, LotSize: objLotSize.value, StrikeInterval: objStrikeInterval.value, StopLoss: objStopLoss.value, TakeProfit: objTakeProfit.value, ExpiryDates: [] }] };
        var vFirstItem = JSON.stringify(vSymDet);
        localStorage.setItem("SymbolListS", vFirstItem);

        //Save to DB code Here
        fnSaveSymbolAttrToDB(vFirstItem);

        //console.log(localStorage.getItem("SymbolListS"));
        objGDispMessage.className = "badge bg-success";
        objGDispMessage.innerText = objSymName.value + " Symbol Details Added!";
        objSymName.value = "";
        objTradeName.value = "";
        objToken.value = "";
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";

        fnGetSymbolList();
    }
    else
    {
        var vExistingData = JSON.parse(objSybLst);

        if (objEditCB.checked == true) {
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol[i].SymbolName = objSymName.value;
                    vExistingData.Symbol[i].TradeName = objTradeName.value;
                    vExistingData.Symbol[i].Token = objToken.value;
                    vExistingData.Symbol[i].Exchange = objExchange.options[objExchange.selectedIndex].text;
                    vExistingData.Symbol[i].Contract = objContracts.value;
                    vExistingData.Symbol[i].LotSize = objLotSize.value;
                    vExistingData.Symbol[i].StrikeInterval = objStrikeInterval.value;
                    vExistingData.Symbol[i].StopLoss = objStopLoss.value;
                    vExistingData.Symbol[i].TakeProfit = objTakeProfit.value;
                }
            }
            var vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);

            //console.log(localStorage.getItem("SymbolListS"));
            objEditCB.checked = false;
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelSym.value + " Symbol Details Edited!";
        }
        else {
            vExistingData.Symbol.push({ SymbolName: objSymName.value, TradeName: objTradeName.value, Token: objToken.value, Exchange: objExchange.options[objExchange.selectedIndex].text, Contract: objContracts.value, LotSize: objLotSize.value, StrikeInterval: objStrikeInterval.value, StopLoss: objStopLoss.value, TakeProfit: objTakeProfit.value, ExpiryDates: [] });
            var vAddlItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vAddlItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vAddlItems);

            //console.log(localStorage.getItem("SymbolListS"));
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSymName.value + " Symbol Details Added!";
        }
        objSymName.value = "";
        objTradeName.value = "";
        objToken.value = "";
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";

        document.getElementById("ddlManualSymbol").value = "";

        $('#ddlManualSymbol').change();

        fnGetSymbolList();
    }
}

function fnAddEditExpiryDetails()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value == "") {
        objGDispMessage.className = "badge bg-warning";
        objGDispMessage.innerText = "Please Select Symbol to Add Expiry Date!";
    }
    else if (objExpDate.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Expiry Date!";
    }
    else {
        var vExistingData = JSON.parse(objSybLst);
        if (objEditCB.checked == true) {
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    for (var j = 0; j < vExistingData.Symbol[i].ExpiryDates.length; j++) {
                        if (vExistingData.Symbol[i].ExpiryDates[j] == objSelExp.value) {
                            vExistingData.Symbol[i].ExpiryDates[j] = objExpDate.value;
                        }
                    }
                }
            }
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objExpDate.value + " Expiry Date Updated!";
            objEditCB.checked = false;
        }
        else {
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol[i].ExpiryDates.push(objExpDate.value);
                }
            }
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objExpDate.value + " Expiry Date Added!";
        }
        var vAddlItems = JSON.stringify(vExistingData);
        localStorage.setItem("SymbolListS", vAddlItems);

        //Save to DB code Here
        fnSaveSymbolAttrToDB(vAddlItems);
        //console.log(localStorage.getItem("SymbolListS"));

        objExpDate.value = "";

        fnGetExpiryList();
    }
}

function fnGetSymbolList() {
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelManSym = document.getElementById("ddlManualSymbol");

    var objSybLst = localStorage.getItem("SymbolListS");

    objSybLst = JSON.parse(objSybLst);
    //console.log(objSybLst);

    objSelSym.innerHTML = "";

    objSelSym.innerHTML = "<option value=''>Select Symbol</option>";
    objSelManSym.innerHTML = "<option value=''>Select Symbol</option>"
    if (objSybLst != null) {
        for (var i = 0; i < objSybLst.Symbol.length; i++) {
            var vVal = objSybLst.Symbol[i].SymbolName;
            var vDispName = objSybLst.Symbol[i].TradeName;
            
            objSelSym.innerHTML += "<option value=\"" + vVal + "\">" + vDispName + "</option>";
            objSelManSym.innerHTML += "<option value=\"" + vVal + "\">" + vDispName + "</option>";
        }
        fnGetExpiryList();
    }
}

function fnGetExpiryList()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objHidLotSize = document.getElementById("txtHidLotSize");
    var objEditCB = document.getElementById("swtEditSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objSelManExp = document.getElementById("ddlManualExpiry");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objExpEditCB = document.getElementById("swtEditExpiry");
    var objExpiryDate = document.getElementById("txtExpiryDate");

    objSymName.value = "";
    objTradeName.value = "";
    objToken.value = "";
    objHidLotSize.value = "";
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";
    objEditCB.checked = false;
    objExpiryDate.value = "";
    objExpEditCB.checked = false;

    objSybLst = JSON.parse(objSybLst);

    objSelExp.innerHTML = "";
    objSelExp.innerHTML = "<option value=''>Select Expiry</option>";
    objSelManExp.innerHTML = "<option value=''>Select Expiry</option>";

    if (objSybLst != null) {
        for (var i = 0; i < objSybLst.Symbol.length; i++) {
            if (objSybLst.Symbol[i].SymbolName == objSelSym.value) {
                objHidLotSize.value = objSybLst.Symbol[i].LotSize;
                for (var j = 0; j < objSybLst.Symbol[i].ExpiryDates.length; j++) {
                    var vOption = objSybLst.Symbol[i].ExpiryDates[j];
                    objSelExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                    objSelManExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                }
            }
        }
    }
}

function fnEditSymbol()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objExchange = document.getElementById("ddlExchange");
    var objContracts = document.getElementById("ddlContracts");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditSymbol");

    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value === "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Select Symbol to Edit!";

        objEditCB.checked = false;
    }
    else {
        objSybLst = JSON.parse(objSybLst);
        if (objSybLst != null && objEditCB.checked == true) {
            for (var i = 0; i < objSybLst.Symbol.length; i++) {
                if (objSybLst.Symbol[i].SymbolName == objSelSym.value) {
                    objSymName.value = objSybLst.Symbol[i].SymbolName;
                    objTradeName.value = objSybLst.Symbol[i].TradeName;
                    objToken.value = objSybLst.Symbol[i].Token;
                    objExchange.options[objExchange.selectedIndex].text = objSybLst.Symbol[i].Exchange;
                    objContracts.value = objSybLst.Symbol[i].Contract;
                    objLotSize.value = objSybLst.Symbol[i].LotSize;
                    objStrikeInterval.value = objSybLst.Symbol[i].StrikeInterval;
                    objStopLoss.value = objSybLst.Symbol[i].StopLoss;
                    objTakeProfit.value = objSybLst.Symbol[i].TakeProfit;
                }
                //alert(objSybLst.Symbol[i].SymbolName);
            }
            objGDispMessage.className = "badge bg-warning";
            objGDispMessage.innerText = "Editing Symbol Details!";
        }
        else {
            objSymName.value = "";
            objTradeName.value = "";
            objToken.value = "";
            objLotSize.value = "";
            objStrikeInterval.value = "";
            objStopLoss.value = "";
            objTakeProfit.value = "";
        }
    }
}

function fnEditExpiry()
{
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelExp.value == "") {
        objGDispMessage.className = "badge bg-warning";
        objGDispMessage.innerText = "Please Select Expiry Date to Edit!";
        objEditCB.checked = false;
    }
    else {
        if (objEditCB.checked == true) {
            objExpDate.value = objSelExp.value;
            objGDispMessage.className = "badge bg-warning";
            objGDispMessage.innerText = "Editing Expiry Date!";
        }
        else {
            objExpDate.value = "";
        }
    }
}

function fnDeleteSymbol()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditSymbol");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value === "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Select Symbol to Delete!";
        //alert("Please Select Symbol to Delete!");
        objEditCB.checked = false;
    }
    else {
        if (confirm("Do You Want To Delete " + objSelSym.value + " Data?")) {
            var vExistingData = JSON.parse(objSybLst);
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol.splice(i, 1);
                }
            }
            var vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);
            //console.log(localStorage.getItem("SymbolListS"));

            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelSym.value + " Details Deleted!";
            objSymName.value = "";
            objTradeName.value = "";
            objToken.value = "";
            objLotSize.value = "";
            objStrikeInterval.value = "";
            objStopLoss.value = "";
            objTakeProfit.value = "";
            objEditCB.checked = false;
            fnGetSymbolList();
        }
    }
}

function fnDeleteExpiry()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelExp.value == "") {
        objGDispMessage.className = "badge bg-warning";
        objGDispMessage.innerText = "Please Select Expiry Date to Delete!";
        objEditCB.checked = false;
    }
    else {
        if (confirm("Do You Want To Delete " + objSelExp.value + " ?")) {
            var vExistingData = JSON.parse(objSybLst);
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    for (var j = 0; j < vExistingData.Symbol[i].ExpiryDates.length; j++) {
                        if (vExistingData.Symbol[i].ExpiryDates[j] == objSelExp.value) {
                            vExistingData.Symbol[i].ExpiryDates.splice(j, 1);
                        }
                    }
                }
            }
            var vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);
            //console.log(localStorage.getItem("SymbolListS"));
            
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelExp.value + " Expiry Date Deleted!";
            objExpDate.value = "";
            objEditCB.checked = false;
            fnGetExpiryList();
        }
    }
}

function fnChangeContracts(pThis) {
    var objSelContract = document.getElementById("ddlContracts");

    objSelContract.value = pThis.value;
}

function fnResetAllDetails()
{
    var objExpEditCB = document.getElementById("swtEditExpiry");
    var objExpiryDate = document.getElementById("txtExpiryDate");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objEditCB = document.getElementById("swtEditSymbol");

    objSymName.value = "";
    objTradeName.value = "";
    objToken.value = "";
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";
    objExpiryDate.value = "";
    objEditCB.checked = false;
    objExpEditCB.checked = false;
}

function fnDeleteLocalStorageSymbol()
{
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    const vSymDet = { Symbol: [] };
    var vFirstItem = JSON.stringify(vSymDet);

    //Save to DB code Here
    fnSaveSymbolAttrToDB(vFirstItem);

    localStorage.setItem("SymbolListS", vFirstItem);

    var objSymName = document.getElementById("txtSymbolName");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objHidLotSize = document.getElementById("txtHidLotSize");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");

    objSymName.value = "";
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objHidLotSize.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";

    fnGetSymbolList();

    objGDispMessage.className = "badge bg-success";
    objGDispMessage.innerText = "All Symbol Date Removed!";
    //console.log(localStorage.getItem("SymbolListS"));
    // console.log("All Symbol Date Removed & Set to NULL");    
}

function fnSaveSymbolAttrToDB(pSymbolDetails)
{
    let vAction = JSON.stringify({
        "jsonName" : "abSymbs",
        "JsonStr" : pSymbolDetails,
        "JsonFileName" : "abSymbols.json"
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
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnSettingsMsg");
        }
        else if(result.status === "warning")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnSettingsMsg");
        }
        else
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnSettingsMsg");
            fnUpdateSymbolsForAll();
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("ErrorC: Unable to Update JSON Details.", `badge bg-danger`, "spnSettingsMsg");
    });
}

function fnGetSelSymbolData(pSymbolVal)
{
    let objSelExp = document.getElementById("ddlManualExpiry");
    let objSybLst = localStorage.getItem("SymbolListS");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objToken = document.getElementById("hidToken");
    let objManualTradePrice = document.getElementById("txtManualTradePrice");
    let objLotSize = document.getElementById("txtManualBuyQty");
    let objStopLoss = document.getElementById("txtManualStopLoss");
    let objTakeProfit = document.getElementById("txtManualTakeProfit");
    let objExchange = document.getElementById("hidExchange");
    let objContract = document.getElementById("hidContract");
    let objManualStrike = document.getElementById("txtManualStrike");
    let objActualStrike = document.getElementById("txtActualStrike");
    let objTradeToken = document.getElementById("hidTradeToken");
    let objDateToTime = document.getElementById("txtDateToTime");

    //console.log(objSybLst);
    objSybLst = JSON.parse(objSybLst);

    objSelExp.innerHTML = "";
    objManualStrike.value = "";
    objActualStrike.value = "";
    objManualTradePrice.value = "";
    objDateToTime.value = "";
    objTradeToken.value = "";
    //console.log(objSybLst);

    if (objSybLst != null)
    {
        for (var i = 0; i < objSybLst.Symbol.length; i++)
        {
            if (objSybLst.Symbol[i].SymbolName == pSymbolVal)
            {
                objToken.value = objSybLst.Symbol[i].Token;
                objLotSize.value = objSybLst.Symbol[i].LotSize;
                objStrikeInterval.value = objSybLst.Symbol[i].StrikeInterval;
                objStopLoss.value = objSybLst.Symbol[i].StopLoss;
                objTakeProfit.value = objSybLst.Symbol[i].TakeProfit;
                objExchange.value = objSybLst.Symbol[i].Exchange;
                objContract.value = objSybLst.Symbol[i].Contract;

                for (var j = 0; j < objSybLst.Symbol[i].ExpiryDates.length; j++) {
                    var vOption = objSybLst.Symbol[i].ExpiryDates[j];
                    objSelExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                }
            }
        }
    }
    if(pSymbolVal === "")
    {
        objToken.value = "";
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";
        objExchange.value = "";
        objContract.value = "";
        objSelExp.innerHTML = "<option value=\"\">Select Expiry</option>";
    }
}

function fnGetLiveRate()
{
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");
    let objSymbol = document.getElementById("ddlManualSymbol");
    let objExchange = document.getElementById("hidExchange");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objManualStrikePrice = document.getElementById("txtManualStrike");
    let objActualStrikePrice = document.getElementById("txtActualStrike");
    let objSelToken = document.getElementById("hidToken");

    if(objSession.value === "")
    {
        fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objSymbol.value === "")
    {
        fnGenMessage("Please Select Symbol to get Strike Price!", `badge bg-danger`, "spnGenMsg");
    }
    else
    {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value}),
        redirect: 'follow'
        };

        fetch("/alice-blue/getStrikePrice", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success")
            {
                //console.log(objResult);
                objManualStrikePrice.value = objResult.data.RoundedStrike;
                objActualStrikePrice.value = objResult.data.ActualStrike;
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
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnGenMsg");
        });

        //console.log(vAction);
    }
}

function fnGetCurrentPrice()
{
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

                        // console.log(localStorage.getItem("CurrPositionS"));
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

async function fnInitiateBuyManualTrade(pCEorPE)
{
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    //check if any position is Open. Only One Open trade is allowed here.
    if (objCurrPosiLst === null)
    {
        let isLsRealTrade = localStorage.getItem("isRealTrade");

        if(isLsRealTrade === "true"){
            fnExecRealTrade(pCEorPE);
        }
        else{
            fnExecPaperTrade(pCEorPE);
        }
    }
    else
    {
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnExecRealTrade(pCEorPE){
    console.log("Real Trade");
}

function fnExecPaperTrade(pCEorPE){
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
            body: JSON.stringify({ ActualStrikeRate: objActualStrikePrice.value, CurrStrikeRate: objManualStrike.value, ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value, BorS: "buy", CorP: pCEorPE, Contract: objContract.value, Source: objSource.value, Symbol: objSymbol.value, DateToTime: objDateToTime.value }),
            redirect: 'follow'
            };

            fetch("/alice-blue/getExecutedTradeRate", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {
                if(objResult.status === "success")
                {
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
                        TradeData: [{ TradeID: vRandId, Token: objTradeToken.value, ClientID: objClientId.value, Symbol: objSymbol.value, Expiry: objExpiry.value, Strike: objManualStrikePrice.value, ByorSl: "buy", OptionType: pCEorPE, Quantity: vQtyToTrade, BuyPrice: vBestAsk, SellPrice: vBestBid, ProfitLoss: 0, StopLoss: objManualStopLoss.value, TakeProfit: objManualTakeProfit.value, TrailSL: vTrailSL, EntryDT: vToday, ExitDT: "", Exchange: objExchange.value, Contract: objContract.value, ExpVal: objDateToTime.value }]
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

function fnClearTradedFields()
{
    let objSymbol = document.getElementById("ddlManualSymbol");

    objSymbol.value = "";
    fnGetSelSymbolData(objSymbol.value);
}

/* Change Later
This Function is called from "fnAPTGetCurrentPrice", "fnAPTGetStatus".
If Position is available, Displays the current trade details on the right side in AMT Page.
Calculates profit and loss as per Stop Loss and Take Profit and sends it "fnAPTUpdateTradeStatus" to further processing
*/
function fnSetCurrentTradeDetails()
{
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

function fnUpdateTradeStatus(pPL, pSLAmt, pTPAmt, pTrailSLAmt, pCurrBuyingPrice, pCurrSellingPrice, pBorS)
{
    let objLots = document.getElementById("txtManualLots");
    let objQty = document.getElementById("txtManualBuyQty");
    let objTSLChecked = document.getElementById("cbTrailingSL");
    let vTotLossAmt = localStorage.getItem("TotLossAmt");
    let vDiffLoss = parseInt(pPL) - Math.abs(parseInt(vTotLossAmt));
    let vTradeStep = localStorage.getItem("TradeStep");


    // console.log("SP: " + pCurrSellingPrice + " T-SL: " + pTrailSLAmt + " PL: " + pPL + " DiffLoss: " + vDiffLoss)
    // console.log("TP: " + pTPAmt)
    if (objTSLChecked.checked)
    {
        if (parseFloat(pCurrSellingPrice) <= parseFloat(pTrailSLAmt))
        {
            if (parseInt(pPL) < 0)
            {
                localStorage.setItem("TotLossAmt", parseInt(vTotLossAmt) + parseInt(pPL));
                let vNextQty = parseInt(objLots.value) * 2;
                localStorage.setItem("QtyMul", vNextQty);
                objLots.value = vNextQty;

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
            else if (parseInt(vDiffLoss) < 0)
            {
                localStorage.setItem("TotLossAmt", parseInt(vTotLossAmt) - parseInt(pPL));
                let vNextQty = Math.round(Math.abs(parseInt(vDiffLoss)) / Math.abs(parseInt(vTotLossAmt))) * parseInt(objLots.value);
                localStorage.setItem("QtyMul", vNextQty);
                objLots.value = vNextQty;

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
            else
            {
                localStorage.setItem("TotLossAmt", 0);
                localStorage.setItem("QtyMul", 1);
                localStorage.setItem("TradeStep", 0);
                objLots.value = 1;
            }
            fnCloseTrade();
        }
        else
        {
            fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        }
    }
    else
    {
        if (parseInt(pPL) >= parseInt(pTPAmt))
        {
            localStorage.setItem("QtyMul", 1);
            objLots.value = 1;

            localStorage.setItem("TradeStep", 0);

            fnCloseTrade();
        }
        else if (parseInt(pPL) <= parseInt(pSLAmt))
        {
            let vNextQty = parseInt(objLots.value) * 2;
            localStorage.setItem("QtyMul", vNextQty);
            objLots.value = vNextQty;

            vTradeStep++;

            if(vTradeStep < 6)
            {
                localStorage.setItem("TradeStep", vTradeStep);
            }
            else
            {
                localStorage.setItem("TradeStep", 0);
            }

            fnCloseTrade();
        }
        else
        {
            fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        }
    }
}

function fnUpdateSLTP()
{
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
function fnManualCloseTrade()
{
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
function fnCloseTrade()
{
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

function fnPositionStatus()
{
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("CurrPositionS") === null)
    {
        objBtnPosition.className = "badge bg-success";
        objBtnPosition.innerText = "No Open Position";
        fnGenMessage("No Open Positions!", `badge bg-success`, "spnGenMsg");
    }
    else
    {
        objBtnPosition.className = "badge bg-warning";
        objBtnPosition.innerText = "Position is open";
        fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");

        // if (confirm("Are You Sure, You Want to Close the Open Position?"))
        // {
        //     localStorage.removeItem("CurrPositionS");
        //     objBtnPosition.className = "badge bg-danger";
        //     objBtnPosition.innerText = "No Open Position";
        //     fnGenMessage("Position is Closed!", `badge bg-success`, "spnGenMsg");
        //     //fnSetCurrentTradeDetails();
        // }
        // else
        // {
        //     objBtnPosition.className = "badge bg-warning";
        //     objBtnPosition.innerText = "Position is open";
        //     fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");
        // }
    }
}

function fnInitiateAutoTrade(pObjMsg)
{
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    if (objCurrPosiLst === null){
        let objSession = document.getElementById("hidSession");

        if(objSession.value === ""){
            fnGenMessage("Signal Received! - But Trading Account is Not Connected!", `badge bg-danger`, "spnGenMsg");
        }
        else {
            let isLsRealTrade = localStorage.getItem("isRealTrade");
    
            if(isLsRealTrade === "true"){
                fnExecAutoRealTrade(pObjMsg);
            }
            else{
                fnExecAutoPaperTrade(pObjMsg);
            }
        }
    }
    else{
        fnGenMessage("Signal Received! - But a Position is still Open!", `badge bg-warning`, "spnGenMsg");
    } 
}

function fnExecAutoRealTrade(pObjMsg){
    console.log("Auto Real Trade");
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

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ ActualStrikeRate: objActualStrikePrice.value, CurrStrikeRate: objManualStrike.value, ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value, BorS: "buy", CorP: pObjMsg.direction, Contract: objContract.value, Source: objSource.value, Symbol: objSymbol.value, DateToTime: objDateToTime.value }),
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

            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            if(parseFloat(vCurrSellingPrice) >= (parseFloat(vTrailSLPrice) + parseFloat(vSLPoints)) && (parseFloat(vCurrSellingPrice) > (parseFloat(vCurrBuyingPrice) + parseFloat(vSLPoints)))){
                vTrailSLPrice = parseFloat(vCurrSellingPrice) - parseFloat(vSLPoints);
                objCurrTrade.TradeData[0].TrailSL = vTrailSLPrice;

                //It is Important to Not to Save CurrPositionS After fnCloseTrade Function
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
        else if(objDDLTrailSLTP.value === "3"){
 
            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            if(parseFloat(vCurrSellingPrice) >= (parseFloat(vTrailSLPrice) + parseFloat(vSLPoints)) && (parseFloat(vCurrSellingPrice) >= (parseFloat(vCurrBuyingPrice) + parseFloat(vTPPoints)))){
                vTrailSLPrice = parseFloat(vCurrSellingPrice) - parseFloat(vSLPoints);
                objCurrTrade.TradeData[0].TrailSL = vTrailSLPrice;
                //It is Important to Not to Save CurrPositionS After fnCloseTrade Function
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
        else {
            objTrailSL.innerText = "NO T-SL";
            objLossOnSL.innerText = "NO SL";
            objProfitOnTP.innerText = "NO TP";
            
            objCurrTrade.TradeData[0].ProfitLoss = vPL;

            let objExcTradeDtls = JSON.stringify(objCurrTrade);
            localStorage.setItem("CurrPositionS", objExcTradeDtls);
        }
    }
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

function fnChangeQtyMultiplier(pThis)
{
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

function fnTestMe()
{
    console.log("TotLossAmt - " + localStorage.getItem("TotLossAmt"));
    console.log("TradeStep - " + localStorage.getItem("TradeStep"));
    console.log("QtyMul - " + localStorage.getItem("QtyMul"));
}

function fnShowRealPositions(){
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

function fnCloseRealPositions(){
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

function fnPlaceBracketOrder(){
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
    
    fetch("/alice-blue/placeBracketOrder", objRequestOptions)
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
            fnGenMessage("Error to Place Bracket ORder.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Start New Trade", `badge bg-danger`, "spnGenMsg");
    });
}