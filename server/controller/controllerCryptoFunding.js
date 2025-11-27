const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const gBaseUrlDelta = 'https://api.india.delta.exchange';

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("cryptoFunding.ejs");
}

exports.fnDeltaCredValidate = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vSecretCode = req.body.SecretCode;
    let objWallet = [];

    let objRetData = await fnGetUserWallet(vApiKey, vSecretCode);
    if(objRetData.status === "success"){
        // console.log(objRetData.data.result[0]);
        objWallet.push(objRetData.data.result[0]);

        res.send({ "status": "success", "message": objRetData.message, "data": objWallet });
    }
    else{
        res.send({ "status": objRetData.status, "message": objRetData.message, "data": objRetData.data });
    }
    // res.send({ "status": "success", "message": "Testing", "data": "" });
}

const fnGetUserWallet = async (pApiKey, pSecretCode) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pSecretCode).then(client => {
            client.apis.Wallet.getBalances().then(function (response) {
                let objResult = JSON.parse(response.data.toString());

                if(objResult.success){
                    // console.log("\wallet:\n----\n", JSON.stringify(objResult));
                    // console.log("\wallet:\n----\n", objResult.success);
                    resolve({ "status": "success", "message": "Valid Login, Balance Fetched!", "data": objResult });
                }
                else{
                    // console.log("Failed....");
                    resolve({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
                }
            })
            .catch(function(objError) {
                console.log("Error At Fut User Login Catch");
                resolve({ "status": "danger", "message": "Error At User Login! Catch.", "data": objError });
            });
        });
    });
    return objPromise;
}
