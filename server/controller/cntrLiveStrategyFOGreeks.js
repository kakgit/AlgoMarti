
const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const gBaseUrl = 'https://api.india.delta.exchange';
const gFutLimitRetryMs = 5000;
const gOrderFillEpsilon = 0.0000001;
const gFutLimitMaxAttempts = 24;
const gFutPostOnlyOffsetPoints = 5;
const gFutModifyMaxAttempts = 5;
const gFutModifyRetryMs = 8000;
const gFutLoopAbortMap = {};
const gTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const gTelegramChatId = process.env.TELEGRAM_CHAT_ID || "";

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("LiveStrategyFOGreeks.ejs");
}

exports.fnValidateUserLogin = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;

    let objRetData1 = await fnGetUserWallet(vApiKey, vApiSecret);
    if(objRetData1.status === "success"){
        let objWallet = Array.isArray(objRetData1.data?.result) ? objRetData1.data.result : [];
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
    const objTgCfg = fnGetTelegramConfigFromReq(req);
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
            // Options are always executed as market orders for consistency.
            vOrderType = "market_order";
            let objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                symbol: objOptChn.data.Symbol,
                size: Number(vLotQty),
                side: vTransType,
                orderType: vOrderType,
                limitPrice: vLimitPrice,
                reduceOnly: false
            });

            if(objOrdRes.status !== "success"){
                fnSendTelegramAlert(`LiveStrategy2FO Option Open Failed\nType: ${vOptionType}\nSide: ${vTransType}\nOrder: ${vOrderType}\nReason: ${objOrdRes.message || objOrdRes.status}`, objTgCfg);
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
            fnSendTelegramAlert(`LiveStrategy2FO Option Opened\nSymbol: ${objOrd.product_symbol}\nType: ${vOptionType}\nSide: ${objOrd.side}\nQty: ${objOrd.size}\nExec: ${Number(vExecPx || 0).toFixed(2)}\nOrder: market_order`, objTgCfg);
            res.send({ "status": "success", "message": "Order Executed Successfully!", "data": objOptChn.data });
        }
        else{
            fnSendTelegramAlert(`LiveStrategy2FO Option Select Failed\nType: ${vOptionType}\nSide: ${vTransType}\nReason: ${objOptChn.message || "No option chain leg"}`, objTgCfg);
            res.send({ "status": "danger", "message": objOptChn.message, "data": "" });
        }
    }
    catch (error) {
            fnSendTelegramAlert(`LiveStrategy2FO Option Error\nType: ${vOptionType}\nSide: ${vTransType}\nReason: ${error.message || error}`, objTgCfg);
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
    const objTgCfg = fnGetTelegramConfigFromReq(req);
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
            // Delta futures `size` expects contract quantity, not base-notional.
            let vOrderSize = Number(vLotQty);
            let vLimitPrice = (vTransType === "buy") ? Number(objSybDet.data.BestAsk) : Number(objSybDet.data.BestBid);
            let objOrdRes = null;
            if(vOrderType === "limit_order"){
                const vLoopKey = fnGetFutLoopKey(vApiKey, objSybDet.data.Symbol, vTransType);
                gFutLoopAbortMap[vLoopKey] = false;
                objOrdRes = await fnPlaceFutPostOnlyLimitUntilFilled(vApiKey, vApiSecret, {
                    symbol: objSybDet.data.Symbol,
                    side: vTransType,
                    size: vOrderSize,
                    initialLimitPrice: vLimitPrice,
                    loopKey: vLoopKey,
                    alertCfg: objTgCfg
                });
                delete gFutLoopAbortMap[vLoopKey];
            }
            else{
                objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                    symbol: objSybDet.data.Symbol,
                    size: vOrderSize,
                    side: vTransType,
                    orderType: vOrderType,
                    limitPrice: vLimitPrice,
                    reduceOnly: false
                });
            }

            if(objOrdRes.status !== "success"){
                fnSendTelegramAlert(`LiveStrategy2FO Futures Open Failed\nSymbol: ${objSybDet.data.Symbol}\nSide: ${vTransType}\nOrder: ${vOrderType}\nReason: ${objOrdRes.message || objOrdRes.status}`, objTgCfg);
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
            fnSendTelegramAlert(`LiveStrategy2FO Futures Opened\nSymbol: ${objOrd.product_symbol}\nSide: ${objOrd.side}\nQty: ${objOrd.size}\nExec: ${Number(vExecPx || 0).toFixed(2)}\nOrder: ${vOrderType}`, objTgCfg);
            res.send({ "status": "success", "message": "Order Executed Successfully!", "data": objSybDet.data });
        }
        else{
            fnSendTelegramAlert(`LiveStrategy2FO Futures Select Failed\nSide: ${vTransType}\nReason: ${objSybDet.message || "No ticker data"}`, objTgCfg);
            res.send({ "status": "danger", "message": objSybDet.message, "data": "" });
        }
    }
    catch (error) {
            fnSendTelegramAlert(`LiveStrategy2FO Futures Error\nSide: ${vTransType}\nReason: ${error.message || error}`, objTgCfg);
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
    const objTgCfg = fnGetTelegramConfigFromReq(req);
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
            // Options are always executed as market orders for consistency.
            vOrderType = "market_order";
            let objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                symbol: objOptChn.data.Symbol,
                size: Number(vLotQty),
                side: vTransType,
                orderType: vOrderType,
                limitPrice: vLimitPrice,
                reduceOnly: false
            });

            if(objOrdRes.status !== "success"){
                fnSendTelegramAlert(`LiveStrategy2FO Option(Open by Rate) Failed\nType: ${vOptionType}\nSide: ${vTransType}\nReason: ${objOrdRes.message || objOrdRes.status}`, objTgCfg);
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
            fnSendTelegramAlert(`LiveStrategy2FO Option Opened (Rate)\nSymbol: ${objOrd.product_symbol}\nType: ${vOptionType}\nSide: ${objOrd.side}\nQty: ${objOrd.size}\nExec: ${Number(vExecPx || 0).toFixed(2)}\nOrder: market_order`, objTgCfg);
            res.send({ "status": "success", "message": "Order Executed Successfully!", "data": objOptChn.data });
        }
        else{
            fnSendTelegramAlert(`LiveStrategy2FO Option Select Failed (Rate)\nType: ${vOptionType}\nSide: ${vTransType}\nReason: ${objOptChn.message || "No option chain leg"}`, objTgCfg);
            res.send({ "status": "danger", "message": objOptChn.message, "data": "" });
        }
    }
    catch (error) {
            fnSendTelegramAlert(`LiveStrategy2FO Option Error (Rate)\nType: ${vOptionType}\nSide: ${vTransType}\nReason: ${error.message || error}`, objTgCfg);
            res.send({ "status": "danger", "message": error.message, "data": "" });
    }
    // res.send({ "status": "success", "message": "Option Chain Data Received Successfully!", "data": "" });
}

