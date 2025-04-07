
let userDeltaWS = "";
let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
		fnLoadAutoTraderStatus();
		fnSetDefaultTraderTab();
	}
});

function fnLoadAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isDelAutoTrader");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");


    if(isLsAutoTrader === null || isLsAutoTrader === "false"){
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
    }
    else{
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
}

function fnStartWS(){
	let objBestBid = document.getElementById("lblBuyPrice");
	let objBestAsk = document.getElementById("lblSellPrice");
    let vUrl = "wss://socket.india.delta.exchange";

    userDeltaWS = new WebSocket(vUrl);

	userDeltaWS.onopen = function (){
		let vSendData = { "type": "subscribe", "payload": { "channels": [{ "name": "v2/ticker", "symbols": ["BTCUSD"] }]}};

		// userDeltaWS.send(JSON.stringify({"type": "enable_heartbeat"}));
		userDeltaWS.send(JSON.stringify(vSendData));
        vTradeInst = setInterval(function () { userDeltaWS.send(JSON.stringify({"type": "ping"})); }, 35000);

		

		console.log("Conn Stated");
	}
	userDeltaWS.onclose = function (){
        clearInterval(vTradeInst);
		console.log("Conn Ended");
	}
	userDeltaWS.onerror = function (){
		console.log("Conn Error");
	}
	userDeltaWS.onmessage = function (pMsg){
		let vTicData = JSON.parse(pMsg.data);

		switch (vTicData.type) {
			case "v2/ticker":
				objBestBid.innerText = (parseInt(vTicData.close)).toFixed(2);
				objBestAsk.innerText = (parseInt(vTicData.spot_price)).toFixed(2);
				break;
			case "heartbeat":
				console.log("Heart Beats");
				break;
			case "pong":
				console.log("Heart Pings");
				break;
		}


		// if(vTicData.type === "v2/ticker"){
		// 	objBestBid.innerText = (parseInt(vTicData.close)).toFixed(2);
		// 	objBestAsk.innerText = (parseInt(vTicData.spot_price)).toFixed(2);
		// }

		console.log(vTicData);
		// console.log(vTicData.quotes.best_bid);
	}
}

function fnCloseWS(){
	userDeltaWS.close();
}