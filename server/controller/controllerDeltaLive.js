const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const DeltaRestClient = require("delta-rest-client");

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaLive.ejs");
}

exports.fnGetUserWallet = async (req, res) => {
    //Live Account
    let vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
    let vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';
    // //Testnet Account
    // let vApiKey = 'jFF1ac2CZ1pYeWD5Gq9pa5CcAg57Pi';
    // let vApiSecret = 'xGyqQdrRnEdLHEaPB5pdlgORoe9ZvdWoxQm8F44fKSiXZiXMhujOJzhw8DJO';

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Wallet.getBalances().then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                // console.log("\wallet:\n----\n", JSON.stringify(objResult));
                // console.log("\wallet:\n----\n", objResult.success);
                res.send({ "status": "success", "message": "Wallet Information Feched!", "data": objResult });
            }
            else{
                // console.log("Failed....");
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            // console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
        // Get List of Products
        // client.apis.Products.getProducts().then(function(response) {
        //     var products = JSON.parse(response.data.toString());
        //     console.log("\nProducts:\n----\n", JSON.stringify(products));
        // });

        // Get Open orders for product_id = 3
        // client.apis.Orders.getOrders({ product_id: 3, state: "open" }).then(function(response){
        //     var orders = JSON.parse(response.data.toString());
        //     console.log("Open Orders:", orders);
        // });
    });
}

// exports.fnExecTraderLogin = async (req, res) => {
//     try {
//         let vAccessToken = await fnGetAccessToken();

//         res.send({ "status": "success", "message": "Success", "data": "" });
//     }
//     catch (error) {
//         res.send({ "status": "danger", "message": error, "data": "" });
//     }
// }

const fnGetAccessToken = async () => {
    const objAccessToken = new Promise((resolve, reject) => {
        // //Live Account
        // let vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
        // let vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

        // //Live URL
        // let vBaseUrl = 'https://api.india.delta.exchange';
        //TestNet Url
        let vBaseUrl = 'https://cdn-ind.testnet.deltaex.org';
        let vApiKey = 'jFF1ac2CZ1pYeWD5Gq9pa5CcAg57Pi';
        let vApiSecret = 'xGyqQdrRnEdLHEaPB5pdlgORoe9ZvdWoxQm8F44fKSiXZiXMhujOJzhw8DJO';
        let vMethod = "GET";
        let vTimeStamp = Math.floor(new Date().getTime() / 1000);
        let vPath = '/v2/wallet/balances';
        let vUrl = vBaseUrl + vPath;
        let vQueryString = '';
        let vPayLoad = '';

        let vSignatureData = vMethod + vTimeStamp + vPath + vQueryString + vPayLoad;
        let vSignature = fnGenerateSignature(vApiSecret, vSignatureData);

        let data = '';

        let config = {
            method: vMethod,
            maxBodyLength: Infinity,
            url: vUrl,
            headers: {
                'api-key': vApiKey,
                'timestamp': vTimeStamp,
                'signature': vSignature,
                'User-Agent': 'python-rest-client',
                'Content-Type': 'application/json'
            },
            data: data,
        };

        axios
            .request(config)
            .then((objResponse) => {
                console.log(objResponse);
                resolve({ "status": "success", "message": "Success!", "data": "" });
            })
            .catch((error) => {
                console.log(error);
                reject({ "status": "danger", "message": error.message, "data": error });
            })
    });

    return objAccessToken;
};

function fnGenerateSignature(pApiSecret, pMessage) {
return crypto
    .createHmac("sha256", pApiSecret)
    .update(pMessage)
    .digest("hex");
}