exports.fnAbortPendingFutOrders = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vSymbol = (req.body.Symbol || "").toString().trim();
    let vSide = (req.body.Side || "").toString().trim().toLowerCase();

    if(!vApiKey){
        res.send({ "status": "warning", "message": "ApiKey is required to abort pending loops.", "data": "" });
        return;
    }

    let vAborted = 0;
    Object.keys(gFutLoopAbortMap).forEach((vKey) => {
        if(vKey.startsWith(vApiKey + "|")){
            if(vSymbol && !vKey.includes("|" + vSymbol + "|")){
                return;
            }
            if(vSide && !vKey.endsWith("|" + vSide)){
                return;
            }
            gFutLoopAbortMap[vKey] = true;
            vAborted += 1;
        }
    });

    res.send({ "status": "success", "message": "Abort signal sent to pending futures loops.", "data": { aborted: vAborted } });
}

exports.fnSendTelegramAlertMsg = async (req, res) => {
    try{
        const objTgCfg = fnGetTelegramConfigFromReq(req);
        const vMsg = String(req.body.Message || "").trim();
        if(!vMsg){
            res.send({ "status": "warning", "message": "Message is required.", "data": "" });
            return;
        }

        const bSent = await fnSendTelegramAlert(vMsg, objTgCfg);
        if(bSent){
            res.send({ "status": "success", "message": "Telegram alert sent.", "data": "" });
            return;
        }
        res.send({ "status": "warning", "message": "Telegram not configured (token/chat id missing).", "data": "" });
    }
    catch(error){
        res.send({ "status": "danger", "message": error.message || "Error sending Telegram alert.", "data": error });
    }
}

exports.fnCloseLeg = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;
    let vOpenTransType = req.body.TransType;
    let vOptionType = req.body.OptionType;
    let vLotSize = Number(req.body.LotSize);
    let vLotQty = Number(req.body.LotQty);
    let vReqOrderType = (req.body.OrderType || "market_order").toString();

    let vCloseSide = (vOpenTransType === "sell") ? "buy" : "sell";
    let vOrderSize = vLotQty;
    if(vOptionType === "F"){
        // Close futures by contracts (`LotQty`) for schema compatibility.
        vOrderSize = vLotQty;
    }
    if(!Number.isFinite(vOrderSize) || vOrderSize <= 0){
        res.send({ "status": "warning", "message": "Invalid close quantity.", "data": "" });
        return;
    }

    try {
        let objOrdRes = null;
        if(vOptionType === "F" && vReqOrderType === "limit_order"){
            let vLimitPrice = 0;
            let objTicker = await fnGetTickerBySymbol(vSymbol);
            if(objTicker.status === "success"){
                let objQ = objTicker?.data?.result?.quotes || {};
                vLimitPrice = (vCloseSide === "buy") ? Number(objQ.best_ask) : Number(objQ.best_bid);
            }
            if(!(vLimitPrice > 0)){
                vLimitPrice = 1;
            }

            objOrdRes = await fnPlaceFutPostOnlyLimitUntilFilled(vApiKey, vApiSecret, {
                symbol: vSymbol,
                side: vCloseSide,
                size: vOrderSize,
                initialLimitPrice: vLimitPrice,
                loopKey: fnGetFutLoopKey(vApiKey, vSymbol, vCloseSide + "_close"),
                reduceOnly: true
            });
        }
        else{
            objOrdRes = await fnPlaceLiveOrder(vApiKey, vApiSecret, {
                symbol: vSymbol,
                size: vOrderSize,
                side: vCloseSide,
                orderType: "market_order",
                limitPrice: 0,
                reduceOnly: true
            });
        }

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
        res.send({ "status": "danger", "message": "Error in Best Rates. Contact Administrator!", "data": objError });
    });
    // res.send({ "status": "success", "message": "Current Rate Information Feched!", "data": "" });
}

