const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

// Demo account credentials should be configured via environment variables only.
const gBaseUrl = 'https://api.india.delta.exchange';
const gApiKey = process.env.DELTA_DEMO_API_KEY || "";
const gApiSecret = process.env.DELTA_DEMO_API_SECRET || "";
const gTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const gTelegramChatId = process.env.TELEGRAM_CHAT_ID || "";

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("HLFutSclprDemo.ejs");
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
    let vSymbol = (req.body.Symbol || "BTCUSD").toString().toUpperCase();

    if(!["BTCUSD", "ETHUSD"].includes(vSymbol)){
        res.send({ "status": "warning", "message": "Unsupported symbol for OHLC request.", "data": "" });
        return;
    }

    const vNow = new Date();
    const vRoundedTime = fnRoundTimeToNearestXMinutes(vNow, vCandleMinutes);
    let vEndTime = ((vRoundedTime.valueOf())/1000) - 60;
    let vStartTime = vEndTime - (vCandleMinutes * 60);
    // console.log("Rounded Time (nearest 5 minutes):", vEndTime);

    const vMethod = "GET";
    const vPath = '/v2/history/candles';
    const vQueryStr = "?resolution=" + vCandleMinutes + "m&symbol=" + vSymbol + "&start="+ vStartTime +"&end=" + vEndTime;
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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
    let vSymbol = (req.body.Symbol || "").toString().toUpperCase();
    if(!["BTCUSD", "ETHUSD"].includes(vSymbol)){
        res.send({ "status": "warning", "message": "Unsupported symbol for best-rate request.", "data": "" });
        return;
    }

    const vMethod = "GET";
    const vPath = '/v2/tickers/' + vSymbol;
    const vQueryStr = "";
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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

exports.fnSendTelegramAlertMsg = async (req, res) => {
    try{
        const vMsg = String(req?.body?.Message || "").trim();
        if(!vMsg){
            res.send({ status: "warning", message: "Telegram message is empty.", data: "" });
            return;
        }
        const objTgCfg = fnGetTelegramConfigFromReq(req);
        const bSent = await fnSendTelegramAlert(vMsg, objTgCfg);
        if(bSent){
            res.send({ status: "success", message: "Telegram alert sent.", data: "" });
        }
        else{
            res.send({ status: "warning", message: "Telegram config missing or send failed.", data: "" });
        }
    }
    catch(objErr){
        res.send({ status: "danger", message: "Telegram alert failed.", data: objErr?.message || objErr });
    }
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

const fnSendTelegramAlert = async (pText, pCfg) => {
    try{
        const vBotToken = (pCfg?.botToken || gTelegramBotToken || "").trim();
        const vChatId = (pCfg?.chatId || gTelegramChatId || "").trim();
        if(!vBotToken || !vChatId){
            return false;
        }
        const vText = String(pText || "").trim();
        if(!vText){
            return false;
        }
        await axios.post(`https://api.telegram.org/bot${vBotToken}/sendMessage`, {
            chat_id: vChatId,
            text: vText
        }, { timeout: 5000 });
        return true;
    }
    catch(_objErr){
        return false;
    }
}

const fnGetTelegramConfigFromReq = (req) => {
    return {
        botToken: String(req?.body?.TelegramBotToken || "").trim(),
        chatId: String(req?.body?.TelegramChatId || "").trim()
    };
}

