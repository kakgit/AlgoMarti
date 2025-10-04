
let objDeltaWS = null;
let gCurrStrats = { StratsData : []};
let gCurrPos = { TradeData : []};
let gSubList = [];
let gUnSubList = [];
let gBrokerage = 0.015;
let gSymbBRateList = {};
let gSymbBDeltaList = {};
let gSymbSRateList = {};
let gSymbSDeltaList = {};
let gUpdPos = true;
let gPosChanged = false;
let gMaxProfit = 0;
let gMaxLoss = 0;
let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){
	fnGetAllStatus();
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
		// fnValidateDeltaLogin();
		fnGetSetAutoTraderStatus();	
		fnLoadCurrStrategies();
		fnLoadDefSymbol();
		// fnGetDates();
		fnLoadDefQty();
		fnLoadDefStrategy();
		fnLoadMaxPL();
		fnLoadCurrentTradePos();
		fnSubscribeInterval();
	}
}

function fnGetDates(){
	let objDateType = document.getElementById("ddlDateTypes");
	let vDateTypeM = JSON.parse(localStorage.getItem("DateTypeM"));

	if(vDateTypeM === null){
		objDateType.value = 1;
	}
	else{
		objDateType.value = vDateTypeM;
	}

	fnBuySellLegDates(objDateType.value);
}

function fnUpdateDates(){
	let objDateType = document.getElementById("ddlDateTypes");
	let vDateTypeM = JSON.parse(localStorage.getItem("DateTypeM"));

	fnBuySellLegDates(objDateType.value);
	localStorage.setItem("DateTypeM", JSON.stringify(objDateType.value));
}

