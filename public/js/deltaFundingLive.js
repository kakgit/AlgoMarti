
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosDFL = { TradeData : []};
let gTradeInst = 0;

let gUpdPos = true;
let gSymbBRateList = {};
let gSymbSRateList = {};
let gSymbDeltaList = {};
let gSymbGammaList = {};
let gSymbVegaList = {};
let gSymbMarkIVList = {};
let gSymbRhoList = {};
let gSymbThetaList = {};

let gForceCloseDFL = false;
let gBrokerage = 0.015;

let gCurrStrats = { StratsData : []};

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

    socket.on("refreshAllDFL", () => {
        document.location.reload();
    });

    socket.on("tv-Msg-Opt-Sell-ST", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDFL");
        let vTradeSide = localStorage.getItem("TradeSideSwtDFL");
        let objMsg = (pMsg);

        // fnChangeSymbol(objMsg.symbolName);

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            if(((vTradeSide === "true") && (objMsg.OptionType === "P")) || ((vTradeSide === "false") && (objMsg.OptionType === "C")) || (vTradeSide === "-1")){
                fnPreInitTrade(objMsg.Account, objMsg.OptionType);
            }
            else{
                fnGenMessage(objMsg.OptionType + " Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
            }
        }
    });
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

    if(bAppStatus){
        fnConnectDFL();
        fnLoadLoginCred();
        fnLoadCurrStrategies();
        fnLoadDefQty();
        fnLoadOptStep();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();

        fnLoadNetLimits();
        fnLoadTradeSide();
        fnLoadDefSymbol();
        fnLoadDefExpiryMode();

        fnLoadAllExpiryDate();
        fnLoadCurrentTradePos();
        // setInterval(fnGetDelta, 300000);
        fnUpdateOpenPositions();

        fnLoadTotalLossAmtQty();
    }
}

function fnLoadCurrStrategies(){
    let objStrats = JSON.parse(localStorage.getItem("DeltaStratsDFL"));
    let objStratsDDL = document.getElementById("ddlStrategy");

    gCurrStrats = objStrats;

    if(gCurrStrats === null){
        gCurrStrats = { StratsData : []};
    }
    else{
        objStratsDDL.innerHTML = "<option value=''>Select Strategy</option>";

        for(let i=0; i<gCurrStrats.StratsData.length; i++){
            objStratsDDL.innerHTML += "<option value="+ gCurrStrats.StratsData[i].StratID +">"+ gCurrStrats.StratsData[i].StratName +"</option>";
        }

    }
}

function fnLoadDefQty(){
    let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyDFL"));

    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objStartQty = document.getElementById("txtStartQty");

    if(objStartQtyM === null){
        objStartQty.value = 1;
        objQtyCE.value = 1;
        objQtyPE.value = 1;
        localStorage.setItem("StartQtyDFL", objStartQty.value);
    }
    else{
        objStartQty.value = objStartQtyM;
        objQtyCE.value = objStartQtyM;
        objQtyPE.value = objStartQtyM;
    }
}

function fnChangeStartQty(pThisVal){
    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyDFL", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyDFL", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyDFL", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQtyCE.value = pThisVal.value;
            objQtyPE.value = pThisVal.value;
            localStorage.setItem("QtyCallDFL", pThisVal.value);
            localStorage.setItem("QtyPutDFL", pThisVal.value);
        }
    }
    fnChangeReqMargin();
    console.log(localStorage.getItem("StartQtyDFL"));
}

function fnChangeQtyCE(pThis){
    localStorage.setItem("QtyCallDFL", pThis.value);
}

