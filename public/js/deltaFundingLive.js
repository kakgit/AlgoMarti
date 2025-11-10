
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyMultiplierM = 0;
let gObjDeltaDirec = [];

window.addEventListener("DOMContentLoaded", function(){
    fnGetAllStatus();

    socket.on("CdlEmaTrend", (pMsg) => {
        let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
        let objJson = JSON.parse(pMsg);

        if(objJson.Direc === "UP"){
            objTradeSideVal.value = true;
        }
        else if(objJson.Direc === "DN"){
            objTradeSideVal.value = false;
        }
        else{
            objTradeSideVal.value = -1;
        }
        fnTradeSide();
    });

});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

    if(bAppStatus){
        fnLoadLoginCred();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();

        fnLoadNetLimits();
        // fnConnectDFL();
        fnLoadTradeSide();
        fnLoadDefSymbol();
        fnLoadDefExpiryMode();

        fnLoadAllExpiryDate();
        setInterval(fnGetDelta, 300000);
    }
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("DeltaSymbDFL", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("DeltaSymbDFL"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("DeltaSymbDFL", JSON.stringify(pThisVal));

    if(pThisVal === "BTC"){
        objLotSize.value = 0.001;
    }
    else if(pThisVal === "ETH"){
        objLotSize.value = 0.01;
    }
    else{
        objLotSize.value = 0;
    }
}

function fnLoadNetLimits(){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
    let objQtyMultiplier = document.getElementById("txtQtyMultiplier");
    let objSpnBal1 = document.getElementById("spnBal1");
    let objSpnBal2 = document.getElementById("spnBal2");
    let objSpmReqMargin = document.getElementById('spnMarginReq');

    gQtyMultiplierM = JSON.parse(localStorage.getItem("QtyMulDFL"));
    // console.log(localStorage.getItem("QtyMulDFL"));
    // console.log(objNetLimits);

    if(gQtyMultiplierM === null || gQtyMultiplierM === ""){
        gQtyMultiplierM = 0;
        objQtyMultiplier.value = gQtyMultiplierM;
    }
    else{
        objQtyMultiplier.value = gQtyMultiplierM;
    }

    if(objNetLimits === null || objNetLimits === ""){
        // objSpnBal1.innerText = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
        // objSpnBal2.innerText = parseFloat((objNetLimits.Acc2BalUSD)).toFixed(2);
    }
    else{
        let Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
        let Acc2BalUSD = parseFloat((objNetLimits.Acc2BalUSD)).toFixed(2);
        objSpnBal1.innerText = Acc1BalUSD;
        objSpnBal2.innerText = Acc2BalUSD;

        let vTotalMarginReq = (gMinReqMargin * gQtyMultiplierM).toFixed(2);
        objSpmReqMargin.innerText = vTotalMarginReq;

        if(parseFloat(vTotalMarginReq) > parseFloat(Acc1BalUSD)){
            objSpmReqMargin.style.color = "red";
        }
        else{
            objSpmReqMargin.style.color = "green";
        }
    }
}

function fnLoadDefExpiryMode(){
    let objExpiryMode = document.getElementById("ddlExpiryMode");
    let vExpiryMode = JSON.parse(localStorage.getItem("ExpiryModeDFL"));

    if(vExpiryMode === null){
        objExpiryMode.value = 1;
    }
    else{
        objExpiryMode.value = vExpiryMode;
    }
    fnLoadDefExpiryDate(objExpiryMode.value);
}

function fnUpdateExpiryMode(){
    let objExpiryMode = document.getElementById("ddlExpiryMode");

    fnLoadDefExpiryDate(objExpiryMode.value);
    localStorage.setItem("ExpiryModeDFL", JSON.stringify(objExpiryMode.value));
}

function fnLoadDefExpiryDate(pExpiryMode){
    let objExpiryShort = document.getElementById("txtExpShort");
    let objExpiryLong = document.getElementById("txtExpLong");
    let vCurrDate = new Date();
    const vCurrFriday = new Date(vCurrDate);
    const vYear = vCurrDate.getFullYear();
    const vMonth = vCurrDate.getMonth();
    let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
    let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);

    if(pExpiryMode === "1"){
        let vCurrHour = vCurrDate.getHours();

        if(vCurrHour >= 1){
            vCurrDate.setDate(vCurrDate.getDate() + 1);
        }

        let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiryShort.value = vExpValTB;
    }
    else if(pExpiryMode === "2"){
        const vCurrDayOfWeek = vCurrDate.getDay();
        let vDaysUntilFriday = 5 - vCurrDayOfWeek;

        if(vCurrDayOfWeek > 3){
            vCurrFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday + 7);
        }
        else{
            vCurrFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday);
        }
        let vDay = (vCurrFriday.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrFriday.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrFriday.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiryShort.value = vExpValTB;
    }
    else if(pExpiryMode === "3"){
        while (vLastDayOfMonth.getDay() !== 5) { 
            vLastDayOfMonth.setDate(vLastDayOfMonth.getDate() - 1);
        }
        while (vLastDayOfNextMonth.getDay() !== 5) { 
            vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
        }
        let vDay = (vLastDayOfMonth.getDate()).toString().padStart(2, "0");
        let vMonth = (vLastDayOfMonth.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vLastDayOfMonth.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiryShort.value = vExpValTB;
        objExpiryLong.value = vExpValTB;
    }
}

