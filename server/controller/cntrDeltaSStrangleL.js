
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
    res.render("deltaShortStrangleL.ejs");
}

exports.fnValidateUserLogin = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let objWallet = [];

    let objRetData1 = await fnGetUserWallet(vApiKey, vApiSecret);
    if(objRetData1.status === "success"){
        // console.log(objRetData1.data.result[0]);
        objWallet.push(objRetData1.data.result[0]);

        res.send({ "status": "success", "message": objRetData1.message, "data": objWallet });
    }
    else{
        res.send({ "status": objRetData1.status, "message": objRetData1.message, "data": objRetData1.data });
    }
    // res.send({ "status": "success", "message": "Testing", "data": "" });
}

exports.fnWalletDetails = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let objWallet = [];

    let objRetData1 = await fnGetUserWallet(vApiKey, vApiSecret);
    if(objRetData1.status === "success"){
        // console.log(objRetData1.data.result[0]);
        // objWallet.push(objRetData1.data.result[0]);

        res.send({ "status": "success", "message": objRetData1.message, "data": objRetData1.data });
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

exports.fnExecOptionByOptTypeExpTransType = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vExpiry = req.body.Expiry;
    let vOptionType = req.body.OptionType;
    let vTransType = req.body.TransType;
    let vOrderType = req.body.OrderType;
    let vDeltaNPos = req.body.DeltaNPos;
    let vRateNPos = req.body.RateNPos;
    let vLotQty = req.body.LotQty;
    let vClientID = req.body.ClientID;
    let vContractType = "";
    let vPostOnly = false;

    if(vOptionType === "C"){
        vContractType = "call_options";
    }
    else if(vOptionType === "P"){
        vContractType = "put_options";
    }
    else{
        vContractType = "";
    }

    try {
        let objOptChn = await fnGetSrtdOptChnByDelta(vApiKey, vApiSecret, vOptionType, vUAssetSymbol, vExpiry, vContractType, vDeltaNPos, vRateNPos);
        if(objOptChn.status === "success"){
            let vLimitPrice = "0";
            let vBestBuy = objOptChn.data.BestAsk;
            let vBestSell = objOptChn.data.BestBid;
            let vSymbol = objOptChn.data.Symbol;

            // if(vOrderType === "market_order"){
            //     vBestBuy = "0";
            //     vBestSell = "0";
            //     vPostOnly = false;
            // }
            if(vTransType === "buy"){
                vLimitPrice = vBestBuy;
            }
            else if(vTransType === "sell"){
                vLimitPrice = vBestSell;
            }

            new DeltaRestClient(vApiKey, vApiSecret).then(client => {
                client.apis.Orders.placeOrder({
                    order: {
                    product_symbol: vSymbol,
                    size: vLotQty,
                    side: vTransType,
                    limit_price: 1,
                    order_type: "market_order",
                    client_order_id: (vClientID).toString(),
                    reduce_only: false
                    }
                }).then(function (response) {
                    let objResult = JSON.parse(response.data);
                    // console.log(objResult);
                    if((objResult.success) && (objResult.result.state === "closed")){
                        if(vTransType === "sell"){
                            objOptChn.data.BestBid = objResult.result.average_fill_price;
                        }
                        else if(vTransType === "buy"){
                            objOptChn.data.BestAsk = objResult.result.average_fill_price;
                        }
                        objOptChn.data.ClientOrderID = objResult.result.client_order_id;
                        objOptChn.data.TradeID = objResult.result.id;
                        objOptChn.data.Commission = objResult.result.paid_commission;
                        objOptChn.data.ProductID = objResult.result.product_id;
                        objOptChn.data.Symbol = objResult.result.product_symbol;
                        objOptChn.data.TransType = objResult.result.side;
                        objOptChn.data.Qty = objResult.result.size;
                        objOptChn.data.State = "OPEN";

                        res.send({ "status": "success", "message": "Market Order Placed Successfully!", "data": objOptChn.data });
                    }
                    else if((objResult.success) && (objResult.result.state === "open")){
                        if(vTransType === "sell"){
                            objOptChn.data.BestBid = vLimitPrice;
                        }
                        else if(vTransType === "buy"){
                            objOptChn.data.BestAsk = vLimitPrice;
                        }
                        objOptChn.data.ClientOrderID = objResult.result.client_order_id;
                        objOptChn.data.TradeID = objResult.result.id;
                        objOptChn.data.Commission = objResult.result.paid_commission;
                        objOptChn.data.ProductID = objResult.result.product_id;
                        objOptChn.data.Symbol = objResult.result.product_symbol;
                        objOptChn.data.TransType = objResult.result.side;
                        objOptChn.data.Qty = objResult.result.size;
                        objOptChn.data.State = "PENDING";
                        res.send({ "status": "success", "message": "Limit Order Placed Successfully!", "data": objOptChn.data });
                    }
                    else{
                        res.send({ "status": "warning", "message": "Error to Place the Open Order!", "data": objResult });
                    }
                })
                .catch(function(objError) {
                    console.log("*************** Error **************");
                    // console.log(objError);
                    res.send({ "status": "danger", "message": objError.response.text, "data": objError });
                });
            });

            // res.send({ "status": "success", "message": objOptChn.message, "data": objOptChn.data });
        }
        else{
            res.send({ "status": "danger", "message": objOptChn.message, "data": "" });
        }
    }
    catch (error) {
            res.send({ "status": "danger", "message": error.message, "data": "" });
    }
    // res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": "" });
}

