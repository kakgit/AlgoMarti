    
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

    fnGetSetAppStatus();

    socket.on("c3mh", (pMsg) => {
        fnInnitiateAutoTrade(pMsg);
    });
});

function fnGetSetAllStatus(){
    if(gIsTraderLogin){
        fnSetRecentDates();
        fnGetSetUserProfileData();
        fnGetNseCashSettings();
        fnGetIndSymSettings();
        fnSetDefaultLotNos();
        fnLoadDefaultSLTP();
        fnSetLotsByQtyMulLossAmt();
        fnGetSetOptionStrike();
        fnSetInitOptTrdDtls();
        fnSetInitialTradeDetails();
        fnLoadTimerSwitchSetting();
        fnLoadOptTimerSwitchSetting();
        fnLoadMartiSwitchSettings();
        fnSetTodayOptTradeDetails();
    }
    else{
        fnClearTraderFields();
    }
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
                //fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
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

function fnInnitiateAutoTrade(pMsg){
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");

    if(isLsAutoTrader === "false"){
        fnGenMessage("Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
    }
    else{
        let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

        let objDdlOptSym = document.getElementById("ddlOptionsSymbols");
        objDdlOptSym.value = pMsg.Symbol;

        if (objCurrPos === null){
            fnGetSymb4AutoTrade(pMsg.OptionType);
        }
        else if(objCurrPos.TradeData[0].OptionType === pMsg.OptionType){
            fnGenMessage(pMsg.OptionType + " Position is already Open!", `badge bg-warning`, "spnGenMsg");
        }
        //alert(pMsg.OptionType);
        //fnInitiateCloseOptTrade();
    }
}

function fnGetSymb4AutoTrade(pOptionType){
    let objDdlOptSym = document.getElementById("ddlOptionsSymbols");
    let objFileName = document.getElementById("hidJsonFileName");
    let objSearchSymbol = document.getElementById("hidSearchSymbol");
    let objSpot = document.getElementById("hidSpotPrice");
    let objSegment = document.getElementById("hidSegment");
    let objLotSize = document.getElementById("txtOptionLotSize");
    let objStopLoss = document.getElementById("txtOptionsSL1");
    let objTakeProfit = document.getElementById("txtOptionsTP1");
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
            objStopLoss.value = gIndData.Symbol[i].StopLoss;
            objTakeProfit.value = gIndData.Symbol[i].TakeProfit;
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
        objStopLoss.value = "";
        objTakeProfit.value = "";
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
        let vChannelNo = 1;

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
                objDdlOptSym.value = 0;
                fnGetSelSymbolData();
                //fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
                //fnLogTA("[Socket]: Disconnected !\n");
            }

            userKotakWS.onerror = function () {
                objSpot.value = "";
                objSegment.value = "";
                fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
                //fnLogTA("[Socket]: Error !\n");
            }

            userKotakWS.onmessage = function (msg) {
                const result= JSON.parse(msg);
                
                // alert(result[0].name);
                if((result[0].name === "if")){
                    if(result[0].iv !== undefined){
                        objSpot.value = result[0].iv;
                        resumeandpause('cp', '1');
                        fnGetSpotOption();
                        fnInitiateManualOption("B", pOptionType);
                    }
                }

                if(result[0].type === "cn"){
                    fnSubscribeScript('ifs', vStreamObj, vChannelNo);
                }
            }
        }
    }
}

function fnClearTraderFields(){
    fnGetNseCashSettings();
    // fnGetIndSymSettings();
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
    let objQty = document.getElementById("txtManualQty");
    let objOptQty = document.getElementById("txtOptionsQty");
    let vTotLossAmt = localStorage.getItem("TotLossAmtR");

    // console.log("Q: " + vQtyMul);
    
    if (vQtyMul === null || vQtyMul === "") {
        localStorage.setItem("QtyMulR", vStartLots);
        objQty.value = vStartLots;
        objOptQty.value = vStartLots;
    }
    // else if(parseInt(vStartLots) > parseInt(objQty.value)){
    //     alert();
    //     localStorage.setItem("QtyMulR", vStartLots);
    //     objQty.value = vStartLots;
    // }
    else {
        objQty.value = vQtyMul;
        objOptQty.value = vQtyMul;
    }
    
    if (vTotLossAmt === null || vTotLossAmt === "") {
        localStorage.setItem("QtyMulR", vStartLots);
        localStorage.setItem("TotLossAmtR", 0);
        objQty.value = vStartLots;
        objOptQty.value = vStartLots;
    }
    else {
        objQty.value = vQtyMul;
        objOptQty.value = vQtyMul;
    }

    // console.log("QtyMul: " + vQtyMul);
    // console.log("TotLoss: " + vTotLossAmt);
}

