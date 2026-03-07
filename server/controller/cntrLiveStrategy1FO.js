
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
    res.render("LiveStrategy1FO.ejs");
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

exports.fnExecOptByOTypExpTType = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vExpiry = req.body.Expiry;
    let vOptionType = req.body.OptionType;
    let vTransType = req.body.TransType;
    let vOrderType = req.body.OrderType;
    let vDeltaPos = req.body.DeltaPos;
    let vDeltaRePos = req.body.DeltaRePos;
    let vDeltaTP = req.body.DeltaTP;
    let vDeltaSL = req.body.DeltaSL;
    let vLotSize = req.body.LotSize;
    let vLotQty = req.body.LotQty;
    let vContractType = "";
    let vPostOnly = true;
    
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
        let objOptChn = await fnGetSrtdOptChnByDelta(vApiKey, vApiSecret, vTransType, vOptionType, vUAssetSymbol, vLotSize, vExpiry, vLotQty, vContractType, vDeltaPos, vDeltaRePos, vDeltaTP, vDeltaSL);
        if(objOptChn.status === "success"){
            let vLimitPrice = (vTransType === "buy") ? Number(objOptChn.data.BestAsk) : Number(objOptChn.data.BestBid);
            let objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                symbol: objOptChn.data.Symbol,
                size: Number(vLotQty),
                side: vTransType,
                orderType: vOrderType,
                limitPrice: vLimitPrice,
                reduceOnly: false
            });

            if(objOrdRes.status !== "success"){
                res.send({ "status": objOrdRes.status, "message": objOrdRes.message, "data": objOrdRes.data });
                return;
            }

            let objOrd = objOrdRes.data.result;
            let vExecPx = fnGetExecPrice(objOrd, vLimitPrice);

            if(vTransType === "buy"){
                objOptChn.data.BestAsk = vExecPx;
            }
            else if(vTransType === "sell"){
                objOptChn.data.BestBid = vExecPx;
            }
            objOptChn.data.ClientOrderID = objOrd.client_order_id;
            objOptChn.data.TradeID = objOrd.id;
            objOptChn.data.Commission = objOrd.paid_commission;
            objOptChn.data.ProductID = objOrd.product_id;
            objOptChn.data.Symbol = objOrd.product_symbol;
            objOptChn.data.TransType = objOrd.side;
            objOptChn.data.Qty = objOrd.size;
            objOptChn.data.State = (objOrd.state === "open") ? "PENDING" : "OPEN";
            res.send({ "status": "success", "message": "Order Executed Successfully!", "data": objOptChn.data });
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