function fnChangeQtyPE(pThis){
    localStorage.setItem("QtyPutDFL", pThis.value);
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
    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objSpnBal1 = document.getElementById("spnBal1");
    let objSpnBal2 = document.getElementById("spnBal2");
    let objSpmReqMargin = document.getElementById('spnMarginReq');
    let objStartQty = document.getElementById("txtStartQty");

    gQtyMultiplierM = objStartQty.value;
    // console.log(localStorage.getItem("QtyMulDFL"));
    // console.log(objNetLimits);

    if(gQtyMultiplierM === null || gQtyMultiplierM === ""){
        gQtyMultiplierM = 0;
        objQtyCE.value = gQtyMultiplierM;
        objQtyPE.value = gQtyMultiplierM;
    }
    else{
        objQtyCE.value = gQtyMultiplierM;
        objQtyPE.value = gQtyMultiplierM;
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

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosDFL"));

    gCurrPosDFL = objCurrPos;

    if(gCurrPosDFL === null){
        gCurrPosDFL = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnSetSymbolTickerList(){
    if(gCurrPosDFL.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
            if(gCurrPosDFL.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosDFL.TradeData[i].Symbol);
            }
        }
        const setSubList = new Set(objSubListArray);
        gSubList = [...setSubList];
        fnUnSubscribeDFL();
        fnSubscribeDFL();

        clearInterval(gTradeInst);
        gTradeInst = setInterval(fnSaveUpdCurrPos, 30000);
    }
}

function fnChangeStep(){
    // let vStepM = JSON.parse(localStorage.getItem("OptStepDFL"));
    let objSwtStep = document.getElementById("swtStepDFL");

    localStorage.setItem("OptStepDFL", JSON.stringify(objSwtStep.checked));
    // alert(objSwtStep.checked);
}

function fnLoadOptStep(){
    let vStepM = JSON.parse(localStorage.getItem("OptStepDFL"));
    let objSwtStep = document.getElementById("swtStepDFL");

    if(vStepM){
        objSwtStep.checked = true;
    }
    else{
        objSwtStep.checked = false;
    }
}

function fnLoadTotalLossAmtQty(){
    let vTotLossAmtCE = localStorage.getItem("TotLossAmtCE");
    let vTotLossAmtPE = localStorage.getItem("TotLossAmtPE");
    let vQtyCEM = localStorage.getItem("QtyCallDFL");
    let vQtyPEM = localStorage.getItem("QtyPutDFL");
    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objDefQty = document.getElementById("txtStartQty");

    let objCallPL = document.getElementById("txtCallPL");
    let objPutPL = document.getElementById("txtPutPL");

    if(vTotLossAmtCE === null || vTotLossAmtCE === "" || isNaN(vTotLossAmtCE)){
        localStorage.setItem("TotLossAmtCE", 0);
        localStorage.setItem("QtyCallDFL", objDefQty.value);
    }
    else{
        objCallPL.value = vTotLossAmtCE;

        if(parseInt(vQtyCEM) < parseInt(objDefQty.value)){
            objQtyCE.value = objDefQty.value;
        }
        else{
            objQtyCE.value = vQtyCEM;
        }
    }

    if(vTotLossAmtPE === null || vTotLossAmtPE === "" || isNaN(vTotLossAmtPE)){
        localStorage.setItem("TotLossAmtPE", 0);
        localStorage.setItem("QtyPutDFL", objDefQty.value);
    }
    else{
        objPutPL.value = vTotLossAmtPE;

        if(parseInt(vQtyPEM) < parseInt(objDefQty.value)){
            objQtyPE.value = objDefQty.value;
        }
        else{
            objQtyPE.value = vQtyPEM;
        }
    }
}

function fnSaveUpdCurrPos(){
    let vToPosClose = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";
    let objCallPL = document.getElementById("txtCallPL");
    let objPutPL = document.getElementById("txtPutPL");

    for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
        if(gCurrPosDFL.TradeData[i].Status === "OPEN"){
            let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDFL.TradeData[i].Symbol]);
            let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosDFL.TradeData[i].Symbol]);
            let vCurrVega = parseFloat(gSymbVegaList[gCurrPosDFL.TradeData[i].Symbol]);
            let vCurrMarkIV = parseFloat(gSymbMarkIVList[gCurrPosDFL.TradeData[i].Symbol]);
            let vCurrRho = parseFloat(gSymbRhoList[gCurrPosDFL.TradeData[i].Symbol]);
            let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosDFL.TradeData[i].Symbol]);

            gCurrPosDFL.TradeData[i].DeltaC = vCurrDelta;
            gCurrPosDFL.TradeData[i].GammaC = vCurrGamma;
            gCurrPosDFL.TradeData[i].VegaC = vCurrVega;
            gCurrPosDFL.TradeData[i].MarkIVC = vCurrMarkIV;
            gCurrPosDFL.TradeData[i].RhoC = vCurrRho;
            gCurrPosDFL.TradeData[i].ThetaC = vCurrTheta;

            let vStrikePrice = gCurrPosDFL.TradeData[i].StrikePrice;
            let vLotSize = gCurrPosDFL.TradeData[i].LotSize;
            let vQty = gCurrPosDFL.TradeData[i].Qty;
            let vBuyPrice = gCurrPosDFL.TradeData[i].BuyPrice;
            let vSellPrice = gCurrPosDFL.TradeData[i].SellPrice;
            let vOptionTypeZZ = gCurrPosDFL.TradeData[i].OptionType;

            let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

            if(gCurrPosDFL.TradeData[i].TransType === "sell"){
                // console.log(gCurrPosDFL.TradeData[i].Symbol);
                // console.log(gSymbBRateList[gCurrPosDFL.TradeData[i].Symbol]);
                // ****************** Uncomment When Live *****************//
                let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDFL.TradeData[i].Symbol]);
                gCurrPosDFL.TradeData[i].BuyPrice = vCurrPrice;
                // ****************** Uncomment When Live *****************//

                // // ****************** Remove When Live *****************//
                // vCurrPrice = gCurrPosDFL.TradeData[i].BuyPrice;
                // // ****************** Remove When Live *****************//

                if((Math.abs(parseFloat(vCurrDelta)) > parseFloat(gCurrPosDFL.TradeData[i].DeltaSL)) || (Math.abs(parseFloat(vCurrDelta)) < parseFloat(gCurrPosDFL.TradeData[i].DeltaTP))){
                    vLegID = gCurrPosDFL.TradeData[i].ClientOrderID;
                    vTransType = gCurrPosDFL.TradeData[i].TransType;
                    vOptionType = gCurrPosDFL.TradeData[i].OptionType;
                    vSymbol = gCurrPosDFL.TradeData[i].Symbol;
                    vToPosClose = true;
                }
                else if(vPL > 0){
                    if((vOptionTypeZZ === "C") && (parseFloat(objCallPL.value) < 0) && (vPL > parseFloat(Math.abs(objCallPL.value)))){
                        vLegID = gCurrPosDFL.TradeData[i].ClientOrderID;
                        vTransType = gCurrPosDFL.TradeData[i].TransType;
                        vOptionType = gCurrPosDFL.TradeData[i].OptionType;
                        vSymbol = gCurrPosDFL.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                    else if((vOptionTypeZZ === "P") && (parseFloat(objPutPL.value) < 0) && (vPL > parseFloat(Math.abs(objPutPL.value)))){
                        vLegID = gCurrPosDFL.TradeData[i].ClientOrderID;
                        vTransType = gCurrPosDFL.TradeData[i].TransType;
                        vOptionType = gCurrPosDFL.TradeData[i].OptionType;
                        vSymbol = gCurrPosDFL.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                }
            }
            else if(gCurrPosDFL.TradeData[i].TransType === "buy"){
                // ****************** Uncomment When Live *****************//
                let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDFL.TradeData[i].Symbol]);
                gCurrPosDFL.TradeData[i].SellPrice = vCurrPrice;
                // ****************** Uncomment When Live *****************//

                // // ****************** Remove When Live *****************//
                // vCurrPrice = gCurrPosDFL.TradeData[i].SellPrice;
                // // ****************** Remove When Live *****************//

                if((Math.abs(parseFloat(vCurrDelta)) < parseFloat(gCurrPosDFL.TradeData[i].DeltaSL)) || (Math.abs(parseFloat(vCurrDelta)) > parseFloat(gCurrPosDFL.TradeData[i].DeltaTP))){
                    vLegID = gCurrPosDFL.TradeData[i].ClientOrderID;
                    vTransType = gCurrPosDFL.TradeData[i].TransType;
                    vOptionType = gCurrPosDFL.TradeData[i].OptionType;
                    vSymbol = gCurrPosDFL.TradeData[i].Symbol;
                    vToPosClose = true;
                }
            }
        }
    }

    fnUpdateOpenPositions();

    if(vToPosClose){
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }
}

