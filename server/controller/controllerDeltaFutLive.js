const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

const gBaseUrl = 'https://api.india.delta.exchange';

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaFuturesLive.ejs");
}

exports.fnValidateUserLogin = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Wallet.getBalances().then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                // console.log("\wallet:\n----\n", JSON.stringify(objResult));
                // console.log("\wallet:\n----\n", objResult.success);
                res.send({ "status": "success", "message": "Valid Login, Balance Fetched!", "data": objResult });
            }
            else{
                // console.log("Failed....");
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            console.log("Error At Fut User Login Catch");
            res.send({ "status": "danger", "message": "Error At User Login! Catch.", "data": objError });
        });
    });
}

exports.fnPlaceOrderSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vClientOrdID = req.body.ClientOrdID;
    let vSymbolID = req.body.SymbolID;
    let vOrderType = req.body.OrderType; //limit_order, market_order
    let vLimitPrice = parseFloat(req.body.LimitPrice);
    let vQuantity = req.body.Quantity;
    let vTransType = req.body.TransType;
    let vStopOrderType = req.body.StopOrderType || "";
    let vStopPrice = parseFloat(req.body.StopPrice);
    let vPostOnly = (req.body.PostOnly === true || req.body.PostOnly === "true");

    let objCurrRates = await fnGetCurrRates(vApiKey, vApiSecret, vSymbolID);

    if(objCurrRates.status === "success"){
        let ObjBestRatesData = objCurrRates.data;
        let vBestBuy = objCurrRates.data.result.quotes.best_ask;
        let vBestSell = objCurrRates.data.result.quotes.best_bid;
        let vOrderLimitPrice = "0";
        let vUsePostOnly = true;

        if(vOrderType === "market_order"){
            vBestBuy = "0";
            vBestSell = "0";
            vUsePostOnly = false;
            vOrderLimitPrice = "0";
        }
        else if(vOrderType === "limit_order"){
            if(!isNaN(vLimitPrice) && vLimitPrice > 0){
                vOrderLimitPrice = vLimitPrice.toString();
            }
            else if(vTransType === "buy"){
                vOrderLimitPrice = vBestBuy;
            }
            else if(vTransType === "sell"){
                vOrderLimitPrice = vBestSell;
            }
        }
        
        // //******* COMMENT WHEN LIVE */
        // if(vSymbolID === "BTCUSD"){
        //     vLimitPrice = "90000";
        // }
        // else if(vSymbolID === "ETHUSD"){
        //     vLimitPrice = "2000";
        // }
        // else{
        //     vLimitPrice = "0";
        // }
        // //******* COMMENT WHEN LIVE */

        new DeltaRestClient(vApiKey, vApiSecret).then(client => {
            let objOrder = {
                product_symbol: vSymbolID,
                size: vQuantity,
                side: vTransType,
                limit_price: vOrderLimitPrice,
                order_type: vOrderType,
                // post_only: vUsePostOnly,
                client_order_id: (vClientOrdID).toString()
            };

            if(vOrderType === "limit_order" && vPostOnly){
                objOrder.post_only = true;
            }
            if(vOrderType === "limit_order" && vStopOrderType && !isNaN(vStopPrice) && vStopPrice > 0){
                objOrder.stop_order_type = vStopOrderType;
                objOrder.stop_price = vStopPrice.toString();
            }

            client.apis.Orders.placeOrder({
                order: objOrder
            }).then(function (response) {
                let objResult = JSON.parse(response.data);

                if(objResult.success){
                    res.send({ "status": "success", "message": "Order Placed Successfully!", "data": objResult });
                }
                else{
                    res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
                }
            })
            .catch(function(objError) {
                // console.log("*************** Error **************");
                // console.log(objError);
                res.send({ "status": "danger", "message": objError.response.text, "data": objError });
            });
        });
        // res.send({ "status": "success", "message": "Best Current Rates!", "data": ObjBestRatesData });
    }
    else{
        res.send({ "status": "danger", "message": "Error in Getting Current Rates at fnPlaceOrderSDK!", "data": "" });
    }
}

