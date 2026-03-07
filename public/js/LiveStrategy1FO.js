
let obj_WS_DFL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyBuyMultiplierM = 0;
let gQtySellMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosDSSLIVE1 = { TradeData : []};
let gClsdPosDSSLIVE1 = { TradeData : []};
let gTradeInst, gTodayClsOpt = 0;

let gUpdPos = true;
let gSymbBRateList = {};
let gSymbSRateList = {};
let gSymbDeltaList = {};
let gSymbGammaList = {};
let gSymbThetaList = {};
let gSymbVegaList = {};
let gSpotPrice = 0;
let gPL = 0;

// let gSymbMarkIVList = {};
// let gSymbRhoList = {};

let gForceCloseDFL = false;
let gOptionBrokerage = 0.01;
let gFutureBrokerage = 0.05;
let gReLeg = false;
let gClsBuyLeg = false;
let gDeltaNtrlBusy = false;
let gDeltaNtrlLastActionTs = 0;
let gCurrStrats = { StratsData : [{StratID : 1, NewSellCE : true, NewSellPE : true, StartSellQty : 1, NewSellDelta : 0.33, ReSellDelta : 0.33, SellDeltaTP : 0.10, SellDeltaSL : 0.53, NewBuyCE : false, NewBuyPE : false, StartBuyQty : 1, NewBuyDelta : 0.33, ReBuyDelta : 0.33, BuyDeltaTP : 2.0, BuyDeltaSL : 0.0 }]};
let gCurrFutStrats = { StratsData : [{StratID : 11, StartFutQty : 1, PointsSL : 100, PointsTP : 200 }]};
let gOtherFlds = [{ SwtActiveMsgs : false, BrokerageAmt : 0, Yet2RecvrAmt : 0, SwtOpnBuyLegOP : false, SwtOpnBuyLegSS : false, SwtBrokRec : false, BrokX4Profit : 2, ReLegBrok : false, ReLegSell : false, ReLegBuy : false, SwtDeltaNtrl : true, DeltaPM : 0.10 }];

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
        let isLsAutoTrader = localStorage.getItem("isAutoTraderDSSLIVE1");
        let vCallSide = localStorage.getItem("CallSideSwtDSSLIVE1");
        let vPutSide = localStorage.getItem("PutSideSwtDSSLIVE1");
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

        fnLoadClosedPostions();

        gTodayClsOpt = setInterval(fnChkTodayPosToCls, 900000);

        // fnLoadTotalLossAmtQty();
    }
}

function fnLoadDefQty(){
    let objStartQtyBuyM = JSON.parse(localStorage.getItem("StartQtyBuyDSSLIVE1"));
    let objStartQtySellM = JSON.parse(localStorage.getItem("StartQtySellDSSLIVE1"));
    let objStartBuyQty = document.getElementById("txtStartBQty");
    let objStartSellQty = document.getElementById("txtStartSQty");

    if(objStartQtyBuyM === null){
        objStartBuyQty.value = 1;
        localStorage.setItem("StartQtyBuyDSSLIVE1", objStartBuyQty.value);
    }
    else{
        objStartBuyQty.value = objStartQtyBuyM;
    }

    if(objStartQtySellM === null){
        objStartSellQty.value = 1;
        localStorage.setItem("StartQtySellDSSLIVE1", objStartSellQty.value);
    }
    else{
        objStartSellQty.value = objStartQtySellM;
    }
}

function fnLoadDefFutStrategy(){
    let objFutStrat = JSON.parse(localStorage.getItem("FutStratDSSLIVE1"));

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
    let objHidFlds = JSON.parse(localStorage.getItem("HidFldsDSSLIVE1"));
    let objSwtActiveMsgs = document.getElementById("swtActiveMsgs");
    let objBrokAmt = document.getElementById("txtBrok2Rec");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");

    let objOpnBuyLegOP = document.getElementById("swtOpnBuyLegOP");
    let objOpnBuyLegSS = document.getElementById("swtOpnBuyLegSS");

    let objSwtBrokerage = document.getElementById("swtBrokRecvry");
    let objTxtBrokVal = document.getElementById("txtXBrok2Rec");
    let objChkReLeg = document.getElementById("chkReLegBrok");

    let objChkReLegSell = document.getElementById("chkReLegSell");
    let objChkReLegBuy = document.getElementById("chkReLegBuy");

    let objChkDeltaNeutral = document.getElementById("swtDeltaNeutral");
    let objMinDeltaPM = document.getElementById("txtMinDeltaPM");

    if(objHidFlds === null || objHidFlds === ""){
        objHidFlds = gOtherFlds;
        objSwtActiveMsgs.checked = objHidFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = objHidFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = objHidFlds[0]["Yet2RecvrAmt"];

        objOpnBuyLegOP.checked = objHidFlds[0]["SwtOpnBuyLegOP"];
        objOpnBuyLegSS.checked = objHidFlds[0]["SwtOpnBuyLegSS"];

        objSwtBrokerage.checked = objHidFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = objHidFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = objHidFlds[0]["ReLegBrok"]; 

        objChkReLegSell.checked = objHidFlds[0]["ReLegSell"]; 
        objChkReLegBuy.checked = objHidFlds[0]["ReLegBuy"]; 

        objChkDeltaNeutral.checked = objHidFlds[0]["SwtDeltaNtrl"]; 
        objMinDeltaPM.value = objHidFlds[0]["DeltaPM"]; 
    }
    else{
        gOtherFlds = objHidFlds;
        objSwtActiveMsgs.checked = gOtherFlds[0]["SwtActiveMsgs"];
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];
        objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];

        objOpnBuyLegOP.checked = gOtherFlds[0]["SwtOpnBuyLegOP"];
        objOpnBuyLegSS.checked = gOtherFlds[0]["SwtOpnBuyLegSS"];

        objSwtBrokerage.checked = gOtherFlds[0]["SwtBrokRec"]; 
        objTxtBrokVal.value = gOtherFlds[0]["BrokX4Profit"];
        objChkReLeg.checked = gOtherFlds[0]["ReLegBrok"]; 

        objChkReLegSell.checked = gOtherFlds[0]["ReLegSell"]; 
        objChkReLegBuy.checked = gOtherFlds[0]["ReLegBuy"]; 

        objChkDeltaNeutral.checked = gOtherFlds[0]["SwtDeltaNtrl"]; 
        objMinDeltaPM.value = gOtherFlds[0]["DeltaPM"]; 
    }
}

