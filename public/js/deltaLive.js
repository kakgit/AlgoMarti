
let userDeltaWS = "";
let vTradeInst = 0;

window.addEventListener("DOMContentLoaded", function(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
        fnShowAdminAccessories();
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

    socket.on("DeltaEmitOpt", (pMsg) => {
        let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

        if((objAppCred !== null) && (objAppCred.IsAdmin)){
            let objMsg = JSON.parse(pMsg);
            let objLiveMsgs = JSON.parse(localStorage.getItem("msgsDelExcOpt"));
            let vDate = new Date();
            let vMonth = vDate.getMonth() + 1;
            let vToday = vDate.getDate() + "-" + vMonth + "-" + vDate.getFullYear() + " " + vDate.getHours() + ":" + vDate.getMinutes() + ":" + vDate.getSeconds();

            if(objLiveMsgs === null || objLiveMsgs === ""){
                objLiveMsgs = JSON.stringify({ TrdMsgs: [{ MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, OptionType: objMsg.optionType, ClosePrice: objMsg.closePrice, IngnorePrevInc: objMsg.ignorePrevIndc }]});
                localStorage.setItem("msgsDelExcOpt", objLiveMsgs);
            }
            else{
                let vTempMsg = { MsgId: vDate.valueOf(), MsgDT: vToday, SymbName: objMsg.symbolName, Strategy: objMsg.strategy, Direction: objMsg.direction, OptionType: objMsg.optionType, ClosePrice: objMsg.closePrice, IngnorePrevInc: objMsg.ignorePrevIndc };

                objLiveMsgs.TrdMsgs.push(vTempMsg);
                localStorage.setItem("msgsDelExcOpt", JSON.stringify(objLiveMsgs));
            }

            fnInitOptAutoTrade(objMsg);
        }
    });
});

function fnClearLocalStorageTemp(){
    localStorage.removeItem("msgsDelExc");
    localStorage.removeItem("msgsDelExcOpt");
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

function fnManualEmitOptTrade(pBorS, pCorP){
    let vSymbolName = "BTCUSD";
    let vStrategy = "Strategy-1";
    let objClosePrice = document.getElementById("txtOptionSpotPrice");

    if(objClosePrice.value === ""){
        fnGenMessage("Please Input Spot Price!", `badge bg-warning`, "spnGenMsg");
        objClosePrice.focus();
    }
    else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({ symbolName: vSymbolName, strategy: vStrategy, direction: pBorS, optionType: pCorP, closePrice: objClosePrice.value, ignorePrevIndc: true });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/tv-msg-delta-opt", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            // console.log(objResult);
            if(objResult.status === "success"){
                // console.log(objResult);

                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage("Error to Emit Trade for All, Contact Admin!", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            fnGenMessage("Error in Executing Trade for All!", `badge bg-danger`, "spnGenMsg");
        });
    }
}

async function fnInitOptAutoTrade(objMsg){
    try{
        console.log(objMsg);

        // let objOptionChain = await fnGetOptionChain();
        // console.log(objOptionChain);

        // if(objOptionChain.status === "success"){

        //     fnGenMessage(objOptionChain.message, `badge bg-${objOptionChain.status}`, "spnGenMsg");
        // }
        // else{
        //     fnGenMessage(objOptionChain.message, `badge bg-${objOptionChain.status}`, "spnGenMsg");
        // }
    }
    catch(err){
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
    }
}

function fnGetOptionChain(){
    const objPromise = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({ });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/deltaExc/getOptionChainSDK", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                // console.log(objResult);

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    console.log("Client IP: " + objResult.data.response.body.error.context.client_ip);
                    reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data.response.statusText });
                }
                else{
                    reject({ "status": objResult.status, "message": objResult.message, "data": objResult.data.response.statusText });
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
            console.log(error);
            reject({ "status": "danger", "message": "Error At Option Chain", "data": "" });
        });
    });
    return objPromise;
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

            if(objCurrPos === null || objCurrPos === ""){
                console.log("New Order Placed");
            }
            else{
                console.log("Position is already Open");
            }
            // console.log(objCurrPos);
            fnGenMessage("Futures Order Placed!", "badge bg-success", "spnGenMsg");
        }
        // console.log(objMsg);
    }
    catch(err){
            fnGenMessage("Error in Placing Futures Order!", "badge bg-danger", "spnGenMsg");
    }
}

async function fnGetSelSymbolData(pThisVal){
    try{
        let objSymData = await fnExecSelSymbData(pThisVal);
        if(objSymData.status === "success"){

            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
        else{
            fnGenMessage(objSymData.message, `badge bg-${objSymData.status}`, "spnGenMsg");   
        }
    }
    catch(err) {
        fnGenMessage(err.message, `badge bg-${err.status}`, "spnGenMsg");
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
    let objInv = document.getElementById("txtInvestment");
    let objQty = document.getElementById("txtFuturesQty");
    let objLeverage = document.getElementById("txtLeverage");
    let objContractVal = document.getElementById("hidContactValue");

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

                objInv.value = ((parseFloat(objBestBid.innerText) * parseFloat(objContractVal.value) * parseFloat(objQty.value)) / parseFloat(objLeverage.value)).toFixed(2);
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
            fnGenMessage("Error to Get Wallet Info, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage(error.message, `badge bg-danger`, "spnGenMsg");
    });
}

function fnSetLeverageAPI(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/setLeverageAPI", requestOptions)
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
            fnGenMessage("Error to Set Leverage JS, Contact Admin!", `badge bg-danger`, "spnGenMsg");
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

function fnGetProductsList(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getProductsList", requestOptions)
    .then(response => response.json())
    .then(objResult => {
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
            fnGenMessage("Error in Getting Current Price by Product!, Contact Admin!", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log(error);
        fnGenMessage("Error in Getting Price!", `badge bg-danger`, "spnGenMsg");
    });
}