exports.fnGetOrderDetails = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vOrderID = req.body.OrderID;
    let vClientOrdID = req.body.ClientOrdID;

    // console.log("vApiKey: " + vApiKey);
    // console.log("vApiSecret: " + vApiSecret);
    // console.log("vOrderID: " + vOrderID);
    // console.log("vClientOrdID: " + vClientOrdID);

    try{
        const vMethod = "GET";
        const vPath = "/v2/orders/" + parseInt(vOrderID);
        const vTimeStamp = Math.floor(new Date().getTime() / 1000);
        const vQueryStr = "";
        const vBody = "";
        const vSignature = fnGetSignature(vApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
        const objResp = await axios.request({
            method: vMethod,
            url: gBaseUrl + vPath,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": vApiKey,
                "signature": vSignature,
                "timestamp": vTimeStamp
            }
        });

        let objResult = objResp.data;
        if(objResult.success){
            res.send({ "status": "success", "message": "Order Details Sent Successfully!", "data": objResult });
        }
        else{
            res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
        }
    }
    catch(objError){
        res.send({ "status": "danger", "message": objError?.response?.data || objError.message, "data": objError });
    }
    // res.send({ "status": "success", "message": "Order Details Sent!", "data": "" });
}

exports.fnEditOrderSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vOrderID = parseInt(req.body.OrderID);
    let vSymbol = req.body.Symbol;
    let vQuantity = parseInt(req.body.Quantity);
    let vLimitPrice = parseFloat(req.body.LimitPrice);
    let vStopPrice = parseFloat(req.body.StopPrice);
    let vPostOnly = (req.body.PostOnly === true || req.body.PostOnly === "true");

    if(!vOrderID || !vSymbol || !vQuantity || !(vLimitPrice > 0)){
        res.send({ "status": "warning", "message": "Invalid edit order input.", "data": "" });
        return;
    }

    try{
        const vMethod = "PUT";
        const vPath = "/v2/orders";
        const vTimeStamp = Math.floor(new Date().getTime() / 1000);
        const objBody = {
            id: vOrderID,
            product_symbol: vSymbol,
            size: vQuantity,
            limit_price: vLimitPrice.toString()
        };
        if(vPostOnly){
            objBody.post_only = true;
        }
        if(!isNaN(vStopPrice) && vStopPrice > 0){
            objBody.stop_price = vStopPrice.toString();
        }
        const vBody = JSON.stringify(objBody);
        const vSignature = fnGetSignature(vApiSecret, vMethod, vPath, "", vTimeStamp, vBody);

        const objResp = await axios.request({
            method: vMethod,
            url: gBaseUrl + vPath,
            data: vBody,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": vApiKey,
                "signature": vSignature,
                "timestamp": vTimeStamp
            }
        });

        let objResult = objResp.data;
        if(objResult.success){
            res.send({ "status": "success", "message": "Order Edited Successfully!", "data": objResult });
        }
        else{
            res.send({ "status": "warning", "message": "Error editing order.", "data": objResult });
        }
    }
    catch(objError){
        res.send({ "status": "danger", "message": objError?.response?.data || objError.message, "data": objError });
    }
}