function fnUpdHidFldSettings(pThisVal, pHidFldParam, pFieldMsg){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gOtherFlds[0][pHidFldParam] = pThisVal;

        localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdFutStratSettings(pThisVal, pStratParam, pFieldMsg, pIfUpdFut, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrFutStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("FutStratDSSLIVE1", JSON.stringify(gCurrFutStrats));

        if(pIfUpdFut){
            fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam);
        }
        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosFutParams(pThisVal, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (pOptionType === "F")){
            gCurrPosDSSLIVE1.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
    localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnLoadDefStrategy(){
    let objStrat = JSON.parse(localStorage.getItem("StrategyDSSLIVE1"));

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

        localStorage.setItem("StrategyDSSLIVE1", JSON.stringify(objStrat));
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
        localStorage.setItem("StartQtyBuyDSSLIVE1", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyBuyDSSLIVE1", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtyBuyDSSLIVE1", pThisVal.value);
        }
    }
}

function fnChangeSellStartQty(pThisVal){
    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSLIVE1", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySellDSSLIVE1", 1);
    }
    else{
        if(confirm("Are You Sure You want to change the Quantity?")){
            fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("StartQtySellDSSLIVE1", pThisVal.value);
        }
    }
}

function fnUpdOptStratSettings(pThis, pThisVal, pStratParam, pFieldMsg, pIfUpdCP, pIfBorS, pOptionType, pCurrPosParam){
    if(pThisVal === ""){
        fnGenMessage("Please Input / Select Valid Value!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        gCurrStrats.StratsData[0][pStratParam] = pThisVal;

        localStorage.setItem("StrategyDSSLIVE1", JSON.stringify(gCurrStrats));
    
        if(pIfUpdCP){
            fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam);
        }

        fnGenMessage("Value Changed Successfully for " + pFieldMsg, `badge bg-success`, "spnGenMsg");
    }
}

function fnUpdCurrPosOptParams(pThisVal, pIfBorS, pOptionType, pCurrPosParam){
    gUpdPos = false;

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].TransType === pIfBorS) && (pOptionType === "")){
            gCurrPosDSSLIVE1.TradeData[i][pCurrPosParam] = parseFloat(pThisVal);
            console.log("Params Updated");
        }
    }

    let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
    localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
    fnLoadCurrentTradePos();

    gUpdPos = true;
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("SymbDSSLIVE1", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("SymbDSSLIVE1"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("SymbDSSLIVE1", JSON.stringify(pThisVal));

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
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosDSSLIVE1"));

    gCurrPosDSSLIVE1 = objCurrPos;

    if(gCurrPosDSSLIVE1 === null){
        gCurrPosDSSLIVE1 = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnLoadClosedPostions(){
    let objClsdPos = JSON.parse(localStorage.getItem("ClsdPosDSSLIVE1"));
    gClsdPosDSSLIVE1 = objClsdPos;

    if(gClsdPosDSSLIVE1 === null){
        gClsdPosDSSLIVE1 = { TradeData : []};
    }
    else{
        fnDispClosedPositions();
    }
}

function fnSetSymbolTickerList(){
    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN"){
                objSubListArray.push(gCurrPosDSSLIVE1.TradeData[i].Symbol);
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
    // let vStepM = JSON.parse(localStorage.getItem("OptStepDSSLIVE1"));
    let objSwtStep = document.getElementById("swtStepDFL");

    localStorage.setItem("OptStepDSSLIVE1", JSON.stringify(objSwtStep.checked));
    // alert(objSwtStep.checked);
}

function fnLoadOptStep(){
    let vStepM = JSON.parse(localStorage.getItem("OptStepDSSLIVE1"));
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

function fnChkTodayPosToCls(){
    let vTodayDate = new Date();
    let vDDMMYYYY = fnSetDDMMYYYY(vTodayDate);
    let vIsRecExists = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if(gCurrPosDSSLIVE1.TradeData[i].Expiry === vDDMMYYYY){
            let vDate3PM = new Date();
            let vDate5PM = new Date();
            vDate3PM.setHours(15, 30, 0, 0);
            vDate5PM.setHours(17, 0, 0, 0);

            let v3PM = vDate3PM.getTime();
            let v5PM = vDate5PM.getTime();

            let vState = gCurrPosDSSLIVE1.TradeData[i].Status;

            if((vTodayDate.valueOf() > v3PM) && (vTodayDate.valueOf() < v5PM)){
                if(vState === "OPEN"){
                    vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                    vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                    vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                    vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                    
                    vIsRecExists = true;

                }
            }
        }
    }

    if(vIsRecExists === true){
        fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
    }

    // console.log(gCurrPosDSSLIVE1);
}

//************** Check for Open Position PL Status and close *************//
function fnSaveUpdCurrPos(){
    let vToPosClose = false;
    let vLegID = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";
    let vBrokSwt = document.getElementById("swtBrokRecvry").checked;
    let vBrokAmt = document.getElementById("txtBrok2Rec").value;
    let vBrokXVal = document.getElementById("txtXBrok2Rec").value;
    let vYetRecAmt = parseFloat(document.getElementById("txtYet2Recvr").value);
    let objChkReLegSell = document.getElementById("chkReLegSell");
    let objChkReLegBuy = document.getElementById("chkReLegBuy");
    let vTotalPL = 0;

    vBrokAmt = parseFloat(vBrokAmt) * parseInt(vBrokXVal);

    if(vYetRecAmt < 0){
        vTotalPL = gPL + vYetRecAmt;
    }
    else{
        vTotalPL = gPL - vYetRecAmt;
    }
    // console.log("vTotalPL: " + vTotalPL);

    document.getElementById("divNetPL").innerText = (vTotalPL).toFixed(2);

    if((vTotalPL > vBrokAmt) && vBrokSwt){
        console.log("Close All Positions...");
        fnExitAllPositions();
    }
    else{
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN"){
                let vOptionTypeZZ = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                let vCurrVega = parseFloat(gSymbVegaList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);

                if(vOptionTypeZZ !== "F"){
                    let vCurrDeltaPos = vCurrDelta;
                    if(!isNaN(vCurrDelta)){
                        if(gCurrPosDSSLIVE1.TradeData[i].TransType === "sell"){
                            vCurrDeltaPos = -1 * vCurrDelta;
                        }
                    }
                    if(!isNaN(vCurrDelta)){
                        gCurrPosDSSLIVE1.TradeData[i].DeltaC = vCurrDeltaPos;
                    }
                    if(!isNaN(vCurrGamma)){
                        gCurrPosDSSLIVE1.TradeData[i].GammaC = vCurrGamma;
                    }
                    if(!isNaN(vCurrTheta)){
                        gCurrPosDSSLIVE1.TradeData[i].ThetaC = vCurrTheta;
                    }
                    if(!isNaN(vCurrVega)){
                        gCurrPosDSSLIVE1.TradeData[i].VegaC = vCurrVega;
                    }
                }

                let vStrikePrice = gCurrPosDSSLIVE1.TradeData[i].StrikePrice;
                let vLotSize = gCurrPosDSSLIVE1.TradeData[i].LotSize;
                let vQty = gCurrPosDSSLIVE1.TradeData[i].LotQty;
                let vBuyPrice = gCurrPosDSSLIVE1.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSLIVE1.TradeData[i].SellPrice;
                let vDeltaSL = gCurrPosDSSLIVE1.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosDSSLIVE1.TradeData[i].DeltaTP;

                // let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionTypeZZ);
                // let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

                if(gCurrPosDSSLIVE1.TradeData[i].TransType === "sell"){
                    let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                    gCurrPosDSSLIVE1.TradeData[i].BuyPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) >= vDeltaSL) || (Math.abs(vCurrDelta) <= vDeltaTP)){
                        vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                        vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                        vToPosClose = true;
                        
                        if(objChkReLegSell.checked){
                            gReLeg = true;
                        }
                    }
                }
                else if(gCurrPosDSSLIVE1.TradeData[i].TransType === "buy"){
                    let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosDSSLIVE1.TradeData[i].Symbol]);
                    gCurrPosDSSLIVE1.TradeData[i].SellPrice = vCurrPrice;

                    if((Math.abs(vCurrDelta) <= vDeltaSL) || (Math.abs(vCurrDelta) >= vDeltaTP)){
                        vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                        vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                        vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                        vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                        vToPosClose = true;

                        if(objChkReLegBuy.checked){
                            gReLeg = true;
                        }
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
            // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSLIVE1"));
            // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSLIVE1"));

            // if((objTrdCountCE > 1 || objTrdCountPE > 1) && vTransType === "sell"){

            //     fnGetBuyOpenPosAndClose(vTransType, vOptionType);
            // }
            fnCloseOptPosition(vLegID, vTransType, vOptionType, vSymbol, "CLOSED");
        }
        else{
            fnRunDeltaNeutralFutures();
        }
    }
}

