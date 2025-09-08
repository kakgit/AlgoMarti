let objDeltaWS = null;
let gCurrPos = null;

window.addEventListener("DOMContentLoaded", function(){
	fnGetAllStatus();

});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
		fnLoadDefQty();
		fnFillEpiryDates();
		// fnLoadLossRecoveryMultiplier();
		// fnLoadCurrentTradePos();
		// // UNCOMMENT for LIVE TRADING in DEMO
		// fnSubscribe();
		// fnGetHistoricalOHLC();
		// fnSubscribeInterval();
		// // UNCOMMENT for LIVE TRADING in DEMO
		// fnSetInitFutTrdDtls();
		// fnLoadSlTp();
		// fnLoadTodayTrades();

		fnLoadTradeSide();
	}
}

function fnFillEpiryDates(){
	let objExpiry = document.getElementById("selExpiry");

    objExpiry.innerHTML += "<option value='120925'>12-09-2025</option>";
    objExpiry.innerHTML += "<option value='190925'>19-09-2025</option>";
    objExpiry.innerHTML += "<option value='260925'>26-09-2025</option>";

}

function fnLoadDefQty(){
	let objStartQtyM = JSON.parse(localStorage.getItem("StartQtyNoDeltaOpt"));
	let objQtyMul = JSON.parse(localStorage.getItem("QtyMulDeltaOpt"));

    let objQty = document.getElementById("txtQty");
    let objStartQty = document.getElementById("txtStartQty");

    if(objQtyMul === null || objQtyMul < 1 || objQtyMul < objStartQtyM){
	    if(objStartQtyM === null){
	    	objStartQty.value = 100;
	    	objQty.value = 100;
	    	localStorage.setItem("StartQtyNoDeltaOpt", objStartQty.value);
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

function fnChangeStartQty(pThisVal){
    let objQty = document.getElementById("txtQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOpt", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDeltaOpt", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDeltaOpt", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            localStorage.setItem("QtyMulDeltaOpt", pThisVal.value);
        }
    }
}

function fnConnectWS(){
    let vUrl = "wss://socket.india.delta.exchange";
    objDeltaWS = new WebSocket(vUrl);

    objDeltaWS.onopen = function (){
        // let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": ["BTCUSD"] }]}};

        // objDeltaWS.send(JSON.stringify(vSendData));
        console.log("Conn Started......");
        fnGenMessage("Streaming Connection Started and Open!", `badge bg-success`, "spnGenMsg");
    }
    objDeltaWS.onclose = function (){
		let objSpotPrice = document.getElementById("txtSpotPrice");
		// let objBestBuy = document.getElementById("txtBestBuyPrice");
		// let objBestSell = document.getElementById("txtBestSellPrice");

		objDeltaWS = null;
		objSpotPrice.value = "";
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

		// console.log(vTicData);
		switch (vTicData.type){
			case "v2/ticker":
				console.log(vTicData);
				// fnGetRates(vTicData);
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
	let objDdlSymbol = document.getElementById("ddlFuturesSymbols");

	if(objDeltaWS === null){
		fnConnectWS();
		// console.log("WS is looping to Connect.....");
		setTimeout(fnSubscribe, 3000);
	}
	else{
	    let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": [ objDdlSymbol.value ] }]}};
		// console.log("Subscribing to Channel....");
	    objDeltaWS.send(JSON.stringify(vSendData));
	}
}

function fnUnsubscribe(){
	let objSpotPrice = document.getElementById("txtSpotPrice");
	let objBestBuy = document.getElementById("txtBestBuyPrice");
	let objBestSell = document.getElementById("txtBestSellPrice");

	if(objDeltaWS === null){
	    fnGenMessage("Already Streaming is Unsubscribed & Disconnected!", `badge bg-warning`, "spnGenMsg");
	}
	else{
	    let vSendData = { "type": "unsubscribe", "payload": { "channels": [{ "name": "v2/ticker" }]}};

	    objDeltaWS.send(JSON.stringify(vSendData));
	}
	objSpotPrice.value = "";
	objBestBuy.value = "";
	objBestSell.value = "";
}



function fnClearLocalStorageTemp(){
    // localStorage.removeItem("DeltaCurrFutPosiS");
	// localStorage.removeItem("TrdBkFut");
	localStorage.removeItem("StartQtyNoDeltaOpt");
	localStorage.setItem("QtyMulDeltaOpt", 0);
	// localStorage.setItem("TotLossAmtDeltaOpt", 0);
    // clearInterval(gTimerID);

	fnGetAllStatus();
}


//********** Indicators Sections *************//

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    localStorage.setItem("TradeSideOptSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideOptSwtS") === null){
        localStorage.setItem("TradeSideOptSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideOptSwtS");
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
