
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
let gSpotPrice = 0;

// let gSymbGammaList = {};
// let gSymbVegaList = {};
// let gSymbMarkIVList = {};
// let gSymbRhoList = {};
// let gSymbThetaList = {};

let gForceCloseDFL = false;
let gOptionBrokerage = 0.01;
let gFutureBrokerage = 0.05;
let gReLeg = false;
let gClsBuyLeg = false;
let gCurrStrats = { StratsData : [{StratID : 1, NewSellCE : true, NewSellPE : true, StartSellQty : 1, NewSellDelta : 0.33, ReSellDelta : 0.33, SellDeltaTP : 0.10, SellDeltaSL : 0.53, NewBuyCE : false, NewBuyPE : false, StartBuyQty : 1, NewBuyDelta : 0.33, ReBuyDelta : 0.33, BuyDeltaTP : 2.0, BuyDeltaSL : 0.0 }]};
let gCurrFutStrats = { StratsData : [{StratID : 11, StartFutQty : 1, PointsSL : 100, PointsTP : 200 }]};
let gOtherFlds = [{ SwtActiveMsgs : false, SwtLossRec : true, PrftPerc2Rec : 100, LossMltplr : 1, BrokerageAmt : 0, Yet2RecvrAmt : 0, SwtOpnBuyLegOP : false, SwtOpnBuyLegSS : false }];

window.addEventListener("DOMContentLoaded", function(){
    fnGetAllStatus();

    // socket.on("CdlEmaTrend", (pMsg) => {
    //     let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
    //     let objJson = JSON.parse(pMsg);

    //     if(objJson.Direc === "UP"){
    //         objTradeSideVal.value = true;
    //     }
    //     else if(objJson.Direc === "DN"){
    //         objTradeSideVal.value = false;
    //     }
    //     else{
    //         objTradeSideVal.value = -1;
    //     }
    //     fnCallTradeSide();
    // });

    socket.on("refreshAllDFL", () => {
        document.location.reload();
    });

    socket.on("tv-Msg-SSDemo-Open", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSD");
        let vCallSide = localStorage.getItem("CallSideSwtDSSD");
        let vPutSide = localStorage.getItem("PutSideSwtDSSD");
        let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
        let objMsg = (pMsg);

        // fnChangeSymbol(objMsg.symbolName);

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            if((objSwtActiveMsgs.checked) && ((vCallSide === "false") && (objMsg.OptionType === "C") && (objMsg.TransType === "sell") || (vCallSide === "true") && (objMsg.OptionType === "C") && (objMsg.TransType === "buy") || (vPutSide === "false") && (objMsg.OptionType === "P") && (objMsg.TransType === "buy") || (vPutSide === "true") && (objMsg.OptionType === "P") && (objMsg.TransType === "sell"))){
                fnPreInitAutoTrade(objMsg.OptionType, objMsg.TransType);
            }
            else{
                fnGenMessage("Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
            }
        }
    });

    socket.on("tv-Msg-SSDemo-Close", (pMsg) => {
        let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
        let objMsg = (pMsg);

        if(objSwtActiveMsgs.checked){
            fnPreInitTradeClose(objMsg.OptionType, objMsg.TransType);
        }
    });
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    if(bAppStatus){
        fnConnectDFL();
        fnLoadLoginCred();
        // fnLoadDefQty();
        fnLoadDefFutStrategy();
        fnLoadDefStrategy();
        fnLoadHiddenFlds();
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

        // fnLoadTotalLossAmtQty();
    }
}

function fnLoadDefQty(){
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyDSSD"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellDSSD"));
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objStartSellQty = document.getElementById("txtStartSQty");

    if(objStartQtyBuyM === null){
        objStartBuyQty.value = 1;
        localStorage.setItem("StartQtyBuyDSSD", objStartBuyQty.value);
    }
    else{
        objStartBuyQty.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartSellQty.value = 1;
        localStorage.setItem("StartQtySellDSSD", objStartSellQty.value);
    }
    else{
        objStartSellQty.value = objStartQtySellM;
    }
}

function fnLoadDefFutStrategy(){
    let objFutStrat = JSON.parse(localStorage.getItem("FutStratDSSD"));

    let objFutSL = document.getElementById("txtFutSL");
    let objFutTP = document.getElementById("txtFutTP");
    let objFutQty = document.getElementById("txtFutQty");

    if(objFutStrat === null || objFutStrat === ""){
        objFutStrat = gCurrFutStrats;

        objFutSL.value = objFutStrat.StratsData[0]["PointsSL"];
        objFutTP.value = objFutStrat.StratsData[0]["PointsTP"];
        objFutQty.value = objFutStrat.StratsData[0]["StartFutQty"];
    }
    else{
        gCurrFutStrats = objFutStrat;

        objFutSL.value = gCurrFutStrats.StratsData[0]["PointsSL"];
        objFutTP.value = gCurrFutStrats.StratsData[0]["PointsTP"];
        objFutQty.value = gCurrFutStrats.StratsData[0]["StartFutQty"];
    }
}

