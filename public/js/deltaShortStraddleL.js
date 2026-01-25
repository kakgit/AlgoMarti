
let obj_WS_SSL = null;
let gSubList = [];
let gMinReqMargin = 5.00;
let gQtyMultiplierM = 0;
let gObjDeltaDirec = [];
let gCurrPosSSL = { TradeData : []};
let gMrgndPosSSL = { TradeData : []};

let gOpnPosIds = [];
let gTradeInst = 0;

let gUpdPos = true;
let gSymbBRateList = {};
let gSymbSRateList = {};
let gSymbDeltaList = {};
// let gSymbGammaList = {};
// let gSymbVegaList = {};
// let gSymbMarkIVList = {};
// let gSymbRhoList = {};
// let gSymbThetaList = {};

let gForceCloseDFL = false;
let gBrokerage = 0.010;

let gCurrStrats = { StratsData : []};
let gClientID = "SS506525";
let gStartDT = 0;
let gEndDT = 0;

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
            // if(((vTradeSide === "true") && (objMsg.OptionType === "P")) || ((vTradeSide === "false") && (objMsg.OptionType === "C")) || (vTradeSide === "-1")){
                fnPreInitTrade(objMsg.OptionType);
            // }
            // else{
            //     fnGenMessage(objMsg.OptionType + " Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
            // }
        }
    });
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

    if(bAppStatus){
        fnConnectSSL();
        fnLoadLoginCred();
        fnLoadCurrStrategies();
        fnLoadDefQty();
        fnLoadOptStep();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();

        // fnLoadNetLimits();
        fnLoadTradeSide();
        fnLoadDefSymbol();
        fnLoadDefExpiryMode();

        fnLoadAllExpiryDate();
        fnLoadDefClsdPosDTRange();
        fnLoadCurrentTradePos();
        // setInterval(fnGetDelta, 300000);
        fnUpdateOpenPositions();
        fnInitClsdPositions();

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
    let objStartQtyM = JSON.parse(localStorage.getItem("StartQtySSL"));

    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objStartQty = document.getElementById("txtStartQty");

    if(objStartQtyM === null){
        objStartQty.value = 1;
        objQtyCE.value = 1;
        objQtyPE.value = 1;
        localStorage.setItem("StartQtySSL", objStartQty.value);
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
        localStorage.setItem("StartQtySSL", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtySSL", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtySSL", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQtyCE.value = pThisVal.value;
            objQtyPE.value = pThisVal.value;
            localStorage.setItem("QtyCallSSL", pThisVal.value);
            localStorage.setItem("QtyPutSSL", pThisVal.value);
        }
    }
    fnChangeReqMargin();
    console.log(localStorage.getItem("StartQtySSL"));
}

function fnChangeQtyCE(pThis){
    localStorage.setItem("QtyCallSSL", pThis.value);
}

function fnChangeQtyPE(pThis){
    localStorage.setItem("QtyPutSSL", pThis.value);
}

function fnChangeCallPL(pThis){
    localStorage.setItem("TotLossAmtCESSL", pThis.value);
}

function fnChangePutPL(pThis){
    localStorage.setItem("TotLossAmtPESSL", pThis.value);
}

