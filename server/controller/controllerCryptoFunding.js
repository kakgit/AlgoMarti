const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const gBaseUrlDelta = 'https://api.india.delta.exchange';
const gBaseUrlCDcx = 'https://api.coindcx.com';

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

exports.fnUpdCoindcxDeltaCoinsList = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;

    let objCoinDcxCoins = await fnGetCoinDcxStrList();
    if(objCoinDcxCoins.status === "success"){
        let objDeltaCoinDCXCoins = await fnGetDeltaCoinsList(vApiKey, vApiSecret, objCoinDcxCoins.data);

        if(objDeltaCoinDCXCoins.status === "success"){

            fs.writeFile("./public/json/CoinDcxDelta.json", JSON.stringify(objDeltaCoinDCXCoins.data, null, 4), (err) => {
                if (err) {
                    console.error(err);
                    return;
                };
                // console.log("File Created / Updated!");
            });

            res.send({ "status": "success", "message": objDeltaCoinDCXCoins.message, "data": objDeltaCoinDCXCoins.data });
        }
        else{
            res.send({ "status": objDeltaCoinDCXCoins.status, "message": objDeltaCoinDCXCoins.message, "data": objDeltaCoinDCXCoins.data });
        }
    }
    else{
        res.send({ "status": objCoinDcxCoins.status, "message": objCoinDcxCoins.message, "data": objCoinDcxCoins.data });
    }
    // res.send({ "status": "success", "message": "Success", "data": "" });
}

exports.fnGetCoinDcxDeltaData = async (req, res) => {
    let objData = path.join(__dirname, '../../public/json/CoinDcxDelta.json');

    //Read JSON from relative path of this file
    fs.readFile(objData, 'utf8', function (err, data) {
        //Handle Error
        if (!err) {
            var jsonObj = JSON.parse(data);

            res.send({ status: "success", message: "File Received!", data: jsonObj });
        }
        else {
            res.send({ status: "danger", message: "Error Reading File!", data: err });
        }
    });
}