function fnSwapCurrency(pAcc){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
    let objDisplayCurr1 = document.getElementById("spnCurrency1");
    let objDisplayBal1 = document.getElementById("spnBal1");
    let objDisplayCurr2 = document.getElementById("spnCurrency2");
    let objDisplayBal2 = document.getElementById("spnBal2");

    if(pAcc === "Acc1"){
        if(objDisplayCurr1.innerText === "USD"){
            objDisplayCurr1.innerText = "INR";
            objDisplayBal1.innerText = (parseFloat(objNetLimits.Acc1BalINR)).toFixed(2);
        }
        else if(objDisplayCurr1.innerText === "INR"){
            objDisplayCurr1.innerText = "USD";
            objDisplayBal1.innerText = (parseFloat(objNetLimits.Acc1BalUSD)).toFixed(2);
        }        
    }
    else if(pAcc === "Acc2"){
        if(objDisplayCurr2.innerText === "USD"){
            objDisplayCurr2.innerText = "INR";
            objDisplayBal2.innerText = (parseFloat(objNetLimits.Acc2BalINR)).toFixed(2);
        }
        else if(objDisplayCurr2.innerText === "INR"){
            objDisplayCurr2.innerText = "USD";
            objDisplayBal2.innerText = (parseFloat(objNetLimits.Acc2BalUSD)).toFixed(2);
        }        
    }
}

function fnChangeReqMargin(objThis){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
    let objSpmReqMargin = document.getElementById("spnMarginReq");

    let Acc1BalUSD = 0;
    let Acc2BalUSD = 0;

    if(objNetLimits === null || objNetLimits === ""){

    }
    else{
        Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
        Acc2BalUSD = parseFloat((objNetLimits.Acc2BalUSD)).toFixed(2);
    }

    if(isNaN(objThis.value) || objThis.value === ""){
        objSpmReqMargin.innerText = (0.00).toFixed(2);
    }
    else{
        let vTotalMarginReq = (gMinReqMargin * parseFloat(objThis.value)).toFixed(2);
        // console.log(vTotalMarginReq);
        // console.log(Acc1BalUSD);
        objSpmReqMargin.innerText = vTotalMarginReq;

        localStorage.setItem("QtyMulDFL", objThis.value);

        if(parseFloat(vTotalMarginReq) > parseFloat(Acc1BalUSD)){
            objSpmReqMargin.style.color = "red";
        }
        else{
            objSpmReqMargin.style.color = "green";
        }
    }
}

function fnInitRealTrade(pOptionType){

}

function fnSetDDMMYYYY(pDateToConv){
    let vDate = new Date(pDateToConv);

    let vDay = (vDate.getDate()).toString().padStart(2, "0");
    let vMonth = (vDate.getMonth() + 1).toString().padStart(2, "0");
    let vYear = vDate.getFullYear();
    let vRetVal = vDay + "-" + vMonth + "-" + vYear;;

    return vRetVal;
}




function fnClearLocalStorageTemp(){
    localStorage.setItem("QtyMulDFL", 0);
    localStorage.removeItem("DeltaNetLimit");

    fnGetAllStatus();
    console.log("Memory Cleared!!!");
}



//******************* WS Connection and Subscription Fully Updated Version ****************//
function fnConnectDFL(){
    let objSub = document.getElementById("spnSub");
    let vUrl = "wss://socket.india.delta.exchange";
    obj_WS_DFL = new WebSocket(vUrl);

    obj_WS_DFL.onopen = function (){
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
        // console.log("WS is Open!");
    }
    obj_WS_DFL.onerror = function (){
        setTimeout(fnSubscribeDFL, 3000);
        console.log("WS Error, Trying to Reconnect.....");
    }
    obj_WS_DFL.onclose = function (){
        if(gForceCloseOSD){
            gForceCloseOSD = false;
            // console.log("WS Disconnected & Closed!!!!!!");
            objSub.className = "badge rounded-pill text-bg-success";
            fnGenMessage("Streaming Stopped & Disconnected!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            fnSubscribeDFL();
            // console.log("Restarting WS....");
        }
    }
    obj_WS_DFL.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

        switch (vTicData.type){
            case "v2/ticker":
                // fnUpdateRates(vTicData);
                break;
            case "subscriptions":

                fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
                // console.log("Subscribed!!!!!!!");
                objSub.className = "badge rounded-pill text-bg-success blink";
                break;
            case "unsubscribed":

                fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
                // console.log("UnSubscribed!!!!!!");
                objSub.className = "badge rounded-pill text-bg-success";
                break;
        }       
    }
}