function fnChangeSymbol(pSymbVal){
    localStorage.setItem("DeltaSymbSSL", JSON.stringify(pSymbVal));

    fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
    let objDefSymM = JSON.parse(localStorage.getItem("DeltaSymbSSL"));
    let objSelSymb = document.getElementById("ddlSymbols");

    if(objDefSymM === null){
        objDefSymM = "";
    }

    objSelSymb.value = objDefSymM;
    fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
    let objLotSize = document.getElementById("txtLotSize");

    localStorage.setItem("DeltaSymbSSL", JSON.stringify(pThisVal));

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

function fnInItWalletBal(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

    if(objApiKey.value === ""){
        fnGenMessage("Invalid API Key", `badge bg-warning`, "spnGenMsg");
    }
    else if(objApiSecret.value === ""){
        fnGenMessage("Invalid Secret Key", `badge bg-warning`, "spnGenMsg");
    }
    else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaSStraddleLive/getWalletDetails", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                let objCallPL = document.getElementById("txtCallPL");
                let objPutPL = document.getElementById("txtPutPL");
                let vNetEquity = parseFloat(objResult.data.meta.net_equity);
                let vNetAvailAmt = parseFloat(objResult.data.result[2].available_balance);
                let vMarginBlocked = vNetEquity - vNetAvailAmt;
                let vReqBalance = vMarginBlocked * 3;
                let vYet2Req = parseFloat(objCallPL.value) + parseFloat(objPutPL.value);

                // console.log(objResult);
                // console.log(objResult.data.meta.net_equity);
                // console.log(objResult.data.result[0].available_balance);
                document.getElementById("spnBal1").innerText = (vNetAvailAmt).toFixed(3);
                document.getElementById("spnMarginBlocked").innerText = (vMarginBlocked).toFixed(3);
                document.getElementById("spnReqBalance").innerText = (vReqBalance).toFixed(3);
                document.getElementById("spnYet2Recover").innerText = (vYet2Req).toFixed(3);

                // let objBalances = { Acc1BalINR: objResult.data[0].available_balance_inr, Acc1BalUSD: objResult.data[0].available_balance };
                // document.getElementById("spnBal1").innerText = (parseFloat(objBalances.Acc1BalUSD)).toFixed(2);

                // localStorage.setItem("DeltaNetLimit", JSON.stringify(objBalances));
                // console.log(localStorage.getItem("DeltaNetLimit"));

                // $('#mdlDeltaLogin').modal('hide');
                // localStorage.setItem("lsLoginValidDFL", "true");
                // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                // fnGetSetTraderLoginStatus();
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else{
                    fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
                }
            }
            else if(objResult.status === "warning"){
                // fnClearLoginStatus();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                // fnClearLoginStatus();
                fnGenMessage("Error to Fetch Wallet Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            // fnClearLoginStatus();
            //console.log('error: ', error);
            fnGenMessage("Error to Fetch Wallet Details.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnLoadNetLimits(){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objSpnBal1 = document.getElementById("spnBal1");
    let objSpmReqMargin = document.getElementById('spnMarginReq');
    let objStartQty = document.getElementById("txtStartQty");

    gQtyMultiplierM = objStartQty.value;
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
    }
    else{
        let Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
        objSpnBal1.innerText = Acc1BalUSD;

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
    let objCurrPos = JSON.parse(localStorage.getItem("CurrPosSSL"));

    gCurrPosSSL = objCurrPos;
    // console.log(gCurrPosSSL);

    if(gCurrPosSSL === null){
        gCurrPosSSL = { TradeData : []};
    }
    else{
        fnSetSymbolTickerList();
    }
}

function fnSetSymbolTickerList(){
    if(gCurrPosSSL.TradeData.length > 0){
        const objSubListArray = [];
        gSubList = [];

        for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
            if(gCurrPosSSL.TradeData[i].State === "OPEN"){
                objSubListArray.push(gCurrPosSSL.TradeData[i].Symbol);
            }
        }
        const setSubList = new Set(objSubListArray);
        gSubList = [...setSubList];

        // console.log(gSubList);
        fnUnSubscribeSSL();
        fnSubscribeSSL();

        clearInterval(gTradeInst);
        gTradeInst = setInterval(fnSaveUpdCurrPos, 30000);
    }
}

function fnChangeStep(){
    // let vStepM = JSON.parse(localStorage.getItem("OptStepSSL"));
    let objSwtStep = document.getElementById("swtStepDFL");

    localStorage.setItem("OptStepSSL", JSON.stringify(objSwtStep.checked));
    // alert(objSwtStep.checked);
}

function fnLoadOptStep(){
    let vStepM = JSON.parse(localStorage.getItem("OptStepSSL"));
    let objSwtStep = document.getElementById("swtStepDFL");

    if(vStepM){
        objSwtStep.checked = true;
    }
    else{
        objSwtStep.checked = false;
    }
}

function fnLoadTotalLossAmtQty(){
    let vTotLossAmtCE = localStorage.getItem("TotLossAmtCESSL");
    let vTotLossAmtPE = localStorage.getItem("TotLossAmtPESSL");
    let vQtyCEM = localStorage.getItem("QtyCallSSL");
    let vQtyPEM = localStorage.getItem("QtyPutSSL");
    let objQtyCE = document.getElementById("txtQtyCE");
    let objQtyPE = document.getElementById("txtQtyPE");
    let objDefQty = document.getElementById("txtStartQty");

    let objCallPL = document.getElementById("txtCallPL");
    let objPutPL = document.getElementById("txtPutPL");

    if(vTotLossAmtCE === null || vTotLossAmtCE === "" || isNaN(vTotLossAmtCE)){
        localStorage.setItem("TotLossAmtCESSL", 0);
        localStorage.setItem("QtyCallSSL", objDefQty.value);
    }
    else if(parseFloat(vTotLossAmtCE) > 0){
        objCallPL.value = 0;
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
        localStorage.setItem("TotLossAmtPESSL", 0);
        localStorage.setItem("QtyPutSSL", objDefQty.value);
    }
    else if(parseFloat(vTotLossAmtPE) > 0){
        objPutPL.value = 0;
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

//Check here for current position status
function fnSaveUpdCurrPos(){
    let vToPosClose = false;
    let vLegID = 0;
    let vLotQty = 0;
    let vTransType = "";
    let vOptionType = "";
    let vSymbol = "";
    let objCallPL = document.getElementById("txtCallPL");
    let objPutPL = document.getElementById("txtPutPL");

    for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
        if(gCurrPosSSL.TradeData[i].State === "OPEN"){
            let vCurrDelta = parseFloat(gSymbDeltaList[gCurrPosSSL.TradeData[i].Symbol]);
            // let vCurrGamma = parseFloat(gSymbGammaList[gCurrPosSSL.TradeData[i].Symbol]);
            // let vCurrVega = parseFloat(gSymbVegaList[gCurrPosSSL.TradeData[i].Symbol]);
            // let vCurrMarkIV = parseFloat(gSymbMarkIVList[gCurrPosSSL.TradeData[i].Symbol]);
            // let vCurrRho = parseFloat(gSymbRhoList[gCurrPosSSL.TradeData[i].Symbol]);
            // let vCurrTheta = parseFloat(gSymbThetaList[gCurrPosSSL.TradeData[i].Symbol]);

            gCurrPosSSL.TradeData[i].DeltaC = vCurrDelta;
            // gCurrPosSSL.TradeData[i].GammaC = vCurrGamma;
            // gCurrPosSSL.TradeData[i].VegaC = vCurrVega;
            // gCurrPosSSL.TradeData[i].MarkIVC = vCurrMarkIV;
            // gCurrPosSSL.TradeData[i].RhoC = vCurrRho;
            // gCurrPosSSL.TradeData[i].ThetaC = vCurrTheta;

            let vStrikePrice = gCurrPosSSL.TradeData[i].StrikePrice;
            let vLotSize = gCurrPosSSL.TradeData[i].LotSize;
            let vQty = gCurrPosSSL.TradeData[i].Qty;
            let vBuyPrice = gCurrPosSSL.TradeData[i].BuyPrice;
            let vSellPrice = gCurrPosSSL.TradeData[i].SellPrice;
            let vOptionTypeZZ = gCurrPosSSL.TradeData[i].OptionType;

            let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

            if(gCurrPosSSL.TradeData[i].TransType === "sell"){
                // console.log(gCurrPosSSL.TradeData[i].Symbol);
                // console.log(gSymbBRateList[gCurrPosSSL.TradeData[i].Symbol]);
                // ****************** Uncomment When Live *****************//
                let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosSSL.TradeData[i].Symbol]);
                gCurrPosSSL.TradeData[i].BuyPrice = vCurrPrice;
                // ****************** Uncomment When Live *****************//

                // // ****************** Remove When Live *****************//
                // vCurrPrice = gCurrPosSSL.TradeData[i].BuyPrice;
                // // ****************** Remove When Live *****************//

                if((Math.abs(parseFloat(vCurrDelta)) > parseFloat(gCurrPosSSL.TradeData[i].DeltaSL)) || (Math.abs(parseFloat(vCurrDelta)) < parseFloat(gCurrPosSSL.TradeData[i].DeltaTP))){
                    vLegID = gCurrPosSSL.TradeData[i].TradeID;
                    vLotQty = gCurrPosSSL.TradeData[i].Qty;
                    vTransType = gCurrPosSSL.TradeData[i].TransType;
                    vOptionType = gCurrPosSSL.TradeData[i].OptionType;
                    vSymbol = gCurrPosSSL.TradeData[i].Symbol;
                    vToPosClose = true;
                }
                else if(vPL > 0){
                    if((vOptionTypeZZ === "C") && (parseFloat(objCallPL.value) < 0) && (vPL > parseFloat(Math.abs(objCallPL.value)))){
                        vLegID = gCurrPosSSL.TradeData[i].TradeID;
                        vLotQty = gCurrPosSSL.TradeData[i].Qty;
                        vTransType = gCurrPosSSL.TradeData[i].TransType;
                        vOptionType = gCurrPosSSL.TradeData[i].OptionType;
                        vSymbol = gCurrPosSSL.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                    else if((vOptionTypeZZ === "P") && (parseFloat(objPutPL.value) < 0) && (vPL > parseFloat(Math.abs(objPutPL.value)))){
                        vLegID = gCurrPosSSL.TradeData[i].TradeID;
                        vLotQty = gCurrPosSSL.TradeData[i].Qty;
                        vTransType = gCurrPosSSL.TradeData[i].TransType;
                        vOptionType = gCurrPosSSL.TradeData[i].OptionType;
                        vSymbol = gCurrPosSSL.TradeData[i].Symbol;
                        vToPosClose = true;
                    }
                }
            }
            else if(gCurrPosSSL.TradeData[i].TransType === "buy"){
                // ****************** Uncomment When Live *****************//
                let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosSSL.TradeData[i].Symbol]);
                gCurrPosSSL.TradeData[i].SellPrice = vCurrPrice;
                // ****************** Uncomment When Live *****************//

                // // ****************** Remove When Live *****************//
                // vCurrPrice = gCurrPosSSL.TradeData[i].SellPrice;
                // // ****************** Remove When Live *****************//

                if((Math.abs(parseFloat(vCurrDelta)) < parseFloat(gCurrPosSSL.TradeData[i].DeltaSL)) || (Math.abs(parseFloat(vCurrDelta)) > parseFloat(gCurrPosSSL.TradeData[i].DeltaTP))){
                    vLegID = gCurrPosSSL.TradeData[i].TradeID;
                    vLotQty = gCurrPosSSL.TradeData[i].Qty;
                    vTransType = gCurrPosSSL.TradeData[i].TransType;
                    vOptionType = gCurrPosSSL.TradeData[i].OptionType;
                    vSymbol = gCurrPosSSL.TradeData[i].Symbol;
                    vToPosClose = true;
                }
            }
        }
    }

    fnUpdateOpenPositions();

    if(vToPosClose){
        fnCloseOptPosition(vLegID, vLotQty, vTransType, vOptionType, vSymbol, "CLOSED");
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
    console.log(gCurrPosSSL);
}

//************ Update Live Code Here **************//
function fnLoadDefExpiryMode(){
    let objExpiryMode = document.getElementById("ddlExpiryMode");
    let vExpiryMode = JSON.parse(localStorage.getItem("ExpiryModeSSL"));

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
    localStorage.setItem("ExpiryModeSSL", JSON.stringify(objExpiryMode.value));
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

        if(vCurrDay > 15){
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

function fnSwapCurrency(){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
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

function fnLoadDefClsdPosDTRange(){
    let objStartDT = document.getElementById("txtClsdPosStartDT");
    let objEndDT = document.getElementById("txtClsdPosEndDT");
    let vStartDTM = JSON.parse(localStorage.getItem("StartDT-SSL"));
    let vCurrDate = new Date();
    let vStartDT, vEndDT = "";

    if(vStartDTM === null){
        const vYear = vCurrDate.getFullYear();
        const vMonth = vCurrDate.getMonth();
        let vDay = "01";

        vStartDT = vYear + "-" + vMonth + "-" + vDay + "T00:00:01";
        // gStartDT = (Date.UTC(vYear, vMonth-1, vDay, "00", "00", "00") * 1000);
        gStartDT = (vCurrDate.valueOf()) * 1000;
        localStorage.setItem("StartDT-SSL", JSON.stringify(vStartDT));
        objStartDT.value = vStartDT;

        // console.log(vCurrDate);
        // console.log("vStartDT: " + vStartDT);
        // console.log("gStartDT: " + gStartDT);
    }
    else{
        const vMemDate = new Date(vStartDTM);
        let vYear = vMemDate.getFullYear();
        let vMonth = (vMemDate.getMonth()+1).toString().padStart(2, "0");
        let vDay = (vMemDate.getDate()).toString().padStart(2, "0");
        let vHour = (vMemDate.getHours()).toString().padStart(2, "0");
        let vMinutes = (vMemDate.getMinutes()).toString().padStart(2, "0");
        let vSeconds = (vMemDate.getSeconds()).toString().padStart(2, "0");

        vStartDT = vYear + "-" + vMonth + "-" + vDay + "T" + vHour + ":" + vMinutes + ":" + vSeconds;
        // gStartDT = (Date.UTC(vYear, vMonth-1, vDay, vHour, vMinutes, vSeconds) * 1000);
        gStartDT = (vMemDate.valueOf()) * 1000;

        objStartDT.value = vStartDT;
    }

    let vYearEndDT = vCurrDate.getFullYear();
    let vMonthEndDT = (vCurrDate.getMonth()+1).toString().padStart(2, "0");
    let vDayEndDT = (vCurrDate.getDate()).toString().padStart(2, "0");

    vEndDT = vYearEndDT + "-" + vMonthEndDT + "-" + vDayEndDT + "T23:59:59";
    gEndDT = ((new Date(vEndDT)).valueOf()) * 1000;
    objEndDT.value = vEndDT;

    // console.log("vStartDTM: " + localStorage.getItem("StartDT-SSL"));
    // console.log(gEndDT);
    // console.log(vCurrDate.valueOf());
}

function fnChangeClsPosStartDT(){
    let objStartDT = document.getElementById("txtClsdPosStartDT");
    const vSelDate = new Date(objStartDT.value);

    let vYear = vSelDate.getFullYear();
    let vMonth = (vSelDate.getMonth()+1).toString().padStart(2, "0");
    let vDay = (vSelDate.getDate()).toString().padStart(2, "0");
    let vHour = (vSelDate.getHours()).toString().padStart(2, "0");
    let vMinutes = (vSelDate.getMinutes()).toString().padStart(2, "0");
    let vSeconds = (vSelDate.getSeconds()).toString().padStart(2, "0");

    let vStartDT = vYear + "-" + vMonth + "-" + vDay + "T" + vHour + ":" + vMinutes + ":" + vSeconds;
    // gStartDT = (Date.UTC(vYear, vMonth-1, vDay, vHour, vMinutes, vSeconds) * 1000);
    gStartDT = (vSelDate.valueOf()) * 1000;
    localStorage.setItem("StartDT-SSL", JSON.stringify(vStartDT));

    // console.log(vSelDate);
    // console.log(gStartDT);
}

function fnChangeClsPosEndDT(){
    let objEndDT = document.getElementById("txtClsdPosEndDT");
    const vSelDate = new Date(objEndDT.value);

    gEndDT = ((vSelDate).valueOf()) * 1000;
    console.log(gEndDT);
}

function fnChangeReqMargin(){
    let objNetLimits = JSON.parse(localStorage.getItem("DeltaNetLimit"));
    let objSpmReqMargin = document.getElementById("spnMarginReq");
    let objQtyCE = document.getElementById("txtQtyCE");
    let Acc1BalUSD = 0;

    if(objNetLimits === null || objNetLimits === ""){

    }
    else{
        Acc1BalUSD = parseFloat((objNetLimits.Acc1BalUSD)).toFixed(2);
    }

    if(isNaN(parseFloat(objQtyCE.value)) || objQtyCE.value === ""){
        objSpmReqMargin.innerText = (0.00).toFixed(2);
    }
    else{
        let vTotalMarginReq = (gMinReqMargin * parseFloat(objQtyCE.value)).toFixed(2);
        objSpmReqMargin.innerText = vTotalMarginReq;

        if(parseFloat(vTotalMarginReq) > parseFloat(Acc1BalUSD)){
            objSpmReqMargin.style.color = "red";
        }
        else{
            objSpmReqMargin.style.color = "green";
        }
    }
}

function fnPreInitTrade(pOptionType){
    let vIsRecExists = false;

    fnUpdateExpiryMode();

    if(gCurrPosSSL.TradeData.length > 0){
        for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
            if((gCurrPosSSL.TradeData[i].OptionType === pOptionType) && (gCurrPosSSL.TradeData[i].State === "OPEN")){
                vIsRecExists = true;
            }
        }
    }

    if(vIsRecExists === false){
        fnInitTrade(pOptionType);
    }
    else{
        fnGenMessage("Trade Message Received but Same Option Type is Already Open!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnInitTrade(pOptionType){
    let objApiKey1 = document.getElementById("txtUserAPIKey");
    let objApiSecret1 = document.getElementById("txtAPISecret");

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

    //{ TransType : "sell", OptionType : "F", DeltaNew : 1.00, DeltaTP : 2.00, DeltaSL : 0.10 }, 
    
    let objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ TransType : "sell", OptionType : "P", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }, { TransType : "sell", OptionType : "C", DeltaNew : 0.50, DeltaTP : 0.25, DeltaSL : 0.65 }] }] }
    // let objStrategies = { Strategies : [{ StratID : 1234324, StratName : "S-1", StratModel : [{ TransType : "sell", OptionType : "P", DeltaNew : 0.15, DeltaTP : 0.05, DeltaSL : 0.20 }, { TransType : "sell", OptionType : "C", DeltaNew : 0.15, DeltaTP : 0.05, DeltaSL : 0.20 }] }] }

    // console.log(objStrategies.Strategies[0].StratModel.length);
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
        let vClientID = vOrdId + i;

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
                let vClientOrderID = objTradeDtls.data.ClientOrderID;
                let vCommission = objTradeDtls.data.Commission;
                let vExecQty = objTradeDtls.data.Qty;
                let vState = objTradeDtls.data.State;
                let vTradeID = objTradeDtls.data.TradeID;
                
                let vDeltaC = parseFloat(objTradeDtls.data.Delta);

                let vExcTradeDtls = { ClientOrderID : vClientOrderID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : vOptionType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(vExecQty), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaC : vDeltaC, OpenDTVal : vOrdId, DeltaTP : vDeltaTP, DeltaSL : vDeltaSL, DeltaNP : vDeltaNPos, Commission : vCommission, TradeID : vTradeID, State : vState };
                
                gCurrPosSSL.TradeData.push(vExcTradeDtls);
                let objExcTradeDtls = JSON.stringify(gCurrPosSSL);

                localStorage.setItem("CurrPosSSL", objExcTradeDtls);

                gUpdPos = true;
                fnSetSymbolTickerList();
                fnUpdateOpenPositions();
                fnInitClsdPositions();
            }
            else if(objTradeDtls.status === "danger"){
                console.log("ERRORrrrrr")
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

        fetch("/deltaSStraddleLive/execOption", requestOptions)
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
        // console.log(gCurrPosSSL);
        if(gCurrPosSSL.TradeData.length === 0){
            objCurrTradeList.innerHTML = '<tr><td colspan="12"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vTotalTrades = 0;
            let vNetPL = 0;
            let vTotalCharges = 0;
            let vTotalCapital = 0;

            for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
                let vBuyPrice = gCurrPosSSL.TradeData[i].BuyPrice;
                let vLegID = gCurrPosSSL.TradeData[i].ClientOrderID;
                let vContractType = gCurrPosSSL.TradeData[i].ContrctType;
                let vDelta = gCurrPosSSL.TradeData[i].Delta;
                let vDeltaC = gCurrPosSSL.TradeData[i].DeltaC;
                let vDeltaNPos = gCurrPosSSL.TradeData[i].DeltaNP;
                let vDeltaSL = gCurrPosSSL.TradeData[i].DeltaSL;
                let vDeltaTP = gCurrPosSSL.TradeData[i].DeltaTP;
                let vExpiry = gCurrPosSSL.TradeData[i].Expiry;
                let vLotSize = gCurrPosSSL.TradeData[i].LotSize;
                let vOpenDT = gCurrPosSSL.TradeData[i].OpenDT;
                let vOptionType = gCurrPosSSL.TradeData[i].OptionType;
                let vProductID = gCurrPosSSL.TradeData[i].ProductID;
                let vQty = gCurrPosSSL.TradeData[i].Qty;
                let vSellPrice = gCurrPosSSL.TradeData[i].SellPrice;
                let vState = gCurrPosSSL.TradeData[i].State;
                let vStrikePrice = parseFloat(gCurrPosSSL.TradeData[i].StrikePrice);
                let vSymbol = gCurrPosSSL.TradeData[i].Symbol;
                let vTransType = gCurrPosSSL.TradeData[i].TransType;
                let vUndrAsstSymb = gCurrPosSSL.TradeData[i].UndrAsstSymb;
                let vTradeID = gCurrPosSSL.TradeData[i].TradeID;

                let vCharges = fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
                let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
                vTotalTrades += 1;
                vTotalCharges += parseFloat(vCharges);
                vNetPL += parseFloat(vPL);

                if(vState === "OPEN"){
                    vTempHtml += '<tr>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vState + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vOpenDT + '</td>';
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
                    vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseOptPosition('+ vTradeID +', '+ vQty +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vTradeID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red; display:none" onclick="fnDelLeg('+ vTradeID +');"></i></td>';
                    vTempHtml += '</tr>';
                }
                // else{
                //     vTempHtml += '<tr>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:right;">' + vState + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vOpenDT + '</td>';
                //     vTempHtml += '<td><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDeltaC).toFixed(2) + '</div><div style="text-wrap: nowrap; text-align:right; font-weight:bold; color:grey;">' + (vDelta).toFixed(2) + '</div></td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vSymbol + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:grey; text-align:center;">' + vTransType + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vLotSize + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + vQty + '</td>';
                //     vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap;text-align:right; color:grey;">' + (vBuyPrice).toFixed(2) + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right; color:grey;">' + (vSellPrice).toFixed(2) + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:grey;">'+ (vPL).toFixed(2) +'</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnCloseOptPosition('+ vTradeID +', '+ vQty +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vTradeID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vTradeID +');"></i></td>';
                //     vTempHtml += '</tr>';
                // }
            }
            vTempHtml += '<tr><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Total Trades: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vTotalTrades +'</td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;"></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;"></td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;"></td><td></td></tr>';
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

//Check here closing position, lot step or martingale multiplier settings
async function fnCloseOptPosition(pTradeID, pLotQty, pTransType, pOptionType, pSymbol, pState){
    let objStepSwt = document.getElementById("swtStepDFL");

    if(pTransType === "buy"){
        pTransType = "sell";
    }
    else if(pTransType === "sell"){
        pTransType = "buy";
    }

    let objClsTrd = await fnExitRealOrder(pSymbol, pLotQty, pTransType);
    // console.log(objClsTrd);

    if(objClsTrd.status === "success"){
        let vBestClsRate = objClsTrd.data.result.average_fill_price;
        let vStrikePrice = 0;
        let vLotSize = 0;
        let vQty = 0;
        let vBuyPrice = 0;
        let vSellPrice = 0;
        gUpdPos = false;

        gSymbBRateList = {};
        gSymbSRateList = {};
        gSymbDeltaList = {};

        for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
            if(parseInt(gCurrPosSSL.TradeData[i].TradeID) === parseInt(pTradeID)){
                if(pTransType === "sell"){
                    gCurrPosSSL.TradeData[i].SellPrice = vBestClsRate;
                }
                else if(pTransType === "buy"){
                    gCurrPosSSL.TradeData[i].BuyPrice = vBestClsRate;
                }

                vStrikePrice = gCurrPosSSL.TradeData[i].StrikePrice;
                vLotSize = gCurrPosSSL.TradeData[i].LotSize;
                vQty = objClsTrd.data.result.size;
                vBuyPrice = gCurrPosSSL.TradeData[i].BuyPrice;
                vSellPrice = gCurrPosSSL.TradeData[i].SellPrice;
            }
        }

        if(objStepSwt.checked){
            let vCharges = objClsTrd.data.result.paid_commission; //fnGetTradeCharges(vStrikePrice, vLotSize, vQty, vBuyPrice, vSellPrice);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
            let objStartQty = document.getElementById("txtStartQty");

            if(pOptionType === "C"){
                let vTotLossAmtCE = localStorage.getItem("TotLossAmtCESSL");
                if(parseFloat(vTotLossAmtCE) > 0){
                    vTotLossAmtCE = 0;
                }
                let vQtyCE = localStorage.getItem("QtyCallSSL");
                vTotLossAmtCE = parseFloat(vTotLossAmtCE) + parseFloat(vPL);
                localStorage.setItem("TotLossAmtCESSL", vTotLossAmtCE);
                document.getElementById("txtCallPL").value = vTotLossAmtCE;

                if(parseFloat(vTotLossAmtCE) < 0){
                    let vNewQty = parseInt(vQtyCE) + parseInt(objStartQty.value);
                    localStorage.setItem("QtyCallSSL", vNewQty);
                    document.getElementById("txtQtyCE").value = vNewQty;
                }
                else{
                    document.getElementById("txtCallPL").value = 0;
                    document.getElementById("txtQtyCE").value = objStartQty.value;
                    localStorage.setItem("QtyCallSSL", objStartQty.value);
                }
            }
            else if(pOptionType === "P"){
                let vTotLossAmtPE = localStorage.getItem("TotLossAmtPESSL");
                if(parseFloat(vTotLossAmtPE) > 0){
                    vTotLossAmtPE = 0;
                }
                let vQtyPE = localStorage.getItem("QtyPutSSL");
                vTotLossAmtPE = parseFloat(vTotLossAmtPE) + parseFloat(vPL);
                localStorage.setItem("TotLossAmtPESSL", vTotLossAmtPE);
                document.getElementById("txtPutPL").value = vTotLossAmtPE;

                if(parseFloat(vTotLossAmtPE) < 0){
                    let vNewQty = parseInt(vQtyPE) + parseInt(objStartQty.value);
                    localStorage.setItem("QtyPutSSL", vNewQty);
                    document.getElementById("txtQtyPE").value = vNewQty;
                }
                else{
                    document.getElementById("txtPutPL").value = 0;
                    document.getElementById("txtQtyPE").value = objStartQty.value;
                    localStorage.setItem("QtyPutSSL", objStartQty.value);
                }
            }
        }

        let vDelRec = null;

        for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
            if(parseInt(gCurrPosSSL.TradeData[i].TradeID) === parseInt(pTradeID)){
                vDelRec = i;
            }
        }

        gCurrPosSSL.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosSSL);
        localStorage.setItem("CurrPosSSL", objExcTradeDtls);

        console.log("Position Closed!");

        gUpdPos = true;
        fnSetSymbolTickerList();
        fnUpdateOpenPositions();

        fnInitClsdPositions();

        fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    }
    else{
        fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
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

        fetch("/deltaSStraddleLive/getBestRatesBySymb", requestOptions)
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

function fnOpenEditModel(pTradeID, pLotSize, pQty, pBuyPrice, pSellPrice){
    let objLegID = document.getElementById("hidLegID");
    let objLotSize = document.getElementById("txtEdLotSize");
    let objQty = document.getElementById("txtEdQty");
    let objBuyPrice = document.getElementById("txtEdBuyPrice");
    let objSellPrice = document.getElementById("txtEdSellPrice");

    objLegID.value = pTradeID;
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
        for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
            if(parseInt(gCurrPosSSL.TradeData[i].TradeID) === parseInt(objLegID.value)){
                gCurrPosSSL.TradeData[i].LotSize = parseFloat(objLotSize.value);
                gCurrPosSSL.TradeData[i].Qty = parseInt(objQty.value);
                gCurrPosSSL.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
                gCurrPosSSL.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
                // gCurrPosSSL.TradeData[i].State = "OPEN";
            }
        }

        let objExcTradeDtls = JSON.stringify(gCurrPosSSL);
        localStorage.setItem("CurrPosSSL", objExcTradeDtls);
        fnLoadCurrentTradePos();
        fnGenMessage("Option Leg Updated!", `badge bg-success`, "spnGenMsg");
        $('#mdlLegEditor').modal('hide');
    }
    gUpdPos = true;
}