exports.fnGetDeltaCoinsList = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;

    new DeltaRestClient(vApiKey, vApiSecret).then(client => {
        client.apis.Products.getProducts({ contract_types : "perpetual_futures", states : "live" }).then(function (response) {
            let objResult = JSON.parse(response.data);
            let objMyData = [];
            let objSortData = [];

            if(objResult.success){
                // console.log(objResult.result[0]);
                for(let i=0; i<objResult.result.length;i++){
                    let vRateFeqMS = objResult.result[i].product_specs.rate_exchange_interval;
                    let vRateFeqHr = vRateFeqMS / 3600;

                    let objData = { AnualFundD : parseFloat(objResult.result[i].annualized_funding), LotSizeD : parseFloat(objResult.result[i].contract_value), LeverageD : parseFloat(objResult.result[i].default_leverage), SymbIdD : objResult.result[i].id, PosLimitD : objResult.result[i].position_size_limit, RateFeqMsD : vRateFeqMS, RateFeqHrD : vRateFeqHr, SymbolD : objResult.result[i].symbol, UndrAsstSymbD : objResult.result[i].spot_index.config.underlying_asset, AllowOnlyCloseD : objResult.result[i].product_specs.only_reduce_only_orders_allowed };

                    objMyData.push(objData);
                }

                objSortData = objMyData.sort(fnSortByRateHour);

                fs.writeFile("./public/json/CoinDcxDelta.json", JSON.stringify(objSortData, null, 4), (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    };
                    console.log("File Created / Updated!");
                });
        
                // res.send({ "status": "success", "message": "Successfully!", "data": objResult });
                res.send({ "status": "success", "message": "Successfully!", "data": objSortData });
            }
            else{
                res.send({ "status": "warning", "message": "Error !", "data": objResult });
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

exports.fnGetCdcxCoinsList = async (req, res) => {
    // let vApiKey = req.body.ApiKey;
    // let vApiSecret = req.body.ApiSecret;
    // const vUrl = "https://api.coindcx.com/exchange/v1/derivatives/futures/data/active_instruments?margin_currency_short_name[]=USDT"
    const vUrl = "https://public.coindcx.com/market_data/v3/current_prices/futures/rt";
    const vMethod = "GET";

    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: vUrl,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
        };

      axios.request(config)
      .then((objResult) => {
        let objRes = (objResult.data);
        // console.log(objRes);
        res.send({ "status": "success", "message": "Coins List Fetched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error to Fetch Coins List. Contact Administrator!", "data": objError });
    });

    // res.send({ "status": "success", "message": "Success", "data": "" });
}

exports.fnGetCdcxCoinsDetails = async (req, res) => {
    // let vApiKey = req.body.ApiKey;
    // let vApiSecret = req.body.ApiSecret;
    const vUrl = "https://api.coindcx.com/exchange/v1/derivatives/futures/data/instrument?pair=B-BTC_USDT&margin_currency_short_name=USDT";
    const vMethod = "GET";

    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: vUrl,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
            }
        };

      axios.request(config)
      .then((objResult) => {
        let objRes = (objResult.data);
        // console.log(objRes);
        res.send({ "status": "success", "message": "Coin Details Fetched!", "data": objRes });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error to Fetch Coin Details. Contact Administrator!", "data": objError });
    });

    // res.send({ "status": "success", "message": "Success", "data": "" });
}

exports.fnGetDeltaFundingList = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;

    const vMethod = "GET";
    const vPath = '/v2/tickers?contract_types=perpetual_futures'; // + vSymbol;
    const vTimeStamp = Math.floor(new Date().getTime() / 1000);

    const vQueryStr = "";
    const vBody = "";
    const vSignature = fnGetSignature(vApiSecret, vMethod, vPath, vQueryStr, vTimeStamp, vBody);
    let config = {
        method: vMethod,
        maxBodyLength: Infinity,
        url: gBaseUrlDelta + vPath + vQueryStr,
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
        let objFData = {};
        // let objRes = (objResult.data);

        // console.log(objResult.data.result.length);
        for(let i=0; i<objResult.data.result.length; i++){
            objFData[objResult.data.result[i].symbol] = parseFloat(objResult.data.result[i].funding_rate);
        }
        // console.log(objRes);
        res.send({ "status": "success", "message": "Delta Funding Details Fetched!", "data": objFData });
    })
      .catch((objError) => {
        console.log(objError);
        res.send({ "status": "danger", "message": "Error to Fetch Delta Funding Details. Contact Administrator!", "data": objError });
    });
    // res.send({ "status": "success", "message": "Current Rate Information Feched!", "data": "" });
}

exports.fnUpdateDeltaLeverage = async (req, res) => {
    let vApiKey = req.body.ApiKey;
    let vApiSecret = req.body.ApiSecret;
    let vSymbol = req.body.Symbol;
    let vLeverage = 15;
    let vProductId = 50354;

    const method = 'POST';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = `/v2/products/${vProductId}/orders/leverage`;
    const queryString = '';

    const requestBody = { leverage: vLeverage.toString() };
    const payload = JSON.stringify(requestBody);
    
    const signatureData = method + timestamp + path + queryString + payload;
    const signature = fnGenerateSignature(vApiSecret, signatureData);

    const headers = {
    'api-key': vApiKey,
    'timestamp': timestamp,
    'signature': signature,
    'Content-Type': 'application/json',
    'User-Agent': 'rest-client'
    };

    try {
        const response = await axios.post(
        `${gBaseUrlDelta}${path}`,
        requestBody,  // Send the object, axios will stringify it
        { headers }
        );
        console.log('Leverage set successfully:', response.data);
        res.send({ "status": "success", "message": "Leverage Updated!", "data": "" });
    }
    catch (error) {
        console.error('Error setting leverage:', error.response?.data || error.message);
        throw error;
    }
    // res.send({ "status": "success", "message": "Order Closed", "data": "" });
}

exports.fnExecOpenOrderCDcx = async (req, res) => {


    let objOrdCDcx = await fnOpenOrderCDcx();
    if(objOrdCDcx.status === "success"){

        res.send({ "status": "success", "message": objOrdCDcx.message, "data": objOrdCDcx.data });
    }
    else{
        res.send({ "status": "danger", "message": objOrdCDcx.message, "data": "" });
    }
}

