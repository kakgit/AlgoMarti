
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyBuyMultiplierM = 0;
let gQtySellMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosDSSD = { TradeData : []};
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
let gBrokerage = 0.010;

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

    socket.on("tv-Msg-SSDemo-Open", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSD");
        let vTradeSide = localStorage.getItem("TradeSideSwtDSSD");
        let objMsg = (pMsg);

        // fnChangeSymbol(objMsg.symbolName);

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            // if(((vTradeSide === "true") && (objMsg.OptionType === "P")) || ((vTradeSide === "false") && (objMsg.OptionType === "C")) || (vTradeSide === "-1")){
                fnPreInitTrade(objMsg.OptionType, objMsg.TransType);
            // }
            // else{
            //     fnGenMessage(objMsg.OptionType + " Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
            // }
        }
    });

    socket.on("tv-Msg-SSDemo-Close", (pMsg) => {
        let objMsg = (pMsg);

        fnPreInitTradeClose(objMsg.OptionType);
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

        // fnLoadAllExpiryDate();
        fnLoadCurrentTradePos();
        // setInterval(fnGetDelta, 300000);
        fnUpdateOpenPositions();

        fnLoadTotalLossAmtQty();
    }
}

function fnLoadCurrStrategies(){
    let objStrats = JSON.parse(localStorage.getItem("DeltaStratsDSSD"));
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
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyDSSD"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellDSSD"));

    let objBQtyCE = document.getElementById("txtBQtyCE");
    let objBQtyPE = document.getElementById("txtBQtyPE");
    let objStartBuyQty = document.getElementById("txtStartBQty");

    let objSQtyCE = document.getElementById("txtSQtyCE");
    let objSQtyPE = document.getElementById("txtSQtyPE");
    let objStartSellQty = document.getElementById("txtStartSQty");

    if(objStartQtyBuyM === null){
        objStartBuyQty.value = 1;
        objBQtyCE.value = 1;
        objBQtyPE.value = 1;
        localStorage.setItem("StartQtyBuyDSSD", objStartBuyQty.value);
    }
    else{
        objStartBuyQty.value = objStartQtyBuyM;
        objBQtyCE.value = objStartQtyBuyM;
        objBQtyPE.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartSellQty.value = 1;
        objSQtyCE.value = 1;
        objSQtyPE.value = 1;
        localStorage.setItem("StartQtySellDSSD", objStartSellQty.value);
    }
    else{
        objStartSellQty.value = objStartQtySellM;
        objSQtyCE.value = objStartQtySellM;
        objSQtyPE.value = objStartQtySellM;
    }
}

function fnChangeBuyStartQty(pThisVal){
    let objBQtyCE = document.getElementById("txtBQtyCE");
    let objBQtyPE = document.getElementById("txtBQtyPE");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSSD", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSSD", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyBuyDSSD", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objBQtyCE.value = pThisVal.value;
            objBQtyPE.value = pThisVal.value;
            localStorage.setItem("QtyCallBuyDSSD", pThisVal.value);
            localStorage.setItem("QtyPutBuyDSSD", pThisVal.value);
        }
    }
    // fnChangeReqMargin();
    // console.log(localStorage.getItem("StartQtyBuyDSSD"));
}

function fnChangeSellStartQty(pThisVal){
    let objSQtyCE = document.getElementById("txtSQtyCE");
    let objSQtyPE = document.getElementById("txtSQtyPE");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSD", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSD", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtySellDSSD", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objSQtyCE.value = pThisVal.value;
            objSQtyPE.value = pThisVal.value;
            localStorage.setItem("QtyCallSellDSSD", pThisVal.value);
            localStorage.setItem("QtyPutSellDSSD", pThisVal.value);
        }
    }
    // fnChangeReqMargin();
    // console.log(localStorage.getItem("StartQtySellDSSD"));
}

function fnChangeBuyQtyCE(pThis){
    localStorage.setItem("QtyCallBuyDSSD", pThis.value);
}

function fnChangeBuyQtyPE(pThis){
    localStorage.setItem("QtyPutBuyDSSD", pThis.value);
}

function fnChangeBuyCallPL(pThis){
    localStorage.setItem("TLAmtBuyCeDSSD", pThis.value);
}