exports.fnExecFutByTType = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vUAssetSymbol = req.body.UndAssetSymbol;
    let vOptionType = req.body.OptionType;
    let vTransType = req.body.TransType;
    let vLotSize = req.body.LotSize;
    let vLotQty = req.body.LotQty;
    let vOrderType = req.body.OrderType;
    let vPointsTP = req.body.PointsTP;
    let vPointsSL = req.body.PointsSL;
    let vContractType = "";
    let vPostOnly = true;
    
    if(vOptionType === "C"){
        vContractType = "call_options";
    }
    else if(vOptionType === "P"){
        vContractType = "put_options";
    }
    else{
        vContractType = "futures";
    }

    try {
        let objSybDet = await fnGetSymbolDetails(vApiKey, vApiSecret, vUAssetSymbol, vTransType, vOptionType, vLotSize, vLotQty, vPointsTP, vPointsSL);
        if(objSybDet.status === "success"){
            let vOrderSize = Number(vLotSize) * Number(vLotQty);
            if(!Number.isFinite(vOrderSize) || vOrderSize <= 0){
                vOrderSize = Number(vLotQty);
            }
            let vLimitPrice = (vTransType === "buy") ? Number(objSybDet.data.BestAsk) : Number(objSybDet.data.BestBid);
            let objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                symbol: objSybDet.data.Symbol,
                size: vOrderSize,
                side: vTransType,
                orderType: vOrderType,
                limitPrice: vLimitPrice,
                reduceOnly: false
            });

            if(objOrdRes.status !== "success"){
                res.send({ "status": objOrdRes.status, "message": objOrdRes.message, "data": objOrdRes.data });
                return;
            }

            let objOrd = objOrdRes.data.result;
            let vExecPx = fnGetExecPrice(objOrd, vLimitPrice);

            if(vTransType === "buy"){
                objSybDet.data.BestAsk = vExecPx;
            }
            else if(vTransType === "sell"){
                objSybDet.data.BestBid = vExecPx;
            }
            objSybDet.data.ClientOrderID = objOrd.client_order_id;
            objSybDet.data.TradeID = objOrd.id;
            objSybDet.data.Commission = objOrd.paid_commission;
            objSybDet.data.ProductID = objOrd.product_id;
            objSybDet.data.Symbol = objOrd.product_symbol;
            objSybDet.data.TransType = objOrd.side;
            objSybDet.data.Qty = objOrd.size;
            objSybDet.data.State = (objOrd.state === "open") ? "PENDING" : "OPEN";
            res.send({ "status": "success", "message": "Order Executed Successfully!", "data": objSybDet.data });
        }
        else{
            res.send({ "status": "danger", "message": objSybDet.message, "data": "" });
        }
    }
    catch (error) {
            res.send({ "status": "danger", "message": error.message, "data": "" });
    }
    // res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": "" });
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
    let vPostOnly = true;

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
        let objOptChn = await fnGetSrtdOptChnByRate(vApiKey, vApiSecret, vTransType, vOptionType, vUAssetSymbol, vExpiry, vContractType, vDeltaNPos, vRateNPos);
        if(objOptChn.status === "success"){
            let vLimitPrice = (vTransType === "buy") ? Number(objOptChn.data.BestAsk) : Number(objOptChn.data.BestBid);
            let objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                symbol: objOptChn.data.Symbol,
                size: Number(vLotQty),
                side: vTransType,
                orderType: vOrderType,
                limitPrice: vLimitPrice,
                reduceOnly: false
            });

            if(objOrdRes.status !== "success"){
                res.send({ "status": objOrdRes.status, "message": objOrdRes.message, "data": objOrdRes.data });
                return;
            }

            let objOrd = objOrdRes.data.result;
            let vExecPx = fnGetExecPrice(objOrd, vLimitPrice);

            if(vTransType === "buy"){
                objOptChn.data.BestAsk = vExecPx;
            }
            else if(vTransType === "sell"){
                objOptChn.data.BestBid = vExecPx;
            }
            objOptChn.data.ClientOrderID = objOrd.client_order_id;
            objOptChn.data.TradeID = objOrd.id;
            objOptChn.data.Commission = objOrd.paid_commission;
            objOptChn.data.ProductID = objOrd.product_id;
            objOptChn.data.Symbol = objOrd.product_symbol;
            objOptChn.data.TransType = objOrd.side;
            objOptChn.data.Qty = objOrd.size;
            objOptChn.data.State = (objOrd.state === "open") ? "PENDING" : "OPEN";
            res.send({ "status": "success", "message": "Order Executed Successfully!", "data": objOptChn.data });
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

exports.fnCloseLeg = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;
    let vOpenTransType = req.body.TransType;
    let vOptionType = req.body.OptionType;
    let vLotSize = Number(req.body.LotSize);
    let vLotQty = Number(req.body.LotQty);

    let vCloseSide = (vOpenTransType === "sell") ? "buy" : "sell";
    let vOrderSize = vLotQty;
    if(vOptionType === "F"){
        vOrderSize = vLotSize * vLotQty;
    }
    if(!Number.isFinite(vOrderSize) || vOrderSize <= 0){
        res.send({ "status": "warning", "message": "Invalid close quantity.", "data": "" });
        return;
    }

    try {
        let objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
            symbol: vSymbol,
            size: vOrderSize,
            side: vCloseSide,
            orderType: "market_order",
            limitPrice: 0,
            reduceOnly: true
        });

        if(objOrdRes.status !== "success"){
            res.send({ "status": objOrdRes.status, "message": objOrdRes.message, "data": objOrdRes.data });
            return;
        }

        let objOrd = objOrdRes.data.result;
        let vExecPx = fnGetExecPrice(objOrd, 0);

        res.send({
            "status": "success",
            "message": "Close Order Executed Successfully!",
            "data": {
                TradeID: objOrd.id,
                ClientOrderID: objOrd.client_order_id,
                Symbol: objOrd.product_symbol,
                TransType: objOrd.side,
                Qty: objOrd.size,
                State: objOrd.state,
                ClosePrice: vExecPx
            }
        });
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": "" });
    }
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