function fnGetSelSymbolData(){
    let objDdlOptSym = document.getElementById("ddlOptionsSymbols");
    let objFileName = document.getElementById("hidJsonFileName");
    let objSearchSymbol = document.getElementById("hidSearchSymbol");
    let objSpot = document.getElementById("hidSpotPrice");
    let objSegment = document.getElementById("hidSegment");
    let objLotSize = document.getElementById("txtOptionLotSize");
    let objStopLoss = document.getElementById("txtOptionsSL1");
    let objTakeProfit = document.getElementById("txtOptionsTP1");
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
            objStopLoss.value = gIndData.Symbol[i].StopLoss;
            objTakeProfit.value = gIndData.Symbol[i].TakeProfit;
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
        objStopLoss.value = "";
        objTakeProfit.value = "";
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
        let vChannelNo = 1;

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
                objDdlOptSym.value = 0;
                fnGetSelSymbolData();
                //fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
                //fnLogTA("[Socket]: Disconnected !\n");
            }

            userKotakWS.onerror = function () {
                objSpot.value = "";
                objSegment.value = "";
                fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
                //fnLogTA("[Socket]: Error !\n");
            }

            userKotakWS.onmessage = function (msg) {
                const result= JSON.parse(msg);
                
                // alert(result[0].name);
                if((result[0].name === "if")){
                    if(result[0].iv !== undefined){
                        objSpot.value = result[0].iv;
                        resumeandpause('cp', '1');
                        fnGetSpotOption();
                    }
                }

                if(result[0].type === "cn"){
                    fnSubscribeScript('ifs', vStreamObj, vChannelNo);
                }
            }
        }
    }
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
    let objCurrPosiLst = localStorage.getItem("CurrPositionS");

    if (objCurrPosiLst === null)
    {
        fnExecOptionTrade(pBuySel, pOptionType);
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

    try{
        if(gIsTraderLogin === false){
            fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
        }
        else if(objSpotOption.value === ""){
            fnGenMessage("Select the Symbol to Get Current Rate", `badge bg-warning`, "spnGenMsg");
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
                            gAmtSL = (vAvgPrice - ((vAvgPrice * vPerSL)/100)).toFixed(2);
                            gAmtTP = (vAvgPrice + ((vAvgPrice * vPerTP)/100)).toFixed(2);
                        }
                        else if(gByorSl === "S"){
                            gAmtSL = (vAvgPrice + ((vAvgPrice * vPerSL)/100)).toFixed(2);
                            gAmtTP = (vAvgPrice - ((vAvgPrice * vPerTP)/100)).toFixed(2);                                
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

                        let vExcTradeDtls = { TradeData: [objNrmlOrdr.data] };

                        let objExcTradeDtls = JSON.stringify(vExcTradeDtls);
                        // console.log(objExcTradeDtls);
                        localStorage.setItem("KotakCurrOptPosiS", objExcTradeDtls);
                        localStorage.setItem("QtyMulR", objNrmlOrdr.data.Quantity);

                        fnGenMessage(objNrmlOrdr.message, `badge bg-${objNrmlOrdr.status}`, "spnGenMsg");
                        fnSetInitOptTrdDtls();
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
                console.log('error: ', error);
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

            if(objResult.data === null || objResult.data === ""){

                objTodayTradeList.innerHTML = '<div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div>';
            }
            else{
                let vTempHtml = "";
                let vNetProfit = 0;
                let vBuyAmt = 0;
                let vSellAmt = 0;
                const objRev = Object.keys(objResult.data.data).reverse();

                objRev.forEach(i => {
                    vTempHtml += '<tr>';

                    vTempHtml += '<td style="text-wrap: nowrap;">' + objResult.data.data[i].exTm + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objResult.data.data[i].trdSym + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objResult.data.data[i].trnsTp + '</td>';
                    vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objResult.data.data[i].fldQty + '</td>';
                    if(objResult.data.data[i].trnsTp === "B"){
                        vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + objResult.data.data[i].avgPrc + '</td>';
                        vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                        let vCapital = parseInt(objResult.data.data[i].fldQty) * parseFloat(objResult.data.data[i].avgPrc);
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">'+ vCapital.toFixed(2); +'</td>';

                        vBuyAmt += parseFloat(vCapital);
                    }
                    else if(objResult.data.data[i].trnsTp === "S"){
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + objResult.data.data[i].avgPrc + '</td>';
                        let vCapital = parseInt(objResult.data.data[i].fldQty) * parseFloat(objResult.data.data[i].avgPrc);
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCapital.toFixed(2); +'</td>';

                        vSellAmt += parseFloat(vCapital);
                    }
                    else{
                        vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                        vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                    }

                    vTempHtml += '</tr>';
                  //console.log(i, objResult.data.data[i]); 
                });

                // for (i = 0; i < objResult.data.data.length; i++) {
                //     vTempHtml += '<tr>';

                //     vTempHtml += '<td style="text-wrap: nowrap;">' + objResult.data.data[i].exTm + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objResult.data.data[i].trdSym + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objResult.data.data[i].trnsTp + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objResult.data.data[i].fldQty + '</td>';
                //     if(objResult.data.data[i].trnsTp === "B"){
                //     vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + objResult.data.data[i].avgPrc + '</td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                //     let vCapital = parseInt(objResult.data.data[i].fldQty) * parseFloat(objResult.data.data[i].avgPrc);
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">'+ vCapital.toFixed(2); +'</td>';

                //     vBuyAmt += parseFloat(vCapital);
                //     }
                //     else if(objResult.data.data[i].trnsTp === "S"){
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + objResult.data.data[i].avgPrc + '</td>';
                //     let vCapital = parseInt(objResult.data.data[i].fldQty) * parseFloat(objResult.data.data[i].avgPrc);
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">-'+ vCapital.toFixed(2); +'</td>';

                //     vSellAmt += parseFloat(vCapital);
                //     }
                //     else{
                //     vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;"> - </td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //     vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;"> - </td>';
                //     }

                //     vTempHtml += '</tr>';
                // }

                vNetProfit = vSellAmt - vBuyAmt;
                vTempHtml += '<tr><td colspan="5" Style="text-align:right;font-weight:bold;color:orange;">NET PROFIT & LOSS</td><td></td><td style="font-weight:bold;text-align:right;color:orange;">' + vNetProfit.toFixed(2); + '</td></tr>';

                objTodayTradeList.innerHTML = vTempHtml;

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
            fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
    });    
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

function fnChangeMarti(){
    let objMartiSwitch = document.getElementById("swtMartingale");

    localStorage.setItem("MartiSwtS", objMartiSwitch.checked);
    //alert(objMartiSwitch.checked);    
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
            fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
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
    if (userKotakWS != null) {
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
    let vChannelNo = 1;

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
            // fnGetSelSymbolData();
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
        objSymbolName.innerText = objCurrPos.TradeData[0].SearchSymbol;
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
        }
        else if(gByorSl === "S"){
            objLblBP.innerText = "CURR PRICE";
            objLblSP.innerText = "SELL PRICE";
            objBuyPrice.innerText = gSellPrice;
            objSellPrice.innerText = gSellPrice;

            gDiffSL = (gSellPrice - gAmtSL).toFixed(2);
            gDiffTP = (gSellPrice - gAmtTP).toFixed(2);
            objCapital.innerText = parseInt(gLotSize) * parseInt(gQty) * parseFloat(gSellPrice);
        }
        else{
            objCapital.innerText = "";
        }
        objProfitLoss.innerText = ((parseFloat(gSellPrice) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);

        fnStartStreamOptPrc();
        fnRestartStreamOptPrc();
        fnLoadOptTimerSwitchSetting();

        fnGenMessage("<span class='blink'>Position Is Open</span>", `badge bg-warning`, "btnPositionStatus");
    }
}

function fnStartStreamOptPrc(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let vStreamObj = objCurrPos.TradeData[0].ExchSeg + "|" + objCurrPos.TradeData[0].SymToken;
    let objLTP = document.getElementById("txtCurrentRate");

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
            fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
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
        }
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
        objOnTP.innerText = (gDiffTP * gLotSize * gQty).toFixed(2);

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
        console.log("Trail Afr TP: " + gCurrTSL);
        break;
        // default:
        //   code to be executed if n is different from case 1 and 2
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

function fnCloseOptTrade(){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));

    if (objCurrPos === null){
        fnGenMessage("No Open Positions to Close!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        fnInitiateCloseOptTrade();
    }
}

function fnInitiateCloseOptTrade(){
    let objHsServerId = document.getElementById("txtHsServerId");
    let objSid = document.getElementById("txtSid");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objKotakSession = document.getElementById("txtKotakSession");
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objLTP = document.getElementById("txtCurrentRate");

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
    // let vHeaders = new Headers();
    // vHeaders.append("Content-Type", "application/json");

    // let objRequestOptions = {
    //     method: 'POST',
    //     headers: vHeaders,
    //     body: JSON.stringify({ HsServerId: objHsServerId.value, Sid: objSid.value, AccessToken: objAccessToken.value, KotakSession: objKotakSession.value, SymToken: objCurrPos.TradeData[0].SymToken, TrdSymbol: objCurrPos.TradeData[0].TrdSymbol, BorS: vBuySell, LotSize: objCurrPos.TradeData[0].LotSize, OptQty: objCurrPos.TradeData[0].Quantity, ExchSeg: objCurrPos.TradeData[0].ExchSeg, MaxOptQty: objCurrPos.TradeData[0].MaxOrderQty }),
    //     redirect: 'follow'
    // };

    // fetch("/kotakNeo/placeCloseOptTrade", objRequestOptions)
    // .then(objResponse => objResponse.json())
    // .then(objResult => {
    //     if(objResult.status === "success"){
    //         console.log(objResult.data);

    //         // for (let i = 0; i < objResult.data.data.length; i++){
    //         //     if(objResult.data.data[i].nOrdNo === objResult.nOrdNo){
    //         //         if(objResult.data.data[i].ordSt === "rejected"){
    //         //             fnGenMessage("Close Order Rejected: " + objResult.data.data[i].rejRsn, `badge bg-danger`, "spnGenMsg");
    //         //         }
    //         //         else if(objResult.data.data[i].ordSt === "complete"){
                        
    //         //             clearInterval(vTradeInst);
    //         //             localStorage.removeItem("KotakCurrPosiS");
    //         //             fnResetOpenPositionDetails();
    //         //             fnSetNextTradeSettings(objResult.data.data[i].avgPrc);
    //         //             resumeandpause('cp', '1');
    //         //             fnGenMessage("Success: Position Closed.", `badge bg-success`, "spnGenMsg");
    //         //         }
    //         //         else{
    //         //             fnGenMessage("Order Not Found: " + objResult.data.data[i].rejRsn, `badge bg-danger`, "spnGenMsg");
    //         //         }
    //         //     }
    //         // }

    //         fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");            
    //     }
    //     else if(objResult.status === "danger"){
    //         fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
    //     }
    //     else if(objResult.status === "warning"){
    //         fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
    //     }
    //     else{
    //         fnGenMessage("Error to Fetch Option Details.", `badge bg-danger`, "spnGenMsg");
    //     }
    // })
    // .catch(error => {
    //     console.log('error: ', error);
    //     fnGenMessage("Error to Fetch with Option Details.", `badge bg-danger`, "spnGenMsg");
    // });
    //***** Uncomment for Real Trade and check code later ******//

    //******* Comment for Real Trade. Below is for only Paper Trade *****//

    let objTodayTrades = localStorage.getItem("OptTradesListS");

    objCurrPos.TradeData[0].ExitDT = vToday;
    objCurrPos.TradeData[0].SellPrice = objLTP.value;

    let vPL = ((parseFloat(objCurrPos.TradeData[0].SellPrice) - parseFloat(objCurrPos.TradeData[0].BuyPrice)) * parseFloat(objCurrPos.TradeData[0].Quantity) * parseFloat(objCurrPos.TradeData[0].LotSize)).toFixed(2);

    if (objTodayTrades === null || objTodayTrades === ""){
        objTodayTrades = {
            TradeList: [{ TradeID: objCurrPos.TradeData[0].TradeID, ClientID: objCurrPos.TradeData[0].ClientID, Symbol: objCurrPos.TradeData[0].SearchSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, OptionType: objCurrPos.TradeData[0].OptionType, Quantity: objCurrPos.TradeData[0].Quantity, LotSize: objCurrPos.TradeData[0].LotSize, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ProfitLoss: vPL, StopLoss: objCurrPos.TradeData[0].StopLoss, TakeProfit: objCurrPos.TradeData[0].TakeProfit, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday }]
        };
        objTodayTrades = JSON.stringify(objTodayTrades);
        localStorage.setItem("OptTradesListS", objTodayTrades);
    }
    else{
        let vExistingData = JSON.parse(objTodayTrades);
        vExistingData.TradeList.push({ TradeID: objCurrPos.TradeData[0].TradeID, ClientID: objCurrPos.TradeData[0].ClientID, Symbol: objCurrPos.TradeData[0].SearchSymbol, Expiry: objCurrPos.TradeData[0].Expiry, Strike: objCurrPos.TradeData[0].Strike, OptionType: objCurrPos.TradeData[0].OptionType, Quantity: objCurrPos.TradeData[0].Quantity, LotSize: objCurrPos.TradeData[0].LotSize, BuyPrice: objCurrPos.TradeData[0].BuyPrice, SellPrice: objCurrPos.TradeData[0].SellPrice, ProfitLoss: vPL, StopLoss: objCurrPos.TradeData[0].StopLoss, TakeProfit: objCurrPos.TradeData[0].TakeProfit, EntryDT: objCurrPos.TradeData[0].EntryDT, ExitDT: vToday });
        let vAddNewItem = JSON.stringify(vExistingData);
        localStorage.setItem("OptTradesListS", vAddNewItem);
    }
    clearInterval(vTradeInst);
    clearInterval(gStreamInst);

    localStorage.removeItem("KotakCurrOptPosiS");
    fnSetNextOptTradeSettings(objLTP.value);
    fnResetOpenPositionDetails();
    resumeandpause('cp', '1');
    fnSetTodayOptTradeDetails();
    fnGenMessage("Success: Option Position Closed.", `badge bg-success`, "spnGenMsg");
    fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");

    console.log("TB: " + localStorage.getItem("OptTradesListS"));
    console.log("CurrPos: " + localStorage.getItem("KotakCurrOptPosiS"));
}

function fnSetNextOptTradeSettings(pAvgPrice){
    let objQty = document.getElementById("txtOptionsQty");
    let vOldLossAmt = localStorage.getItem("TotLossAmtR");
    let vOldQtyMul = localStorage.getItem("QtyMulR");
    let objMartiSwitch = document.getElementById("swtMartingale");

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
        vAmtPL = ((parseFloat(pAvgPrice) - parseFloat(gBuyPrice)) * parseInt(gLotSize) * parseInt(gQty)).toFixed(2);
    }
    else if(gByorSl === "S"){
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
        localStorage.removeItem("TotLossAmtR");
        localStorage.removeItem("QtyMulR");
        // localStorage.setItem("TradeStep", 0);
        fnSetLotsByQtyMulLossAmt();
    }

    console.log("New Qty: " + localStorage.getItem("QtyMulR"));
}

