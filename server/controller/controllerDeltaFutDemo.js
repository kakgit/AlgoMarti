const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const vBaseUrl = 'https://api.india.delta.exchange';
const vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
const vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

// //Testnet Account
// const vBaseUrl = 'https://cdn-ind.testnet.deltaex.org';
// const vApiKey = 'jFF1ac2CZ1pYeWD5Gq9pa5CcAg57Pi';
// const vApiSecret = 'xGyqQdrRnEdLHEaPB5pdlgORoe9ZvdWoxQm8F44fKSiXZiXMhujOJzhw8DJO';

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
        url: vBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': vApiKey,
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
        url: vBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': vApiKey,
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

function fnGetSignature(pMethod, pPath, pQueryStr, pTimeStamp, pBody){
  if (!pBody || R.isEmpty(pBody)) pBody = "";
  else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

  const vMessage = pMethod + pTimeStamp + pPath + pQueryStr + pBody;
  return crypto
    .createHmac("sha256", vApiSecret)
    .update(vMessage)
    .digest("hex");
}

function fnRoundTimeToNearestXMinutes(pDate, pMinutes) {
  const vMinutesInMs = 1000 * 60 * pMinutes; // Milliseconds in 5 minutes
  const vRoundedTimestamp = Math.floor(pDate.getTime() / vMinutesInMs) * vMinutesInMs;
  return new Date(vRoundedTimestamp);
}