function fnRefreshAllOpenBrowser(){
    if(localStorage.getItem("AppLoginEmail") === "kamarthi.anil@gmail.com"){
        // fnClearLocalStorageTemp();

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: '',
            redirect: 'follow'
        };

        fetch("/refreshAllDFL", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success"){

                console.log(objResult);
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage("Error to Receive Trade Msg", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch Trade Msg.", `badge bg-danger`, "spnGenMsg");
        });        
    }
}

function fnTest(){
    console.log(gCurrPosDFL);
}

//************ Update Live Code Here **************//
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

        if(vCurrHour >= 16){
            vCurrDate.setDate(vCurrDate.getDate() + 2);
        }
        else if(vCurrHour >= 0){
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

        const vCurrDay = vCurrDate.getDate();
        let vDay = (vLastDayOfMonth.getDate()).toString().padStart(2, "0");
        let vMonth = (vLastDayOfMonth.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vLastDayOfMonth.getFullYear() + "-" + vMonth + "-" + vDay;

        if(vCurrDay > 17){
            vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
            vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
            vExpValTB = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;
        }
        objExpiryShort.value = vExpValTB;
        objExpiryLong.value = vExpValTB;
    }
}

function fnSetDDMMYYYY(pDateToConv){
    let vDate = new Date(pDateToConv);

    let vDay = (vDate.getDate()).toString().padStart(2, "0");
    let vMonth = (vDate.getMonth() + 1).toString().padStart(2, "0");
    let vYear = vDate.getFullYear();
    let vRetVal = vDay + "-" + vMonth + "-" + vYear;;

    return vRetVal;
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

function fnChangeReqMargin(){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
    let objSpmReqMargin = document.getElementById("spnMarginReq");
    let objQtyCE = document.getElementById("txtQtyCE");
    let Acc1BalUSD = 0;
    let Acc2BalUSD = 0;

    if(objNetLimits === null || objNetLimits === ""){

    }
    else{
        Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
        Acc2BalUSD = parseFloat((objNetLimits.Acc2BalUSD)).toFixed(2);
    }

    if(isNaN(parseFloat(objQtyCE.value)) || objQtyCE.value === ""){
        objSpmReqMargin.innerText = (0.00).toFixed(2);
    }
    else{
        let vTotalMarginReq = (gMinReqMargin * parseFloat(objQtyCE.value)).toFixed(2);
        objSpmReqMargin.innerText = vTotalMarginReq;

        // localStorage.setItem("QtyMulDFL", objQtyCE.value);

        if(parseFloat(vTotalMarginReq) > parseFloat(Acc1BalUSD)){
            objSpmReqMargin.style.color = "red";
        }
        else{
            objSpmReqMargin.style.color = "green";
        }
    }
}

function fnPreInitTrade(pAcc, pOptionType){
    let vIsRecExists = false;

    fnUpdateExpiryMode();

    if(gCurrPosDFL.TradeData.length > 0){
        for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
            if((gCurrPosDFL.TradeData[i].OptionType === pOptionType) && (gCurrPosDFL.TradeData[i].Status === "OPEN")){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        fnInitTrade(pAcc, pOptionType);
    }
    else{
        fnGenMessage("Trade Message Received but Same Option Type is Already Open!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnInitTrade(pAcc, pOptionType){
    let objApiKey1 = document.getElementById("txtUserAPIKey");
    let objApiSecret1 = document.getElementById("txtAPISecret");
    let objApiKey2 = document.getElementById("txtUserAPIKey2");
    let objApiSecret2 = document.getElementById("txtAPISecret2");

    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objExpShort = document.getElementById("txtExpShort");
    let objOrderType = document.getElementById("ddlOrderType");

    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    let vShortExpiry = fnSetDDMMYYYY(objExpShort.value);

    //{ Account : "Acc1", UndrAsst : "BTCUSD", TransType : "sell", OptionType : "F", DeltaNew : 1.00, DeltaTP : 2.00, DeltaSL : 0.10 }, 
    
    let objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ Account : "Acc1", UndrAsst : "BTC", TransType : "sell", OptionType : "P", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { Account : "Acc1", UndrAsst : "BTC", TransType : "sell", OptionType : "C", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }

    // console.log(objStrategies.Strategies[0].StratModel.length);
    gUpdPos = false;

    for(let i=0; i<objStrategies.Strategies[0].StratModel.length; i++){
        let vApiKey = "";
        let vApiSecret = "";
        let vUndrAsst = objStrategies.Strategies[0].StratModel[i].UndrAsst;
        let vOptionType = objStrategies.Strategies[0].StratModel[i].OptionType;
        let vTransType = objStrategies.Strategies[0].StratModel[i].TransType;
        let vDeltaNPos = objStrategies.Strategies[0].StratModel[i].DeltaNew;
        let vDeltaTP = objStrategies.Strategies[0].StratModel[i].DeltaTP;
        let vDeltaSL = objStrategies.Strategies[0].StratModel[i].DeltaSL;
        let vClientID = vOrdId + i;

        if(objStrategies.Strategies[0].StratModel[i].Account === pAcc){
            vApiKey = objApiKey1.value;
            vApiSecret = objApiSecret1.value;
            let vQty = 0;

            if(pOptionType === "C"){
                vQty = objQtyCE.value;
            }
            else if(pOptionType === "P"){
                vQty = objQtyPE.value;
            }

            if(objStrategies.Strategies[0].StratModel[i].OptionType === pOptionType){
                let objTradeDtls = await fnExecOption(vApiKey, vApiSecret, vUndrAsst, vShortExpiry, vOptionType, vTransType, vDeltaNPos, objOrderType.value, vQty, vClientID);
                if(objTradeDtls.status === "success"){
                    // console.log(objTradeDtls);

                    let vProductID = objTradeDtls.data.ProductID;
                    let vSymbol = objTradeDtls.data.Symbol;
                    let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
                    let vCntrctType = objTradeDtls.data.ContType;
                    let vStrPrice = parseInt(objTradeDtls.data.Strike);
                    let vExpiry = objTradeDtls.data.Expiry;
                    let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
                    let vBestSell = parseFloat(objTradeDtls.data.BestBid);
                    let vDelta = parseFloat(objTradeDtls.data.Delta);
                    let vVega = parseFloat(objTradeDtls.data.Vega);
                    let vGamma = parseFloat(objTradeDtls.data.Gamma);
                    let vRho = parseFloat(objTradeDtls.data.Rho);
                    let vMarkIV = parseFloat(objTradeDtls.data.MarkIV);
                    let vTheta = parseFloat(objTradeDtls.data.Theta);
                    
                    let vDeltaC = parseFloat(objTradeDtls.data.Delta);
                    let vVegaC = parseFloat(objTradeDtls.data.Vega);
                    let vGammaC = parseFloat(objTradeDtls.data.Gamma);
                    let vRhoC = parseFloat(objTradeDtls.data.Rho);
                    let vMarkIVC = parseFloat(objTradeDtls.data.MarkIV);
                    let vThetaC = parseFloat(objTradeDtls.data.Theta);

                    let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, Status : "OPEN" };
                    
                    gCurrPosDFL.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosDFL);

                    localStorage.setItem("CurrPosDFL", objExcTradeDtls);

                    gUpdPos = true;
                    fnSetSymbolTickerList();
                    fnUpdateOpenPositions();
                }
                else if(objTradeDtls.status === "danger"){
                    fnGenMessage(objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
                }
            }
            else if(objStrategies.Strategies[0].StratModel[i].OptionType === "F"){
                // console.log("Comming Soon....");
            }
            else{
                // console.log("No Option Type called " + pOptionType);
            }
        }
        else{
            console.log("No Account with " + pAcc);
        }
    }
}

function fnExecOption(pApiKey, pApiSecret, pUndAsst, pExpiry, pOptionType, pTransType, pDeltaNPos, pOrderType, pQty, pClientID){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "UndAssetSymbol" : pUndAsst,
            "Expiry" : pExpiry,
            "OptionType" : pOptionType,
            "TransType" : pTransType,
            "DeltaNPos" : pDeltaNPos,
            "OrderType" : pOrderType,
            "LotQty" : pQty,
            "ClientID" : pClientID
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        // resolve({ "status": "success", "message": "Success", "data": "" });

        fetch("/deltaExcFunding/execOption", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data === ""){
                    resolve({ "status": objResult.status, "message": objResult.message, "data": "" });
                }
                else if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    resolve({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

function fnUpdateOpenPositions(){
    if(gUpdPos){
        let objCurrTradeList = document.getElementById("tBodyCurrTrades");
        // console.log(gCurrPosDFL);
        if(gCurrPosDFL.TradeData.length === 0){
            objCurrTradeList.innerHTML = '<tr><td colspan="17"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vTotalTrades = 0;
            let vNetPL = 0;
            let vTotalCharges = 0;
            let vTotalCapital = 0;

            for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
                let vBuyPrice = gCurrPosDFL.TradeData[i].BuyPrice;
                let vLegID = gCurrPosDFL.TradeData[i].ClientOrderID;
                let vContractType = gCurrPosDFL.TradeData[i].ContrctType;
                let vDelta = gCurrPosDFL.TradeData[i].Delta;
                let vDeltaNPos = gCurrPosDFL.TradeData[i].DeltaNP;
                let vDeltaSL = gCurrPosDFL.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosDFL.TradeData[i].DeltaTP;
                let vExpiry = gCurrPosDFL.TradeData[i].Expiry;
                let vGamma = gCurrPosDFL.TradeData[i].Gamma;
                let vMarkIV = gCurrPosDFL.TradeData[i].MarkIV;
                let vRho = gCurrPosDFL.TradeData[i].Rho;
                let vTheta = gCurrPosDFL.TradeData[i].Theta;
                let vVega = gCurrPosDFL.TradeData[i].Vega;

                let vDeltaC = gCurrPosDFL.TradeData[i].DeltaC;
                let vGammaC = gCurrPosDFL.TradeData[i].GammaC;
                let vMarkIVC = gCurrPosDFL.TradeData[i].MarkIVC;
                let vRhoC = gCurrPosDFL.TradeData[i].RhoC;
                let vThetaC = gCurrPosDFL.TradeData[i].ThetaC;
                let vVegaC = gCurrPosDFL.TradeData[i].VegaC;

                let vLotSize = gCurrPosDFL.TradeData[i].LotSize;
                let vOpenDT = gCurrPosDFL.TradeData[i].OpenDT;
                let vOptionType = gCurrPosDFL.TradeData[i].OptionType;
                let vProductID = gCurrPosDFL.TradeData[i].ProductID;
                let vQty = gCurrPosDFL.TradeData[i].Qty;
                let vSellPrice = gCurrPosDFL.TradeData[i].SellPrice;
                let vStatus = gCurrPosDFL.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDFL.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDFL.TradeData[i].Symbol;
                let vTransType = gCurrPosDFL.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosDFL.TradeData[i].UndrAsstSymb;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
                let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
                vTotalTrades += 1;
                vTotalCharges += parseFloat(vCharges);
                vNetPL += parseFloat(vPL);

                if(vStatus === "OPEN"){
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:red;">' + (vGammaC).toFixed(5) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(5) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:green;">' + (vVegaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:white;">' + (vMarkIVC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vMarkIV).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:white;">' + (vRhoC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vRho).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:white;">' + (vThetaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vTransType + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSize + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
                    if(vTransType === "sell"){
                        vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vBuyPrice).toFixed(2) + '</span></td>';
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';
                    }
                    else if(vTransType === "buy"){
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vBuyPrice).toFixed(2) + '</td>';
                        vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vSellPrice).toFixed(2) + '</span></td>';
                    }
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;color:#ff9a00;">'+ (vPL).toFixed(2) +'</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vOpenDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '</tr>';
                }
                else{
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGammaC).toFixed(5) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(5) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVegaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vMarkIVC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vMarkIV).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vRhoC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vRho).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vThetaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vSymbol + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vTransType + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vLotSize + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vQty + '</td>';
                    vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap;text-align:right; color:grey;">' + (vBuyPrice).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right; color:grey;">' + (vSellPrice).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">'+ (vPL).toFixed(2) +'</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vOpenDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '</tr>';
                }
            }
            vTempHtml += '<tr><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Total Trades: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vTotalTrades +'</td><td></td><td></td><td></td><td></td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Used Margin: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;"></td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;"></td><td></td></tr>';
            objCurrTradeList.innerHTML = vTempHtml;
        }
    }
}