function fnBuySellLegDates(pDateType){
	pDateType = parseInt(pDateType);

	let objSellLegDate = document.getElementById("txtSellLegDate");
	let objBuyLegDate = document.getElementById("txtBuyLegDate");

	const vToday = new Date();
	const vCurrDay = new Date(vToday);
	const vNextDay = new Date(vToday);
	const vHour = vToday.getHours();
  	const vCurrDayOfWeek = vToday.getDay();
	let vDaysUntilFriday = 5 - vCurrDayOfWeek;
	const vCurrFriday = new Date(vToday);
	const vNextFriday = new Date(vToday);
	const vYear = vToday.getFullYear();
	const vMonth = vToday.getMonth();
	let vLastDayOfMonth = new Date(vYear, vMonth + 1, 0);
	let vLastDayOfNextMonth = new Date(vYear, vMonth + 2, 0);

	if(pDateType === 0){
		if(vHour >= 17){
			let vCurrDate = new Date(vCurrDay.setDate(vToday.getDate() + 1));
			let vNextDate = new Date(vNextDay.setDate(vToday.getDate() + 2));

			objSellLegDate.value = fnSetDDMMYYYY(vCurrDate);
			objBuyLegDate.value = fnSetDDMMYYYY(vNextDate);
		}
		else{
			let vCurrDate = vToday;
			let vNextDate = new Date(vNextDay.setDate(vToday.getDate() + 1));

			objSellLegDate.value = fnSetDDMMYYYY(vCurrDate);
			objBuyLegDate.value = fnSetDDMMYYYY(vNextDate);
		}
	}
	else if(pDateType === 1){
		if(vCurrDayOfWeek >= 5){
			vCurrFriday.setDate(vToday.getDate() + vDaysUntilFriday + 7);
			vNextFriday.setDate(vToday.getDate() + vDaysUntilFriday + 14);
		}
		else{
			vCurrFriday.setDate(vToday.getDate() + vDaysUntilFriday);
			vNextFriday.setDate(vToday.getDate() + vDaysUntilFriday + 7);
		}

		objSellLegDate.value = fnSetDDMMYYYY(vCurrFriday);
		objBuyLegDate.value = fnSetDDMMYYYY(vNextFriday);
	}
	else if(pDateType === 2){
		while (vLastDayOfMonth.getDay() !== 5) { 
	    	vLastDayOfMonth.setDate(vLastDayOfMonth.getDate() - 1);
	  	}
		while (vLastDayOfNextMonth.getDay() !== 5) { 
	    	vLastDayOfNextMonth.setDate(vLastDayOfNextMonth.getDate() - 1);
	  	}
		objSellLegDate.value = fnSetDDMMYYYY(vLastDayOfMonth);
		objBuyLegDate.value = fnSetDDMMYYYY(vLastDayOfNextMonth);
	}
	else{
		objSellLegDate.value = "";
		objBuyLegDate.value = "";
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

function fnLoadDefSymbol(){
	let objDefSymM = JSON.parse(localStorage.getItem("DeltaDefSymb"));
	let objSelSymb = document.getElementById("ddlSymbols");

	if(objDefSymM === null){
		objDefSymM = "";
	}

	objSelSymb.value = objDefSymM;
	fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
	let objLotSize = document.getElementById("txtLotSize");

	localStorage.setItem("DeltaDefSymb", JSON.stringify(pThisVal));

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

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDeltaCal"));

    let objSellQty = document.getElementById("txtSellQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objStartQtyM === null){
    	objStartQty.value = 1;
    	objSellQty.value = 1;
    	localStorage.setItem("StartQtyNoDeltaCal", objStartQty.value);
    }
    else{
    	objStartQty.value = objStartQtyM;
    	objSellQty.value = objStartQtyM;
    }
}

function fnChangeStartQty(pThisVal){
    let objSellQty = document.getElementById("txtSellQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaCal", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaCal", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDeltaCal", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objSellQty.value = pThisVal.value;
        }
    }
}

function fnLoadMaxPL(){
	let vMaxProfit = JSON.parse(localStorage.getItem("DeltaMaxProfit"));
    let vMaxLoss = JSON.parse(localStorage.getItem("DeltaMaxLoss"));
    
    if(vMaxProfit === null){
    	vMaxProfit = gMaxProfit;
    }
    else{
    	gMaxProfit = vMaxProfit;
    }

    if(vMaxLoss === null){
    	vMaxLoss = gMaxLoss;
    }
    else{
    	gMaxLoss = vMaxLoss;
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCalPosiS"));

    gCurrPos = objCurrPos;

    if(gCurrPos === null){
        gCurrPos = { TradeData : []};
    }
    fnUpdateOpenPositions();
    fnLoadClosedTrades();
}

function fnLoadCurrStrategies(){
   	let objStrats = JSON.parse(localStorage.getItem("DeltaStrats"));
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

function fnLoadDefStrategy(){
   	let objDefStrat = JSON.parse(localStorage.getItem("DeltaDefStrat"));
   	let objStratsDDL = document.getElementById("ddlStrategy");

   	if(objDefStrat === null){
   		objStratsDDL.value = "";
   	}
   	else{
   		objStratsDDL.value = objDefStrat;
   	}

   	fnLoadStrategyDetails();
}

function fnSetStratDetails(pThisVal){
	localStorage.setItem("DeltaDefStrat", JSON.stringify(pThisVal));

   	fnLoadStrategyDetails();
}

function fnDelStrategy(){
   	let objStratID = document.getElementById("hidStratID");

   	if(objStratID.value === ""){
        fnGenMessage("No Strategy to Delete!", `badge bg-warning`, "spnGenMsg");
   	}
   	else{
   		if(confirm("Are You Sure You Want to Delete This Strategy?")){
   			let objSelData = null;
   			for(let i=0; i<gCurrStrats.StratsData.length; i++){
   				if(gCurrStrats.StratsData[i].StratID === parseInt(objStratID.value)){
   					objSelData = gCurrStrats.StratsData[i];
   				}
   			}
			gCurrStrats.StratsData.pop(objSelData);
			localStorage.setItem("DeltaStrats", JSON.stringify(gCurrStrats));
			localStorage.removeItem("DeltaDefStrat");
			fnLoadDefStrategy();
			fnLoadCurrStrategies();
	        fnGenMessage("Strategy Deleted!", `badge bg-success`, "spnGenMsg");
    		$('#mdlStrategyEditor').modal('hide');
   		}
   	}
}

function fnSaveStrategy(){
	gUpdPos = false;

   	let objStratID = document.getElementById("hidStratID");

   	if(objStratID.value === ""){
        fnGenMessage("No Strategy to Edit!", `badge bg-warning`, "spnGenMsg");
   	}
   	else{
   	   	let objStratName = document.getElementById("txtEditStratName");
	   	let objStratDesc = document.getElementById("taEditDescription");

	   	let objSellDeltaMinOC = document.getElementById("txtDeltaSellLegMin");
	   	let objSellDeltaMaxOC = document.getElementById("txtDeltaSellLegMax");
	   	let objSellQty = document.getElementById("txtSellQty");
	   	let objSellMultiplier = document.getElementById("ddlSellMultiplier");
	   	let objSellAdjDeltaTP = document.getElementById("txtDeltaSellLegProfit");
	   	let objSellAdjDeltaSL = document.getElementById("txtDeltaSellLegLoss");
	   	let objSellNewPosDelta = document.getElementById("txtDeltaSellNewPos");

	   	let objBuyDeltaMinOC = document.getElementById("txtDeltaBuyLegMin");
	   	let objBuyDeltaMaxOC = document.getElementById("txtDeltaBuyLegMax");
	   	let objBuyQty = document.getElementById("txtBuyQty");
	   	let objBuyMultiplier = document.getElementById("ddlBuyMultiplier");
	   	let objBuyAdjDeltaTP = document.getElementById("txtDeltaBuyLegProfit");
	   	let objBuyAdjDeltaSL = document.getElementById("txtDeltaBuyLegLoss");
	   	let objBuyNewPosDelta = document.getElementById("txtDeltaBuyNewPos");

   		for(let i=0; i<gCurrStrats.StratsData.length; i++){
   			if(gCurrStrats.StratsData[i].StratID === parseInt(objStratID.value)){
   				gCurrStrats.StratsData[i].StratName = objStratName.value;
   				gCurrStrats.StratsData[i].StratDesc = objStratDesc.value;

   				gCurrStrats.StratsData[i].SellDeltaMinOC = objSellDeltaMinOC.value;
   				gCurrStrats.StratsData[i].SellDeltaMaxOC = objSellDeltaMaxOC.value;
   				gCurrStrats.StratsData[i].SellStartQty = objSellQty.value;
   				gCurrStrats.StratsData[i].SellMultiplier = objSellMultiplier.value;
   				gCurrStrats.StratsData[i].SellAdjDeltaTP = objSellAdjDeltaTP.value;
   				gCurrStrats.StratsData[i].SellAdjDeltaSL = objSellAdjDeltaSL.value;
   				gCurrStrats.StratsData[i].SellNewPosDelta = objSellNewPosDelta.value;

   				gCurrStrats.StratsData[i].BuyDeltaMinOC = objBuyDeltaMinOC.value;
   				gCurrStrats.StratsData[i].BuyDeltaMaxOC = objBuyDeltaMaxOC.value;
   				gCurrStrats.StratsData[i].BuyStartQty = objBuyQty.value;
   				gCurrStrats.StratsData[i].BuyMultiplier = objBuyMultiplier.value;
   				gCurrStrats.StratsData[i].BuyAdjDeltaTP = objBuyAdjDeltaTP.value;
   				gCurrStrats.StratsData[i].BuyAdjDeltaSL = objBuyAdjDeltaSL.value;
   				gCurrStrats.StratsData[i].BuyNewPosDelta = objBuyNewPosDelta.value;
   			}
   		}

   		for(let i=0; i<gCurrPos.TradeData.length; i++){
   			if(gCurrPos.TradeData[i].StratID === objStratID.value){
   				if(gCurrPos.TradeData[i].TransType === "SELL"){
	   				gCurrPos.TradeData[i].DeltaSL = parseFloat(objSellAdjDeltaSL.value);
	   				gCurrPos.TradeData[i].DeltaTP = parseFloat(objSellAdjDeltaTP.value);
	   				gCurrPos.TradeData[i].DeltaNP = parseFloat(objSellNewPosDelta.value);
	   				gCurrPos.TradeData[i].LossQtyMulti = parseInt(objSellMultiplier.value);
	   				gCurrPos.TradeData[i].StratName = objStratName.value;
   				}
   				else if(gCurrPos.TradeData[i].TransType === "BUY"){
	   				gCurrPos.TradeData[i].DeltaSL = parseFloat(objBuyAdjDeltaSL.value);
	   				gCurrPos.TradeData[i].DeltaTP = parseFloat(objBuyAdjDeltaTP.value);
	   				gCurrPos.TradeData[i].DeltaNP = parseFloat(objBuyNewPosDelta.value);
	   				gCurrPos.TradeData[i].LossQtyMulti = parseInt(objBuyMultiplier.value);
	   				gCurrPos.TradeData[i].StratName = objStratName.value;
   				}
   			}
   		}

		localStorage.setItem("DeltaStrats", JSON.stringify(gCurrStrats));
		fnLoadCurrStrategies();
		fnLoadDefStrategy();

	    let objExcTradeDtls = JSON.stringify(gCurrPos);
	    localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
	    fnLoadCurrentTradePos();
	    
        fnGenMessage("Strategy Updated!", `badge bg-success`, "spnGenMsg");
		$('#mdlStrategyEditor').modal('hide');
   	}

	gUpdPos = true;
}

function fnLoadStrategyDetails(){
   	let objDefStrat = JSON.parse(localStorage.getItem("DeltaDefStrat"));
   	let objStratID = document.getElementById("hidStratID");
   	let objStratName = document.getElementById("txtEditStratName");
   	let objStratDesc = document.getElementById("taEditDescription");

   	let objSellDeltaMinOC = document.getElementById("txtDeltaSellLegMin");
   	let objSellDeltaMaxOC = document.getElementById("txtDeltaSellLegMax");
   	let objSellQty = document.getElementById("txtSellQty");
   	let objSellMultiplier = document.getElementById("ddlSellMultiplier");
   	let objSellAdjDeltaTP = document.getElementById("txtDeltaSellLegProfit");
   	let objSellAdjDeltaSL = document.getElementById("txtDeltaSellLegLoss");
   	let objSellNewPosDelta = document.getElementById("txtDeltaSellNewPos");
   	
   	let objBuyDeltaMinOC = document.getElementById("txtDeltaBuyLegMin");
   	let objBuyDeltaMaxOC = document.getElementById("txtDeltaBuyLegMax");
   	let objBuyQty = document.getElementById("txtBuyQty");
   	let objBuyMultiplier = document.getElementById("ddlBuyMultiplier");
   	let objBuyAdjDeltaTP = document.getElementById("txtDeltaBuyLegProfit");
   	let objBuyAdjDeltaSL = document.getElementById("txtDeltaBuyLegLoss");
   	let objBuyNewPosDelta = document.getElementById("txtDeltaBuyNewPos");

   	if(objDefStrat === null || objDefStrat === ""){
   		objStratID.value = "";
   		objStratName.value = "";
   		objStratDesc.innerText = "";
   		objSellDeltaMinOC.value = "";
   		objSellDeltaMaxOC.value = "";
   		objSellQty.value = "";
   		objSellMultiplier.value = 1;
   		objSellAdjDeltaTP.value = "";
   		objSellAdjDeltaSL.value = "";
   		objSellNewPosDelta.value = "";

   		objBuyDeltaMinOC.value = "";
   		objBuyDeltaMaxOC.value = "";
   		objBuyQty.value = "";
   		objBuyMultiplier.value = 1;
   		objBuyAdjDeltaTP.value = "";
   		objBuyAdjDeltaSL.value = "";
   		objBuyNewPosDelta.value = "";
   	}
   	else{
   		for(let i=0; i<gCurrStrats.StratsData.length; i++){
   			if(gCurrStrats.StratsData[i].StratID === parseInt(objDefStrat)){
   				objStratID.value = gCurrStrats.StratsData[i].StratID;
   				objStratName.value = gCurrStrats.StratsData[i].StratName;
   				objStratDesc.innerText = gCurrStrats.StratsData[i].StratDesc;
		   		objSellDeltaMinOC.value = gCurrStrats.StratsData[i].SellDeltaMinOC;
		   		objSellDeltaMaxOC.value = gCurrStrats.StratsData[i].SellDeltaMaxOC;
		   		objSellQty.value = gCurrStrats.StratsData[i].SellStartQty;
		   		objSellMultiplier.value = gCurrStrats.StratsData[i].SellMultiplier;
		   		objSellAdjDeltaTP.value = gCurrStrats.StratsData[i].SellAdjDeltaTP;
		   		objSellAdjDeltaSL.value = gCurrStrats.StratsData[i].SellAdjDeltaSL;
		   		objSellNewPosDelta.value = gCurrStrats.StratsData[i].SellNewPosDelta;

		   		objBuyDeltaMinOC.value = gCurrStrats.StratsData[i].BuyDeltaMinOC;
		   		objBuyDeltaMaxOC.value = gCurrStrats.StratsData[i].BuyDeltaMaxOC;
		   		objBuyQty.value = gCurrStrats.StratsData[i].BuyStartQty;
		   		objBuyMultiplier.value = gCurrStrats.StratsData[i].BuyMultiplier;
		   		objBuyAdjDeltaTP.value = gCurrStrats.StratsData[i].BuyAdjDeltaTP;
		   		objBuyAdjDeltaSL.value = gCurrStrats.StratsData[i].BuyAdjDeltaSL;
		   		objBuyNewPosDelta.value = gCurrStrats.StratsData[i].BuyNewPosDelta;
   			}
   		}
   	}
}

function fnConnectWS(){
    let vUrl = "wss://socket.india.delta.exchange";
    objDeltaWS = new WebSocket(vUrl);

    objDeltaWS.onopen = function (){
        // let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": ["BTCUSD"] }]}};

        // objDeltaWS.send(JSON.stringify(vSendData));
        // console.log("Conn Started......");
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
    }
    objDeltaWS.onclose = function (){

		objDeltaWS = null;
		// fnSubscribe();
		fnSubscribeInterval();
		// objBestBuy.value = "";
		// objBestSell.value = "";

        console.log("Conn Closed....");
        fnGenMessage("Streaming Connection Closed!", `badge bg-danger`, "spnGenMsg");
    }
    objDeltaWS.onerror = function (){
        console.log("Conn Error");
    }
	objDeltaWS.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

		switch (vTicData.type){
			case "v2/ticker":
				fnUpdateRates(vTicData);
				break;
			case "subscriptions":

	            fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
				break;
			case "unsubscribed":

	            fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
				break;
		}
	}
}

function fnCloseWS(){
	if(objDeltaWS !== null){
		objDeltaWS.close();
	}
	else{
		console.log("There is no Open WS Connection!")
	}
}

function fnSubscribe(){
	if(objDeltaWS === null){
		fnConnectWS();
		console.log("WS is looping to Connect.....");
		setTimeout(fnSubscribe, 3000);
	}
	else{
	    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};
		console.log("Subscribing to Channel....");
		// console.log(gSubList);
		gPosChanged = false;
	    objDeltaWS.send(JSON.stringify(vSendData));
	}
}

function fnUnsubscribe(){
	if(objDeltaWS === null){
		console.log("No Connection");
	    fnGenMessage("Already Streaming is Unsubscribed & Disconnected!", `badge bg-warning`, "spnGenMsg");
	}
	else{
	    let vSendData = {};
	    console.log("GUnSub Len: " + gUnSubList.length);
        if(gUnSubList.length > 0){
            vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gUnSubList }]}};
        }
        else{
            vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};
        }
        

	    objDeltaWS.send(JSON.stringify(vSendData));
	}
}