function fnChangeBuyPutPL(pThis){
    localStorage.setItem("TLAmtBuyPeDSSD", pThis.value);
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("SymbDSSD", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("SymbDSSD"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("SymbDSSD", JSON.stringify(pThisVal));

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
    // let objNetLimits = JSON.parse(localStorage.getItem("NetLimitDSSD"));
    // let objSpnBal1 = document.getElementById("spnBal1");
    // let objSpmReqMargin = document.getElementById('spnMarginReq');
    let objBQtyCE = document.getElementById("txtBQtyCE");
    let objBQtyPE = document.getElementById("txtBQtyPE");
    let objStartBQty = document.getElementById("txtStartBQty");

    let objSQtyCE = document.getElementById("txtSQtyCE");
    let objSQtyPE = document.getElementById("txtSQtyPE");
    let objStartSQty = document.getElementById("txtStartSQty");

    gQtyBuyMultiplierM = objStartBQty.value;
    gQtySellMultiplierM = objStartSQty.value;

    if(gQtyBuyMultiplierM === null || gQtyBuyMultiplierM === ""){
        gQtyBuyMultiplierM = 0;
        objBQtyCE.value = gQtyBuyMultiplierM;
        objBQtyPE.value = gQtyBuyMultiplierM;
    }
    else{
        objBQtyCE.value = gQtyBuyMultiplierM;
        objBQtyPE.value = gQtyBuyMultiplierM;
    }

    if(gQtySellMultiplierM === null || gQtySellMultiplierM === ""){
        gQtySellMultiplierM = 0;
        objSQtyCE.value = gQtySellMultiplierM;
        objSQtyPE.value = gQtySellMultiplierM;
    }
    else{
        objSQtyCE.value = gQtySellMultiplierM;
        objSQtyPE.value = gQtySellMultiplierM;
    }

    // if(objNetLimits === null || objNetLimits === ""){
    //     // objSpnBal1.innerText = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
    // }
    // else{
    //     let Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
    //     objSpnBal1.innerText = Acc1BalUSD;

    //     let vTotalMarginReq = (gMinReqMargin * gQtyMultiplierM).toFixed(2);
    //     objSpmReqMargin.innerText = vTotalMarginReq;

    //     if(parseFloat(vTotalMarginReq) > parseFloat(Acc1BalUSD)){
    //         objSpmReqMargin.style.color = "red";
    //     }
    //     else{
    //         objSpmReqMargin.style.color = "green";
    //     }
    // }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosDSSD"));

    gCurrPosDSSD = objCurrPos;

    if(gCurrPosDSSD === null){
        gCurrPosDSSD = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnSetSymbolTickerList(){
    if(gCurrPosDSSD.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if(gCurrPosDSSD.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosDSSD.TradeData[i].Symbol);
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
    // let vStepM = JSON.parse(localStorage.getItem("OptStepDSSD"));
    let objSwtStep = document.getElementById("swtStepDFL");

    localStorage.setItem("OptStepDSSD", JSON.stringify(objSwtStep.checked));
    // alert(objSwtStep.checked);
}

function fnLoadOptStep(){
    let vStepM = JSON.parse(localStorage.getItem("OptStepDSSD"));
    let objSwtStep = document.getElementById("swtStepDFL");

    if(vStepM){
        objSwtStep.checked = true;
    }
    else{
        objSwtStep.checked = false;
    }
}

function fnLoadTotalLossAmtQty(){
    let vTLAmtCeBuyDSSD = localStorage.getItem("TLAmtBuyCeDSSD");
    let vTLAmtPeBuyDSSD = localStorage.getItem("TLAmtBuyPeDSSD");
    let vQtyCEM = localStorage.getItem("QtyCallBuyDSSD");
    let vQtyPEM = localStorage.getItem("QtyPutBuyDSSD");
    let objBQtyCE = document.getElementById("txtBQtyCE");
    let objBQtyPE = document.getElementById("txtBQtyPE");
    let objDefQty = document.getElementById("txtStartBQty");

    let objCallPL = document.getElementById("txtBCallPL");
    let objPutPL = document.getElementById("txtBPutPL");

    if(vTLAmtCeBuyDSSD === null || vTLAmtCeBuyDSSD === "" || isNaN(vTLAmtCeBuyDSSD)){
        localStorage.setItem("TLAmtBuyCeDSSD", 0);
        localStorage.setItem("QtyCallBuyDSSD", objDefQty.value);
    }
    else if(parseFloat(vTLAmtCeBuyDSSD) > 0){
        objCallPL.value = 0;
    }
    else{
        objCallPL.value = vTLAmtCeBuyDSSD;

        if(parseInt(vQtyCEM) < parseInt(objDefQty.value)){
            objBQtyCE.value = objDefQty.value;
        }
        else{
            objBQtyCE.value = vQtyCEM;
        }
    }

    if(vTLAmtPeBuyDSSD === null || vTLAmtPeBuyDSSD === "" || isNaN(vTLAmtPeBuyDSSD)){
        localStorage.setItem("TLAmtBuyPeDSSD", 0);
        localStorage.setItem("QtyPutBuyDSSD", objDefQty.value);
    }
    else if(parseFloat(vTLAmtPeBuyDSSD) > 0){
        objPutPL.value = 0;
    }
    else{
        objPutPL.value = vTLAmtPeBuyDSSD;

        if(parseInt(vQtyPEM) < parseInt(objDefQty.value)){
            objBQtyPE.value = objDefQty.value;
        }
        else{
            objBQtyPE.value = vQtyPEM;
        }
    }
}

function fnSaveUpdCurrPos(){
    // console.log(gCurrPosDSSD);
    let vToPosClose = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";
    let objCallPL = document.getElementById("txtBCallPL");
    let objPutPL = document.getElementById("txtBPutPL");

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        if(gCurrPosDSSD.TradeData[i].Status === "OPEN"){
            let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDSSD.TradeData[i].Symbol]);
            let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosDSSD.TradeData[i].Symbol]);
            let vCurrVega = parseFloat(gSymbVegaList[gCurrPosDSSD.TradeData[i].Symbol]);
            let vCurrMarkIV = parseFloat(gSymbMarkIVList[gCurrPosDSSD.TradeData[i].Symbol]);
            let vCurrRho = parseFloat(gSymbRhoList[gCurrPosDSSD.TradeData[i].Symbol]);
            let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosDSSD.TradeData[i].Symbol]);

            gCurrPosDSSD.TradeData[i].DeltaC = vCurrDelta;
            gCurrPosDSSD.TradeData[i].GammaC = vCurrGamma;
            gCurrPosDSSD.TradeData[i].VegaC = vCurrVega;
            gCurrPosDSSD.TradeData[i].MarkIVC = vCurrMarkIV;
            gCurrPosDSSD.TradeData[i].RhoC = vCurrRho;
            gCurrPosDSSD.TradeData[i].ThetaC = vCurrTheta;

            let vStrikePrice = gCurrPosDSSD.TradeData[i].StrikePrice;
            let vLotSize = gCurrPosDSSD.TradeData[i].LotSize;
            let vQty = gCurrPosDSSD.TradeData[i].Qty;
            let vBuyPrice = gCurrPosDSSD.TradeData[i].BuyPrice;
            let vSellPrice = gCurrPosDSSD.TradeData[i].SellPrice;
            let vOptionTypeZZ = gCurrPosDSSD.TradeData[i].OptionType;

            let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

            if(gCurrPosDSSD.TradeData[i].TransType === "sell"){
                let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDSSD.TradeData[i].Symbol]);
                gCurrPosDSSD.TradeData[i].BuyPrice = vCurrPrice;

                if((vCurrPrice > gCurrPosDSSD.TradeData[i].TradeSL) || (vCurrPrice < gCurrPosDSSD.TradeData[i].TradeTP)){
                    vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                    vTransType = gCurrPosDSSD.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                    vToPosClose = true;
                }
                else if(vPL > 0){
                    if((vOptionTypeZZ === "C") && (parseFloat(objCallPL.value) < 0) && (vPL > Math.abs(parseFloat(objCallPL.value)))){
                        vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                        vTransType = gCurrPosDSSD.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                    else if((vOptionTypeZZ === "P") && (parseFloat(objPutPL.value) < 0) && (vPL > Math.abs(parseFloat(objPutPL.value)))){
                        vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                        vTransType = gCurrPosDSSD.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                }
            }
            else if(gCurrPosDSSD.TradeData[i].TransType === "buy"){
                let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDSSD.TradeData[i].Symbol]);
                gCurrPosDSSD.TradeData[i].SellPrice = vCurrPrice;

                if((vCurrPrice < gCurrPosDSSD.TradeData[i].TradeSL) || (vCurrPrice > gCurrPosDSSD.TradeData[i].TradeTP)){
                    vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                    vTransType = gCurrPosDSSD.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                    vToPosClose = true;
                }
                // else if(vPL > 0){
                //     if((vOptionTypeZZ === "C") && (parseFloat(objCallPL.value) < 0) && (vPL > Math.abs(parseFloat(objCallPL.value)))){
                //         vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                //         vTransType = gCurrPosDSSD.TradeData[i].TransType;
                //         vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                //         vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                //         vToPosClose = true;
                //     }
                //     else if((vOptionTypeZZ === "P") && (parseFloat(objPutPL.value) < 0) && (vPL > Math.abs(parseFloat(objPutPL.value)))){
                //         vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                //         vTransType = gCurrPosDSSD.TradeData[i].TransType;
                //         vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                //         vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                //         vToPosClose = true;
                //     }
                // }
            }
        }
    }

    fnUpdateOpenPositions();

    if(vToPosClose){
        // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSD"));
        // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSD"));

        // if((objTrdCountCE > 1 || objTrdCountPE > 1) && vTransType === "sell"){

        //     fnGetBuyOpenPosAndClose(vTransType, vOptionType);
        // }
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }
}