exports.fnGetBestRatesBySymbol = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;

    const vMethod = "GET";
    const vPath = '/v2/tickers/' + vSymbol;
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);

    const vQueryStr = "";
    const vBody = "";
    const vSignature = fnGetSignature(vApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
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
        // console.log(objRes);
        res.send({ "status": "success", "message": "Best Buy and Sell Rates Feched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error in Best Rates. Contact Administrator!", "data": objError });
    });
    // res.send({ "status": "success", "message": "Current Rate Information Feched!", "data": "" });
}

exports.fnOpenRealPoistion = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vClientID = req.body.ClientID;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.placeOrder({
            order: {
            product_symbol: "GRIFFAINUSD",
            size: 1,
            side: "buy",
            limit_price: 0,
            order_type: "market_order",
            client_order_id: (vClientID).toString(),
            reduce_only: false
            }
        }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Order Placed Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error to Place the Open Order!", "data": objResult });
            }
        })
        .catch(function(objError) {
            // console.log("*************** Error **************");
            // console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Order Closed", "data": "" });
}

exports.fnCloseRealPoistion = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;
    let vLotQty = req.body.LotQty;
    let vTransType = req.body.TransType;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.placeOrder({
            order: {
            product_symbol: vSymbol,
            size: vLotQty,
            side: vTransType,
            limit_price: 0,
            order_type: "market_order",
            reduce_only: true
            }
        }).then(function (response) {
            let objResult = JSON.parse(response.data);

            if(objResult.success){
                res.send({ "status": "success", "message": "Close Order Executed Successfully!", "data": objResult });
            }
            else{
                res.send({ "status": "warning", "message": "Error to Close the Open Order!", "data": objResult });
            }
        })
        .catch(function(objError) {
            // console.log("*************** Error **************");
            // console.log(objError);
            res.send({ "status": "danger", "message": objError.response.text, "data": objError });
        });
    });
    // res.send({ "status": "success", "message": "Order Closed", "data": "" });
}

