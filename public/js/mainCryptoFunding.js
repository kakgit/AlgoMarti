let gDeltaCdcxList = {};
let gDeltaFundingList = {};
let gCDcxFundingList = {};


window.addEventListener("DOMContentLoaded", function(){
    fnGetAllStatus();
});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
		fnLoadLoginCred();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
	}	
}

//*************** Get List of Coins from Different Platforms ***************//
function fnGetCurrentMinute(){
    const currentDate = new Date(); // Creates a Date object for the current time
    const minutes = currentDate.getMinutes(); // Gets the minutes (0-59)
    console.log("Current Minutes:", minutes);
}

function fnGetCoinDcxDeltaCoinsList(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ApiKey" : "BH7QNW8iTB5EWfndPuTEDSBazwPBPW",//objApiKey.value,
        "ApiSecret" : "820F6HotXwRVN7ZDSgAgp8ynxHUmxz8Da58ooH0ryTrTXwwBRl4WiD5uzVd3"//objApiSecret.value
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/execCryptoFunding/updCoinDcxDeltaData", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            // gDeltaCoinsList = objResult.data;

            // console.log(objResult);
            fnUpdFundingData();
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            // fnClearLoginStatus();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            // fnClearLoginStatus();
            fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // fnClearLoginStatus();
        //console.log('error: ', error);
        fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
    });
}

async function fnUpdFundingData(){
    let objDeltaFundingList = await fnGetDeltaFundingList();
    if(objDeltaFundingList.status === "success"){
        gDeltaFundingList = objDeltaFundingList.data;
        // console.log(gDeltaFundingList);

        let objCDcxFundingList = await fnGetCDcxFundingList();
        if(objCDcxFundingList.status === "success"){
            gCDcxFundingList = objCDcxFundingList.data.prices;
            // console.log(gCDcxFundingList);

            let objCDcxDeltaData = await fnGetCDcxDeltaData();
            if(objCDcxDeltaData.status === "success"){
                gDeltaCdcxList = objCDcxDeltaData.data;
                // console.log(gDeltaCdcxList);
                fnMergeSortFundingData();
            }
            else{
                fnGenMessage(objCDcxDeltaData.message, `badge bg-${objCDcxDeltaData.status}`, "spnGenMsg");
            }
        }
        else{
            fnGenMessage(objCDcxFundingList.message, `badge bg-${objCDcxFundingList.status}`, "spnGenMsg");
        }
    }
    else{
        fnGenMessage(objDeltaFundingList.message, `badge bg-${objDeltaFundingList.status}`, "spnGenMsg");
    }
}

function fnMergeSortFundingData(){
    let objMyData = gDeltaCdcxList;

    if(objMyData.length !== 0){
        for(let k=0; k<objMyData.length; k++){
            let vSymbolD = objMyData[k].SymbolD;
            let vSymbolC = objMyData[k].SymbolC;
            let vHrlyFeqD = objMyData[k].RateFeqHrD;
            let vFundingD = gDeltaFundingList[vSymbolD];
            let vFundingC = (gCDcxFundingList[vSymbolC].fr)*100;
            let vTimesPD = 24 / vHrlyFeqD;
            let vRateTB = 0;
            let vRatePD = 0;
            let vDeltaBS = "";
            let vCDcxBS = "";

            if(vFundingD < 0 && vFundingC >= 0){
                let vCurrFR = (parseFloat(Math.abs(parseFloat(vFundingD)) + parseFloat(vFundingC))).toFixed(3);
                vDeltaBS = "B";
                vCDcxBS = "S";
                vRateTB = vCurrFR;
                vRatePD = vCurrFR * vTimesPD;
            }
            else if(vFundingD >= 0 && vFundingC < 0){
                let vCurrFR = (parseFloat(parseFloat(vFundingD) + parseFloat(Math.abs(vFundingC)))).toFixed(3);
                vDeltaBS = "S";
                vCDcxBS = "B";
                vRateTB = vCurrFR;
                vRatePD = vCurrFR * vTimesPD;
            }
            else if(vFundingD < 0 && vFundingC < 0){
                let vCurrFR = (parseFloat(parseFloat(vFundingD) - parseFloat(vFundingC))).toFixed(3);
                if(vFundingD < vFundingC){
                    vDeltaBS = "B";
                    vCDcxBS = "S";
                }
                else{
                    vDeltaBS = "S";
                    vCDcxBS = "B";
                }
                vRateTB = vCurrFR;
                vRatePD = vCurrFR * vTimesPD;
            }
            else if(vFundingD >= 0 && vFundingC >= 0){
                let vCurrFR = (parseFloat(parseFloat(vFundingD) - parseFloat(vFundingC))).toFixed(3);
                if(vFundingD > vFundingC){
                    vDeltaBS = "S";
                    vCDcxBS = "B";
                }
                else{
                    vDeltaBS = "B";
                    vCDcxBS = "S";
                }
                vRateTB = vCurrFR;
                vRatePD = vCurrFR * vTimesPD;
            }
            else{
                vDeltaBS = "NT";
                vCDcxBS = "NT";
            }

            objMyData[k].FundDelta = vFundingD;
            objMyData[k].FundCDcx = vFundingC;
            objMyData[k].DeltaBS = vDeltaBS;
            objMyData[k].CDcxBS = vCDcxBS;
            objMyData[k].RateDiff = Math.abs(vRateTB);
            objMyData[k].RatePD = Math.abs(vRatePD);                
        }
    }
    gDeltaCdcxList = objMyData.sort(fnSortByFundingRate);

    localStorage.setItem("FundingSortedDataCF", JSON.stringify(gDeltaCdcxList));
    console.log("Funding Updated!");
}

