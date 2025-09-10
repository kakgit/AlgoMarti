const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaOptionsDemo.ejs");
}

exports.fnGetOptionChainSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = "BTC"; //req.body.UndAssetSymbol;
    let vOptionType = "CE"; //req.body.OptionType;
    let vExpiryDate = "10-09-2025"; //req.body.OptionExpiry;
    let vContractType = "call_options,put_options";
    let vCallOI = 0;
    let vPutOI = 0;
    // if(vOptionType === "PE"){
    //     vContractType = "put_options";
    // }
    // else{
    //     vContractType = "call_options";
    // }
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getOptionChain({
            contract_types: vContractType, underlying_asset_symbols: vUAssetSymbol, expiry_date: vExpiryDate
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                // for(let i=0; i<objResult.data.length; i++){
                //     console.log(objResult.data[i].close);
                // }
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
