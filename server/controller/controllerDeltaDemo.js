const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
// const DeltaRestClient = require("delta-rest-client");

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaDemo.ejs");
}

exports.fnExecTraderLogin = async (req, res) => {
    try {
        let objSession = await fnGetDeltaSession();

        console.log("Login Success!");
        res.send({ "status": "success", "message": "Trader Login - Successful", "data": "" });
    }
    catch (error) {
        console.log("Error: " + error.data);
        res.send({ "status": "danger", "message": error.message, "data": error.data });
    }
}

const fnGetDeltaSession = async () => {
    const objPromise = new Promise((resolve, reject) => {
        let base_url = 'https://api.india.delta.exchange';
        let api_key = 'a207900b7693435a8fa9230a38195d';
        let api_secret = '7b6f39dcf660ec1c7c664f612c60410a2bd0c258416b498bf0311f94228f';
        const objDate = new Date();
        let vSecDt = objDate.valueOf();

        let data = JSON.stringify({
            "userId": pSubUserId,
            "mpin": pMpin
        });

        let config = {
            method: 'GET',
            timestamp : str(vSecDt),
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/login/1.0/login/v2/validate',
            headers: {
                'sid': pSid,
                'Auth': pViewToken,
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: data
        };

        axios.request(config)
            .then((objResponse) => {
                console.log(objResponse);
                resolve({ "status": "success", "message": "Session Received!", "data": "" });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "At Get Kotak Session: " + error.message, "data": error });
            });
        
        resolve({ "status": "success", "message": "Session Received!", "data": "" });
    });
    return objPromise;
}