function fnDelLeg(pTradeID){
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

        for(let i=0; i<gCurrPosSSL.TradeData.length; i++){
            if(parseInt(gCurrPosSSL.TradeData[i].TradeID) === parseInt(pTradeID)){
                vDelRec = i;
            }
        }

        gCurrPosSSL.TradeData.splice(vDelRec, 1);

        let objExcTradeDtls = JSON.stringify(gCurrPosSSL);
        localStorage.setItem("CurrPosSSL", objExcTradeDtls);
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


//***************** Live Open, Close, list real Positions ***************//

async function fnGetOpenPositions(){
    let objOpenPosTA = document.getElementById("taOpenPos");
    let objExpShort = document.getElementById("txtExpShort");
    let objOpenTrdPos = document.getElementById("tBodyOpenTrades");
    let vShortExpiry = fnSetDDMMYYYY(objExpShort.value);

    gOpnPosIds = [];
    gMrgndPosSSL = { TradeData : []};

    let objPromise = await fnGetOpenPositionsList();

    if(objPromise.status === "success"){
        // console.log(objPromise);
        if(objPromise.data.result.length === 0){
            objOpenTrdPos.innerHTML = '<tr><td colspan="5"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Open Positions</div></td></tr>';
        }
        else{
            let vTempData = { TradeData : []};
            let vTempHtml = "";

            for (let i = 0; i < objPromise.data.result.length; i++){
                let vBuyPrice = parseFloat(objPromise.data.result[i].price);
                let vSellPrice = parseFloat(objPromise.data.result[i].price);
                let vTempDT = new Date(objPromise.data.result[i].created_at);
                let vMonth = vTempDT.getMonth() + 1;
                let vCreatedDT = vTempDT.getDate() + "-" + vMonth + "-" + vTempDT.getFullYear() + " " + vTempDT.getHours() + ":" + vTempDT.getMinutes() + ":" + vTempDT.getSeconds();
                let vClientOrderID = vTempDT.valueOf();
                let vTradeID = parseFloat(objPromise.data.result[i].order_id);
                let vProductID = objPromise.data.result[i].product_id;
                let vSymbol = objPromise.data.result[i].product_symbol;
                let vTransType = objPromise.data.result[i].side;
                let vContractType = objPromise.data.result[i].product.contract_type;
                let vLotSize = parseFloat(objPromise.data.result[i].product.contract_value);
                let vQty = parseFloat(objPromise.data.result[i].size);
                let vCommission = parseFloat(objPromise.data.result[i].commission);
                let vDelta = 0.48;
                let vDeltaC = 0.48;
                let vDeltaNP = 0.50;
                let vDeltaSL = 0.65;
                let vDeltaTP = 0.25;
                let vOptionType = vSymbol.substring(0, 1);
                let vState = "OPEN";
                let vStrike = parseInt(objPromise.data.result[i].meta_data.spot);
                let vUndrAsstSymb = objPromise.data.result[i].product.contract_unit_currency;

                vTempHtml += "<tr>";
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;"><input type="checkbox" id="' + vTradeID + '" onclick="fnSelectedPositions(this);" /></td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vSellPrice + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vTransType + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vQty + '</td>';
                vTempHtml += "</tr>";

                vTempData.TradeData.push({ BuyPrice : vBuyPrice, ClientOrderID : vClientOrderID, Commission : vCommission, ContrctType : vContractType, Delta : vDelta, DeltaC : vDeltaC, DeltaNP : vDeltaNP, DeltaSL : vDeltaSL, DeltaTP : vDeltaTP, Expiry : vShortExpiry, LotSize : vLotSize, OpenDT : vCreatedDT, OpenDTVal : vClientOrderID, OptionType : vOptionType, ProductID : vProductID, Qty : vQty, SellPrice : vSellPrice, State : vState, StrikePrice : vStrike, Symbol : vSymbol, TradeID : vTradeID, TransType : vTransType, UndrAsstSymb : vUndrAsstSymb })
            }

            objOpenTrdPos.innerHTML = vTempHtml;

            // console.log(vTempData);
            objOpenPosTA.innerText = JSON.stringify(vTempData.TradeData);
        }

        $('#mdlOpenPosSel').modal('show');
        fnGenMessage(objPromise.message, `badge bg-${objPromise.status}`, "spnGenMsg");   
    }
    else{
        console.log(objPromise);
        fnGenMessage(objPromise.message, `badge bg-${objPromise.status}`, "spnGenMsg");   
    }
}

function fnSelectedPositions(objThis){
    let vDelRec = null;

    if(objThis.checked){
        gOpnPosIds.push(objThis.id);
        // console.log("insert: " + objThis.id);
    }
    else{
        for(let i=0; i<gOpnPosIds.length; i++){
            if(gOpnPosIds[i] === objThis.id){
                vDelRec = i;
            }
        }
        // console.log(gOpnPosIds.length);
        gOpnPosIds.splice(vDelRec, 1);
    }
}

function fnSaveOpenPositions(){
    let objOpenPosTA = document.getElementById("taOpenPos");
    let objOpnPos = JSON.parse(objOpenPosTA.value);
    let objSelPosList = [];
    gUpdPos = false;

    if(gOpnPosIds.length > 0){
        for(let i=0; i<gOpnPosIds.length; i++){
            for(let j=0; j<objOpnPos.length;j++){
                if(parseInt(gOpnPosIds[i]) === parseInt(objOpnPos[j].TradeID)){
                    objSelPosList.push(objOpnPos[j]);
                }
            }
        }
    }

    gSymbBRateList = {};
    gSymbSRateList = {};
    gSymbDeltaList = {};

    gCurrPosSSL.TradeData = objSelPosList;

    let objExcTradeDtls = JSON.stringify(gCurrPosSSL);
    localStorage.setItem("CurrPosSSL", objExcTradeDtls);
    gUpdPos = true;

    fnSetSymbolTickerList();
    fnUpdateOpenPositions();

    $('#mdlOpenPosSel').modal('hide');
    // console.log(gCurrPosSSL);
}

function fnGetOpenPositionsList(){
    const objPromise = new Promise((resolve, reject) => {
        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");
        let objStartDT = document.getElementById("txtClsdPosStartDT");
        let objEndDT = document.getElementById("txtClsdPosEndDT");

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaSStraddleLive/getRealOpenPos", requestOptions)
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
            resolve({ "status": "danger", "message": "Error At Open Positions. Catch!", "data": "" });
        });
    });
    return objPromise;
}