exports.fnGetLiveOpenPositions = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;

    if(!vApiKey || !vApiSecret){
        res.send({ "status": "warning", "message": "API credentials are required.", "data": [] });
        return;
    }

    try {
        let objRetData = await fnGetOpenPositions(vApiKey, vApiSecret);
        if(objRetData.status !== "success"){
            res.send({ "status": objRetData.status, "message": objRetData.message, "data": [] });
            return;
        }

        let objOpenPos = Array.isArray(objRetData.data?.result) ? objRetData.data.result : [];
        if(objOpenPos.length === 0){
            res.send({ "status": "success", "message": "No open positions.", "data": [] });
            return;
        }

        let objTickerRows = await Promise.all(objOpenPos.map(async (objPos) => {
            let vSymbol = objPos?.product_symbol || objPos?.symbol || "";
            let objTicker = await fnGetTickerBySymbol(vSymbol);
            let objTResult = objTicker?.data?.result || {};
            let vSizeRaw = Number(objPos?.size);
            let vQty = Number.isFinite(vSizeRaw) ? Math.abs(vSizeRaw) : Number(objPos?.size || 0);
            let vSide = (objPos?.side || "").toString().toLowerCase();
            if(vSide !== "buy" && vSide !== "sell"){
                vSide = (Number(vSizeRaw) < 0) ? "sell" : "buy";
            }

            let vContractType = objTResult?.contract_type || objPos?.contract_type || "";
            let vOptionType = "F";
            if(vContractType === "call_options"){
                vOptionType = "C";
            }
            else if(vContractType === "put_options"){
                vOptionType = "P";
            }

            return {
                PositionID: objPos?.id || (Date.now().toString() + getRandomIntInclusive(100, 999).toString()),
                ProductID: objPos?.product_id || objTResult?.product_id || 0,
                Symbol: vSymbol,
                UndrAsstSymb: objTResult?.underlying_asset_symbol || objPos?.underlying_asset_symbol || "",
                ContType: vContractType,
                OptionType: vOptionType,
                TransType: vSide,
                Qty: Number.isFinite(vQty) ? vQty : 0,
                EntryPrice: Number(objPos?.entry_price || 0),
                MarkPrice: Number(objPos?.mark_price || 0),
                BestAsk: Number(objTResult?.quotes?.best_ask || 0),
                BestBid: Number(objTResult?.quotes?.best_bid || 0),
                Strike: Number(objTResult?.strike_price || 0),
                Expiry: objTResult?.expiry_date || "",
                Delta: Number(objTResult?.greeks?.delta || 0),
                Gamma: Number(objTResult?.greeks?.gamma || 0),
                Theta: Number(objTResult?.greeks?.theta || 0),
                Vega: Number(objTResult?.greeks?.vega || 0),
                UnrealizedPnL: Number(objPos?.unrealized_pnl || 0)
            };
        }));

        res.send({ "status": "success", "message": "Open positions fetched.", "data": objTickerRows });
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": [] });
    }
}

exports.fnGetFilledOrderHistory = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vStartDT = Number(req.body.StartDT);
    let vEndDT = Number(req.body.EndDT);

    if(!vApiKey || !vApiSecret){
        res.send({ "status": "warning", "message": "API credentials are required.", "data": [] });
        return;
    }

    if(!Number.isFinite(vStartDT) || vStartDT <= 0){
        vStartDT = Date.now() - (30 * 24 * 60 * 60 * 1000);
    }
    if(!Number.isFinite(vEndDT) || vEndDT <= 0){
        vEndDT = Date.now();
    }
    if(vEndDT < vStartDT){
        let vTmp = vEndDT;
        vEndDT = vStartDT;
        vStartDT = vTmp;
    }

    vStartDT = fnNormalizeOrderHistoryTs(vStartDT);
    vEndDT = fnNormalizeOrderHistoryTs(vEndDT);

    try{
        let objRetData = await fnGetOrderHistory(vApiKey, vApiSecret, vStartDT, vEndDT);
        if(objRetData.status !== "success"){
            res.send({ "status": objRetData.status, "message": objRetData.message, "data": objRetData.data });
            return;
        }

        let objRows = Array.isArray(objRetData.data?.result) ? objRetData.data.result : [];
        let objFilledRows = objRows.filter((objOrd) => {
            let vState = (objOrd?.state || "").toString().toLowerCase();
            return (vState === "filled" || vState === "closed");
        });

        res.send({ "status": "success", "message": "Filled order history fetched.", "data": objFilledRows });
    }
    catch(error){
        res.send({ "status": "danger", "message": error.message, "data": error });
    }
}