function fnSubscribeInterval(){
	if(gCurrPos.TradeData.length > 0){
        clearInterval(vTradeInst);

		setTimeout(fnSubscribe, 3000);
	    vTradeInst = setInterval(fnSaveUpdCurrPos, 15000);
	}
}

function fnUpdateRates(pTicData){
    // document.getElementById(pTicData.symbol).innerHTML = '<span class="blink">' + (parseFloat(pTicData.quotes.best_ask)).toFixed(2); + '</span>';
	// console.log(pTicData);
    gSymbBRateList[pTicData.symbol] = pTicData.quotes.best_ask;
    gSymbBDeltaList[pTicData.symbol] = pTicData.greeks.delta;
    gSymbSRateList[pTicData.symbol] = pTicData.quotes.best_bid;
    gSymbSDeltaList[pTicData.symbol] = pTicData.greeks.delta;

    // console.log(pTicData.quotes.best_bid);
}

async function fnGetOptionChain(){
	let isAppLogin = JSON.parse(localStorage.getItem("AppMsgStatusS"));
    let isTraderStatus = JSON.parse(localStorage.getItem("lsDeltaCalLoginValid"));
	let isAutoTrader = JSON.parse(localStorage.getItem("isDeltaCalAutoTrader"));
	let objSelSymb = document.getElementById("ddlSymbols");
	let objLotSize = document.getElementById("txtLotSize");
	let objStrat = document.getElementById("ddlStrategy");

	if(isAppLogin === null || isAppLogin === false){
        fnGenMessage("Login to Account to Start Trading!", `badge bg-warning`, "spnGenMsg");
	}
	else if(isTraderStatus === null || isTraderStatus === false){
        fnGenMessage("Login to Trader to Start Trading!", `badge bg-warning`, "spnGenMsg");
	}
	else if(isAutoTrader === null || isAutoTrader === false){
        fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
	}
	else if(objStrat.value === ""){
        fnGenMessage("Select Strategy to Get Option Chain!", `badge bg-danger`, "spnGenMsg");
	}
	else if(objSelSymb.value === ""){
        fnGenMessage("Select Symbol to Get Option Chain!", `badge bg-danger`, "spnGenMsg");
	}
	else if(objLotSize.value === 0 || objLotSize.value === ""){
        fnGenMessage("Invalid Lot Size, Please Check!", `badge bg-danger`, "spnGenMsg");
	}
	else{
	    let objApiKey = document.getElementById("txtUserAPIKey");
	    let objApiSecret = document.getElementById("txtAPISecret");
	    let objSymbDDL = document.getElementById("ddlSymbols");
	    let objSellLegDate = document.getElementById("txtSellLegDate");
	    let objBuyLegDate = document.getElementById("txtBuyLegDate");

	    let vBuyExpiry = fnSetDDMMYYYY(objBuyLegDate.value);
	    let vSellExpiry = fnSetDDMMYYYY(objSellLegDate.value);

		if(objSellLegDate.value !== ""){
	        let objSellOptChnData = await fnGetOptChnByUndAstExp(objApiKey.value, objApiSecret.value, objSymbDDL.value, vSellExpiry);
	        if(objSellOptChnData.status === "success"){
			    let objTBCE = document.getElementById("tBodyOptsSellCE");
			    let objTBPE = document.getElementById("tBodyOptsSellPE");
			    let objMaxDeltaSell = document.getElementById("txtDeltaSellLegMax");
			    let objMinDeltaSell = document.getElementById("txtDeltaSellLegMin");
		        let vTempHtmlCE = "";
		        let vTempHtmlPE = "";

			   	// console.log(objSellOptChnData);

			   	for(let i=0; i<objSellOptChnData.data.length; i++){
			   		let vContType = objSellOptChnData.data[i].ContType;
			   		let vDelta = parseFloat(objSellOptChnData.data[i].Delta);
			   		let vSymbol = objSellOptChnData.data[i].Symbol;
			   		let vBestBid = parseFloat(objSellOptChnData.data[i].BestBid);
			   		let vBestAsk = parseFloat(objSellOptChnData.data[i].BestAsk);

			   		if((vContType === "put_options") && (vDelta >= -(parseFloat(objMaxDeltaSell.value))) && (vDelta <= -(parseFloat(objMinDeltaSell.value)))){
			            vTempHtmlPE += '<tr>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:center;"><input type="radio" name="rdoSellPE" onclick="fnSelectOption(`SELL`, `PE`, `' + vSymbol + '`);" /></td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap;">' + (vDelta).toFixed(2) + '</td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestBid).toFixed(2) + '</td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestAsk).toFixed(2) + '</td>';
			            vTempHtmlPE += '</tr>';
			   		}
			   		else if((vContType === "call_options") && (vDelta <= (parseFloat(objMaxDeltaSell.value))) && (vDelta >= (parseFloat(objMinDeltaSell.value)))){
			            vTempHtmlCE += '<tr>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:center;"><input type="radio" name="rdoSellCE" onclick="fnSelectOption(`SELL`, `CE`, `' + vSymbol + '`);" /></td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap;">' + (vDelta).toFixed(2) + '</td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestBid).toFixed(2) + '</td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestAsk).toFixed(2) + '</td>';
			            vTempHtmlCE += '</tr>';
			   		}
			   		else{
			   			// console.log("No Data in Table");
			   		}
				}

	        	objTBCE.innerHTML = vTempHtmlCE;
	        	objTBPE.innerHTML = vTempHtmlPE;

				document.getElementById("hidSellCESymb").value = "";
				document.getElementById("hidSellPESymb").value = "";
	        }
	        else{
	            fnGenMessage(objSellOptChnData.message, `badge bg-${objSellOptChnData.status}`, "spnGenMsg");
	        }
		}

		if(objBuyLegDate.value !== ""){
	        let objBuyOptChnData = await fnGetOptChnByUndAstExp(objApiKey.value, objApiSecret.value, objSymbDDL.value, vBuyExpiry);
	        if(objBuyOptChnData.status === "success"){
			    let objTBCE = document.getElementById("tBodyOptsBuyCE");
			    let objTBPE = document.getElementById("tBodyOptsBuyPE");
			    let objMaxDeltaBuy = document.getElementById("txtDeltaBuyLegMax");
			    let objMinDeltaBuy = document.getElementById("txtDeltaBuyLegMin");
		        let vTempHtmlCE = "";
		        let vTempHtmlPE = "";
			   	// console.log(objBuyOptChnData);

			   	for(let i=0; i<objBuyOptChnData.data.length; i++){
			   		let vContType = objBuyOptChnData.data[i].ContType;
			   		let vDelta = parseFloat(objBuyOptChnData.data[i].Delta);
			   		let vSymbol = objBuyOptChnData.data[i].Symbol;
			   		let vBestBid = parseFloat(objBuyOptChnData.data[i].BestBid);
			   		let vBestAsk = parseFloat(objBuyOptChnData.data[i].BestAsk);

			   		if((vContType === "put_options") && (vDelta >= -(parseFloat(objMaxDeltaBuy.value))) && (vDelta <= -(parseFloat(objMinDeltaBuy.value)))){
			            vTempHtmlPE += '<tr>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:center;"><input type="radio" name="rdoBuyPE" onclick="fnSelectOption(`BUY`, `PE`, `' + vSymbol + '`);" /></td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap;">' + (vDelta).toFixed(2) + '</td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestBid).toFixed(2) + '</td>';
			            vTempHtmlPE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestAsk).toFixed(2) + '</td>';
			            vTempHtmlPE += '</tr>';
			   		}
			   		else if((vContType === "call_options") && (vDelta <= (parseFloat(objMaxDeltaBuy.value))) && (vDelta >= (parseFloat(objMinDeltaBuy.value)))){
			            vTempHtmlCE += '<tr>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:center;"><input type="radio" name="rdoBuyCE" onclick="fnSelectOption(`BUY`, `CE`, `' + vSymbol + '`);" /></td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap;">' + (vDelta).toFixed(2) + '</td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestBid).toFixed(2) + '</td>';
			            vTempHtmlCE += '<td style="text-wrap: nowrap; text-align:right;">' + (vBestAsk).toFixed(2) + '</td>';
			            vTempHtmlCE += '</tr>';
			   		}
			   		else{
			   			// console.log("No Data in Table");
			   		}
				}

	        	objTBCE.innerHTML = vTempHtmlCE;
	        	objTBPE.innerHTML = vTempHtmlPE;

				document.getElementById("hidBuyCESymb").value = "";
				document.getElementById("hidBuyPESymb").value = "";
	        }
	        else{
	            fnGenMessage(objBuyOptChnData.message, `badge bg-${objBuyOptChnData.status}`, "spnGenMsg");
	        }
		}

    	$('#mdlDeltaOC').modal('show');
        fnGenMessage("Auto Trading Innitiated!", `badge bg-success`, "spnGenMsg");
	}
}