function fnGetOpenFutureLegBySide(pTransType){
    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
        if(objLeg.Status === "OPEN" && objLeg.OptionType === "F" && objLeg.TransType === pTransType){
            return objLeg;
        }
    }

    return null;
}

async function fnRunDeltaNeutralFutures(){
    let objSwtDeltaNeutral = document.getElementById("swtDeltaNeutral");
    let objMinDeltaPM = document.getElementById("txtMinDeltaPM");

    if(!objSwtDeltaNeutral || !objSwtDeltaNeutral.checked){
        return;
    }

    let vMinDeltaPM = Math.abs(parseFloat(objMinDeltaPM ? objMinDeltaPM.value : 0));
    if(!Number.isFinite(vMinDeltaPM)){
        vMinDeltaPM = Math.abs(parseFloat(gOtherFlds[0]["DeltaPM"] || 0.10));
    }

    let vOptionDelta = 0;
    let vFutureDelta = 0;
    let vOpenOptionCount = 0;

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
        if(objLeg.Status !== "OPEN"){
            continue;
        }

        let vDelta = parseFloat(objLeg.DeltaC || objLeg.Delta || 0);
        if(!Number.isFinite(vDelta)){
            continue;
        }

        if(objLeg.OptionType === "F"){
            vFutureDelta += vDelta;
        }
        else{
            vOptionDelta += vDelta;
            vOpenOptionCount += 1;
        }
    }

    if(vOpenOptionCount === 0){
        return;
    }

    let vNetDelta = vOptionDelta + vFutureDelta;
    if(!Number.isFinite(vNetDelta)){
        return;
    }

    vNetDelta = parseFloat(vNetDelta.toFixed(6));
    vMinDeltaPM = parseFloat(vMinDeltaPM.toFixed(6));

    let vNow = Date.now();
    if(gDeltaNtrlBusy || (vNow - gDeltaNtrlLastActionTs) < 5000){
        return;
    }

    gDeltaNtrlBusy = true;
    try{
        if(vNetDelta > -vMinDeltaPM && vNetDelta < vMinDeltaPM){
            return;
        }

        let vNeedAction = (vNetDelta > 0) ? "sell" : "buy";
        let vOppositeAction = (vNeedAction === "buy") ? "sell" : "buy";
        let objOppFuture = fnGetOpenFutureLegBySide(vOppositeAction);

        if(objOppFuture){
            await fnCloseOptPosition(objOppFuture.TradeID, objOppFuture.TransType, "F", objOppFuture.Symbol, "CLOSED");
        }
        else{
            await fnPreInitAutoFutTrade("F", vNeedAction);
        }

        gDeltaNtrlLastActionTs = Date.now();
    }
    catch (objErr){
        console.log("Delta Neutral Error", objErr);
    }
    finally{
        gDeltaNtrlBusy = false;
    }
}