const fnGetSymbolDetails = async (pApiKey, pApiSecret, pUAssetSymbol, pTransType, pOptType, pLotSize, pLotQty, pPointsTP, pPointsSL) => {
    const objPromise = new Promise((resolve, reject) => {
        const vMethod = "GET";
        const vPath = '/v2/tickers/' + pUAssetSymbol;
        const vTimeStamp = Math.floor(new Date().getTime() / 1000);

        const vQueryStr = "";
        const vBody = "";
        const vSignature = fnGetSignature(pApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
        let config = {
            method: vMethod,
            maxBodyLength: Infinity,
            url: gBaseUrl + vPath + vQueryStr,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': pApiKey,
                'signature': vSignature,
                'timestamp': vTimeStamp
                }
            };

        axios.request(config)
        .then((objResult) => {
            let objRes = objResult.data;
            let vDate = new Date();
            const vRandNumb = getRandomIntInclusive(1, 1000);
            let vTradeId = vDate.valueOf() + vRandNumb;
            let vBestBuyPrice = parseFloat(objRes.result.quotes.best_ask);
            let vBestSellPrice = parseFloat(objRes.result.quotes.best_bid);
            let vRateTP, vRateSL = 0;
            let vLotSizeNum = parseFloat(pLotSize) || 0;
            let vLotQtyNum = parseFloat(pLotQty) || 0;
            let vFutDeltaAbs = vLotSizeNum * vLotQtyNum;
            let vFutDelta = vFutDeltaAbs;

            if(pTransType === "buy"){
                vRateTP = vBestBuyPrice + parseFloat(pPointsTP);
                vRateSL = vBestBuyPrice - parseFloat(pPointsSL);
                vFutDelta = vFutDeltaAbs;
            }
            else if(pTransType === "sell"){
                vRateTP = vBestSellPrice - parseFloat(pPointsTP);
                vRateSL = vBestSellPrice + parseFloat(pPointsSL);
                vFutDelta = -vFutDeltaAbs;
            }

            let objFutLeg = { TradeID : vTradeId, ProductID : objRes.result.product_id, UndrAsstSymb : objRes.result.underlying_asset_symbol, ContType : objRes.result.contract_type, TransType: pTransType, OptionType : pOptType, Delta : vFutDelta, DeltaC : vFutDelta, BestAsk : vBestBuyPrice, BestBid : vBestSellPrice, Strike : parseInt(objRes.result.spot_price), Symbol : objRes.result.symbol, LotSize : pLotSize, LotQty : parseFloat(pLotQty), PointsTP : parseFloat(pPointsTP), PointsSL : parseFloat(pPointsSL), RateTP : vRateTP, RateSL : vRateSL };

            resolve({ "status": "success", "message": "Best Buy and Sell Rates Feched!", "data": objFutLeg });
        })
        .catch((objError) => {
            console.log(objError);
            resolve({ "status": "danger", "message": "Error in Best Rates. Contact Administrator!", "data": objError });
        });

        // resolve({ "status": "success", "message": "Futures Data Fetched!", "data": "" });
    });

    return objPromise;
}

const fnGetExecPrice = (pOrderResult, pFallbackPrice) => {
    let vAvg = Number(pOrderResult?.average_fill_price);
    if(Number.isFinite(vAvg) && vAvg > 0){
        return vAvg;
    }
    let vLimit = Number(pOrderResult?.limit_price);
    if(Number.isFinite(vLimit) && vLimit > 0){
        return vLimit;
    }
    let vFallback = Number(pFallbackPrice);
    if(Number.isFinite(vFallback) && vFallback > 0){
        return vFallback;
    }
    return 0;
}