async function fnInitPlaceRealOrder(){
    let objClsTrd = await fnPlaceRealOrder();
    console.log(objClsTrd);

    if(objClsTrd.status === "success"){

        fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    }
    else{
        fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    }
}

function fnPlaceRealOrder(){
    const objPromise = new Promise((resolve, reject) => {

        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value,
            "ClientID" : gClientID
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaSStraddleLive/openRealPosition", requestOptions)
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
            resolve({ "status": "danger", "message": "Error At Closed Positions. Catch!", "data": "" });
        });
    });
    return objPromise;
}

async function fnInitExitRealOrder(){
    let objClsTrd = await fnExitRealOrder();
    console.log(objClsTrd);

    if(objClsTrd.status === "success"){

        fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    }
    else{
        fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    }
}

function fnExitRealOrder(pSymbol, pLotQty, pTransType){
    const objPromise = new Promise((resolve, reject) => {

        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value,
            "Symbol" : pSymbol,
            "LotQty" : pLotQty,
            "TransType" : pTransType
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaSStraddleLive/closeRealPosition", requestOptions)
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
                else if(objResult.data.response.body.error.code === "no_position_for_reduce_only"){
                    resolve({ "status": objResult.status, "message": "No Open Position to Close!", "data": objResult.data });
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
            resolve({ "status": "danger", "message": "Error At Closed Positions. Catch!", "data": "" });
        });
    });
    return objPromise;
}