function fnExitAllPositions(){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    let objChkReLeg = document.getElementById("chkReLegBrok");
    let objYet2Recvr = document.getElementById("txtYet2Recvr");
    let vYet2RecvrAmt = parseFloat(objYet2Recvr.value);

    if(!Number.isFinite(vYet2RecvrAmt)){
        vYet2RecvrAmt = parseFloat(gOtherFlds[0]["Yet2RecvrAmt"]);
        if(!Number.isFinite(vYet2RecvrAmt)){
            vYet2RecvrAmt = 0;
        }
    }

    gUpdPos = false;

    gSymbBRateList = {};
    gSymbSRateList = {};
    gSymbDeltaList = {};
    gSymbGammaList = {};
    gSymbThetaList = {};
    gSymbVegaList = {};

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let objLeg = gCurrPosDSSLIVE1.TradeData[i];
        let vStrikePrice = parseFloat(objLeg.StrikePrice);
        let vLotSize = parseFloat(objLeg.LotSize);
        let vLotQty = parseFloat(objLeg.LotQty);
        let vBuyPrice = parseFloat(objLeg.BuyPrice);
        let vSellPrice = parseFloat(objLeg.SellPrice);
        let vOptionType = objLeg.OptionType;
        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, vOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        if(Number.isFinite(vPL)){
            vYet2RecvrAmt += vPL;
        }

        gCurrPosDSSLIVE1.TradeData[i].CloseDT = vToday;
        gCurrPosDSSLIVE1.TradeData[i].Status = "CLOSED";

        gClsdPosDSSLIVE1.TradeData.push(gCurrPosDSSLIVE1.TradeData[i]);
    }

    gOtherFlds[0]["Yet2RecvrAmt"] = vYet2RecvrAmt;
    objYet2Recvr.value = vYet2RecvrAmt;
    localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

    let objExcTradeDtls = JSON.stringify(gClsdPosDSSLIVE1);
    localStorage.setItem("ClsdPosDSSLIVE1", objExcTradeDtls);

    gCurrPosDSSLIVE1 = { TradeData : []};
    localStorage.removeItem("CurrPosDSSLIVE1");

    document.getElementById("txtBrok2Rec").value = 0;
    fnUpdHidFldSettings(0, "BrokerageAmt", "Brokerage Amount!");
    document.getElementById("txtYet2Recvr").value = 0;
    fnUpdHidFldSettings(0, "Yet2RecvrAmt", "et To Recover Amount!");
    gPL = 0;

    gUpdPos = true;
    fnSetSymbolTickerList();
    fnUpdateOpenPositions();
    fnDispClosedPositions();

    if(objChkReLeg){
        setTimeout(fnExecAllLegs, 900000);
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].TransType === "buy") && gCurrPosDSSLIVE1.TradeData[i].OptionType === vOptionType){
            vRecExists = true;
            vLegID = gCurrPosDSSLIVE1.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if((gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === "buy")){
            vLegID = gCurrPosDSSLIVE1.TradeData[i].ClientOrderID;
            vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
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
    let vTodayDate = new Date();
    let vDDMMYYYY = fnSetDDMMYYYY(vTodayDate);
    let vDate3PM = new Date();
    let vDate5PM = new Date();

    vDate3PM.setHours(15, 30, 0, 0);
    vDate5PM.setHours(17, 0, 0, 0);

    // Epoch time in milliseconds
    let v3PM = vDate3PM.getTime();
    let v5PM = vDate5PM.getTime();

    console.log(gCurrPosDSSLIVE1);
    console.log(vDDMMYYYY);
    console.log(v3PM);
    console.log(v5PM);
    

    // // console.log("Open epoch (ms):", v4PM);
    // // console.log("Close epoch (ms):", v5PM);

    // if((gDateNow.valueOf() > v4PM) && (gDateNow.valueOf() < v5PM)){
    //     console.log("Upded!");
    // }

    // console.log("Now Time: " + gDateNow.valueOf());
}

//************ Update Live Code Here **************//
function fnLoadDefExpiryMode(){
    let objBuyExpiryMode = document.getElementById("ddlBuyExpiryMode");
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let vBuyExpiryMode = JSON.parse(localStorage.getItem("BuyExpiryModeDSSLIVE1"));
    let vSellExpiryMode = JSON.parse(localStorage.getItem("SellExpiryModeDSSLIVE1"));
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
    localStorage.setItem("BuyExpiryModeDSSLIVE1", JSON.stringify(objBuyExpiryMode.value));
}

function fnUpdateSellExpiryMode(){
    let objSellExpiryMode = document.getElementById("ddlSellExpiryMode");
    let objExpirySell = document.getElementById("txtExpSell");

    fnLoadExpiryDate(objSellExpiryMode.value, objExpirySell);
    localStorage.setItem("SellExpiryModeDSSLIVE1", JSON.stringify(objSellExpiryMode.value));
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
        vCurrDate.setDate(vCurrDate.getDate() + 1);

        let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "2"){
        vCurrDate.setDate(vCurrDate.getDate() + 2);

        let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "4"){
        // Weekly expiry is Friday, rolled by Tuesday cutoff (EOD).
        const vCurrDayOfWeek = vCurrDate.getDay();
        const vDaysToNextTuesday = (2 - vCurrDayOfWeek + 7) % 7;
        const vDaysToWeeklyFriday = vDaysToNextTuesday + 3;

        vCurrFriday.setDate(vCurrDate.getDate() + vDaysToWeeklyFriday);
        let vDay = (vCurrFriday.getDate()).toString().padStart(2, "0");
        let vMonth = (vCurrFriday.getMonth() + 1).toString().padStart(2, "0");
        let vExpValTB = vCurrFriday.getFullYear() + "-" + vMonth + "-" + vDay;

        objExpiry.value = vExpValTB;
    }
    else if(pExpiryMode === "5"){
        // Bi-weekly expiry is the following Friday after weekly (Tuesday cutoff based).
        const vCurrDayOfWeek = vCurrDate.getDay();
        const vDaysToNextTuesday = (2 - vCurrDayOfWeek + 7) % 7;
        const vDaysToBiWeeklyFriday = vDaysToNextTuesday + 10;

        vNextFriday.setDate(vCurrDate.getDate() + vDaysToBiWeeklyFriday);
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
        let vTargetExpiry = (vTransType === "sell") ? vSellExpiry : vBuyExpiry;

        if(objChk.checked){
            vIsRecExists = false;

            if(gCurrPosDSSLIVE1.TradeData.length > 0){
                for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){

                    if((gCurrPosDSSLIVE1.TradeData[i].OptionType === vOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === vTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].Expiry === vTargetExpiry)){
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
                    let vGamma = parseFloat(objTradeDtls.data.Gamma || 0);
                    let vGammaC = parseFloat(objTradeDtls.data.GammaC || objTradeDtls.data.Gamma || 0);
                    let vTheta = parseFloat(objTradeDtls.data.Theta || 0);
                    let vThetaC = parseFloat(objTradeDtls.data.ThetaC || objTradeDtls.data.Theta || 0);
                    let vVega = parseFloat(objTradeDtls.data.Vega || 0);
                    let vVegaC = parseFloat(objTradeDtls.data.VegaC || objTradeDtls.data.Vega || 0);
                    let vDeltaRePos = objTradeDtls.data.DeltaRePos;
                    let vDeltaTP = objTradeDtls.data.DeltaTP;
                    let vDeltaSL = objTradeDtls.data.DeltaSL;
                    let vOpenDTVal = vDate.valueOf();
                    gUpdPos = false;

                    let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

                    gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
                    let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

                    localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

                    let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

                    console.log("Trade Executed");
                    gUpdPos = true;
                    fnSetSymbolTickerList();
                    fnUpdateOpenPositions();
                }
                else{
                    fnGenMessage("Option Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
                }
            }
            else{
                fnGenMessage("Same option side already open for selected expiry!", `badge bg-warning`, "spnGenMsg");
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
        fetch("/liveStrategy1fo/execOptionLeg", requestOptions)
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

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if((gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === pTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN")){
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
    let vExpiryNewPos = "";

    fnUpdateBuyExpiryMode();
    fnUpdateSellExpiryMode();

    let objExpiryBuy = document.getElementById("txtExpBuy");
    let objExpirySell = document.getElementById("txtExpSell");
    let vBuyExpiry = fnSetDDMMYYYY(objExpiryBuy.value);
    let vSellExpiry = fnSetDDMMYYYY(objExpirySell.value);

    if(pTransType === "sell"){
        vExpiryNewPos = vSellExpiry;
    }
    else if(pTransType === "buy"){
        vExpiryNewPos = vBuyExpiry;
    }

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if((gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === pTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN") && (gCurrPosDSSLIVE1.TradeData[i].Expiry === vExpiryNewPos)){
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
        let objStartSellQty = document.getElementById("txtStartSQty");
        let objStartBuyQty = document.getElementById("txtStartBQty");
        let objNewSellDelta = document.getElementById("txtNewSellDelta");
        let objNewBuyDelta = document.getElementById("txtNewBuyDelta");

        let objReSellDelta = document.getElementById("txtReSellDelta");
        let objReBuyDelta = document.getElementById("txtReBuyDelta");
        let objSellDeltaTP = document.getElementById("txtDeltaSellTP");
        let objBuyDeltaTP = document.getElementById("txtDeltaBuyTP");
        let objSellDeltaSL = document.getElementById("txtDeltaSellSL");
        let objBuyDeltaSL = document.getElementById("txtDeltaBuySL");

        let vUndrAsst = objSymbol.value;
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
            let vGamma = parseFloat(objTradeDtls.data.Gamma || 0);
            let vGammaC = parseFloat(objTradeDtls.data.GammaC || objTradeDtls.data.Gamma || 0);
            let vTheta = parseFloat(objTradeDtls.data.Theta || 0);
            let vThetaC = parseFloat(objTradeDtls.data.ThetaC || objTradeDtls.data.Theta || 0);
            let vVega = parseFloat(objTradeDtls.data.Vega || 0);
            let vVegaC = parseFloat(objTradeDtls.data.VegaC || objTradeDtls.data.Vega || 0);
            let vDeltaRePos = objTradeDtls.data.DeltaRePos;
            let vDeltaTP = objTradeDtls.data.DeltaTP;
            let vDeltaSL = objTradeDtls.data.DeltaSL;
            let vOpenDTVal = vDate.valueOf();
            gUpdPos = false;

            let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vCorP, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : vGamma, GammaC : vGammaC, Theta : vTheta, ThetaC : vThetaC, Vega : vVega, VegaC : vVegaC, DeltaNP : vDeltaRePos, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

            gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
            let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

            localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

            let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vCorP);
            gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
            objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

            localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

            console.log("Trade Executed");

            gUpdPos = true;
            fnSetSymbolTickerList();
            fnUpdateOpenPositions();
        }
        else{
            fnGenMessage("Option Leg Open Failed: " + objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
        }
    }
}

async function fnPreInitAutoFutTrade(pOptionType, pTransType){
    let objBrokAmt = document.getElementById("txtBrok2Rec");
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

        let vExcTradeDtls = { TradeID : vTradeID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vBuyOrSell, OptionType : vOptType, StrikePrice : vStrPrice, LotSize : vLotSize, LotQty : vLotQty, BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, Gamma : 0, GammaC : 0, Theta : 0, ThetaC : 0, Vega : 0, VegaC : 0, PointsTP : vPointsTP, RateTP : vRateTP, PointsSL : vPointsSL, RateSL : vRateSL, OpenDTVal : vOpenDTVal, Status : "OPEN" };

        gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);
        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

        let vCharges = fnGetTradeCharges(vStrPrice, vLotSize, vLotQty, vBestBuy, vBestSell, vOptType);
        gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) + vCharges;
        objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

        localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));

        console.log("Trade Executed");
        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
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
        fetch("/liveStrategy1fo/execFutureLeg", requestOptions)
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

    if(gCurrPosDSSLIVE1.TradeData.length > 0){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if((gCurrPosDSSLIVE1.TradeData[i].OptionType === pOptionType) && (gCurrPosDSSLIVE1.TradeData[i].TransType === pTransType) && (gCurrPosDSSLIVE1.TradeData[i].Status === "OPEN")){
                vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                
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
    // let objTrdCountCE = JSON.parse(localStorage.getItem("CETrdCntDSSLIVE1"));
    // let objTrdCountPE = JSON.parse(localStorage.getItem("PETrdCntDSSLIVE1"));

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
                    //     localStorage.setItem("CETrdCntDSSLIVE1", objTrdCountCE);
                    // }
                    // else if(pOptionType === "P"){
                    //     objTrdCountPE = objTrdCountPE + 1;
                    //     localStorage.setItem("PETrdCntDSSLIVE1", objTrdCountPE);
                    // }
                }
                else if(vTransType === "buy"){
                    vTradeSL = vBestBuy - vRateSL;
                    vTradeTP = vBestBuy + vRateTP;
                }

                let vExcTradeDtls = { ClientOrderID : vClientID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, Vega : vVega, Gamma : vGamma, Rho : vRho, MarkIV : vMarkIV, Theta : vTheta, DeltaC : vDeltaC, VegaC : vVegaC, GammaC : vGammaC, RhoC : vRhoC, MarkIVC : vMarkIVC, ThetaC : vThetaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, TradeSL : vTradeSL, TradeTP : vTradeTP, Status : "OPEN" };
                
                gCurrPosDSSLIVE1.TradeData.push(vExcTradeDtls);

                let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);

                localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);

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

        fetch("/liveStrategy1fo/execOption", requestOptions)
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

    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        let vStatus = gCurrPosDSSLIVE1.TradeData[i].Status;
        let vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
        let vExOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;

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
        // console.log(gCurrPosDSSLIVE1);
        if(gCurrPosDSSLIVE1.TradeData.length === 0){
            objCurrTradeList.innerHTML = '<tr><td colspan="16"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vTotalTrades = 0;
            let vNetPL = 0;
            let vTotalCharges = 0;
            let vTotalCapital = 0;
            let vTotalDelta = 0;
            let vTotalDeltaC = 0;
            let vTotalGamma = 0;
            let vTotalGammaC = 0;
            let vTotalTheta = 0;
            let vTotalThetaC = 0;
            let vTotalVega = 0;
            let vTotalVegaC = 0;

            for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
                let vLegID = gCurrPosDSSLIVE1.TradeData[i].TradeID;
                let vDelta = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Delta || 0);
                let vDeltaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].DeltaC || gCurrPosDSSLIVE1.TradeData[i].Delta || 0);
                let vGamma = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Gamma || 0);
                let vGammaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].GammaC || gCurrPosDSSLIVE1.TradeData[i].Gamma || 0);
                let vTheta = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Theta || 0);
                let vThetaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].ThetaC || gCurrPosDSSLIVE1.TradeData[i].Theta || 0);
                let vVega = parseFloat(gCurrPosDSSLIVE1.TradeData[i].Vega || 0);
                let vVegaC = parseFloat(gCurrPosDSSLIVE1.TradeData[i].VegaC || gCurrPosDSSLIVE1.TradeData[i].Vega || 0);

                let vLotSize = gCurrPosDSSLIVE1.TradeData[i].LotSize;
                let vQty = gCurrPosDSSLIVE1.TradeData[i].LotQty;
                let vOpenDT = gCurrPosDSSLIVE1.TradeData[i].OpenDT;
                let vCloseDT = gCurrPosDSSLIVE1.TradeData[i].CloseDT;
                let vOptionType = gCurrPosDSSLIVE1.TradeData[i].OptionType;
                let vProductID = gCurrPosDSSLIVE1.TradeData[i].ProductID;
                let vBuyPrice = gCurrPosDSSLIVE1.TradeData[i].BuyPrice;
                let vSellPrice = gCurrPosDSSLIVE1.TradeData[i].SellPrice;
                let vStatus = gCurrPosDSSLIVE1.TradeData[i].Status;
                let vStrikePrice = parseFloat(gCurrPosDSSLIVE1.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosDSSLIVE1.TradeData[i].Symbol;
                let vTransType = gCurrPosDSSLIVE1.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosDSSLIVE1.TradeData[i].UndrAsstSymb;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
                let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
                if(vStatus === "OPEN"){
                    vTotalTrades += 1;
                    vTotalCharges += parseFloat(vCharges);
                    vNetPL += parseFloat(vPL);
                    vTotalDelta += vDelta;
                    vTotalDeltaC += vDeltaC;
                    vTotalGamma += vGamma;
                    vTotalGammaC += vGammaC;
                    vTotalTheta += vTheta;
                    vTotalThetaC += vThetaC;
                    vTotalVega += vVega;
                    vTotalVegaC += vVegaC;
                }

                if(vCloseDT === undefined){
                    vCloseDT = "-";
                }

                if(vStatus === "OPEN"){
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(4) + '</div></td>';
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
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '</tr>';
                }
                else{
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(4) + '</div></td>';
                    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(4) + '</div></td>';
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
                    vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vStatus + '</td>';
                    vTempHtml += '</tr>';
                }
            }
            vTempHtml += '<tr>';
            vTempHtml += '<td></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalDelta).toFixed(2) + '</div></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalGamma).toFixed(4) + '</div></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalTheta).toFixed(4) + '</div></td>';
            vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vTotalVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalVega).toFixed(4) + '</div></td>';
            vTempHtml += '<td></td><td></td><td></td><td></td><td></td><td></td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td>';
            vTempHtml += '<td></td><td></td><td></td>';
            vTempHtml += '</tr>';
            objCurrTradeList.innerHTML = vTempHtml;
            gPL = vNetPL;
        }
        fnDispClosedPositions();
    }
}

