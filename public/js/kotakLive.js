    
let gIsTraderLogin = false;
let userKotakWS = "";
let vTradeInst = 0;
let gStreamInst = 0;
let gIndData = {};

let gBuyPrice = 0;
let gSellPrice = 0;
let gLotSize = 0;
let gQty = 0;
let gAmtSL = 0;
let gAmtTP = 0;
let gByorSl = "";

let gDiffSL = 0;
let gDiffTP = 0;
let gCurrTSL = 0;

let gTSLCrossed = false;

window.addEventListener("DOMContentLoaded", function(){
    fnGetSetTraderLoginStatus();

    socket.on("c3mh", (pMsg) => {
        let objLiveMsgs = JSON.parse(localStorage.getItem("msgsCI"));
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        if(objLiveMsgs === null || objLiveMsgs === ""){
            objLiveMsgs = JSON.stringify({ TrdMsgs: [{ MsgId: vDate.valueOf(), MsgDT: vToday, SymbID: pMsg.Symbol, OptType: pMsg.OptionType }]});
            localStorage.setItem("msgsCI", objLiveMsgs);
        }
        else{
            // objLiveMsgs = JSON.parse(objLiveMsgs);
            let vTempMsg = { MsgId: vDate.valueOf(), MsgDT: vToday, SymbID: pMsg.Symbol, OptType: pMsg.OptionType };

            objLiveMsgs.TrdMsgs.push(vTempMsg);
            localStorage.setItem("msgsCI", JSON.stringify(objLiveMsgs));
        }
        console.log(objLiveMsgs);

        fnInnitiateAutoTrade(pMsg);
    });

    socket.on("tv-exec", (pMsg) => {
        let objLiveMsgs = JSON.parse(localStorage.getItem("msgsCI"));
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        if(objLiveMsgs === null || objLiveMsgs === ""){
            objLiveMsgs = JSON.stringify({ TrdMsgs: [{ MsgId: vDate.valueOf(), MsgDT: vToday, SymbID: pMsg.Symbol, OptType: pMsg.OptionType }]});
            localStorage.setItem("msgsCI", objLiveMsgs);
        }
        else{
            // objLiveMsgs = JSON.parse(objLiveMsgs);
            let vTempMsg = { MsgId: vDate.valueOf(), MsgDT: vToday, SymbID: pMsg.Symbol, OptType: pMsg.OptionType };

            objLiveMsgs.TrdMsgs.push(vTempMsg);
            localStorage.setItem("msgsCI", JSON.stringify(objLiveMsgs));
        }

        fnInnitiateAutoTrade(pMsg);
    });

    socket.on("tv-exec-close", (pMsg) => {
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

        if(objCurrPos === null || objCurrPos === ""){
            fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
        }
        else if(objCurrPos.TradeData[0].OptionType === pMsg.OptionType){
            fnCloseOptTrade();
            fnGenMessage("Position is Close!", `badge bg-success`, "spnGenMsg");
        }
        else{
            fnGenMessage("No "+ pMsg.OptionType +" Position to Close!", `badge bg-warning`, "spnGenMsg");
        }
    });

    socket.on("CdlTrend", (pMsg) => {
        let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
        let objJson = JSON.parse(pMsg);
        let vPivotPoint = (objJson.High15M + objJson.Low15M + objJson.Close15M)/3;

        if(objJson.Close15M < vPivotPoint){
            objTradeSideVal.value = true;
        }
        else if(objJson.Close15M > vPivotPoint){
            objTradeSideVal.value = false;
        }
        else{
            objTradeSideVal.value = -1;
        }
        fnTradeSide();
        //console.log(vPivotPoint);
    });

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

async function fnExecPlaceBOTest(pBuySel, pOptionType){
    let objSpotOption = document.getElementById("hidSpotOption");
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objClientId = document.getElementById("txtMobileNo");
    let objOptQty = document.getElementById("txtOptionsQty");
    let objMaxQty = document.getElementById("hidMaxQty");
    let objLossBadge = document.getElementById("spnLossTrd");

    try{
        if(gIsTraderLogin === false){
            fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
        }
        else if(objSpotOption.value === ""){
            fnGetSelSymbolData(0);
            fnGenMessage("Please Select the Symbol", `badge bg-warning`, "spnGenMsg");
        }
        else if(objOptQty.value === "" || objOptQty.value <= 0){
            fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
        }
        else{
            let objLotSize = document.getElementById("txtOptionLotSize");
            let objJsonFileName = document.getElementById("hidJsonFileName");
            let objSearchSymbol = document.getElementById("hidSearchSymbol");
            let objDdlOptionStep = document.getElementById("ddlOptionStrike");
            let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
            let objOptExpiry = document.getElementById("ddlOptionsExpiry");
            let objSegment = document.getElementById("hidSegment");
            let objStopLoss = document.getElementById("txtOptionsSL1");
            let objTakeProfit = document.getElementById("txtOptionsTP1");
            let objCurrRate = document.getElementById("txtCurrentRate");
            let objMaxOrdQty = document.getElementById("hidMaxPerOrdQty");

            let vRndStrkByOptStep = await fnGetRoundedStrikeByOptStep(pOptionType, objSpotOption.value, objDdlOptionStep.value, objStrikeInterval.value);

            let vExpiry2Epoch = await fnGetEpochBySegmentSeldExpiry(objSegment.value, objOptExpiry.value);

            let objTokenDtls = await fnGetTokenDetails4Option(objJsonFileName.value, objSearchSymbol.value, pOptionType, vExpiry2Epoch, vRndStrkByOptStep);

            if(objTokenDtls.status === "success"){
                objLotSize.value = objTokenDtls.data.LotSize;
                objMaxOrdQty.value = objTokenDtls.data.MaxPerOrdQty;

                let obj1TimeCurrRate = await fnGet1TimeCurrOptRate(objTokenDtls.data.ExchSeg, objTokenDtls.data.Token, objCurrRate);

                if(obj1TimeCurrRate.status === "success"){
                    let vDate = new Date();
                    let vMultOrdId = vDate.valueOf();

                    let objNrmlOrdr = await fnPlaceOptBO(objHsServerId.value, objSid.value, objAccessToken.value, objKotakSession.value, objOptQty.value, objTokenDtls.data.LotSize, objTokenDtls.data.Token, objTokenDtls.data.ExchSeg, pBuySel, objTokenDtls.data.TrdSymbol, pOptionType, objSearchSymbol.value, vRndStrkByOptStep, obj1TimeCurrRate.data, objMaxQty.value, vMultOrdId, objStopLoss.value, objTakeProfit.value);
                    if(objNrmlOrdr.status === "success"){
                        // let vDate = new Date();
                        // let vMonth = vDate.getMonth() + 1;
                        // let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

                        // let vAvgPrice = parseFloat(objNrmlOrdr.data.BuyPrice);
                        // let vPerSL = parseFloat(objStopLoss.value);
                        // let vPerTP = parseFloat(objTakeProfit.value);

                        // gAmtSL = (vAvgPrice - vPerSL).toFixed(2);
                        // gAmtTP = (vAvgPrice + vPerTP).toFixed(2);

                        // objNrmlOrdr.data.ClientID = objClientId.value;                    
                        // objNrmlOrdr.data.Expiry = objOptExpiry.value;
                        // objNrmlOrdr.data.EntryDT = vToday;
                        // objNrmlOrdr.data.StopLoss = gAmtSL;
                        // objNrmlOrdr.data.TakeProfit = gAmtTP;
                        // objNrmlOrdr.data.PointSL = vPerSL;
                        // objNrmlOrdr.data.PointTP = vPerTP;

                        // let vExcTradeDtls = { TradeData: [objNrmlOrdr.data] };

                        // let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
                        // // alert(objExcTradeDtls);
                        // localStorage.setItem("KotakCurrOptPosiS", objExcTradeDtls);
                        // localStorage.setItem("QtyMulR", objNrmlOrdr.data.Quantity);
                        // localStorage.setItem("MultOrdId", objNrmlOrdr.data.TradeID);
                        // objLossBadge.style.visibility = "hidden";

                        // console.log(vRndStrkByOptStep);
                        // console.log(vExpiry2Epoch);
                        // console.log(objTokenDtls);
                        // console.log(obj1TimeCurrRate);
                        // console.log(objNrmlOrdr);
                        // // console.log(vExcTradeDtls);

                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                        // fnSetInitOptTrdDtls();
                        // fnGetSelSymbolData(0);
                    }
                    else{
                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                    }
                }
                else{
                    fnGenMessage(obj1TimeCurrRate.message, `badge bg-${obj1TimeCurrRate.status}`, "spnGenMsg");
                }
            }
            else{
                fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
            }
        }
        // let objMktStat = await fnGetMarketStatus();

        // console.log(objMktStat);
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

async function fnExecPlaceOrderTest(pBuySel, pOptionType){
    let objSpotOption = document.getElementById("hidSpotOption");
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objClientId = document.getElementById("txtMobileNo");
    let objOptQty = document.getElementById("txtOptionsQty");
    let objMaxQty = document.getElementById("hidMaxQty");
    let objLossBadge = document.getElementById("spnLossTrd");

    try{
        if(gIsTraderLogin === false){
            fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
        }
        else if(objSpotOption.value === ""){
            fnGetSelSymbolData(0);
            fnGenMessage("Please Select the Symbol", `badge bg-warning`, "spnGenMsg");
        }
        else if(objOptQty.value === "" || objOptQty.value <= 0){
            fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
        }
        else{
            let objLotSize = document.getElementById("txtOptionLotSize");
            let objJsonFileName = document.getElementById("hidJsonFileName");
            let objSearchSymbol = document.getElementById("hidSearchSymbol");
            let objDdlOptionStep = document.getElementById("ddlOptionStrike");
            let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
            let objOptExpiry = document.getElementById("ddlOptionsExpiry");
            let objSegment = document.getElementById("hidSegment");
            let objStopLoss = document.getElementById("txtOptionsSL1");
            let objTakeProfit = document.getElementById("txtOptionsTP1");
            let objCurrRate = document.getElementById("txtCurrentRate");
            let objMaxOrdQty = document.getElementById("hidMaxPerOrdQty");

            let vRndStrkByOptStep = await fnGetRoundedStrikeByOptStep(pOptionType, objSpotOption.value, objDdlOptionStep.value, objStrikeInterval.value);

            let vExpiry2Epoch = await fnGetEpochBySegmentSeldExpiry(objSegment.value, objOptExpiry.value);

            let objTokenDtls = await fnGetTokenDetails4Option(objJsonFileName.value, objSearchSymbol.value, pOptionType, vExpiry2Epoch, vRndStrkByOptStep);

            if(objTokenDtls.status === "success"){
                objLotSize.value = objTokenDtls.data.LotSize;
                objMaxOrdQty.value = objTokenDtls.data.MaxPerOrdQty;

                let obj1TimeCurrRate = await fnGet1TimeCurrOptRate(objTokenDtls.data.ExchSeg, objTokenDtls.data.Token, objCurrRate);

                if(obj1TimeCurrRate.status === "success"){
                    let vDate = new Date();
                    let vMultOrdId = vDate.valueOf();

                    let objNrmlOrdr = await fnPlaceOptNrmlOrdr1(objHsServerId.value, objSid.value, objAccessToken.value, objKotakSession.value, objOptQty.value, objTokenDtls.data.LotSize, objTokenDtls.data.Token, objTokenDtls.data.ExchSeg, pBuySel, objTokenDtls.data.TrdSymbol, pOptionType, objSearchSymbol.value, vRndStrkByOptStep, obj1TimeCurrRate.data, objMaxQty.value, vMultOrdId);
                    if(objNrmlOrdr.status === "success"){
                        let vDate = new Date();
                        let vMonth = vDate.getMonth() + 1;
                        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

                        let vAvgPrice = parseFloat(objNrmlOrdr.data.BuyPrice);
                        let vPerSL = parseFloat(objStopLoss.value);
                        let vPerTP = parseFloat(objTakeProfit.value);

                        gAmtSL = (vAvgPrice - vPerSL).toFixed(2);
                        gAmtTP = (vAvgPrice + vPerTP).toFixed(2);

                        objNrmlOrdr.data.ClientID = objClientId.value;                    
                        objNrmlOrdr.data.Expiry = objOptExpiry.value;
                        objNrmlOrdr.data.EntryDT = vToday;
                        objNrmlOrdr.data.StopLoss = gAmtSL;
                        objNrmlOrdr.data.TakeProfit = gAmtTP;
                        objNrmlOrdr.data.PointSL = vPerSL;
                        objNrmlOrdr.data.PointTP = vPerTP;

                        let vExcTradeDtls = { TradeData: [objNrmlOrdr.data] };

                        let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
                        // alert(objExcTradeDtls);
                        localStorage.setItem("KotakCurrOptPosiS", objExcTradeDtls);
                        localStorage.setItem("QtyMulR", objNrmlOrdr.data.Quantity);
                        localStorage.setItem("MultOrdId", objNrmlOrdr.data.TradeID);
                        objLossBadge.style.visibility = "hidden";

                        console.log(vRndStrkByOptStep);
                        console.log(vExpiry2Epoch);
                        console.log(objTokenDtls);
                        console.log(obj1TimeCurrRate);
                        console.log(objNrmlOrdr);
                        // console.log(vExcTradeDtls);

                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                        fnSetInitOptTrdDtls();
                        fnGetSelSymbolData(0);
                    }
                    else{
                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                    }
                }
                else{
                    fnGenMessage(obj1TimeCurrRate.message, `badge bg-${obj1TimeCurrRate.status}`, "spnGenMsg");
                }
            }
            else{
                fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
            }
        }
        // let objMktStat = await fnGetMarketStatus();

        // console.log(objMktStat);
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnPlaceOptBO(pHsServerId, pSid, pAccessToken, pKotakSession, pOptionQty, pLotSize, pToken, pExchSeg, pBuySel, pTrdSymbol, pOptionType, pSearchSymbol, pStrikePrice, pCurrRate, pMaxQty, pMultOrdId, pPointsSL, pPointsTP){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ HsServerId: pHsServerId, Sid: pSid, AccessToken: pAccessToken, KotakSession: pKotakSession, OptQty: pOptionQty, LotSize: pLotSize, Token: pToken, ExchSeg: pExchSeg, BorS: pBuySel, TrdSymbol: pTrdSymbol, OptionType: pOptionType, SearchSymbol: pSearchSymbol, StrikePrice: pStrikePrice, CurrRate: pCurrRate, MaxOptQty: pMaxQty, MultOrdId: pMultOrdId, PointsSL: pPointsSL, PointsTP: pPointsTP }),
            redirect: 'follow'
        };

        fetch("/kotakReal/placeOptBracketOrder", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                console.log('error: ', error);
                fnGenMessage("Error in Placing Option Order.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Placing Option Order!", "data": "" });
            });
    });
    return objPromise;
}