function fnSubscribeDFL(){
    if(obj_WS_DFL === null){
        fnConnectDFL();
        setTimeout(fnSubscribeDFL, 3000);
        // console.log("Connecting WS.....");
    }
    else{
        const vTimer = setInterval(() => {
            if(obj_WS_DFL.readyState === 1){
                clearInterval(vTimer);
                //Write Subscription code here
                let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};

                obj_WS_DFL.send(JSON.stringify(vSendData));
                // console.log("Subscribing............");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectDFL();
            }
        }, 3000);
    }
}

function fnUnSubscribeDFL(){
    if(obj_WS_DFL === null){
        fnConnectDFL();
        setTimeout(fnUnSubscribeDFL, 3000);
        // console.log("Already Disconnected, Connecting WS to Unsub.....");
    }
    else{
        const vTimer = setInterval(() => {
            if(obj_WS_DFL.readyState === 1){
                clearInterval(vTimer);
                let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

                obj_WS_DFL.send(JSON.stringify(vSendData));
                // console.log("UnSubscribing........!!!!!");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectDFL();
            }
        }, 3000);
    }
}

function fnRestartConnDFL(){
    if(obj_WS_DFL !== null){
        obj_WS_DFL.close();
    }
    else{
        // console.log("WS already Disconnected and Reconnecting Now......");       
        fnSubscribeDFL();
    }
}

function fnForceDisconnectDFL(){
    if(obj_WS_DFL !== null){
        gForceCloseOSD = true;
        obj_WS_DFL.close();
    }
    else{
        // console.log("WS already Disconnected!!!!!!");        
    }
}

function fnCheckStatusOSD(){
    console.log(obj_WS_DFL);    
}

function fnAdd2SubList(){
    let objSymbol = document.getElementById("txtRateTest");

    gSubList.push(objSymbol.value);
    console.log(gSubList);
    fnUnSubscribeDFL();
    fnSubscribeDFL();
}
//******************* WS Connection and Subscription Fully Updated Version ****************//

//********** Indicators Sections *************//

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    localStorage.setItem("TradeSideSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideSwtS") === null){
        localStorage.setItem("TradeSideSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideSwtS");
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    if(lsTradeSideSwitchS === "true"){
        objTradeSideVal.value = true;
    }
    else if(lsTradeSideSwitchS === "false"){
        objTradeSideVal.value = false;
    }
    else{
        objTradeSideVal.value = -1;
    }
}

//********** Indicators Sections *************//

//********* Delta Experiment ***********//

function fnLoadAllExpiryDate(){
    let objExpiryDay = document.getElementById("txtDayExpiry");
    let objExpiryWeek = document.getElementById("txtWeekExpiry");
    let objExpiryMonth = document.getElementById("txtMonthExpiry");

    let vCurrDate = new Date();
    const vCurrFriday = new Date(vCurrDate);
    const vYear = vCurrDate.getFullYear();
    const vMonth = vCurrDate.getMonth();
    let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
    let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);

    //************** Daily Expiry ***************//
    let vCurrHour = vCurrDate.getHours();

    if(vCurrHour >= 1){
        vCurrDate.setDate(vCurrDate.getDate() + 1);
    }

    let vDayD = (vCurrDate.getDate()).toString().padStart(2, "0");
    let vMonthD = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
    let vExpValD = vCurrDate.getFullYear() + "-" + vMonthD + "-" + vDayD;

    objExpiryDay.value = vExpValD;
    //************** Daily Expiry ***************//

    //************** Weekly Expiry ***************//
    const vCurrDayOfWeek = vCurrDate.getDay();
    let vDaysUntilFriday = 5 - vCurrDayOfWeek;

    if(vCurrDayOfWeek > 3){
        vCurrFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday + 7);
    }
    else{
        vCurrFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday);
    }
    let vDayW = (vCurrFriday.getDate()).toString().padStart(2, "0");
    let vMonthW = (vCurrFriday.getMonth() + 1).toString().padStart(2, "0");
    let vExpValW = vCurrFriday.getFullYear() + "-" + vMonthW + "-" + vDayW;

    objExpiryWeek.value = vExpValW;
    //************** Weekly Expiry ***************//

    //************** Monthly Expiry ***************//
    while (vLastDayOfMonth.getDay() !== 5) { 
        vLastDayOfMonth.setDate(vLastDayOfMonth.getDate() - 1);
    }
    while (vLastDayOfNextMonth.getDay() !== 5) { 
        vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
    }
    let vDayM = (vLastDayOfMonth.getDate()).toString().padStart(2, "0");
    let vMonthM = (vLastDayOfMonth.getMonth() + 1).toString().padStart(2, "0");
    let vExpValM = vLastDayOfMonth.getFullYear() + "-" + vMonthM + "-" + vDayM;

    objExpiryMonth.value = vExpValM;
    //************** Monthly Expiry ***************//
}