function fnDispClosedPositions(){
    let objClosedTradeList = document.getElementById("tBodyClosedTrades");
    if(!objClosedTradeList){
        return;
    }

    const objMapClosedById = new Map();

    if(gClsdPosDSSLIVE1 && Array.isArray(gClsdPosDSSLIVE1.TradeData)){
        for(let i=0; i<gClsdPosDSSLIVE1.TradeData.length; i++){
            let objLeg = gClsdPosDSSLIVE1.TradeData[i];
            if(objLeg && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }

    if(gCurrPosDSSLIVE1 && Array.isArray(gCurrPosDSSLIVE1.TradeData)){
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            let objLeg = gCurrPosDSSLIVE1.TradeData[i];
            if(objLeg && objLeg.Status !== "OPEN" && objLeg.TradeID !== undefined){
                objMapClosedById.set(String(objLeg.TradeID), objLeg);
            }
        }
    }

    const objAllClosedRows = Array.from(objMapClosedById.values());

    if(objAllClosedRows.length === 0){
        objClosedTradeList.innerHTML = '<tr><td colspan="16"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 32px;">No Closed Trades Yet</div></td></tr>';
        return;
    }

    let vTempHtml = "";
    let vTotalTrades = 0;
    let vTotalCharges = 0;
    let vNetPL = 0;
    let vTotalDelta = 0;
    let vTotalDeltaC = 0;
    let vTotalGamma = 0;
    let vTotalGammaC = 0;
    let vTotalTheta = 0;
    let vTotalThetaC = 0;
    let vTotalVega = 0;
    let vTotalVegaC = 0;

    for(let i=0; i<objAllClosedRows.length; i++){
        let objLeg = objAllClosedRows[i];

        let vStatus = objLeg.Status || "CLOSED";
        let vDelta = parseFloat(objLeg.Delta || 0);
        let vDeltaC = parseFloat(objLeg.DeltaC || objLeg.Delta || 0);
        let vGamma = parseFloat(objLeg.Gamma || 0);
        let vGammaC = parseFloat(objLeg.GammaC || objLeg.Gamma || 0);
        let vTheta = parseFloat(objLeg.Theta || 0);
        let vThetaC = parseFloat(objLeg.ThetaC || objLeg.Theta || 0);
        let vVega = parseFloat(objLeg.Vega || 0);
        let vVegaC = parseFloat(objLeg.VegaC || objLeg.Vega || 0);
        let vSymbol = objLeg.Symbol || "-";
        let vTransType = objLeg.TransType || "-";
        let vOptionType = objLeg.OptionType || "";
        let vLotSize = parseFloat(objLeg.LotSize || 0);
        let vQty = parseFloat(objLeg.LotQty || 0);
        let vBuyPrice = parseFloat(objLeg.BuyPrice || 0);
        let vSellPrice = parseFloat(objLeg.SellPrice || 0);
        let vStrikePrice = parseFloat(objLeg.StrikePrice || 0);
        let vOpenDT = objLeg.OpenDT || "-";
        let vCloseDT = objLeg.CloseDT || "-";

        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice, vOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

        vTotalTrades += 1;
        vTotalCharges += parseFloat(vCharges);
        vNetPL += parseFloat(vPL);
        vTotalDelta += vDelta;
        vTotalDeltaC += vDeltaC;
        vTotalGamma += vGamma;
        vTotalGammaC += vGammaC;
        vTotalTheta += vTheta;
        vTotalThetaC += vThetaC;
        vTotalVega += vVega;
        vTotalVegaC += vVegaC;

        vTempHtml += "<tr>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:center; color:grey;">-</td>';
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + "</div></td>";
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vGamma).toFixed(4) + "</div></td>";
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTheta).toFixed(4) + "</div></td>";
        vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vVega).toFixed(4) + "</div></td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vSymbol + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vTransType + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vLotSize + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vQty + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (vBuyPrice).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (vSellPrice).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (parseFloat(vCharges)).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (vPL).toFixed(2) + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vOpenDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vCloseDT + "</td>";
        vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vStatus + "</td>";
        vTempHtml += "</tr>";
    }

    vTempHtml += '<tr>';
    vTempHtml += '<td></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalDelta).toFixed(2) + '</div></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalGammaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalGamma).toFixed(4) + '</div></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalThetaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalTheta).toFixed(4) + '</div></td>';
    vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalVegaC).toFixed(4) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vTotalVega).toFixed(4) + '</div></td>';
    vTempHtml += '<td></td><td></td><td></td><td></td><td></td><td></td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">' + (vTotalCharges).toFixed(2) + '</td>';
    vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">' + (vNetPL).toFixed(2) + "</td>";
    vTempHtml += '<td></td><td></td><td></td>';
    vTempHtml += '</tr>';
    objClosedTradeList.innerHTML = vTempHtml;
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

    let vLegLotSize = 0;
    let vLegLotQty = 0;
    for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
        if(gCurrPosDSSLIVE1.TradeData[i].TradeID === pLegID){
            vLegLotSize = parseFloat(gCurrPosDSSLIVE1.TradeData[i].LotSize || 0);
            vLegLotQty = parseFloat(gCurrPosDSSLIVE1.TradeData[i].LotQty || 0);
            break;
        }
    }

    let vBestRate = 0;
    let objCloseRes = await fnCloseLiveLeg(objApiKey.value, objApiSecret.value, pSymbol, pTransType, pOptionType, vLegLotSize, vLegLotQty);
    if(objCloseRes.status === "success"){
        vBestRate = parseFloat(objCloseRes.data.ClosePrice || 0);
    }

    if(!(vBestRate > 0)){
        let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, pSymbol);
        if(objBestRates.status === "success"){
            if(pTransType === "sell"){
                vBestRate = parseFloat(objBestRates.data.result.quotes.best_ask);
            }
            else if(pTransType === "buy"){
                vBestRate = parseFloat(objBestRates.data.result.quotes.best_bid);
            }
        }
    }
    
    if(vBestRate > 0){
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        let vStrikePrice = 0;
        let vLotSize = 0;
        let vLotQty = 0;
        let vBuyPrice = 0;
        let vSellPrice = 0;

        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};
        gSymbGammaList = {};
        gSymbThetaList = {};
        gSymbVegaList = {};

        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].TradeID === pLegID){                
                if(pTransType === "sell"){
                    gCurrPosDSSLIVE1.TradeData[i].BuyPrice = vBestRate;
                }
                else if(pTransType === "buy"){
                    gCurrPosDSSLIVE1.TradeData[i].SellPrice = vBestRate;
                }
                gCurrPosDSSLIVE1.TradeData[i].CloseDT = vToday;
                gCurrPosDSSLIVE1.TradeData[i].Status = pStatus;

                vStrikePrice = gCurrPosDSSLIVE1.TradeData[i].StrikePrice;
                vLotSize = gCurrPosDSSLIVE1.TradeData[i].LotSize;
                vLotQty = gCurrPosDSSLIVE1.TradeData[i].LotQty;
                vBuyPrice = gCurrPosDSSLIVE1.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosDSSLIVE1.TradeData[i].SellPrice;
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);


        let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vLotQty, vBuyPrice, vSellPrice, pOptionType);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vLotQty, vCharges);

        // console.log(vPL);
        if(pStatus === "CLOSED"){
            let vYet2RecvrAmt = parseFloat(objYet2Recvr.value);
            if(!Number.isFinite(vYet2RecvrAmt)){
                vYet2RecvrAmt = parseFloat(gOtherFlds[0]["Yet2RecvrAmt"]);
                if(!Number.isFinite(vYet2RecvrAmt)){
                    vYet2RecvrAmt = 0;
                }
            }

            gOtherFlds[0]["Yet2RecvrAmt"]  = vYet2RecvrAmt + vPL;
            objYet2Recvr.value = gOtherFlds[0]["Yet2RecvrAmt"];
            localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));            

            if(vPL > 0){
                if(parseFloat(objBrokAmt.value) >= vCharges){
                    gOtherFlds[0]["BrokerageAmt"] = parseFloat(objBrokAmt.value) - vCharges;
                    objBrokAmt.value = gOtherFlds[0]["BrokerageAmt"];

                    localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));
                }
            }
            else{
                let objOpnBuyLegOP = document.getElementById("swtOpnBuyLegOP");
                let objOpnBuyLegSS = document.getElementById("swtOpnBuyLegSS");

                if(objOpnBuyLegOP.checked && pTransType === "sell"){
                    let vOptionType = "";

                    if(pOptionType === "C"){
                        vOptionType = "P";
                    }
                    else if(pOptionType === "P"){
                        vOptionType = "C";
                    }
                    fnPreInitAutoTrade(vOptionType, "buy");
                }

                if(objOpnBuyLegSS.checked && pTransType === "sell"){
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

            // localStorage.setItem("HidFldsDSSLIVE1", JSON.stringify(gOtherFlds));
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
    else{
        fnGenMessage("Unable to close leg: no executable price.", "badge bg-danger", "spnGenMsg");
    }
}

function fnCloseLiveLeg(pApiKey, pApiSecret, pSymbol, pTransType, pOptionType, pLotSize, pLotQty){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "Symbol" : pSymbol,
            "TransType" : pTransType,
            "OptionType" : pOptionType,
            "LotSize" : pLotSize,
            "LotQty" : pLotQty
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/liveStrategy1fo/closeLeg", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
        })
        .catch(error => {
            resolve({ "status": "danger", "message": "Error at close leg.", "data": "" });
        });
    });

    return objPromise;
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

        fetch("/liveStrategy1fo/getBestRatesBySymb", requestOptions)
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
        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].TradeID === parseInt(objLegID.value)){
                gCurrPosDSSLIVE1.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosDSSLIVE1.TradeData[i].LotQty = parseInt(objQty.value);
                gCurrPosDSSLIVE1.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                gCurrPosDSSLIVE1.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
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
        gSymbThetaList = {};
        gSymbVegaList = {};
        // gSymbMarkIVList = {};
        // gSymbRhoList = {};

        let vDelRec = null;

        for(let i=0; i<gCurrPosDSSLIVE1.TradeData.length; i++){
            if(gCurrPosDSSLIVE1.TradeData[i].TradeID === pLegID){
                vDelRec = i;
            }
        }

        gCurrPosDSSLIVE1.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosDSSLIVE1);
        localStorage.setItem("CurrPosDSSLIVE1", objExcTradeDtls);
        gUpdPos = true;

        fnSetSymbolTickerList();
        fnUpdateOpenPositions();
    }
}