exports.fnGetRealClsdPositions = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vStartDT = req.body.StartDT;
    let vEndDT = req.body.EndDT;
    let vClientID = req.body.ClientID;

    // let vGMTDT = vStartDT - 19800000;
    

    let objRetData = await fnGetClsdTrades(vApiKey, vApiSecret, vStartDT, vEndDT, vClientID);
    if(objRetData.status === "success"){
        // console.log(objRetData.data.result[0]);
        // objWallet.push(objRetData.data.result[0]);

        res.send({ "status": "success", "message": objRetData.message, "data": objRetData.data });
    }
    else{
        res.send({ "status": objRetData.status, "message": objRetData.message, "data": objRetData.data });
    }

    // console.log("vApiKey: " + vApiKey);
    // console.log("vApiSecret: " + vApiSecret);
    // console.log("vClientID: " + vClientID);

    // const vMethod = "GET";
    // const vPath = '/v2/orders/history';
    // const vTimeStamp = Math.floor(new Date().getTime() / 1000);

    // const vQueryStr = "";
    // const vBody = "";
    // const vSignature = fnGetSignature(vApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
    // let config = {
    //     method: vMethod,
    //     maxBodyLength: Infinity,
    //     url: gBaseUrl + vPath + vQueryStr,
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Accept': 'application/json',
    //         'api-key': vApiKey,
    //         'signature': vSignature,
    //         'timestamp': vTimeStamp
    //         }
    //     };
    // axios.request(config)
    //   .then((objResult) => {
    //     let objRes = objResult.data;
    //     // console.log(objRes);
    //     res.send({ "status": "success", "message": "Real Closed Positions Fetched!", "data": objRes });
    // })
    //   .catch((objError) => {
    //     console.log(objError);
    //     res.send({ "status": "danger", "message": "Error at Getting Closed Positions. Contact Administrator!", "data": objError });
    // });
    // res.send({ "status": "success", "message": "Closed Trades Information Feched!", "data": "" });
}