const fnGetSymbolDetails = async (pApiKey, pApiSecret, pUAssetSymbol, pTransType, pOptType, pLotSize, pLotQty, pPointsTP, pPointsSL) => {
    const objPromise = new Promise((resolve, reject) => {
        // Construct the symbol based on option type
        let vSymbol = pUAssetSymbol;
        let vQueryStr = "";
        if (pOptType !== "C" && pOptType !== "P") {
            // For futures, use the futures symbol format and contract type
            vSymbol = pUAssetSymbol + "USD";
            vQueryStr = "?contract_type=perpetual_futures";
        }
        
        const vMethod = "GET";
        const vPath = '/v2/tickers/' + vSymbol;
        const vTimeStamp = Math.floor(new Date().getTime() / 1000);
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
            // For futures hedging: 1 contract = 1.0 delta (or -1.0 for short)
            // LotQty represents the number of contracts, so delta = ±1.0 per contract
            let vFutDelta = 0;

            if(pTransType === "buy"){
                vRateTP = vBestBuyPrice + parseFloat(pPointsTP);
                vRateSL = vBestBuyPrice - parseFloat(pPointsSL);
                vFutDelta = 1.0;  // BUY futures = +1.0 delta per contract
            }
            else if(pTransType === "sell"){
                vRateTP = vBestSellPrice - parseFloat(pPointsTP);
                vRateSL = vBestSellPrice + parseFloat(pPointsSL);
                vFutDelta = -1.0;  // SELL futures = -1.0 delta per contract
            }

            let objFutLeg = { TradeID : vTradeId, ProductID : objRes.result.product_id, UndrAsstSymb : objRes.result.underlying_asset_symbol, ContType : objRes.result.contract_type, TransType: pTransType, OptionType : pOptType, Delta : vFutDelta, DeltaC : vFutDelta, BestAsk : vBestBuyPrice, BestBid : vBestSellPrice, Strike : parseInt(objRes.result.spot_price), Symbol : objRes.result.symbol, LotSize : pLotSize, LotQty : parseFloat(pLotQty), PointsTP : parseFloat(pPointsTP), PointsSL : parseFloat(pPointsSL), RateTP : vRateTP, RateSL : vRateSL };

            resolve({ "status": "success", "message": "Best Buy and Sell Rates Feched!", "data": objFutLeg });
        })
        .catch((objError) => {
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

const fnGetTickerBySymbol = async (pSymbol) => {
    const objPromise = new Promise((resolve, reject) => {
        if(!pSymbol){
            resolve({ "status": "warning", "message": "Symbol missing.", "data": {} });
            return;
        }

        axios.get(gBaseUrl + "/v2/tickers/" + pSymbol)
        .then((objResult) => {
            resolve({ "status": "success", "message": "Ticker fetched.", "data": objResult.data });
        })
        .catch((objError) => {
            resolve({ "status": "warning", "message": "Ticker fetch failed.", "data": {} });
        });
    });

    return objPromise;
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
            const objOrder = {
                product_symbol: pOrder.symbol,
                size: vOrderSize,
                side: pOrder.side,
                limit_price: vLimitPrice,
                order_type: vOrderType,
                client_order_id: vClientOrderId,
                reduce_only: !!pOrder.reduceOnly
            };
            if(vOrderType === "limit_order" && !!pOrder.postOnly){
                objOrder.post_only = true;
            }
            client.apis.Orders.placeOrder({
                order: objOrder
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

const fnPlaceFutPostOnlyLimitUntilFilled = async (pApiKey, pApiSecret, pInput) => {
    let vRequestedQty = Number(pInput?.size);
    if(!Number.isFinite(vRequestedQty) || vRequestedQty <= 0){
        return { "status": "warning", "message": "Invalid futures quantity.", "data": "" };
    }

    const vSymbol = pInput?.symbol || "";
    const vSide = (pInput?.side || "").toString().toLowerCase();
    if(!vSymbol || (vSide !== "buy" && vSide !== "sell")){
        return { "status": "warning", "message": "Invalid futures order side/symbol.", "data": "" };
    }

    let vFilledTotal = 0;
    let vNotionalFilled = 0;
    let vCommissionTotal = 0;
    let vLastOrder = null;
    let vLastKnownLimit = Number(pInput?.initialLimitPrice);
    let vAttempt = 0;
    const vLoopKey = pInput?.loopKey || fnGetFutLoopKey(pApiKey, vSymbol, vSide);
    const vRemainingQty = Number((vRequestedQty - vFilledTotal).toFixed(8));
    if(vRemainingQty <= gOrderFillEpsilon){
        return { "status": "warning", "message": "Nothing left to execute.", "data": "" };
    }

    // Place initial post-only order; retry only until an order-id is created.
    let objOrder = null;
    let vOrderId = 0;
    while(vAttempt < gFutLimitMaxAttempts){
        if(gFutLoopAbortMap[vLoopKey] === true){
            return {
                "status": "warning",
                "message": "Futures post-only loop aborted by user action.",
                "data": {
                    requested_qty: vRequestedQty,
                    filled_qty: vFilledTotal,
                    remaining_qty: Number((vRequestedQty - vFilledTotal).toFixed(8)),
                    last_order: vLastOrder
                }
            };
        }

        const objTicker = await fnGetTickerBySymbol(vSymbol);
        if(objTicker.status === "success"){
            const objQ = objTicker?.data?.result?.quotes || {};
            const vFreshPx = fnGetPostOnlyMakerPrice(objQ, vSide, vLastKnownLimit);
            if(Number.isFinite(vFreshPx) && vFreshPx > 0){
                vLastKnownLimit = vFreshPx;
            }
        }
        if(!Number.isFinite(vLastKnownLimit) || vLastKnownLimit <= 0){
            return { "status": "warning", "message": "Unable to fetch valid limit price for futures.", "data": "" };
        }

        const objPlace = await fnPlaceLiveOrder(pApiKey, pApiSecret, {
            symbol: vSymbol,
            size: vRemainingQty,
            side: vSide,
            orderType: "limit_order",
            limitPrice: vLastKnownLimit,
            reduceOnly: !!pInput?.reduceOnly,
            postOnly: true
        });
        if(objPlace.status === "success"){
            objOrder = objPlace?.data?.result || {};
            vLastOrder = objOrder;
            vOrderId = Number(objOrder?.id);
            if(Number.isFinite(vOrderId) && vOrderId > 0){
                break;
            }
            return { "status": "warning", "message": "Order placed but missing order id.", "data": objPlace.data };
        }
        if(!fnIsPostOnlyImmediateExecError(objPlace)){
            return { "status": objPlace.status, "message": objPlace.message, "data": objPlace.data };
        }
        vAttempt += 1;
        await fnSleep(gFutModifyRetryMs);
    }

    if(!(Number.isFinite(vOrderId) && vOrderId > 0)){
        return { "status": "warning", "message": "Unable to place post-only order after retries.", "data": "" };
    }

    let vAccountedFillQty = 0;
    let vModifyCount = 0;
    while(vModifyCount <= gFutModifyMaxAttempts){
        if(gFutLoopAbortMap[vLoopKey] === true){
            return {
                "status": "warning",
                "message": "Futures post-only loop aborted by user action.",
                "data": {
                    requested_qty: vRequestedQty,
                    filled_qty: vFilledTotal + vAccountedFillQty,
                    remaining_qty: Number((vRequestedQty - (vFilledTotal + vAccountedFillQty)).toFixed(8)),
                    last_order: vLastOrder
                }
            };
        }

        await fnSleep(gFutModifyRetryMs);
        let objDetRes = await fnGetOrderDetailsById(pApiKey, pApiSecret, vOrderId);
        if(objDetRes.status === "success"){
            objOrder = objDetRes.data;
            vLastOrder = objOrder;
        }

        let objFill = fnGetFillFromOrder(objOrder || {}, vRemainingQty);
        if(objFill.filledQty > vAccountedFillQty){
            const vDeltaFill = objFill.filledQty - vAccountedFillQty;
            const vExecPx = fnGetExecPrice(objOrder || {}, vLastKnownLimit);
            vAccountedFillQty = objFill.filledQty;
            vNotionalFilled += (vDeltaFill * vExecPx);
            vCommissionTotal += Number(objOrder?.paid_commission || 0);
        }

        if(objFill.isFullyFilled || objFill.isClosed){
            break;
        }

        if(vModifyCount >= gFutModifyMaxAttempts){
            break;
        }

        const objModTicker = await fnGetTickerBySymbol(vSymbol);
        if(objModTicker.status === "success"){
            const objMQ = objModTicker?.data?.result?.quotes || {};
            const vModPx = fnGetPostOnlyMakerPrice(objMQ, vSide, vLastKnownLimit);
            if(Number.isFinite(vModPx) && vModPx > 0){
                vLastKnownLimit = vModPx;
                await fnModifyLiveOrder(pApiKey, pApiSecret, {
                    orderId: vOrderId,
                    symbol: vSymbol,
                    size: Number((vRemainingQty - vAccountedFillQty).toFixed(8)),
                    limitPrice: vLastKnownLimit,
                    postOnly: true
                });
            }
        }
        vModifyCount += 1;
    }

    vFilledTotal += vAccountedFillQty;

    // If still not fully filled after 5 modifies, close pending limit and execute market for remainder.
    let vMarketRemain = Number((vRequestedQty - vFilledTotal).toFixed(8));
    if(vMarketRemain > gOrderFillEpsilon){
        if(Number.isFinite(vOrderId) && vOrderId > 0){
            await fnCancelLiveOrder(pApiKey, pApiSecret, vOrderId, vSymbol);
        }

        const objMkt = await fnPlaceLiveOrder(pApiKey, pApiSecret, {
            symbol: vSymbol,
            size: vMarketRemain,
            side: vSide,
            orderType: "market_order",
            limitPrice: 0,
            reduceOnly: !!pInput?.reduceOnly
        });
        if(objMkt.status !== "success"){
            fnSendTelegramAlert(`LiveStrategy2FO Futures Market Fallback Failed\nSymbol: ${vSymbol}\nSide: ${vSide}\nRemainQty: ${vMarketRemain}\nReason: ${objMkt.message || objMkt.status}`, pInput?.alertCfg);
            return { "status": objMkt.status, "message": "Limit not filled after modifies and market fallback failed: " + objMkt.message, "data": objMkt.data };
        }

        let objMktOrd = objMkt?.data?.result || {};
        fnSendTelegramAlert(`LiveStrategy2FO Futures Market Fallback\nSymbol: ${objMktOrd.product_symbol || vSymbol}\nSide: ${objMktOrd.side || vSide}\nQty: ${objMktOrd.size || vMarketRemain}\nReason: Limit not filled after ${gFutModifyMaxAttempts} modifies`, pInput?.alertCfg);
        let objMktFill = fnGetFillFromOrder(objMktOrd, vMarketRemain);
        let vMktFilled = objMktFill.filledQty;
        if(vMktFilled <= gOrderFillEpsilon){
            if(String(objMktOrd?.state || "").toLowerCase() === "closed"){
                vMktFilled = vMarketRemain;
            }
        }
        if(vMktFilled > gOrderFillEpsilon){
            const vMktPx = fnGetExecPrice(objMktOrd, vLastKnownLimit);
            vFilledTotal += vMktFilled;
            vNotionalFilled += (vMktFilled * vMktPx);
            vCommissionTotal += Number(objMktOrd?.paid_commission || 0);
            vLastOrder = objMktOrd;
        }
    }

    if((vRequestedQty - vFilledTotal) > gOrderFillEpsilon){
        return {
            "status": "warning",
            "message": "Futures order partially filled after modify attempts and market fallback.",
            "data": {
                requested_qty: vRequestedQty,
                filled_qty: vFilledTotal,
                remaining_qty: Number((vRequestedQty - vFilledTotal).toFixed(8)),
                last_order: vLastOrder
            }
        };
    }

    const vAvgExecPx = (vFilledTotal > gOrderFillEpsilon) ? (vNotionalFilled / vFilledTotal) : fnGetExecPrice(vLastOrder, vLastKnownLimit);
    const objFinal = {
        id: vLastOrder?.id,
        client_order_id: vLastOrder?.client_order_id,
        product_id: vLastOrder?.product_id,
        product_symbol: vLastOrder?.product_symbol || vSymbol,
        side: vLastOrder?.side || vSide,
        size: vRequestedQty,
        filled_size: vRequestedQty,
        unfilled_size: 0,
        state: "closed",
        average_fill_price: vAvgExecPx,
        limit_price: vLastOrder?.limit_price || vLastKnownLimit,
        paid_commission: vCommissionTotal
    };

    return {
        "status": "success",
        "message": "Futures post-only limit order fully executed.",
        "data": { success: true, result: objFinal }
    };
}

const fnGetOrderDetailsById = async (pApiKey, pApiSecret, pOrderId) => {
    const vOrderId = Number(pOrderId);
    if(!Number.isFinite(vOrderId) || vOrderId <= 0){
        return { "status": "warning", "message": "Invalid order id for details.", "data": "" };
    }

    const vMethod = "GET";
    const vPath = "/v2/orders/" + Math.trunc(vOrderId).toString();
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);
    const vQueryStr = "";
    const vBody = "";
    const vSignature = fnGetSignature(pApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);

    try{
        const objResp = await axios.request({
            method: vMethod,
            url: gBaseUrl + vPath,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": pApiKey,
                "signature": vSignature,
                "timestamp": vTimeStamp
            }
        });

        const objResult = objResp.data || {};
        if(objResult.success){
            return { "status": "success", "message": "Order details fetched.", "data": objResult.result || {} };
        }
        return { "status": "warning", "message": "Unable to fetch order details.", "data": objResult };
    }
    catch(objError){
        return { "status": "danger", "message": objError?.response?.data || objError.message, "data": objError };
    }
}

const fnCancelLiveOrder = async (pApiKey, pApiSecret, pOrderId, pSymbol) => {
    const vOrderId = Number(pOrderId);
    if(!Number.isFinite(vOrderId) || vOrderId <= 0 || !pSymbol){
        return { "status": "warning", "message": "Invalid order cancel input.", "data": "" };
    }

    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.Orders.cancelOrder({
                order: {
                    id: Math.trunc(vOrderId),
                    product_symbol: pSymbol
                }
            }).then(function (response) {
                let objResult = JSON.parse(response.data);
                if(objResult.success){
                    resolve({ "status": "success", "message": "Order cancelled.", "data": objResult });
                }
                else{
                    resolve({ "status": "warning", "message": "Unable to cancel open order.", "data": objResult });
                }
            })
            .catch(function(objError) {
                const vErrCode = objError?.response?.body?.error?.code || objError?.response?.obj?.error?.code || objError?.response?.data?.error?.code || "";
                if(vErrCode === "open_order_not_found"){
                    resolve({ "status": "success", "message": "Order already closed/cancelled.", "data": { success: true, ignored: true } });
                    return;
                }
                resolve({ "status": "danger", "message": objError?.response?.text || objError?.message || "Cancel order failed.", "data": objError });
            });
        });
    });

    return objPromise;
}