function fnSetTodayOptTradeDetails(){
    let objTodayTrades = localStorage.getItem("OptTradesListS");
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");

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

            let vCapital = vJsonData.TradeList[i].LotSize * vJsonData.TradeList[i].Quantity * vJsonData.TradeList[i].BuyPrice;
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

    gStreamInst = setInterval(fnStartStreamOptPrc, 50000);
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
        let vChannelNo = 1;

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
                // fnGetSelSymbolData();
                objRateTxt.value = "";
                //fnGenMessage("Connection is Closed!", `badge bg-warning`, "spnGenMsg");
                reject({ "status": "warning", "message": "Connection is Closed!", "data": "" });
                //fnLogTA("[Socket]: Disconnected !\n");
            }

            userKotakWS.onerror = function () {
                objRateTxt.value = "";
                //fnGenMessage("Error in Socket Connection!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Socket Connection!", "data": "" });
                //fnLogTA("[Socket]: Error !\n");
            }

            userKotakWS.onmessage = function (msg) {
                const result= JSON.parse(msg);
                
                // alert(result[0].name);
                if((result[0].name === "sf")){
                    if(result[0].ltp !== undefined){
                        objRateTxt.value = result[0].ltp;
                        //objRateTxt.value = result[0].iv;
                        resumeandpause('cp', '1');

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