function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosDSSLIVE1");
    localStorage.removeItem("ClsdPosDSSLIVE1");
    localStorage.setItem("QtyMulDSSLIVE1", 0);
    localStorage.removeItem("NetLimitDSSLIVE1");
    gCurrPosDSSLIVE1 = { TradeData : []};
    // localStorage.removeItem("FutStratDSSLIVE1");
    // localStorage.removeItem("StrategyDSSLIVE1");
    // localStorage.removeItem("StartQtyBuyDSSLIVE1");
    localStorage.removeItem("CETrdCntDSSLIVE1");
    localStorage.removeItem("PETrdCntDSSLIVE1");

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
        gSymbGammaList[pTicData.symbol] = pTicData.greeks.gamma;
        gSymbThetaList[pTicData.symbol] = pTicData.greeks.theta;
        gSymbVegaList[pTicData.symbol] = pTicData.greeks.vega;
        gSpotPrice = pTicData.spot_price;
        // gSymbMarkIVList[pTicData.symbol] = pTicData.quotes.mark_iv;
        // gSymbRhoList[pTicData.symbol] = pTicData.greeks.rho;
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

    localStorage.setItem("CallSideSwtDSSLIVE1", objCallSideVal.value);
}

function fnPutTradeSide(){
    let objPutSideVal = document["frmSide"]["rdoPutTradeSide"];

    localStorage.setItem("PutSideSwtDSSLIVE1", objPutSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("CallSideSwtDSSLIVE1") === null){
        localStorage.setItem("CallSideSwtDSSLIVE1", "-1");
    }
    let lsCallSideSwitchS = localStorage.getItem("CallSideSwtDSSLIVE1");
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


    if(localStorage.getItem("PutSideSwtDSSLIVE1") === null){
        localStorage.setItem("PutSideSwtDSSLIVE1", "-1");
    }
    let lsPutSideSwitchS = localStorage.getItem("PutSideSwtDSSLIVE1");
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

    fetch("/liveStrategy1fo/getOptChnSDKByAstOptTypExp", requestOptions)
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