const fnModifyLiveOrder = async (pApiKey, pApiSecret, pOrder) => {
    const vOrderId = Number(pOrder?.orderId);
    const vSize = Number(pOrder?.size);
    const vLimitPrice = Number(pOrder?.limitPrice);
    const vSymbol = pOrder?.symbol || "";

    if(!Number.isFinite(vOrderId) || vOrderId <= 0 || !vSymbol || !Number.isFinite(vSize) || vSize <= 0 || !Number.isFinite(vLimitPrice) || vLimitPrice <= 0){
        return { "status": "warning", "message": "Invalid modify order input.", "data": "" };
    }

    try{
        const vMethod = "PUT";
        const vPath = "/v2/orders";
        const vTimeStamp = Math.floor(new Date().getTime() / 1000);
        const objBody = {
            id: Math.trunc(vOrderId),
            product_symbol: vSymbol,
            size: vSize,
            limit_price: vLimitPrice.toString()
        };
        if(!!pOrder?.postOnly){
            objBody.post_only = true;
        }

        const vBody = JSON.stringify(objBody);
        const vSignature = fnGetSignature(pApiSecret, vMethod, vPath, "", vTimeStamp, vBody);
        const objResp = await axios.request({
            method: vMethod,
            url: gBaseUrl + vPath,
            data: vBody,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "api-key": pApiKey,
                "signature": vSignature,
                "timestamp": vTimeStamp
            }
        });

        let objResult = objResp.data || {};
        if(objResult.success){
            return { "status": "success", "message": "Order modified.", "data": objResult };
        }
        return { "status": "warning", "message": "Unable to modify order.", "data": objResult };
    }
    catch(objError){
        const vErrCode = objError?.response?.body?.error?.code || objError?.response?.obj?.error?.code || objError?.response?.data?.error?.code || "";
        if(vErrCode === "open_order_not_found"){
            return { "status": "success", "message": "Order already closed/cancelled.", "data": { success: true, ignored: true, error_code: vErrCode } };
        }
        let vErrMsg = objError?.response?.text || objError?.message || "Modify order failed.";
        return { "status": "danger", "message": vErrMsg, "data": objError };
    }
}