async function fnInitClsdPositions(){
    let objTodayTradeList = document.getElementById("tBodyClsdTrades");
    // fnChangeClsPosStartDT();
    let objPromise = await fnGetClsdPositions();

    if(objPromise.status === "success"){
        // console.log(objPromise);
        if (objPromise.data.result.length === 0) {
            objTodayTradeList.innerHTML = '<tr><td colspan="12"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Closed Trades for Selected Date Range</div></td></tr>';
        }
        else{
            let vTempHtml = "";
            let vTotalPL = 0;
            let vTotalCharges = 0;
            let vNetPL = 0;
            for (let i = 0; i < objPromise.data.result.length; i++){
                let vState = objPromise.data.result[i].state;
                let vUpdatedDT = (new Date(objPromise.data.result[i].updated_at)).toLocaleString("en-UK");
                let vSymbol = objPromise.data.result[i].product_symbol;
                let vTransType = objPromise.data.result[i].side;
                let vLotSize = objPromise.data.result[i].product.contract_value;
                let vQty = objPromise.data.result[i].size;
                let vAvgFillPrice = parseFloat(objPromise.data.result[i].average_fill_price);
                let vPaidComm = parseFloat(objPromise.data.result[i].paid_commission);
                let vPnl = parseFloat(objPromise.data.result[i].meta_data.pnl);
                let vCashflow = parseFloat(objPromise.data.result[i].meta_data.cashflow);

                if(vState === "closed"){
                    vTotalCharges += parseFloat(vPaidComm);
                    vTotalPL += vPnl;
                    let vTransDT = "";

                    vTempHtml += '<tr>';
                    // vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vState + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap;">' + vUpdatedDT + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: center;">.-.-.</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: center;">' + vSymbol + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: center;">' + vTransType + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: center;">' + vLotSize + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: center;">' + vQty + '</td>';

                    if(vTransType === "buy"){
                        vTempHtml += '<td style="text-wrap: nowrap; text-align: right;">' + (vAvgFillPrice).toFixed(3) + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align: right;"> - </td>';
                    }
                    else if(vTransType === "sell"){
                        vTempHtml += '<td style="text-wrap: nowrap; text-align: right;"> - </td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align: right;">' + (vAvgFillPrice).toFixed(3) + '</td>';
                    }
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: right;">' + (vCashflow).toFixed(3) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: right;">' + (vPaidComm).toFixed(3) + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align: right;">' + (vPnl).toFixed(3) + '</td>';
                    vTempHtml += '</tr>';
                }
            }

            vNetPL = vTotalPL - vTotalCharges;
            vTempHtml += '<tr><td></td><td style="font-weight:bold;text-align:right;">Net PL: </td><td style="font-weight:bold;text-align:right;">' + (vNetPL).toFixed(3) + '</td><td></td><td></td><td></td><td></td><td></td><td style="font-weight:bold;text-align:right;"></td><td style="font-weight:bold;text-align:right;color:red;">' + (vTotalCharges).toFixed(3) + '</td><td style="font-weight:bold;text-align:right;">' + (vTotalPL).toFixed(3) + '</td></tr>';

            objTodayTradeList.innerHTML = vTempHtml;
            fnGenMessage(objPromise.message, `badge bg-${objPromise.status}`, "spnGenMsg");   
        }
    }
    else{
        console.log(objPromise);
        fnGenMessage(objPromise.message, `badge bg-${objPromise.status}`, "spnGenMsg");   
    }
}

