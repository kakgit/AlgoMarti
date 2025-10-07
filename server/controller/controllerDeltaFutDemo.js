const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const gBaseUrl = 'https://api.india.delta.exchange';
const gApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
const gApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaFuturesDemo.ejs");
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

exports.fnHistoricalOHLCAPI = async (req, res) => {
    let vCandleMinutes = req.body.CandleMinutes;
    const vNow = new Date();
    const vRoundedTime = fnRoundTimeToNearestXMinutes(vNow, vCandleMinutes);
    let vEndTime = ((vRoundedTime.valueOf())/1000) - 60;
    let vStartTime = vEndTime - (vCandleMinutes * 60);
    // console.log("Rounded Time (nearest 5 minutes):", vEndTime);

    const vMethod = "GET";
    const vPath = '/v2/history/candles';
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);

    const vQueryStr = "?resolution=" + vCandleMinutes + "m&symbol=BTCUSD&start="+ vStartTime +"&end=" + vEndTime;
    const vBody = "";
    const vSignature = fnGetSignature(vMethod, vPath, vQueryStr, vTimeStamp, vBody);
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': gApiKey,
            'signature': vSignature,
            'timestamp': vTimeStamp
            }
        };

      axios.request(config)
      .then((objResult) => {
        let objRes = JSON.stringify(objResult.data);
        // console.log(objRes);
        res.send({ "status": "success", "message": "OHLC Information Feched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error in OHLC. Contact Administrator!", "data": objError });
    });
    // res.send({ "status": "success", "message": "OHLC Information Feched!", "data": "" });
}

exports.fnGetCurrBuySellRates = async (req, res) => {
    let vSymbol = req.body.Symbol;

    const vMethod = "GET";
    const vPath = '/v2/tickers/' + vSymbol;
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);

    const vQueryStr = "";
    const vBody = "";
    const vSignature = fnGetSignature(vMethod, vPath, vQueryStr, vTimeStamp, vBody);
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': gApiKey,
            'signature': vSignature,
            'timestamp': vTimeStamp
            }
        };

      axios.request(config)
      .then((objResult) => {
        let objRes = JSON.stringify(objResult.data);
        // console.log(objRes);
        res.send({ "status": "success", "message": "Best Buy and Sell Rates Feched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error in Best Rates. Contact Administrator!", "data": objError });
    });
    // res.send({ "status": "success", "message": "Current Rate Information Feched!", "data": "" });
}

//Sample Functions to place or cancel order
exports.fnPlaceLimitOrderSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vClientOrderID = req.body.ClientOrderID;

    // console.log(vApiKey);
    // console.log(vApiSecret);
    // console.log(vClientOrderID);

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.placeOrder({
            order: {
              product_id: 27,
              size: 1,
              side: "buy",
              limit_price: "118000",
              order_type: "limit_order",
              client_order_id: (vClientOrderID).toString()
            }
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            // console.log(objResult);

            if(objResult.success){
                res.send({ "status": "success", "message": "Limit Order Placed Successfully!", "data": objResult });
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
    // res.send({ "status": "success", "message": "Limit Order Placed Successfully!", "data": "" });
}

exports.fnPlaceSLTPLimitOrderSDK = async (req, res) => {
    const objDate = new Date();
    let vSecDt = objDate.valueOf();

    new DeltaRestClient(gApiKey, gApiSecret).then(client => {
        client.apis.Orders.placeOrder({
            order: {
              product_id: 27,
              size: 1,
              side: "buy",
              limit_price: "75000",
              bracket_stop_loss_price: "74000",
              bracket_take_profit_price: "77000",
              order_type: "limit_order",
              client_order_id: vSecDt.toString()
            }
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "SLTP Limit Order Placed Successfully!", "data": objResult });
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
}

exports.fnCancelOrderSDK = async (req, res) => {
    new DeltaRestClient(gApiKey, gApiSecret).then(client => {
        //for Batch Delete - send only id and client_order_id
        client.apis.Orders.cancelOrder({
            order: {
                id: 403212634,
                client_order_id: "1744998291906",
                product_id: 27
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
}
//Sample Functions to place or cancel order

function fnGetSignature(pMethod, pPath, pQueryStr, pTimeStamp, pBody){
  if (!pBody || R.isEmpty(pBody)) pBody = "";
  else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

  const vMessage = pMethod + pTimeStamp + pPath + pQueryStr + pBody;
  return crypto
    .createHmac("sha256", gApiSecret)
    .update(vMessage)
    .digest("hex");
}

function fnRoundTimeToNearestXMinutes(pDate, pMinutes) {
  const vMinutesInMs = 1000 * 60 * pMinutes; // Milliseconds in 5 minutes
  const vRoundedTimestamp = Math.floor(pDate.getTime() / vMinutesInMs) * vMinutesInMs;
  return new Date(vRoundedTimestamp);
}