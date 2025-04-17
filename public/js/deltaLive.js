
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

function fnGetUserWallet(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getUserWallet", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            console.log(objResult);

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error in getting Wallet Information, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error to Fetch Wallet Details!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetProductLeverage(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getProductLeverage", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            console.log(objResult);

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error in getting Product Leverage Information, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error to Fetch Leverage Details!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnSetProductLeverage(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/setProductLeverage", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            console.log(objResult);

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error in Changing Product Leverage!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage("Error in Changing Leverage!", `badge bg-danger`, "spnGenMsg");
    });
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
        //vTradeInst = setInterval(function () { userDeltaWS.send(JSON.stringify({"type": "ping"})); }, 35000);

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
				// objBestBid.innerText = (parseInt(vTicData.close)).toFixed(2);
				// objBestAsk.innerText = (parseInt(vTicData.spot_price)).toFixed(2);
				objBestBid.innerText = (parseInt(vTicData.quotes.best_ask)).toFixed(2);
				objBestAsk.innerText = (parseInt(vTicData.quotes.best_bid)).toFixed(2);
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

function fnGetTestWallet(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getTestWallet", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            console.log(objResult);

            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
	            console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
	            fnGenMessage(objResult.data.response.statusText + ": " + objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error in getting Wallet Information, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage("Error to Fetch Wallet Details!", `badge bg-danger`, "spnGenMsg");
    });
}
