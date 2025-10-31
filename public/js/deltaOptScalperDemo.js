
let obj_WS_OSD = null;
let gByorSl = "";
let gCurrPosOSD = { TradeData : []};
let gBuyPrice, gSellPrice, gLotSize, gQty, gAmtSL, gAmtTP, gCharges, gCapital, gOrderDT = 0;
let gBrokerage = 0.015;
let gLossRecPerct = 50;
let gMultiplierX = 2.0;
let gTradeInst = 0;
let	gManClsStrikeConn = false;
let gSubList = [];
let gUnSubList = [];
let gUpdPos = true;
let gSymbBRateList = {};
let gSymbBDeltaList = {};
let gSymbSRateList = {};
let gSymbSDeltaList = {};
let gForceCloseOSD = false;

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

    socket.on("DeltaEmitOSD", (pMsg) => {
        let isLsAutoTrader = localStorage.getItem("isAutoTraderOSD");
        let vTradeSide = localStorage.getItem("TradeSideSwtS");
        let objMsg = JSON.parse(pMsg);

        fnChangeSymbol(objMsg.symbolName);

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
        	// if(((vTradeSide === "true") && (pMsg.TransType === "buy")) || ((vTradeSide === "false") && (pMsg.TransType === "sell")) || (vTradeSide === "-1")){
        		fnInitManualSellOpt(objMsg.optionType);
        	// }
        	// else{
            //     fnGenMessage(pMsg.TransType +" Trade Message Received, But Not Executed!", "badge bg-warning", "spnGenMsg");
        	// }
        }
    });

    // socket.on("tv-btcusd-close", (pMsg) => {
    //     fnCloseManualFutures(pMsg.TransType);
    // });
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
		fnConnectOSD();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefSymbol();
		fnLoadDefExpiry();
		fnLoadDefDelta();
		fnLoadMarti();
		fnLoadMultiLeg();
		fnLoadDefQty();
		fnLoadLossRecoveryMultiplier();
		fnLoadCurrentTradePos();
		fnUpdateOpenPositions();
		fnLoadSlTp();
		fnLoadTodayTrades();

		fnLoadTradeSide();
	}
}

function fnChangeSymbol(pSymbVal){
	localStorage.setItem("DeltaSymbOSD", JSON.stringify(pSymbVal));

	fnLoadDefSymbol();
}

function fnLoadDefSymbol(){
	let objDefSymM = JSON.parse(localStorage.getItem("DeltaSymbOSD"));
	let objSelSymb = document.getElementById("ddlSymbols");

	if(objDefSymM === null){
		objDefSymM = "";
	}

	objSelSymb.value = objDefSymM;
	fnSetSymbolData(objDefSymM);
}

function fnSetSymbolData(pThisVal){
	let objLotSize = document.getElementById("txtLotSize");

	localStorage.setItem("DeltaSymbOSD", JSON.stringify(pThisVal));

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

function fnLoadDefExpiry(){
	let objExpiry = document.getElementById("txtExpDate");

	let vCurrDate = new Date();
	let vCurrHour = vCurrDate.getHours();

	// if(vCurrHour > 12 && vCurrHour <= 23){
	if(vCurrHour > 2){
		vCurrDate.setDate(vCurrDate.getDate() + 1);		
	}

    let vDay = (vCurrDate.getDate()).toString().padStart(2, "0");
    let vMonth = (vCurrDate.getMonth() + 1).toString().padStart(2, "0");
	let vExpValTB = vCurrDate.getFullYear() + "-" + vMonth + "-" + vDay;

	objExpiry.value = vExpValTB;
}

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDeltaOSD"));
	let objQtyMul = JSON.parse(localStorage.getItem("QtyMultiplierOSD"));

    let objQty = document.getElementById("txtQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 1;
	    	objQty.value = 1;
	    	localStorage.setItem("StartQtyNoDeltaOSD", objStartQty.value);
	    }
	    else{
	    	objStartQty.value = objStartQtyM;
	    	objQty.value = objStartQtyM;
	    }
    }
    else{
    	objQty.value = objQtyMul;
    	objStartQty.value = objStartQtyM;
    }
}

function fnLoadDefDelta(){
	let objDefDeltaM = JSON.parse(localStorage.getItem("DefOptDeltaOSD"));
	let objDelta = document.getElementById("txtSellDelta");

	if(objDefDeltaM === null){
		objDelta.value = 0.53;
	}
	else{
		objDelta.value = objDefDeltaM;
	}
}

function fnSetDefDelta(pThis){
	if(pThis.value === ""){
		pThis.value = 0.1;
		localStorage.setItem("DefOptDeltaOSD", JSON.stringify(0.1));
	}
	else{
		localStorage.setItem("DefOptDeltaOSD", JSON.stringify(pThis.value));
	}
}

function fnLoadLossRecoveryMultiplier(){
	let objLossRecM = JSON.parse(localStorage.getItem("LossRecMOSD"));
	let objProfitMultiX = JSON.parse(localStorage.getItem("MultiplierXOSD"));

	let objLossRecvPerctTxt = document.getElementById("txtLossRecvPerct");
	let objMultiplierXTxt = document.getElementById("txtMultiplierX");

	if(objLossRecM === null || objLossRecM === ""){
		objLossRecvPerctTxt.value = gLossRecPerct;
	}
	else{
		objLossRecvPerctTxt.value = localStorage.getItem("LossRecMOSD");
		gLossRecPerct = parseInt(localStorage.getItem("LossRecMOSD"));
	}

	if(objProfitMultiX === null || objProfitMultiX === ""){
		objMultiplierXTxt.value = gMultiplierX;
	}
	else{
		objMultiplierXTxt.value = localStorage.getItem("MultiplierXOSD");
		gMultiplierX = parseFloat(localStorage.getItem("MultiplierXOSD"));
	}
}