function fnGetOptChnByUndAstExp(pApiKey, pApiSecret, pUndAssetSymb, pExpiry){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "UndAssetSymbol" : pUndAssetSymb,
            "Expiry" : pExpiry,
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExcCal/getOptChnSDKByUndAstExp", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
            	let objOptData = [];
                // console.log(objResult);
                // console.log(objResult.data.result.length);

                for(let i=0; i<objResult.data.result.length; i++){
                	let objOCLeg = { ContType : objResult.data.result[i].contract_type, Delta : objResult.data.result[i].greeks.delta, ProductId : objResult.data.result[i].product_id, BestAsk : objResult.data.result[i].quotes.best_ask, BestBid : objResult.data.result[i].quotes.best_bid, Strike : objResult.data.result[i].strike_price, Symbol : objResult.data.result[i].symbol, UndrAst : objResult.data.result[i].underlying_asset_symbol, Expiry : pExpiry };

                	objOptData.push(objOCLeg);
                }

                resolve({ "status": objResult.status, "message": objResult.message, "data": objOptData });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            reject({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

function fnSelectOption(pTransType, pOptType, pSymbol){
	if(pTransType === "SELL" && pOptType === "CE")
		document.getElementById("hidSellCESymb").value = pSymbol;
	else if(pTransType === "SELL" && pOptType === "PE")
		document.getElementById("hidSellPESymb").value = pSymbol;
	else if(pTransType === "BUY" && pOptType === "CE")
		document.getElementById("hidBuyCESymb").value = pSymbol;
	else if(pTransType === "BUY" && pOptType === "PE")
		document.getElementById("hidBuyPESymb").value = pSymbol;
}

function fnShowOCModal(){
    document.getElementById("hidSellCESymb").value = "";
    document.getElementById("hidSellPESymb").value = "";
    $('#mdlDeltaOC').modal('show');
}

async function fnExecTrade(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let vSellSymbCE = document.getElementById("hidSellCESymb").value;
    let vSellSymbPE = document.getElementById("hidSellPESymb").value;
    let vBuySymbCE = document.getElementById("hidBuyCESymb").value;
    let vBuySymbPE = document.getElementById("hidBuyPESymb").value;
    let objLotSize = document.getElementById("txtLotSize");
    let objSellQty = document.getElementById("txtSellQty");
    let objBuyQty = document.getElementById("txtBuyQty");
    let objStratID = document.getElementById("hidStratID");
    let objStratName = document.getElementById("txtEditStratName");
    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

    if(vSellSymbCE !== ""){
	    let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, vSellSymbCE);
    	if(objBestRates.status === "success"){
            let vSymbol = objBestRates.data.result.symbol;
            let vBestBuy = parseFloat(objBestRates.data.result.quotes.best_ask);
            let vBestSell = parseFloat(objBestRates.data.result.quotes.best_bid);
            let vDelta = parseFloat(objBestRates.data.result.greeks.delta);
            let vStrPrice = parseInt(objBestRates.data.result.strike_price);
            let vUndrAsstSymb = objBestRates.data.result.underlying_asset_symbol;
            let vOptionType = "CE";
            let vTransType = "SELL"
		    let objLossMultiplier = document.getElementById("ddlSellMultiplier");
		    let objSellLegDate = document.getElementById("txtSellLegDate");
		    let objSellLegAdjTP = document.getElementById("txtDeltaSellLegProfit");
		    let objSellLegAdjSL = document.getElementById("txtDeltaSellLegLoss");
		    let objSellLegNPDelta = document.getElementById("txtDeltaSellNewPos");
		    let vProductID = objBestRates.data.result.product_id;
		    let vSellExpiry = fnSetDDMMYYYY(objSellLegDate.value);

            let vExcTradeDtls = { ProductID : vProductID, OpenDTVal : (vOrdId + 1), OpenDT : vToday, Symbol : vSymbol, OptionType : vOptionType, TransType : vTransType, UndrAsstSymb : vUndrAsstSymb, StrikePrice : vStrPrice, Expiry : vSellExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseFloat(objSellQty.value), LossQtyMulti : parseInt(objLossMultiplier.value), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, StratID : objStratID.value, StratName : objStratName.value, DeltaTP : parseFloat(objSellLegAdjTP.value), DeltaSL : parseFloat(objSellLegAdjSL.value), DeltaNP : parseFloat(objSellLegNPDelta.value), Status : "OPEN" };

            gCurrPos.TradeData.push(vExcTradeDtls);

            let objExcTradeDtls = JSON.stringify(gCurrPos);

            localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
    	}
    }
	if(vSellSymbPE !== ""){
	    let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, vSellSymbPE);
	    if(objBestRates.status === "success"){
            let vSymbol = objBestRates.data.result.symbol;
            let vBestBuy = parseFloat(objBestRates.data.result.quotes.best_ask);
            let vBestSell = parseFloat(objBestRates.data.result.quotes.best_bid);
            let vDelta = parseFloat(objBestRates.data.result.greeks.delta);
            let vStrPrice = parseInt(objBestRates.data.result.strike_price);
            let vUndrAsstSymb = objBestRates.data.result.underlying_asset_symbol;
            let vOptionType = "PE";
            let vTransType = "SELL"
		    let objLossMultiplier = document.getElementById("ddlSellMultiplier");
		    let objSellLegDate = document.getElementById("txtSellLegDate");
		    let objSellLegAdjTP = document.getElementById("txtDeltaSellLegProfit");
		    let objSellLegAdjSL = document.getElementById("txtDeltaSellLegLoss");
		    let objSellLegNPDelta = document.getElementById("txtDeltaSellNewPos");
		    let vProductID = objBestRates.data.result.product_id;
		    let vSellExpiry = fnSetDDMMYYYY(objSellLegDate.value);

            let vExcTradeDtls = { ProductID : vProductID, OpenDTVal : (vOrdId + 2), OpenDT : vToday, Symbol : vSymbol, OptionType : vOptionType, TransType : vTransType, UndrAsstSymb : vUndrAsstSymb, StrikePrice : vStrPrice, Expiry : vSellExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseFloat(objSellQty.value), LossQtyMulti : parseInt(objLossMultiplier.value), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, StratID : objStratID.value, StratName : objStratName.value, DeltaTP : parseFloat(objSellLegAdjTP.value), DeltaSL : parseFloat(objSellLegAdjSL.value), DeltaNP : parseFloat(objSellLegNPDelta.value), Status : "OPEN" };

            gCurrPos.TradeData.push(vExcTradeDtls);

            let objExcTradeDtls = JSON.stringify(gCurrPos);

            localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
	    }
	}
	if(vBuySymbCE !== ""){
	    let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, vBuySymbCE);
    	if(objBestRates.status === "success"){
            let vSymbol = objBestRates.data.result.symbol;
            let vBestBuy = parseFloat(objBestRates.data.result.quotes.best_ask);
            let vBestSell = parseFloat(objBestRates.data.result.quotes.best_bid);
            let vDelta = parseFloat(objBestRates.data.result.greeks.delta);
            let vStrPrice = parseInt(objBestRates.data.result.strike_price);
            let vUndrAsstSymb = objBestRates.data.result.underlying_asset_symbol;
            let vOptionType = "CE";
            let vTransType = "BUY"
		    let objLossMultiplier = document.getElementById("ddlBuyMultiplier");
		    let objBuyLegDate = document.getElementById("txtBuyLegDate");
		    let objBuyLegAdjTP = document.getElementById("txtDeltaBuyLegProfit");
		    let objBuyLegAdjSL = document.getElementById("txtDeltaBuyLegLoss");
		    let objBuyLegNPDelta = document.getElementById("txtDeltaBuyNewPos");
		    let vProductID = objBestRates.data.result.product_id;
			let vBuyExpiry = fnSetDDMMYYYY(objBuyLegDate.value);

            let vExcTradeDtls = { ProductID : vProductID, OpenDTVal : (vOrdId + 3), OpenDT : vToday, Symbol : vSymbol, OptionType : vOptionType, TransType : vTransType, UndrAsstSymb : vUndrAsstSymb, StrikePrice : vStrPrice, Expiry : vBuyExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseFloat(objBuyQty.value), LossQtyMulti : parseInt(objLossMultiplier.value), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, StratID : objStratID.value, StratName : objStratName.value, DeltaTP : parseFloat(objBuyLegAdjTP.value), DeltaSL : parseFloat(objBuyLegAdjSL.value), DeltaNP : parseFloat(objBuyLegNPDelta.value), Status : "OPEN" };

            gCurrPos.TradeData.push(vExcTradeDtls);

            let objExcTradeDtls = JSON.stringify(gCurrPos);

            localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
    	}
	}
	if(vBuySymbPE !== ""){
	    let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, vBuySymbPE);
	    if(objBestRates.status === "success"){
            let vSymbol = objBestRates.data.result.symbol;
            let vBestBuy = parseFloat(objBestRates.data.result.quotes.best_ask);
            let vBestSell = parseFloat(objBestRates.data.result.quotes.best_bid);
            let vDelta = parseFloat(objBestRates.data.result.greeks.delta);
            let vStrPrice = parseInt(objBestRates.data.result.strike_price);
            let vUndrAsstSymb = objBestRates.data.result.underlying_asset_symbol;
            let vOptionType = "PE";
            let vTransType = "BUY"
		    let objLossMultiplier = document.getElementById("ddlBuyMultiplier");
		    let objBuyLegDate = document.getElementById("txtBuyLegDate");
		    let objBuyLegAdjTP = document.getElementById("txtDeltaBuyLegProfit");
		    let objBuyLegAdjSL = document.getElementById("txtDeltaBuyLegLoss");
		    let objBuyLegNPDelta = document.getElementById("txtDeltaBuyNewPos");
		    let vProductID = objBestRates.data.result.product_id;
			let vBuyExpiry = fnSetDDMMYYYY(objBuyLegDate.value);

            let vExcTradeDtls = { ProductID : vProductID, OpenDTVal : (vOrdId + 4), OpenDT : vToday, Symbol : vSymbol, OptionType : vOptionType, TransType : vTransType, UndrAsstSymb : vUndrAsstSymb, StrikePrice : vStrPrice, Expiry : vBuyExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseFloat(objBuyQty.value), LossQtyMulti : parseInt(objLossMultiplier.value), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, StratID : objStratID.value, StratName : objStratName.value, DeltaTP : parseFloat(objBuyLegAdjTP.value), DeltaSL : parseFloat(objBuyLegAdjSL.value), DeltaNP : parseFloat(objBuyLegNPDelta.value), Status : "OPEN" };

            gCurrPos.TradeData.push(vExcTradeDtls);

            let objExcTradeDtls = JSON.stringify(gCurrPos);

            localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
	    }	}

	gPosChanged = true;
	fnUpdateOpenPositions();

	console.log("Trade Innitiated!!!!!");
    $('#mdlDeltaOC').modal('hide');
}

