const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const DeltaRestClient = require("delta-rest-client");

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaDemo.ejs");
}

exports.fnExecTraderLogin = async (req, res) => {
    try {
        let objData = await fnGetDeltaTestData();

        res.send({ "status": "success", "message": "Trader Login - Successful", "data": objData.data });
    }
    catch (error) {
        console.log("Error: " + error);
        res.send({ "status": "danger", "message": error.message, "data": error });
    }
}

const fnGetDeltaTestData = async () => {
    const objPromise = new Promise((resolve, reject) => {
        let vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
        let vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

        new DeltaRestClient(vApiKey, vApiSecret).then(client => {
            client.apis.Wallet.getBalances().then(function (response) {
                let objBalance = JSON.parse(response.data.toString());
                console.log("\wallet:\n----\n", JSON.stringify(objBalance));
                console.log("\wallet:\n----\n", objBalance.success);


                resolve({ "status": "success", "message": "Data Received!", "data": objBalance });
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
    });
    return objPromise;
}

function fnGenerateSignature(secret, message) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    return hmac.digest('hex');
}