const fnOpenOrderCDcx = async () => {
    const objPromise = new Promise((resolve, reject) => {
        // const vUrl = "https://api.coindcx.com/exchange/v1/derivatives/futures/data/active_instruments?margin_currency_short_name[]=USDT"
        // const vMethod = "GET";

        // let config = {
        //     method: vMethod,
        //     maxBodyLength: Infinity,
        //     url: vUrl,
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Accept': 'application/json'
        //         }
        //     };

        // axios.request(config)
        // .then((objResult) => {

        //     // console.log(objResult);
        //     resolve({ "status": "success", "message": "Coin DCX Order Placed!", "data": objResult });
        // })
        // .catch((objError) => {
        //     console.log(objError);
        //     resolve({ "status": "danger", "message": "Error Placing CoinDCX Order! Catch.", "data": objError });
        // });
        resolve({ "status": "success", "message": "Coin DCX Order Placed!", "data": "" });
    });
    return objPromise;
}

const fnGetCoinDcxStrList = async () => {
    const objPromise = new Promise((resolve, reject) => {
        const vUrl = "https://api.coindcx.com/exchange/v1/derivatives/futures/data/active_instruments?margin_currency_short_name[]=USDT"
        const vMethod = "GET";

        let config = {
            method: vMethod,
            maxBodyLength: Infinity,
            url: vUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
                }
            };

        axios.request(config)
        .then((objResult) => {
            // console.log(objResult);
            const objRes = (objResult.data).join(", ");
            resolve({ "status": "success", "message": "Coin DCX String List Fetched!", "data": objRes });
        })
        .catch((objError) => {
            console.log(objError);
            resolve({ "status": "danger", "message": "Error At User Login! Catch.", "data": objError });
        });
    });
    return objPromise;
}

const fnGetDeltaCoinsList = async (pApiKey, pSecretCode, pCoinDcxList) => {
    const objPromise = new Promise((resolve, reject) => {
        new DeltaRestClient(pApiKey, pSecretCode).then(client => {
            client.apis.Products.getProducts({ contract_types : "perpetual_futures", states : "live" }).then(function (response) {
                let objResult = JSON.parse(response.data);
                let objMyData = [];
                let objSortData = [];

                if(objResult.success){
                    for(let i=0; i<objResult.result.length;i++){
                        let vUndrAsstSymb = objResult.result[i].spot_index.config.underlying_asset;
                        let vCoinName = "B-" + vUndrAsstSymb + "_USDT";

                        let vCoinIndex = (pCoinDcxList).indexOf(vCoinName);
                        if(vCoinIndex !== -1){
                            let vRateFeqMS = objResult.result[i].product_specs.rate_exchange_interval;
                            let vRateFeqHr = vRateFeqMS / 3600;

                            let objData = { AnualFundD : parseFloat(objResult.result[i].annualized_funding), LotSizeD : parseFloat(objResult.result[i].contract_value), LeverageD : parseFloat(objResult.result[i].default_leverage), SymbIdD : objResult.result[i].id, PosLimitD : objResult.result[i].position_size_limit, RateFeqMsD : vRateFeqMS, RateFeqHrD : vRateFeqHr, SymbolD : objResult.result[i].symbol, UndrAsstSymbD : vUndrAsstSymb, AllowOnlyCloseD : objResult.result[i].product_specs.only_reduce_only_orders_allowed, SymbolC : vCoinName };

                            objMyData.push(objData);
                        }
                    }

                    objSortData = objMyData.sort(fnSortByRateHour);
            
                    // res.send({ "status": "success", "message": "Successfully!", "data": objResult });
                    // res.send({ "status": "success", "message": "Successfully!", "data": objSortData });
                    resolve({ "status": "success", "message": "Successfully !", "data": objSortData });
                }
                else{
                    // res.send({ "status": "warning", "message": "Error !", "data": objResult });
                    resolve({ "status": "warning", "message": "Error !", "data": objResult });
                }
            })
            .catch(function(objError) {
                // console.log("*************** Error **************");
                console.log(objError);
                // res.send({ "status": "danger", "message": objError.response.text, "data": objError });
                resolve({ "status": "danger", "message": objError, "data": objError });
            });
        });
        // resolve({ "status": "success", "message": "Delta Coins List Fetched!", "data": "" });
    });
    return objPromise;
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

function fnSortByRateHour(a, b) {
    return (a.RateFeqHrD) - (b.RateFeqHrD);
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

function fnGenerateSignature(vSecret, vMessage) {
  return crypto.createHmac('sha256', vSecret).update(vMessage).digest('hex');
}
