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