function fnGetTradeCharges(pIndexPrice, pLotSize, pQty, pBuyPrice, pSellPrice){
    let vNotionalFees = (((pQty * 2) * pLotSize * pIndexPrice) * gBrokerage) / 100;

    let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * 5) / 100;
    let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * 5) / 100;
    let vPremiumCapFees = vSellBrokerage + vBuyBrokerage;

    let vEffectiveBrokerage = 0;

    if(vPremiumCapFees < vNotionalFees){
        vEffectiveBrokerage = vPremiumCapFees * 1.18;
    }
    else{
        vEffectiveBrokerage = vNotionalFees * 1.18;
    }

    return vEffectiveBrokerage;
}

function fnGetTradePL(pBuyPrice, pSellPrice, pLotSize, pQty, pCharges){
    let vPL = ((pSellPrice - pBuyPrice) * pLotSize * pQty) - pCharges;

    return vPL;
}

async function fnCloseOptPosition(pLegID, pTransType, pOptionType, pSymbol, pStatus){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objStepSwt = document.getElementById("swtStepDFL");

    let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, pSymbol);
    
    if(objBestRates.status === "success"){
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    
        let vBestBuyRate = parseFloat(objBestRates.data.result.quotes.best_ask);

        let vStrikePrice = 0;
        let vLotSize = 0;
        let vQty = 0;
        let vBuyPrice = 0;
        let vSellPrice = 0;

        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};
        gSymbGammaList = {};
        gSymbVegaList = {};
        gSymbMarkIVList = {};
        gSymbRhoList = {};
        gSymbThetaList = {};

        for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
            if(gCurrPosDFL.TradeData[i].ClientOrderID === pLegID){
                gCurrPosDFL.TradeData[i].BuyPrice = vBestBuyRate;
                gCurrPosDFL.TradeData[i].CloseDT = vToday;
                gCurrPosDFL.TradeData[i].Status = pStatus;

                vStrikePrice = gCurrPosDFL.TradeData[i].StrikePrice;
                vLotSize = gCurrPosDFL.TradeData[i].LotSize;
                vQty = gCurrPosDFL.TradeData[i].Qty;
                vBuyPrice = gCurrPosDFL.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDFL.TradeData[i].SellPrice;
            }
        }

        if(objStepSwt.checked){
            let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
            let objStartQty = document.getElementById("txtStartQty");

            if(pOptionType === "C"){
                let vTotLossAmtCE = localStorage.getItem("TotLossAmtCE");
                let vQtyCE = localStorage.getItem("QtyCallDFL");
                vTotLossAmtCE = parseFloat(vTotLossAmtCE) + parseFloat(vPL);
                localStorage.setItem("TotLossAmtCE", vTotLossAmtCE);
                document.getElementById("txtCallPL").value = vTotLossAmtCE;

                if(parseFloat(vTotLossAmtCE) < 0){
                    let vNewQty = parseInt(vQtyCE) + parseInt(objStartQty.value);
                    localStorage.setItem("QtyCallDFL", vNewQty);
                    document.getElementById("txtQtyCE").value = vNewQty;
                }
                else{
                    document.getElementById("txtCallPL").value = 0;
                    document.getElementById("txtQtyCE").value = objStartQty.value;
                    localStorage.setItem("QtyCallDFL", objStartQty.value);
                }
            }
            else if(pOptionType === "P"){
                let vTotLossAmtPE = localStorage.getItem("TotLossAmtPE");
                let vQtyPE = localStorage.getItem("QtyPutDFL");
                vTotLossAmtPE = parseFloat(vTotLossAmtPE) + parseFloat(vPL);
                localStorage.setItem("TotLossAmtPE", vTotLossAmtPE);
                document.getElementById("txtPutPL").value = vTotLossAmtPE;

                if(parseFloat(vTotLossAmtPE) < 0){
                    let vNewQty = parseInt(vQtyPE) + parseInt(objStartQty.value);
                    localStorage.setItem("QtyPutDFL", vNewQty);
                    document.getElementById("txtQtyPE").value = vNewQty;
                }
                else{
                    document.getElementById("txtPutPL").value = 0;
                    document.getElementById("txtQtyPE").value = objStartQty.value;
                    localStorage.setItem("QtyPutDFL", objStartQty.value);
                }
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDFL);
        localStorage.setItem("CurrPosDFL", objExcTradeDtls);

        console.log("Position Updated!");

        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();

        // if(pReLeg){
        //     fnInitOpenOptTrade(pOptionType, pTransType);
        // }
    }
}