const fnPlaceLiveOrder = async (pApiKey, pApiSecret, pOrder) => {
    const objPromise = new Promise((resolve, reject) => {
        let vOrderSize = Number(pOrder.size);
        if(!Number.isFinite(vOrderSize) || vOrderSize <= 0){
            resolve({ "status": "warning", "message": "Invalid order size.", "data": "" });
            return;
        }

        let vOrderType = pOrder.orderType || "market_order";
        let vLimitPrice = Number(pOrder.limitPrice);
        if(!Number.isFinite(vLimitPrice) || vLimitPrice <= 0){
            vLimitPrice = 1;
        }
        if(vOrderType === "market_order"){
            vLimitPrice = 1;
        }

        let vClientOrderId = Date.now().toString() + getRandomIntInclusive(100, 999).toString();

        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Orders.placeOrder({
                order: {
                    product_symbol: pOrder.symbol,
                    size: vOrderSize,
                    side: pOrder.side,
                    limit_price: vLimitPrice,
                    order_type: vOrderType,
                    client_order_id: vClientOrderId,
                    reduce_only: !!pOrder.reduceOnly
                }
            }).then(function (response) {
                let objResult = JSON.parse(response.data);
                if(objResult.success){
                    resolve({ "status": "success", "message": "Order placed.", "data": objResult });
                }
                else{
                    resolve({ "status": "warning", "message": "Error to place order.", "data": objResult });
                }
            })
            .catch(function(objError) {
                let vErrMsg = objError?.response?.text || objError?.message || "Error placing order.";
                resolve({ "status": "danger", "message": vErrMsg, "data": objError });
            });
        });
    });

    return objPromise;
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
                console.log(objError);
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

