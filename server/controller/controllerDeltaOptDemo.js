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
    res.render("deltaOptionsDemo.ejs");
}

exports.fnGetOptChnSDKByAstOptTypExp = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vOptionType = req.body.OptionType;
    let vExpiryDate = req.body.OptionExpiry;
    let vContractType = "";

    // console.log(vApiKey);
    // console.log(vApiSecret);
    // console.log(vUAssetSymbol);
    // console.log(vOptionType);
    // console.log(vExpiryDate);
    if(vOptionType === "C"){
        vContractType = "call_options";
    }
    else if(vOptionType === "P"){
        vContractType = "put_options";
    }
    else{
        vContractType = "";
    }
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getOptionChain({
            contract_types: vContractType, underlying_asset_symbols: vUAssetSymbol, expiry_date: vExpiryDate
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error at fnGetOptChnSDKByAstOptTypExp, Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {

            res.send({ "status": "danger", "message": "Error At fnGetOptChnSDKByAstOptTypExp Catch, Contact Admin!", "data": objError });
        });
    });
}

exports.fnGetBestRatesBySymbol = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;

    // console.log(vApiKey);
    // console.log(vApiSecret);
    // console.log(vSymbol);

    const vMethod = "GET";
    const vPath = '/v2/tickers/' + vSymbol;
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);

    const vQueryStr = "";
    const vBody = "";
    const vSignature = fnGetSignature(vApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
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

exports.fnGetOptionChainSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = "BTC"; //req.body.UndAssetSymbol;
    let vOptionType = "C"; //req.body.OptionType;
    let vExpiryDate = "11-09-2025"; //req.body.OptionExpiry;
    let vContractType = "call_options,put_options";

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getOptionChain({
            contract_types: vContractType, underlying_asset_symbols: vUAssetSymbol, expiry_date: vExpiryDate
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error at Option Chain, Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {

            res.send({ "status": "danger", "message": "Error At fnGetOptionChainSDK Catch, Contact Admin!", "data": objError });
        });
    });
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