function fnSaveUpdCurrPos(){
	let IsSwap = false;
	let vLegID = 0;
	let vTransType = "";
	let vOptionType = "";
	let vExpiry = "";
	let vUndAst = "";
	let vProductID = "";
    let vLotSize = 0;
    let vQty = 0;
    let vMultiplier = 0;
    let vDeltaTP = 0;
    let vDeltaSL = 0;
    let vDeltaNPos = 0;
    let vStratID = "";
    let vStratName = "";

	for(let i=0; i<gCurrPos.TradeData.length; i++){
		if(gCurrPos.TradeData[i].Status === "OPEN"){
			if(gCurrPos.TradeData[i].TransType === "SELL"){
				let vSDeltaTP = gCurrPos.TradeData[i].DeltaTP;
				let vSDeltaSL = gCurrPos.TradeData[i].DeltaSL;
				gCurrPos.TradeData[i].BuyPrice = parseFloat(gSymbBRateList[gCurrPos.TradeData[i].Symbol]);
				gCurrPos.TradeData[i].Delta = (parseFloat(gSymbBDeltaList[gCurrPos.TradeData[i].Symbol])).toFixed(3);

				if((gCurrPos.TradeData[i].OptionType === "CE") && ((parseFloat(gCurrPos.TradeData[i].Delta) < vSDeltaTP) || (parseFloat(gCurrPos.TradeData[i].Delta) > vSDeltaSL))){
					IsSwap = true;
					vLegID = gCurrPos.TradeData[i].OpenDTVal;
					vTransType = gCurrPos.TradeData[i].TransType;
					vOptionType = gCurrPos.TradeData[i].OptionType;
					vExpiry = gCurrPos.TradeData[i].Expiry;
					vUndAst = gCurrPos.TradeData[i].UndrAsstSymb;
					vProductID = gCurrPos.TradeData[i].ProductID;

			        vLotSize = gCurrPos.TradeData[i].LotSize;
			        vQty = gCurrPos.TradeData[i].Qty;
			        vMultiplier = gCurrPos.TradeData[i].LossQtyMulti;
			        vDeltaTP = gCurrPos.TradeData[i].DeltaTP;
			        vDeltaSL = gCurrPos.TradeData[i].DeltaSL;
			        vDeltaNPos = gCurrPos.TradeData[i].DeltaNP;
			        vStratID = gCurrPos.TradeData[i].StratID;
			        vStratName = gCurrPos.TradeData[i].StratName;
					console.log("SELL CE Swap");
				}
				else if((gCurrPos.TradeData[i].OptionType === "PE") && ((parseFloat(gCurrPos.TradeData[i].Delta) > -(vSDeltaTP)) || (parseFloat(gCurrPos.TradeData[i].Delta) < -(vSDeltaSL)))){
					IsSwap = true;
					vLegID = gCurrPos.TradeData[i].OpenDTVal;
					vTransType = gCurrPos.TradeData[i].TransType;
					vOptionType = gCurrPos.TradeData[i].OptionType;
					vExpiry = gCurrPos.TradeData[i].Expiry;
					vUndAst = gCurrPos.TradeData[i].UndrAsstSymb;
					vProductID = gCurrPos.TradeData[i].ProductID;

			        vLotSize = gCurrPos.TradeData[i].LotSize;
			        vQty = gCurrPos.TradeData[i].Qty;
			        vMultiplier = gCurrPos.TradeData[i].LossQtyMulti;
			        vDeltaTP = gCurrPos.TradeData[i].DeltaTP;
			        vDeltaSL = gCurrPos.TradeData[i].DeltaSL;
			        vDeltaNPos = gCurrPos.TradeData[i].DeltaNP;
			        vStratID = gCurrPos.TradeData[i].StratID;
			        vStratName = gCurrPos.TradeData[i].StratName;
					console.log("SELL PE Swap");
				}
			}
			else if(gCurrPos.TradeData[i].TransType === "BUY"){
				let vBDeltaTP = gCurrPos.TradeData[i].DeltaTP;
				let vBDeltaSL = gCurrPos.TradeData[i].DeltaSL;
				gCurrPos.TradeData[i].SellPrice = parseFloat(gSymbSRateList[gCurrPos.TradeData[i].Symbol]);
				gCurrPos.TradeData[i].Delta = (parseFloat(gSymbSDeltaList[gCurrPos.TradeData[i].Symbol])).toFixed(3);

				if((gCurrPos.TradeData[i].OptionType === "CE") && ((parseFloat(gCurrPos.TradeData[i].Delta) > vBDeltaTP) || (parseFloat(gCurrPos.TradeData[i].Delta) < vBDeltaSL))){
					IsSwap = true;
					vLegID = gCurrPos.TradeData[i].OpenDTVal;
					vTransType = gCurrPos.TradeData[i].TransType;
					vOptionType = gCurrPos.TradeData[i].OptionType;
					vExpiry = gCurrPos.TradeData[i].Expiry;
					vUndAst = gCurrPos.TradeData[i].UndrAsstSymb;
					vProductID = gCurrPos.TradeData[i].ProductID;

			        vLotSize = gCurrPos.TradeData[i].LotSize;
			        vQty = gCurrPos.TradeData[i].Qty;
			        vMultiplier = gCurrPos.TradeData[i].LossQtyMulti;
			        vDeltaTP = gCurrPos.TradeData[i].DeltaTP;
			        vDeltaSL = gCurrPos.TradeData[i].DeltaSL;
			        vDeltaNPos = gCurrPos.TradeData[i].DeltaNP;
			        vStratID = gCurrPos.TradeData[i].StratID;
			        vStratName = gCurrPos.TradeData[i].StratName;
					console.log("BUY CE Swap " + gCurrPos.TradeData[i].Delta);
				}
				else if((gCurrPos.TradeData[i].OptionType === "PE") && ((parseFloat(gCurrPos.TradeData[i].Delta) < -(vBDeltaTP)) || (parseFloat(gCurrPos.TradeData[i].Delta) > -(vBDeltaSL)))){
					IsSwap = true;
					vLegID = gCurrPos.TradeData[i].OpenDTVal;
					vTransType = gCurrPos.TradeData[i].TransType;
					vOptionType = gCurrPos.TradeData[i].OptionType;
					vExpiry = gCurrPos.TradeData[i].Expiry;
					vUndAst = gCurrPos.TradeData[i].UndrAsstSymb;
					vProductID = gCurrPos.TradeData[i].ProductID;

			        vLotSize = gCurrPos.TradeData[i].LotSize;
			        vQty = gCurrPos.TradeData[i].Qty;
			        vMultiplier = gCurrPos.TradeData[i].LossQtyMulti;
			        vDeltaTP = gCurrPos.TradeData[i].DeltaTP;
			        vDeltaSL = gCurrPos.TradeData[i].DeltaSL;
			        vDeltaNPos = gCurrPos.TradeData[i].DeltaNP;
			        vStratID = gCurrPos.TradeData[i].StratID;
			        vStratName = gCurrPos.TradeData[i].StratName;
					console.log("BUY PE Swap");
				}
			}
		}
	}

	if(IsSwap){
		fnSwapOption(vLegID, vTransType, vOptionType, vExpiry, vUndAst, vLotSize, vQty, vMultiplier, vDeltaTP, vDeltaSL, vDeltaNPos, vStratID, vStratName);
	}

	fnUpdateOpenPositions();
}