function fnUpdateLossRecPrct(pThisVal){
	localStorage.setItem("LossRecMOSD", pThisVal.value);
	gLossRecPerct = pThisVal.value;
}

function fnUpdateMultiplierX(pThisVal){
	localStorage.setItem("MultiplierXOSD", pThisVal.value);
	gMultiplierX = pThisVal.value;
}

function fnLoadMarti(){
    let vMartiM = JSON.parse(localStorage.getItem("DeltaOptMartiOSD"));
    let objSwtMarti = document.getElementById("swtMartingale");

    if(vMartiM){
    	objSwtMarti.checked = true;
    }
    else{
    	objSwtMarti.checked = false;
    }
}

function fnLoadMultiLeg(){
    let vMultiLegM = JSON.parse(localStorage.getItem("DeltaOptMultiLegOSD"));
    let objSwtMultiLeg = document.getElementById("swtMultiLeg");

    if(vMultiLegM){
    	objSwtMultiLeg.checked = true;
    }
    else{
    	objSwtMultiLeg.checked = false;
    }
}

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOSD", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOSD", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDeltaOSD", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            localStorage.setItem("QtyMultiplierOSD", pThisVal.value);
        }
    }
}

function fnLoadCurrentTradePos(){
    let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrOptPosD"));

	gCurrPosOSD = objCurrPos;

    if(gCurrPosOSD === null){
        gCurrPosOSD = { TradeData : []};
    }
    else{
    	fnSetSymbolTickerList();
    }
}

//******************* WS Connection and Subscription Fully Updated Version ****************//
function fnConnectOSD(){
    let vUrl = "wss://socket.india.delta.exchange";
    obj_WS_OSD = new WebSocket(vUrl);

    obj_WS_OSD.onopen = function (){
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
		console.log("WS is Open!");
    }
    obj_WS_OSD.onerror = function (){
   		setTimeout(fnSubscribeOSD, 3000);
        console.log("WS Error, Trying to Reconnect.....");
    }
    obj_WS_OSD.onclose = function (){
    	if(gForceCloseOSD){
    		gForceCloseOSD = false;
	        console.log("WS Disconnected & Closed!!!!!!");
    	}
    	else{
	   		fnSubscribeOSD();
	        console.log("Restarting WS....");
    	}
    }
    obj_WS_OSD.onmessage = function (pMsg){
        let vTicData = JSON.parse(pMsg.data);

		switch (vTicData.type){
			case "v2/ticker":
				// console.log("Msg Sub Received!!!!!");
				// console.log(vTicData);
				fnUpdateRates(vTicData);
				break;
			case "subscriptions":

	            fnGenMessage("Streaming Subscribed and Started!", `badge bg-success`, "spnGenMsg");
				console.log("Subscribed!!!!!!!");
				break;
			case "unsubscribed":

	            fnGenMessage("Streaming Unsubscribed!", `badge bg-warning`, "spnGenMsg");
				console.log("UnSubscribed!!!!!!");
				break;
		}    	
    }
}

function fnSubscribeOSD(){
	if(obj_WS_OSD === null){
		fnConnectOSD();
		setTimeout(fnSubscribeOSD, 3000);
	    console.log("Connecting WS.....");
	}
	else{
		const vTimer = setInterval(() => {
			if(obj_WS_OSD.readyState === 1){
				clearInterval(vTimer);
				//Write Subscription code here
			    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": gSubList }]}};

			    obj_WS_OSD.send(JSON.stringify(vSendData));
		  		console.log("Subscribing............");
			}
			else{
		  		console.log("Trying to Reconnect...");
				fnConnectOSD();
			}
		}, 3000);
	}
}

function fnUnSubscribeOSD(){
	if(obj_WS_OSD === null){
		fnConnectOSD();
		setTimeout(fnUnSubscribeOSD, 3000);
	    console.log("Already Disconnected, Connecting WS to Unsub.....");
	}
	else{
		const vTimer = setInterval(() => {
			if(obj_WS_OSD.readyState === 1){
				clearInterval(vTimer);
			    let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

			    obj_WS_OSD.send(JSON.stringify(vSendData));
		  		console.log("UnSubscribing........!!!!!");
			}
			else{
		  		console.log("Trying to Reconnect...");
				fnConnectOSD();
			}
		}, 3000);
	}
}

function fnRestartConnOSD(){
	if(obj_WS_OSD !== null){
		obj_WS_OSD.close();
	}
	else{
        console.log("WS already Disconnected and Reconnecting Now......");		
		fnSubscribeOSD();
	}
}

function fnForceDisconnectOSD(){
	if(obj_WS_OSD !== null){
		gForceCloseOSD = true;
		obj_WS_OSD.close();
	}
	else{
        console.log("WS already Disconnected!!!!!!");		
	}
}

function fnCheckStatusOSD(){
	console.log(obj_WS_OSD);	
}

function fnAdd2SubList(){
	let objSymbol = document.getElementById("txtRateTest");

	gSubList.push(objSymbol.value);
	console.log(gSubList);
	fnUnSubscribeOSD();
	fnSubscribeOSD();
}
//******************* WS Connection and Subscription Fully Updated Version ****************//