function fnGetDelta(){
    fnLoadAllExpiryDate();
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objDayExpiry = document.getElementById("txtDayExpiry");
    let objWeekExpiry = document.getElementById("txtWeekExpiry");
    let objMonthExpiry = document.getElementById("txtMonthExpiry");
    let vDayExpiry = fnSetDDMMYYYY(objDayExpiry.value);
    let vWeekExpiry = fnSetDDMMYYYY(objWeekExpiry.value);
    let vMonthExpiry = fnSetDDMMYYYY(objMonthExpiry.value);

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, UndAssetSymbol : "BTC", DayExpiry : vDayExpiry, WeekExpiry : vWeekExpiry, MonthExpiry : vMonthExpiry });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExcFunding/getOptChnSDKByAstOptTypExp", requestOptions)
    .then(response => response.json())
    .then(objResult => {

        if(objResult.status === "success"){
            // console.log(objResult);
            const vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vNow = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            let vCallTotal = objResult.data.DayCall + objResult.data.WeekCall + objResult.data.MonthCall;
            let vPutTotal = objResult.data.DayPut + objResult.data.WeekPut + objResult.data.MonthPut;
            let vDayDirec = "";
            let vWeekDirec = "";
            let vMonthDirec = "";
            let vTotalDirec = "";

            if(objResult.data.DayPut > objResult.data.DayCall){
                vDayDirec = "UP";
            }
            else{
                vDayDirec = "DOWN";
            }

            if(objResult.data.WeekPut > objResult.data.WeekCall){
                vWeekDirec = "UP";
            }
            else{
                vWeekDirec = "DOWN";
            }

            if(objResult.data.MonthPut > objResult.data.MonthCall){
                vMonthDirec = "UP";
            }
            else{
                vMonthDirec = "DOWN";
            }

            if(vPutTotal > vCallTotal){
                vTotalDirec = "UP";
            }
            else{
                vTotalDirec = "DOWN";
            }

            gObjDeltaDirec.push({ Dated : vNow, DayCall : objResult.data.DayCall, DayPut : objResult.data.DayPut, DayDirec : vDayDirec, WeekCall : objResult.data.WeekCall, WeekPut : objResult.data.WeekPut, WeekDirec : vWeekDirec, MonthCall : objResult.data.MonthCall, MonthPut : objResult.data.MonthPut, MonthDirec : vMonthDirec, OADirec : vTotalDirec });

            let objDataStr = JSON.stringify(gObjDeltaDirec);

            localStorage.setItem("IndDeltasDFL", objDataStr);
            fnDisplayDeltaDirec();
            
            // resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){

                fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        }
        else{
            fnGenMessage("Error in Getting Best Rates Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
            // reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        }
    })
    .catch(error => {
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
        // reject({ "status": "danger", "message": "Error in Getting Fut Best Rates...", "data": "" });
    });
}

function fnDisplayDeltaDirec(){
    let objDispDeltas = document.getElementById("tBodyDeltas");
    let objDeltas = JSON.parse(localStorage.getItem("IndDeltasDFL"));

    if (objDeltas === null){
        objDispDeltas.innerHTML = '<tr><td colspan="11"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Deltas Yet</div></td></tr>';
    }
    else{
        let vTempHtml = "";

        for (let i = 0; i < objDeltas.length; i++){
            let vDated = objDeltas[i].Dated;
            let vDayCall = objDeltas[i].DayCall;
            let vDayPut = objDeltas[i].DayPut;
            let vDirecDay = objDeltas[i].DayDirec;
            let vWeekCall = objDeltas[i].WeekCall;
            let vWeekPut = objDeltas[i].WeekPut;
            let vDirecWeek = objDeltas[i].WeekDirec;
            let vMonthCall = objDeltas[i].MonthCall;
            let vMonthPut = objDeltas[i].MonthPut;
            let vDirecMonth = objDeltas[i].MonthDirec;
            let vDirecOA = objDeltas[i].OADirec;

            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDated + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vDayCall).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vDayPut).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecDay + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vWeekCall).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vWeekPut).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecWeek + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vMonthCall).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + (vMonthPut).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecMonth + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vDirecOA + '</td>';
            vTempHtml += '</tr>';
        }
        objDispDeltas.innerHTML = vTempHtml;
    }

    // console.log("Delta Directions");
    // console.log(objDeltas);
}