function fnSortByFundingRate(a, b) {
    return (b.RatePD) - (a.RatePD);
}

function fnDisplayFunding(){

    let objAvailFundingList = document.getElementById("tBodyAvailFunding");

    gDeltaCdcxList = JSON.parse(localStorage.getItem("FundingSortedDataCF"));
    if(gDeltaCdcxList.length === 0){
        objAvailFundingList.innerHTML = '<tr><td colspan="14"><div class="col-sm-12" style="border:0px solid red;width:100%;text-align: center; font-weight: Bold; font-size: 40px;">No Funding Data Available</div></td></tr>';
    }
    else{
        let vTempHtml = "";

        for(let i=0; i<gDeltaCdcxList.length; i++){
            let vRatePD = (parseFloat(gDeltaCdcxList[i].RatePD)).toFixed(3);

            if(gDeltaCdcxList[i].AllowOnlyCloseD === false && vRatePD >= 0.1){
                let vSno = (i+1);
                let vDClsOnly = gDeltaCdcxList[i].AllowOnlyCloseD;
                let vSymbolD = gDeltaCdcxList[i].SymbolD;
                let vSymbolC = gDeltaCdcxList[i].SymbolC;
                let vMaxLimitD = gDeltaCdcxList[i].PosLimitD;
                let vLeverageD = gDeltaCdcxList[i].LeverageD;
                let vLotSizeD = gDeltaCdcxList[i].LotSizeD;
                let vHrlyFeqD = gDeltaCdcxList[i].RateFeqHrD;
                let vFundingD = (parseFloat(gDeltaCdcxList[i].FundDelta)).toFixed(3);
                let vFundingC = (parseFloat(gDeltaCdcxList[i].FundCDcx)).toFixed(3);
                let vAsstSymbD = gDeltaCdcxList[i].UndrAsstSymbD;
                let vRateTB = (parseFloat(gDeltaCdcxList[i].RateDiff)).toFixed(3);
                let vDeltaBS = gDeltaCdcxList[i].DeltaBS;
                let vCDcxBS = gDeltaCdcxList[i].CDcxBS;

                vTempHtml += '<tr>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:left;">' + vSno + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:left;">' + vDClsOnly + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:left;">' + vSymbolD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:left;">' + vSymbolC + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vMaxLimitD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLeverageD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vLotSizeD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vHrlyFeqD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vFundingD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vFundingC + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vRateTB + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:right;">' + vRatePD + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vDeltaBS + '</td>';
                vTempHtml += '<td style="text-wrap: nowrap; text-align:center;">' + vCDcxBS + '</td>';
                vTempHtml += '</tr>';
            }            
        }

        objAvailFundingList.innerHTML = vTempHtml;
    }
    // console.log(gDeltaCdcxList);
}

function fnGetDeltaFundingList(){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : "BH7QNW8iTB5EWfndPuTEDSBazwPBPW",//objApiKey.value,
            "ApiSecret" : "820F6HotXwRVN7ZDSgAgp8ynxHUmxz8Da58ooH0ryTrTXwwBRl4WiD5uzVd3",//objApiSecret.value
            "Symbol" : "TNSRUSD"
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/execCryptoFunding/getDeltaFundingList", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message + " Contact Admin!", "data": objResult.data });
            }
        })
        .catch(error => {
            //console.log('error: ', error);
            resolve({ "status": "danger", "message": "Error At Receiving Delta Funding List!", "data": "" });
        });
    });
    return objPromise;
}