exports.fnGetRealOpenPositions = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let objProductIds = [];
    let vProductIds = "";

    let objRetData = await fnGetOpenTrades(vApiKey, vApiSecret);
    if(objRetData.status === "success"){
        if(objRetData.data.result.length > 0){
            for(let i=0; i<objRetData.data.result.length; i++){
                objProductIds.push(objRetData.data.result[i].product_id);
            }
            vProductIds = objProductIds.join(', ');
            // console.log(objProductIds);

            new DeltaRestClient(vApiKey, vApiSecret).then(client => {
                client.apis.TradeHistory.getUserfills({ product_ids : vProductIds }).then(function (response) {
                    let objResult = JSON.parse(response.data);
                    if(objResult.success){
                        // for(let k=0; k<objRetData.data.result.length; k++){
                        //     console.log(objRetData.data.result[k].product_id + " - " + parseInt(objRetData.data.result[k].entry_price) + " - " + objRetData.data.result[k].product_symbol);
                        // }
                        // console.log("Nxt loop");
                        // for(let j=0; j<objResult.result.length; j++){
                        //     console.log(objResult.result[j].product_id + " - " + parseInt(objResult.result[j].price) + " - " + objResult.result[j].product_symbol);
                        // }
                        res.send({ "status": "success", "message": "Open Trades Fetched!", "data": objResult });
                    }
                })
                .catch(function(objError) {
                    // console.log("*************** Error **************");
                    // console.log(objError);
                    res.send({ "status": "danger", "message": objError.response.text, "data": objError });
                });
            });        
        }
        else{
            res.send({ "status": "warning", "message": "No Open Positions!", "data": "" });
        }
        // res.send({ "status": "success", "message": objRetData.message, "data": objRetData.data });
    }
    else{
        res.send({ "status": objRetData.status, "message": objRetData.message, "data": objRetData.data });
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

const fnGetSrtdOptChnByDelta = async (pApiKey, pApiSecret, pOptType, pUAssetSymbol, pExpiry, pContractType, pDeltaNPos, pRateNPos) => {
    const objPromise = new Promise((resolve, reject) => {

        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Products.getOptionChain({
                contract_types: pContractType, underlying_asset_symbols: pUAssetSymbol, expiry_date: pExpiry
            }).then(function (response) {
                let objResult = JSON.parse(response.data);
            	let objOCData = [];
            	let objOCSortData = [];

                if(objResult.success){
                    for(let i=0; i<objResult.result.length; i++){
                        let vAbsDelta = Math.abs(parseFloat(objResult.result[i].greeks.delta));
                        let vBestSellPrice = parseFloat(objResult.result[i].quotes.best_ask);
                        let vBestBuyPrice = parseFloat(objResult.result[i].quotes.best_bid);
                        if(vBestSellPrice >= parseFloat(pRateNPos)){
                            // console.log(objResult.result[i]);
                            let objOCLeg = { ProductID : objResult.result[i].product_id, UndrAsstSymb : objResult.result[i].underlying_asset_symbol, ContType : objResult.result[i].contract_type, OptionType : pOptType, Delta : vAbsDelta, BestAsk : vBestSellPrice, BestBid : vBestBuyPrice, Strike : parseInt(objResult.result[i].strike_price), Symbol : objResult.result[i].symbol, Expiry : pExpiry };

                            objOCData.push(objOCLeg);
                        }
                    }
                    objOCSortData = objOCData.sort(fnSortByRate);
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

function fnSortRevByDelta(a, b) {
    return (b.Delta) - (a.Delta);
}

function fnSortByRate(a, b) {
    return (a.BestAsk) - (b.BestAsk);
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

const fnGetOpenTrades = async (pApiKey, pApiSecret) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Positions.getMarginedPositions().then(function (response) {
                let objResult = JSON.parse(response.data.toString());
                // console.log(objResult);

                if(objResult.success){
                    // console.log("\wallet:\n----\n", JSON.stringify(objResult));
                    // console.log("\wallet:\n----\n", objResult.success);
                    resolve({ "status": "success", "message": "Details Fetched!", "data": objResult });
                }
                else{
                    // console.log("Failed....");
                    resolve({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
                }
            })
            .catch(function(objError) {
                console.log(objError);
                resolve({ "status": "danger", "message": "Error At GetOpenTrades! Catch.", "data": objError });
            });
        });
    });
    return objPromise;
}


const fnGetClsdTrades = async (pApiKey, pApiSecret, pStartDT, pEndDT, pClientID) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            //order_types : "limit", start_time : 1764527400000000, end_time : 1764527399000000000
            client.apis.TradeHistory.getOrderHistory({start_time : pStartDT, end_time : pEndDT, page_size : 100}).then(function (response) {
                let objResult = JSON.parse(response.data.toString());

                if(objResult.success){
                    // console.log("\wallet:\n----\n", JSON.stringify(objResult));
                    // console.log("\wallet:\n----\n", objResult.success);
                    resolve({ "status": "success", "message": "Details Fetched!", "data": objResult });
                }
                else{
                    // console.log("Failed....");
                    resolve({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
                }
            })
            .catch(function(objError) {
                console.log(objError);
                resolve({ "status": "danger", "message": "Error At Test! Catch.", "data": objError });
            });
        });
    });
    return objPromise;
}

const fnGetOpenPositions = async (pApiKey, pApiSecret) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Positions.getMarginedPositions().then(function (response) {
                let objResult = JSON.parse(response.data.toString());

                if(objResult.success){
                    // console.log("\wallet:\n----\n", JSON.stringify(objResult));
                    // console.log("\wallet:\n----\n", objResult.success);
                    resolve({ "status": "success", "message": "Details Fetched!", "data": objResult });
                }
                else{
                    // console.log("Failed....");
                    resolve({ "status": "warning", "message": "Error: Contact Admin!", "data": objResult });
                }
            })
            .catch(function(objError) {
                console.log("Error to Get Closed Trades at Catch");
                resolve({ "status": "danger", "message": "Error At Test! Catch.", "data": objError });
            });
        });
    });
    return objPromise;
}
