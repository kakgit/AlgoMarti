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
    res.render("deltaLive.ejs");
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
            console.log("Error At User Login Catch");
            res.send({ "status": "danger", "message": "Error At User Login! Catch.", "data": objError });
        });
    });
}

exports.fnGetProdBySymbol = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getTicker({
            symbol: vSymbol
          }).then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                res.send({ "status": "success", "message": "Product Details Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error to Fetch Product Details: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            console.log("Error At fnGetProdBySymbol");
            res.send({ "status": "danger", "message": "Error At fnGetProdBySymbol.", "data": objError });
        });
    });
}

exports.fnGetSpotPriceByProd = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getTicker({
            symbol: vSymbol
          }).then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                res.send({ "status": "success", "message": "Spot Received Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            console.log("Error At Catch");
            res.send({ "status": "danger", "message": "Error At Spot Rate.", "data": objError });
        });
    });
}

exports.fnGetLeverageSDK = async (req, res) => {
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.getOrderLeverage({ product_id: 27 }).then(function (response) {
            let objResult = JSON.parse(response.data.toString());

            if(objResult.success){
                res.send({ "status": "success", "message": "Product Leverage Information Fetched!", "data": objResult });
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

exports.fnSetLeverageSDK = async (req, res) => {
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.post(`/products/27/orders/leverage`, { leverage: '50' }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Order Leverage is Set Successfully!", "data": objResult });
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

exports.fnPlaceLimitOrderSDK = async (req, res) => {
    const objDate = new Date();
    let vSecDt = objDate.valueOf();

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.placeOrder({
            order: {
              product_id: 27,
              size: 1,
              side: "buy",
              limit_price: "75000",
              order_type: "limit_order",
              client_order_id: vSecDt.toString()
            }
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

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
}

exports.fnPlaceSLTPLimitOrderSDK = async (req, res) => {
    const objDate = new Date();
    let vSecDt = objDate.valueOf();

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
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
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
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

exports.fnGetUserWalletSDK = async (req, res) => {
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

exports.fnTestWalletAPI = async (req, res) => {
    const vMethod = "GET";
    const vPath = '/v2/wallet/balances';
    const vQueryStr = "";
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);
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
        console.log(objRes);

        res.send({ "status": "success", "message": "Wallet Information Feched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error in Login. Contact Administrator!", "data": objError });
    });      
}

exports.fnSetLeverageAPI = async (req, res) => {
    const vMethod = "POST";
    const vPath = '/v2/products/27/orders/leverage';
    const vQueryStr = "";
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);
    const vBody = { order_leverage: '50' };
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
        console.log(objRes);

        res.send({ "status": "success", "message": "Leverage Changed Successfully!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error to Change Leverage. Contact Administrator!", "data": objError });
    });      
}

exports.fnTestGetAllOrderAPI = async (req, res) => {
    const vMethod = "GET";
    const vPath = '/v2/orders';
    const vQueryStr = "";
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);
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
        console.log(objRes);

        res.send({ "status": "success", "message": "Wallet Information Feched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error in Login. Contact Administrator!", "data": objError });
    });      
}

exports.fnGetCurrPriceByProd = async (req, res) => {
    // let vApiKey = req.body.ApiKey;
    // let vApiSecret = req.body.ApiSecret;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getTicker({
            symbol: "ETHUSD"
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Ticker Data Received Successfully!", "data": objResult });
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

exports.fnGetProductsList = async (req, res) => {
    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getProducts({
            contract_types: "perpetual_futures"
        }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Ticker Data Received Successfully!", "data": objResult });
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

exports.fnGetOptionChainSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vOptionType = req.body.OptionType;
    let vExpiryDate = req.body.OptionExpiry;
    let vContractType = "call_options";

    if(vOptionType === "PE"){
        vContractType = "put_options";
    }
    else{
        vContractType = "call_options";
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
                res.send({ "status": "warning", "message": "Error at Option Chain, Contact Admin!", "data": objResult });
            }
        })
        .catch(function(objError) {
            res.send({ "status": "danger", "message": "Error At fnGetOptionChainSDK Catch, Contact Admin!", "data": objError });
        });
    });
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