function fnUpdateOpenPositions(){
	if(gUpdPos){
	    let objCurrTradeList = document.getElementById("tBodyCurrTrades");
        gSubList = [];
        gUnSubList = [];

	    if (gCurrPos.TradeData.length === 0) {
	        objCurrTradeList.innerHTML = '<tr><td colspan="13"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
	    }
	    else{
	        let vTempHtml = "";
	        let vTotalTrades = 0;
	        let vNetPL = 0;
	        let vTotalCharges = 0;
	        let vTotalCapital = 0;
	        let vDeployedCapital = 5000;
	        let vPercentPL = 0;
	        let objProfitPer = document.getElementById("txtExitProfitPer");
	        let objLossPer = document.getElementById("txtExitLossPer");

	        for(let i=0; i<gCurrPos.TradeData.length; i++){
	        	let vProductID = gCurrPos.TradeData[i].ProductID;
	            let vLegID = gCurrPos.TradeData[i].OpenDTVal;
	            let vOpenDT = gCurrPos.TradeData[i].OpenDT;
	            let vSymbol = gCurrPos.TradeData[i].Symbol;
	            let vTransType = gCurrPos.TradeData[i].TransType;
	            let vOptionType = gCurrPos.TradeData[i].OptionType;
	            let vExpiry = gCurrPos.TradeData[i].Expiry;
	            let vUndrAsstSymb = gCurrPos.TradeData[i].UndrAsstSymb;
	            let vIndexPrice = parseFloat(gCurrPos.TradeData[i].StrikePrice);
	            let vDelta = gCurrPos.TradeData[i].Delta;
	            let vLotSize = gCurrPos.TradeData[i].LotSize;
	            let vQty = gCurrPos.TradeData[i].Qty;
	            let vMultiplier = gCurrPos.TradeData[i].LossQtyMulti;
	            let vStratID = gCurrPos.TradeData[i].StratID;
	            let vStratName = gCurrPos.TradeData[i].StratName;
	            let vDeltaTP = gCurrPos.TradeData[i].DeltaTP;
	            let vDeltaSL = gCurrPos.TradeData[i].DeltaSL;
	            let vDeltaNPos = gCurrPos.TradeData[i].DeltaNP;
	            let vBuyPrice = gCurrPos.TradeData[i].BuyPrice;
	            let vSellPrice = gCurrPos.TradeData[i].SellPrice;
	            let vCharges = fnGetTradeCharges(vIndexPrice, vLotSize, vQty, vBuyPrice, vSellPrice);
		        let vCapital = fnGetTradeCapital(vTransType, vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
	            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
	            let vStatus = gCurrPos.TradeData[i].Status;
                vTotalCharges += parseFloat(vCharges);
                vNetPL += parseFloat(vPL);
                vTotalTrades += 1;
                vPercentPL = (vNetPL / vDeployedCapital) * 100;

                if(vNetPL > 0 && vNetPL > gMaxProfit){
                	localStorage.setItem("DeltaMaxProfit", vNetPL);
                	gMaxProfit = vNetPL;
                }
                if(vNetPL < 0 && vNetPL < gMaxLoss){
                	localStorage.setItem("DeltaMaxLoss", vNetPL);
                	gMaxLoss = vNetPL;
                }

	            if(vStatus === "OPEN"){
	                vTotalCapital += parseFloat(vCapital);

		            vTempHtml += '<tr>';
		            vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnOpenClosePosition('+ vLegID +', `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-exchange" aria-hidden="true" style="color:orange;" onclick="fnSwapOption('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vExpiry +'`, `'+ vUndrAsstSymb +'`, '+ vLotSize +', '+ vQty +', '+ vMultiplier +', '+ vDeltaTP +', '+ vDeltaSL +', '+ vDeltaNPos +', `'+ vStratID +'`, `'+ vStratName +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vOpenDT + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vStratName + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + vDelta + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vTransType + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#0078ff;">' + vLotSize + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#e3ff00;">' + vQty + '</td>';
		            if(vTransType === "SELL"){
			            vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vBuyPrice).toFixed(2) + '</span></td>';
			            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';
		            }
		            else if(vTransType === "BUY"){
			            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vBuyPrice).toFixed(2) + '</td>';
			            vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vSellPrice).toFixed(2) + '</span></td>';
		            }
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + (parseFloat(vCapital)).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;color:#ff9a00;">'+ (vPL).toFixed(2) +'</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vStatus + '</td>';
		            vTempHtml += '</tr>';
	            	gSubList.push(vSymbol);
	            }
	            else{
		            vTempHtml += '<tr>';
		            vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnOpenClosePosition('+ vLegID +', `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-exchange" style="color:#808080;" aria-hidden="true" onclick="alert(`Position Already Closed!`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:#808080; text-align:center;">' + vOpenDT + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:#808080; text-align:center;">' + vStratName + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; font-weight:bold; color:#808080;">' + vDelta + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:#808080; text-align:center;">' + vSymbol + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:#808080; text-align:center;">' + vTransType + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#808080;">' + vLotSize + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#808080;">' + vQty + '</td>';
	            	vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap;text-align:right; color:#808080;">' + (vBuyPrice).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right; color:#808080;">' + (vSellPrice).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#808080;">' + (parseFloat(vCapital)).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#808080;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#808080;">'+ (vPL).toFixed(2) +'</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:#808080; text-align:right;">' + vStatus + '</td>';
		            vTempHtml += '</tr>';
	            	gUnSubList.push(vSymbol);
	            }
	        }
	        vTempHtml += '<tr><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Total Trades: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vTotalTrades +'</td><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Investment: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vDeployedCapital +'</td><td></td><td></td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCapital).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vPercentPL).toFixed(1) +'%</td></tr>';
	        objCurrTradeList.innerHTML = vTempHtml;

	        if(((vPercentPL >= parseInt(objProfitPer.value)) || (vPercentPL <= -(parseInt(objLossPer.value))))){
	        	console.log("Exit All Positions.......");
	        	fnExitAllOpenPosition();
	        }

	        if(gPosChanged === true){
		        fnSubscribeInterval();
	        }
	    }
	}
	document.getElementById("divMaxProfit").innerText = (gMaxProfit).toFixed(2);
	document.getElementById("divMaxLoss").innerText = (gMaxLoss).toFixed(2);
}

async function fnSwapOption(pLegID, pTransType, pOptionType, pExpiry, pUndAst, pLotSize, pQty, pMultiplier, pDeltaTP, pDeltaSL, pDeltaNPos, pStratID, pStratName){
    gUpdPos = false;

    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
    gUnSubList = [];
    let vQty = parseFloat(pQty) * parseInt(pMultiplier);

    let objOptChnData = await fnGetOptChnByUndAstExpOpTyp(objApiKey.value, objApiSecret.value, pUndAst, pExpiry, pOptionType, pTransType, pDeltaNPos);
	if(objOptChnData.status === "success"){
        let vSymbol = objOptChnData.data[0].Symbol;
        let vBestBuy = parseFloat(objOptChnData.data[0].BestAsk);
        let vBestSell = parseFloat(objOptChnData.data[0].BestBid);
        let vDelta = objOptChnData.data[0].Delta;
        let vStrPrice = objOptChnData.data[0].Strike;
        let vUndrAsstSymb = objOptChnData.data[0].UndrAsstSymb;
		let vProductID = objOptChnData.data[0].ProductID;

        let vExcTradeDtls = { ProductID : vProductID, OpenDTVal : vOrdId, OpenDT : vToday, Symbol : vSymbol, OptionType : pOptionType, TransType : pTransType, UndrAsstSymb : pUndAst, StrikePrice : vStrPrice, Expiry : pExpiry, LotSize : parseFloat(pLotSize), Qty : vQty, LossQtyMulti : parseInt(pMultiplier), BuyPrice : vBestBuy, SellPrice : vBestSell, Delta : vDelta, DeltaTP : parseFloat(pDeltaTP), DeltaSL : parseFloat(pDeltaSL), DeltaNP : parseFloat(pDeltaNPos), StratID : pStratID, StratName : pStratName, Status : "OPEN" };

        gCurrPos.TradeData.push(vExcTradeDtls);
        
		for(let i=0; i<gCurrPos.TradeData.length; i++){
			if(gCurrPos.TradeData[i].OpenDTVal === pLegID){
				gCurrPos.TradeData[i].Status = "CLOSED";
			}
		}
	    let objExcTradeDtls = JSON.stringify(gCurrPos);
	    localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);

	    fnCloseWS();
		gSymbBRateList = {};
		gSymbBDeltaList = {};

	    gUpdPos = true;
	    gPosChanged = true;
		fnUpdateOpenPositions();
	}
	else{
	    gUpdPos = true;
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

        fetch("/deltaExcCal/getBestRatesBySymb", requestOptions)
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

function fnGetOptChnByUndAstExpOpTyp(pApiKey, pApiSecret, pUndAst, pExpiry, pOptionType, pTransType, pDeltaNPos){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : pApiKey,
            "ApiSecret" : pApiSecret,
            "UndAssetSymbol" : pUndAst,
            "Expiry" : pExpiry,
            "OptionType" : pOptionType
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExcCal/getOptChnSDKByUndAstExpOpTyp", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
            	let objOptData = [];
                // console.log(objResult);
                // console.log(objResult.data.result.length);

                for(let i=0; i<objResult.data.result.length; i++){
                	let objOCLeg = { ContType : objResult.data.result[i].contract_type, Delta : parseFloat(objResult.data.result[i].greeks.delta), ProductID : objResult.data.result[i].product_id, BestAsk : objResult.data.result[i].quotes.best_ask, BestBid : objResult.data.result[i].quotes.best_bid, Strike : parseInt(objResult.data.result[i].strike_price), Symbol : objResult.data.result[i].symbol, UndrAst : objResult.data.result[i].underlying_asset_symbol, Expiry : pExpiry };

                	if(((pOptionType === "CE") && (parseFloat(objResult.data.result[i].greeks.delta) < parseFloat(pDeltaNPos))) || ((pOptionType === "PE") && (parseFloat(objResult.data.result[i].greeks.delta) > -(parseFloat(pDeltaNPos)))))
	                	objOptData.push(objOCLeg);
                }
	
	            let objArray = [];

	            if(pOptionType === "CE")
	            	objArray = objOptData.sort(fnSortByStrike);
	            else if(pOptionType === "PE")
	            	objArray = objOptData.sort(fnSortRevByStrike);

                resolve({ "status": objResult.status, "message": objResult.message, "data": objArray });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, "data": objResult.data });
                }
                else{
                    reject({ "status": objResult.status, "message": objResult.data.response.body.error.code + " Contact Admin!", "data": objResult.data });
                }
            }
            else if(objResult.status === "warning"){
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
        })
        .catch(error => {
            reject({ "status": "danger", "message": "Error At Option Chain. Catch!", "data": "" });
        });
    });
    return objPromise;
}