function fnGetCDcxFundingList(){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = "";

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/execCryptoFunding/getCdcxCoinList", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message + " Contact Admin!", "data": objResult.data });
            }
        })
        .catch(error => {
            //console.log('error: ', error);
            resolve({ "status": "danger", "message": "Error At Receiving Coin DCX Funding List!", "data": "" });
        });
    });
    return objPromise;
}

function fnGetCDcxDeltaData(){
    const objPromise = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = "";

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/execCryptoFunding/getCoinDcxDeltaData", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });
            }
            else{
                resolve({ "status": objResult.status, "message": objResult.message + " Contact Admin!", "data": objResult.data });
            }
        })
        .catch(error => {
            //console.log('error: ', error);
            resolve({ "status": "danger", "message": "Error At Receiving File!", "data": "" });
        });
    });
    return objPromise;
}

function fnGetCoinDcxDeltaData(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = "";

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/execCryptoFunding/getCoinDcxDeltaData", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            // gDeltaCoinsList = objResult.data;
            console.log(objResult);
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            // fnClearLoginStatus();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            // fnClearLoginStatus();
            fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // fnClearLoginStatus();
        //console.log('error: ', error);
        fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetDeltaCoinList(){
    // let objApiKey = document.getElementById("txtDeltaAPIKey");
    // let objApiSecret = document.getElementById("txtDeltaSecret");

    // if(objApiKey.value === ""){
    //     fnGenMessage("Invalid API Key", `badge bg-warning`, "spnGenMsg");
    // }
    // else if(objApiSecret.value === ""){
    //     fnGenMessage("Invalid Secret Key", `badge bg-warning`, "spnGenMsg");
    // }
    // else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : "BH7QNW8iTB5EWfndPuTEDSBazwPBPW",//objApiKey.value,
            "ApiSecret" : "820F6HotXwRVN7ZDSgAgp8ynxHUmxz8Da58ooH0ryTrTXwwBRl4WiD5uzVd3"//objApiSecret.value
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/execCryptoFunding/getDeltaCoinList", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){
            	// gDeltaCoinsList = objResult.data;
	        	console.log(objResult);
	        	// console.log(gDeltaCoinsList);
            }
            else if(objResult.status === "danger"){
                if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                    fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else{
                    fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
                }
            }
            else if(objResult.status === "warning"){
                // fnClearLoginStatus();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                // fnClearLoginStatus();
                fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            // fnClearLoginStatus();
            //console.log('error: ', error);
            fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
        });
    // }
}

