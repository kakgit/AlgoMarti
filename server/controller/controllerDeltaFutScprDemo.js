const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

// Demo account credentials should be configured via environment variables only.
const gBaseUrl = 'https://api.india.delta.exchange';
const gApiKey = process.env.DELTA_DEMO_API_KEY || "";
const gApiSecret = process.env.DELTA_DEMO_API_SECRET || "";
const gTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const gTelegramChatId = process.env.TELEGRAM_CHAT_ID || "";

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("DeltaFutScprDemo.ejs");
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
            console.log("Error At Fut User Login Catch");
            res.send({ "status": "danger", "message": "Error At User Login! Catch.", "data": objError });
        });
    });
}

exports.fnHistoricalOHLCAPI = async (req, res) => {
    let vCandleMinutes = req.body.CandleMinutes;
    let vSymbol = (req.body.Symbol || "BTCUSD").toString().toUpperCase();
    let vLookbackCandles = Number(req.body.LookbackCandles);
    if(!Number.isFinite(vLookbackCandles) || vLookbackCandles < 1){
        vLookbackCandles = 1;
    }
    vLookbackCandles = Math.min(Math.floor(vLookbackCandles), 500);

    if(!["BTCUSD", "ETHUSD"].includes(vSymbol)){
        res.send({ "status": "warning", "message": "Unsupported symbol for OHLC request.", "data": "" });
        return;
    }

    const vNow = new Date();
    const vRoundedTime = fnRoundTimeToNearestXMinutes(vNow, vCandleMinutes);
    let vEndTime = ((vRoundedTime.valueOf())/1000) - 60;
    let vStartTime = vEndTime - (vCandleMinutes * 60 * vLookbackCandles);
    // console.log("Rounded Time (nearest 5 minutes):", vEndTime);

    const vMethod = "GET";
    const vPath = '/v2/history/candles';
    const vQueryStr = "?resolution=" + vCandleMinutes + "m&symbol=" + vSymbol + "&start="+ vStartTime +"&end=" + vEndTime;
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
        };

      axios.request(config)
      .then((objResult) => {
        let objRes = JSON.stringify(objResult.data);
        // console.log(objRes);
        res.send({ "status": "success", "message": "OHLC Information Feched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error in OHLC. Contact Administrator!", "data": objError });
    });
    // res.send({ "status": "success", "message": "OHLC Information Feched!", "data": "" });
}