function fnGetClsdPositions(){
    const objPromise = new Promise((resolve, reject) => {
        // console.log(gStartDT);
        // console.log(gEndDT);
        let objApiKey = document.getElementById("txtUserAPIKey");
        let objApiSecret = document.getElementById("txtAPISecret");
        let objStartDT = document.getElementById("txtClsdPosStartDT");
        let objEndDT = document.getElementById("txtClsdPosEndDT");

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : objApiKey.value,
            "ApiSecret" : objApiSecret.value,
            "StartDT" : gStartDT,
            "EndDT" : gEndDT,
            "ClientID" : gClientID
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaSStraddleLive/getRealClsdPos", requestOptions)
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
            resolve({ "status": "danger", "message": "Error At Closed Positions. Catch!", "data": "" });
        });
    });
    return objPromise;
}
//***************** Live Closed Positions ***************//



function fnClearLocalStorageTemp(){
    localStorage.removeItem("CurrPosSSL");
    localStorage.removeItem("DeltaNetLimit");

    localStorage.removeItem("TotLossAmtCESSL");
    localStorage.removeItem("TotLossAmtPESSL");
    localStorage.removeItem("QtyCallSSL");
    localStorage.removeItem("QtyPutSSL");
    localStorage.removeItem("StartQtySSL");

    localStorage.removeItem("StartDT-SSL");
    fnGetAllStatus();
    console.log("Memory Cleared!!!");
}