function fnLoadHiddenFlds(){
    let objHidFlds = JSON.parse(localStorage.getItem("HidFldsDSSD"));
    let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
    let objSwtLossRecvr = document.getElementById("swtLossRecvr");
    let objPrftPerc2Rec = document.getElementById("txtPrftPerc2Recvr");
    let objLossMltplr = document.getElementById("txtLossMultiplier");
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let objOpnBuyLegOP = document.getElementById("swtOpnBuyLegOP");
    let objOpnBuyLegSS = document.getElementById("swtOpnBuyLegSS");

    if(objHidFlds === null || objHidFlds === ""){
        objHidFlds = gOtherFlds;
        objSwtActiveMsgs.checked = objHidFlds[0]["SwtActiveMsgs"];
        objSwtLossRecvr.checked = objHidFlds[0]["SwtLossRec"];
        objPrftPerc2Rec.value = objHidFlds[0]["PrftPerc2Rec"];
        objLossMltplr.value = objHidFlds[0]["LossMltplr"];
        objBrokAmt.value = objHidFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = objHidFlds[0]["Yet2RecvrAmt"];

        objOpnBuyLegOP.checked = objHidFlds[0]["SwtOpnBuyLegOP"];
        objOpnBuyLegSS.checked = objHidFlds[0]["SwtOpnBuyLegSS"];
    }
    else{
        gOtherFlds = objHidFlds;
        objSwtActiveMsgs.checked = gOtherFlds[0]["SwtActiveMsgs"];
        objSwtLossRecvr.checked = gOtherFlds[0]["SwtLossRec"];
        objPrftPerc2Rec.value = gOtherFlds[0]["PrftPerc2Rec"];
        objLossMltplr.value = gOtherFlds[0]["LossMltplr"];
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

        objOpnBuyLegOP.checked = gOtherFlds[0]["SwtOpnBuyLegOP"];
        objOpnBuyLegSS.checked = gOtherFlds[0]["SwtOpnBuyLegSS"];
    }
}

function fnUpdHidFldSettings(pThisVal, pHidFldParam, pFieldMsg){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gOtherFlds[0][pHidFldParam] = pThisVal;

        localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdFutStratSettings(pThisVal, pStratParam, pFieldMsg, pIfUpdFut, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrFutStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("FutStratDSSD", JSON.stringify(gCurrFutStrats));

        if(pIfUpdFut){
            fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam);
        }
        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        if((gCurrPosDSSD.TradeData[i].Status === "OPEN") && (pOptionType === "F")){
            gCurrPosDSSD.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);
    localStorage.setItem("CurrPosDSSD", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnLoadDefStrategy(){
    let objStrat = JSON.parse(localStorage.getItem("StrategyDSSD"));

    let objNewSellCE = document.getElementById("chkSellCE");
    let objNewSellPE = document.getElementById("chkSellPE");
    let objSellQty = document.getElementById("txtStartSQty");
    let objNewSellDelta = document.getElementById("txtNewSellDelta");
    let objReSellDelta = document.getElementById("txtReSellDelta");
    let objDeltaSellTP = document.getElementById("txtDeltaSellTP");
    let objDeltaSellSL = document.getElementById("txtDeltaSellSL");

    let objNewBuyCE = document.getElementById("chkBuyCE");
    let objNewBuyPE = document.getElementById("chkBuyPE");
    let objBuyQty = document.getElementById("txtStartBQty");
    let objNewBuyDelta = document.getElementById("txtNewBuyDelta");
    let objReBuyDelta = document.getElementById("txtReBuyDelta");
    let objDeltaBuyTP = document.getElementById("txtDeltaBuyTP");
    let objDeltaBuySL = document.getElementById("txtDeltaBuySL");

    if(objStrat === null || objStrat === ""){
        objStrat = gCurrStrats;

        objNewSellCE.checked = objStrat.StratsData[0]["NewSellCE"];
        objNewSellPE.checked = objStrat.StratsData[0]["NewSellPE"];
        objSellQty.value = objStrat.StratsData[0]["StartSellQty"];
        objNewSellDelta.value = objStrat.StratsData[0]["NewSellDelta"];
        objReSellDelta.value = objStrat.StratsData[0]["ReSellDelta"];
        objDeltaSellTP.value = objStrat.StratsData[0]["SellDeltaTP"];
        objDeltaSellSL.value = objStrat.StratsData[0]["SellDeltaSL"];

        objNewBuyCE.checked = objStrat.StratsData[0]["NewBuyCE"];
        objNewBuyPE.checked = objStrat.StratsData[0]["NewBuyPE"];
        objBuyQty.value = objStrat.StratsData[0]["StartBuyQty"];
        objNewBuyDelta.value = objStrat.StratsData[0]["NewBuyDelta"];
        objReBuyDelta.value = objStrat.StratsData[0]["ReBuyDelta"];
        objDeltaBuyTP.value = objStrat.StratsData[0]["BuyDeltaTP"];
        objDeltaBuySL.value = objStrat.StratsData[0]["BuyDeltaSL"];

        localStorage.setItem("StrategyDSSD", JSON.stringify(objStrat));
    }
    else{
        gCurrStrats = objStrat;

        objNewSellCE.checked = objStrat.StratsData[0]["NewSellCE"];
        objNewSellPE.checked = objStrat.StratsData[0]["NewSellPE"];
        objSellQty.value = objStrat.StratsData[0]["StartSellQty"];
        objNewSellDelta.value = objStrat.StratsData[0]["NewSellDelta"];
        objReSellDelta.value = objStrat.StratsData[0]["ReSellDelta"];
        objDeltaSellTP.value = objStrat.StratsData[0]["SellDeltaTP"];
        objDeltaSellSL.value = objStrat.StratsData[0]["SellDeltaSL"];

        objNewBuyCE.checked = objStrat.StratsData[0]["NewBuyCE"];
        objNewBuyPE.checked = objStrat.StratsData[0]["NewBuyPE"];
        objBuyQty.value = objStrat.StratsData[0]["StartBuyQty"];
        objNewBuyDelta.value = objStrat.StratsData[0]["NewBuyDelta"];
        objReBuyDelta.value = objStrat.StratsData[0]["ReBuyDelta"];
        objDeltaBuyTP.value = objStrat.StratsData[0]["BuyDeltaTP"];
        objDeltaBuySL.value = objStrat.StratsData[0]["BuyDeltaSL"];
    }
}

function fnChangeBuyStartQty(pThisVal){
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
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtyBuyDSSD", pThisVal.value);
        }
    }
}

