const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const gBaseUrl = 'https://api.india.delta.exchange';

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaFundingLive.ejs");
}

exports.fnValidateUserLogin = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vApiKey2 = req.body.ApiKey2;
    let vApiSecret2 = req.body.ApiSecret2;
    let objWallet = [];

    let objRetData1 = await fnGetUserWallet(vApiKey, vApiSecret);
    if(objRetData1.status === "success"){
        // console.log(objRetData1.data.result[0]);
        objWallet.push(objRetData1.data.result[0]);

        if(vApiKey2 !== ""){
            let objRetData2 = await fnGetUserWallet(vApiKey2, vApiSecret2);
            if(objRetData2.status === "success"){
                objWallet.push(objRetData2.data.result[0]);
            }
        }

        res.send({ "status": "success", "message": objRetData1.message, "data": objWallet });
    }
    else{
        res.send({ "status": objRetData1.status, "message": objRetData1.message, "data": objRetData1.data });
    }
    // res.send({ "status": "success", "message": "Testing", "data": "" });
}

exports.fnGetOptChnSDKByAstOptTypExp = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vDayDate = req.body.DayExpiry;
    let vWeekDate = req.body.WeekExpiry;
    let vMonthDate = req.body.MonthExpiry;
    let vContractType = "";
    let vDayCallDelta = 0;
    let vDayPutDelta = 0;
    let vDayOtherDelta = 0;
    let vWeekCallDelta = 0;
    let vWeekPutDelta = 0;
    let vWeekOtherDelta = 0;
    let vMonthCallDelta = 0;
    let vMonthPutDelta = 0;
    let vMonthOtherDelta = 0;

    let objDayOptChn = await fnGetOptChnByCntrctTypeExp(vApiKey, vApiSecret, vUAssetSymbol, vDayDate, vContractType);
    if(objDayOptChn.status === "success"){
        for(let i=0; i<objDayOptChn.data.result.length; i++){
            if(objDayOptChn.data.result[i].contract_type === "put_options"){
                vDayPutDelta += Math.abs(parseFloat(objDayOptChn.data.result[i].greeks.delta));
            }
            else if(objDayOptChn.data.result[i].contract_type === "call_options"){
                vDayCallDelta += Math.abs(parseFloat(objDayOptChn.data.result[i].greeks.delta));
            }
            else{
                vDayOtherDelta += Math.abs(parseFloat(objDayOptChn.data.result[i].greeks.delta));
            }
        }

        let objWeekOptChn = await fnGetOptChnByCntrctTypeExp(vApiKey, vApiSecret, vUAssetSymbol, vWeekDate, vContractType);
        if(objWeekOptChn.status === "success"){
            for(let i=0; i<objWeekOptChn.data.result.length; i++){
                if(objWeekOptChn.data.result[i].contract_type === "put_options"){
                    vWeekPutDelta += Math.abs(parseFloat(objWeekOptChn.data.result[i].greeks.delta));
                }
                else if(objWeekOptChn.data.result[i].contract_type === "call_options"){
                    vWeekCallDelta += Math.abs(parseFloat(objWeekOptChn.data.result[i].greeks.delta));
                }
                else{
                    vWeekOtherDelta += Math.abs(parseFloat(objWeekOptChn.data.result[i].greeks.delta));
                }
            }

            let objMonthOptChn = await fnGetOptChnByCntrctTypeExp(vApiKey, vApiSecret, vUAssetSymbol, vMonthDate, vContractType);
            if(objMonthOptChn.status === "success"){
                for(let i=0; i<objMonthOptChn.data.result.length; i++){
                    if(objMonthOptChn.data.result[i].contract_type === "put_options"){
                        vMonthPutDelta += Math.abs(parseFloat(objMonthOptChn.data.result[i].greeks.delta));
                    }
                    else if(objMonthOptChn.data.result[i].contract_type === "call_options"){
                        vMonthCallDelta += Math.abs(parseFloat(objMonthOptChn.data.result[i].greeks.delta));
                    }
                    else{
                        vMonthOtherDelta += Math.abs(parseFloat(objMonthOptChn.data.result[i].greeks.delta));
                    }
                }

                let objDeltas = { DayCall : vDayCallDelta, DayPut : vDayPutDelta, WeekCall : vWeekCallDelta, WeekPut : vWeekPutDelta, MonthCall : vMonthCallDelta, MonthPut : vMonthPutDelta };

                res.send({ "status": "success", "message": "Delta Data Received Successfully!", "data": objDeltas });
            }
            else{
                res.send({ "status": "danger", "message": objMonthOptChn.message, "data": "" });
            }
        }
        else{
            res.send({ "status": "danger", "message": objWeekOptChn.message, "data": "" });
        }
    }
    else{
        res.send({ "status": "danger", "message": objDayOptChn.message, "data": "" });
    }
}

const fnGetUserWallet = async (pApiKey, pApiSecret) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
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

const fnGetOptChnByCntrctTypeExp = async (pApiKey, pApiSecret, pUndrAsstSymb, pExpiry, pContractType) => {
    const objPromise = new Promise((resolve, reject) => {

        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Products.getOptionChain({
                contract_types: pContractType, underlying_asset_symbols: pUndrAsstSymb, expiry_date: pExpiry
            }).then(function (response) {
                let objResult = JSON.parse(response.data);

                if(objResult.success){
                    resolve({ "status": "success", "message": "Option Chain Data Feched!", "data": objResult });
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
    });

    return objPromise;
}