function fnGetBuyOpenPosAndClose(pTransType, pOptionType){
    let vToPosClose = false;
    let vLegID = 0;
    let vSymbol = "";

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        if((gCurrPosDSSD.TradeData[i].Status === "OPEN") && (gCurrPosDSSD.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSD.TradeData[i].TransType === "buy")){
            vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
            vToPosClose = true;
        }
    }

    if(vToPosClose){
        fnCloseOptPosition(vLegID, "buy", vOptionType, vSymbol, "CLOSED");
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
    console.log(gCurrPosDSSD);
}

//************ Update Live Code Here **************//
function fnLoadDefExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlBuyExpiryMode");
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let vBuyExpiryMode = JSON.parse(localStorage.getItem("BuyExpiryModeDSSD"));
    let vSellExpiryMode = JSON.parse(localStorage.getItem("SellExpiryModeDSSD"));
    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");

    if(vBuyExpiryMode === null){
        objBuyExpiryMode.value = 1;
    }
    else{
        objBuyExpiryMode.value = vBuyExpiryMode;
    }
    fnLoadExpiryDate(objBuyExpiryMode.value, objExpiryBuy);

    if(vSellExpiryMode === null){
        objSellExpiryMode.value = 1;
    }
    else{
        objSellExpiryMode.value = vSellExpiryMode;
    }
    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
}

function fnUpdateBuyExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlBuyExpiryMode");
    let objExpiryBuy = document.getElementById("txtExpBuy");

    fnLoadExpiryDate(objBuyExpiryMode.value, objExpiryBuy);
    localStorage.setItem("BuyExpiryModeDSSD", JSON.stringify(objBuyExpiryMode.value));
}

function fnUpdateSellExpiryMode(){
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let objExpirySell = document.getElementById("txtExpSell");

    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
    localStorage.setItem("SellExpiryModeDSSD", JSON.stringify(objSellExpiryMode.value));
}

function fnLoadExpiryDate(pExpiryMode, objExpiry){
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

        objExpiry.value = vExpValTB;
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

        objExpiry.value = vExpValTB;
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

        if(vCurrDay > 15){
            vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
            vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
            vExpValTB = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;
        }
        objExpiry.value = vExpValTB;
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

function fnSwapCurrency(){
    let objNetLimits = JSON.parse(localStorage.getItem("NetLimitDSSD"));
    let objDisplayCurr1 = document.getElementById("spnCurrency1");
    let objDisplayBal1 = document.getElementById("spnBal1");

    if(objDisplayCurr1.innerText === "USD"){
        objDisplayCurr1.innerText = "INR";
        objDisplayBal1.innerText = (parseFloat(objNetLimits.Acc1BalINR)).toFixed(2);
    }
    else if(objDisplayCurr1.innerText === "INR"){
        objDisplayCurr1.innerText = "USD";
        objDisplayBal1.innerText = (parseFloat(objNetLimits.Acc1BalUSD)).toFixed(2);
    }        
}

function fnChangeReqMargin(){
    let objNetLimits = JSON.parse(localStorage.getItem("NetLimitDSSD"));
    let objSpmReqMargin = document.getElementById("spnMarginReq");
    let objBQtyCE = document.getElementById("txtBQtyCE");
    let Acc1BalUSD = 0;

    if(objNetLimits === null || objNetLimits === ""){

    }
    else{
        Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
    }

    if(isNaN(parseFloat(objBQtyCE.value)) || objBQtyCE.value === ""){
        objSpmReqMargin.innerText = (0.00).toFixed(2);
    }
    else{
        let vTotalMarginReq = (gMinReqMargin * parseFloat(objBQtyCE.value)).toFixed(2);
        objSpmReqMargin.innerText = vTotalMarginReq;

        // localStorage.setItem("QtyMulDSSD", objBQtyCE.value);

        if(parseFloat(vTotalMarginReq) > parseFloat(Acc1BalUSD)){
            objSpmReqMargin.style.color = "red";
        }
        else{
            objSpmReqMargin.style.color = "green";
        }
    }
}

function fnPreInitTrade(pOptionType, pTransType){
    let vIsRecExists = false;

    fnUpdateBuyExpiryMode();
    fnUpdateSellExpiryMode();

    if(gCurrPosDSSD.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if((gCurrPosDSSD.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSD.TradeData[i].TransType === pTransType) && (gCurrPosDSSD.TradeData[i].Status === "OPEN")){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        fnInitTrade(pOptionType, pTransType);
    }
    else{
        fnGenMessage("Trade Message Received but Same Option Type is Already Open!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnPreInitTradeClose(pOptionType){
    let vIsRecExists = false;
    let vLegID = 0;
    let vTransType = "";
    let vSymbol = "";
    let vState = "CLOSED";

    if(gCurrPosDSSD.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if((gCurrPosDSSD.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSD.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                vTransType = gCurrPosDSSD.TradeData[i].TransType;
                vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                
                vIsRecExists = true;
            }
        }
    }
    //fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);

    if(vIsRecExists === true){
        // console.log(vLegID);
        // console.log(vTransType);
        // console.log(pOptionType);
        // console.log(vSymbol);
        // console.log(vState);
        fnCloseOptPosition(vLegID, vTransType, pOptionType, vSymbol, vState);
    }
    else{
        fnGenMessage("Trade Message Received but Option is not Open!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnInitTrade(pOptionType, pTransType){
    // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSD"));
    // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSD"));

    let objApiKey1 = document.getElementById("txtUserAPIKey");
    let objApiSecret1 = document.getElementById("txtAPISecret");

    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objBQtyCE = document.getElementById("txtBQtyCE");
    let objBQtyPE = document.getElementById("txtBQtyPE");
    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
    let objOrderType = document.getElementById("ddlOrderType");

    let objStrategies = [];

    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let vExpiryNewPos = "";

    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);

    if(pTransType === "sell"){
        vExpiryNewPos = vSellExpiry;
    }
    else if(pTransType === "buy"){
        vExpiryNewPos = vBuyExpiry;
    }

    //{ TransType : "sell", OptionType : "F", DeltaNew : 1.00, DeltaTP : 2.00, DeltaSL : 0.10 },
    
    if(pTransType === "sell"){
        objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ TransType : "sell", OptionType : "P", RateNew : 600, RateTP : 600, RateSL : 600, DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { TransType : "sell", OptionType : "C", RateNew : 600, RateTP : 600, RateSL : 600, DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }
    }
    else if(pTransType === "buy"){
        objStrategies = { Strategies : [{ StratID : 1234325, StratName : "S-1", StratModel : [{ TransType : "buy", OptionType : "P", RateNew : 900, RateTP : 10000, RateSL : 900, DeltaNew : 0.50, DeltaTP : 0.65, DeltaSL : 0.35 }, { TransType : "buy", OptionType : "C", RateNew : 900, RateTP : 10000, RateSL : 900, DeltaNew : 0.50, DeltaTP : 0.65, DeltaSL : 0.35 }] }] }
    }

    gUpdPos = false;

    for(let i=0; i<objStrategies.Strategies[0].StratModel.length; i++){
        let vApiKey = "";
        let vApiSecret = "";
        let vUndrAsst = objSymbol.value;
        let vOptionType = objStrategies.Strategies[0].StratModel[i].OptionType;
        let vTransType = objStrategies.Strategies[0].StratModel[i].TransType;
        let vDeltaNPos = objStrategies.Strategies[0].StratModel[i].DeltaNew;
        let vDeltaTP = objStrategies.Strategies[0].StratModel[i].DeltaTP;
        let vDeltaSL = objStrategies.Strategies[0].StratModel[i].DeltaSL;
        let vRateNPos = objStrategies.Strategies[0].StratModel[i].RateNew;
        let vRateTP = objStrategies.Strategies[0].StratModel[i].RateTP;
        let vRateSL = objStrategies.Strategies[0].StratModel[i].RateSL;
        let vClientID = vOrdId + i;

        vApiKey = objApiKey1.value;
        vApiSecret = objApiSecret1.value;
        let vQty = 0;

        if(pOptionType === "C"){
            vQty = objBQtyCE.value;

            // if(objTrdCountCE === null || objTrdCountCE === ""){
            //     objTrdCountCE = 0;
            // }
        }
        else if(pOptionType === "P"){
            vQty = objBQtyPE.value;

            // if(objTrdCountPE === null || objTrdCountPE === ""){
            //     objTrdCountPE = 0;
            // }
        }

        if(objStrategies.Strategies[0].StratModel[i].OptionType === pOptionType){
            let objTradeDtls = await fnExecOption(vApiKey, vApiSecret, vUndrAsst, vExpiryNewPos, vOptionType, vTransType, vRateNPos, vDeltaNPos, objOrderType.value, vQty, vClientID);
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
                let vTradeSL = 0;
                let vTradeTP = 0;

                if(vTransType === "sell"){
                    vTradeSL = vBestSell + vRateSL;
                    vTradeTP = vBestSell - vRateTP;

                    // if(pOptionType === "C"){
                    //     objTrdCountCE = objTrdCountCE + 1;
                    //     localStorage.setItem("CETrdCntDSSD", objTrdCountCE);
                    // }
                    // else if(pOptionType === "P"){
                    //     objTrdCountPE = objTrdCountPE + 1;
                    //     localStorage.setItem("PETrdCntDSSD", objTrdCountPE);
                    // }
                }
                else if(vTransType === "buy"){
                    vTradeSL = vBestBuy - vRateSL;
                    vTradeTP = vBestBuy + vRateTP;
                }

                let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, TradeSL : vTradeSL, TradeTP : vTradeTP, Status : "OPEN" };
                
                gCurrPosDSSD.TradeData.push(vExcTradeDtls);

                let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);

                localStorage.setItem("CurrPosDSSD", objExcTradeDtls);

                gUpdPos = true;
                fnSetSymbolTickerList();
                fnUpdateOpenPositions();

                // if(vTransType === "sell"){
                //     if(objTrdCountCE > 1 && pOptionType === "C"){
                //         fnInitTrade(pOptionType, "buy");
                //         // console.log("Exec CE Buy Trade");
                //     }
                //     else if(objTrdCountPE > 1 && pOptionType === "P"){
                //         fnInitTrade(pOptionType, "buy");
                //         // console.log("Exec PE Buy Trade");
                //     }
                //     // console.log(objTrdCountCE);
                //     // console.log(objTrdCountPE);
                // }
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
}

function fnExecOption(pApiKey, pApiSecret, pUndAsst, pExpiry, pOptionType, pTransType, pRateNPos, pDeltaNPos, pOrderType, pQty, pClientID){
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
            "RateNPos" : pRateNPos,
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

        fetch("/deltaSStrangleDemo/execOption", requestOptions)
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
        // console.log(gCurrPosDSSD);
        if(gCurrPosDSSD.TradeData.length === 0){
            objCurrTradeList.innerHTML = '<tr><td colspan="13"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vTotalTrades = 0;
            let vNetPL = 0;
            let vTotalCharges = 0;
            let vTotalCapital = 0;

            for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
                let vBuyPrice = gCurrPosDSSD.TradeData[i].BuyPrice;
                let vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
                let vContractType = gCurrPosDSSD.TradeData[i].ContrctType;
                let vDelta = gCurrPosDSSD.TradeData[i].Delta;
                let vDeltaNPos = gCurrPosDSSD.TradeData[i].DeltaNP;
                let vDeltaSL = gCurrPosDSSD.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosDSSD.TradeData[i].DeltaTP;
                let vExpiry = gCurrPosDSSD.TradeData[i].Expiry;
                let vGamma = gCurrPosDSSD.TradeData[i].Gamma;
                let vMarkIV = gCurrPosDSSD.TradeData[i].MarkIV;
                let vRho = gCurrPosDSSD.TradeData[i].Rho;
                let vTheta = gCurrPosDSSD.TradeData[i].Theta;
                let vVega = gCurrPosDSSD.TradeData[i].Vega;

                let vDeltaC = gCurrPosDSSD.TradeData[i].DeltaC;
                let vGammaC = gCurrPosDSSD.TradeData[i].GammaC;
                let vMarkIVC = gCurrPosDSSD.TradeData[i].MarkIVC;
                let vRhoC = gCurrPosDSSD.TradeData[i].RhoC;
                let vThetaC = gCurrPosDSSD.TradeData[i].ThetaC;
                let vVegaC = gCurrPosDSSD.TradeData[i].VegaC;

                let vLotSize = gCurrPosDSSD.TradeData[i].LotSize;
                let vOpenDT = gCurrPosDSSD.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosDSSD.TradeData[i].CloseDT;
                let vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                let vProductID = gCurrPosDSSD.TradeData[i].ProductID;
                let vQty = gCurrPosDSSD.TradeData[i].Qty;
                let vSellPrice = gCurrPosDSSD.TradeData[i].SellPrice;
                let vStatus = gCurrPosDSSD.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDSSD.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                let vTransType = gCurrPosDSSD.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosDSSD.TradeData[i].UndrAsstSymb;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
                let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
                vTotalTrades += 1;
                vTotalCharges += parseFloat(vCharges);
                vNetPL += parseFloat(vPL);

                if(vCloseDT === undefined){
                    vCloseDT = "-";
                }

                if(vStatus === "OPEN"){
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:red;">' + (vGammaC).toFixed(5) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(5) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:green;">' + (vVegaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:white;">' + (vMarkIVC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vMarkIV).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:white;">' + (vRhoC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vRho).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:white;">' + (vThetaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(2) + '</div></td>';
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
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vCloseDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '</tr>';
                }
                else{
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGammaC).toFixed(5) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(5) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVegaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vMarkIVC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vMarkIV).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vRhoC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vRho).toFixed(2) + '</div></td>';
                    // vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vThetaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vSymbol + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vTransType + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vLotSize + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vQty + '</td>';
                    vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap;text-align:right; color:grey;">' + (vBuyPrice).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right; color:grey;">' + (vSellPrice).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">'+ (vPL).toFixed(2) +'</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vOpenDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vCloseDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '</tr>';
                }
            }
            vTempHtml += '<tr><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Total Trades: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vTotalTrades +'</td><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Used Margin: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;"></td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;"></td><td></td><td></td></tr>';
            objCurrTradeList.innerHTML = vTempHtml;
        }
    }
}