function fnGetDeltaCoinDetails(){
    // let objApiKey = document.getElementById("txtDeltaAPIKey");
    // let objApiSecret = document.getElementById("txtDeltaSecret");

    // if(objApiKey.value === ""){
    //     fnGenMessage("Invalid API Key", `badge bg-warning`, "spnGenMsg");
    // }
    // else if(objApiSecret.value === ""){
    //     fnGenMessage("Invalid Secret Key", `badge bg-warning`, "spnGenMsg");
    // }
    // else{
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "ApiKey" : "BH7QNW8iTB5EWfndPuTEDSBazwPBPW",//objApiKey.value,
            "ApiSecret" : "820F6HotXwRVN7ZDSgAgp8ynxHUmxz8Da58ooH0ryTrTXwwBRl4WiD5uzVd3",//objApiSecret.value
            "Symbol" : "TNSRUSD"
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };

        fetch("/execCryptoFunding/getDeltaProdBySymb", requestOptions)
        .then(response => response.json())
        .then(objResult => {
        	console.log(objResult);
            // if(objResult.status === "success"){

            //     let objCallPL = document.getElementById("txtCallPL");
            //     let objPutPL = document.getElementById("txtPutPL");
            //     let vNetEquity = parseFloat(objResult.data.meta.net_equity);
            //     let vNetAvailAmt = parseFloat(objResult.data.result[0].available_balance);
            //     let vMarginBlocked = vNetEquity - vNetAvailAmt;
            //     let vReqBalance = vMarginBlocked * 3;
            //     let vYet2Req = parseFloat(objCallPL.value) + parseFloat(objPutPL.value);

            //     // console.log(objResult);
            //     // console.log(objResult.data.meta.net_equity);
            //     // console.log(objResult.data.result[0].available_balance);
            //     document.getElementById("spnBal1").innerText = (vNetAvailAmt).toFixed(3);
            //     document.getElementById("spnMarginBlocked").innerText = (vMarginBlocked).toFixed(3);
            //     document.getElementById("spnReqBalance").innerText = (vReqBalance).toFixed(3);
            //     document.getElementById("spnYet2Recover").innerText = (vYet2Req).toFixed(3);

            //     // let objBalances = { Acc1BalINR: objResult.data[0].available_balance_inr, Acc1BalUSD: objResult.data[0].available_balance };
            //     // document.getElementById("spnBal1").innerText = (parseFloat(objBalances.Acc1BalUSD)).toFixed(2);

            //     // localStorage.setItem("DeltaNetLimit", JSON.stringify(objBalances));
            //     // console.log(localStorage.getItem("DeltaNetLimit"));

            //     // $('#mdlDeltaLogin').modal('hide');
            //     // localStorage.setItem("lsLoginValidDFL", "true");
            //     // fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            //     // fnGetSetTraderLoginStatus();
            // }
            // else if(objResult.status === "danger"){
            //     if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
            //         fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            //     }
            //     else{
            //         fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            //     }
            // }
            // else if(objResult.status === "warning"){
            //     // fnClearLoginStatus();
            //     fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            // }
            // else{
            //     // fnClearLoginStatus();
            //     fnGenMessage("Error to Fetch Wallet Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            // }
        })
        .catch(error => {
            // fnClearLoginStatus();
            //console.log('error: ', error);
            fnGenMessage("Error to Fetch Wallet Details.", `badge bg-danger`, "spnGenMsg");
        });
    // }
}

function fnGetCoinDCXCoinList(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = "";

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/execCryptoFunding/getCdcxCoinList", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            // gDeltaCoinsList = objResult.data;
            console.log(objResult);
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        //console.log('error: ', error);
        fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetCoinDCXCoinDetails(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = "";

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/execCryptoFunding/getCdcxCoinDetails", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            // gDeltaCoinsList = objResult.data;
            console.log(objResult);
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            // fnClearLoginStatus();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            // fnClearLoginStatus();
            fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // fnClearLoginStatus();
        //console.log('error: ', error);
        fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
    });
}
//*************** Get List of Coins from Different Platforms ***************//

//************* Sample Code for Testing *************//
function fnSetDeltaLevTest(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ApiKey" : "BH7QNW8iTB5EWfndPuTEDSBazwPBPW",//objApiKey.value,
        "ApiSecret" : "820F6HotXwRVN7ZDSgAgp8ynxHUmxz8Da58ooH0ryTrTXwwBRl4WiD5uzVd3", //objApiSecret.value
        "Symbol" : "1000SATSUSD"
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/execCryptoFunding/updDeltaLeverage", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){

            console.log(objResult);
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            // fnClearLoginStatus();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            // fnClearLoginStatus();
            fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // fnClearLoginStatus();
        //console.log('error: ', error);
        fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnCDcxBySlTest(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ApiKey" : "BH7QNW8iTB5EWfndPuTEDSBazwPBPW",//objApiKey.value,
        "ApiSecret" : "820F6HotXwRVN7ZDSgAgp8ynxHUmxz8Da58ooH0ryTrTXwwBRl4WiD5uzVd3", //objApiSecret.value
        "Symbol" : "1000SATSUSD"
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/execCryptoFunding/execOpenOrderCDcx", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){

            console.log("***** TEST *****");
            console.log(objResult);
        }
        else if(objResult.status === "danger"){
            if(objResult.data.response.body.error.code === "ip_not_whitelisted_for_api_key"){
                fnGenMessage(objResult.data.response.body.error.code + " IP: " + objResult.data.response.body.error.context.client_ip, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objResult.data.response.body.error.code + " Contact Admin!", `badge bg-${objResult.status}`, "spnGenMsg");
            }
        }
        else if(objResult.status === "warning"){
            // fnClearLoginStatus();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            // fnClearLoginStatus();
            fnGenMessage("Error to Fetch Details, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // fnClearLoginStatus();
        //console.log('error: ', error);
        fnGenMessage("Error to Fetch Details.", `badge bg-danger`, "spnGenMsg");
    });
}
//************* Sample Code for Testing *************//