const fnGetFillFromOrder = (pOrder, pReqQty) => {
    const vReqQty = Number(pReqQty);
    const vFilledRaw = Number(pOrder?.filled_size ?? pOrder?.executed_size ?? NaN);
    const vRemaining = Number(pOrder?.unfilled_size ?? pOrder?.remaining_size ?? NaN);
    const vOrderSize = Number(pOrder?.size ?? NaN);
    const vAvgFillPx = Number(pOrder?.average_fill_price ?? NaN);
    const vState = String(pOrder?.state || "").toLowerCase();
    const bClosedState = (vState === "closed" || vState === "filled" || vState === "completed" || vState === "executed" || vState === "cancelled");
    const bOpenState = (vState === "open");

    let vFilledQty = Number.isFinite(vFilledRaw) ? Math.max(0, vFilledRaw) : 0;

    // Some Delta responses may omit filled_size even when order is closed+executed.
    // In that case, infer fill from order size if fill price exists.
    if(vFilledQty <= gOrderFillEpsilon && bClosedState && Number.isFinite(vAvgFillPx) && vAvgFillPx > 0){
        if(Number.isFinite(vOrderSize) && vOrderSize > 0){
            vFilledQty = vOrderSize;
        }
        else if(Number.isFinite(vReqQty) && vReqQty > 0){
            vFilledQty = vReqQty;
        }
    }

    if(Number.isFinite(vReqQty) && vReqQty > 0){
        vFilledQty = Math.min(vReqQty, vFilledQty);
    }

    let bFullyFilled = false;
    if(Number.isFinite(vReqQty) && vReqQty > 0){
        bFullyFilled = (vFilledQty >= (vReqQty - gOrderFillEpsilon));
        if(!bFullyFilled && Number.isFinite(vRemaining)){
            bFullyFilled = (vRemaining <= gOrderFillEpsilon) && (vFilledQty > gOrderFillEpsilon);
        }
        if(!bFullyFilled && bClosedState && vFilledQty > 0 && !Number.isFinite(vRemaining)){
            bFullyFilled = (vFilledQty >= (vReqQty - gOrderFillEpsilon));
        }
    }

    return {
        filledQty: vFilledQty,
        isOpen: bOpenState,
        isClosed: bClosedState,
        isFullyFilled: bFullyFilled
    };
}