exports.fnGetCurrBuySellRates = async (req, res) => {
    let vSymbol = (req.body.Symbol || "").toString().toUpperCase();
    if(!["BTCUSD", "ETHUSD"].includes(vSymbol)){
        res.send({ "status": "warning", "message": "Unsupported symbol for best-rate request.", "data": "" });
        return;
    }

    const vMethod = "GET";
    const vPath = '/v2/tickers/' + vSymbol;
    const vQueryStr = "";
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrl + vPath + vQueryStr,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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

exports.fnGetOptionTrendSnapshot = async (req, res) => {
    try{
        const vSymbol = String(req?.body?.Symbol || "BTCUSD").toUpperCase();
        const vUnderlying = fnMapFuturesSymbolToUnderlying(vSymbol);
        if(!vUnderlying){
            res.send({ status: "warning", message: "Unsupported symbol for trend snapshot.", data: "" });
            return;
        }

        const objProductsResp = await axios.get(`${gBaseUrl}/v2/products`, {
            headers: { Accept: "application/json" },
            timeout: 10000
        });
        const objProducts = Array.isArray(objProductsResp?.data?.result) ? objProductsResp.data.result : [];
        const objExpiryBuckets = fnGetTrendExpiryBuckets(objProducts, vUnderlying);
        const objExpiryList = [...new Set(Object.values(objExpiryBuckets).filter(Boolean))];
        if(objExpiryList.length === 0){
            res.send({ status: "warning", message: "No live option expiries available for trend snapshot.", data: "" });
            return;
        }

        const objTickerResp = await axios.get(`${gBaseUrl}/v2/tickers/${encodeURIComponent(vSymbol)}`, {
            headers: { Accept: "application/json" },
            timeout: 10000
        });
        const objFutTicker = objTickerResp?.data?.result || {};
        const vSpot = Number(objFutTicker?.spot_price || objFutTicker?.mark_price || objFutTicker?.close);
        const vMarkPrice = Number(objFutTicker?.mark_price || objFutTicker?.spot_price || objFutTicker?.close);
        const vRefPrice = Number.isFinite(vSpot) && vSpot > 0 ? vSpot : vMarkPrice;
        if(!Number.isFinite(vRefPrice) || vRefPrice <= 0){
            res.send({ status: "warning", message: "Reference price unavailable for trend snapshot.", data: "" });
            return;
        }

        const objExpiryMetrics = {};

        for(const vExpiry of objExpiryList){
            const objChainResp = await axios.get(`${gBaseUrl}/v2/tickers`, {
                params: {
                    contract_types: "call_options,put_options",
                    underlying_asset_symbols: vUnderlying,
                    expiry_date: vExpiry
                },
                headers: { Accept: "application/json" },
                timeout: 10000
            });
            const objChainRows = Array.isArray(objChainResp?.data?.result) ? objChainResp.data.result : [];
            objExpiryMetrics[vExpiry] = fnBuildOptionMetrics(objChainRows, vRefPrice);
        }

        const objNearMetrics = fnGetMetricsForBucket(objExpiryMetrics, objExpiryBuckets.near);
        const objWeekMetrics = fnGetMetricsForBucket(objExpiryMetrics, objExpiryBuckets.week);
        const objMonthMetrics = fnGetMetricsForBucket(objExpiryMetrics, objExpiryBuckets.month);
        const objCombinedMetrics = fnMergeOptionMetrics([objNearMetrics, objWeekMetrics, objMonthMetrics]);

        res.send({
            status: "success",
            message: "Option trend snapshot fetched.",
            data: {
                ts: Date.now(),
                symbol: vSymbol,
                underlying: vUnderlying,
                spot: Number.isFinite(vSpot) ? Number(vSpot.toFixed(2)) : null,
                markPrice: Number.isFinite(vMarkPrice) ? Number(vMarkPrice.toFixed(2)) : null,
                refPrice: Number(vRefPrice.toFixed(2)),
                expiries: objExpiryList,
                expiryBuckets: objExpiryBuckets,
                rowsUsed: objCombinedMetrics.rowsUsed,
                totalCallOi: objCombinedMetrics.totalCallOi,
                totalPutOi: objCombinedMetrics.totalPutOi,
                totalCallVol: objCombinedMetrics.totalCallVol,
                totalPutVol: objCombinedMetrics.totalPutVol,
                totalOi: objCombinedMetrics.totalOi,
                pcrOi: objCombinedMetrics.pcrOi,
                pcrVol: objCombinedMetrics.pcrVol,
                maxCallOiStrike: objCombinedMetrics.maxCallOiStrike,
                maxPutOiStrike: objCombinedMetrics.maxPutOiStrike,
                buckets: {
                    near: { expiry: objExpiryBuckets.near, ...objNearMetrics },
                    week: { expiry: objExpiryBuckets.week, ...objWeekMetrics },
                    month: { expiry: objExpiryBuckets.month, ...objMonthMetrics }
                }
            }
        });
    }
    catch(objError){
        res.send({ status: "danger", message: "Error in option trend snapshot.", data: objError?.message || objError });
    }
}

//Sample Functions to place or cancel order
exports.fnPlaceLimitOrderSDK = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vClientOrderID = req.body.ClientOrderID;

    // console.log(vApiKey);
    // console.log(vApiSecret);
    // console.log(vClientOrderID);

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Orders.placeOrder({
            order: {
              product_id: 27,
              size: 1,
              side: "buy",
              limit_price: "118000",
              order_type: "limit_order",
              client_order_id: (vClientOrderID).toString()
            }
          }).then(function (response) {
            let objResult = JSON.parse(response.data);

            // console.log(objResult);

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
    // res.send({ "status": "success", "message": "Limit Order Placed Successfully!", "data": "" });
}

exports.fnSendTelegramAlertMsg = async (req, res) => {
    try{
        const vMsg = String(req?.body?.Message || "").trim();
        if(!vMsg){
            res.send({ status: "warning", message: "Telegram message is empty.", data: "" });
            return;
        }
        const objTgCfg = fnGetTelegramConfigFromReq(req);
        const bSent = await fnSendTelegramAlert(vMsg, objTgCfg);
        if(bSent){
            res.send({ status: "success", message: "Telegram alert sent.", data: "" });
        }
        else{
            res.send({ status: "warning", message: "Telegram config missing or send failed.", data: "" });
        }
    }
    catch(objErr){
        res.send({ status: "danger", message: "Telegram alert failed.", data: objErr?.message || objErr });
    }
}

exports.fnPlaceSLTPLimitOrderSDK = async (req, res) => {
    const objDate = new Date();
    let vSecDt = objDate.valueOf();

    new DeltaRestClient(gApiKey, gApiSecret).then(client => {
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
    new DeltaRestClient(gApiKey, gApiSecret).then(client => {
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
//Sample Functions to place or cancel order

function fnGetSignature(pMethod, pPath, pQueryStr, pTimeStamp, pBody){
  if (!pBody || R.isEmpty(pBody)) pBody = "";
  else if (R.is(Object, pBody)) pBody = JSON.stringify(pBody);

  const vMessage = pMethod + pTimeStamp + pPath + pQueryStr + pBody;
  return crypto
    .createHmac("sha256", gApiSecret)
    .update(vMessage)
    .digest("hex");
}

function fnRoundTimeToNearestXMinutes(pDate, pMinutes) {
  const vMinutesInMs = 1000 * 60 * pMinutes; // Milliseconds in 5 minutes
  const vRoundedTimestamp = Math.floor(pDate.getTime() / vMinutesInMs) * vMinutesInMs;
  return new Date(vRoundedTimestamp);
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
    catch(_objErr){
        return false;
    }
}

const fnGetTelegramConfigFromReq = (req) => {
    return {
        botToken: String(req?.body?.TelegramBotToken || "").trim(),
        chatId: String(req?.body?.TelegramChatId || "").trim()
    };
}

function fnMapFuturesSymbolToUnderlying(pSymbol){
    if(pSymbol === "BTCUSD"){
        return "BTC";
    }
    if(pSymbol === "ETHUSD"){
        return "ETH";
    }
    return "";
}

function fnGetTrendExpiryBuckets(pProducts, pUnderlying){
    const objExpiries = fnGetNearestOptionExpiriesDetailed(pProducts, pUnderlying);
    if(objExpiries.length === 0){
        return { near: null, week: null, month: null };
    }
    const objNear = objExpiries[0];
    const objWeek = objExpiries.find((x) => x.daysToExpiry >= 5) || objExpiries[Math.min(1, objExpiries.length - 1)] || objNear;
    const objMonth = objExpiries.find((x) => x.daysToExpiry >= 20) || objExpiries[objExpiries.length - 1] || objWeek || objNear;
    return {
        near: objNear?.apiDate || null,
        week: objWeek?.apiDate || null,
        month: objMonth?.apiDate || null
    };
}

function fnGetNearestOptionExpiriesDetailed(pProducts, pUnderlying){
    const vToday = new Date();
    const objMap = new Map();
    for(const objProd of (pProducts || [])){
        const vContractType = String(objProd?.contract_type || "").toLowerCase();
        if(vContractType !== "call_options" && vContractType !== "put_options"){
            continue;
        }
        const vSymbol = String(objProd?.symbol || "");
        if(!vSymbol.startsWith(`C-${pUnderlying}-`) && !vSymbol.startsWith(`P-${pUnderlying}-`)){
            continue;
        }
        const objMatch = vSymbol.match(/-(\d{6})$/);
        if(!objMatch){
            continue;
        }
        const vExpiry = fnParseDdMmYyToDate(objMatch[1]);
        if(!vExpiry || vExpiry < new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate())){
            continue;
        }
        const vApiDate = fnFormatDateForDelta(vExpiry);
        if(!objMap.has(vApiDate)){
            const vStartToday = new Date(vToday.getFullYear(), vToday.getMonth(), vToday.getDate());
            const vDaysToExpiry = Math.round((vExpiry.getTime() - vStartToday.getTime()) / 86400000);
            objMap.set(vApiDate, { ts: vExpiry.getTime(), daysToExpiry: Math.max(0, vDaysToExpiry) });
        }
    }
    return [...objMap.entries()]
        .sort((a, b) => a[1].ts - b[1].ts)
        .map(([vApiDate, vMeta]) => ({ apiDate: vApiDate, daysToExpiry: vMeta.daysToExpiry, ts: vMeta.ts }));
}

function fnBuildOptionMetrics(pRows, pRefPrice){
    let vTotalCallOi = 0;
    let vTotalPutOi = 0;
    let vTotalCallVol = 0;
    let vTotalPutVol = 0;
    let vMaxCallOi = -1;
    let vMaxPutOi = -1;
    let vMaxCallOiStrike = null;
    let vMaxPutOiStrike = null;
    let vRowsUsed = 0;

    for(const objRow of (pRows || [])){
        const vStrike = Number(objRow?.strike_price);
        if(!Number.isFinite(vStrike) || !fnIsStrikeNearMoney(vStrike, pRefPrice, 0.03)){
            continue;
        }
        const vOi = Number(objRow?.oi);
        const vVol = Number(objRow?.volume);
        const vType = String(objRow?.contract_type || "").toLowerCase();
        if(vType === "call_options"){
            vTotalCallOi += Number.isFinite(vOi) ? vOi : 0;
            vTotalCallVol += Number.isFinite(vVol) ? vVol : 0;
            if(Number.isFinite(vOi) && vOi > vMaxCallOi){
                vMaxCallOi = vOi;
                vMaxCallOiStrike = vStrike;
            }
        }
        else if(vType === "put_options"){
            vTotalPutOi += Number.isFinite(vOi) ? vOi : 0;
            vTotalPutVol += Number.isFinite(vVol) ? vVol : 0;
            if(Number.isFinite(vOi) && vOi > vMaxPutOi){
                vMaxPutOi = vOi;
                vMaxPutOiStrike = vStrike;
            }
        }
        vRowsUsed += 1;
    }

    return fnFinalizeOptionMetrics({
        rowsUsed: vRowsUsed,
        totalCallOi: vTotalCallOi,
        totalPutOi: vTotalPutOi,
        totalCallVol: vTotalCallVol,
        totalPutVol: vTotalPutVol,
        maxCallOiStrike: vMaxCallOiStrike,
        maxPutOiStrike: vMaxPutOiStrike
    });
}

function fnMergeOptionMetrics(pMetricsList){
    let vRowsUsed = 0;
    let vTotalCallOi = 0;
    let vTotalPutOi = 0;
    let vTotalCallVol = 0;
    let vTotalPutVol = 0;
    const objCallStrikeScores = new Map();
    const objPutStrikeScores = new Map();

    for(const objMetrics of (pMetricsList || [])){
        if(!objMetrics){
            continue;
        }
        vRowsUsed += Number(objMetrics.rowsUsed || 0);
        vTotalCallOi += Number(objMetrics.totalCallOi || 0);
        vTotalPutOi += Number(objMetrics.totalPutOi || 0);
        vTotalCallVol += Number(objMetrics.totalCallVol || 0);
        vTotalPutVol += Number(objMetrics.totalPutVol || 0);
        if(Number.isFinite(Number(objMetrics.maxCallOiStrike))){
            objCallStrikeScores.set(Number(objMetrics.maxCallOiStrike), (objCallStrikeScores.get(Number(objMetrics.maxCallOiStrike)) || 0) + Number(objMetrics.totalCallOi || 0));
        }
        if(Number.isFinite(Number(objMetrics.maxPutOiStrike))){
            objPutStrikeScores.set(Number(objMetrics.maxPutOiStrike), (objPutStrikeScores.get(Number(objMetrics.maxPutOiStrike)) || 0) + Number(objMetrics.totalPutOi || 0));
        }
    }

    return fnFinalizeOptionMetrics({
        rowsUsed: vRowsUsed,
        totalCallOi: vTotalCallOi,
        totalPutOi: vTotalPutOi,
        totalCallVol: vTotalCallVol,
        totalPutVol: vTotalPutVol,
        maxCallOiStrike: fnGetHighestWeightedStrike(objCallStrikeScores),
        maxPutOiStrike: fnGetHighestWeightedStrike(objPutStrikeScores)
    });
}

function fnFinalizeOptionMetrics(pMetrics){
    const vCallOi = Number(pMetrics.totalCallOi || 0);
    const vPutOi = Number(pMetrics.totalPutOi || 0);
    const vCallVol = Number(pMetrics.totalCallVol || 0);
    const vPutVol = Number(pMetrics.totalPutVol || 0);
    return {
        rowsUsed: Number(pMetrics.rowsUsed || 0),
        totalCallOi: Number(vCallOi.toFixed(2)),
        totalPutOi: Number(vPutOi.toFixed(2)),
        totalCallVol: Number(vCallVol.toFixed(2)),
        totalPutVol: Number(vPutVol.toFixed(2)),
        totalOi: Number((vCallOi + vPutOi).toFixed(2)),
        pcrOi: vCallOi > 0 ? Number((vPutOi / vCallOi).toFixed(4)) : null,
        pcrVol: vCallVol > 0 ? Number((vPutVol / vCallVol).toFixed(4)) : null,
        maxCallOiStrike: Number.isFinite(Number(pMetrics.maxCallOiStrike)) ? Number(pMetrics.maxCallOiStrike) : null,
        maxPutOiStrike: Number.isFinite(Number(pMetrics.maxPutOiStrike)) ? Number(pMetrics.maxPutOiStrike) : null
    };
}

function fnGetMetricsForBucket(pExpiryMetrics, pExpiry){
    const objMetrics = pExpiry ? pExpiryMetrics?.[pExpiry] : null;
    if(objMetrics){
        return objMetrics;
    }
    return fnFinalizeOptionMetrics({
        rowsUsed: 0,
        totalCallOi: 0,
        totalPutOi: 0,
        totalCallVol: 0,
        totalPutVol: 0,
        maxCallOiStrike: null,
        maxPutOiStrike: null
    });
}

function fnGetHighestWeightedStrike(pMap){
    let vBestStrike = null;
    let vBestScore = -1;
    for(const [vStrike, vScore] of (pMap || new Map()).entries()){
        if(vScore > vBestScore){
            vBestScore = vScore;
            vBestStrike = vStrike;
        }
    }
    return vBestStrike;
}

function fnParseDdMmYyToDate(pDdMmYy){
    const vRaw = String(pDdMmYy || "");
    if(!/^\d{6}$/.test(vRaw)){
        return null;
    }
    const vDay = Number(vRaw.slice(0, 2));
    const vMonth = Number(vRaw.slice(2, 4));
    const vYear = 2000 + Number(vRaw.slice(4, 6));
    const vDate = new Date(vYear, vMonth - 1, vDay);
    if(vDate.getFullYear() !== vYear || (vDate.getMonth() + 1) !== vMonth || vDate.getDate() !== vDay){
        return null;
    }
    return vDate;
}

function fnFormatDateForDelta(pDate){
    const vDay = String(pDate.getDate()).padStart(2, "0");
    const vMonth = String(pDate.getMonth() + 1).padStart(2, "0");
    const vYear = pDate.getFullYear();
    return `${vDay}-${vMonth}-${vYear}`;
}

function fnIsStrikeNearMoney(pStrike, pRefPrice, pBandPct = 0.03){
    if(!Number.isFinite(pStrike) || !Number.isFinite(pRefPrice) || pStrike <= 0 || pRefPrice <= 0){
        return false;
    }
    const vBand = pRefPrice * pBandPct;
    return Math.abs(pStrike - pRefPrice) <= vBand;
}