function fnPlaceOptNrmlOrdr1(pHsServerId, pSid, pAccessToken, pKotakSession, pOptionQty, pLotSize, pToken, pExchSeg, pBuySel, pTrdSymbol, pOptionType, pSearchSymbol, pStrikePrice, pCurrRate, pMaxQty, pMultOrdId){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ HsServerId: pHsServerId, Sid: pSid, AccessToken: pAccessToken, KotakSession: pKotakSession, OptQty: pOptionQty, LotSize: pLotSize, Token: pToken, ExchSeg: pExchSeg, BorS: pBuySel, TrdSymbol: pTrdSymbol, OptionType: pOptionType, SearchSymbol: pSearchSymbol, StrikePrice: pStrikePrice, CurrRate: pCurrRate, MaxOptQty: pMaxQty, MultOrdId: pMultOrdId }),
            redirect: 'follow'
        };

        fetch("/kotakReal/placeOptNrmlOrder1", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                console.log('error: ', error);
                fnGenMessage("Error in Placing Option Order.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Placing Option Order!", "data": "" });
            });
    });
    return objPromise;
}

function fnShowKotakTraderLoginMdl(objThis){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    if(bAppStatus === "false"){
        //$('#mdlAppLogin').modal('show');
        fnGenMessage("First Login to App for Trading Account Login!", `badge bg-warning`, "spnGenMsg");
        fnGetSetAllStatus();
    }
    else if(objThis.className === "badge bg-danger"){
        $('#mdlKotakLogin').modal('show');
        fnGetSetAllStatus();
    }
    else{
        fnClearPrevTraderSession();
        fnGetSetTraderLoginStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnChangeKotakStartLotNos(pThisVal){

    let objOptQty = document.getElementById("txtOptionsQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNoR", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNoR", 1);
    }
    else{
        fnGenMessage("No of Lots to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartLotNoR", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objOptQty.value = pThisVal.value;
            localStorage.setItem("QtyMulR", pThisVal.value);
        }
    }
}

function fnGetSetAllStatus(){
    if(gIsTraderLogin){

        fnSetRecentDates();
        fnGetSetUserProfileData();
        fnGetOptSettings();
        fnGetIndSymSettings();
        fnSetDefaultLotNos();
        fnLoadDefaultSLTP();
        fnSetLotsByQtyMulLossAmt();
        fnGetSetOptionStrike();
        fnSetInitOptTrdDtls();
        fnSetInitialTradeDetails();
        fnLoadOptTimerSwitchSetting();
        fnLoadMartiSwitchSettings();
        fnLoadTradeSide();
        //fnSetTodayOptTradeDetails();
        //fnGetTradeBook();
        fnGetOrderBook();
        // fnSetPerDayTP();
    }
    else{
        fnClearTraderFields();
    }
}

function fnSet50PrctQty(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objBtn50Prct = document.getElementById("btn50PerClose");

    if(objCurrPos !== null || objCurrPos !== ""){
        if(objCurrPos.TradeData[0].Quantity >= 2){
            objBtn50Prct.disabled = false;
        }
        else{
            objBtn50Prct.disabled = true;
        }
        // console.log("Qty: " + objCurrPos.TradeData[0].Quantity);
    }
    // console.log(objCurrPos);
}

function fnEmitTradeForAll(pOptionType){
    let objDdlOptSym = document.getElementById("ddlOptionsSymbols");

    if(objDdlOptSym.value === "0"){
        fnGenMessage("Please Select Symbol to Trade!", `badge bg-danger`, "spnGenMsg");
    }
    else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: '',
            redirect: 'follow'
        };

        // fetch("/c3mh/"+ objDdlOptSym.value + "/" + pOptionType, objRequestOptions)
        fetch("/c3mh/1/" + pOptionType, objRequestOptions)
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

async function fnInnitiateAutoTrade(pMsg){
    try{
        let isLsAutoTrader = localStorage.getItem("isAutoTrader");

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
            let vTradeSide = localStorage.getItem("TradeSideSwtS");

            if(objCurrPos === null || objCurrPos === ""){
                if(((vTradeSide === "true") && (pMsg.OptionType === "CE")) || ((vTradeSide === "false") && (pMsg.OptionType === "PE")) || (vTradeSide === "-1")){
                    let objSymbData = await fnExecSelSymbData(pMsg.Symbol);

                    if(objSymbData.status === "success"){
                        fnExecPlaceOrderTest("B", pMsg.OptionType);
                        // console.log(objSymbData);
                        // console.log("New Trade Executed");
                        // fnGenMessage("Success - "+ pMsg.OptionType +" Trade Executed!", "badge bg-success", "spnGenMsg");
                    }
                    else{
                        fnGenMessage("Error At Auto Trade for - "+ pMsg.OptionType, "badge bg-warning", "spnGenMsg");
                    }
                }
                else{
                    //console.log("No Trade");
                    fnGenMessage(pMsg.OptionType +" Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
                }
            }
            else{
                //****** Already trade is open, so no trade. comment below code if opposite trade needs to be executed.. ********//
                fnGenMessage(pMsg.OptionType +" Trade Message Received, But another Position is Already Open!", "badge bg-warning", "spnGenMsg");

                // //****** Uncomment below and comment above code to excute opposite trades
                // if(objCurrPos.TradeData[0].OptionType === pMsg.OptionType){
                //     fnGenMessage(pMsg.OptionType +" Trade Message Received, But another "+ pMsg.OptionType +" Position is Already Open!", "badge bg-warning", "spnGenMsg");
                // }
                // else{
                //     if(((vTradeSide === "true") && (pMsg.OptionType === "CE")) || ((vTradeSide === "false") && (pMsg.OptionType === "PE")) || (vTradeSide === "-1")){
                //         // let objClsTrd = await fnInitClsOptRealTrade(0);
                //         let objClsTrd = await fnInitClsOptRealTrade1(0);

                //         if(objClsTrd.status === "success"){
                //             let objSymbData = await fnExecSelSymbData(pMsg.Symbol);

                //             if(objSymbData.status === "success"){
                //                 fnExecPlaceOrderTest("B", pMsg.OptionType);
                //             }
                //             else{
                //                 fnGenMessage("Error At Auto Trade for - "+ pMsg.OptionType +" Trade!", "badge bg-warning", "spnGenMsg");
                //             }
                //         }
                //         else{
                //             fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
                //         }

                //         console.log("Old Trade is Closed and New trade is Opened");
                //         fnGenMessage("Old Trade is Closed and new "+ pMsg.OptionType +" Position is Opened!", "badge bg-success", "spnGenMsg");
                //     }
                //     else{
                //         // let objClsTrd = await fnInitClsOptRealTrade(0);
                //         let objClsTrd = await fnInitClsOptRealTrade1(0);

                //         if(objClsTrd.status === "success"){
                //             fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
                //         }
                //         else{
                //             fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
                //         }

                //         //console.log("Old Trade is Closed and waiting for New Trade");
                //         fnGenMessage(pMsg.OptionType + " Trade Message Received, Old Trade is Closed and waiting for New Trade!", "badge bg-warning", "spnGenMsg");
                //     }
                // }
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnClearTraderFields(){
    fnGetOptSettings();
}

function fnSetDefaultLotNos(){
    let vStartLots = localStorage.getItem("StartLotNoR");
    let objTxtLots = document.getElementById("txtStartLotNos");
    // let objQty = document.getElementById("txtManualQty");
    // let objOptQty = document.getElementById("txtOptionsQty");

    if(vStartLots === null || vStartLots === "" || vStartLots === "0"){
        localStorage.setItem("StartLotNoR", 1);
        objTxtLots.value = 1;
    }
    else{
        objTxtLots.value = vStartLots;
    }
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = localStorage.getItem("StartLotNoR");
    let vQtyMul = localStorage.getItem("QtyMulR");
    let objOptQty = document.getElementById("txtOptionsQty");
    let vTotLossAmt = localStorage.getItem("TotLossAmtR");

    // console.log("Q: " + vQtyMul);
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("QtyMulR", vStartLots);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "") {
        localStorage.setItem("QtyMulR", vStartLots);
        localStorage.setItem("TotLossAmtR", 0);
        objOptQty.value = vStartLots;
    }
    else {
        objOptQty.value = vQtyMul;
    }

    // console.log("QtyMul: " + vQtyMul);
    // console.log("TotLoss: " + vTotLossAmt);
}

async function fnGetSelSymbolData(pThisVal){
    try{
        let objSymData = await fnExecSelSymbData(pThisVal);

        if(objSymData.status === "success"){
            // console.log("Selected Symbol: " + pThisVal);
            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
        else{
            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
    }
    catch(err) {
        console.log("Error at fnGetSelSymbolData");
        fnGenMessage(err.message, `badge bg-danger`, "spnGenMsg");
    }
}

function fnExecSelSymbData(pThisVal){
    const objSelSymb = new Promise((resolve, reject) => {
        let objDdlOptSym = document.getElementById("ddlOptionsSymbols");
        objDdlOptSym.value = pThisVal;

        let objFileName = document.getElementById("hidJsonFileName");
        let objSearchSymbol = document.getElementById("hidSearchSymbol");
        let objSpot = document.getElementById("hidSpotPrice");
        let objSegment = document.getElementById("hidSegment");
        let objLotSize = document.getElementById("txtOptionLotSize");
        // let objStopLoss = document.getElementById("txtOptionsSL1");
        // let objTakeProfit = document.getElementById("txtOptionsTP1");
        let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
        let objSpotOption = document.getElementById("hidSpotOption");
        let objMaxQty = document.getElementById("hidMaxQty");
        let objCurrentRate = document.getElementById("txtCurrentRate");
        let vSymName = "";

        for (let i = 0; i < gIndData.Symbol.length; i++) {
            if(gIndData.Symbol[i].Token === parseInt(objDdlOptSym.value)){
                objFileName.value = gIndData.Symbol[i].JsonFileName;
                objSearchSymbol.value = gIndData.Symbol[i].SearchSymbol;
                vSymName =  gIndData.Symbol[i].SymbolName;
                objSegment.value = gIndData.Symbol[i].Segment;
                objLotSize.value = gIndData.Symbol[i].LotSize;
                // objStopLoss.value = gIndData.Symbol[i].StopLoss;
                // objTakeProfit.value = gIndData.Symbol[i].TakeProfit;
                objStrikeInterval.value = gIndData.Symbol[i].StrikeInterval;
                objMaxQty.value = gIndData.Symbol[i].MaxLots;
            }
        }
        fnFillIndexExpData();
        if(parseInt(objDdlOptSym.value) === 0){
            vSymName = "";
            objFileName.value = ""
            objSearchSymbol.value = "";
            objSegment.value = "";
            objLotSize.value = "";
            // objStopLoss.value = "";
            // objTakeProfit.value = "";
            objSpot.value = "";
            objStrikeInterval.value = "";
            objSpotOption.value = "";
            objMaxQty.value = "";
            objCurrentRate.value = "";
        }
        else{
            objSpot.value = "";
            objCurrentRate.value = "";
            let vStreamObj = objSegment.value + "|" + vSymName;

            let objKotakSession = document.getElementById("txtKotakSession");
            let objSid = document.getElementById("txtSid");
            let vChannelNo = 2;

            if(objKotakSession.value !== ""){
                let vUrl = "wss://mlhsm.kotaksecurities.com"; <!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
                userKotakWS = new HSWebSocket(vUrl);
                //console.log(vChannelNo);

                userKotakWS.onopen = function () {
                    //fnLogTA('[Socket]: Connected to "' + vUrl + '"\n');
                    let jObj = {};
                    jObj["Authorization"] = objKotakSession.value;
                    jObj["Sid"] = objSid.value; 
                    jObj["type"] = "cn";

                    console.log("Selected Symbol Connection Opened!");
                    userKotakWS.send(JSON.stringify(jObj));
                }

                userKotakWS.onclose = function () {
                    fnGetSelSymbolData(0);
                    console.log("Selected Symbol Connection Closed!");
                    fnGenMessage("Selected Symbol Connection is Closed!", `badge bg-warning`, "spnGenMsg");
                    //fnLogTA("[Socket]: Disconnected !\n");
                }

                userKotakWS.onerror = function () {
                    objSpot.value = "";
                    objSegment.value = "";
                    //fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
                    console.log("Error in Selected Symbol Connection!");
                    reject({ "status": "danger", "message": "Error in Selected Symbol Socket Connection!", "data": "" });

                    //fnLogTA("[Socket]: Error !\n");
                }

                userKotakWS.onmessage = function (msg) {
                    const result= JSON.parse(msg);
                    
                    if((result[0].name === "if")){
                        if(result[0].iv !== undefined){
                            objSpot.value = result[0].iv;
                            fnGetSpotOption();
                            unSubSelSymb('ifu', vStreamObj, vChannelNo);
                            resolve({ "status": "success", "message": "Selected Symbol Data Received!", "data": "" });
                        }
                    }

                    if(result[0].type === "cn"){
                        fnSubscribeScript('ifs', vStreamObj, vChannelNo);
                    }
                    // console.log(result);
                }
            }
        }
    });
    return objSelSymb;
}

function fnGetSpotOption(){
    let objSpot = document.getElementById("hidSpotPrice");
    let objSpotOption = document.getElementById("hidSpotOption");
    let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
    let objDdlOptionStep = document.getElementById("ddlOptionStrike");
    let vRoundedStrike = "";
    let vRndStrkByOptStep = "";

    if(objSpot.value !== ""){
        vRoundedStrike = Math.round(parseInt(objSpot.value) / parseInt(objStrikeInterval.value)) * parseInt(objStrikeInterval.value);
        //vRndStrkByOptStep = vRoundedStrike + (parseInt(objDdlOptionStep.value) * parseInt(objStrikeInterval.value));
    }

    objSpotOption.value = vRoundedStrike;
}

function fnSubscribeScript(pReqType, pSymbolData, pChannelNo){
    //  mws ifs dps 
    let jObj = {"type":pReqType, "scrips":pSymbolData, "channelnum":pChannelNo};
    userKotakWS.send(JSON.stringify(jObj));
}

function unSubSelSymb(typeRequest, scrips, channel_number){
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    if (userKotakWS != null) {
        userKotakWS.send(JSON.stringify(jObj));
        console.log("Streaming Closed **********************")
    }
    else{
        console.log("Please Connect to Websocket.......")
    }    
}

function fnGetSetUserProfileData(){
    let objClientId = document.getElementById("txtClientIdUP");
    let objMobileNo = document.getElementById("txtClientMobileUP");
    let objRealMargin = document.getElementById("txtRealMarginUP");

    if(gIsTraderLogin){
        objClientId.value = localStorage.getItem("lsKotakUserNameAPI");
        objMobileNo.value = localStorage.getItem("lsKotakMobileNo");
        objRealMargin.value = localStorage.getItem("lsNetLimit");
    }
    else{
        objClientId.value = "";
        objMobileNo.value = "";
        objRealMargin.value = 0.00;

        localStorage.setItem("lsNetLimit", 0.00);
    }
}

function fnInitiateManualCM(pExchSeg, pBuySel){
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");
    //check if any position is Open. Only One Open trade is allowed here.
    if (objCurrPosiLst === null)
    {
        fnExecuteTrade(pExchSeg, pBuySel);
    }
    else
    {
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnExecuteTrade(pExchSeg, pBuySel){
    let objSymbol = document.getElementById("ddlNseCashSymbols");
    let objManualQty = document.getElementById("txtManualQty");
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objClientId = document.getElementById("txtMobileNo");

    if(gIsTraderLogin === false){
        fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objSymbol.value === ""){
        fnGenMessage("Please Select NSE Symbol to Trade!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objManualQty.value === "" || objManualQty.value <= 0){
        fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
    }
    else{
        let vDate = new Date();
        let vRandId = vDate.valueOf();

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value, ExchSeg: pExchSeg, SymToken: objSymbol.value, TrdSymbol: objSymbol.options[objSymbol.selectedIndex].text, BorS: pBuySel, OrderQty: objManualQty.value, RandId: vRandId }),
            redirect: 'follow'
        };

        fetch("/kotakReal/placeNormalOrder", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success"){
                let vDate = new Date();
                let vMonth = vDate.getMonth() + 1;
                let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

                //console.log(objResult.nOrdNo);
                console.log(objResult.data);

                for (let i = 0; i < objResult.data.data.length; i++){
                    if(objResult.data.data[i].nOrdNo === objResult.nOrdNo){
                        if(objResult.data.data[i].ordSt === "rejected"){
                            fnGenMessage("Order Rejected: " + objResult.data.data[i].rejRsn, `badge bg-danger`, "spnGenMsg");
                        }
                        else if(objResult.data.data[i].ordSt === "complete"){
                            gByorSl = objResult.data.data[i].trnsTp;

                            let vAvgPrice = parseFloat(objResult.data.data[i].avgPrc);
                            let vPerSL = parseFloat(document.getElementById("txtNseCashSL1").value);
                            let vPerTP = parseFloat(document.getElementById("txtNseCashTP1").value);

                            if(gByorSl === "B"){
                                gAmtSL = (vAvgPrice - ((vAvgPrice * vPerSL)/100)).toFixed(2);
                                gAmtTP = (vAvgPrice + ((vAvgPrice * vPerTP)/100)).toFixed(2);
                                // alert(gAmtSL + " - " + gAmtTP)
                            }
                            else if(gByorSl === "S"){
                                gAmtSL = (vAvgPrice + ((vAvgPrice * vPerSL)/100)).toFixed(2);
                                gAmtTP = (vAvgPrice - ((vAvgPrice * vPerTP)/100)).toFixed(2);                                
                            }
                            else{
                                gAmtSL = 0;
                                gAmtTP = 0;                                
                            }

                            let vExcTradeDtls = { TradeData: [{ TradeID: objResult.data.data[i].nOrdNo, SymToken: objResult.data.data[i].tok, ClientID: objClientId.value, TrdSymbol: objResult.data.data[i].trdSym, Expiry: '', Strike: '', ByorSl: gByorSl, OptionType: '', LotSize: objResult.data.data[i].lotSz, Quantity: objResult.data.data[i].qty, BuyPrice: objResult.data.data[i].avgPrc, SellPrice: objResult.data.data[i].avgPrc, ProfitLoss: 0, StopLoss: gAmtSL, TakeProfit: gAmtTP, TrailSL: 0, EntryDT: vToday, ExitDT: "", ExchSeg: pExchSeg }] };

                            let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
                            localStorage.setItem("KotakCurrPosiS", objExcTradeDtls);
                            localStorage.setItem("QtyMulR", objResult.data.data[i].qty);
                            console.log(objExcTradeDtls);

                            fnGenMessage("Success: Order Placed.", `badge bg-success`, "spnGenMsg");

                            fnSetInitialTradeDetails();
                            //fnLoadTimerSwitchSetting();
                        }
                        else{
                            fnGenMessage("Order Not Found: " + objResult.data.data[i].rejRsn, `badge bg-danger`, "spnGenMsg");
                        }
                    }
                }
            }
            else if(objResult.status === "danger"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnInitiateManualOptionBO(pBuySel, pOptionType){
    let objCurrPosiLst = localStorage.getItem("KotakCurrOptPosiS");

    if (objCurrPosiLst === null)
    {
        fnExecPlaceBOTest(pBuySel, pOptionType);
        // fnExecOptionTrade(pBuySel, pOptionType);
    }
    else
    {
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnInitiateManualOption(pBuySel, pOptionType){
    let objCurrPosiLst = localStorage.getItem("KotakCurrOptPosiS");

    if (objCurrPosiLst === null)
    {
        fnExecPlaceOrderTest(pBuySel, pOptionType);
        // fnExecOptionTrade(pBuySel, pOptionType);
    }
    else
    {
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnExecOptionTrade(pBuySel, pOptionType){
    let objSpotOption = document.getElementById("hidSpotOption");
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objClientId = document.getElementById("txtMobileNo");
    let objOptQty = document.getElementById("txtOptionsQty");
    let objMaxQty = document.getElementById("hidMaxQty");
    let objLossBadge = document.getElementById("spnLossTrd");

    try{
        if(gIsTraderLogin === false){
            fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
        }
        else if(objSpotOption.value === ""){
            fnGetSelSymbolData(0);
            fnGenMessage("Please Select the Symbol", `badge bg-warning`, "spnGenMsg");
        }
        else if(objOptQty.value === "" || objOptQty.value <= 0){
            fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
        }
        else{
            let objJsonFileName = document.getElementById("hidJsonFileName");
            let objSearchSymbol = document.getElementById("hidSearchSymbol");
            let objDdlOptionStep = document.getElementById("ddlOptionStrike");
            let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
            let objOptExpiry = document.getElementById("ddlOptionsExpiry");
            let objSegment = document.getElementById("hidSegment");
            let objStopLoss = document.getElementById("txtOptionsSL1");
            let objTakeProfit = document.getElementById("txtOptionsTP1");
            let objCurrRate = document.getElementById("txtCurrentRate");

            let vRndStrkByOptStep = await fnGetRoundedStrikeByOptStep(pOptionType, objSpotOption.value, objDdlOptionStep.value, objStrikeInterval.value);

            let vExpiry2Epoch = await fnGetEpochBySegmentSeldExpiry(objSegment.value, objOptExpiry.value);

            let objTokenDtls = await fnGetTokenDetails4Option(objJsonFileName.value, objSearchSymbol.value, pOptionType, vExpiry2Epoch, vRndStrkByOptStep);

            if(objTokenDtls.status === "success"){

                let obj1TimeCurrRate = await fnGet1TimeCurrOptRate(objTokenDtls.data.ExchSeg, objTokenDtls.data.Token, objCurrRate);

                if(obj1TimeCurrRate.status === "success"){

                    let objNrmlOrdr = await fnPlaceOptNrmlOrdr(objHsServerId.value, objSid.value, objAccessToken.value, objKotakSession.value, objOptQty.value, objTokenDtls.data.LotSize, objTokenDtls.data.Token, objTokenDtls.data.ExchSeg, pBuySel, objTokenDtls.data.TrdSymbol, pOptionType, objSearchSymbol.value, vRndStrkByOptStep, obj1TimeCurrRate.data, objMaxQty.value);
                    if(objNrmlOrdr.status === "success"){

                        gByorSl = objNrmlOrdr.data.ByorSl;
                        let vDate = new Date();
                        let vMonth = vDate.getMonth() + 1;
                        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

                        let vAvgPrice = parseFloat(objNrmlOrdr.data.BuyPrice);
                        let vPerSL = parseFloat(objStopLoss.value);
                        let vPerTP = parseFloat(objTakeProfit.value);

                        if(gByorSl === "B"){
                            // Change for Percentage or Point
                            // gAmtSL = (vAvgPrice - ((vAvgPrice * vPerSL)/100)).toFixed(2);
                            // gAmtTP = (vAvgPrice + ((vAvgPrice * vPerTP)/100)).toFixed(2);
                            gAmtSL = (vAvgPrice - vPerSL).toFixed(2);
                            gAmtTP = (vAvgPrice + vPerTP).toFixed(2);
                        }
                        else if(gByorSl === "S"){
                            // Change for Percentage or Point
                            // gAmtSL = (vAvgPrice + ((vAvgPrice * vPerSL)/100)).toFixed(2);
                            // gAmtTP = (vAvgPrice - ((vAvgPrice * vPerTP)/100)).toFixed(2);                                
                            gAmtSL = (vAvgPrice + vPerSL).toFixed(2);
                            gAmtTP = (vAvgPrice - vPerTP).toFixed(2);                                
                        }
                        else{
                            gAmtSL = 0;
                            gAmtTP = 0;                                
                        }

                        objNrmlOrdr.data.TradeID = vDate.getTime();
                        objNrmlOrdr.data.ClientID = objClientId.value;                    
                        objNrmlOrdr.data.Expiry = objOptExpiry.value;
                        objNrmlOrdr.data.EntryDT = vToday;
                        objNrmlOrdr.data.StopLoss = gAmtSL;
                        objNrmlOrdr.data.TakeProfit = gAmtTP;
                        objNrmlOrdr.data.PointSL = vPerSL;
                        objNrmlOrdr.data.PointTP = vPerTP;


                        let vExcTradeDtls = { TradeData: [objNrmlOrdr.data] };

                        let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
                        // alert(objExcTradeDtls);
                        localStorage.setItem("KotakCurrOptPosiS", objExcTradeDtls);
                        localStorage.setItem("QtyMulR", objNrmlOrdr.data.Quantity);
                        objLossBadge.style.visibility = "hidden";

                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                        fnSetInitOptTrdDtls();
                        fnGetSelSymbolData(0);
                    }
                    else{
                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                    }
                }
                else{
                    fnGenMessage(obj1TimeCurrRate.message, `badge bg-${obj1TimeCurrRate.status}`, "spnGenMsg");
                }
            }
            else{
                fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
            }
        }
    }
    catch (err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnGetTokenDetails4Option(pFileName, pSearchSymbol, pOptionType, pExpiry2Epoch, pRndStrkByOptStep){
    const objOptToken = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ JsonFileName: pFileName, SearchSymbol: pSearchSymbol, OptionType: pOptionType, ExpiryEpoch: pExpiry2Epoch, StrikePrice: pRndStrkByOptStep }),
            redirect: 'follow'
            };

        fetch("/kotakReal/getToken4OptRate", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success"){

                //fnGetCurrRate(objResult);
                // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                //fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "warning"){
                // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                // fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            // fnGenMessage("Error in feaching Option Symbol.", `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error At Token Details", "data": "" });
        });
    });

    return objOptToken;
}

function fnPlaceOptNrmlOrdr(pHsServerId, pSid, pAccessToken, pKotakSession, pOptionQty, pLotSize, pToken, pExchSeg, pBuySel, pTrdSymbol, pOptionType, pSearchSymbol, pStrikePrice, pCurrRate, pMaxQty){
    const objOptOrdr = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ HsServerId: pHsServerId, Sid: pSid, AccessToken: pAccessToken, KotakSession: pKotakSession, OptQty: pOptionQty, LotSize: pLotSize, Token: pToken, ExchSeg: pExchSeg, BorS: pBuySel, TrdSymbol: pTrdSymbol, OptionType: pOptionType, SearchSymbol: pSearchSymbol, StrikePrice: pStrikePrice, CurrRate: pCurrRate, MaxOptQty: pMaxQty }),
            redirect: 'follow'
        };

        fetch("/kotakReal/placeOptNrmlOrder", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                console.log('error: ', error);
                fnGenMessage("Error in Placing Option Order.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Placing Option Order!", "data": "" });
            });
    });
    return objOptOrdr;
}

function fnGetOrderBook(){
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let vNetProfit = 0;

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value }),
        redirect: 'follow'
    };

    fetch("/kotakReal/getOrderBook", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {

        // console.log(objResult);
    
        if(objResult.status === "success"){
            let objClsdOrdbook = document.getElementById("divClsdOrderbook");

            if(objResult.data === null || objResult.data === ""){
                objClsdOrdbook.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Completed Orders Yet</div>';
            }
            else{
                let vTempHtml = "";
                let vBuyAmt = 0;
                let vSellAmt = 0;
                let vCharges = 0;
                let vTotalCharges = 0;
                let vTotalTrades = 0;
                let vHighCapital = 0;
                // const objRev = Object.keys(objResult.data.data).reverse();
                const objRev = Object.keys(objResult.data.data);

                objRev.forEach(i => {
                    let vFldQty = parseInt(objResult.data.data[i].fldQty);
                    let vAvgPrice = parseFloat(objResult.data.data[i].avgPrc);

                    if(objResult.data.data[i].ordSt === "complete"){
                        vTempHtml += '<tr>';
                        vTempHtml += '<td style="text-wrap: nowrap;">' + objResult.data.data[i].exCfmTm + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].sym + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].expDt + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].stkPrc + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].optTp + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + objResult.data.data[i].trnsTp + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vFldQty + '</td>';
                        if(objResult.data.data[i].trnsTp === "B"){
                            vCharges = fnGetRealBuyCharges(vFldQty, vAvgPrice);
                            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + vAvgPrice + '</td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                            let vCapital = vFldQty * vAvgPrice;
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCharges +'</td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCapital.toFixed(2); +'</td>';

                            vBuyAmt += parseFloat(vCapital);

                            if(parseFloat(vCapital) > vHighCapital){
                                vHighCapital = vCapital;
                            }
                            vTotalTrades += 1;
                        }
                        else if(objResult.data.data[i].trnsTp === "S"){
                            vCharges = fnGetRealSellCharges(vFldQty, vAvgPrice);
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + vAvgPrice + '</td>';
                            let vCapital = vFldQty * vAvgPrice;
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCharges +'</td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">'+ vCapital.toFixed(2); +'</td>';

                            vSellAmt += parseFloat(vCapital);
                        }
                        else{
                            vCharges = 0;
                            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                        }

                        vTotalCharges += parseFloat(vCharges);
                        vTempHtml += '</tr>';
                    }
                });

                vNetProfit = vSellAmt - vBuyAmt - vTotalCharges;
                vTempHtml += '<tr><td>Total Trades </td><td>' + vTotalTrades + '</td><td colspan="3" style="text-align:right;font-weight:bold;color:orange;">Net PL</td><td colspan="3" style="text-align:left;font-weight:bold;color:orange;">' + vNetProfit.toFixed(2) + '</td><td></td><td style="font-weight:bold;text-align:right;color:red;">' + vTotalCharges.toFixed(2) + '</td><td style="font-weight:bold;text-align:right;color:red;">' + vHighCapital.toFixed(2) + '</td></tr>';

                objClsdOrdbook.innerHTML = vTempHtml;
            }

        if(vNetProfit >= 15000){
            localStorage.setItem("isAutoTrader", "true");
            $('#btnAutoTraderStatus').trigger('click');
        }

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");            
        }
        else if(objResult.status === "danger"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error to Fetch Order Details.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error at Order Book", `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetTradeBook(){
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value }),
        redirect: 'follow'
    };

    fetch("/kotakReal/getTradeBook", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success"){
            let objTodayTradeList = document.getElementById("divTodayTrades");

            let objArray = objResult.data.data.sort(fnSortByUpdTimeTB);

            console.log(objArray);

            if(objResult.data === null || objResult.data === ""){

                objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
            }
            else{
                let objLookup = [];
                let vTempHtml = "";
                let vNetProfit = 0;
                let vBuyAmt = 0;
                let vSellAmt = 0;
                let vCharges = 0;
                let vTotalCharges = 0;
                let vTotalTrades = 0;
                let vHighCapital = 0;
                let objUnclosedTradeCat = [];

                // const objRev = Object.keys(objResult.data.data).reverse();
                // const objRev = Object.keys(objResult.data.data);

                for(let i=0; i<objResult.data.data.length; i++){
                    if(objLookup.indexOf(objResult.data.data[i].algCat) === -1)
                        objLookup.push(objResult.data.data[i].algCat);
                }

                console.log(objLookup);
                for(let i=0; i<objLookup.length; i++){
                    let vOpenTradeQty = 0;

                    for(let j=0; j<objArray.length; j++){
                        if((objArray[j].algCat === objLookup[i]) && (objArray[j].strategyCode === "1")){

                            if(objArray[j].trnsTp === "B"){
                                vOpenTradeQty += parseInt(objArray[j].fldQty);
                            }
                            else if(objArray[j].trnsTp === "S"){
                                vOpenTradeQty -= parseInt(objArray[j].fldQty);
                            }
                            // console.log(objArray[j].trdSym + " - " + objArray[j].trnsTp);
                        }
                    }
                    if(vOpenTradeQty !== 0){
                        objUnclosedTradeCat.push(objLookup[i])
                    }
                }

                console.log(objUnclosedTradeCat);

                if(objUnclosedTradeCat.length !== 0){
                    let vBuyAvgPrc = 0;
                    let vSellAvgPrc = 0;
                    let vTotalBuyQty = 0;
                    let vTotalSellQty = 0;

                    for(let i=0; i<objUnclosedTradeCat.length; i++){
                        let vTrdSym, vSymbol, vExpiry, vStrike, vType, vNewTransType = "";
                        let vNewQty = 0;
                        vBuyAvgPrc = 0;
                        vSellAvgPrc = 0;
                        vTotalBuyQty = 0;
                        vTotalSellQty = 0;

                        for(let j=0; j<objArray.length; j++){
                            if(objArray[j].algCat === objUnclosedTradeCat[i]){
                                vTrdSym = objArray[j].trdSym;
                                vSymbol = objArray[j].sym;
                                vExpiry = objArray[j].expDt;
                                vStrike = objArray[j].stkPrc;
                                vType = objArray[j].optTp;

                                if(objArray[j].trnsTp === "B"){
                                    vTotalBuyQty += objArray[j].fldQty;
                                    vBuyAvgPrc += parseFloat(objArray[j].avgPrc) * objArray[j].fldQty;
                                    console.log(objArray[j]);
                                }
                                else if(objArray[j].trnsTp === "S"){
                                    vTotalSellQty += objArray[j].fldQty;
                                    vSellAvgPrc += parseFloat(objArray[j].avgPrc) * objArray[j].fldQty;
                                    console.log(objArray[j]);
                                }
                            }
                        }
                        if(vTotalBuyQty < vTotalSellQty){
                            vNewTransType = "B";
                            vNewQty = vTotalSellQty - vTotalBuyQty;
                        }
                        else{
                            vNewTransType = "S";
                            vNewQty = vTotalBuyQty - vTotalSellQty;
                        }
                        console.log("trdSym: " + vTrdSym);
                        console.log("sym: " + vSymbol);
                        console.log("expDt: " + vExpiry);
                        console.log("stkPrc: " + vStrike);
                        console.log("optTp: " + vType);
                        console.log("B or S: " + vNewTransType);
                        console.log("Qty: " + vNewQty);
                        console.log("ABP: " + vBuyAvgPrc / vTotalBuyQty);
                        console.log("ASP: " + vSellAvgPrc / vTotalSellQty);
                        console.log("TBQ: " + vTotalBuyQty);
                        console.log("TSQ: " + vTotalSellQty);
                    }
                }
                else{
                    console.log("No Open Trades!");
                }

                // objRev.forEach(i => {
                //     let vFldQty = parseInt(objResult.data.data[i].fldQty);
                //     let vAvgPrice = parseFloat(objResult.data.data[i].avgPrc);
                //     vTempHtml += '<tr>';

                //     vTempHtml += '<td style="text-wrap: nowrap;">' + objResult.data.data[i].exTm + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].sym + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].expDt + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].stkPrc + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:center; font-weight:bold;">' + objResult.data.data[i].optTp + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + objResult.data.data[i].trnsTp + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vFldQty + '</td>';
                //     if(objResult.data.data[i].trnsTp === "B"){
                //         vCharges = fnGetRealBuyCharges(vFldQty, vAvgPrice);
                //         vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + vAvgPrice + '</td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                //         let vCapital = vFldQty * vAvgPrice;
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCharges +'</td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCapital.toFixed(2); +'</td>';

                //         vBuyAmt += parseFloat(vCapital);

                //         if(parseFloat(vCapital) > vHighCapital){
                //             vHighCapital = vCapital;
                //         }
                //         vTotalTrades += 1;
                //     }
                //     else if(objResult.data.data[i].trnsTp === "S"){
                //         vCharges = fnGetRealSellCharges(vFldQty, vAvgPrice);
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + vAvgPrice + '</td>';
                //         let vCapital = vFldQty * vAvgPrice;
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCharges +'</td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">'+ vCapital.toFixed(2); +'</td>';

                //         vSellAmt += parseFloat(vCapital);
                //     }
                //     else{
                //         vCharges = 0;
                //         vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //         vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //     }

                //     vTotalCharges += parseFloat(vCharges);
                //     vTempHtml += '</tr>';
                // });

                // vNetProfit = vSellAmt - vBuyAmt - vTotalCharges;
                // vTempHtml += '<tr><td>Total Trades </td><td>' + vTotalTrades + '</td><td colspan="3" style="text-align:right;font-weight:bold;color:orange;">Net PL</td><td colspan="3" style="text-align:left;font-weight:bold;color:orange;">' + vNetProfit.toFixed(2) + '</td><td></td><td style="font-weight:bold;text-align:right;color:red;">' + vTotalCharges + '</td><td style="font-weight:bold;text-align:right;color:red;">' + vHighCapital.toFixed(2) + '</td></tr>';

                // objTodayTradeList.innerHTML = vTempHtml;
            }

            // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
    });    
}