function fnSortByStrike(a, b) {
    return (a.Strike) - (b.Strike);
}

function fnSortRevByStrike(a, b) {
    return (b.Strike) - (a.Strike);
}

function fnOpenClosePosition(pLegID, pStatus){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

	gUpdPos = false;
	fnCloseWS();
	gSymbBRateList = {};
	gSymbBDeltaList = {};

	for(let i=0; i<gCurrPos.TradeData.length; i++){
		if(gCurrPos.TradeData[i].OpenDTVal === pLegID){
			gCurrPos.TradeData[i].Status = pStatus;
		    gCurrPos.TradeData[i].CloseDT = vToday;
		}
	}
    let objExcTradeDtls = JSON.stringify(gCurrPos);
    localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
    gUpdPos = true;
    gPosChanged = true;

    fnUpdateOpenPositions();
}

function fnDelLeg(pLegID){
	if(confirm("Are You Sure, You Want to Delete This Leg!")){
		gUpdPos = false;

		fnCloseWS();
		gSymbBRateList = {};
		gSymbBDeltaList = {};

		let vDelRec = null;

		for(let i=0; i<gCurrPos.TradeData.length; i++){
			if(gCurrPos.TradeData[i].OpenDTVal === pLegID){
				vDelRec = i;
			}
		}

		gCurrPos.TradeData.pop(vDelRec);

	    let objExcTradeDtls = JSON.stringify(gCurrPos);
	    localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
	    gUpdPos = true;
	    gPosChanged = true;
	    fnUpdateOpenPositions();
	}
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
		for(let i=0; i<gCurrPos.TradeData.length; i++){
			if(gCurrPos.TradeData[i].OpenDTVal === parseInt(objLegID.value)){
				gCurrPos.TradeData[i].LotSize = parseFloat(objLotSize.value);
				gCurrPos.TradeData[i].Qty = parseInt(objQty.value);
				gCurrPos.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
				gCurrPos.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
			}
		}

	    let objExcTradeDtls = JSON.stringify(gCurrPos);
	    localStorage.setItem("DeltaCalPosiS", objExcTradeDtls);
	    fnLoadCurrentTradePos();
		fnGenMessage("Option Leg Updated!", `badge bg-success`, "spnGenMsg");
		$('#mdlLegEditor').modal('hide');
	}
	gUpdPos = true;
}

