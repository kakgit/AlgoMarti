
let userDeltaWS = "";
let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
        fnGetSetRealTradeStatus();
		fnSetDefaultTraderTab();
	}

    socket.on("DeltaEmit1", (pMsg) => {
        let objMsg = JSON.parse(pMsg);
        let objLiveMsgs = JSON.parse(localStorage.getItem("msgsDelExc"));
        let vDate = new Date();
        let vMonth = vDate.getMonth() + 1;
        let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

        if(objLiveMsgs === null || objLiveMsgs === ""){
            objLiveMsgs = JSON.stringify({ TrdMsgs: [{ MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, IngnorePrevInc: objMsg.ignorePrevIndc }]});
            localStorage.setItem("msgsDelExc", objLiveMsgs);
        }
        else{
            let vTempMsg = { MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, IngnorePrevInc: objMsg.ignorePrevIndc };

            objLiveMsgs.TrdMsgs.push(vTempMsg);
            localStorage.setItem("msgsDelExc", JSON.stringify(objLiveMsgs));
        }

        fnInitFutAutoTrade(objMsg);
    });
});

function fnClearLocalStorageTemp(){
    localStorage.removeItem("msgsDelExc");
    localStorage.removeItem("DeltaCurrFutPosiS");
    // localStorage.removeItem("KotakCurrOptPosiS");
    // localStorage.removeItem("OptTradesListS");
    // localStorage.removeItem("StartLotNoR");
    // localStorage.removeItem("QtyMulR");
    // localStorage.removeItem("TotLossAmtR");
    // localStorage.removeItem("TraderTab");
    // clearInterval(vTradeInst);

    // fnSetTodayOptTradeDetails();
    console.log("LocalStorage Cleared!")
}

async function fnInitFutAutoTrade(objMsg){
    try{
        let isLsAutoTrader = localStorage.getItem("isDeltaAutoTrader");

        if(isLsAutoTrader === "false"){
            fnGenMessage("Trade Order Received, But Auto Trader is OFF!", "badge bg-warning", "spnGenMsg");
        }
        else{
            let objCurrPos = JSON.parse(localStorage.getItem("DeltaCurrFutPosiS"));
            let vTradeSide = localStorage.getItem("DeltaFutTradeSideSwtS");

            // To Place New Order first check for following points
            // 1. objMsg.ignorePrevIndc = true, indicates ingore all above indicators and place order

            if(objCurrPos === null || objCurrPos === ""){
                //Place New Order Based on the ingnorePrevIndc = true or false

            }
            else{

            }
            console.log(objCurrPos);
            fnGenMessage("Futures Order Placed!", "badge bg-success", "spnGenMsg");
        }
        // console.log(objMsg);
    }
    catch(err){

    }
}

function fnGetUserWalletSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getUserWalletSDK", requestOptions)
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

function fnGetLeverageSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getLeverageSDK", requestOptions)
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

function fnSetLeverageSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/setLeverageSDK", requestOptions)
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
            fnGenMessage("Error in Changing Leverage!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage("Error to Set Leverage!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnPlaceLimitOrderSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/placeLimitOrderSDK", requestOptions)
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
            fnGenMessage("Error in Placing Order!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage("Error in Placing Limit Order!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnPlaceSLTPLimitOrderSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/placeSLTPLimitOrderSDK", requestOptions)
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
            fnGenMessage("Error in Placing SLTP Order!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage("Error in Placing SLTP Limit Order!", `badge bg-danger`, "spnGenMsg");
    });
}

function fnCancelOrderSDK(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/cancelOrderSDK", requestOptions)
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

function fnTestWalletAPI(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getTestWalletAPI", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            console.log(JSON.parse(objResult.data));

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
            fnGenMessage("Error in Login, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnTestGetAllOrderAPI(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getTestGetAllOrderAPI", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        // console.log(objResult);
        if(objResult.status === "success"){
            console.log(JSON.parse(objResult.data));

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
            fnGenMessage("Error in Login, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetCurrPriceByProd(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getCurrPriceByProd", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            console.log(objResult);
            console.log("Best BP: " + objResult.data.result.quotes.best_ask);
            console.log("Best SP: " + objResult.data.result.quotes.best_bid);

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
            fnGenMessage("Error in Getting Current Price by Product!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage("Error in Getting Price!", `badge bg-danger`, "spnGenMsg");
    });
}