function fnGetBestRatesBySymbId(pApiKey, pApiSecret, pSymbol){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({ ApiKey : pApiKey, ApiSecret : pApiSecret, Symbol : pSymbol });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExcFunding/getBestRatesBySymb", requestOptions)
        .then(response => response.json())
        .then(objResult => {

            if(objResult.status === "success"){
                let vRes = JSON.parse(objResult.data);
                // console.log(vRes);
                // let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                // resolve({ "status": objResult.status, "message": objResult.message, "data": objBestRates });
                resolve({ "status": objResult.status, "message": objResult.message, "data": vRes });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){

                    // fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                    reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
                }
                else{
                    // fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                    reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
                }
            }
            else{
                fnGenMessage("Error in Getting Best Rates Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            // fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting Option Best Rates...", "data": "" });
        });
    });

    return objPromise;
}

function fnOpenEditModel(pLegID, pLotSize, pQty, pBuyPrice, pSellPrice){
    let objLegID = document.getElementById("hidLegID");
    let objLotSize = document.getElementById("txtEdLotSize");
    let objQty = document.getElementById("txtEdQty");
    let objBuyPrice = document.getElementById("txtEdBuyPrice");
    let objSellPrice = document.getElementById("txtEdSellPrice");

    objLegID.value = pLegID;
    objLotSize.value = pLotSize;
    objQty.value = pQty;
    objBuyPrice.value = pBuyPrice;
    objSellPrice.value = pSellPrice;
    
    $('#mdlLegEditor').modal('show');
}