function fnChangeSellStartQty(pThisVal){
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
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtySellDSSD", pThisVal.value);
        }
    }
}

function fnUpdOptStratSettings(pThis, pThisVal, pStratParam, pFieldMsg, pIfUpdCP, pIfBorS, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input / Select Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("StrategyDSSD", JSON.stringify(gCurrStrats));
    
        if(pIfUpdCP){
            fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam);
        }

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        if((gCurrPosDSSD.TradeData[i].Status === "OPEN") && (gCurrPosDSSD.TradeData[i].TransType === pIfBorS) && (pOptionType === "")){
            gCurrPosDSSD.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);
    localStorage.setItem("CurrPosDSSD", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
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
    let objStartBQty = document.getElementById("txtStartBQty");
    let objStartSQty = document.getElementById("txtStartSQty");

    gQtyBuyMultiplierM = objStartBQty.value;
    gQtySellMultiplierM = objStartSQty.value;

    if(gQtyBuyMultiplierM === null || gQtyBuyMultiplierM === ""){
        gQtyBuyMultiplierM = 0;
    }

    if(gQtySellMultiplierM === null || gQtySellMultiplierM === ""){
        gQtySellMultiplierM = 0;
    }
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

}

//************** Check for Open Position PL Status and close *************//
function fnSaveUpdCurrPos(){
    let vToPosClose = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        if(gCurrPosDSSD.TradeData[i].Status === "OPEN"){
            let vOptionTypeZZ = gCurrPosDSSD.TradeData[i].OptionType;
            let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDSSD.TradeData[i].Symbol]);

            if(vOptionTypeZZ !== "F"){
                gCurrPosDSSD.TradeData[i].DeltaC = vCurrDelta;
            }

            let vStrikePrice = gCurrPosDSSD.TradeData[i].StrikePrice;
            let vLotSize = gCurrPosDSSD.TradeData[i].LotSize;
            let vQty = gCurrPosDSSD.TradeData[i].LotQty;
            let vBuyPrice = gCurrPosDSSD.TradeData[i].BuyPrice;
            let vSellPrice = gCurrPosDSSD.TradeData[i].SellPrice;
            let vDeltaSL = gCurrPosDSSD.TradeData[i].DeltaSL;
            let vDeltaTP = gCurrPosDSSD.TradeData[i].DeltaTP;

            // let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionTypeZZ);
            // let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

            if(gCurrPosDSSD.TradeData[i].TransType === "sell"){
                let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDSSD.TradeData[i].Symbol]);
                gCurrPosDSSD.TradeData[i].BuyPrice = vCurrPrice;

                if((Math.abs(vCurrDelta) >= vDeltaSL) || (Math.abs(vCurrDelta) <= vDeltaTP)){
                    vLegID = gCurrPosDSSD.TradeData[i].TradeID;
                    vTransType = gCurrPosDSSD.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                    vToPosClose = true;
                    gReLeg = true;
                }
            }
            else if(gCurrPosDSSD.TradeData[i].TransType === "buy"){
                let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDSSD.TradeData[i].Symbol]);
                gCurrPosDSSD.TradeData[i].SellPrice = vCurrPrice;

                if((Math.abs(vCurrDelta) <= vDeltaSL) || (Math.abs(vCurrDelta) >= vDeltaTP)){
                    vLegID = gCurrPosDSSD.TradeData[i].TradeID;
                    vTransType = gCurrPosDSSD.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                    vToPosClose = true;
                    gReLeg = true;
                }
            }
        }
    }

    fnUpdateOpenPositions();

    if(vToPosClose){
        // if(gClsBuyLeg && vTransType === "sell"){
        //     gClsBuyLeg = false;
        //     fnCloseBuyLeg(vTransType, vOptionType);
        // }
        // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSD"));
        // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSD"));

        // if((objTrdCountCE > 1 || objTrdCountPE > 1) && vTransType === "sell"){

        //     fnGetBuyOpenPosAndClose(vTransType, vOptionType);
        // }
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }
}

