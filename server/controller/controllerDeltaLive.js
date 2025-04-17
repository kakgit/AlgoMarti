const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const DeltaRestClient = require("delta-rest-client");

const baseUrl = 'https://api.india.delta.exchange';
const apiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
const apiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';


exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaLive.ejs");
}

exports.fnGetLeverage = async (req, res) => {
    //Live Account
    let vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
    let vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.getOrderLeverage({ product_id: 27 }).then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                res.send({ "status": "success", "message": "Product Leverage Information Feched!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            // console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
    });
}

exports.fnSetLeverage = async (req, res) => {
    //Live Account
    let vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
    let vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.changeOrderLeverage({ product_id: 27, order_leverage: { leverage: 10 } }).then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                res.send({ "status": "success", "message": "Product Leverage Changed!", "data": objResult });
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

exports.fnTestWallet = async (req, res) => {
    // Get open orders
    const method = 'GET';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/wallet/balances';
    const url = `${baseUrl}${path}`;
    const queryString = '';
    const payload = '';
    const signatureData = method + timestamp + path + queryString + payload;
    const signature = generateSignature(apiSecret, signatureData);

    const reqHeaders = {
        'api-key': apiKey,
        'timestamp': timestamp,
        'signature': signature,
        'User-Agent': 'javascript-rest-client',
        'Content-Type': 'application/json'
    };

    const query = { };

    axios({
        method: method,
        url: url,
        data: payload,
        params: query,
        timeout: 27000,
        headers: reqHeaders
    }).then(response => {
        console.log(response.data);
    }).catch(error => {
        console.error(error);
    });
}

const fnGetAccessToken = async () => {
    const objAccessToken = new Promise((resolve, reject) => {
        // //Live Account
        // let vBaseUrl = 'https://api.india.delta.exchange';
        // let vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
        // let vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

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

function generateSignature(secret, message) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    return hmac.digest('hex');
}

function fnGenerateSignature(pApiSecret, pMessage) {
return crypto
    .createHmac("sha256", pApiSecret)
    .update(pMessage)
    .digest("hex");
}