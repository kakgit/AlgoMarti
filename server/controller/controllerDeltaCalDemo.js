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
    res.render("deltaCalDemo.ejs");
}

exports.fnGetOptChnSDKByUndAstExp = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vExpiry = req.body.Expiry;
    let vContractType = "";

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getOptionChain({
            contract_types: vContractType, underlying_asset_symbols: vUAssetSymbol, expiry_date: vExpiry
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error at fnGetOptChnSDKByUndAstExp, Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {

            res.send({ "status": "danger", "message": "Error At fnGetOptChnSDKByAstOptTypExp Catch, Contact Admin!", "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": "" });
}

exports.fnGetOptChnSDKByUndAstExpOpTyp = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vExpiry = req.body.Expiry;
    let vOptionType = req.body.OptionType;
    let vContractType = "";

    if(vOptionType === "CE"){
        vContractType = "call_options";
    }
    else if(vOptionType === "PE"){
        vContractType = "put_options";
    }
    else{
        vContractType = "";
    }

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getOptionChain({
            contract_types: vContractType, underlying_asset_symbols: vUAssetSymbol, expiry_date: vExpiry
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error at fnGetOptChnSDKByUndAstExp, Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {

            res.send({ "status": "danger", "message": "Error At fnGetOptChnSDKByAstOptTypExp Catch, Contact Admin!", "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": "" });
}

exports.fnGetBestRatesBySymbol = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;

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

function fnGetSignature(pApiSecret, pMethod, pPath, pQueryStr, pTimeStamp, pBody){
  if (!pBody || R.isEmpty(pBody)) pBody = "";
  else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

  const vMessage = pMethod + pTimeStamp + pPath + pQueryStr + pBody;
  return crypto
    .createHmac("sha256", pApiSecret)
    .update(vMessage)
    .digest("hex");
}