const fnGetPostOnlyMakerPrice = (pQuotes, pSide, pFallbackPx) => {
    let vBestBid = Number(pQuotes?.best_bid);
    let vBestAsk = Number(pQuotes?.best_ask);
    let vFallback = Number(pFallbackPx);
    let vStepBase = Number.isFinite(vBestAsk) && vBestAsk > 0 ? vBestAsk : (Number.isFinite(vBestBid) && vBestBid > 0 ? vBestBid : vFallback);
    let vStep = fnInferPriceStep(vStepBase);
    if(!(vStep > 0)){
        vStep = 1;
    }

    if(pSide === "buy"){
        let vPx = Number.isFinite(vBestBid) && vBestBid > 0 ? (vBestBid - gFutPostOnlyOffsetPoints) : (Number.isFinite(vFallback) && vFallback > 0 ? (vFallback - gFutPostOnlyOffsetPoints) : 0);
        if(Number.isFinite(vBestAsk) && vBestAsk > 0 && vPx >= vBestAsk){
            vPx = vBestAsk - vStep;
        }
        if(!(vPx > 0) && Number.isFinite(vFallback) && vFallback > 0){
            vPx = Math.max(vFallback - vStep, vStep);
        }
        return vPx;
    }

    let vPx = Number.isFinite(vBestAsk) && vBestAsk > 0 ? (vBestAsk + gFutPostOnlyOffsetPoints) : (Number.isFinite(vFallback) && vFallback > 0 ? (vFallback + gFutPostOnlyOffsetPoints) : 0);
    if(Number.isFinite(vBestBid) && vBestBid > 0 && vPx <= vBestBid){
        vPx = vBestBid + vStep;
    }
    if(!(vPx > 0) && Number.isFinite(vFallback) && vFallback > 0){
        vPx = vFallback + vStep;
    }
    return vPx;
}

