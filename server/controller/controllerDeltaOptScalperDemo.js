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
    res.render("deltaOptScalperDemo.ejs");
}

exports.fnExecOptOpen = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vOptType = req.body.OptType;
    let vSymbol = req.body.Symbol;
    let vExpiry = req.body.Expiry;
    let vQty = req.body.Qty;
    let vSellDelta = req.body.SellDelta;
    let vContractType = req.body.ContractType;

    let objOptChn = await fnGetOptChnByCntrctTypeExp(vApiKey, vApiSecret, vOptType, vSymbol, vExpiry, vContractType, vSellDelta);
    if(objOptChn.status === "success"){
        // console.log("vQty: " + vQty);
        // console.log("vSellDelta: " + vSellDelta);
        //Execute Real Trade Here
        objOptChn.data.Qty = parseInt(vQty);

        res.send({ "status": "success", "message": objOptChn.message, "data": objOptChn.data });
    }
    else{
        res.send({ "status": "danger", "message": objOptChn.message, "data": "" });
    }
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

const fnGetOptChnByCntrctTypeExp = async (pApiKey, pApiSecret, pOptType, pSymbol, pExpiry, pContractType, pSellDelta) => {
    const objPromise = new Promise((resolve, reject) => {

        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Products.getOptionChain({
                contract_types: pContractType, underlying_asset_symbols: pSymbol, expiry_date: pExpiry
            }).then(function (response) {
                let objResult = JSON.parse(response.data);
            	let objOCData = [];
            	let objOCSortData = [];

                if(objResult.success){
                    for(let i=0; i<objResult.result.length; i++){
                        let vAbsDelta = Math.abs(parseFloat(objResult.result[i].greeks.delta));
                        // console.log(objResult.result[i].contract_type);
                        if(vAbsDelta <= parseFloat(pSellDelta)){
                           let objOCLeg = { ProductID : objResult.result[i].product_id, UndrAsstSymb : objResult.result[i].underlying_asset_symbol, ContType : objResult.result[i].contract_type, OptionType : pOptType, Delta : vAbsDelta, Vega : parseFloat(objResult.result[i].greeks.vega), BestAsk : parseFloat(objResult.result[i].quotes.best_ask), BestBid : parseFloat(objResult.result[i].quotes.best_bid), Strike : parseInt(objResult.result[i].strike_price), Symbol : objResult.result[i].symbol, Expiry : pExpiry };

                            objOCData.push(objOCLeg);
                        }
                    }
                    objOCSortData = objOCData.sort(fnSortRevByDelta);
                    // console.log(objOCSortData[0]);
                    resolve({ "status": "success", "message": "Option Chain Data Feched!", "data": objOCSortData[0] });
                }
                else{
                    resolve({ "status": "warning", "message": "Option Chain Failed!", "data": objResult });
                }
            })
            .catch(function(objError) {
                console.log(objError);
                resolve({ "status": "danger", "message": "Error in getting Option Chain!", "data": objError });
            });
        });
        // resolve({ "status": "success", "message": "Option Chain Data Fetched!", "data": "" });
    });

    return objPromise;
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

function fnSortByDelta(a, b) {
    return (a.Delta) - (b.Delta);
}

function fnSortRevByDelta(a, b) {
    return (b.Delta) - (a.Delta);
}