function fnSortByUpdTimeTB(a, b) {
    return (a.updRecvTm) - (b.updRecvTm);
}

function fnGetRealBuyCharges(pQty, pAvgPrice){
    let vBrokerage = 10;
    let vSTT = 0;
    let vSebiTO = ((pQty * pAvgPrice) * 0.0001) / 100;
    let vTransChgs = ((pQty * pAvgPrice) * 0.03503) / 100;
    let vGST = ((vBrokerage + vSebiTO + vTransChgs) * 18) / 100;
    let vStmpDuty = ((pQty * pAvgPrice) * 0.003) / 100;

    return (vBrokerage + vSTT + vSebiTO + vTransChgs + vGST + vStmpDuty).toFixed(2); 
}

function fnGetRealSellCharges(pQty, pAvgPrice){
    let vBrokerage = 10;
    let vSTT = ((pQty * pAvgPrice) * 0.1) / 100;
    let vSebiTO = ((pQty * pAvgPrice) * 0.0001) / 100;
    let vTransChgs = ((pQty * pAvgPrice) * 0.03503) / 100;
    let vGST = ((vBrokerage + vSebiTO + vTransChgs) * 18) / 100;
    let vStmpDuty = 0;

    return (vBrokerage + vSTT + vSebiTO + vTransChgs + vGST + vStmpDuty).toFixed(2); 
}