//******************* WS Connection and Subscription Fully Updated Version ****************//
function fnConnectSSL(){
    let objSub = document.getElementById("spnSub");
    let vUrl = "wss://socket.india.delta.exchange";
    obj_WS_SSL = new WebSocket(vUrl);

    obj_WS_SSL.onopen = function (){
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
        // console.log("WS is Open!");
    }
    obj_WS_SSL.onerror = function (){
        setTimeout(fnSubscribeSSL, 3000);
        console.log("WS Error, Trying to Reconnect.....");
    }
    obj_WS_SSL.onclose = function (){
        if(gForceCloseDFL){
            gForceCloseDFL = false;
            // console.log("WS Disconnected & Closed!!!!!!");
            objSub.className = "badge rounded-pill text-bg-success";
            fnGenMessage("Streaming Stopped & Disconnected!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            fnSubscribeSSL();
            // console.log("Restarting WS....");
        }
    }
    obj_WS_SSL.onmessage = function (pMsg){
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
        // gSymbGammaList[pTicData.symbol] = pTicData.greeks.gamma;
        // gSymbVegaList[pTicData.symbol] = pTicData.greeks.vega;
        // gSymbMarkIVList[pTicData.symbol] = pTicData.quotes.mark_iv;
        // gSymbRhoList[pTicData.symbol] = pTicData.greeks.rho;
        // gSymbThetaList[pTicData.symbol] = pTicData.greeks.theta;
    }

    // console.log(gSymbGammaList);
    // console.log(gSymbVegaList);
    // console.log(gSymbMarkIVList);
    // console.log(gSymbRhoList);
    // console.log(gSymbThetaList);
}

function fnGetSignature(pApiSecret, pMethod, pPath, pTimeStamp){
    // if (!pBody || R.isEmpty(pBody)) pBody = "";
    // else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

    const vMessage = pMethod + pTimeStamp + pPath;
    return crypto
        .createHmac("sha256", pApiSecret)
        .update(vMessage)
        .digest("hex");
}

function fnSubscribeSSL(){
    if(obj_WS_SSL === null){
        fnConnectSSL();
        setTimeout(fnSubscribeSSL, 3000);
        // console.log("Connecting WS.....");
    }
    else{
        const vTimer = setInterval(() => {
            if(obj_WS_SSL.readyState === 1){
                clearInterval(vTimer);
                //Write Subscription code here
                let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};
                // let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "positions", "symbols": ["all"] }]}};

                obj_WS_SSL.send(JSON.stringify(vSendData));
                // console.log("Subscribing............");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectSSL();
            }
        }, 3000);
    }
}