function fnUpdateOptionLeg(){
    gUpdPos = false;
    let objLegID = document.getElementById("hidLegID");
    let objLotSize = document.getElementById("txtEdLotSize");
    let objQty = document.getElementById("txtEdQty");
    let objBuyPrice = document.getElementById("txtEdBuyPrice");
    let objSellPrice = document.getElementById("txtEdSellPrice");

    if(objLotSize.value === ""){
        fnGenMessage("Please Enter Lot Size!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objQty.value === ""){
        fnGenMessage("Please Enter Quantity!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objBuyPrice.value === ""){
        fnGenMessage("Please Enter Buy Price!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objSellPrice.value === ""){
        fnGenMessage("Please Enter Sell Price!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
            if(gCurrPosDFL.TradeData[i].ClientOrderID === parseInt(objLegID.value)){
                gCurrPosDFL.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosDFL.TradeData[i].Qty = parseInt(objQty.value);
                gCurrPosDFL.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                gCurrPosDFL.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDFL);
        localStorage.setItem("CurrPosDFL", objExcTradeDtls);
        fnLoadCurrentTradePos();
        fnGenMessage("Option Leg Updated!", `badge bg-success`, "spnGenMsg");
        $('#mdlLegEditor').modal('hide');
    }
    gUpdPos = true;
}

function fnDelLeg(pLegID){
    if(confirm("Are You Sure, You Want to Delete This Leg!")){
        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};
        gSymbGammaList = {};
        gSymbVegaList = {};
        gSymbMarkIVList = {};
        gSymbRhoList = {};
        gSymbThetaList = {};

        let vDelRec = null;

        for(let i=0; i<gCurrPosDFL.TradeData.length; i++){
            if(gCurrPosDFL.TradeData[i].ClientOrderID === pLegID){
                vDelRec = i;
            }
        }

        gCurrPosDFL.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosDFL);
        localStorage.setItem("CurrPosDFL", objExcTradeDtls);
        gUpdPos = true;

        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
    }
}

function fnOpenStrategyDialog(){
    let objStrategyName = document.getElementById("txtStrategyName");
    let objStrategyDesc = document.getElementById("taDescription");

    objStrategyName.value = "";
    objStrategyDesc.value = "";

    $('#mdlDeltaNewStrategy').modal('show');
}

function fnAddNewStrategy(){
    let objStrategyName = document.getElementById("txtStrategyName");
    let objStrategyDesc = document.getElementById("taDescription");
    // let objStrats = JSON.parse(localStorage.getItem("DeltaStratsDFL"));

    if(objStrategyName.value === ""){
        fnGenMessage("Please Input Valid Strategy Name!", `badge bg-danger`, "spnStratMsgs");
    }
    else{
        const vToday = new Date();

        // let objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ Account : "Acc1", UndrAsst : "BTCUSD", TransType : "sell", OptionType : "F", DeltaNew : 1.00, DeltaTP : 2.00, DeltaSL : 0.10 }, { Account : "Acc1", UndrAsst : "BTC", TransType : "sell", OptionType : "P", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { Account : "Acc1", UndrAsst : "BTC", TransType : "sell", OptionType : "C", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }

        gCurrStrats.StratsData.push({ StratID : vToday.valueOf(), StratName : objStrategyName.value, StratDesc : objStrategyDesc.value, StratModel : [{}] });

        //, SellDeltaMinOC : 0.20, SellDeltaMaxOC : 0.60, SellStartQty : 1000, SellMultiplier : 1, SellAdjDeltaTP : 0.20, SellAdjDeltaSL : 0.80, SellNewPosDelta : 0.53, BuyDeltaMinOC : 0.20, BuyDeltaMaxOC : 0.60, BuyStartQty : 1000, BuyMultiplier : 1, BuyAdjDeltaTP : 0.80, BuyAdjDeltaSL : 0.20, BuyNewPosDelta : 0.53

        localStorage.setItem("DeltaStratsDFL", JSON.stringify(gCurrStrats));

        fnLoadCurrStrategies();
        // fnLoadDefStrategy();
        $('#mdlDeltaNewStrategy').modal('hide');
        fnGenMessage("New Strategy Created!", `badge bg-success`, "spnGenMsg");
    }
    console.log(gCurrStrats);
}



function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosDFL");
    localStorage.setItem("QtyMulDFL", 0);
    localStorage.removeItem("DeltaNetLimit");

    localStorage.removeItem("TotLossAmtCE");
    localStorage.removeItem("TotLossAmtPE");
    localStorage.removeItem("QtyCallDFL");
    localStorage.removeItem("QtyPutDFL");
    localStorage.removeItem("StartQtyDFL");
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
        if(gForceCloseDFL){
            gForceCloseDFL = false;
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
                fnUpdateRates(vTicData);
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

function fnUpdateRates(pTicData){
    // console.log(pTicData);
    gSymbBRateList[pTicData.symbol] = pTicData.quotes.best_ask;
    gSymbSRateList[pTicData.symbol] = pTicData.quotes.best_bid;

    if(pTicData.contract_type !== "perpetual_futures"){
        gSymbDeltaList[pTicData.symbol] = pTicData.greeks.delta;
        gSymbGammaList[pTicData.symbol] = pTicData.greeks.gamma;
        gSymbVegaList[pTicData.symbol] = pTicData.greeks.vega;
        gSymbMarkIVList[pTicData.symbol] = pTicData.quotes.mark_iv;
        gSymbRhoList[pTicData.symbol] = pTicData.greeks.rho;
        gSymbThetaList[pTicData.symbol] = pTicData.greeks.theta;
    }

    // console.log(gSymbGammaList);
    // console.log(gSymbVegaList);
    // console.log(gSymbMarkIVList);
    // console.log(gSymbRhoList);
    // console.log(gSymbThetaList);
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
        gForceCloseDFL = true;
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

    localStorage.setItem("TradeSideSwtDFL", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideSwtDFL") === null){
        localStorage.setItem("TradeSideSwtDFL", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideSwtDFL");
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
    let objExpiryLong = document.getElementById("txtExpLong");

    let vCurrDate = new Date();
    let vCurrFriday = new Date(vCurrDate);
    let vYear = vCurrDate.getFullYear();
    let vMonth = vCurrDate.getMonth();
    let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
    let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);

    //************** Daily Expiry ***************//
    let vCurrHour = vCurrDate.getHours();

    if(vCurrHour >= 16){
        vCurrDate.setDate(vCurrDate.getDate() + 2);
    }
    else if(vCurrHour >= 0){
        vCurrDate.setDate(vCurrDate.getDate() + 1);
    }

    let vDayD = (vCurrDate.getDate()).toString().padStart(2, "0");
    let vMonthD = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
    let vExpValD = vCurrDate.getFullYear() + "-" + vMonthD + "-" + vDayD;

    objExpiryDay.value = vExpValD;
    //************** Daily Expiry ***************//

    //************** Weekly Expiry ***************//
    let vCurrDayOfWeek = vCurrDate.getDay();
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

    let vCurrDay = vCurrDate.getDate();
    let vDayM = (vLastDayOfMonth.getDate()).toString().padStart(2, "0");
    let vMonthM = (vLastDayOfMonth.getMonth() + 1).toString().padStart(2, "0");
    let vExpValM = vLastDayOfMonth.getFullYear() + "-" + vMonthM + "-" + vDayM;

    if(vCurrDay > 17){
        vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
        vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
        vExpValM = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;
    }

    objExpiryMonth.value = vExpValM;
    objExpiryLong.value = vExpValM;
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