function fnUpdateRates(pTicData){
	// console.log(pTicData);
    gSymbBRateList[pTicData.symbol] = pTicData.quotes.best_ask;
    gSymbSRateList[pTicData.symbol] = pTicData.quotes.best_bid;

	// if(pTicData.contract_type !== "perpetual_futures"){
	//     gSymbBDeltaList[pTicData.symbol] = pTicData.greeks.delta;
	//     gSymbSDeltaList[pTicData.symbol] = pTicData.greeks.delta;
	// }

    // console.log(gSymbBRateList);
}

function fnSetStrike(pTicData){
	let vSpotPrice = pTicData.spot_price;
	// console.log(vSpotPrice);

	if(vSpotPrice !== ""){
		let objStrikePrice = document.getElementById("txtStrikePrice");

		let vTempVal = Math.round(parseInt(vSpotPrice) / 200) * 200;

		objStrikePrice.value = vTempVal;
	}
}

//************ Update Live Code Here **************//
function fnSaveUpdCurrPos(){
	let vToPosClose = false;
	let vLegID = 0;
	let vTransType = "";
	let vOptionType = "";
	let vSymbol = "";

    for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
    	if(gCurrPosOSD.TradeData[i].Status === "OPEN"){
			let vAmtTP = gCurrPosOSD.TradeData[i].AmtTP;
			let vAmtSL = gCurrPosOSD.TradeData[i].AmtSL;

    		if(gCurrPosOSD.TradeData[i].TransType === "sell"){
    			// ****************** Uncomment When Live *****************//
    			let vCurrPrice = parseFloat(gSymbBRateList[gCurrPosOSD.TradeData[i].Symbol]);
				gCurrPosOSD.TradeData[i].BuyPrice = vCurrPrice;
    			// ****************** Uncomment When Live *****************//

    			// // ****************** Remove When Live *****************//
    			// vCurrPrice = gCurrPosOSD.TradeData[i].BuyPrice;
    			// // ****************** Remove When Live *****************//

				if((vCurrPrice >= vAmtSL) || (vCurrPrice <= vAmtTP)){
					vLegID = gCurrPosOSD.TradeData[i].OpenDTVal;
					vTransType = gCurrPosOSD.TradeData[i].TransType;
					vOptionType = gCurrPosOSD.TradeData[i].OptionType;
					vSymbol = gCurrPosOSD.TradeData[i].Symbol;
					vToPosClose = true;
				}
    		}
    		else if(gCurrPosOSD.TradeData[i].TransType === "buy"){
    			let vCurrPrice = parseFloat(gSymbSRateList[gCurrPosOSD.TradeData[i].Symbol]);
				gCurrPosOSD.TradeData[i].SellPrice = vCurrPrice;

				if((vCurrPrice <= vAmtSL) || (vCurrPrice >= vAmtTP)){
					vLegID = gCurrPosOSD.TradeData[i].OpenDTVal;
					vTransType = gCurrPosOSD.TradeData[i].TransType;
					vOptionType = gCurrPosOSD.TradeData[i].OptionType;
					vSymbol = gCurrPosOSD.TradeData[i].Symbol;
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

//************ Update Live Code Here **************//
async function fnCloseOptPosition(pLegID, pTransType, pOptType, pSymbol, pStatus){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");

	let objBestRates = await fnGetBestRatesBySymbId(objApiKey.value, objApiSecret.value, pSymbol);
	
	if(objBestRates.status === "success"){
	    let vDate = new Date();
	    let vMonth = vDate.getMonth() + 1;
	    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
	
		let vBestBuyRate = parseFloat(objBestRates.data.result.quotes.best_ask);

		let vIndexPrice = 0;
		let vLotSize = 0;
		let vQty = 0;
		let vBuyPrice = 0;
		let vSellPrice = 0;

		gUpdPos = false;

		gSymbBRateList = {};
		gSymbBDeltaList = {};
		gSymbSRateList = {};
		gSymbSDeltaList = {};

		for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
			if(gCurrPosOSD.TradeData[i].OpenDTVal === pLegID){
				//*********************** Uncomment When Live ******************//
				gCurrPosOSD.TradeData[i].BuyPrice = vBestBuyRate;
				//*********************** Uncomment When Live ******************//

			    gCurrPosOSD.TradeData[i].CloseDT = vToday;
				gCurrPosOSD.TradeData[i].Status = pStatus;

				vIndexPrice = gCurrPosOSD.TradeData[i].StrikePrice;
				vLotSize = gCurrPosOSD.TradeData[i].LotSize;
				vQty = gCurrPosOSD.TradeData[i].Qty;
				vBuyPrice = gCurrPosOSD.TradeData[i].BuyPrice;
				vSellPrice = gCurrPosOSD.TradeData[i].SellPrice;
			}
		}

		let vTotLossAmt = localStorage.getItem("TotLossAmtOSD");
        let vCharges = fnGetTradeCharges(vIndexPrice, vLotSize, vQty, vBuyPrice, vSellPrice);
        let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);

        vTotLossAmt = parseFloat(vTotLossAmt) + parseFloat(vPL);
		localStorage.setItem("TotLossAmtOSD", vTotLossAmt);

	    let objExcTradeDtls = JSON.stringify(gCurrPosOSD);
	    localStorage.setItem("DeltaCurrOptPosD", objExcTradeDtls);

	    gUpdPos = true;
		fnSetSymbolTickerList();
	    fnUpdateOpenPositions();
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

        fetch("/deltaExcOptSclprD/getBestRatesBySymb", requestOptions)
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

function fnLoadSlTp(){
    let objCurrSlTp = JSON.parse(localStorage.getItem("DeltaCurrOptSlTpOSD"));
    let objTxtSL = document.getElementById("txtPercentSL");
    let objTxtTP = document.getElementById("txtPercentTP");

    if(objCurrSlTp === null){
    	let objSlTp = { PercentSL : 30, PercentTP : 80 };
    	localStorage.setItem("DeltaCurrOptSlTpOSD", JSON.stringify(objSlTp));
    	objTxtSL.value = 30;
    	objTxtTP.value = 80;
    }
    else{
    	objTxtSL.value = objCurrSlTp.PercentSL;
    	objTxtTP.value = objCurrSlTp.PercentTP;
    }
}

function fnUpdateSlTp(){
    let objTxtSL = document.getElementById("txtPercentSL");
    let objTxtTP = document.getElementById("txtPercentTP");

    let objSlTp = { PercentSL : objTxtSL.value, PercentTP : objTxtTP.value };
    localStorage.setItem("DeltaCurrOptSlTpOSD", JSON.stringify(objSlTp));

    fnGenMessage("Updated SL & TP!", `badge bg-success`, "spnGenMsg");    
}

async function fnInitManualSellOpt(pOptType){
	let objSymbol = document.getElementById("ddlSymbols");
	let objLotSize = document.getElementById("txtLotSize");
	let objQty = document.getElementById("txtQty");
	let objExpiry = document.getElementById("txtExpDate");
	let objSellDelta = document.getElementById("txtSellDelta");
    let objSwtMultiLeg = document.getElementById("swtMultiLeg");
    let isMultiLegAllowed = false;

    if(objSwtMultiLeg.checked){
    	isMultiLegAllowed = true;
    }

	if(objSymbol.value === ""){
        fnGenMessage("Select Symbol to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(objQty.value === "" || parseInt(objQty.value) < 1){
        fnGenMessage("Input Quantity to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(objExpiry.value === ""){
        fnGenMessage("Input or Select Expiry to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else if(objSellDelta.value === ""){
        fnGenMessage("Input Delta value to Start Trade!", `badge bg-warning`, "spnGenMsg");		
	}
	else{
		if(((gCurrPosOSD.TradeData.length === 0) && (isMultiLegAllowed === false)) || (isMultiLegAllowed)){
			let vSelDate = new Date(objExpiry.value);
		    let vExDay = (vSelDate.getDate()).toString().padStart(2, "0");
		    let vExMonth = (vSelDate.getMonth() + 1).toString().padStart(2, "0");
		    let vExYear = vSelDate.getFullYear();
		    // vExYear = ((vExYear).toString()).slice(2);
			let vExpValTB = vExDay + "-" + vExMonth + "-" + vExYear;
			let vContractType = "";
			let vStartQty = document.getElementById("txtStartQty").value;
			let vNetPL = localStorage.getItem("CurrPLOSD");

			if(gCurrPosOSD.TradeData.length === 0){
				objQty.value = vStartQty;
			}
			else{
				if(parseFloat(vNetPL) < 0){
					// let vTempQty = parseInt(objQty.value) + parseInt(vStartQty);
					let vTempQty = parseInt(objQty.value) * 2;
					localStorage.setItem("QtyMultiplierOSD", vTempQty);
					objQty.value = vTempQty;
				}
				else{
					// let vTempQty = parseInt(objQty.value) - parseInt(vStartQty);
					let vTempQty = parseInt(objQty.value) / 2;
					if(vTempQty < parseInt(vStartQty)){
						vTempQty = parseInt(vStartQty);
					}
					localStorage.setItem("QtyMultiplierOSD", vTempQty);
					objQty.value = vTempQty;
				}
			}

		    if(pOptType === "C"){
		        vContractType = "call_options";
		    }
		    else if(pOptType === "P"){
		        vContractType = "put_options";
		    }
		    else{
		        vContractType = "";
		    }

	        let objTradeDtls = await fnGetExecutedTrdDtls(pOptType, objSymbol.value, vExpValTB, objQty.value, objSellDelta.value, vContractType);
	        if(objTradeDtls.status === "success"){
	        	gUpdPos = false;
	            let vDate = new Date();
	            let vOrdId = vDate.valueOf();
	            let vClientOrderID = vDate.valueOf();
	            let vMonth = vDate.getMonth() + 1;
	            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();
			    let objLotSize = document.getElementById("txtLotSize");
			    let vSLPercent = parseFloat(document.getElementById("txtPercentSL").value);
			    let vTPPercent = parseFloat(document.getElementById("txtPercentTP").value);
			    let vProductID = objTradeDtls.data.ProductID;
			    let vSymbol = objTradeDtls.data.Symbol;
				let vTransType = "sell";
				let vUndrAstSymb = objTradeDtls.data.UndrAsstSymb;
				let vCntrctType = objTradeDtls.data.ContType;
				let vExpiry = fnSetDDMMYYYY(vSelDate);
			    let vBestBuy = parseFloat(objTradeDtls.data.BestAsk);
			    let vBestSell = parseFloat(objTradeDtls.data.BestBid);
	            let vDelta = parseFloat(objTradeDtls.data.Delta);
	            let vVega = parseFloat(objTradeDtls.data.Vega);
	            let vStrPrice = parseInt(objTradeDtls.data.Strike);

			    let vSLPoints = (vBestSell * vSLPercent)/100;
			    let vTPPoints = (vBestSell * vTPPercent)/100;

	            let vAmtSL = (vBestSell + vSLPoints).toFixed(2);
	            let vAmtTP = (vBestSell - vTPPoints).toFixed(2);

	            let vExcTradeDtls = { OrderID : vOrdId, ClientOrderID : vClientOrderID, ProductID : vProductID, OpenDT : vToday, Symbol : vSymbol, UndrAsstSymb : vUndrAstSymb, ContrctType : vCntrctType, TransType : vTransType, OptionType : pOptType, StrikePrice : vStrPrice, Expiry : vExpiry, LotSize : parseFloat(objLotSize.value), Qty : parseInt(objQty.value), BuyPrice : vBestBuy, SellPrice : vBestSell, AmtSL : parseFloat(vAmtSL), AmtTP : parseFloat(vAmtTP), PointsSL: vSLPoints, PointsTP : vTPPoints, Delta : vDelta, Vega : vVega, OpenDTVal : vClientOrderID, DeltaNP : objSellDelta.value, Status : "OPEN" };
		            gCurrPosOSD.TradeData.push(vExcTradeDtls);
		            let objExcTradeDtls = JSON.stringify(gCurrPosOSD);

		            localStorage.setItem("DeltaCurrOptPosD", objExcTradeDtls);
					localStorage.setItem("QtyMultiplierOSD", objQty.value);

					gUpdPos = true;
					fnSetSymbolTickerList();
	        	    fnUpdateOpenPositions();

	            fnGenMessage(objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
	        }
	        else{
	            fnGenMessage(objTradeDtls.message, `badge bg-${objTradeDtls.status}`, "spnGenMsg");
	        }
		}
		else{
	        fnGenMessage("Multi Leg Position Switch is Off!", `badge bg-warning`, "spnGenMsg");
		}
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

function fnSetSymbolTickerList(){
	if(gCurrPosOSD.TradeData.length > 0){
	    const objSubListArray = [];
	    gSubList = [];

		for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
			if(gCurrPosOSD.TradeData[i].Status === "OPEN"){
		        objSubListArray.push(gCurrPosOSD.TradeData[i].Symbol);
			}
		}
		const setSubList = new Set(objSubListArray);
		gSubList = [...setSubList];
		fnUnSubscribeOSD();
		fnSubscribeOSD();

        clearInterval(gTradeInst);
	    gTradeInst = setInterval(fnSaveUpdCurrPos, 15000);
	}
}

//********* Temp Trade Book **************//
function fnUpdateOpenPositions(){
	if(gUpdPos){
	    let objCurrTradeList = document.getElementById("tBodyCurrTrades");

	    if(gCurrPosOSD.TradeData.length === 0){
	        objCurrTradeList.innerHTML = '<tr><td colspan="13"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>';
	    }
	    else{
	        let vTempHtml = "";
	        let vTotalTrades = 0;
	        let vNetPL = 0;
	        let vTotalCharges = 0;
	        let vTotalCapital = 0;
	        let vDeployedCapital = 20000;
	        let vLegMultiplier = 2;
		    let vPercentPL = 0;
		    let vLastPL = 0;
		    let vLastCharges = 0;

	        for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
	        	let vProductID = gCurrPosOSD.TradeData[i].ProductID;
	            let vLegID = gCurrPosOSD.TradeData[i].OpenDTVal;
	            let vOpenDT = gCurrPosOSD.TradeData[i].OpenDT;
	            let vSymbol = gCurrPosOSD.TradeData[i].Symbol;
	            let vTransType = gCurrPosOSD.TradeData[i].TransType;
	            let vOptionType = gCurrPosOSD.TradeData[i].OptionType;
	            let vExpiry = gCurrPosOSD.TradeData[i].Expiry;
	            let vUndrAsstSymb = gCurrPosOSD.TradeData[i].UndrAsstSymb;
	            let vIndexPrice = parseFloat(gCurrPosOSD.TradeData[i].StrikePrice);
	            let vDelta = gCurrPosOSD.TradeData[i].Delta;
	            let vLotSize = gCurrPosOSD.TradeData[i].LotSize;
	            let vQty = gCurrPosOSD.TradeData[i].Qty;
	            let vPointsTP = gCurrPosOSD.TradeData[i].PointsTP;
	            let vPointsSL = gCurrPosOSD.TradeData[i].PointsSL;
	            let vAmtTP = gCurrPosOSD.TradeData[i].AmtTP;
	            let vAmtSL = gCurrPosOSD.TradeData[i].AmtSL;
	            let vDeltaNPos = gCurrPosOSD.TradeData[i].DeltaNP;
	            let vBuyPrice = gCurrPosOSD.TradeData[i].BuyPrice;
	            let vSellPrice = gCurrPosOSD.TradeData[i].SellPrice;
	            let vStatus = gCurrPosOSD.TradeData[i].Status;
	            let vCharges = fnGetTradeCharges(vIndexPrice, vLotSize, vQty, vBuyPrice, vSellPrice);
		        let vCapital = fnGetTradeCapital(vTransType, vBuyPrice, vSellPrice, vLotSize, vQty);
	            let vPL = fnGetTradePL(vBuyPrice, vSellPrice, vLotSize, vQty, vCharges);
                vNetPL += parseFloat(vPL);
                vLastPL = parseFloat(vPL);
                vLastCharges = parseFloat(vCharges);
	            vTotalCharges += parseFloat(vCharges);
	            vTotalTrades += 1;

	            if(vStatus === "OPEN"){
	                vTotalCapital += parseFloat(vCapital);

		            vTempHtml += '<tr>';
		            vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye" aria-hidden="true" style="color:green;" title="Close This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `CLOSED`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-exchange" aria-hidden="true" style="color:orange;" onclick="//fnSwapOption('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vExpiry +'`, `'+ vUndrAsstSymb +'`, '+ vLotSize +', '+ vQty +', '+ vLegMultiplier +', '+ vAmtTP +', '+ vAmtSL +', '+ vDeltaNPos +');"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';

		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vOpenDT + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; font-weight:bold; color:orange;">' + (vDelta).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vSymbol + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vTransType + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#0078ff;">' + vLotSize + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; color:#e3ff00;">' + vQty + '</td>';
		            if(vTransType === "sell"){
			            vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vBuyPrice).toFixed(2) + '</span></td>';
			            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vSellPrice).toFixed(2) + '</td>';
		            }
		            else if(vTransType === "buy"){
			            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (vBuyPrice).toFixed(2) + '</td>';
			            vTempHtml += '<td id="'+ vSymbol +'" style="text-wrap: nowrap; color:white;text-align:right;"><span class="blink">' + (vSellPrice).toFixed(2) + '</span></td>';
		            }
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + (parseFloat(vCapital)).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;color:#ff9a00;">'+ (vPL).toFixed(2) +'</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vStatus + '</td>';

		            vTempHtml += '</tr>';
	            }
	            else{
		            vTempHtml += '<tr>';
		            vTempHtml += '<td style="text-wrap: nowrap;"><i class="fa fa-eye-slash" aria-hidden="true" style="color:red;" title="Re-open This Leg!" onclick="fnCloseOptPosition('+ vLegID +', `'+ vTransType +'`, `'+ vOptionType +'`, `'+ vSymbol +'`, `OPEN`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-exchange" style="color:#808080;" aria-hidden="true" onclick="//alert(`Position Already Closed!`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-wrench" aria-hidden="true" style="color:#01ff1f;" onclick="fnOpenEditModel('+ vLegID +', '+ vLotSize +', '+ vQty +', `'+ vBuyPrice +'`, `'+ vSellPrice +'`);"></i>&nbsp;&nbsp;&nbsp;<i class="fa fa-trash-o" aria-hidden="true" style="color:red;" onclick="fnDelLeg('+ vLegID +');"></i></td>';
		            vTempHtml += '<td style="text-wrap: nowrap; color:#808080; text-align:center;">' + vOpenDT + '</td>';
		            vTempHtml += '<td style="text-wrap: nowrap; text-align:right; font-weight:bold; color:#808080;">' + (vDelta).toFixed(2) + '</td>';
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
	            	// gUnSubList.push(vSymbol);
	            }
	        }
	        vTempHtml += '<tr><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Total Trades: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vTotalTrades +'</td><td></td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">Investment: </td><td style="text-wrap: nowrap; text-align:right; font-weight:bold;">'+ vDeployedCapital +'</td><td></td><td></td><td></td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCapital).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: red; font-weight:bold;">'+ (vTotalCharges).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vNetPL).toFixed(2) +'</td><td style="text-wrap: nowrap; text-align:right; color: white; font-weight:bold;">'+ (vPercentPL).toFixed(1) +'%</td></tr>';
	        objCurrTradeList.innerHTML = vTempHtml;

			localStorage.setItem("CurrPLOSD", vLastPL);

	        if(gCurrPosOSD.TradeData.length > 1){
	        	fnExecClsTrdOnLossRec(vNetPL, vLastCharges, vTotalCapital);
	        }
	    }
	}
}

function fnExecClsTrdOnLossRec(pNetPL, pLastCharges, vTotalCapital){
	let vTotalPL = localStorage.getItem("TotLossAmtOSD");
	let objMultiplier = document.getElementById("txtMultiplierX");
	let vMulCharges = parseFloat(pLastCharges) * parseFloat(objMultiplier.value);

	if((parseFloat(vTotalPL) < 0) && parseFloat(pNetPL) > 0){
		// let vCalcProfit = Math.abs(parseInt(vTotalPL) * parseFloat(objMultiplier.value));

		// console.log("vCalcProfit: " + vCalcProfit);
		// console.log("pNetPL: " + pNetPL);

		if(parseFloat(pNetPL) >= parseFloat(vTotalCapital)){
		console.log("Total Loss Recovery done....");
			fnClsAllOpenPos();
		}
		else{
			// console.log("Still Waiting for Total Loss Recovery....");
		}
	}
	else if((parseFloat(pNetPL) > 0) && (parseFloat(pNetPL) > vMulCharges)){
		console.log("Brokerage Recovery done....");
		fnClsAllOpenPos();
	}
	else{
		// console.log("No Prev Losses!!!");
	}
	// console.log("vTotalPL: " + vTotalPL);
	// console.log("pLastCharges: " + pLastCharges);
	// console.log("vMultiplier: " + objMultiplier.value);
}

function fnClsAllOpenPos(){
    let vDate = new Date();
    let vMonth = vDate.getMonth() + 1;
    let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

		gUpdPos = false;

		gSymbBRateList = {};
		gSymbBDeltaList = {};
		gSymbSRateList = {};
		gSymbSDeltaList = {};

	for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
		if(gCurrPosOSD.TradeData[i].Status === "OPEN"){
		    gCurrPosOSD.TradeData[i].CloseDT = vToday;
			gCurrPosOSD.TradeData[i].Status = "CLOSED";
		}
	}

    let objTodayTrades = JSON.parse(localStorage.getItem("TrdBkOSD"));

    if(objTodayTrades === null){
        localStorage.setItem("TrdBkOSD", JSON.stringify(gCurrPosOSD));
    }
    else{
        let vExistingData = objTodayTrades;
        vExistingData.TradeData.push(gCurrPosOSD.TradeData[0]);
        localStorage.setItem("TrdBkOSD", JSON.stringify(vExistingData));
    }

    localStorage.removeItem("DeltaCurrOptPosD");
    fnLoadCurrentTradePos();

    gUpdPos = true;

    clearInterval(gTradeInst);
	fnSetSymbolTickerList();
    fnUpdateOpenPositions();

	fnLoadTodayTrades();

	console.log("############# Closed All Positions ##############");
}

function fnGetExecutedTrdDtls(pOptType, pSymbol, pExpiry, pQty, pSellDelta, pContractType){
	const objPromise = new Promise((resolve, reject) => {

	    let objApiKey = document.getElementById("txtUserAPIKey");
	    let objApiSecret = document.getElementById("txtAPISecret");

	    let vHeaders = new Headers();
	    vHeaders.append("Content-Type", "application/json");

	    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, OptType : pOptType, Symbol : pSymbol, Expiry : pExpiry, Qty : pQty, SellDelta : pSellDelta, ContractType : pContractType });

	    let requestOptions = {
	        method: 'POST',
	        headers: vHeaders,
	        body: vAction,
	        redirect: 'follow'
	    };

	    fetch("/deltaExcOptSclprD/getSellOptOpenStatus", requestOptions)
	    .then(response => response.json())
	    .then(objResult => {

	        if(objResult.status === "success"){
	        	// let vRes = JSON.parse(objResult.data);

	            // let objData = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
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
	        else if(objResult.status === "warning"){
	            // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	        else{
	            fnGenMessage("Error in Getting Best Rates Data, Contact Admin!", `badge bg-danger`, "spnGenMsg");
                reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
	        }
	    })
	    .catch(error => {
	        // fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting Fut Best Rates...", "data": "" });
	    });
	});

    return objPromise;
}

function fnChangeMartingale(){
    // let vMartiM = JSON.parse(localStorage.getItem("DeltaOptMartiOSD"));
    let objSwtMarti = document.getElementById("swtMartingale");

    localStorage.setItem("DeltaOptMartiOSD", JSON.stringify(objSwtMarti.checked));
    // alert(objSwtMarti.checked);
}

function fnChangeMultiLeg(){
    let objSwtMultiLeg = document.getElementById("swtMultiLeg");

    localStorage.setItem("DeltaOptMultiLegOSD", JSON.stringify(objSwtMultiLeg.checked));
}

//************ TradeBook ****************//
function fnLoadTodayTrades(){
    let objTodayTradeList = document.getElementById("tBodyTodayPaperTrades");
   	let objTradeBook = JSON.parse(localStorage.getItem("TrdBkOSD"));
    let objHeadPL = document.getElementById("tdHeadPL");
    let objYtRL = document.getElementById("spnYtRL");
    
    if (objTradeBook === null) {
    	//<tr><td colspan="13"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Running Trades Yet</div></td></tr>
        objTodayTradeList.innerHTML = '<tr><td colspan="11"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Trades Yet</div></td></tr>';
    }
    else{
        let vTempHtml = "";
        let vTotalTrades = 0;
        let vNetProfit = 0;
        let vTotalCharges = 0;
        let vHighCapital = 0;

		for (let i = 0; i < objTradeBook.TradeData.length; i++){
			let vCharges = fnGetTradeCharges(objTradeBook.TradeData[i].StrikePrice, objTradeBook.TradeData[i].LotSize, objTradeBook.TradeData[i].Qty, objTradeBook.TradeData[i].BuyPrice, objTradeBook.TradeData[i].SellPrice);
    		let vCapital = fnGetTradeCapital(objTradeBook.TradeData[i].TransType, objTradeBook.TradeData[i].BuyPrice, objTradeBook.TradeData[i].SellPrice, objTradeBook.TradeData[i].LotSize, objTradeBook.TradeData[i].Qty);
    		let vPL = fnGetTradePL(objTradeBook.TradeData[i].BuyPrice, objTradeBook.TradeData[i].SellPrice, objTradeBook.TradeData[i].LotSize, objTradeBook.TradeData[i].Qty, vCharges);
            vTotalTrades += 1;
            vTotalCharges += parseFloat(vCharges);
            vNetProfit += vPL;

	        if(parseFloat(vCapital) > vHighCapital){
	            vHighCapital = vCapital;
	        }

            vTempHtml += '<tr>';
            vTempHtml += '<td style="text-wrap: nowrap;" onclick=\'fnDeleteThisTrade(' + objTradeBook.TradeData[i].OrderID + ');\'>' + objTradeBook.TradeData[i].OpenDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTradeBook.TradeData[i].CloseDT + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; font-weight:bold;">' + objTradeBook.TradeData[i].Symbol + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap;">' + objTradeBook.TradeData[i].TransType + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objTradeBook.TradeData[i].LotSize + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + objTradeBook.TradeData[i].Qty + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:green;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].BuyPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:red;text-align:right;">' + (parseFloat(objTradeBook.TradeData[i].SellPrice)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(vCapital)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; color:orange;text-align:right;">' + (parseFloat(vCharges)).toFixed(2) + '</td>';
            vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">'+ (vPL).toFixed(2) +'</td>';

            vTempHtml += '</tr>';
		}    	
		vTempHtml += '<tr><td>Total Trades </td><td>' + vTotalTrades + '</td><td colspan="3"></td><td colspan="3""></td><td style="font-weight:bold;text-align:right;">' + (vHighCapital).toFixed(2) + '</td><td style="font-weight:bold;text-align:right;color:red;">' + (vTotalCharges).toFixed(2) + '</td><td style="font-weight:bold;text-align:right;">' + (vNetProfit).toFixed(2) + '</td></tr>';

        objTodayTradeList.innerHTML = vTempHtml;

        if(vNetProfit < 0){
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:red;">' + (vNetProfit).toFixed(2) + '</span>';
        }
        else{
            objHeadPL.innerHTML = '<span Style="text-align:left;font-weight:bold;color:green;">' + (vNetProfit).toFixed(2) + '</span>';
        }
        objYtRL.innerText = parseFloat(localStorage.getItem("TotLossAmtOSD")).toFixed(2);
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

function fnGetTradeCapital(pTransType, pBuyPrice, pSellPrice, pLotSize, pQty){
    let vTotalCapital = 0;
    
    if(pTransType === "buy"){
    	vTotalCapital = ((pBuyPrice * pLotSize * pQty));    	
    }
    else{
	    vTotalCapital = ((pSellPrice * pLotSize * pQty));
    }
    
    return vTotalCapital;
}

function fnGetTradePL(pBuyPrice, pSellPrice, pLotSize, pQty, pCharges){
    let vPL = ((pSellPrice - pBuyPrice) * pLotSize * pQty) - pCharges;

    return vPL;
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
		for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
			if(gCurrPosOSD.TradeData[i].OpenDTVal === parseInt(objLegID.value)){
				gCurrPosOSD.TradeData[i].LotSize = parseFloat(objLotSize.value);
				gCurrPosOSD.TradeData[i].Qty = parseInt(objQty.value);
				gCurrPosOSD.TradeData[i].BuyPrice = parseFloat(objBuyPrice.value);
				gCurrPosOSD.TradeData[i].SellPrice = parseFloat(objSellPrice.value);
			}
		}

	    let objExcTradeDtls = JSON.stringify(gCurrPosOSD);
	    localStorage.setItem("DeltaCurrOptPosD", objExcTradeDtls);
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
		gSymbBDeltaList = {};
		gSymbSRateList = {};
		gSymbSDeltaList = {};

		let vDelRec = null;

		for(let i=0; i<gCurrPosOSD.TradeData.length; i++){
			if(gCurrPosOSD.TradeData[i].OpenDTVal === pLegID){
				vDelRec = i;
			}
		}

		gCurrPosOSD.TradeData.pop(vDelRec);

	    let objExcTradeDtls = JSON.stringify(gCurrPosOSD);
	    localStorage.setItem("DeltaCurrOptPosD", objExcTradeDtls);
	    gUpdPos = true;

		fnSetSymbolTickerList();
	    fnUpdateOpenPositions();
	}
}

function fnClearLocalStorageTemp(){
    localStorage.removeItem("DeltaCurrOptPosD");
	localStorage.removeItem("TrdBkOSD");
	// localStorage.removeItem("StartQtyNoDeltaOSD");
	// localStorage.removeItem("DeltaOptMartiOSD");
	// localStorage.removeItem("DeltaOptMultiLegOSD");
	localStorage.setItem("QtyMultiplierOSD", 0);
	localStorage.setItem("TotLossAmtOSD", 0);
	localStorage.setItem("CurrPLOSD", 0);
    localStorage.removeItem("LossRecMOSD");
	localStorage.removeItem("MultiplierXOSD");
	localStorage.removeItem("DeltaCurrOptSlTpOSD");

	gSymbBRateList = {};
	gSymbBDeltaList = {};
	gSymbSRateList = {};
	gSymbSDeltaList = {};

	fnGetAllStatus();
	console.log("Memory Cleared!!!");
}

function fnPositionStatus(){
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("DeltaCurrOptPosD") === null)
    {
        fnGenMessage("Position Closed!", `badge bg-success`, "spnGenMsg");
        fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
    }
    else
    {
        objBtnPosition.className = "badge bg-warning";
        objBtnPosition.innerText = "Position is open";
        fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");
    }
}

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


//********** Sample Code to Place Order *************//
function fnPlaceLimitOrder(){
    let objApiKey = document.getElementById("txtUserAPIKey");
    let objApiSecret = document.getElementById("txtAPISecret");
    let objFutDDL = document.getElementById("ddlSymbols");
    let objClientOrderId = document.getElementById("hidClientOrderId");

    let vDate = new Date();
    let vOrdId = vDate.valueOf();
    objClientOrderId.value = vOrdId;

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ ApiKey : objApiKey.value, ApiSecret : objApiSecret.value, ClientOrderID : vOrdId });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExcFut/placeLimitOrder", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){

        	console.log(objResult);
            // let objBestRates = { BestBuy : vRes.result.quotes.best_ask, BestSell : vRes.result.quotes.best_bid }

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
        	console.log(objResult);
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            fnGenMessage(objResult.data.response.body.error.code + " for IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error in Placing Limit Order!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}