const fnGetSrtdOptChnByRate = async (pApiKey, pApiSecret, pTransType, pOptType, pUAssetSymbol, pExpiry, pContractType, pDeltaNPos, pRateNPos) => {
    const objPromise = new Promise((resolve, reject) => {

        // console.log(pRateNPos);
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Products.getOptionChain({
                contract_types: pContractType, underlying_asset_symbols: pUAssetSymbol, expiry_date: pExpiry
            }).then(function (response) {
                let objResult = JSON.parse(response.data);
            	let objOCData = [];
            	let objOCSortData = [];

                if(objResult.success){
                    for(let i=0; i<objResult.result.length; i++){
                        let vDelta = parseFloat(objResult.result[i].greeks.delta);
                        let vPosDelta = (pTransType === "sell") ? (-1 * vDelta) : vDelta;
                        let vBestSellPrice = parseFloat(objResult.result[i].quotes.best_ask);
                        let vBestBuyPrice = parseFloat(objResult.result[i].quotes.best_bid);
                        if(vBestSellPrice >= parseFloat(pRateNPos)){
                            // console.log(objResult.result[i]);
                            let objOCLeg = { ProductID : objResult.result[i].product_id, UndrAsstSymb : objResult.result[i].underlying_asset_symbol, ContType : objResult.result[i].contract_type, OptionType : pOptType, Delta : vPosDelta, Gamma : parseFloat(objResult.result[i].greeks.gamma), Rho : parseFloat(objResult.result[i].greeks.rho), Theta : parseFloat(objResult.result[i].greeks.theta), Vega : parseFloat(objResult.result[i].greeks.vega), MarkIV : parseFloat(objResult.result[i].quotes.mark_iv), BestAsk : vBestSellPrice, BestBid : vBestBuyPrice, Strike : parseInt(objResult.result[i].strike_price), Symbol : objResult.result[i].symbol, Expiry : pExpiry };

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

const fnGetSrtdOptChnByDelta = async (pApiKey, pApiSecret,pTransType, pOptType, pUAssetSymbol, pLotSize, pExpiry, pLotQty, pContractType, pDeltaPos, vDeltaRePos, vDeltaTP, vDeltaSL) => {
    const objPromise = new Promise((resolve, reject) => {
        let vDate = new Date();
        const vRandNumb = getRandomIntInclusive(1, 1000);
        let vTradeId = vDate.valueOf() + vRandNumb;
    
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Products.getOptionChain({
                contract_types: pContractType, underlying_asset_symbols: pUAssetSymbol, expiry_date: pExpiry
            }).then(function (response) {
                let objResult = JSON.parse(response.data);
            	let objOCData = [];
            	let objOCSortData = [];
                let objOCNearestLeg = null;
                let vBestDeltaDiff = Number.POSITIVE_INFINITY;
                let vTargetDelta = parseFloat(pDeltaPos);
                if(!Number.isFinite(vTargetDelta)){
                    vTargetDelta = 0;
                }
                vTargetDelta = Math.abs(vTargetDelta);
                let objOCBestAskLeg = null;
                let vBestAsk = Number.POSITIVE_INFINITY;

                if(objResult.success){
                    for(let i=0; i<objResult.result.length; i++){
                        let vDelta = parseFloat(objResult.result[i].greeks.delta);
                        if(!Number.isFinite(vDelta)){
                            continue;
                        }
                        let vPosDelta = (pTransType === "sell") ? (-1 * vDelta) : vDelta;
                        let vAbsDelta = Math.abs(vDelta);
                        let vBestAskPx = parseFloat(objResult.result[i].quotes.best_ask);
                        let vBestBidPx = parseFloat(objResult.result[i].quotes.best_bid);
                        let objOCLeg = { TradeID : vTradeId, ProductID : objResult.result[i].product_id, UndrAsstSymb : objResult.result[i].underlying_asset_symbol, ContType : objResult.result[i].contract_type, TransType: pTransType, OptionType : pOptType, Delta : vPosDelta, DeltaC : vPosDelta, DeltaAbs : vAbsDelta, Gamma : parseFloat(objResult.result[i].greeks.gamma), GammaC : parseFloat(objResult.result[i].greeks.gamma), Theta : parseFloat(objResult.result[i].greeks.theta), ThetaC : parseFloat(objResult.result[i].greeks.theta), Vega : parseFloat(objResult.result[i].greeks.vega), VegaC : parseFloat(objResult.result[i].greeks.vega), BestAsk : vBestAskPx, BestBid : vBestBidPx, Strike : parseInt(objResult.result[i].strike_price), Symbol : objResult.result[i].symbol, Expiry : pExpiry, LotSize : pLotSize, LotQty : parseFloat(pLotQty), DeltaRePos : parseFloat(vDeltaRePos), DeltaTP : parseFloat(vDeltaTP), DeltaSL : parseFloat(vDeltaSL) };

                        if(Number.isFinite(vBestAskPx) && vBestAskPx < vBestAsk){
                            vBestAsk = vBestAskPx;
                            objOCBestAskLeg = objOCLeg;
                        }

                        let vDeltaDiff = Math.abs(vAbsDelta - vTargetDelta);
                        if(vDeltaDiff < vBestDeltaDiff){
                            vBestDeltaDiff = vDeltaDiff;
                            objOCNearestLeg = objOCLeg;
                        }

                        if(vAbsDelta <= vTargetDelta){
                            // console.log(objResult.result[i]);
                            //, Gamma : parseFloat(objResult.result[i].greeks.gamma), Rho : parseFloat(objResult.result[i].greeks.rho), Theta : parseFloat(objResult.result[i].greeks.theta), Vega : parseFloat(objResult.result[i].greeks.vega), MarkIV : parseFloat(objResult.result[i].quotes.mark_iv)

                            objOCData.push(objOCLeg);
                        }
                    }
                    if(objOCData.length > 0){
                        objOCSortData = objOCData.sort(fnSortRevByDelta);
                        resolve({ "status": "success", "message": "Option Chain Data Feched!", "data": objOCSortData[0] });
                    }
                    else if(objOCNearestLeg !== null){
                        resolve({ "status": "success", "message": "Nearest delta leg selected.", "data": objOCNearestLeg });
                    }
                    else if(objOCBestAskLeg !== null){
                        resolve({ "status": "success", "message": "Fallback best-ask leg selected.", "data": objOCBestAskLeg });
                    }
                    else{
                        resolve({ "status": "warning", "message": "No option chain leg found for requested expiry.", "data": "" });
                    }
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
    let vADeltaAbs = Number.isFinite(Number(a.DeltaAbs)) ? Number(a.DeltaAbs) : Math.abs(Number(a.Delta) || 0);
    let vBDeltaAbs = Number.isFinite(Number(b.DeltaAbs)) ? Number(b.DeltaAbs) : Math.abs(Number(b.Delta) || 0);
    return vBDeltaAbs - vADeltaAbs;
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

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
}