function fnGetTradeCharges(pIndexPrice, pLotSize, pQty, pBuyPrice, pSellPrice){
    let vNotionalFees = (((pQty * 2) * pLotSize * pIndexPrice) * gBrokerage) / 100;

    let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * 3.5) / 100;
    let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * 3.5) / 100;
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
    
        let vBestRate = 0;

        if(pTransType === "sell"){
            vBestRate = parseFloat(objBestRates.data.result.quotes.best_ask);
        }
        else if(pTransType === "buy"){
            vBestRate = parseFloat(objBestRates.data.result.quotes.best_bid);
        }

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

        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if(gCurrPosDSSD.TradeData[i].ClientOrderID === pLegID){                
                if(pTransType === "sell"){
                    gCurrPosDSSD.TradeData[i].BuyPrice = vBestRate;
                }
                else if(pTransType === "buy"){
                    gCurrPosDSSD.TradeData[i].SellPrice = vBestRate;
                }
                gCurrPosDSSD.TradeData[i].CloseDT = vToday;
                gCurrPosDSSD.TradeData[i].Status = pStatus;

                vStrikePrice = gCurrPosDSSD.TradeData[i].StrikePrice;
                vLotSize = gCurrPosDSSD.TradeData[i].LotSize;
                vQty = gCurrPosDSSD.TradeData[i].Qty;
                vBuyPrice = gCurrPosDSSD.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDSSD.TradeData[i].SellPrice;
            }
        }

        if(objStepSwt.checked){
            let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
            let objStartQty = document.getElementById("txtStartBQty");

            if(pOptionType === "C"){
                let vTLAmtCeBuyDSSD = localStorage.getItem("TLAmtBuyCeDSSD");
                if(parseFloat(vTLAmtCeBuyDSSD) > 0){
                    vTLAmtCeBuyDSSD = 0;
                }
                let vQtyCE = localStorage.getItem("QtyCallBuyDSSD");
                vTLAmtCeBuyDSSD = parseFloat(vTLAmtCeBuyDSSD) + parseFloat(vPL);
                localStorage.setItem("TLAmtBuyCeDSSD", vTLAmtCeBuyDSSD);
                document.getElementById("txtBCallPL").value = vTLAmtCeBuyDSSD;

                if(parseFloat(vTLAmtCeBuyDSSD) < 0){
                    if(pTransType === "sell"){
                        // let vNewQty = parseInt(vQtyCE) + parseInt(objStartQty.value);
                        let vNewQty = parseInt(vQtyCE) * 2;
                        localStorage.setItem("QtyCallBuyDSSD", vNewQty);
                        document.getElementById("txtBQtyCE").value = vNewQty;
                    }
                }
                else{
                    document.getElementById("txtBCallPL").value = 0;
                    document.getElementById("txtBQtyCE").value = objStartQty.value;
                    localStorage.setItem("QtyCallBuyDSSD", objStartQty.value);
                }
            }
            else if(pOptionType === "P"){
                let vTLAmtPeBuyDSSD = localStorage.getItem("TLAmtBuyPeDSSD");
                if(parseFloat(vTLAmtPeBuyDSSD) > 0){
                    vTLAmtPeBuyDSSD = 0;
                }
                let vQtyPE = localStorage.getItem("QtyPutBuyDSSD");
                vTLAmtPeBuyDSSD = parseFloat(vTLAmtPeBuyDSSD) + parseFloat(vPL);
                localStorage.setItem("TLAmtBuyPeDSSD", vTLAmtPeBuyDSSD);
                document.getElementById("txtBPutPL").value = vTLAmtPeBuyDSSD;

                if(parseFloat(vTLAmtPeBuyDSSD) < 0){
                    if(pTransType === "sell"){
                        // let vNewQty = parseInt(vQtyPE) + parseInt(objStartQty.value);
                        let vNewQty = parseInt(vQtyPE) * 2;
                        localStorage.setItem("QtyPutBuyDSSD", vNewQty);
                        document.getElementById("txtBQtyPE").value = vNewQty;
                    }
                }
                else{
                    document.getElementById("txtBPutPL").value = 0;
                    document.getElementById("txtBQtyPE").value = objStartQty.value;
                    localStorage.setItem("QtyPutBuyDSSD", objStartQty.value);
                }
            }
        }
        else{
            let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
            let objStartQty = document.getElementById("txtStartBQty");

            if(pOptionType === "C"){
                let vTLAmtCeBuyDSSD = localStorage.getItem("TLAmtBuyCeDSSD");
                if(parseFloat(vTLAmtCeBuyDSSD) > 0){
                    vTLAmtCeBuyDSSD = 0;
                }
                let vQtyCE = localStorage.getItem("QtyCallBuyDSSD");
                vTLAmtCeBuyDSSD = parseFloat(vTLAmtCeBuyDSSD) + parseFloat(vPL);
                localStorage.setItem("TLAmtBuyCeDSSD", vTLAmtCeBuyDSSD);
                document.getElementById("txtBCallPL").value = vTLAmtCeBuyDSSD;

                if(parseFloat(vTLAmtCeBuyDSSD) < 0){
                    // if(pTransType === "sell"){
                    //     // let vNewQty = parseInt(vQtyCE) + parseInt(objStartQty.value);
                    //     let vNewQty = parseInt(vQtyCE) * 2;
                    //     localStorage.setItem("QtyCallBuyDSSD", vNewQty);
                    //     document.getElementById("txtBQtyCE").value = vNewQty;
                    // }
                }
                else{
                    document.getElementById("txtBCallPL").value = 0;
                    document.getElementById("txtBQtyCE").value = objStartQty.value;
                    localStorage.setItem("QtyCallBuyDSSD", objStartQty.value);
                }
            }
            else if(pOptionType === "P"){
                let vTLAmtPeBuyDSSD = localStorage.getItem("TLAmtBuyPeDSSD");
                if(parseFloat(vTLAmtPeBuyDSSD) > 0){
                    vTLAmtPeBuyDSSD = 0;
                }
                let vQtyPE = localStorage.getItem("QtyPutBuyDSSD");
                vTLAmtPeBuyDSSD = parseFloat(vTLAmtPeBuyDSSD) + parseFloat(vPL);
                localStorage.setItem("TLAmtBuyPeDSSD", vTLAmtPeBuyDSSD);
                document.getElementById("txtBPutPL").value = vTLAmtPeBuyDSSD;

                if(parseFloat(vTLAmtPeBuyDSSD) < 0){
                    // if(pTransType === "sell"){
                    //     // let vNewQty = parseInt(vQtyPE) + parseInt(objStartQty.value);
                    //     let vNewQty = parseInt(vQtyPE) * 2;
                    //     localStorage.setItem("QtyPutBuyDSSD", vNewQty);
                    //     document.getElementById("txtBQtyPE").value = vNewQty;
                    // }
                }
                else{
                    document.getElementById("txtBPutPL").value = 0;
                    document.getElementById("txtBQtyPE").value = objStartQty.value;
                    localStorage.setItem("QtyPutBuyDSSD", objStartQty.value);
                }
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);
        localStorage.setItem("CurrPosDSSD", objExcTradeDtls);

        console.log("Position Closed!");

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

        fetch("/deltaSStraddleDemo/getBestRatesBySymb", requestOptions)
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
        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if(gCurrPosDSSD.TradeData[i].ClientOrderID === parseInt(objLegID.value)){
                gCurrPosDSSD.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosDSSD.TradeData[i].Qty = parseInt(objQty.value);
                gCurrPosDSSD.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                gCurrPosDSSD.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);
        localStorage.setItem("CurrPosDSSD", objExcTradeDtls);
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

        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if(gCurrPosDSSD.TradeData[i].ClientOrderID === pLegID){
                vDelRec = i;
            }
        }

        gCurrPosDSSD.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);
        localStorage.setItem("CurrPosDSSD", objExcTradeDtls);
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
    // let objStrats = JSON.parse(localStorage.getItem("DeltaStratsDSSD"));

    if(objStrategyName.value === ""){
        fnGenMessage("Please Input Valid Strategy Name!", `badge bg-danger`, "spnStratMsgs");
    }
    else{
        const vToday = new Date();

        // let objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ Account : "Acc1", UndrAsst : "BTCUSD", TransType : "sell", OptionType : "F", DeltaNew : 1.00, DeltaTP : 2.00, DeltaSL : 0.10 }, { Account : "Acc1", UndrAsst : "BTC", TransType : "sell", OptionType : "P", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { Account : "Acc1", UndrAsst : "BTC", TransType : "sell", OptionType : "C", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }

        gCurrStrats.StratsData.push({ StratID : vToday.valueOf(), StratName : objStrategyName.value, StratDesc : objStrategyDesc.value, StratModel : [{}] });

        //, SellDeltaMinOC : 0.20, SellDeltaMaxOC : 0.60, SellStartQty : 1000, SellMultiplier : 1, SellAdjDeltaTP : 0.20, SellAdjDeltaSL : 0.80, SellNewPosDelta : 0.53, BuyDeltaMinOC : 0.20, BuyDeltaMaxOC : 0.60, BuyStartQty : 1000, BuyMultiplier : 1, BuyAdjDeltaTP : 0.80, BuyAdjDeltaSL : 0.20, BuyNewPosDelta : 0.53

        localStorage.setItem("DeltaStratsDSSD", JSON.stringify(gCurrStrats));

        fnLoadCurrStrategies();
        // fnLoadDefStrategy();
        $('#mdlDeltaNewStrategy').modal('hide');
        fnGenMessage("New Strategy Created!", `badge bg-success`, "spnGenMsg");
    }
    console.log(gCurrStrats);
}



function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosDSSD");
    localStorage.setItem("QtyMulDSSD", 0);
    localStorage.removeItem("NetLimitDSSD");

    localStorage.removeItem("TLAmtBuyCeDSSD");
    localStorage.removeItem("TLAmtBuyPeDSSD");
    localStorage.removeItem("QtyCallBuyDSSD");
    localStorage.removeItem("QtyPutBuyDSSD");
    // localStorage.removeItem("StartQtyBuyDSSD");

    localStorage.removeItem("CETrdCntDSSD");
    localStorage.removeItem("PETrdCntDSSD");

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

    localStorage.setItem("TradeSideSwtDSSD", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideSwtDSSD") === null){
        localStorage.setItem("TradeSideSwtDSSD", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideSwtDSSD");
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
    let objExpirySell = document.getElementById("txtExpSell");

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
    objExpirySell.value = vExpValM;
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

    fetch("/deltaSStraddleDemo/getOptChnSDKByAstOptTypExp", requestOptions)
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