exports.fnCancelOrderSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vOrderID = req.body.OrderID;
    let vClientOrdID = req.body.ClientOrdID;
    let vSymbol = req.body.Symbol;
    // console.log("vApiKey: " + vApiKey);
    // console.log("vApiSecret: " + vApiSecret);
    // console.log("vOrderID: " + vOrderID);
    // console.log("vClientOrdID: " + vClientOrdID);

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        //for Batch Delete - send only id and client_order_id
        client.apis.Orders.cancelOrder({
            order: {
                id: parseInt(vOrderID),
                product_symbol: vSymbol
                // client_order_id: vClientOrdID
                // product_id: 27
            }
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Order Cancelled Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Pending Order Cancelled!", "data": "" });
}

exports.fnGetProductsList = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vClientOrdID = req.body.ClientOrdID;
    let vSymbolID = req.body.SymbolID;
    let vQuantity = req.body.Quantity;
    let vTransType = req.body.TransType;

    // console.log(vApiKey);
    // console.log(vApiSecret);
    // console.log(vClientOrdID);
    // console.log(vSymbolID);
    // console.log(vQuantity);
    // console.log(vTransType);
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getProducts({
            contract_types: "perpetual_futures"
        }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Ticker Data Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Order Placed Successfully!", "data": "" });
}

exports.fnGetOpenPositionByIdSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vClientOrderID = req.body.ClientOrderID;
    let vProductID = req.body.ProductID;
    let vStartValDT = req.body.StartValDT;
    // console.log("vApiKey: " + vApiKey);
    // console.log("vApiSecret: " + vApiSecret);
    // console.log("vOrderID: " + vOrderID);
    // console.log("vClientOrdID: " + vClientOrdID);

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        //for Batch Delete - send only id and client_order_id
        client.apis.TradeHistory.getOrderHistory({
                product_ids: (vProductID).toString(),
                start_time: vStartValDT
          }).then(function (response) {
            let objResult = JSON.parse(response.data);
            // console.log(objResult);

            if(objResult.success){
                res.send({ "status": "success", "message": "Order Positions Sent Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Success!", "data": "" });
}

exports.fnCloseRealPoistion = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vOrderID = req.body.OrderID;
    let vClientOrderID = req.body.ClientOrdID;
    let vSymbol = req.body.Symbol;
    let vOrderType = req.body.OrderType;
    let vQuantity = req.body.Quantity;
    let vTransType = req.body.TransType;
    let vProductID = req.body.ProductID;
    let vStartValDT = req.body.StartValDT;

    // console.log("vApiKey: " + vApiKey);
    // console.log("vApiSecret: " + vApiSecret);
    // console.log("vOrderID: " + vOrderID);
    // console.log("vClientOrderID: " + vClientOrderID);
    // console.log("vSymbol: " + vSymbol);
    // console.log("vOrderType: " + vOrderType);
    // console.log("vQuantity: " + vQuantity);
    // console.log("vTransType: " + vTransType);
    // console.log("vProductID: " + vProductID);
    // console.log("vStartValDT: " + vStartValDT);

    let objPosDets = await fnGetPositionByIdSDK(vApiKey, vApiSecret, vProductID, vStartValDT, vOrderID, vTransType);
    if(objPosDets.status === "success"){
        if(vQuantity > Math.abs(objPosDets.data.size)){
            vQuantity = Math.abs(objPosDets.data.size);
            console.log(objPosDets.data.size);
        }
        new DeltaRestClient(vApiKey, vApiSecret).then(client => {
            client.apis.Orders.placeOrder({
                order: {
                product_symbol: vSymbol,
                size: vQuantity,
                side: vTransType,
                limit_price: 0,
                order_type: vOrderType,
                client_order_id: (vClientOrderID).toString()
                }
            }).then(function (response) {
                let objResult = JSON.parse(response.data);

                if(objResult.success){
                    res.send({ "status": "success", "message": "Order Placed Successfully!", "data": objResult });
                }
                else{
                    res.send({ "status": "warning", "message": "Error to Close the Open Order!", "data": objResult });
                }
            })
            .catch(function(objError) {
                // console.log("*************** Error **************");
                // console.log(objError);
                res.send({ "status": "danger", "message": objError.response.text, "data": objError });
            });
        });
        // res.send({ "status": "success", "message": objPosDets.message, "data": "" });
    }
    else if(objPosDets.status === "warning"){
        res.send({ "status": "warning", "message": objPosDets.message, "data": "" });
    }
    else{
        res.send({ "status": "danger", "message": "Error: Contact Admin!", "data": objPosDets });
    }
}

exports.fnGetFilledOrderHistory = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vStartDT = Number(req.body.StartDT);
    let vEndDT = Number(req.body.EndDT);

    if(!vApiKey || !vApiSecret){
        res.send({ "status": "warning", "message": "API credentials are required.", "data": [] });
        return;
    }

    if(!Number.isFinite(vStartDT) || vStartDT <= 0){
        vStartDT = Date.now() - (30 * 24 * 60 * 60 * 1000);
    }
    if(!Number.isFinite(vEndDT) || vEndDT <= 0){
        vEndDT = Date.now();
    }
    if(vEndDT < vStartDT){
        let vTmp = vEndDT;
        vEndDT = vStartDT;
        vStartDT = vTmp;
    }

    vStartDT = fnNormalizeOrderHistoryTs(vStartDT);
    vEndDT = fnNormalizeOrderHistoryTs(vEndDT);

    try{
        let objRetData = await fnGetOrderHistory(vApiKey, vApiSecret, vStartDT, vEndDT);
        if(objRetData.status !== "success"){
            res.send({ "status": objRetData.status, "message": objRetData.message, "data": objRetData.data });
            return;
        }

        let objRows = Array.isArray(objRetData.data?.result) ? objRetData.data.result : [];
        let objFilledRows = objRows.filter((objOrd) => {
            let vState = (objOrd?.state || "").toString().toLowerCase();
            return (vState === "filled" || vState === "closed");
        });

        res.send({ "status": "success", "message": "Filled order history fetched.", "data": objFilledRows });
    }
    catch(error){
        res.send({ "status": "danger", "message": error.message, "data": error });
    }
}

const fnGetCurrRates = async (pApiKey, pApiSecret, pSymbolID) => {
    const objPromise = new Promise((resolve, reject) => {
        const vMethod = "GET";
        const vPath = '/v2/tickers/' + pSymbolID;
        const vTimeStamp = Math.floor(new Date().getTime() / 1000);

        const vQueryStr = "";
        const vBody = "";
        const vSignature = fnGetSignature(pApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
        let config = {
            method: vMethod,
            maxBodyLength: Infinity,
            url: gBaseUrl + vPath + vQueryStr,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': pApiKey,
                'signature': vSignature,
                'timestamp': vTimeStamp
                }
            };

        axios.request(config)
        .then((objResult) => {
            let objRes = objResult.data;
            resolve({ "status": "success", "message": "Best Buy and Sell Rates Feched!", "data": objRes });
        })
        .catch((objError) => {
            console.log(objError);
            resolve({ "status": "danger", "message": "Error in Best Rates. Contact Administrator!", "data": objError });
        });
    });

    return objPromise;
};

const fnGetPositionByIdSDK = async (pApiKey, pApiSecret, pProductID, pStartValDT, pOrderID, pTransType) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Positions.getPositions({
                    product_id: pProductID
            }).then(function (response) {
                let objResult = JSON.parse(response.data);

                if(objResult.success){
                    let vRecExists = false;
                    let objRec = null;
                    
                    if((pTransType === "sell" && objResult.result.size > 0) || (pTransType === "buy" && objResult.result.size < 0)){
                        vRecExists = true;
                        objRec = objResult.result;
                    }
                    if(vRecExists){
                        resolve({ "status": "success", "message": "Position Details Fetched Successfully!", "data": objRec });
                    }
                    else{
                        resolve({ "status": "warning", "message": "Position Does Not Exists!", "data": "" });
                    }
                }
                else{
                    resolve({ "status": "danger", "message": "No Open Position with ID!", "data": "" });
                }
            })
            .catch(function(objError) {
                console.log(objError);
                resolve({ "status": "danger", "message": objError.response.text, "data": objError });
            });
        });
    });

    return objPromise;
};