const fnInferPriceStep = (pPrice) => {
    let vPx = Number(pPrice);
    if(!Number.isFinite(vPx) || vPx <= 0){
        return 0.5;
    }
    let vTxt = String(vPx);
    if(vTxt.includes("e") || vTxt.includes("E")){
        return 0.5;
    }
    let vParts = vTxt.split(".");
    if(vParts.length < 2){
        return 1;
    }
    let vDec = vParts[1].replace(/0+$/, "").length;
    if(vDec <= 0){
        return 1;
    }
    return Math.pow(10, -Math.min(vDec, 6));
}

const fnIsPostOnlyImmediateExecError = (pRes) => {
    let vMsg = String(pRes?.message || "").toLowerCase();
    if(vMsg.includes("immediate_execution_post_only")){
        return true;
    }
    let vText = String(pRes?.data?.response?.text || "").toLowerCase();
    return vText.includes("immediate_execution_post_only");
}

const fnSendTelegramAlert = async (pText, pCfg) => {
    try{
        const vBotToken = (pCfg?.botToken || gTelegramBotToken || "").trim();
        const vChatId = (pCfg?.chatId || gTelegramChatId || "").trim();
        if(!vBotToken || !vChatId){
            return false;
        }
        const vText = String(pText || "").trim();
        if(!vText){
            return false;
        }
        await axios.post(`https://api.telegram.org/bot${vBotToken}/sendMessage`, {
            chat_id: vChatId,
            text: vText
        }, { timeout: 5000 });
        return true;
    }
    catch(objErr){
        // silent: alerts must not block trade execution path
        return false;
    }
}

const fnGetTelegramConfigFromReq = (req) => {
    return {
        botToken: String(req?.body?.TelegramBotToken || "").trim(),
        chatId: String(req?.body?.TelegramChatId || "").trim()
    };
}

const fnGetFutLoopKey = (pApiKey, pSymbol, pSide) => {
    return `${(pApiKey || "").toString()}|${(pSymbol || "").toString()}|${(pSide || "").toString()}`;
}

const fnSleep = (pMs) => {
    return new Promise((resolve) => setTimeout(resolve, pMs));
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
                resolve({ "status": "danger", "message": "Error At User Login! Catch.", "data": objError });
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
                    resolve({ "status": "success", "message": "Open positions fetched.", "data": objResult });
                }
                else{
                    resolve({ "status": "warning", "message": "Error while fetching open positions.", "data": objResult });
                }
            })
            .catch(function(objError) {
                resolve({ "status": "danger", "message": "Error at get open positions.", "data": objError });
            });
        });
    });
    return objPromise;
}

const fnGetOrderHistory = async (pApiKey, pApiSecret, pStartDT, pEndDT) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pApiSecret).then(client => {
            client.apis.TradeHistory.getOrderHistory({ start_time: pStartDT, end_time: pEndDT, page_size: 100 }).then(function (response) {
                let objResult = JSON.parse(response.data.toString());
                if(objResult.success){
                    resolve({ "status": "success", "message": "Order history fetched.", "data": objResult });
                }
                else{
                    resolve({ "status": "warning", "message": "Error while fetching order history.", "data": objResult });
                }
            })
            .catch(function(objError) {
                resolve({ "status": "danger", "message": "Error at order history.", "data": objError });
            });
        });
    });
    return objPromise;
}

const fnNormalizeOrderHistoryTs = (pVal) => {
    let vTs = Number(pVal);
    if(!Number.isFinite(vTs) || vTs <= 0){
        return 0;
    }
    // Delta history APIs in this project use microseconds.
    if(vTs < 1000000000000000){
        return Math.trunc(vTs * 1000);
    }
    return Math.trunc(vTs);
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