function fnUnSubscribeSSL(){
    if(obj_WS_SSL === null){
        fnConnectSSL();
        setTimeout(fnUnSubscribeSSL, 3000);
        // console.log("Already Disconnected, Connecting WS to Unsub.....");
    }
    else{
        const vTimer = setInterval(() => {
            if(obj_WS_SSL.readyState === 1){
                clearInterval(vTimer);
                let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

                obj_WS_SSL.send(JSON.stringify(vSendData));
                // console.log("UnSubscribing........!!!!!");
            }
            else{
                // console.log("Trying to Reconnect...");
                fnConnectSSL();
            }
        }, 3000);
    }
}

function fnRestartConnDFL(){
    if(obj_WS_SSL !== null){
        obj_WS_SSL.close();
    }
    else{
        // console.log("WS already Disconnected and Reconnecting Now......");       
        fnSubscribeSSL();
    }
}

function fnForceDisconnectSSL(){
    if(obj_WS_SSL !== null){
        gForceCloseDFL = true;
        obj_WS_SSL.close();
    }
    else{
        // console.log("WS already Disconnected!!!!!!");        
    }
}

function fnCheckStatusOSD(){
    console.log(obj_WS_SSL);    
}

function fnAdd2SubList(){
    let objSymbol = document.getElementById("txtRateTest");

    gSubList.push(objSymbol.value);
    console.log(gSubList);
    fnUnSubscribeSSL();
    fnSubscribeSSL();
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

    fetch("/deltaSStraddleLive/getOptChnSDKByAstOptTypExp", requestOptions)
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