const fnGetOrderHistory = async (pApiKey, pApiSecret, pStartDT, pEndDT) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.TradeHistory.getOrderHistory({ start_time: pStartDT, end_time: pEndDT, page_size: 100 }).then(function (response) {
                let objResult = JSON.parse(response.data.toString());
                if(objResult.success){
                    resolve({ "status": "success", "message": "Order history fetched.", "data": objResult });
                }
                else{
                    resolve({ "status": "warning", "message": "Error while fetching order history.", "data": objResult });
                }
            })
            .catch(function(objError) {
                resolve({ "status": "danger", "message": "Error at order history.", "data": objError });
            });
        });
    });
    return objPromise;
};

const fnNormalizeOrderHistoryTs = (pVal) => {
    let vTs = Number(pVal);
    if(!Number.isFinite(vTs) || vTs <= 0){
        return 0;
    }
    if(vTs < 1000000000000000){
        return Math.trunc(vTs * 1000);
    }
    return Math.trunc(vTs);
}

function fnGetSignature(pApiSecret, pMethod, pPath, pQueryStr, pTimeStamp, pBody){
  if (!pBody || R.isEmpty(pBody)) pBody = "";
  else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

  const vMessage = pMethod + pTimeStamp + pPath + pQueryStr + pBody;
  return crypto
    .createHmac("sha256", pApiSecret)
    .update(vMessage)
    .digest("hex");
}
