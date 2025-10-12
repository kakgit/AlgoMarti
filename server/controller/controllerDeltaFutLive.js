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
    let vQuantity = req.body.Quantity;
    let vTransType = req.body.TransType;

    let objCurrRates = await fnGetCurrRates(vApiKey, vApiSecret, vSymbolID);

    if(objCurrRates.status === "success"){
        let ObjBestRatesData = objCurrRates.data;
        let vBestBuy = objCurrRates.data.result.quotes.best_ask;
        let vBestSell = objCurrRates.data.result.quotes.best_bid;
        let vLimitPrice = "0";

        if(vOrderType === "market_order"){
            vBestBuy = "0";
            vBestSell = "0";
        }
        if(vTransType === "buy"){
            vLimitPrice = vBestBuy;
        }
        else if(vTransType === "sell"){
            vLimitPrice = vBestSell;
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
            client.apis.Orders.placeOrder({
                order: {
                product_symbol: vSymbolID,
                size: vQuantity,
                side: vTransType,
                limit_price: vLimitPrice,
                order_type: vOrderType,
                client_order_id: (vClientOrdID).toString()
                }
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

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.getOrders({
            order: {
                id: parseInt(vOrderID),
                client_order_id: vClientOrdID
                // product_id: 27
            }
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Order Details Sent Successfully!", "data": objResult });
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
    // res.send({ "status": "success", "message": "Order Details Sent!", "data": "" });
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

function fnGetSignature(pApiSecret, pMethod, pPath, pQueryStr, pTimeStamp, pBody){
  if (!pBody || R.isEmpty(pBody)) pBody = "";
  else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

  const vMessage = pMethod + pTimeStamp + pPath + pQueryStr + pBody;
  return crypto
    .createHmac("sha256", pApiSecret)
    .update(vMessage)
    .digest("hex");
}