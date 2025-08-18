
let gIsTraderLogin = false;
let userKotakWS = "";
let wssViewRate = "";
let wssSelSymbolChg = "";
let vTradeInst = 0;
let gStreamInst = 0;
let gIndData = {};
let gInnTrdInrvl = 0;

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

let gRoundStrike = 0;
let gTSLCrossed = false;
let startTime = 0;

let gActTrdCE = false;
let gActTrdPE = false;
let gTrdExcPrc = false;

window.addEventListener("DOMContentLoaded", function(){
    fnGetSetPaperTraderLoginStatus();

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
        let isLsAutoTrader = localStorage.getItem("isAutoPaperTrader");
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
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

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            fnInnitiateAutoTrade11(pMsg);
        }
    });

    socket.on("tv-exec-close", (pMsg) => {
        fnCloseOptTrade11(pMsg);
        // let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

        // if(objCurrPos === null || objCurrPos === ""){
        //     fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
        // }
        // else if(objCurrPos.TradeData[0].OptionType === pMsg.OptionType){
        //     fnCloseOptTrade();
        //     fnGenMessage("Position is Closed!", `badge bg-success`, "spnGenMsg");
        // }
        // else{
        //     fnGenMessage("No "+ pMsg.OptionType +" Position to Close!", `badge bg-warning`, "spnGenMsg");
        // }
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

function fnGetSetAllStatus(){
    if(gIsTraderLogin){
        fnConnectionWS();
        fnSetRecentDates();
        fnGetSetUserProfileData();
        fnGetOptSettings();
        setTimeout(fnGetIndSymSettings, 2000);
        fnSetDefaultLotNos();
        fnLoadDefaultSLTP();
        fnSetLotsByQtyMulLossAmt();
        fnGetSetOptionStrike();
        fnLoadMartiSwitchSettings();
        fnLoadTradeSide();
        fnSetInitOptTrdDtls();
        fnLoadOptTimerSwitchSetting();
        fnSetTodayOptTradeDetails();
    }
    else{
        fnClearTraderFields();
    }
}

function fnTestBuy(pOptType){
    if(pOptType === "CE"){
        console.log("CE Trade to Open Waiting....!");

        if(gTrdExcPrc === true){
            setTimeout(fnTestBuy, 5000, pOptType);
        }
        else{
            fnTestExecBuyTrade(pOptType);
        }
    }
    else if(pOptType === "PE"){
        console.log("PE Trade to Open Waiting....!");
        if(gTrdExcPrc === true){
            setTimeout(fnTestBuy, 5000, pOptType);
        }
        else{
            fnTestExecBuyTrade(pOptType);
        }
    }
}

function fnTestClose(pOptType){
    if(pOptType === "CE"){
        console.log("CE Trade to Close Waiting..!");

        if(gTrdExcPrc === true){
            setTimeout(fnTestClose, 5000, pOptType);
        }
        else{
            fnTestExecCloseTrade(pOptType);
        }
    }
    else if(pOptType === "PE"){
        console.log("PE Trade to Close Waiting..!");

        if(gTrdExcPrc === true){
            setTimeout(fnTestClose, 5000, pOptType);
        }
        else{
            fnTestExecCloseTrade(pOptType);
        }
    }    
}

async function fnTestExecBuyTrade(pOptType){
    gTrdExcPrc = true;
    if(gActTrdCE === true || gActTrdPE === true){
        console.log("CE or PE Trade is already running...........!");
    }
    else{
        await fnSleep(3000);
        if(pOptType === "CE"){
            gActTrdPE = false;
            gActTrdCE = true;
            console.log(pOptType + " Trade Executed!");
        }
        else if(pOptType === "PE"){
            gActTrdPE = true;
            gActTrdCE = false;
            console.log(pOptType + " Trade Executed!");
        }
    }
    gTrdExcPrc = false;
}

async function fnTestExecCloseTrade(pOptType){
    gTrdExcPrc = true;
    if(gActTrdCE === true && pOptType === "CE"){
        await fnSleep(5000);
        gActTrdCE = false;
        console.log(pOptType + " Close Trade Executed!");
    }
    else if(gActTrdPE === true && pOptType === "PE"){
        await fnSleep(5000);
        gActTrdPE = false;
        console.log(pOptType + " Close Trade Executed!");
    }
    else{
        console.log("No " + pOptType + " Trade is Open to Close!");
    }
    gTrdExcPrc = false;
}

function fnSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fnToggleAutoPaperTrader(){
    let isLsAutoTrader = localStorage.getItem("isAutoPaperTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === null || isLsAutoTrader === "false")
    {
        if(gIsTraderLogin === true)
        {
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoPaperTrader", true);
        }
        else
        {
            fnGenMessage("Login to Trading Account to Activate Auto Trader", `badge bg-warning`, "spnGenMsg");
            localStorage.setItem("isAutoPaperTrader", false);
        }
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
        localStorage.setItem("isAutoPaperTrader", false);
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

async function fnInnitiateAutoTrade11(pMsg){
    try{
        let vTradeSide = localStorage.getItem("TradeSideSwtS");
        if(gActTrdCE === true || gActTrdPE === true){
            console.log("CE or PE Trade is already running...........!");
        }
        else{
            if(pMsg.OptionType === "CE"){
                console.log("CE Trade to Open Waiting....!");
                if(((vTradeSide === "true") && (pMsg.OptionType === "CE")) || ((vTradeSide === "false") && (pMsg.OptionType === "PE")) || (vTradeSide === "-1")){
                    if(gTrdExcPrc === true){
                        setTimeout(fnInnitiateAutoTrade11, 3000, pMsg.OptionType);
                    }
                    else{
                        fnGetOptionRateTicker("B", pMsg.OptionType);
                    }
                }
                else{
                    fnGenMessage(pMsg.OptionType +" Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
                }
            }
            else if(pMsg.OptionType === "PE"){
                console.log("PE Trade to Open Waiting....!");
                if(((vTradeSide === "true") && (pMsg.OptionType === "CE")) || ((vTradeSide === "false") && (pMsg.OptionType === "PE")) || (vTradeSide === "-1")){
                    if(gTrdExcPrc === true){
                        setTimeout(fnInnitiateAutoTrade11, 3000, pMsg.OptionType);
                    }
                    else{
                        fnGetOptionRateTicker("B", pMsg.OptionType);
                    }
                }
                else{
                    fnGenMessage(pMsg.OptionType +" Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
                }
            }
            else{
                fnGenMessage("Invalid Option Type!", "badge bg-warning", "spnGenMsg");
            }
        }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

async function fnInnitiateAutoTrade(pMsg){
    try{
        let isLsAutoTrader = localStorage.getItem("isAutoPaperTrader");

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
            let vTradeSide = localStorage.getItem("TradeSideSwtS");

            if(objCurrPos === null || objCurrPos === ""){
                if(((vTradeSide === "true") && (pMsg.OptionType === "CE")) || ((vTradeSide === "false") && (pMsg.OptionType === "PE")) || (vTradeSide === "-1")){
                    fnGetOptionRateTicker("B", pMsg.OptionType);
                    // let objSymbData = await fnExecSelSymbData(pMsg.Symbol);

                    // if(objSymbData.status === "success"){
                    //     fnGetOptionRateTicker("B", pMsg.OptionType);
                    //     // fnExecOptionTrade("B", pMsg.OptionType);
                    //     // console.log(objSymbData);
                    //     // console.log("New Trade Executed");
                    //     // fnGenMessage("Success - "+ pMsg.OptionType +" Trade Executed!", "badge bg-success", "spnGenMsg");
                    // }
                    // else{
                    //     fnGenMessage("Error At Auto Trade for - "+ pMsg.OptionType, "badge bg-warning", "spnGenMsg");
                    // }
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
                //         let objClsTrd = await fnInitClsOptPaperTrade(0);

                //         if(objClsTrd.status === "success"){
                //             let objSymbData = await fnExecSelSymbData(pMsg.Symbol);

                //             if(objSymbData.status === "success"){
                //                 fnGetOptionRateTicker("B", pMsg.OptionType);
                //                 //fnExecOptionTrade("B", pMsg.OptionType);
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
                //         let objClsTrd = await fnInitClsOptPaperTrade(0);

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
    let vStartLots = JSON.parse(localStorage.getItem("StartLotNoR"));
    let objTxtLots = document.getElementById("txtStartLotNos");
    // let objOptQty = document.getElementById("txtOptionsQty");

    if(vStartLots === null){
        localStorage.setItem("StartLotNoR", 1);
        objTxtLots.value = 1;
    }
    else{
        objTxtLots.value = vStartLots;
    }
}

function fnSetLotsByQtyMulLossAmt(){
    let vStartLots = localStorage.getItem("StartLotNoR");
    let vQtyMul = JSON.parse(localStorage.getItem("QtyMulR"));
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
}

async function fnGetSelSymbolData(pThisVal){
    try{
        let objSymData = await fnExecSelSymbData(pThisVal);
        if(objSymData.status === "success"){
            let objStream = JSON.parse(localStorage.getItem("IdxStream"));

            fnSubFeeds('ifs', objStream.StreamObj, objStream.Channel);
            setInterval(fnGetSpotOptionsByStep, 10000);

            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
        else{
            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
    }
    catch(err) {
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
        objSpot.value = "";

        let vStreamObj = objSegment.value + "|" + vSymName;
        let vChannel = 1;
        let objStream = { Segment : objSegment.value, Symbol : vSymName, Channel : vChannel, StreamObj : vStreamObj };
        localStorage.setItem("IdxStream", JSON.stringify(objStream));

        resolve({ "status": "success", "message": "Selected Symbol Data Received!", "data": "" });

    });
    return objSelSymb;
}

function fnUpdateIndexTicker(){
    let objStream = JSON.parse(localStorage.getItem("IdxStream"));

    fnSubFeeds('ifs', objStream.StreamObj, objStream.Channel);
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
    else{
        fnUpdateIndexTicker();
    }

    objSpotOption.value = vRoundedStrike;
}

async function fnGetSpotOptionsByStep(){
    let objSpotPrice = document.getElementById("hidSpotPrice");
    let objSpotOptionCE = document.getElementById("hidSpotOptionCE");
    let objSpotOptionPE = document.getElementById("hidSpotOptionPE");
    let objStrikeInterval = document.getElementById("hidOptStrikeInterval");
    let objDdlOptionStep = document.getElementById("ddlOptionStrike");

    let objOptExpiry = document.getElementById("ddlOptionsExpiry");
    let objSegment = document.getElementById("hidSegment");
    let objExpEpoch = document.getElementById("hidExpiryEPoch");

    let objJsonFileName = document.getElementById("hidJsonFileName");
    let objSearchSymbol = document.getElementById("hidSearchSymbol");

    let vRoundedStrike = 0;
    let vRndStrkByOptStepCE = "";
    let vRndStrkByOptStepPE = "";

    if(objSpotPrice.value !== ""){
        objExpEpoch.value = fnGetEpochBySegmentSeldExpiry(objSegment.value, objOptExpiry.value);
    
        vRoundedStrike = Math.round(parseInt(objSpotPrice.value) / parseInt(objStrikeInterval.value)) * parseInt(objStrikeInterval.value);

        vRndStrkByOptStepCE = (parseInt(vRoundedStrike) + (parseInt(objDdlOptionStep.value) * parseInt(objStrikeInterval.value))) * 100;
        vRndStrkByOptStepPE = (parseInt(vRoundedStrike) - (parseInt(objDdlOptionStep.value) * parseInt(objStrikeInterval.value))) * 100;

        if(gRoundStrike != vRndStrkByOptStepCE){
            gRoundStrike = vRndStrkByOptStepCE;
            // console.log("Updated Strike: " + gRoundStrike);

            let objTokenDtls = await fnGetOptTokenDet4CurrStrike(objJsonFileName.value, objSearchSymbol.value, objExpEpoch.value, vRndStrkByOptStepCE, vRndStrkByOptStepPE);

            if(objTokenDtls.status === "success"){
                document.getElementById("hidTokenCE").value = objTokenDtls.data.TokenCE;
                document.getElementById("hidTokenPE").value = objTokenDtls.data.TokenPE;
                document.getElementById("hidTrdSymbolCE").value = objTokenDtls.data.TrdSymbolCE;
                document.getElementById("hidTrdSymbolPE").value = objTokenDtls.data.TrdSymbolPE;
                document.getElementById("hidExSeg").value = objTokenDtls.data.ExchSeg;
            }
            else{
                console.log("Error at fnGetSpotOptionsByStep, Pls Check!");
            }
        }
        else{
            // console.log("No Need to Update!")
        }
    }
    else{
        fnUpdateIndexTicker();
    }

    objSpotOptionCE.value = vRndStrkByOptStepCE;
    objSpotOptionPE.value = vRndStrkByOptStepPE;
}

function fnGetOptTokenDet4CurrStrike(pFileName, pSearchSymbol, pExpiry2Epoch, vRndStrkByOptStepCE, vRndStrkByOptStepPE){
    const objOptToken = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ JsonFileName: pFileName, SearchSymbol: pSearchSymbol, ExpiryEpoch: pExpiry2Epoch, StrikePriceCE: vRndStrkByOptStepCE, StrikePricePE: vRndStrkByOptStepPE }),
            redirect: 'follow'
            };

        fetch("/kotakNeo/getOptToken4CurrStrike", objRequestOptions)
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
        // resolve({ "status": "success", "message": "Option Token Received", "data": "" });
    });

    return objOptToken;
}

function fnSubscribeScript(pReqType, pSymbolData, pChannelNo){
    //  mws ifs dps 
    let jObj = {"type":pReqType, "scrips":pSymbolData, "channelnum":pChannelNo};
    userKotakWS.send(JSON.stringify(jObj));
}

function fnSubscribeIndexSym(pReqType, pSymbolData, pChannelNo){
    //  mws ifs dps 
    let jObj = {"type":pReqType, "scrips":pSymbolData, "channelnum":pChannelNo};
    wssSelSymbolChg.send(JSON.stringify(jObj));
}

function fnSubscribeRateView(pReqType, pSymbolData, pChannelNo){
    //  mws ifs dps 
    let jObj = {"type":pReqType, "scrips":pSymbolData, "channelnum":pChannelNo};
    wssViewRate.send(JSON.stringify(jObj));
}

function unSubSelSymb(typeRequest, scrips, channel_number){
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    if (wssSelSymbolChg != null) {
        wssSelSymbolChg.send(JSON.stringify(jObj));
        console.log("Streaming Closed **********************")
    }
    else{
        console.log("Please Connect to Websocket.......")
    }    
}

function unSub1TimeOptRate(typeRequest, scrips, channel_number){
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    if (userKotakWS != null) {
        userKotakWS.send(JSON.stringify(jObj));
        console.log("1Time Opt Streaming Closed **********************")
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

        fetch("/kotakNeo/placeNormalOrder", objRequestOptions)
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

function fnInitiateManualOption(pBuySel, pOptionType){
    let objCurrPosiLst = localStorage.getItem("KotakCurrOptPosiS");

    if (objCurrPosiLst === null){
        fnGetOptionRateTicker(pBuySel, pOptionType);
        // fnExecOptionTrade(pBuySel, pOptionType);
    }
    else{
        fnGenMessage("Close the Open Position to Execute New Trade!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnInitiateManualOption11(pBuySel, pOptionType){
    if(gActTrdCE === true || gActTrdPE === true){
        console.log("CE or PE Trade is already running...........!");
    }
    else{
        if(pOptionType === "CE"){
            console.log("CE Trade to Open Waiting....!");
            if(gTrdExcPrc === true){
                setTimeout(fnInitiateManualOption11, 3000, pOptionType);
            }
            else{
                fnGetOptionRateTicker(pBuySel, pOptionType);
            }
        }
        else if(pOptionType === "PE"){
            console.log("PE Trade to Open Waiting....!");
            if(gTrdExcPrc === true){
                setTimeout(fnInitiateManualOption11, 3000, pOptionType);
            }
            else{
                fnGetOptionRateTicker(pBuySel, pOptionType);
            }
        }
        else{
            fnGenMessage("Invalid Option Type!", "badge bg-warning", "spnGenMsg");
        }
    }
}

function fnReconnectWS(){
    let objSpotPrice = document.getElementById("hidSpotPrice");
    let objIdxStream = JSON.parse(localStorage.getItem("IdxStream"));
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

    if(objCurrPos !== null){
        if(objCurrPos.TradeData[0].OptionType === "CE"){
            gActTrdCE = true;
            gActTrdPE = false;
        }
        else if(objCurrPos.TradeData[0].OptionType === "PE"){
            gActTrdCE = false;
            gActTrdPE = true;
        }
        else{
            gActTrdCE = false;
            gActTrdPE = false;
            gTrdExcPrc = false;
        }
    }
    else{
        gActTrdCE = false;
        gActTrdPE = false;
        gTrdExcPrc = false;
    }

    if(objKNeoWS.readyState === 1){
        if(objIdxStream !== null){
            fnSubFeeds('ifs', objIdxStream.StreamObj, objIdxStream.Channel);
            console.log("Streaming Live.....");
        }
        else{
            fnGetSpotOptionsByStep();
        }
    }
    else{
        fnConnectionWS();
        console.log("WS Connecting.....");
    }
}

async function fnGetOptionRateTicker(pBuySel, pOptionType){
    gTrdExcPrc = true;

    let objSpotOptionCE = document.getElementById("hidSpotOptionCE");
    let objSpotOptionPE = document.getElementById("hidSpotOptionPE");
    let objTokenCE = document.getElementById("hidTokenCE");
    let objTokenPE = document.getElementById("hidTokenPE");
    let objTrdSymCE = document.getElementById("hidTrdSymbolCE");
    let objTrdSymPE = document.getElementById("hidTrdSymbolPE");
    let objExcSeg = document.getElementById("hidExSeg");
    let objExpiry2Epoch = document.getElementById("hidExpiryEPoch");
    let objCurrRate = document.getElementById("txtCurrentRate");
    let vChannel = 2;
    let vStreamObj = "";

    let objStreamLS = JSON.parse(localStorage.getItem("OptStream"));
    // console.log(objStreamLS);

    if(objKNeoWS.readyState === 0){
        fnConnectionWS();
    }

    if(objStreamLS !== null){
        fnUnSubTickerData('mwu', objStreamLS.StreamObj, objStreamLS.Channel);
        objCurrRate.value = "";
    }

    if(pOptionType === "CE"){
        if(objTokenCE.value === ""){
            clearInterval(gInnTrdInrvl);
            console.log("Waiting for CE Token.....");
            gInnTrdInrvl = setInterval(fnGetOptionRateTicker, 2000, pBuySel, pOptionType);
        }
        else{
            let vStreamObj = objExcSeg.value + "|" + objTokenCE.value;
            let objStream = { Segment : objExcSeg.value, Token : objTokenCE.value, SpotOption: objSpotOptionCE.value, TradeSymbol: objTrdSymCE.value, EPoch: objExpiry2Epoch.value, Channel : vChannel, StreamObj : vStreamObj };
            localStorage.setItem("OptStream", JSON.stringify(objStream));

            fnSubFeeds('mws', vStreamObj, vChannel);
            clearInterval(gInnTrdInrvl);

            fnExecOptionTrade(pBuySel, pOptionType);
        }
    }
    else if(pOptionType === "PE"){
        if(objTokenPE.value === ""){
            clearInterval(gInnTrdInrvl);
            console.log("Waiting for PE Token.....");
            gInnTrdInrvl = setInterval(fnGetOptionRateTicker, 2000, pBuySel, pOptionType);
        }
        else{
            let vStreamObj = objExcSeg.value + "|" + objTokenPE.value;
            let objStream = { Segment : objExcSeg.value, Token : objTokenPE.value, SpotOption: objSpotOptionPE.value, TradeSymbol: objTrdSymPE.value, EPoch: objExpiry2Epoch.value, Channel : vChannel, StreamObj : vStreamObj };
            localStorage.setItem("OptStream", JSON.stringify(objStream));

            fnSubFeeds('mws', vStreamObj, vChannel);
            clearInterval(gInnTrdInrvl);

            fnExecOptionTrade(pBuySel, pOptionType);
        }
    }
    else{
        console.log("No Option Provided....................");
    }
}

async function fnExecOptionTrade(pBuySel, pOptionType){
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objClientId = document.getElementById("txtMobileNo");
    let objOptQty = document.getElementById("txtOptionsQty");
    let objMaxQty = document.getElementById("hidMaxQty");
    let objLossBadge = document.getElementById("spnLossTrd");
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objStreamLS = JSON.parse(localStorage.getItem("OptStream"));

    try{
        if(gIsTraderLogin === false){
            fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
        }
        else if(objOptQty.value === "" || objOptQty.value <= 0){
            fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
        }
        else if(objCurrPos !== null){
            fnGenMessage("Trade is Already Open....", `badge bg-danger`, "spnGenMsg");
        }
        else{
            let objSearchSymbol = document.getElementById("hidSearchSymbol");
            let objOptExpiry = document.getElementById("ddlOptionsExpiry");
            let objStopLoss = document.getElementById("txtOptionsSL1");
            let objTakeProfit = document.getElementById("txtOptionsTP1");
            let objCurrRate = document.getElementById("txtCurrentRate");
            let objLotSize = document.getElementById("txtOptionLotSize");

            let vRndStrkByOptStep, vTrdToken, vTrdSymbol, vExpiry2Epoch, vExSeg = "";

            if(objCurrRate.value === ""){
                vRndStrkByOptStep = objStreamLS.SpotOption;
                vTrdToken = objStreamLS.Token;
                vTrdSymbol = objStreamLS.TradeSymbol;
                vExpiry2Epoch = objStreamLS.EPoch;
                vExSeg = objStreamLS.Segment;

                clearInterval(gInnTrdInrvl);
                console.log("Waiting for Current Rate.....");
                gInnTrdInrvl = setInterval(fnExecOptionTrade, 2000, pBuySel, pOptionType);

            }
            else{
                clearInterval(gInnTrdInrvl);

                vRndStrkByOptStep = objStreamLS.SpotOption;
                vTrdToken = objStreamLS.Token;
                vTrdSymbol = objStreamLS.TradeSymbol;
                vExpiry2Epoch = objStreamLS.EPoch;
                vExSeg = objStreamLS.Segment;

                let objNrmlOrdr = await fnPlaceOptNrmlOrdr(objHsServerId.value, objSid.value, objAccessToken.value, objKotakSession.value, objOptQty.value, objLotSize.value, vTrdToken, vExSeg, pBuySel, vTrdSymbol, pOptionType, objSearchSymbol.value, vRndStrkByOptStep, objCurrRate.value, objMaxQty.value);
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

                    localStorage.setItem("KotakCurrOptPosiS", objExcTradeDtls);
                    localStorage.setItem("QtyMulR", objNrmlOrdr.data.Quantity);
                    objLossBadge.style.visibility = "hidden";

                    fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                    console.log("Trade Executed....................");

                    if(pOptionType === "CE"){
                        gActTrdCE = true;
                    }
                    else if(pOptionType === "PE"){
                        gActTrdPE = true;
                    }

                    gTrdExcPrc = false;

                    fnSetInitOptTrdDtls();
                    await fnSleep(3000);
                }
                else{
                    fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                }
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

        fetch("/kotakNeo/getToken4OptRate", objRequestOptions)
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

        fetch("/kotakNeo/placeOptNrmlOrder", objRequestOptions)
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

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value }),
        redirect: 'follow'
    };

    fetch("/kotakNeo/getOrderBook", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success"){
            console.log(objResult.data);

            // for (let i = 0; i < objResult.data.data.length; i++){
            //     if(objResult.data.data[i].nOrdNo === "241104001073285"){
            //         if(objResult.data.data[i].ordSt === "rejected"){

            //             fnGenMessage(objResult.data.data[i].rejRsn, `badge bg-warning`, "spnGenMsg");
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

    fetch("/kotakNeo/getTradeBook", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success"){
            let objTodayTradeList = document.getElementById("divTodayTrades");
            console.log(objResult);

            if(objResult.data === null || objResult.data === ""){

                objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
            }
            else{
                let vTempHtml = "";
                let vNetProfit = 0;
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
                    vTempHtml += '<tr>';

                    vTempHtml += '<td style="text-wrap: nowrap;">' + objResult.data.data[i].exTm + '</td>';
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
                });

                vNetProfit = vSellAmt - vBuyAmt - vTotalCharges;
                vTempHtml += '<tr><td>Total Trades </td><td>' + vTotalTrades + '</td><td colspan="3" style="text-align:right;font-weight:bold;color:orange;">Net PL</td><td colspan="3" style="text-align:left;font-weight:bold;color:orange;">' + vNetProfit.toFixed(2) + '</td><td></td><td style="font-weight:bold;text-align:right;color:red;">' + vTotalCharges + '</td><td style="font-weight:bold;text-align:right;color:red;">' + vHighCapital.toFixed(2) + '</td></tr>';

                objTodayTradeList.innerHTML = vTempHtml;
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
    //localStorage.removeItem("NseCashVars");
    // localStorage.removeItem("TradesListS");
    localStorage.removeItem("StartLotNoR");
    localStorage.removeItem("QtyMulR");
    localStorage.removeItem("TotLossAmtR");
    localStorage.removeItem("msgsCI");
    localStorage.removeItem("TraderTab");
    // localStorage.removeItem("UserDetS");
    // localStorage.setItem("TradeStep", 0);
    // localStorage.removeItem("ConfStepsS");
    clearInterval(vTradeInst);

    console.log("Curr Posi: " + localStorage.getItem("KotakCurrPosiS"));
    fnSetTodayOptTradeDetails();
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
    fnCheckOptionStatus();
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
        // fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        console.log("Position is Open, Keep Watching...")
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
        // fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        console.log("Position is Open, Keep Watching...")
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
            alert();
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
    let vUrl = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
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

function fnCloseWS(objSocket){
    // console.log("Sess: " + userKotakWS)
    if(objSocket === ""){
        console.log("No Connection is Open!");
    }
    else{
        objSocket.close();
        console.log("Connection is Closed!");
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

    fetch("/kotakNeo/placeCloseTrade", objRequestOptions)
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
    // console.log("Avg Prc: " + pAvgPrice);
    // console.log("Buy Prc: " + gBuyPrice);
    // console.log("Sell Prc: " + gSellPrice);
    // console.log("Qty: " + gQty);
    // console.log("Lot Size: " + gLotSize);
    // console.log("Trans Type: " + gByorSl);

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
    // console.log("A-PL: " + vAmtPL);
    // console.log("Old Loss Amt: " + vOldLossAmt);

    let vNewLossAmt = parseFloat(vOldLossAmt) + parseFloat(vAmtPL);

    // console.log("New Loss Amt: " + vNewLossAmt);

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
            let objCurrRate = document.getElementById("txtCurrentRateView");
            
            let vRndStrkByOptStep = await fnGetRoundedStrikeByOptStep(pOptionType, objSpotOption.value, objDdlOptionStep.value, objStrikeInterval.value);
            
            let vExpiry2Epoch = await fnGetEpochBySegmentSeldExpiry(objSegment.value, objOptExpiry.value);

            let objTokenDtls = await fnGetTokenDetails4Option(objJsonFileName.value, objSearchSymbol.value, pOptionType, vExpiry2Epoch, vRndStrkByOptStep);

            if(objTokenDtls.status === "success"){

                fnGetCurrRateStreamView(objTokenDtls.data.ExchSeg, objTokenDtls.data.Token, objCurrRate);
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
    let vChannelNo = 10;

    if(objKotakSession.value !== ""){
        let vUrl = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
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
            fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
            //fnLogTA("[Socket]: Error !\n");
        }

        userKotakWS.onmessage = function (msg) {
            const result= JSON.parse(msg);
            
            // alert(result[0].name);
            if((result[0].name === "sf")){
                if(result[0].ltp !== undefined){
                    objRateTxt.value = result[0].ltp;
                    //objSpot.value = result[0].iv;
                    // resumeandpause('cp', '1');
                }
            }

            if(result[0].type === "cn"){
                fnSubscribeScript('mws', vStreamObj, vChannelNo);
            }
        }
    }
}

function fnGetCurrRateStreamView(pExchSeg, pToken, objRateTxt){
    let vStreamObj = pExchSeg + "|" + pToken;

    let objKotakSession = document.getElementById("txtKotakSession");
    let objSid = document.getElementById("txtSid");
    let vChannelNo = 10;

    if(objKotakSession.value !== ""){
        let vUrl = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
        wssViewRate = new HSWebSocket(vUrl);
        //console.log(vChannelNo);

        wssViewRate.onopen = function () {
            //fnGenMessage("Connection is Open!", `badge bg-success`, "spnGenMsg");
            //fnLogTA('[Socket]: Connected to "' + vUrl + '"\n');
            let jObj = {};
            jObj["Authorization"] = objKotakSession.value;
            jObj["Sid"] = objSid.value; 
            jObj["type"] = "cn";
            wssViewRate.send(JSON.stringify(jObj));
        }

        wssViewRate.onclose = function () {
            // objDdlOptSym.value = 0;
            // fnGetSelSymbolData(0);
            objRateTxt.value = "";
            //fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
            //fnLogTA("[Socket]: Disconnected !\n");
        }

        wssViewRate.onerror = function () {
            objRateTxt.value = "";
            fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
            //fnLogTA("[Socket]: Error !\n");
        }

        wssViewRate.onmessage = function (msg) {
            const result= JSON.parse(msg);
            
            // alert(result[0].name);
            if((result[0].name === "sf")){
                if(result[0].ltp !== undefined){
                    objRateTxt.value = result[0].ltp;
                    //objSpot.value = result[0].iv;
                    // resumeandpause('cp', '1');
                }
            }

            if(result[0].type === "cn"){
                fnSubscribeRateView('mws', vStreamObj, vChannelNo);
            }
        }
    }
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
    let objCurrRate = document.getElementById("txtCurrentRate");

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
            objSellPrice.innerHTML = "<span class='blink'>" + objCurrRate.value + "</span>";

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

        fnSet50PrctQty();
        fnLoadOptTimerSwitchSetting();

        fnGenMessage("<span class='blink'>Position Is Open</span>", `badge bg-warning`, "btnPositionStatus");
    }
}

function fnRestartOptionStream(){
    let objStreamLS = JSON.parse(localStorage.getItem("OptStream"));
    let objCurrRate = document.getElementById("txtCurrentRate");
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

    if(objCurrPos !== null){
        if(objCurrPos.TradeData[0].OptionType === "CE"){
            gActTrdCE = true;
            gActTrdPE = false;
        }
        else if(objCurrPos.TradeData[0].OptionType === "PE"){
            gActTrdCE = false;
            gActTrdPE = true;
        }
        else{
            gActTrdCE = false;
            gActTrdPE = false;
            gTrdExcPrc = false;
        }
    }
    else{
        gActTrdCE = false;
        gActTrdPE = false;
        gTrdExcPrc = false;
    }

    if(objCurrPos !== null){
        if(objStreamLS !== null){
            fnUnSubTickerData('mwu', objStreamLS.StreamObj, objStreamLS.Channel);
            objCurrRate.value = "";
            fnSubFeeds('mws', objStreamLS.StreamObj, objStreamLS.Channel);
        }
        else{
            fnGenMessage("No Option Data for Streaming...", `badge bg-warning`, "spnGenMsg");
        }
    }
    else{
            fnGenMessage("No Open Position to Stream...", `badge bg-warning`, "spnGenMsg");
    }
}

function fnStartStreamOptPrc(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let vStreamObj = "";
    let objLTP = document.getElementById("txtCurrentRate");

    let objKotakSession = document.getElementById("txtKotakSession");
    let objSid = document.getElementById("txtSid");
    let vChannelNo = 1;

    if((objKotakSession.value !== "") && (objCurrPos !== null)){
        vStreamObj = objCurrPos.TradeData[0].ExchSeg + "|" + objCurrPos.TradeData[0].SymToken;

        let vUrl = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
        userKotakWS = new HSWebSocket(vUrl);
        //console.log(vChannelNo);

        userKotakWS.onopen = function () {
            // fnGenMessage("Connection is Open!", `badge bg-success`, "spnGenMsg");
            console.log("Streaming Connection is Open!");
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
            // fnGenMessage("Option Streaming Connection is Closed!", `badge bg-warning`, "spnGenMsg");
            console.log("Streaming Connection is Closed!");
            // userKotakWS.open();
            //fnLogTA("[Socket]: Disconnected !\n");
            if (objCurrPos !== null){
                fnStartStreamOptPrc();
            }
        }

        userKotakWS.onerror = function () {
            objLTP.value = "";
            // fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
            console.log("Error in Streaming!");
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
            console.log("Streaming Msg Sent!");
        }
    }
}

function fnLoadOptTimerSwitchSetting(){
    // startTime = performance.now();
    let vTimerSwitchS = localStorage.getItem("TimerSwtS");
    let objTimerSwitch = document.getElementById("swtAutoChkPosition");

    if (vTimerSwitchS === "true") {
        objTimerSwitch.checked = true;
    }
    else {
        objTimerSwitch.checked = false;
    }
    fnCheckOptionStatus();
}

function fnCheckOptionStatus(){
    var objTimerSwitch = document.getElementById("swtAutoChkPosition");
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

    if (objCurrPos !== null){
        if (objTimerSwitch.checked){
            localStorage.setItem("TimerSwtS", "true");
            switch(gByorSl){
                case "B":
                    fnCheckOptBuyingPosition();
                    break;
                case "S":
                    fnCheckOptSellingPosition();
                    break;
                default:
                    fnGenMessage("Invalid Transaction Type, Please Check!", `badge bg-danger`, "spnGenMsg");

                }
            fnGenMessage("Auto Check for Current Price is On!", `badge bg-success`, "spnGenMsg");
        }
        else{
            let vLTP = document.getElementById("txtCurrentRate");
            let objSellPrice = document.getElementById("lblSellPrice");
            let objProfitLoss = document.getElementById("lblProfitLoss");

            objSellPrice.innerHTML = "<span class='blink'>" + vLTP.value + "</span>";
            let vPLVal = ((parseFloat(vLTP.value) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
            objProfitLoss.innerText = vPLVal;

            localStorage.setItem("TimerSwtS", "false");
            fnGenMessage("Auto Check for Current Price is Off!", `badge bg-danger`, "spnGenMsg");
            setTimeout(fnCheckOptionStatus, 3000);
        }
    }
    else{
        if (objTimerSwitch.checked){
            localStorage.setItem("TimerSwtS", "true");
        }
        else{
            localStorage.setItem("TimerSwtS", "false");
        }

        console.log("No Open Trade, Will start when the trade is Open");
        fnGenMessage("No Open Trade, Will start when the trade is Open", `badge bg-warning`, "spnGenMsg");
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

        fetch("/kotakNeo/getBackupRate", objRequestOptions)
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

    if(vLTP.value === ""){
        console.log("Waiting for LTP at OptBuyPos....");
        setTimeout(fnCheckOptionStatus, 2000);
    }

    objSellPrice.innerHTML = "<span class='blink'>" + vLTP.value + "</span>";
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
            // fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
            console.log("Position is Open, Keep Watching...")
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
            // fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
            setTimeout(fnCheckOptionStatus, 2000);
            console.log("Position is Open, Keep Watching...")
        }

        break;
    }
    // const endTime = performance.now();
    // console.log('It took ' + (endTime - startTime) + ' ms.');
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
        // fnGenMessage("Position is Open, keep watching...", `badge bg-warning`, "spnGenMsg");
        console.log("Position is Open, Keep Watching...")
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

            let objClsTrd = await fnInitClsOptPaperTrade(v50PrctQty);

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

function fnCloseOptTrade11(pMsg){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let pOptType = ""; 

    if(objCurrPos !== null){
        pOptType = objCurrPos.TradeData[0].OptionType;
    }
    else{
        pOptType = "";
    }

    if(pOptType === pMsg.OptionType){
        console.log("CE Trade to Close Waiting..!");

        if(gTrdExcPrc === true){
            setTimeout(fnCloseOptTrade11, 3000, pOptType);
        }
        else{
            fnCloseOptTrade();
        }
    }
    else if(pOptType === pMsg.OptionType){
        console.log("PE Trade to Close Waiting..!");

        if(gTrdExcPrc === true){
            setTimeout(fnCloseOptTrade11, 3000, pOptType);
        }
        else{
            fnCloseOptTrade();
        }
    }
    else{
        console.log("No Open Position to Close!");
    }
}

async function fnCloseOptTrade(){
    gTrdExcPrc = true;

    if(gActTrdCE === true){
        let objClsTrd = await fnInitClsOptPaperTrade(0);

        if(objClsTrd.status === "success"){
            await fnSleep(3000);
            gActTrdCE = false;
            gTrdExcPrc = false;
            console.log("CE Close Trade Executed!");
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
        }
        else{
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
        }
    }
    else if(gActTrdPE === true){
        let objClsTrd = await fnInitClsOptPaperTrade(0);

        if(objClsTrd.status === "success"){
            await fnSleep(3000);
            gActTrdPE = false;
            gTrdExcPrc = false;
            console.log("PE Close Trade Executed!");
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
        }
        else{
            fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
        }
    }
    else{
        console.log("No PE or CE Trade is Open to Close!");
    }
    gTrdExcPrc = false;

    // try{
    //     let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

    //     if (objCurrPos === null){
    //         fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
    //     }
    //     else{
    //         let objClsTrd = await fnInitClsOptPaperTrade(0);

    //         if(objClsTrd.status === "success"){
    //             fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    //         }
    //         else{
    //             fnGenMessage(objClsTrd.message, `badge bg-${objClsTrd.status}`, "spnGenMsg");   
    //         }
    //     }
    // }
    // catch(err){
    //     fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    // }
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
            // clearInterval(vTradeInst);
            // clearInterval(gStreamInst);
            localStorage.removeItem("KotakCurrOptPosiS");

            fnResetOpenPositionDetails();

            fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
        }
        else{
            // localStorage.setItem("QtyMulR", vToCntuQty);
            objCurrPos.TradeData[0].Quantity = vToCntuQty;
            objCurrPos.TradeData[0].SellPrice = document.getElementById("txtCurrentRate").value;
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

    fetch("/kotakNeo/placeCloseOptTrade", objRequestOptions)
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
    let vStartLots = localStorage.getItem("StartLotNoR");

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
            let vDivAmt, vNextQty = 0;
            if(parseFloat(vOldLossAmt) !== 0){
                vDivAmt = parseFloat(vNewLossAmt) / parseFloat(vOldLossAmt);
                vNextQty = Math.round(vDivAmt * parseInt(vOldQtyMul));
            }
            else{
                vNextQty = vStartLots;
            }
            // console.log("vDivAmt: " + vDivAmt);
            // console.log("vNextQty: " + vNextQty);
            if(vNextQty <= 1)
                vNextQty = vStartLots;

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
    let objHeadPL = document.getElementById("tdHeadPL");
    let objYtRL = document.getElementById("spnYtRL");
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
                
        vTempHtml += '<tr><td colspan="9"></td><td>Yet to Recover: </td><td Style="text-align:right;font-weight:bold;">' + parseFloat(localStorage.getItem("TotLossAmtR")).toFixed(2) + '</td></tr>'
        objTodayTradeList.innerHTML = vTempHtml;

        objYtRL.innerText = parseFloat(localStorage.getItem("TotLossAmtR")).toFixed(2);

        if(vNetProfit < 0){
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:red;">' + (vNetProfit).toFixed(2) + '</span>';
        }
        else{
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:green;">' + (vNetProfit).toFixed(2) + '</span>';
        }
    }

    // if(vNetProfit >= 15000){
    //     localStorage.setItem("isAutoPaperTrader", "true");
    //     $('#btnAutoTraderStatus').trigger('click');
    // }
    fnCloseOpenStream();
}

function fnCloseOpenStream(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objSpotPrice = document.getElementById("hidSpotPrice");
    let objStreamLS = JSON.parse(localStorage.getItem("OptStream"));
    let objCurrRate = document.getElementById("txtCurrentRate");

    if(objSpotPrice.value === ""){
        console.log("Waiting for Spot Price.......");
        setTimeout(fnCloseOpenStream, 3000);
    }
    else{
        if((objStreamLS !== null) && (objCurrPos === null)){
            fnUnSubTickerData('mwu', objStreamLS.StreamObj, objStreamLS.Channel);
            objCurrRate.value = "";
            localStorage.removeItem("OptStream");
        }
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
        let vChannelNo = 20;

        if(objKotakSession.value !== ""){
            let vUrl = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
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
                //reject({ "status": "warning", "message": "1 Time Connection is Closed!", "data": "" });
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
                        unSub1TimeOptRate('mwu', vStreamObj, vChannelNo);

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
    //fnGetOrderBook();
    fnGetTradeBook();
}

function fnGetSetAutoPaperTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoPaperTrader");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(gIsTraderLogin === true && isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoPaperTrader", false);
    }
}

function fnGetSetPaperTraderLoginStatus(){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    let lsKotakConsumerKey = localStorage.getItem("lsKotakConsumerKey");
    let lsKotakConsumerSecret = localStorage.getItem("lsKotakConsumerSecret");
    let lsKotakUserNameAPI = localStorage.getItem("lsKotakUserNameAPI");
    let lsKotakPasswordAPI = localStorage.getItem("lsKotakPasswordAPI");

    let lsKotakLoginID = localStorage.getItem("lsKotakMobileNo");
    let lsKotakPassword = localStorage.getItem("lsKotakPassword");
    let lsKotakMpin = localStorage.getItem("lsKotakMpin");

    let lsSessionID = localStorage.getItem("lsKotakNeoSession");
    let lsViewToken = localStorage.getItem("lsKotakViewToken");
    let lsAccessToken = localStorage.getItem("lsKotakAccessToken");
    let lsSub = localStorage.getItem("lsKotakSub");
    let lsSid = localStorage.getItem("lsKotakSid");
    let lsHsServerID = localStorage.getItem("lsKotakHsServerId");

    let objClientId = document.getElementById("txtMobileNo");
    let objKotakPassword = document.getElementById("txtPassword");
    let objKotakMpin = document.getElementById("txtMpin");

    let objSession = document.getElementById("txtKotakSession");
    let objViewToken = document.getElementById("txtViewToken");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objSubUserId = document.getElementById("txtSubUserId");
    let objSid = document.getElementById("txtSid");
    let objHsServerId = document.getElementById("txtHsServerId");
    
    let objTraderStatus = document.getElementById("btnTraderStatus");

    const vDate = new Date();
    let vToday = vDate.getDate();

    objClientId.value = lsKotakLoginID;

    objSession.value = lsSessionID;
    objViewToken.value = lsViewToken;
    objAccessToken.value = lsAccessToken;
    objSid.value = lsSid;
    objSubUserId.value = lsSub;
    objHsServerId.value = lsHsServerID;

    if (bAppStatus === "false") {
        localStorage.removeItem("lsKotakNeoSession");
        localStorage.removeItem("lsKotakViewToken");
        localStorage.removeItem("lsKotakAccessToken");
        localStorage.removeItem("lsKotakSub");
        localStorage.removeItem("lsKotakSid");
        localStorage.removeItem("lsKotakHsServerId");
        gIsTraderLogin = false;
        objSession.value = "";
    }

    if (objSession.value == "") {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
        gIsTraderLogin = false;
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        gIsTraderLogin = true;
    }
    fnGetSetAutoPaperTraderStatus();
    fnGetSetAllStatus();
}

function fnShowPaperTraderLoginMdl(objThis){
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
        fnGetSetPaperTraderLoginStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnLoginKotakNeo(){
    let objConsumerKey = document.getElementById("txtConsumerKey");
    let objConsumerSecret = document.getElementById("txtConsumerSecret");
    let objUserNameAPI = document.getElementById("txtUserNameAPI");
    let objPasswordAPI = document.getElementById("txtPasswordAPI");
    let objMobileNo = document.getElementById("txtMobileNo");
    let objPassword = document.getElementById("txtPassword");
    let objMpin = document.getElementById("txtMpin");

    let objKotakSession = document.getElementById("txtKotakSession");
    let objViewToken = document.getElementById("txtViewToken");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objSubUserId = document.getElementById("txtSubUserId");
    let objSid = document.getElementById("txtSid");
    let objHsServerId = document.getElementById("txtHsServerId");

    let objCurrMargin = document.getElementById("txtCurrMargin");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ConsumerKey" : objConsumerKey.value,
        "ConsumerSecret" : objConsumerSecret.value,
        "UserNameAPI" : objUserNameAPI.value,
        "PasswordAPI" : objPasswordAPI.value,
        "MobileNo" : objMobileNo.value,
        "Password" : objPassword.value,
        "Mpin" : objMpin.value
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    if(objConsumerKey.value === ""){
        fnGenMessage("Please Enter Consumer Key", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objConsumerSecret.value === ""){
        fnGenMessage("Please Enter Consumer Secret", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objMobileNo.value === ""){
        fnGenMessage("Please Enter Mobile No", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objPassword.value === ""){
        fnGenMessage("Please Enter Password", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objMpin.value === ""){
        fnGenMessage("Please Enter Mobile Pin", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else{
        fetch("/kotakSpeed/getLoginDetails", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                objKotakSession.value = objResult.data.Session;
                objViewToken.value = objResult.data.ViewToken;
                objAccessToken.value = objResult.data.AccessToken;
                objSubUserId.value = objResult.data.SubUserId;
                objSid.value = objResult.data.Sid;
                objHsServerId.value = objResult.data.HsServerId;

                objCurrMargin.value = objResult.data.Limits.Net;

                localStorage.setItem("lsKotakMobileNo", objMobileNo.value);
                localStorage.setItem("lsKotakPassword", objPassword.value);
                localStorage.setItem("lsKotakMpin", objMpin.value);
                localStorage.setItem("lsKotakConsumerKey", objConsumerKey.value);
                localStorage.setItem("lsKotakConsumerSecret", objConsumerSecret.value);
                localStorage.setItem("lsKotakUserNameAPI", objUserNameAPI.value);
                localStorage.setItem("lsKotakPasswordAPI", objPasswordAPI.value);

                localStorage.setItem("lsKotakNeoSession", objKotakSession.value);
                localStorage.setItem("lsKotakViewToken", objViewToken.value);
                localStorage.setItem("lsKotakAccessToken", objAccessToken.value);
                localStorage.setItem("lsKotakSub", objSubUserId.value);
                localStorage.setItem("lsKotakSid", objSid.value);
                localStorage.setItem("lsKotakHsServerId", objHsServerId.value);
                localStorage.setItem("lsNetLimit", objCurrMargin.value);

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsLoginDate", vToday);

                $('#mdlKotakLogin').modal('hide');
                //fnChangeBtnProps("btnTraderStatus", "badge bg-success", "TRADER - Connected");
                fnGetSetPaperTraderLoginStatus();

                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger"){
                //console.log(objResult.data);
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnClearPrevLoginSession();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            fnClearPrevLoginSession();
            console.log('error inn: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnClearPrevLoginSession(){
  //let objSession = document.getElementById("txtKotakSession");
  gIsTraderLogin = false;
  localStorage.removeItem("lsLoginDate");
  localStorage.removeItem("lsKotakNeoSession");
  localStorage.removeItem("AppCredS");

  localStorage.removeItem("isAutoTrader");
  localStorage.removeItem("isDeltaAutoTrader");
  localStorage.removeItem("KotakUserDetS");
  //objSession.value = "";
  //fnChangeBtnProps("btnTraderStatus", "badge bg-danger", "Trader - Disconnected");
}



// ***** SAMPLE Stream for Testing ******//

function wconnect(typeFunction){
    var token = document.getElementById("txtAccessToken").value;
    var sid = document.getElementById("txtSid").value;
    var handshakeServerId = document.getElementById("txtHsServerId").value;
    
    if(typeFunction=='Hsi'){
        connectHsi(token, sid, handshakeServerId);    
        
    }
    else if(typeFunction=='Hsm'){
        connectHsm(token, sid);  
    }
        
    return;
}

function connectHsm(token, sid){
    let objIndexTick = document.getElementById("txtIndex");
    let objScriptTick = document.getElementById("txtScript");

    let url = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
    userWS = new HSWebSocket(url);
    console.log(document.getElementById('channel_number').value)


    userWS.onopen = function () {
        consoleLog('[Socket]: Connected to "' + url + '"\n');
        let jObj = {};
        jObj["Authorization"] = token;
        jObj["Sid"] = sid; 
        jObj["type"] = "cn";
        userWS.send(JSON.stringify(jObj));
    }

    userWS.onclose = function () {
        consoleLog("[Socket]: Disconnected !\n");
        wconnect("Hsm");
    }

    userWS.onerror = function () {
        consoleLog("[Socket]: Error !\n");
    }

    userWS.onmessage = function (msg) {
        const result= JSON.parse(msg);
        // console.log(result);
        consoleLog('[Res]: ' + msg + "\n");

        if((result[0].name === "if")){
            if(result[0].iv !== undefined){
                objIndexTick.value = result[0].iv;
            }
        }
        if((result[0].name === "sf")){
            if(result[0].ltp !== undefined){
                objScriptTick.value = result[0].ltp;
            }
        }

        if(result[0].type === "cn"){
            // wsub('ifs', 'sub_indices', '5');
            // setTimeout(wsub, 1000, 'mws', 'sub_scrips', '6');
            // wsub('mws', 'sub_scrips', '2');
        }
    }
}

function consoleLog(printLogs){
    const d = new Date();
    $('#stream_scrips').append(d + "\n");
    $('#stream_scrips').append(printLogs);
    $('#stream_scrips').append("\n" +"\n"); 
    var psconsole = $('#stream_scrips');

    if(psconsole.length)
       psconsole.scrollTop(psconsole[0].scrollHeight - psconsole.height());
}

resumeandpause11 = function(typeRequest, channel_number) {
    let jObj = {};
    jObj["type"] = typeRequest;
    jObj["channelnums"] = channel_number.split(',').map(function (val) { return parseInt(val, 10); })
    if (userWS != null) {
        let req = JSON.stringify(jObj);
        userWS.send(req);
    }
}

function wsub(typeRequest, scrips, pChannelNo){
    channel_number = pChannelNo; //$('#channel_number').val();
    scrips = $('#'+scrips).val();
    subscribe_scrip(typeRequest, scrips, channel_number); 
}

function wunsub(typeRequest, scrips, pChannelNo){
    channel_number = pChannelNo; //$('#channel_number').val();
    scrips = $('#'+scrips).val();
    unSubTicker(typeRequest, scrips, channel_number); 
}

function subscribe_scrip(typeRequest, scrips, channel_number){
    //  mws ifs dps 
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    if (userWS != null) {
        userWS.send(JSON.stringify(jObj));
    }
    else{
        console.log("Please Connect to Websocket.......")
    }
}

function unSubTicker(typeRequest, scrips, channel_number){
//mwu
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    if (userWS != null) {
        userWS.send(JSON.stringify(jObj));
    }
    else{
        console.log("Please Connect to Websocket.......")
    }    
}