function fnCloseBuyLeg(pTransType, pOptionType){
    let vOptionType = "";
    let vRecExists = false;
    let vLegID = 0;
    let vSymbol = "";

    if(pOptionType === "C"){
        vOptionType = "P";
    }
    else if(pOptionType === "P"){
        vOptionType = "C";
    }

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        if((gCurrPosDSSD.TradeData[i].TransType === "buy") && gCurrPosDSSD.TradeData[i].OptionType === vOptionType){
            vRecExists = true;
            vLegID = gCurrPosDSSD.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
        }
    }

    if(vRecExists){
        fnCloseOptPosition(vLegID, "buy", vOptionType, vSymbol, "CLOSED");
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
    const vNextFriday = new Date(vCurrDate);
    const vYear = vCurrDate.getFullYear();
    const vMonth = vCurrDate.getMonth();
    let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
    let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);
    let vLastDayOfThirdMonth = new Date(vYear, vMonth + 3, 0);

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
    else if(pExpiryMode === "4"){
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
    else if(pExpiryMode === "5"){
        const vCurrDayOfWeek = vCurrDate.getDay();
        let vDaysUntilFriday = 12 - vCurrDayOfWeek;

        if(vCurrDayOfWeek > 3){
            vNextFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday + 14);
        }
        else{
            vNextFriday.setDate(vCurrDate.getDate() + vDaysUntilFriday);
        }
        let vDay = (vNextFriday.getDate()).toString().padStart(2, "0");
        let vMonth = (vNextFriday.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vNextFriday.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "6"){
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
    else if(pExpiryMode === "7"){
        while (vLastDayOfNextMonth.getDay() !== 5) { 
            vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
        }
        while (vLastDayOfThirdMonth.getDay() !== 5) { 
            vLastDayOfThirdMonth.setDate(vLastDayOfThirdMonth.getDate() - 1);
        }

        const vCurrDay = vCurrDate.getDate();
        let vDay = (vLastDayOfNextMonth.getDate()).toString().padStart(2, "0");
        let vMonth = (vLastDayOfNextMonth.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vLastDayOfNextMonth.getFullYear() + "-" + vMonth + "-" + vDay;

        if(vCurrDay > 15){
            vDay = (vLastDayOfThirdMonth.getDate()).toString().padStart(2, "0");
            vMonth = (vLastDayOfThirdMonth.getMonth() + 1).toString().padStart(2, "0");
            vExpValTB = vLastDayOfThirdMonth.getFullYear() + "-" + vMonth + "-" + vDay;
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

function fnExecAllLegs(){
    let objSellExpDate = document.getElementById("txtExpSell");
    let objSellQty = document.getElementById("txtStartSQty");
    let objNewSellDelta = document.getElementById("txtNewSellDelta");
    let objReSellDelta = document.getElementById("txtReSellDelta");
    let objDeltaSellTP = document.getElementById("txtDeltaSellTP");
    let objDeltaSellSL = document.getElementById("txtDeltaSellSL");

    let objBuyExpDate = document.getElementById("txtExpBuy");
    let objBuyQty = document.getElementById("txtStartBQty");
    let objNewBuyDelta = document.getElementById("txtNewBuyDelta");
    let objReBuyDelta = document.getElementById("txtReBuyDelta");
    let objDeltaBuyTP = document.getElementById("txtDeltaBuyTP");
    let objDeltaBuySL = document.getElementById("txtDeltaBuySL");

    if(objSellExpDate.value === ""){
        objSellExpDate.focus();
        fnGenMessage("Please Select Sell Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(objBuyExpDate.value === ""){
        objBuyExpDate.focus();
        fnGenMessage("Please Select Buy Expiry Date", `badge bg-warning`, "spnGenMsg");
    }
    else if(objSellQty.value === ""){
        objSellQty.focus();
        fnGenMessage("Please Input Sell Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(objBuyQty.value === ""){
        objBuyQty.focus();
        fnGenMessage("Please Input Buy Qty in Lots", `badge bg-warning`, "spnGenMsg");
    }
    else if(objNewSellDelta.value === ""){
        objNewSellDelta.focus();
        fnGenMessage("Please Input New Sell Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objNewBuyDelta.value === ""){
        objNewBuyDelta.focus();
        fnGenMessage("Please Input New Buy Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objReSellDelta.value === ""){
        objReSellDelta.focus();
        fnGenMessage("Please Input Re-Entry Sell Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objReBuyDelta.value === ""){
        objReBuyDelta.focus();
        fnGenMessage("Please Input Re-Entry Buy Leg Delta", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaSellTP.value === ""){
        objDeltaSellTP.focus();
        fnGenMessage("Please Input Delta for Sell Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaBuyTP.value === ""){
        objDeltaBuyTP.focus();
        fnGenMessage("Please Input Delta for Buy Legs Take Profit", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaSellSL.value === ""){
        objDeltaSellSL.focus();
        fnGenMessage("Please Input Delta for Sell Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else if(objDeltaBuySL.value === ""){
        objDeltaBuySL.focus();
        fnGenMessage("Please Input Delta for Buy Legs Stop Loss", `badge bg-warning`, "spnGenMsg");
    }
    else{
        fnCheckOptionLeg();
    }
}

async function fnCheckOptionLeg(){
    let objChkIds = [{ ID : 'chkSellCE', TransType : 'sell', OptType : 'C' }, { ID : 'chkSellPE', TransType : 'sell', OptType : 'P' }, { ID : 'chkBuyCE', TransType : 'buy', OptType : 'C' }, { ID : 'chkBuyPE', TransType : 'buy', OptType : 'P' }];
    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");

    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objSymbol = document.getElementById("ddlSymbols");
    let objLotSize = document.getElementById("txtLotSize");
    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
    let objNewSellDelta = document.getElementById("txtNewSellDelta");
    let objNewBuyDelta = document.getElementById("txtNewBuyDelta");
    let objStartSellQty = document.getElementById("txtStartSQty");
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objOrderType = document.getElementById("ddlOrderType");

    let objReSellDelta = document.getElementById("txtReSellDelta");
    let objReBuyDelta = document.getElementById("txtReBuyDelta");
    let objSellDeltaTP = document.getElementById("txtDeltaSellTP");
    let objBuyDeltaTP = document.getElementById("txtDeltaBuyTP");
    let objSellDeltaSL = document.getElementById("txtDeltaSellSL");
    let objBuyDeltaSL = document.getElementById("txtDeltaBuySL");

    let vUndrAsst = objSymbol.value;
    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);
    let vExpiryNewPos = "";
    let vLotQty = 0;
    let vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL = 0.0;

    for(let k=0; k<objChkIds.length; k++){
        let vTransType = objChkIds[k]["TransType"];
        let vOptionType = objChkIds[k]["OptType"];
        let objChk = document.getElementById(objChkIds[k]["ID"]);

        if(objChk.checked){
            vIsRecExists = false;

            if(gCurrPosDSSD.TradeData.length > 0){
                for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){

                    if((gCurrPosDSSD.TradeData[i].OptionType === vOptionType) && (gCurrPosDSSD.TradeData[i].TransType === vTransType) && (gCurrPosDSSD.TradeData[i].Status === "OPEN")){
                        vIsRecExists = true;
                    }
                }
            }
            if(vIsRecExists === false){
                // console.log(objChkIds[k]["TransType"] + "-" + objChkIds[k]["OptType"]);
                if(vTransType === "sell"){
                    vExpiryNewPos = vSellExpiry;
                    vLotQty = objStartSellQty.value;
                    vDeltaNPos = objNewSellDelta.value;
                    vDeltaRePos = objReSellDelta.value;
                    vDeltaTP = objSellDeltaTP.value;
                    vDeltaSL = objSellDeltaSL.value;
                }
                else if(vTransType === "buy"){
                    vExpiryNewPos = vBuyExpiry;
                    vLotQty = objStartBuyQty.value;
                    vDeltaNPos = objNewBuyDelta.value;
                    vDeltaRePos = objReBuyDelta.value;
                    vDeltaTP = objBuyDeltaTP.value;
                    vDeltaSL = objBuyDeltaSL.value;
                }

                let objTradeDtls = await fnExecOptionLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, vExpiryNewPos, vOptionType, vTransType, objLotSize.value, vLotQty, vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL);

                if(objTradeDtls.status === "success"){
                    let vDate = new Date();
                    let vMonth = vDate.getMonth() + 1;
                    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

                    let vTradeID = objTradeDtls.data.TradeID;
                    let vProductID = objTradeDtls.data.ProductID;
                    let vSymbol = objTradeDtls.data.Symbol;
                    let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
                    let vCntrctType = objTradeDtls.data.ContType;
                    let vBuyOrSell = objTradeDtls.data.TransType;
                    let vCorP = objTradeDtls.data.OptionType;
                    let vStrPrice = parseInt(objTradeDtls.data.Strike);
                    let vExpiry = objTradeDtls.data.Expiry;
                    let vLotSize = objTradeDtls.data.LotSize;
                    let vLotQty = objTradeDtls.data.LotQty;
                    let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
                    let vBestSell = parseFloat(objTradeDtls.data.BestBid);
                    let vDelta = objTradeDtls.data.Delta;
                    let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
                    let vDeltaRePos = objTradeDtls.data.DeltaRePos;
                    let vDeltaTP = objTradeDtls.data.DeltaTP;
                    let vDeltaSL = objTradeDtls.data.DeltaSL;
                    let vOpenDTVal = vDate.valueOf();
                    gUpdPos = false;

                    let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

                    gCurrPosDSSD.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);

                    localStorage.setItem("CurrPosDSSD", objExcTradeDtls);

                    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));

                    console.log("Trade Executed");
                    gUpdPos = true;
                    fnSetSymbolTickerList();
                    fnUpdateOpenPositions();
                }
            }
            else{
                console.log("Already Exisits!");
            }
        }
    }
}

function fnExecOptionLeg(pApiKey, pSecret, pOrderType, pUndrAsst, pExpiry, pOptionType, pTransType, pLotSize, pLotQty, pDeltaPos, pDeltaRePos, pDeltaTP, pDeltaSL){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pSecret,
            "UndAssetSymbol" : pUndrAsst,
            "Expiry" : pExpiry,
            "OptionType" : pOptionType,
            "TransType" : pTransType,
            "LotSize" : parseFloat(pLotSize),
            "LotQty" : parseFloat(pLotQty),
            "OrderType" : pOrderType,
            "DeltaPos" : pDeltaPos,
            "DeltaRePos" : pDeltaRePos,
            "DeltaTP" : pDeltaTP,
            "DeltaSL" : pDeltaSL
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/deltaSStrangleDemo/execOptionLeg", requestOptions)
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

async function fnPreInitAutoTrade(pOptionType, pTransType){
    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");

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
        let vExpiryNewPos = "";
        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");
        let objOrderType = document.getElementById("ddlOrderType");
        let objSymbol = document.getElementById("ddlSymbols");
        let objLotSize = document.getElementById("txtLotSize");
        let objStartSellQty = document.getElementById("txtStartSQty");
        let objStartBuyQty = document.getElementById("txtStartBQty");
        let objExpiryBuy = document.getElementById("txtExpBuy");
        let objExpirySell = document.getElementById("txtExpSell");
        let objNewSellDelta = document.getElementById("txtNewSellDelta");
        let objNewBuyDelta = document.getElementById("txtNewBuyDelta");

        let objReSellDelta = document.getElementById("txtReSellDelta");
        let objReBuyDelta = document.getElementById("txtReBuyDelta");
        let objSellDeltaTP = document.getElementById("txtDeltaSellTP");
        let objBuyDeltaTP = document.getElementById("txtDeltaBuyTP");
        let objSellDeltaSL = document.getElementById("txtDeltaSellSL");
        let objBuyDeltaSL = document.getElementById("txtDeltaBuySL");

        let vUndrAsst = objSymbol.value;
        let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
        let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);
        let vLotQty = 0;
        let vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL = 0.0;

        // console.log(objChkIds[k]["TransType"] + "-" + objChkIds[k]["OptType"]);
        if(pTransType === "sell"){
            vExpiryNewPos = vSellExpiry;
            vLotQty = objStartSellQty.value;
            vDeltaNPos = objNewSellDelta.value;
            vDeltaRePos = objReSellDelta.value;
            vDeltaTP = objSellDeltaTP.value;
            vDeltaSL = objSellDeltaSL.value;
        }
        else if(pTransType === "buy"){
            vExpiryNewPos = vBuyExpiry;
            vLotQty = objStartBuyQty.value;
            vDeltaNPos = objNewBuyDelta.value;
            vDeltaRePos = objReBuyDelta.value;
            vDeltaTP = objBuyDeltaTP.value;
            vDeltaSL = objBuyDeltaSL.value;
        }

        let objTradeDtls = await fnExecOptionLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, vExpiryNewPos, pOptionType, pTransType, objLotSize.value, vLotQty, vDeltaNPos, vDeltaRePos, vDeltaTP, vDeltaSL);

        if(objTradeDtls.status === "success"){
            let vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            let vTradeID = objTradeDtls.data.TradeID;
            let vProductID = objTradeDtls.data.ProductID;
            let vSymbol = objTradeDtls.data.Symbol;
            let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
            let vCntrctType = objTradeDtls.data.ContType;
            let vBuyOrSell = objTradeDtls.data.TransType;
            let vCorP = objTradeDtls.data.OptionType;
            let vStrPrice = parseInt(objTradeDtls.data.Strike);
            let vExpiry = objTradeDtls.data.Expiry;
            let vLotSize = objTradeDtls.data.LotSize;
            let vLotQty = objTradeDtls.data.LotQty;
            let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
            let vBestSell = parseFloat(objTradeDtls.data.BestBid);
            let vDelta = objTradeDtls.data.Delta;
            let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
            let vDeltaRePos = objTradeDtls.data.DeltaRePos;
            let vDeltaTP = objTradeDtls.data.DeltaTP;
            let vDeltaSL = objTradeDtls.data.DeltaSL;
            let vOpenDTVal = vDate.valueOf();
            gUpdPos = false;

            let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

            gCurrPosDSSD.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);

            localStorage.setItem("CurrPosDSSD", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));

            console.log("Trade Executed");

            gUpdPos = true;
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
        }
    }
}

async function fnPreInitAutoFutTrade(pOptionType, pTransType){
    let vIsRecExists = false;
    let objBrokAmt = document.getElementById("txtBrok2Rec");

    if(gCurrPosDSSD.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if((gCurrPosDSSD.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSD.TradeData[i].TransType === pTransType) && (gCurrPosDSSD.TradeData[i].Status === "OPEN")){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");
        let objOrderType = document.getElementById("ddlOrderType");
        let objSymbol = document.getElementById("ddlSymbols");
        let objLotSize = document.getElementById("txtLotSize");
        let objLotQty = document.getElementById("txtFutQty");

        let objPointsTP = document.getElementById("txtFutTP");
        let objPointsSL = document.getElementById("txtFutSL");

        let vUndrAsst = objSymbol.value + "USD";

        let objTradeDtls = await fnExecFuturesLeg(objApiKey.value, objApiSecret.value, objOrderType.value, vUndrAsst, pOptionType, pTransType, objLotSize.value, objLotQty.value, objPointsTP.value, objPointsSL.value);

        if(objTradeDtls.status === "success"){
            let vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            let vTradeID = objTradeDtls.data.TradeID;
            let vProductID = objTradeDtls.data.ProductID;
            let vSymbol = objTradeDtls.data.Symbol;
            let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
            let vCntrctType = objTradeDtls.data.ContType;
            let vBuyOrSell = objTradeDtls.data.TransType;
            let vOptType = objTradeDtls.data.OptionType;
            let vStrPrice = parseInt(objTradeDtls.data.Strike);
            let vLotSize = objTradeDtls.data.LotSize;
            let vLotQty = objTradeDtls.data.LotQty;
            let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
            let vBestSell = parseFloat(objTradeDtls.data.BestBid);
            let vDelta = objTradeDtls.data.Delta;
            let vDeltaC = parseFloat(objTradeDtls.data.DeltaC);
            let vPointsTP = objTradeDtls.data.PointsTP;
            let vPointsSL = objTradeDtls.data.PointsSL;
            let vRateTP = objTradeDtls.data.RateTP;
            let vRateSL = objTradeDtls.data.RateSL;
            let vOpenDTVal = vDate.valueOf();
            gUpdPos = false;

            let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vOptType, StrikePrice : vStrPrice, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, PointsTP : vPointsTP, RateTP : vRateTP, PointsSL : vPointsSL, RateSL : vRateSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

            gCurrPosDSSD.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);

            localStorage.setItem("CurrPosDSSD", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vOptType);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));

            console.log("Trade Executed");
            gUpdPos = true;
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
        }
    }
}

function fnExecFuturesLeg(pApiKey, pSecret, pOrderType, pUndrAsst, pOptionType, pTransType, pLotSize, pLotQty, pPointsTP, pPointsSL){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pSecret,
            "UndAssetSymbol" : pUndrAsst,
            "OptionType" : pOptionType,
            "TransType" : pTransType,
            "LotSize" : parseFloat(pLotSize),
            "LotQty" : parseFloat(pLotQty),
            "OrderType" : pOrderType,
            "PointsTP" : pPointsTP,
            "PointsSL" : pPointsSL
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        fetch("/deltaSStrangleDemo/execFutureLeg", requestOptions)
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

function fnPreInitTradeClose(pOptionType, pTransType){
    let vIsRecExists = false;
    let vLegID = 0;
    let vTransType = "";
    let vSymbol = "";
    let vState = "CLOSED";

    if(gCurrPosDSSD.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if((gCurrPosDSSD.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSD.TradeData[i].TransType === pTransType) && (gCurrPosDSSD.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosDSSD.TradeData[i].TradeID;
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
    let objBQty = document.getElementById("txtStartBQty");
    let objSQty = document.getElementById("txtStartSQty");
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
        objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ TransType : "sell", OptionType : "P", RateNew : 600, RateTP : 550, RateSL : 600, DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { TransType : "sell", OptionType : "C", RateNew : 600, RateTP : 550, RateSL : 600, DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }
    }
    else if(pTransType === "buy"){
        objStrategies = { Strategies : [{ StratID : 1234325, StratName : "S-1", StratModel : [{ TransType : "buy", OptionType : "P", RateNew : 900, RateTP : 1800, RateSL : 850, DeltaNew : 0.50, DeltaTP : 0.65, DeltaSL : 0.35 }, { TransType : "buy", OptionType : "C", RateNew : 900, RateTP : 1800, RateSL : 850, DeltaNew : 0.50, DeltaTP : 0.65, DeltaSL : 0.35 }] }] }
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

        if(pTransType === "buy"){
            vQty = objBQty.value;
        }
        else if(pTransType === "sell"){
            vQty = objSQty.value;
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

                if(vTransType === "sell"){
                    fnChkOpenBuyPos(vOptionType);
                }
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

function fnChkOpenBuyPos(pOptionType){
    let vRecExists = false;
    let vOptionType = "";

    if(pOptionType === "C"){
        vOptionType = "P";
    }
    else if(pOptionType === "P"){
        vOptionType = "C";
    }

    for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
        let vStatus = gCurrPosDSSD.TradeData[i].Status;
        let vTransType = gCurrPosDSSD.TradeData[i].TransType;
        let vExOptionType = gCurrPosDSSD.TradeData[i].OptionType;

        if(vStatus === "OPEN" && vTransType === "buy" && vExOptionType === vOptionType){
            vRecExists = true;
        }
    }

    if(vRecExists === false){        
        fnInitTrade(vOptionType, "buy");
    }
}

//******** Display's Updated Open Positions *********//
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
                let vLegID = gCurrPosDSSD.TradeData[i].TradeID;
                let vDelta = gCurrPosDSSD.TradeData[i].Delta;
                let vDeltaC = parseFloat(gCurrPosDSSD.TradeData[i].DeltaC);

                let vLotSize = gCurrPosDSSD.TradeData[i].LotSize;
                let vQty = gCurrPosDSSD.TradeData[i].LotQty;
                let vOpenDT = gCurrPosDSSD.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosDSSD.TradeData[i].CloseDT;
                let vOptionType = gCurrPosDSSD.TradeData[i].OptionType;
                let vProductID = gCurrPosDSSD.TradeData[i].ProductID;
                let vBuyPrice = gCurrPosDSSD.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSD.TradeData[i].SellPrice;
                let vStatus = gCurrPosDSSD.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDSSD.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDSSD.TradeData[i].Symbol;
                let vTransType = gCurrPosDSSD.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosDSSD.TradeData[i].UndrAsstSymb;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
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


function fnGetTradeCharges(pIndexPrice, pLotSize, pQty, pBuyPrice, pSellPrice, pOptionType){
    let vEffectiveBrokerage = 0;

    if(pOptionType === "F"){
        let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * gFutureBrokerage) / 100;
        let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * gFutureBrokerage) / 100;

        vEffectiveBrokerage = (vBuyBrokerage + vSellBrokerage) * 1.18;
    }
    else{
        let vNotionalFees = (((pQty * 2) * pLotSize * pIndexPrice) * gOptionBrokerage) / 100;

        let vBuyBrokerage = ((pQty * pLotSize * pBuyPrice) * 3.5) / 100;
        let vSellBrokerage = ((pQty * pLotSize * pSellPrice) * 3.5) / 100;
        let vPremiumCapFees = vSellBrokerage + vBuyBrokerage;


        if(vPremiumCapFees < vNotionalFees){
            vEffectiveBrokerage = vPremiumCapFees * 1.18;
        }
        else{
            vEffectiveBrokerage = vNotionalFees * 1.18;
        }
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
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

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
        let vLotQty = 0;
        let vBuyPrice = 0;
        let vSellPrice = 0;

        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};

        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if(gCurrPosDSSD.TradeData[i].TradeID === pLegID){                
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
                vLotQty = gCurrPosDSSD.TradeData[i].LotQty;
                vBuyPrice = gCurrPosDSSD.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDSSD.TradeData[i].SellPrice;
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSD);
        localStorage.setItem("CurrPosDSSD", objExcTradeDtls);


        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, pOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        console.log(vPL);
        if(pStatus === "CLOSED"){
            gOtherFlds[0]["Yet2RecvrAmt"]  = parseFloat(objYet2Recvr.value) + vPL;
            objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];
            localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));            

            if(vPL > 0){
                if(parseFloat(objBrokAmt.value) >= vCharges){
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) - vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));
                }
            }
            else{
                let objOpnBuyLegOP = document.getElementById("swtOpnBuyLegOP");
                let objOpnBuyLegSS = document.getElementById("swtOpnBuyLegSS");

                if(objOpnBuyLegOP.checked && gReLeg){
                    let vOptionType = "";
                    
                    if(pOptionType === "C"){
                        vOptionType = "P";
                    }
                    else if(pOptionType === "P"){
                        vOptionType = "C";
                    }
                    fnPreInitAutoTrade(vOptionType, "buy");
                }

                if(objOpnBuyLegSS.checked && gReLeg){
                    fnPreInitAutoTrade(pOptionType, "buy");
                }
            }
        }
        else{
            //This part is not required in Real code
            // gOtherFlds[0]["Yet2RecvrAmt"]  = parseFloat(objYet2Recvr.value) - vPL;
            // objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

            // gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            // objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            // localStorage.setItem("HidFldsDSSD", JSON.stringify(gOtherFlds));
        }

        console.log("Position Closed!");

        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();

        if(gReLeg){
            gReLeg = false;
            fnPreInitAutoTrade(pOptionType, pTransType);
        }
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
            if(gCurrPosDSSD.TradeData[i].TradeID === parseInt(objLegID.value)){
                gCurrPosDSSD.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosDSSD.TradeData[i].LotQty = parseInt(objQty.value);
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
        // gSymbGammaList = {};
        // gSymbVegaList = {};
        // gSymbMarkIVList = {};
        // gSymbRhoList = {};
        // gSymbThetaList = {};

        let vDelRec = null;

        for(let i=0; i<gCurrPosDSSD.TradeData.length; i++){
            if(gCurrPosDSSD.TradeData[i].TradeID === pLegID){
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


function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosDSSD");
    localStorage.setItem("QtyMulDSSD", 0);
    localStorage.removeItem("NetLimitDSSD");
    gCurrPosDSSD = { TradeData : []};
    // localStorage.removeItem("FutStratDSSD");
    // localStorage.removeItem("StrategyDSSD");
    // localStorage.removeItem("StartQtyBuyDSSD");
    localStorage.removeItem("CETrdCntDSSD");
    localStorage.removeItem("PETrdCntDSSD");

    // fnGetAllStatus();
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
    // console.log(pTicData.spot_price);
    gSymbBRateList[pTicData.symbol] = pTicData.quotes.best_ask;
    gSymbSRateList[pTicData.symbol] = pTicData.quotes.best_bid;

    if(pTicData.contract_type !== "perpetual_futures"){
        gSymbDeltaList[pTicData.symbol] = pTicData.greeks.delta;
        gSpotPrice = pTicData.spot_price;
        // gSymbGammaList[pTicData.symbol] = pTicData.greeks.gamma;
        // gSymbVegaList[pTicData.symbol] = pTicData.greeks.vega;
        // gSymbMarkIVList[pTicData.symbol] = pTicData.quotes.mark_iv;
        // gSymbRhoList[pTicData.symbol] = pTicData.greeks.rho;
        // gSymbThetaList[pTicData.symbol] = pTicData.greeks.theta;
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

function checkTimeForAlert() {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 17) {
    alert("It is after 5 PM!");
  }
}
//******************* WS Connection and Subscription Fully Updated Version ****************//

//********** Indicators Sections *************//

function fnCallTradeSide(){
    let objCallSideVal = document["frmSide"]["rdoCallTradeSide"];

    localStorage.setItem("CallSideSwtDSSD", objCallSideVal.value);
}

function fnPutTradeSide(){
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    localStorage.setItem("PutSideSwtDSSD", objPutSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("CallSideSwtDSSD") === null){
        localStorage.setItem("CallSideSwtDSSD", "-1");
    }
    let lsCallSideSwitchS = localStorage.getItem("CallSideSwtDSSD");
    let objCallSideVal = document["frmSide"]["rdoCallTradeSide"];

    if(lsCallSideSwitchS === "true"){
        objCallSideVal.value = true;
    }
    else if(lsCallSideSwitchS === "false"){
        objCallSideVal.value = false;
    }
    else{
        objCallSideVal.value = -1;
    }


    if(localStorage.getItem("PutSideSwtDSSD") === null){
        localStorage.setItem("PutSideSwtDSSD", "-1");
    }
    let lsPutSideSwitchS = localStorage.getItem("PutSideSwtDSSD");
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    if(lsPutSideSwitchS === "true"){
        objPutSideVal.value = true;
    }
    else if(lsPutSideSwitchS === "false"){
        objPutSideVal.value = false;
    }
    else{
        objPutSideVal.value = -1;
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