function fnExitAllOpenPosition(){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

	gUpdPos = false;
	fnCloseWS();
	gSymbBRateList = {};
	gSymbBDeltaList = {};

	for(let i=0; i<gCurrPos.TradeData.length; i++){
		if(gCurrPos.TradeData[i].Status === "OPEN"){
		    gCurrPos.TradeData[i].CloseDT = vToday;
		}
		gCurrPos.TradeData[i].Status = "CLOSED";
	}
    let objExcTradeDtls = JSON.stringify(gCurrPos);
    localStorage.setItem("DeltaTrdBkCal", objExcTradeDtls);
    localStorage.removeItem("DeltaCalPosiS");
    gUpdPos = true;
    gPosChanged = true;
    fnLoadCurrentTradePos();

    clearInterval(vTradeInst);
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

function fnGetTradeCapital(pTransType, pBuyPrice, pSellPrice, pLotSize, pQty, pCharges){
    let vTotalCapital = 0;
    
    if(pTransType === "BUY"){
    	vTotalCapital = ((pBuyPrice * pLotSize * pQty) + pCharges);    	
    }
    else{
	    vTotalCapital = ((pSellPrice * pLotSize * pQty) + pCharges) * 1.5;
    }
    
    return vTotalCapital;
}

function fnGetTradePL(pBuyPrice, pSellPrice, pLotSize, pQty, pCharges){
    let vPL = ((pSellPrice - pBuyPrice) * pLotSize * pQty) - pCharges;

    return vPL;
}

function fnLoadClosedTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = JSON.parse(localStorage.getItem("DeltaTrdBkCal"));
    let objHeadPL = document.getElementById("tdHeadPL");

    if (objTradeBook == null) {
        objTodayTradeList.innerHTML = '<tr><td colspan="10"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Closed Trades Yet</div></td></tr>';
    }
    else{
        let vTempHtml = "";
        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;

		for (let i = 0; i < objTradeBook.TradeData.length; i++){
            let vOpenDT = objTradeBook.TradeData[i].OpenDT;
            let vCloseDT = objTradeBook.TradeData[i].CloseDT;
            let vSymbol = objTradeBook.TradeData[i].Symbol;
            let vTransType = objTradeBook.TradeData[i].TransType;
            let vIndexPrice = parseFloat(objTradeBook.TradeData[i].StrikePrice);
            let vLotSize = objTradeBook.TradeData[i].LotSize;
            let vQty = objTradeBook.TradeData[i].Qty;
            let vBuyPrice = objTradeBook.TradeData[i].BuyPrice;
            let vSellPrice = objTradeBook.TradeData[i].SellPrice;
            let vCharges = fnGetTradeCharges(vIndexPrice, vLotSize, vQty, vBuyPrice, vSellPrice);
	        let vCapital = fnGetTradeCapital(vTransType, vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

            vTotalTrades += 1;
            vTotalCharges += parseFloat(vCharges);
            vNetProfit += vPL;

            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vOpenDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vCloseDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + vSymbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + vTransType + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSize + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vQty + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (vBuyPrice).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (vCharges).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">'+ (vPL).toFixed(2) +'</td>';

            vTempHtml += '</tr>';
		}    	
		vTempHtml += '<tr><td>Total Trades </td><td>' + vTotalTrades + '</td><td colspan="3"></td><td colspan="2""></td><td style="font-weight:bold;text-align:right;"></td><td style="font-weight:bold;text-align:right;color:red;">' + (vTotalCharges).toFixed(2) + '</td><td style="font-weight:bold;text-align:right;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objTodayTradeList.innerHTML = vTempHtml;

        if(vNetProfit < 0){
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:red;">' + (vNetProfit).toFixed(2) + '</span>';
        }
        else{
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:green;">' + (vNetProfit).toFixed(2) + '</span>';
        }
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
   	// let objStrats = JSON.parse(localStorage.getItem("DeltaStrats"));

	if(objStrategyName.value === ""){
        fnGenMessage("Please Input Valid Strategy Name!", `badge bg-danger`, "spnStratMsgs");
	}
	else{
		const vToday = new Date();

		gCurrStrats.StratsData.push({ StratID : vToday.valueOf(), StratName : objStrategyName.value, StratDesc : objStrategyDesc.value, SellDeltaMinOC : 0.20, SellDeltaMaxOC : 0.60, SellStartQty : 1000, SellMultiplier : 1, SellAdjDeltaTP : 0.20, SellAdjDeltaSL : 0.80, SellNewPosDelta : 0.53, BuyDeltaMinOC : 0.20, BuyDeltaMaxOC : 0.60, BuyStartQty : 1000, BuyMultiplier : 1, BuyAdjDeltaTP : 0.80, BuyAdjDeltaSL : 0.20, BuyNewPosDelta : 0.53 });

		localStorage.setItem("DeltaStrats", JSON.stringify(gCurrStrats));

		fnLoadCurrStrategies();
		fnLoadDefStrategy();
		$('#mdlDeltaNewStrategy').modal('hide');
        fnGenMessage("New Strategy Created!", `badge bg-success`, "spnGenMsg");
	}
	console.log(gCurrStrats);
}

function fnManageStrategy(){
	$('#mdlStrategyEditor').modal('show');
}

function fnOpenStrategyEditor(){
	$('#mdlStrategyEditor').modal('show');
}

function fnClearLocalStorageTemp(){
    localStorage.removeItem("DeltaCalPosiS");
	localStorage.removeItem("DeltaTrdBkCal");
    localStorage.removeItem("DeltaMaxProfit");
    localStorage.removeItem("DeltaMaxLoss");
    // localStorage.removeItem("DeltaStrats");
    localStorage.removeItem("DeltaDefSymb");
    localStorage.removeItem("DeltaDefStrat");
	// localStorage.removeItem("TrdBkOpt");
	// localStorage.removeItem("StartQtyNoDeltaOpt");
	// localStorage.setItem("QtyMulDeltaOpt", 0);
    // localStorage.removeItem("OptExpDeltaM");
	// localStorage.setItem("TotLossAmtDeltaOpt", 0);
    // clearInterval(gTimerID);
	gSymbBRateList = {};
	gSymbBDeltaList = {};

	fnGetAllStatus();
    console.log("Memory Cleared!!!!");
}

function fnTest(){
	// if(gUpdPos)
	// 	gUpdPos = false;
	// else
	// 	gUpdPos = true;
}