function fnClearLocalStorageTemp(){
    localStorage.removeItem("KotakCurrPosiS");
    localStorage.removeItem("KotakCurrOptPosiS");
    localStorage.removeItem("OptTradesListS");
    localStorage.removeItem("StartLotNoR");
    localStorage.removeItem("QtyMulR");
    localStorage.removeItem("TotLossAmtR");
    localStorage.removeItem("msgsCI");
    localStorage.removeItem("MultOrdId");
    clearInterval(vTradeInst);

    console.log("Curr Posi: " + localStorage.getItem("KotakCurrPosiS"));
    //fnSetTodayOptTradeDetails();
    // fnSetTodayTradeDetails();
    // fnSetUserProfileDets();
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

function fnLoadMartiSwitchSettings(){
    let vMartiSwitchS = localStorage.getItem("MartiSwtS");
    let objMartiSwitch = document.getElementById("swtMartingale");

    if (vMartiSwitchS === "true") {
        objMartiSwitch.checked = true;
    }
    else {
        objMartiSwitch.checked = false;
    }
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

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    localStorage.setItem("TradeSideSwtS", objTradeSideVal.value);
}

function fnChangeMarti(){
    let objMartiSwitch = document.getElementById("swtMartingale");

    localStorage.setItem("MartiSwtS", objMartiSwitch.checked);
    //alert(objMartiSwitch.checked);    
}

function fnExecTradeTimer(){
    var objCurrPosiLst = localStorage.getItem("KotakCurrOptPosiS");

    if(objCurrPosiLst !== null){
        fnCheckOptTradeTimer();
    }
    else{
        fnCheckTradeTimer();
    }
}

function fnCheckTradeTimer(){
    var objTimeMS = document.getElementById("txtTimeMS");
    var objTimerSwitch = document.getElementById("swtAutoChkPosition");
    var objCurrPosiLst = localStorage.getItem("KotakCurrPosiS");
    
    if (isNaN(parseInt(objTimeMS.value)) || (parseInt(objTimeMS.value) < 5)) {
        objTimeMS.value = 5;
    }

    let vTimer = 1000 * parseInt(objTimeMS.value);

    if (objTimerSwitch.checked)
    {
        localStorage.setItem("TimerSwtS", "true");

        if (objCurrPosiLst !== null) {
            clearInterval(vTradeInst);

            switch(gByorSl){
                case "B":
                    vTradeInst = setInterval(fnCheckBuyingPosition, vTimer);
                    break;
                case "S":
                    vTradeInst = setInterval(fnCheckSellingPosition, vTimer);
                    break;
                default:
                    fnGenMessage("Invalid Transaction Type, Please Check!", `badge bg-danger`, "spnGenMsg");

            }

            //vTradeInst = setInterval(fnSetUpdatedTradeDetails, vTimer);

            //fnSetUpdatedTradeDetails();
            fnGenMessage("Auto Check for Current Price is On!", `badge bg-success`, "spnGenMsg");
        }
        else
        {
            clearInterval(vTradeInst);
            fnGenMessage("No Open Trade, Will start when the trade is Open", `badge bg-warning`, "spnGenMsg");
        }
    }
    else {
        localStorage.setItem("TimerSwtS", "false");
        clearInterval(vTradeInst);

        fnGenMessage("Auto Check for Current Price is Off!", `badge bg-danger`, "spnGenMsg");
    }
}

function fnSetInitialTradeDetails(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrPosiS"));
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objEntryDate = document.getElementById("lblEntryDate");
    let objSymbolName = document.getElementById("lblSymbol");
    let objStrikePrice = document.getElementById("lblStrike");
    let objOptionType = document.getElementById("lblOptionType");
    let objExpiry = document.getElementById("lblExpiry");
    let objLotSize = document.getElementById("lblLotSize");
    let objQty = document.getElementById("lblQty");
    let objCapital = document.getElementById("lblCapital");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let objLblBP = document.getElementById("lblBuyPriceInd");
    let objLblSP = document.getElementById("lblSellPriceInd");
    gTSLCrossed = false;
    gCurrTSL = 0;

    if(objCurrPos !== null){
        objEntryDate.innerText = objCurrPos.TradeData[0].EntryDT;
        objSymbolName.innerText = objCurrPos.TradeData[0].TrdSymbol;
        objStrikePrice.innerText = objCurrPos.TradeData[0].Strike;
        objOptionType.innerText = objCurrPos.TradeData[0].OptionType;
        objExpiry.innerText = objCurrPos.TradeData[0].Expiry;
        objLotSize.innerText = objCurrPos.TradeData[0].LotSize;
        objQty.innerText = objCurrPos.TradeData[0].Quantity;

        gBuyPrice = objCurrPos.TradeData[0].BuyPrice;
        gSellPrice = objCurrPos.TradeData[0].SellPrice;
        gLotSize = objCurrPos.TradeData[0].LotSize;
        gQty = objCurrPos.TradeData[0].Quantity;
        gAmtSL = objCurrPos.TradeData[0].StopLoss;
        gAmtTP = objCurrPos.TradeData[0].TakeProfit;
        gByorSl = objCurrPos.TradeData[0].ByorSl;

        if(gByorSl === "B"){
            objLblBP.innerText = "BUY PRICE";
            objLblSP.innerText = "CURR PRICE";
            objBuyPrice.innerText = gBuyPrice;
            objSellPrice.innerText = gBuyPrice;

            gDiffSL = (gAmtSL - gBuyPrice).toFixed(2);
            gDiffTP = (gAmtTP - gBuyPrice).toFixed(2);
            objCapital.innerText = parseInt(gLotSize) * parseInt(gQty) * parseFloat(gBuyPrice);
            //fnCheckBuyingPosition(objLTP.value);
        }
        else if(gByorSl === "S"){
            objLblBP.innerText = "CURR PRICE";
            objLblSP.innerText = "SELL PRICE";
            objBuyPrice.innerText = gSellPrice;
            objSellPrice.innerText = gSellPrice;

            gDiffSL = (gSellPrice - gAmtSL).toFixed(2);
            gDiffTP = (gSellPrice - gAmtTP).toFixed(2);
            objCapital.innerText = parseInt(gLotSize) * parseInt(gQty) * parseFloat(gSellPrice);
            //fnCheckSellingPosition(objLTP.value);
        }
        else{
            objCapital.innerText = "";
        }
        objProfitLoss.innerText = ((parseFloat(gSellPrice) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);

        fnStartStreamCP();
        fnLoadTimerSwitchSetting();

        fnGenMessage("Position Is Open", `badge bg-warning`, "btnPositionStatus");
    }
}

function fnCheckBuyingPosition(){
    let objSelSLTP = document.getElementById("ddlTrailSLTP");

    let objTrailSL = document.getElementById("lblTrailSL");
    let objOnSL = document.getElementById("lblLossOnSL");
    let objOnTP = document.getElementById("lblProfitOnTP");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let vLTP = document.getElementById("hidLTP");

    objSellPrice.innerText = vLTP.value;
    let vPLVal = ((parseFloat(vLTP.value) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    objProfitLoss.innerText = vPLVal;

    // console.log("Buy: " + objSelSLTP.value);

    switch(parseInt(objSelSLTP.value)){
    case 0:
      objTrailSL.innerText = "No T-SL";
      objOnSL.innerText = "No SL";
      objOnTP.innerText = "No TP";
      break;
    case 1:
      objTrailSL.innerText = "No T-SL";
      objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
      objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

      if((parseFloat(vLTP.value) <= gAmtSL) || (parseFloat(vLTP.value) >= gAmtTP)){

        fnCloseTrade();
      }
      else{
        fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
      }

      break;
    case 2:
        if(!gTSLCrossed){
            gCurrTSL = (parseFloat(gBuyPrice) - parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gAmtSL;
        }

        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        console.log("DiffSL::: " + gDiffSL);
        console.log("AmtTP::: " + gAmtTP);
        console.log("AmtSL::: " + gAmtSL);
        console.log("CurrTSL::: " + gCurrTSL);

        if(parseFloat(vLTP.value) >= parseFloat(gCurrTSL)){
            gCurrTSL = (parseFloat(vLTP.value) + parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(vLTP.value) - parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;
        }

        if(parseFloat(vLTP.value) <= parseFloat(gAmtSL)){
            console.log("SL Hit, Trade Closed!");

            fnCloseTrade();
        }
        else if(((parseFloat(vLTP.value) <= gCurrTSL) || (parseFloat(vLTP.value) >= gAmtTP)) && gTSLCrossed){
            console.log("T-SL or TP is hit, Trade Closed");
            fnCloseTrade();
        }

        break;
    case 3:
        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        if(parseFloat(vLTP.value) >= parseFloat(gAmtTP)){
            gCurrTSL = (parseFloat(gAmtTP) + parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(gAmtTP) - parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;
            // console.log("Inside IF");
        }

        if(!gTSLCrossed){
            objTrailSL.innerText = gAmtSL;
        }
        if(parseFloat(vLTP.value) <= parseFloat(gAmtSL)){
        console.log("SL Hit, Trade Closed!");

        fnCloseTrade();
        }
        else if((parseFloat(vLTP.value) <= gCurrTSL) && gTSLCrossed){
            console.log("T-SL Hit, Trade Closed");
            fnCloseTrade();
        }
        console.log("Trail Afr TP: " + gCurrTSL);
        break;
        // default:
        //   code to be executed if n is different from case 1 and 2
    }
    // const b = performance.now();
    // console.log('It took ' + (b - a) + ' ms.');
}

function fnCheckSellingPosition(){
    let objSelSLTP = document.getElementById("ddlTrailSLTP");

    let objTrailSL = document.getElementById("lblTrailSL");
    let objOnSL = document.getElementById("lblLossOnSL");
    let objOnTP = document.getElementById("lblProfitOnTP");
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let vLTP = document.getElementById("hidLTP");

    objBuyPrice.innerText = vLTP.value;
    let vPLVal = ((parseFloat(gSellPrice) - parseFloat(vLTP.value)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    objProfitLoss.innerText = vPLVal;

    // console.log("Sell: " + objSelSLTP.value);

    switch(parseInt(objSelSLTP.value)){
    case 0:
      objTrailSL.innerText = "No T-SL";
      objOnSL.innerText = "No SL";
      objOnTP.innerText = "No TP";
      break;
    case 1:
      objTrailSL.innerText = "No T-SL";
      objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
      objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

      if((parseFloat(vLTP.value) >= gAmtSL) || (parseFloat(vLTP.value) <= gAmtTP)){

        fnCloseTrade();
      }
      else{
        fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
      }
      break;
    case 2:
        if(!gTSLCrossed){
            gCurrTSL = (parseFloat(gSellPrice) + parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gAmtSL;
        }

        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        console.log("DiffSL::: " + gDiffSL);
        console.log("AmtTP::: " + gAmtTP);
        console.log("AmtSL::: " + gAmtSL);
        console.log("CurrTSL::: " + gCurrTSL);

        if(parseFloat(vLTP.value) >= parseFloat(gCurrTSL)){
            gCurrTSL = (parseFloat(vLTP.value) - parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(vLTP.value) + parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;
        }

        if(parseFloat(vLTP.value) >= parseFloat(gAmtSL)){
            console.log("SL Hit, Trade Closed!");

            fnCloseTrade();
        }
        else if(((parseFloat(vLTP.value) >= gCurrTSL) || (parseFloat(vLTP.value) <= gAmtTP)) && gTSLCrossed){
            console.log("T-SL or TP is hit, Trade Closed");
            fnCloseTrade();
        }

        break;

      break;
    case 3:
        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        if(parseFloat(vLTP.value) <= parseFloat(gAmtTP)){
            gCurrTSL = (parseFloat(gAmtTP) - parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(gAmtTP) + parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;

            console.log("Inside IF");
        }

        if(!gTSLCrossed){
            objTrailSL.innerText = gAmtSL;
        }
        if(parseFloat(vLTP.value) >= parseFloat(gAmtSL)){
        console.log("SL Hit, Trade Closed!");

        fnCloseTrade();
        }
        else if((parseFloat(vLTP.value) >= gCurrTSL) && gTSLCrossed){
            console.log("T-SL Hit, Trade Closed");
            fnCloseTrade();
        }
        console.log("Trail Afr TP: " + gCurrTSL);
      break;
    // default:
    //   code to be executed if n is different from case 1 and 2
    }
}

function fnStartStreamCP(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrPosiS"));
    let vStreamObj = objCurrPos.TradeData[0].ExchSeg + "|" + objCurrPos.TradeData[0].SymToken;
    let objLTP = document.getElementById("hidLTP");

    //console.log(objCurrPos.TradeData[0].ExchSeg + "|" + objCurrPos.TradeData[0].SymToken);
    let objKotakSession = document.getElementById("txtKotakSession");
    let objSid = document.getElementById("txtSid");
    let vChannelNo = 1;

    if(objKotakSession.value !== ""){
    let vUrl = "wss://mlhsm.kotaksecurities.com"; <!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
        userKotakWS = new HSWebSocket(vUrl);
        //console.log(vChannelNo);

        userKotakWS.onopen = function () {
            fnGenMessage("Connection is Open!", `badge bg-success`, "spnGenMsg");
            //fnLogTA('[Socket]: Connected to "' + vUrl + '"\n');
            let jObj = {};
            jObj["Authorization"] = objKotakSession.value;
            jObj["Sid"] = objSid.value; 
            jObj["type"] = "cn";
            userKotakWS.send(JSON.stringify(jObj));
        }

        userKotakWS.onclose = function () {
            //objLTP.value = "";
            fnGenMessage("StreamCP Connection is Closed!", `badge bg-warning`, "spnGenMsg");
            //fnLogTA("[Socket]: Disconnected !\n");
        }

        userKotakWS.onerror = function () {
            objLTP.value = "";
            fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
            //fnLogTA("[Socket]: Error !\n");
        }

        userKotakWS.onmessage = function (msg) {
            const result= JSON.parse(msg);
            
            if((result[0].name === "sf")){
                if(result[0].ltp !== undefined)
                    objLTP.value = result[0].ltp;
            }

            if(result[0].type === "cn"){
                fnSubscribeScript('mws', vStreamObj, vChannelNo);
            }
            // else if(result[0].type === "sub"){
            //     fnGenMessage("Connection Success!", `badge bg-success`, "spnGenMsg");
            // }
            // else if(result[0].type === "cp"){
            //     fnGenMessage("Connection Paused!", `badge bg-success`, "spnGenMsg");
            // }
            // else if(result[0].type === "cr"){
            //     fnGenMessage("Streaming Resumed!", `badge bg-success`, "spnGenMsg");
            // }
            // else{
            //     fnGenMessage("Streaming....!", `badge bg-success`, "spnGenMsg");
            // }
            //fnLogTA('[Res]: ' + msg + "\n");
        }
    }
}

resumeandpause = function(typeRequest, channel_number){
    let jObj = {};
    jObj["type"] = typeRequest;
    jObj["channelnums"] = channel_number.split(',').map(function (val) { return parseInt(val, 10); })
    if(userKotakWS != null) {
        let req = JSON.stringify(jObj);
       userKotakWS.send(req);
    }
}

function fnCloseTrade(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrPosiS"));

    if (objCurrPos === null)
    {
        fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
    }
    else
    {
        fnInitiateCloseTrade();
    }
}

function fnInitiateCloseTrade(){
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrPosiS"));
    let objLTP = document.getElementById("hidLTP");

    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    let vBuySell = "";

    if(objCurrPos.TradeData[0].ByorSl === "B"){
        vBuySell = "S"
    }
    else{
        vBuySell = "B"
    }

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value, TradeID: objCurrPos.TradeData[0].TradeID, SymToken: objCurrPos.TradeData[0].SymToken, ClientID: objCurrPos.TradeData[0].ClientID, TrdSymbol: objCurrPos.TradeData[0].TrdSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, BorS: vBuySell, OptionType: objCurrPos.TradeData[0].OptionType, LotSize: objCurrPos.TradeData[0].LotSize, Quantity: objCurrPos.TradeData[0].Quantity, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ExchSeg: objCurrPos.TradeData[0].ExchSeg, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday }),
        redirect: 'follow'
    };

    fetch("/kotakReal/placeCloseTrade", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success"){
            console.log(objResult.data);

            // for (let i = 0; i < objResult.data.data.length; i++){
            //     if(objResult.data.data[i].nOrdNo === objResult.nOrdNo){
            //         if(objResult.data.data[i].ordSt === "rejected"){
            //             fnGenMessage("Close Order Rejected: " + objResult.data.data[i].rejRsn, `badge bg-danger`, "spnGenMsg");
            //         }
            //         else if(objResult.data.data[i].ordSt === "complete"){
                        
            //             clearInterval(vTradeInst);
            //             localStorage.removeItem("KotakCurrPosiS");
            //             fnResetOpenPositionDetails();
            //             fnSetNextTradeSettings(objResult.data.data[i].avgPrc);
            //             resumeandpause('cp', '1');
            //             fnGenMessage("Success: Position Closed.", `badge bg-success`, "spnGenMsg");
            //         }
            //         else{
            //             fnGenMessage("Order Not Found: " + objResult.data.data[i].rejRsn, `badge bg-danger`, "spnGenMsg");
            //         }
            //     }
            // }

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");            
        }
        else if(objResult.status === "danger"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnResetOpenPositionDetails(){
    let objSymbol = document.getElementById("lblSymbol");
    let objExpiry = document.getElementById("lblExpiry");
    let objStrike = document.getElementById("lblStrike");
    let objOptionType = document.getElementById("lblOptionType");
    let objLotSize = document.getElementById("lblLotSize");
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
    objLotSize.innerText = "0";
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

function fnSetNextTradeSettings(pAvgPrice){
    let objQty = document.getElementById("txtManualQty");
    let vOldLossAmt = localStorage.getItem("TotLossAmtR");
    let vOldQtyMul = localStorage.getItem("QtyMulR");

    if(vOldLossAmt === null)
        vOldLossAmt = 0;
    if(vOldQtyMul === null)
        vOldQtyMul = 0;

    let vAmtPL = 0;
    console.log("Avg Prc: " + pAvgPrice);
    console.log("Buy Prc: " + gBuyPrice);
    console.log("Sell Prc: " + gSellPrice);
    console.log("Qty: " + gQty);
    console.log("Lot Size: " + gLotSize);
    console.log("Trans Type: " + gByorSl);

    //Do Opposite
    if(gByorSl === "B"){
        // alert("Now SellIng");
        vAmtPL = ((parseFloat(pAvgPrice) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    }
    else if(gByorSl === "S"){
        // alert("Now Buying");
        vAmtPL = ((parseFloat(gSellPrice) - parseFloat(pAvgPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    }
    else{
        vAmtPL = 0;
    }
    console.log("A-PL: " + vAmtPL);
    console.log("Old Loss Amt: " + vOldLossAmt);

    let vNewLossAmt = parseFloat(vOldLossAmt) + parseFloat(vAmtPL);

    console.log("New Loss Amt: " + vNewLossAmt);

    if(parseFloat(vAmtPL) < 0) {
        localStorage.setItem("TotLossAmtR", vNewLossAmt);
        let vNextQty = parseInt(vOldQtyMul) * 2;
        localStorage.setItem("QtyMulR", vNextQty);
        objQty.value = vNextQty;

        // fnSetTradeStep();
    }
    else if(parseFloat(vNewLossAmt) < 0) {
        localStorage.setItem("TotLossAmtR", vNewLossAmt);
        let vDivAmt = parseFloat(vNewLossAmt) / parseFloat(vOldLossAmt);
        let vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));
        
        if(vNextQty < 1)
            vNextQty = 1;

        localStorage.setItem("QtyMulR", vNextQty);
        objQty.value = vNextQty;

        // fnSetTradeStep();
    }
    else {
        localStorage.removeItem("TotLossAmtR");
        localStorage.removeItem("QtyMulR");
        // localStorage.setItem("TradeStep", 0);
        fnSetLotsByQtyMulLossAmt();
    }

    console.log("New Qty: " + localStorage.getItem("QtyMulR"));
}

async function fnGetCurrRateSettings(pOptionType){
    let objSpotOption = document.getElementById("hidSpotOption");

    try{
        if(objSpotOption.value === ""){
            fnGenMessage("Select the Symbol to Get Current Rate", `badge bg-warning`, "spnGenMsg");
        }
        else{
            let objJsonFileName = document.getElementById("hidJsonFileName");
            let objSearchSymbol = document.getElementById("hidSearchSymbol");
            let objDdlOptionStep = document.getElementById("ddlOptionStrike");
            let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
            let objOptExpiry = document.getElementById("ddlOptionsExpiry");
            let objSegment = document.getElementById("hidSegment");
            let objCurrRate = document.getElementById("txtCurrentRate");
            
            let vRndStrkByOptStep = await fnGetRoundedStrikeByOptStep(pOptionType, objSpotOption.value, objDdlOptionStep.value, objStrikeInterval.value);
            
            let vExpiry2Epoch = await fnGetEpochBySegmentSeldExpiry(objSegment.value, objOptExpiry.value);

            let objTokenDtls = await fnGetTokenDetails4Option(objJsonFileName.value, objSearchSymbol.value, pOptionType, vExpiry2Epoch, vRndStrkByOptStep);

            if(objTokenDtls.status === "success"){

                fnGetCurrRateStream(objTokenDtls.data.ExchSeg, objTokenDtls.data.Token, objCurrRate);
                fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnGetCurrRateStream(pExchSeg, pToken, objRateTxt){
    let vStreamObj = pExchSeg + "|" + pToken;

    let objKotakSession = document.getElementById("txtKotakSession");
    let objSid = document.getElementById("txtSid");
    let vChannelNo = 3;

    if(objKotakSession.value !== ""){
        let vUrl = "wss://mlhsm.kotaksecurities.com"; <!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
        userKotakWS = new HSWebSocket(vUrl);
        //console.log(vChannelNo);

        userKotakWS.onopen = function () {
            //fnGenMessage("Connection is Open!", `badge bg-success`, "spnGenMsg");
            //fnLogTA('[Socket]: Connected to "' + vUrl + '"\n');
            let jObj = {};
            jObj["Authorization"] = objKotakSession.value;
            jObj["Sid"] = objSid.value; 
            jObj["type"] = "cn";
            userKotakWS.send(JSON.stringify(jObj));
        }

        userKotakWS.onclose = function () {
            // objDdlOptSym.value = 0;
            // fnGetSelSymbolData(0);
            objRateTxt.value = "";
            //fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
            //fnLogTA("[Socket]: Disconnected !\n");
        }

        userKotakWS.onerror = function () {
            objRateTxt.value = "";
            fnGenMessage("Error in Curr Rate Socket Connection!", `badge bg-danger`, "spnGenMsg");
            //fnLogTA("[Socket]: Error !\n");
        }

        userKotakWS.onmessage = function (msg) {
            const result= JSON.parse(msg);
            
            if((result[0].name === "sf")){
                if(result[0].ltp !== undefined){
                    objRateTxt.value = result[0].ltp;
                    //objSpot.value = result[0].iv;
                    // resumeandpause('cp', '3');
                }
            }

            if(result[0].type === "cn"){
                fnSubscribeScript('mws', vStreamObj, vChannelNo);
            }
        }
    }
}

function fnGetRoundedStrikeByOptStep(pOptionType, pOptSpotVal, pSelOptStep, pStrikeIntvl){
    let vRndStrkByOptStep = "";

    if(pOptionType === "CE"){
        vRndStrkByOptStep = (parseInt(pOptSpotVal) + (parseInt(pSelOptStep) * parseInt(pStrikeIntvl))) * 100;
    }
    else if(pOptionType === "PE"){
        vRndStrkByOptStep = (parseInt(pOptSpotVal) - (parseInt(pSelOptStep) * parseInt(pStrikeIntvl))) * 100;
    }

    return vRndStrkByOptStep;
}

function fnGetEpochBySegmentSeldExpiry(PIdxSegment, pSelExpiry){
    let vExpiry2Epoch = "";

    if(PIdxSegment === "nse_cm"){
        let objDate = new Date(pSelExpiry + " 09:00:00 GMT");
        vExpiry2Epoch = (objDate.getTime()/1000.0) - 315513000;
    }
    else if(PIdxSegment === "bse_cm"){
        let objDate = new Date(pSelExpiry + " 18:29:59 GMT");
        vExpiry2Epoch = objDate.getTime()/1000.0;
    }

    return vExpiry2Epoch;
}

function fnSetInitOptTrdDtls(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objTrdVals = JSON.parse(localStorage.getItem("5SecData"));
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objEntryDate = document.getElementById("lblEntryDate");
    let objSymbolName = document.getElementById("lblSymbol");
    let objStrikePrice = document.getElementById("lblStrike");
    let objOptionType = document.getElementById("lblOptionType");
    let objExpiry = document.getElementById("lblExpiry");
    let objLotSize = document.getElementById("lblLotSize");
    let objQty = document.getElementById("lblQty");
    let objCapital = document.getElementById("lblCapital");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let objLblBP = document.getElementById("lblBuyPriceInd");
    let objLblSP = document.getElementById("lblSellPriceInd");

    let objCurrTradeSL = document.getElementById("txtUpdStopLoss");
    let objCurrTradeTP = document.getElementById("txtUpdTakeProfit");

    gTSLCrossed = false;
    gCurrTSL = 0;

    if(objCurrPos !== null){
        objEntryDate.innerText = objCurrPos.TradeData[0].EntryDT;
        objSymbolName.innerText = objCurrPos.TradeData[0].SearchSymbol;
        objStrikePrice.innerText = objCurrPos.TradeData[0].Strike;
        objOptionType.innerText = objCurrPos.TradeData[0].OptionType;
        objExpiry.innerText = objCurrPos.TradeData[0].Expiry;
        objLotSize.innerText = objCurrPos.TradeData[0].LotSize;
        objQty.innerText = objCurrPos.TradeData[0].Quantity;

        objCurrTradeSL.value = objCurrPos.TradeData[0].PointSL;
        objCurrTradeTP.value = objCurrPos.TradeData[0].PointTP;
        //Update Later, first check where to change the values
        // if(objTrdVals === null){

        // }

        gBuyPrice = objCurrPos.TradeData[0].BuyPrice;
        gSellPrice = objCurrPos.TradeData[0].SellPrice;
        gLotSize = objCurrPos.TradeData[0].LotSize;
        gQty = objCurrPos.TradeData[0].Quantity;
        gAmtSL = objCurrPos.TradeData[0].StopLoss;
        gAmtTP = objCurrPos.TradeData[0].TakeProfit;
        gByorSl = objCurrPos.TradeData[0].ByorSl;

        if(gByorSl === "B"){
            objLblBP.innerText = "BUY PRICE";
            objLblSP.innerText = "CURR PRICE";
            objBuyPrice.innerText = gBuyPrice;
            objSellPrice.innerText = gBuyPrice;

            gDiffSL = (gAmtSL - gBuyPrice).toFixed(2);
            gDiffTP = (gAmtTP - gBuyPrice).toFixed(2);
            objCapital.innerText = (parseInt(gLotSize) * parseInt(gQty) * parseFloat(gBuyPrice)).toFixed(2);
        }
        else if(gByorSl === "S"){
            objLblBP.innerText = "CURR PRICE";
            objLblSP.innerText = "SELL PRICE";
            objBuyPrice.innerText = gSellPrice;
            objSellPrice.innerText = gSellPrice;

            gDiffSL = (gSellPrice - gAmtSL).toFixed(2);
            gDiffTP = (gSellPrice - gAmtTP).toFixed(2);
            objCapital.innerText = (parseInt(gLotSize) * parseInt(gQty) * parseFloat(gSellPrice)).toFixed(2);
        }
        else{
            objCapital.innerText = "";
        }
        objProfitLoss.innerText = ((parseFloat(gSellPrice) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);

        fnStartStreamOptPrc();
        fnSet50PrctQty();
        //Uncomment when Trading is live
        fnLoadOptTimerSwitchSetting();
        //Uncomment when Trading is live

        fnGenMessage("<span class='blink'>Position Is Open</span>", `badge bg-warning`, "btnPositionStatus");
    }
}

function fnStartStreamOptPrc(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let vStreamObj = "";
    let objLTP = document.getElementById("txtCurrentRate");

    let objKotakSession = document.getElementById("txtKotakSession");
    let objSid = document.getElementById("txtSid");
    let vChannelNo = 9;

    if((objKotakSession.value !== "") && (objCurrPos !== null)){
        vStreamObj = objCurrPos.TradeData[0].ExchSeg + "|" + objCurrPos.TradeData[0].SymToken;
        let vUrl = "wss://mlhsm.kotaksecurities.com"; <!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
        userKotakWS = new HSWebSocket(vUrl);
        //console.log(vChannelNo);

        userKotakWS.onopen = function () {
            fnGenMessage("Option Streaming Connection is Open!", `badge bg-success`, "spnGenMsg");
            console.log("Streaming Connection Opened!");
            //fnLogTA('[Socket]: Connected to "' + vUrl + '"\n');
            let jObj = {};
            jObj["Authorization"] = objKotakSession.value;
            jObj["Sid"] = objSid.value; 
            jObj["type"] = "cn";
            userKotakWS.send(JSON.stringify(jObj));
        }

        userKotakWS.onclose = function () {
            //objLTP.value = "";
            // userKotakWS = "";
            fnGenMessage("Option Streaming Connection is Closed!", `badge bg-warning`, "spnGenMsg");
            console.log("Streaming Connection Closed!");
            // userKotakWS.open();
            //fnLogTA("[Socket]: Disconnected !\n");
            // if (objCurrPos !== null){
            //     fnStartStreamOptPrc();
            // }
        }

        userKotakWS.onerror = function () {
            objLTP.value = "";
            fnGenMessage("Error in Option Streaming Socket Connection!", `badge bg-danger`, "spnGenMsg");
            console.log("Streaming Connection Error!");
            //fnLogTA("[Socket]: Error !\n");
        }

        userKotakWS.onmessage = function (msg) {
            const result= JSON.parse(msg);
            
            if((result[0].name === "sf")){
                if(result[0].ltp !== undefined){
                    objLTP.value = result[0].ltp;
                }
            }

            if(result[0].type === "cn"){
                fnSubscribeScript('mws', vStreamObj, vChannelNo);
            }
            console.log("Streaming Connection Msg Sent!");
        }
    }
}

function fnCloseWS(){
    // console.log("Sess: " + userKotakWS)
    if(userKotakWS === ""){
        console.log("No Connection is Open!");
    }
    else{
        userKotakWS.close();
        console.log("Connection is Closed!");
    }
}

function fnLoadOptTimerSwitchSetting(){
    let vTimerSwitchS = localStorage.getItem("TimerSwtS");
    let objTimerSwitch = document.getElementById("swtAutoChkPosition");

    if (vTimerSwitchS === "true") {
        objTimerSwitch.checked = true;
    }
    else {
        objTimerSwitch.checked = false;
    }
    fnCheckOptTradeTimer();
}

function fnCheckOptTradeTimer(){
    var objTimeMS = document.getElementById("txtTimeMS");
    var objTimerSwitch = document.getElementById("swtAutoChkPosition");
    var objCurrPosiLst = localStorage.getItem("KotakCurrOptPosiS");
    
    if (isNaN(parseInt(objTimeMS.value)) || (parseInt(objTimeMS.value) < 5)) {
        objTimeMS.value = 5;
    }

    let vTimer = 1000 * parseInt(objTimeMS.value);

    if (objTimerSwitch.checked)
    {
        localStorage.setItem("TimerSwtS", "true");

        if (objCurrPosiLst !== null) {
            clearInterval(vTradeInst);

            switch(gByorSl){
                case "B":
                    vTradeInst = setInterval(fnCheckOptBuyingPosition, vTimer);
                    break;
                case "S":
                    vTradeInst = setInterval(fnCheckOptSellingPosition, vTimer);
                    break;
                default:
                    fnGenMessage("Invalid Transaction Type, Please Check!", `badge bg-danger`, "spnGenMsg");

            }
            fnGenMessage("Auto Check for Current Price is On!", `badge bg-success`, "spnGenMsg");
        }
        else
        {
            clearInterval(vTradeInst);
            fnGenMessage("No Open Trade, Will start when the trade is Open", `badge bg-warning`, "spnGenMsg");
        }
    }
    else {
        localStorage.setItem("TimerSwtS", "false");
        clearInterval(vTradeInst);

        fnGenMessage("Auto Check for Current Price is Off!", `badge bg-danger`, "spnGenMsg");
    }
}

async function fnGetBackupCurrRate(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objSid = document.getElementById("txtSid");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objAccessToken = document.getElementById("txtAccessToken");

    // console.log(objCurrPos.TradeData[0].ExchSeg);
    // console.log(objCurrPos.TradeData[0].SymToken);
    // console.log(objKotakSession.value);
    try{
        let objData = await fnExecBackupRate(objCurrPos.TradeData[0].ExchSeg, objCurrPos.TradeData[0].SymToken, objSid.value, objKotakSession.value, objAccessToken.value);

        if(objData.status === "success"){

            console.log("Test Data");
            console.log(objData);
            fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage(objTokenDtls.message, `badge bg-${objTokenDtls.status}`, "spnGenMsg");
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnExecBackupRate(pExchSeg, pSymbToken, pSid, pKotakSession, pAccessToken){
    const objData = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ ExchSeg: pExchSeg, SymbToken: pSymbToken, Sid: pSid, KotakSession: pKotakSession, AccessToken: pAccessToken }),
            redirect: 'follow'
            };

        fetch("/kotakReal/getBackupRate", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success"){

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            console.log('error: ', error);
            // fnGenMessage("Error in feaching Option Symbol.", `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error At Token Details", "data": "" });
        });
    });
    return objData;
}

function fnUpdateOptSLTP(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objCurrSL = document.getElementById("txtUpdStopLoss");
    let objCurrTP = document.getElementById("txtUpdTakeProfit");
    let objLTP = document.getElementById("txtCurrentRate");

    if(objCurrPos !== null){
        if(gByorSl === "B"){
            // Change for Percentage or Point
            // gAmtSL = (gBuyPrice - ((gBuyPrice * objCurrSL.value)/100)).toFixed(2);
            // gAmtTP = (gBuyPrice + ((gBuyPrice * objCurrTP.value)/100)).toFixed(2);
            gAmtSL = (gBuyPrice - parseInt(objCurrSL.value)).toFixed(2);
            gAmtTP = (gBuyPrice + parseInt(objCurrTP.value)).toFixed(2);
        }
        else if(gByorSl === "S"){
            // Change for Percentage or Point
            // gAmtSL = (gBuyPrice + ((gBuyPrice * objCurrSL.value)/100)).toFixed(2);
            // gAmtTP = (gBuyPrice - ((gBuyPrice * objCurrTP.value)/100)).toFixed(2);                                
            gAmtSL = (gBuyPrice + parseInt(objCurrSL.value)).toFixed(2);
            gAmtTP = (gBuyPrice - parseInt(objCurrTP.value)).toFixed(2);                                
        }
        else{
            gAmtSL = 0;
            gAmtTP = 0;                                
        }

        objCurrPos.TradeData[0].PointSL = objCurrSL.value;
        objCurrPos.TradeData[0].PointTP = objCurrTP.value;
        objCurrPos.TradeData[0].StopLoss = gAmtSL;
        objCurrPos.TradeData[0].TakeProfit = gAmtTP;
        objCurrPos.TradeData[0].SellPrice = objLTP.value;

        let objUpdTradeDtls = JSON.stringify(objCurrPos);
        localStorage.setItem("KotakCurrOptPosiS", objUpdTradeDtls);

        fnSetInitOptTrdDtls();
        // console.log(localStorage.getItem("KotakCurrOptPosiS"));
    }
    // console.log("Buy Price: " + gBuyPrice);
}

function fnCheckOptBuyingPosition(){
    let objSelSLTP = document.getElementById("ddlTrailSLTP");

    let objTrailSL = document.getElementById("lblTrailSL");
    let objOnSL = document.getElementById("lblLossOnSL");
    let objOnTP = document.getElementById("lblProfitOnTP");
    let objSellPrice = document.getElementById("lblSellPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let vLTP = document.getElementById("txtCurrentRate");

    objSellPrice.innerText = vLTP.value;
    let vPLVal = ((parseFloat(vLTP.value) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    objProfitLoss.innerText = vPLVal;

    // console.log("Buy: " + objSelSLTP.value);

    switch(parseInt(objSelSLTP.value)){
    case 0:
        objTrailSL.innerText = "No T-SL";
        objOnSL.innerText = "No SL";
        objOnTP.innerText = "No TP";
        break;
    case 1:
        objTrailSL.innerText = "No T-SL";
        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        if((parseFloat(vLTP.value) <= gAmtSL) || (parseFloat(vLTP.value) >= gAmtTP)){
            fnCloseOptTrade();
        }
        else{
            fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        }

        break;
    case 2:
        if(!gTSLCrossed){
            gCurrTSL = (parseFloat(gBuyPrice) - parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gAmtSL;
        }

        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        console.log("DiffSL::: " + gDiffSL);
        console.log("AmtTP::: " + gAmtTP);
        console.log("AmtSL::: " + gAmtSL);
        console.log("CurrTSL::: " + gCurrTSL);

        if(parseFloat(vLTP.value) >= parseFloat(gCurrTSL)){
            gCurrTSL = (parseFloat(vLTP.value) + parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(vLTP.value) - parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;
        }

        if(parseFloat(vLTP.value) <= parseFloat(gAmtSL)){
            console.log("SL Hit, Trade Closed!");

            fnCloseOptTrade();
        }
        else if(((parseFloat(vLTP.value) <= gCurrTSL) || (parseFloat(vLTP.value) >= gAmtTP)) && gTSLCrossed){
            console.log("T-SL or TP is hit, Trade Closed");
            fnCloseOptTrade();
        }

        break;
    case 3:
        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = "No TP"; //(gDiffTP * gLotSize * gQty).toFixed(2);

        if(parseFloat(vLTP.value) >= parseFloat(gAmtTP)){
            gCurrTSL = (parseFloat(gAmtTP) + parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(gAmtTP) - parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;
        }

        if(!gTSLCrossed){
            objTrailSL.innerText = gAmtSL;
        }
        if(parseFloat(vLTP.value) <= parseFloat(gAmtSL)){
            console.log("SL Hit, Trade Closed!");

            fnCloseOptTrade();
        }
        else if((parseFloat(vLTP.value) <= gCurrTSL) && gTSLCrossed){
            console.log("T-SL Hit, Trade Closed");
            fnCloseOptTrade();
        }
        else{
            if(gCurrTSL > 0){
                objOnSL.innerText = ((parseFloat(gCurrTSL) - parseFloat(gBuyPrice)) * gLotSize * gQty).toFixed(2);
            }
            console.log("Trail Afr TP: " + gCurrTSL);            
        }
        break;
        // default:
        //   code to be executed if n is different from case 1 and 2
    case 4:
        let vLossAmt = Math.abs(parseFloat(localStorage.getItem("TotLossAmtR")) * 1.3);
        // let vLossAmt = Math.abs(parseFloat(localStorage.getItem("TotLossAmtR")));

        objTrailSL.innerText = "No T-SL";
        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        // console.log(vPLVal);
        // console.log(vLossAmt);
        // console.log(gQty);

        if((vLossAmt > 0) && (vPLVal >= vLossAmt) && (gQty > 1)){
            fnClose50PrctOptTrade();
            // console.log("Exec 50%");
        }
        else if((parseFloat(vLTP.value) <= gAmtSL) || (parseFloat(vLTP.value) >= gAmtTP)){
            fnCloseOptTrade();
        }
        else{
        fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        }

        break;
    }
    // const b = performance.now();
    // console.log('It took ' + (b - a) + ' ms.');
}

function fnCheckOptSellingPosition(){
    let objSelSLTP = document.getElementById("ddlTrailSLTP");

    let objTrailSL = document.getElementById("lblTrailSL");
    let objOnSL = document.getElementById("lblLossOnSL");
    let objOnTP = document.getElementById("lblProfitOnTP");
    let objBuyPrice = document.getElementById("lblBuyPrice");
    let objProfitLoss = document.getElementById("lblProfitLoss");
    let vLTP = document.getElementById("txtCurrentRate");

    objBuyPrice.innerText = vLTP.value;
    let vPLVal = ((parseFloat(gSellPrice) - parseFloat(vLTP.value)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    objProfitLoss.innerText = vPLVal;

    // console.log("Sell: " + objSelSLTP.value);

    switch(parseInt(objSelSLTP.value)){
    case 0:
      objTrailSL.innerText = "No T-SL";
      objOnSL.innerText = "No SL";
      objOnTP.innerText = "No TP";
      break;
    case 1:
      objTrailSL.innerText = "No T-SL";
      objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
      objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

      if((parseFloat(vLTP.value) >= gAmtSL) || (parseFloat(vLTP.value) <= gAmtTP)){

        fnCloseOptTrade();
      }
      else{
        fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
      }
      break;
    case 2:
        if(!gTSLCrossed){
            gCurrTSL = (parseFloat(gSellPrice) + parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gAmtSL;
        }

        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        console.log("DiffSL::: " + gDiffSL);
        console.log("AmtTP::: " + gAmtTP);
        console.log("AmtSL::: " + gAmtSL);
        console.log("CurrTSL::: " + gCurrTSL);

        if(parseFloat(vLTP.value) >= parseFloat(gCurrTSL)){
            gCurrTSL = (parseFloat(vLTP.value) - parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(vLTP.value) + parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;
        }

        if(parseFloat(vLTP.value) >= parseFloat(gAmtSL)){
            console.log("SL Hit, Trade Closed!");

            fnCloseOptTrade();
        }
        else if(((parseFloat(vLTP.value) >= gCurrTSL) || (parseFloat(vLTP.value) <= gAmtTP)) && gTSLCrossed){
            console.log("T-SL or TP is hit, Trade Closed");
            fnCloseOptTrade();
        }
      break;
    case 3:
        objOnSL.innerText = (gDiffSL * gLotSize * gQty).toFixed(2);
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

        if(parseFloat(vLTP.value) <= parseFloat(gAmtTP)){
            gCurrTSL = (parseFloat(gAmtTP) - parseFloat(gDiffSL)).toFixed(2);
            gAmtTP = (parseFloat(gAmtTP) + parseFloat(gDiffSL)).toFixed(2);
            objTrailSL.innerText = gCurrTSL;
            gTSLCrossed = true;

            console.log("Inside IF");
        }

        if(!gTSLCrossed){
            objTrailSL.innerText = gAmtSL;
        }
        if(parseFloat(vLTP.value) >= parseFloat(gAmtSL)){
        console.log("SL Hit, Trade Closed!");

        fnCloseTrade();
        }
        else if((parseFloat(vLTP.value) >= gCurrTSL) && gTSLCrossed){
            console.log("T-SL Hit, Trade Closed");
            fnCloseTrade();
        }
        console.log("Trail Afr TP: " + gCurrTSL);
      break;
    // default:
    //   code to be executed if n is different from case 1 and 2
    }
}

async function fnClose50PrctOptTrade(){
    try{
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

        if (objCurrPos === null){
            fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            let v50PrctQty = Math.round(parseInt(objCurrPos.TradeData[0].Quantity) / 2);

            // let objClsTrd = await fnInitClsOptRealTrade(v50PrctQty);
            let objClsTrd = await fnInitClsOptRealTrade1(v50PrctQty);

            if(objClsTrd.status === "success"){
                fnSetInitOptTrdDtls();
                fnGenMessage("Partial Qty Closed!", `badge bg-${objClsTrd.status}`, "spnGenMsg");   
            }
            else{
                fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

async function fnCloseOptTrade(){
    try{
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

        if (objCurrPos === null){
            fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
        }
        else{
            // let objClsTrd = await fnInitClsOptRealTrade(0);
            let objClsTrd = await fnInitClsOptRealTrade1(0);

            if(objClsTrd.status === "success"){
                fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
            }
            else{
                fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnInitClsOptPaperTrade(pQty){
    const objClsTrd = new Promise((resolve, reject) => {
        let objHsServerId = document.getElementById("txtHsServerId");
        let objSid = document.getElementById("txtSid");
        let objAccessToken = document.getElementById("txtAccessToken");
        let objKotakSession = document.getElementById("txtKotakSession");
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
        let objLTP = document.getElementById("txtCurrentRate");
        let vToClsQty, vCharges = 0;
        let vToCntuQty = parseInt(objCurrPos.TradeData[0].Quantity) - parseInt(pQty);

        if(pQty === 0){
            vToClsQty = objCurrPos.TradeData[0].Quantity;
        }
        else{
            vToClsQty = pQty;
        }

        const vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        let vBuySell = "";

        if(objCurrPos.TradeData[0].ByorSl === "B"){
            vBuySell = "S"
        }
        else{
            vBuySell = "B"
        }

        let objTodayTrades = localStorage.getItem("OptTradesListS");

        objCurrPos.TradeData[0].ExitDT = vToday;
        objCurrPos.TradeData[0].SellPrice = objLTP.value;

        let vPL = ((parseFloat(objCurrPos.TradeData[0].SellPrice) - parseFloat(objCurrPos.TradeData[0].BuyPrice)) * parseFloat(vToClsQty) * parseFloat(objCurrPos.TradeData[0].LotSize)).toFixed(2);
        vCharges = fnCalcTradeCharges(objCurrPos.TradeData[0].BuyPrice, objCurrPos.TradeData[0].SellPrice, vToClsQty, objCurrPos.TradeData[0].LotSize);

        if (objTodayTrades === null || objTodayTrades === ""){
            objTodayTrades = {
                TradeList: [{ TradeID: objCurrPos.TradeData[0].TradeID, ClientID: objCurrPos.TradeData[0].ClientID, Symbol: objCurrPos.TradeData[0].SearchSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, OptionType: objCurrPos.TradeData[0].OptionType, Quantity: vToClsQty, LotSize: objCurrPos.TradeData[0].LotSize, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ProfitLoss: vPL, Charges: vCharges, StopLoss: objCurrPos.TradeData[0].StopLoss, TakeProfit: objCurrPos.TradeData[0].TakeProfit, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday }]
            };
            objTodayTrades = JSON.stringify(objTodayTrades);
            localStorage.setItem("OptTradesListS", objTodayTrades);
        }
        else{
            let vExistingData = JSON.parse(objTodayTrades);
            vExistingData.TradeList.push({ TradeID: objCurrPos.TradeData[0].TradeID, ClientID: objCurrPos.TradeData[0].ClientID, Symbol: objCurrPos.TradeData[0].SearchSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, OptionType: objCurrPos.TradeData[0].OptionType, Quantity: vToClsQty, LotSize: objCurrPos.TradeData[0].LotSize, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ProfitLoss: vPL, Charges: vCharges, StopLoss: objCurrPos.TradeData[0].StopLoss, TakeProfit: objCurrPos.TradeData[0].TakeProfit, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday });
            let vAddNewItem = JSON.stringify(vExistingData);
            localStorage.setItem("OptTradesListS", vAddNewItem);
        }

        if(pQty === 0){
            clearInterval(vTradeInst);
            clearInterval(gStreamInst);
            localStorage.removeItem("KotakCurrOptPosiS");
            fnResetOpenPositionDetails();
            // userKotakWS.close();
            resumeandpause('cp', '1');
            fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
        }
        else{
            // localStorage.setItem("QtyMulR", vToCntuQty);
            objCurrPos.TradeData[0].Quantity = vToCntuQty;
            localStorage.setItem("KotakCurrOptPosiS", JSON.stringify(objCurrPos));
        }

        fnSetNextOptTradeSettings(objLTP.value, vToClsQty, vCharges);
        fnSetTodayOptTradeDetails();

        resolve({ "status": "success", "message": "Option Paper Trade Closed Successfully!", "data": "" });
    });
    return objClsTrd;
}

function fnCalcTradeCharges(pBuyPrice, pSellPrice, pClsQty, pLotSize){
    let vAmtBuy = parseFloat(pBuyPrice) * parseInt(pClsQty) * parseInt(pLotSize);
    let vAmtSell = parseFloat(pSellPrice) * parseInt(pClsQty) * parseInt(pLotSize);
    let vTurnOver = vAmtBuy + vAmtSell;
    let vPrctSTT = 0.1 / 100;
    let vPrctSebiTO = 0.0001 / 100;
    let vPrctTransChr = 0.03503 / 100;
    let vPrctGST = 18 / 100;
    let vPrctStmpDuty = 0.003 / 100;
    let vAmtBrokerage, vAmtSTT, vAmtSebiTO, vAmtTransChr, vAmtGST, vAmtStmpDuty, vAmtTotalCharges = 0;

    vAmtBrokerage = 20;
    vAmtSTT = parseFloat(vAmtSell) * vPrctSTT;
    vAmtSebiTO = vTurnOver * vPrctSebiTO;
    vAmtTransChr = vTurnOver * vPrctTransChr;
    vAmtGST = (vAmtBrokerage + vAmtSebiTO + vAmtTransChr) * vPrctGST;
    vAmtStmpDuty = vAmtBuy * vPrctStmpDuty;

    vAmtTotalCharges = vAmtBrokerage + vAmtSTT + vAmtSebiTO + vAmtTransChr + vAmtGST + vAmtStmpDuty;
    //console.log("Charges: " + vAmtTotalCharges);

    return (vAmtTotalCharges).toFixed(2);
}

function fnInitClsOptRealTrade1(pQty){
    const objPromise = new Promise((resolve, reject) => {
        let objHsServerId = document.getElementById("txtHsServerId");
        let objSid = document.getElementById("txtSid");
        let objAccessToken = document.getElementById("txtAccessToken");
        let objKotakSession = document.getElementById("txtKotakSession");
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
        let objLTP = document.getElementById("txtCurrentRate");
        let vToClsQty = 0;
        let vToCntuQty = parseInt(objCurrPos.TradeData[0].Quantity) - parseInt(pQty);
        let vMultOrdId = localStorage.getItem("MultOrdId");

        console.log(vMultOrdId);

        if(pQty === 0){
            vToClsQty = objCurrPos.TradeData[0].Quantity;
        }
        else{
            vToClsQty = pQty;
        }

        const vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        let vBuySell = "";

        if(objCurrPos.TradeData[0].ByorSl === "B"){
            vBuySell = "S"
        }
        else{
            vBuySell = "B"
        }

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value, SymToken: objCurrPos.TradeData[0].SymToken, TrdSymbol: objCurrPos.TradeData[0].TrdSymbol, BorS: vBuySell, LotSize: objCurrPos.TradeData[0].LotSize, OptQty: vToClsQty, ExchSeg: objCurrPos.TradeData[0].ExchSeg, MaxOptQty: objCurrPos.TradeData[0].MaxOrderQty, MultOrdId: vMultOrdId, CurrPrice: objLTP.value }),
            redirect: 'follow'
        };

        fetch("/kotakReal/placeCloseOptTrade1", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success"){

                console.log(objResult);
                let vClsdQty = objResult.data.ClsdQty;
                let vBalQty = objResult.data.BalQty;
                let vAvgPrc = objResult.data.AvgPrc;

                objCurrPos.TradeData[0].ExitDT = vToday;
                objCurrPos.TradeData[0].SellPrice = vAvgPrc;

                let vPL = ((parseFloat(objCurrPos.TradeData[0].SellPrice) - parseFloat(objCurrPos.TradeData[0].BuyPrice)) * parseFloat(vClsdQty) * parseFloat(objCurrPos.TradeData[0].LotSize)).toFixed(2);


                if(vBalQty === 0){
                    clearInterval(vTradeInst);
                    clearInterval(gStreamInst);
                    localStorage.removeItem("KotakCurrOptPosiS");
                    fnResetOpenPositionDetails();
                    // userKotakWS.close();
                    resumeandpause('cp', '9');
                    fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
                }
                else{
                    // localStorage.setItem("QtyMulR", vToCntuQty);
                    objCurrPos.TradeData[0].Quantity = vBalQty;
                    localStorage.setItem("KotakCurrOptPosiS", JSON.stringify(objCurrPos));
                }

                fnSetNextOptTradeSettings(vAvgPrc, vClsdQty, 0);
                fnGetOrderBook();

                resolve({ "status": "success", "message": "Option Paper Trade Closed Successfully!", "data": "" });
            }
            else if(objResult.status === "warning"){
                
            }
            else{
                reject({ "status": "danger", "message": objResult.message, "data": "" });
            }
        })
        .catch(error => {
            console.log('error: ', error);
            // fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error to Fetch with Option Details!", "data": "" });
        });
    });
    return objPromise;
}

function fnInitClsOptRealTrade(pQty){
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objLTP = document.getElementById("txtCurrentRate");
    let vToClsQty = 0;
    let vToCntuQty = parseInt(objCurrPos.TradeData[0].Quantity) - parseInt(pQty);

    if(pQty === 0){
        vToClsQty = objCurrPos.TradeData[0].Quantity;
    }
    else{
        vToClsQty = pQty;
    }

    const vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    let vBuySell = "";

    if(objCurrPos.TradeData[0].ByorSl === "B"){
        vBuySell = "S"
    }
    else{
        vBuySell = "B"
    }

    //***** Uncomment for Real Trade and check code later ******//
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value, SymToken: objCurrPos.TradeData[0].SymToken, TrdSymbol: objCurrPos.TradeData[0].TrdSymbol, BorS: vBuySell, LotSize: objCurrPos.TradeData[0].LotSize, OptQty: vToClsQty, ExchSeg: objCurrPos.TradeData[0].ExchSeg, MaxOptQty: objCurrPos.TradeData[0].MaxOrderQty }),
        redirect: 'follow'
    };

    fetch("/kotakReal/placeCloseOptTrade", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        console.log("Data: " + objResult.data);

        if(objResult.status === "success"){
            let objTodayTrades = localStorage.getItem("OptTradesListS");

            objCurrPos.TradeData[0].ExitDT = vToday;
            objCurrPos.TradeData[0].SellPrice = objLTP.value;

            let vPL = ((parseFloat(objCurrPos.TradeData[0].SellPrice) - parseFloat(objCurrPos.TradeData[0].BuyPrice)) * parseFloat(vToClsQty) * parseFloat(objCurrPos.TradeData[0].LotSize)).toFixed(2);

            if (objTodayTrades === null || objTodayTrades === ""){
                objTodayTrades = {
                TradeList: [{ TradeID: objCurrPos.TradeData[0].TradeID, ClientID: objCurrPos.TradeData[0].ClientID, Symbol: objCurrPos.TradeData[0].SearchSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, OptionType: objCurrPos.TradeData[0].OptionType, Quantity: vToClsQty, LotSize: objCurrPos.TradeData[0].LotSize, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ProfitLoss: vPL, Charges: 0, StopLoss: objCurrPos.TradeData[0].StopLoss, TakeProfit: objCurrPos.TradeData[0].TakeProfit, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday }]
                };
            objTodayTrades = JSON.stringify(objTodayTrades);
            localStorage.setItem("OptTradesListS", objTodayTrades);
            }
            else{
                let vExistingData = JSON.parse(objTodayTrades);
                vExistingData.TradeList.push({ TradeID: objCurrPos.TradeData[0].TradeID, ClientID: objCurrPos.TradeData[0].ClientID, Symbol: objCurrPos.TradeData[0].SearchSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, OptionType: objCurrPos.TradeData[0].OptionType, Quantity: vToClsQty, LotSize: objCurrPos.TradeData[0].LotSize, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ProfitLoss: vPL, Charges: 0, StopLoss: objCurrPos.TradeData[0].StopLoss, TakeProfit: objCurrPos.TradeData[0].TakeProfit, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday });
                let vAddNewItem = JSON.stringify(vExistingData);
                localStorage.setItem("OptTradesListS", vAddNewItem);
            }

            if(pQty === 0){
                clearInterval(vTradeInst);
                clearInterval(gStreamInst);
                localStorage.removeItem("KotakCurrOptPosiS");
                fnResetOpenPositionDetails();
                // userKotakWS.close();
                resumeandpause('cp', '1');
                fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
            }
            else{
                // localStorage.setItem("QtyMulR", vToCntuQty);
                objCurrPos.TradeData[0].Quantity = vToCntuQty;
                localStorage.setItem("KotakCurrOptPosiS", JSON.stringify(objCurrPos));
            }

            fnSetNextOptTradeSettings(objLTP.value, vToClsQty, 0);
            fnSetTodayOptTradeDetails();

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");            
        }
        else if(objResult.status === "danger"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
    });
    //***** Uncomment for Real Trade and check code later ******//
}

function fnSetNextOptTradeSettings(pAvgPrice, pQty, pCharges){
    let objQty = document.getElementById("txtOptionsQty");
    let vOldLossAmt = localStorage.getItem("TotLossAmtR");
    let vOldQtyMul = localStorage.getItem("QtyMulR");
    let objMartiSwitch = document.getElementById("swtMartingale");
    let objLossBadge = document.getElementById("spnLossTrd");

    if(vOldLossAmt === null)
        vOldLossAmt = 0;
    if(vOldQtyMul === null)
        vOldQtyMul = 0;

    let vAmtPL = 0;
    // console.log("Avg Prc: " + pAvgPrice);
    // console.log("Buy Prc: " + gBuyPrice);
    // console.log("Sell Prc: " + gSellPrice);
    // console.log("Qty: " + pQty);
    // console.log("Lot Size: " + gLotSize);
    // console.log("Trans Type: " + gByorSl);

    //Do Opposite
    if(gByorSl === "B"){
        vAmtPL = ((parseFloat(pAvgPrice) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(pQty)).toFixed(2);
    }
    else if(gByorSl === "S"){
        vAmtPL = ((parseFloat(gSellPrice) - parseFloat(pAvgPrice)) * parseInt(gLotSize) * parseInt(pQty)).toFixed(2);
    }
    else{
        vAmtPL = 0;
    }
    // console.log("A-PL: " + vAmtPL);
    // console.log("Old Loss Amt: " + vOldLossAmt);

    let vNewLossAmt = parseFloat(vOldLossAmt) + parseFloat(vAmtPL) - parseFloat(pCharges);

    // console.log("New Loss Amt: " + vNewLossAmt);

    if(parseFloat(vAmtPL) < 0) {
        localStorage.setItem("TotLossAmtR", vNewLossAmt);
        objLossBadge.style.visibility = "visible";
        objLossBadge.className = "badge rounded-pill text-bg-danger";

        if(objMartiSwitch.checked){
            let vNextQty = parseInt(vOldQtyMul) * 2;
            localStorage.setItem("QtyMulR", vNextQty);
            objQty.value = vNextQty;
        }
    }
    else if(parseFloat(vNewLossAmt) < 0) {
        localStorage.setItem("TotLossAmtR", vNewLossAmt);

        if(objMartiSwitch.checked){
            let vDivAmt = parseFloat(vNewLossAmt) / parseFloat(vOldLossAmt);
            let vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));
            
            if(vNextQty < 1)
                vNextQty = 1;

            localStorage.setItem("QtyMulR", vNextQty);
            objQty.value = vNextQty;
        }
    }
    else {
        objLossBadge.style.visibility = "visible";
        objLossBadge.className = "badge rounded-pill text-bg-success";

        localStorage.removeItem("TotLossAmtR");
        localStorage.removeItem("QtyMulR");
        // localStorage.setItem("TradeStep", 0);
        fnSetLotsByQtyMulLossAmt();
    }

    // console.log("New Qty: " + localStorage.getItem("QtyMulR"));
}

function fnSetTodayOptTradeDetails(){
    let objTodayTrades = localStorage.getItem("OptTradesListS");
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
    let vNetProfit = 0;

    if (objTodayTrades == null || objTodayTrades == "") {
        objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
    }
    else {
        let vTempHtml = "";
        let vJsonData = JSON.parse(objTodayTrades);
        let vNoOfTrades = 0;
        let vPrevCapital = 0;
        let vCharges = 0;

        // console.log(vJsonData);

        for (let i = 0; i < vJsonData.TradeList.length; i++) {
            vTempHtml += '<tr>';
            //vTempHtml += '<td>' + vJsonData.TradeList[i].TradeID + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + vJsonData.TradeList[i].TradeID + ');\'>' + vJsonData.TradeList[i].EntryDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vJsonData.TradeList[i].ExitDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + vJsonData.TradeList[i].Symbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vJsonData.TradeList[i].Expiry + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + vJsonData.TradeList[i].Strike + vJsonData.TradeList[i].OptionType + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vJsonData.TradeList[i].Quantity + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (parseFloat(vJsonData.TradeList[i].BuyPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(vJsonData.TradeList[i].SellPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(vJsonData.TradeList[i].Charges)).toFixed(2) + '</td>';

            let vCapital = vJsonData.TradeList[i].LotSize * vJsonData.TradeList[i].Quantity * vJsonData.TradeList[i].BuyPrice;

            if(vCapital > vPrevCapital){
                vPrevCapital = vCapital;
            }
            vCharges += parseFloat(vJsonData.TradeList[i].Charges);
            let vTradePL = parseFloat(vJsonData.TradeList[i].ProfitLoss) - parseFloat(vJsonData.TradeList[i].Charges);

            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vCapital).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;text-align:right;">' + (vTradePL).toFixed(2) + '</td>';

            vNetProfit += vTradePL;
            vNoOfTrades += 1;
            vTempHtml += '</tr>';
        }
        vTempHtml += '<tr><td>Total Trades</td><td>'+ vNoOfTrades +'</td><td colspan="6"></td><td Style="text-align:right;font-weight:bold;color:red;">'+ (vCharges).toFixed(2) +'</td><td Style="text-align:right;font-weight:bold;color:orange;">'+ (vPrevCapital).toFixed(2) +'</td><td style="font-weight:bold;text-align:right;color:orange;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objTodayTradeList.innerHTML = vTempHtml;
    }

    if(vNetProfit >= 15000){
        localStorage.setItem("isAutoTrader", "true");
        $('#btnAutoTraderStatus').trigger('click');
    }
}

function fnDeleteThisTrade(pTradeId){
    let objTodayTrades = localStorage.getItem("OptTradesListS");
    let vJsonData = JSON.parse(objTodayTrades);

    if(confirm("Are You Sure, You Want to Delete This Trade?")){
        for (let i = 0; i < vJsonData.TradeList.length; i++) {
            if(vJsonData.TradeList[i].TradeID === pTradeId) {
                vJsonData.TradeList.splice(i, 1);
            }
        }
        let vEditedItems = JSON.stringify(vJsonData);
        localStorage.setItem("OptTradesListS", vEditedItems);
        fnSetTodayOptTradeDetails();
    }
}

function fnRestartStreamOptPrc(){
    clearInterval(gStreamInst);

    fnCloseWS();
    gStreamInst = setInterval(fnStartStreamOptPrc, 5000);
}

const fnGetAccessToken = async (pConsumerKey, pConsumerSecret, pUserNameAPI, pPasswordAPI) => {
    const objAccessToken = new Promise((resolve, reject) => {
        const vConsumerStr = pConsumerKey + ":" + pConsumerSecret;
        const vBase64Str = Buffer.from(vConsumerStr).toString('base64');

        let data = JSON.stringify({
            'grant_type': 'password',
            'username': pUserNameAPI,
            'password': pPasswordAPI
        });

        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://napi.kotaksecurities.com/oauth2/token",
            headers: {
                'Authorization': 'Basic ' + vBase64Str,
                'Content-Type': 'application/json'
            },
            data: data,
        };

        axios
            .request(config)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "Access Token Received!", "data": objResponse.data.access_token });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "At Get Access Token: " + error.message, "data": error });
            })
    });

    return objAccessToken;
};

function fnGet1TimeCurrOptRate(pExchSeg, pToken, objRateTxt){
    const objOptRate = new Promise((resolve, reject) => {

        let vStreamObj = pExchSeg + "|" + pToken;

        let objKotakSession = document.getElementById("txtKotakSession");
        let objSid = document.getElementById("txtSid");
        let vChannelNo = 2;

        if(objKotakSession.value !== ""){
            let vUrl = "wss://mlhsm.kotaksecurities.com"; <!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
            userKotakWS = new HSWebSocket(vUrl);
            //console.log(vChannelNo);

            userKotakWS.onopen = function () {
                //fnGenMessage("Connection is Open!", `badge bg-success`, "spnGenMsg");
                //fnLogTA('[Socket]: Connected to "' + vUrl + '"\n');
                let jObj = {};
                jObj["Authorization"] = objKotakSession.value;
                jObj["Sid"] = objSid.value; 
                jObj["type"] = "cn";
                userKotakWS.send(JSON.stringify(jObj));
            }

            userKotakWS.onclose = function () {
                // objDdlOptSym.value = 0;
                // fnGetSelSymbolData(0);
                objRateTxt.value = "";
                fnGenMessage("1 Time Connection is Closed!", `badge bg-warning`, "spnGenMsg");
                // resolve({ "status": "success", "message": "1 Time Connection is Closed!", "data": "" });
                //fnLogTA("[Socket]: Disconnected !\n");
            }

            userKotakWS.onerror = function () {
                objRateTxt.value = "";
                //fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in 1 Time Socket Connection!", "data": "" });
                //fnLogTA("[Socket]: Error !\n");
            }

            userKotakWS.onmessage = function (msg) {
                const result= JSON.parse(msg);
                
                // alert(result[0].name);
                if((result[0].name === "sf")){
                    if(result[0].ltp !== undefined){
                        objRateTxt.value = result[0].ltp;
                        //objRateTxt.value = result[0].iv;
                        unSubSelSymb('mwu', vStreamObj, vChannelNo);
                        // userKotakWS.close();
                        fnGenMessage("1 Time Rate is Received!", `badge bg-success`, "spnGenMsg");
                        resolve({ "status": "success", "message": "Rate Received Successfully!", "data": objRateTxt.value });
                    }
                }

                if(result[0].type === "cn"){
                    fnSubscribeScript('mws', vStreamObj, vChannelNo);
                }
            }
        }
        else{
            reject({ "status": "danger", "message": "Invalid Session, Please Login!", "data": "" });
        }
    });

    return objOptRate;
}

function fnGetOrderTradeBook(){
    fnGetOrderBook();
    // fnGetTradeBook();
}