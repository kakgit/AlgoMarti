const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const csvToJson = require('convert-csv-to-json');

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("kotakLive.ejs");
}

exports.fnLoginKotakNeo = async (req, res) => {
    let vConsumerKey = req.body.ConsumerKey; //"NHbQHP1M5Z6djc1KG3yXjR0RXDga";
    let vConsumerSecret = req.body.ConsumerSecret; //"9DzmzfGKdeq2yFOS5BrbNfjwAooa";
    let vUserNameAPI = req.body.UserNameAPI;
    let vPasswordAPI = req.body.PasswordAPI;
    let vMobileNo = req.body.MobileNo;
    let vPassword = req.body.Password;
    let vMpin = req.body.Mpin;

    try {
        let vAccessToken = await fnGetAccessToken(vConsumerKey, vConsumerSecret, vUserNameAPI, vPasswordAPI);

        let objViewToken = await fnGetViewToken(vMobileNo, vPassword, vAccessToken.data);

        let vViewToken = objViewToken.data.data.token;
        let vSid = objViewToken.data.data.sid;
        let vHsServerId = objViewToken.data.data.hsServerId;
        let bIsPwdExpired = objViewToken.data.data.isUserPwdExpired;
        let vSubUserId = "";

        if (bIsPwdExpired === true) {
            res.send({ "status": "danger", "message": "Password Expired, Please reset in the Trading APP.", "data": objViewToken.data.data });
        }
        else {
            let objJWT = await fnParseJwt(vViewToken);
            vSubUserId = objJWT.sub;

            let objSession = await fnGetKotakSession(vSubUserId, vMpin, vSid, vViewToken, vAccessToken.data);

            let objLimits = await fnGetUserLimits(vHsServerId, vSid, vViewToken, vAccessToken.data);

            //console.log(objLimits.data);

            res.send({ "status": "success", "message": "Trader Login - Successful", "data": { Session: objSession.data.data.token, SubUserId: vSubUserId, Sid: objSession.data.data.sid, ViewToken: vViewToken, HsServerId: vHsServerId, AccessToken: vAccessToken.data, Limits: objLimits.data } });
        }
    }
    catch (error) {
        console.log("Error: " + error.data);
        res.send({ "status": "danger", "message": error.message, "data": error.data });
    }
}

exports.fnNseCmCsv2NseCashJson = async (req, res) => {
    try {
        let fileInputName = path.join(__dirname, '../../public/uploads/nse_cm.csv');
        // let fileOutputName = path.join(__dirname, '../../public/json/nse_cm.json');
        const objDate = new Date();
        let vSecDt = objDate.valueOf();

        let objJson = csvToJson.fieldDelimiter(',').getJsonFromCsv(fileInputName);
        let objResJson = { UpdDt: vSecDt, Symbol: [] };
        //csvToJson.fieldDelimiter(',').generateJsonFileFromCsv(fileInputName, fileOutputName);

        for (let i = 0; i < objJson.length; i++) {
            if (objJson[i].pGroup === "EQ") {
                objResJson.Symbol.push({ pSymbol: objJson[i].pSymbol, pSymbolName: objJson[i].pSymbolName, pTrdSymbol: objJson[i].pTrdSymbol });
            }
        }
        //console.log(objResJson);
        fs.writeFile("./public/json/nse_cash.json", JSON.stringify(objResJson, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            };
            console.log("File Created / Updated!");
        });

        res.send({ "status": "success", "message": "Converted CSV to NSE Cash JSON - Successful", "data": "Converted" });
    }
    catch (error) {
        console.log("Error: " + error.data);
        res.send({ "status": "danger", "message": error.message, "data": error.data });
    }
}

exports.fnNseFoCsv2OptJson = async (req, res) => {
    try {
        let fileInputName = path.join(__dirname, '../../public/uploads/nse_fo.csv');
        // let fileOutputName = path.join(__dirname, '../../public/json/nse_cm.json');
        const objDate = new Date();
        let vSecDt = objDate.valueOf();

        let objJson = csvToJson.fieldDelimiter(',').getJsonFromCsv(fileInputName);
        let objResJson = { UpdDt: vSecDt, Symbol: [] };
        //csvToJson.fieldDelimiter(',').generateJsonFileFromCsv(fileInputName, fileOutputName);

        for (let i = 0; i < objJson.length; i++) {
            if (objJson[i].pInstType === "OPTIDX") {
                objResJson.Symbol.push({ pSymbol: objJson[i].pSymbol, pExchSeg: objJson[i].pExchSeg, pSymbolName: objJson[i].pSymbolName, pTrdSymbol: objJson[i].pTrdSymbol, pOptionType: objJson[i].pOptionType, pLotSize: parseInt(objJson[i].lLotSize), pExchange: objJson[i].pExchange, pExpiryDate: parseFloat(objJson[i].lExpiryDate), pStrikePrice: parseFloat(objJson[i]["dStrikePrice;"]), MaxPerOrdQty: (parseFloat(objJson[i].lFreezeQty) - 1) });
            }
        }
        //console.log(objResJson);
        fs.writeFile("./public/json/nse_idx_opt.json", JSON.stringify(objResJson, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            };
            console.log("File Created / Updated!");
        });

        res.send({ "status": "success", "message": "Converted CSV to nse idx opt JSON - Successful", "data": "Converted" });
    }
    catch (error) {
        console.log("Error: " + error.data);
        res.send({ "status": "danger", "message": error.message, "data": error.data });
    }
}

exports.fnBseFoCsv2OptJson = async (req, res) => {
    try {
        let fileInputName = path.join(__dirname, '../../public/uploads/bse_fo.csv');
        // let fileOutputName = path.join(__dirname, '../../public/json/nse_cm.json');
        const objDate = new Date();
        let vSecDt = objDate.valueOf();

        let objJson = csvToJson.fieldDelimiter(',').getJsonFromCsv(fileInputName);
        let objResJson = { UpdDt: vSecDt, Symbol: [] };
        //csvToJson.fieldDelimiter(',').generateJsonFileFromCsv(fileInputName, fileOutputName);

        for (let i = 0; i < objJson.length; i++) {
            if (objJson[i].pInstType === "IO") {
                objResJson.Symbol.push({ pSymbol: objJson[i].pSymbol, pExchSeg: objJson[i].pExchSeg, pSymbolName: objJson[i].pSymbolName, pTrdSymbol: objJson[i].pTrdSymbol, pOptionType: objJson[i].pOptionType, pLotSize: parseInt(objJson[i].lLotSize), pExchange: objJson[i].pExchange, pExpiryDate: parseFloat(objJson[i].lExpiryDate), pStrikePrice: parseFloat(objJson[i]["dStrikePrice;"]), MaxPerOrdQty: parseFloat(objJson[i].lFreezeQty) });
            }
        }
        //console.log(objResJson);
        fs.writeFile("./public/json/bse_idx_opt.json", JSON.stringify(objResJson, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            };
            console.log("File Created / Updated!");
        });

        res.send({ "status": "success", "message": "Converted CSV to bse idx opt JSON - Successful", "data": "Converted" });
    }
    catch (error) {
        console.log("Error: " + error.data);
        res.send({ "status": "danger", "message": error.message, "data": error.data });
    }
}

exports.fnGetJsonFilesData = async (req, res) => {
    let vNseCashPath = path.join(__dirname, '../../public/json/nse_cm.json');

    //Read JSON from relative path of this file
    fs.readFile(vNseCashPath, 'utf8', function (err, data) {
        //Handle Error
        if (!err) {
            var jsonObj = JSON.parse(data);

            res.send({ status: "success", message: "NSE Cash Symbols File Received!", data: jsonObj });
        }
        else {
            res.send({ status: "danger", message: "Error Reading NSE Cash Symbols File!", data: err });
        }
    });
}

exports.fnPlaceNormalOrder = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;
    let vExchSeg = req.body.ExchSeg;
    let vSymbToken = req.body.SymToken;
    let vTrdSymbol = req.body.TrdSymbol;
    let vBorS = req.body.BorS;
    let vOrderQty = req.body.OrderQty;
    let vRandId = req.body.RandId;

    let objOrder, objOrderDtls = "";
    let bHasTrade = false;
    let vAvgPrice = 0;
    let vOrdersCount = 0;

    try {
        objOrder = "241105000099999";
        objOrderDtls = {
            "tid": "server3_282711",
            "stat": "Ok",
            "stCode": 200,
            "data": [
                {
                    "brkClnt": "--",
                    "ordValDt": "NA",
                    "exUsrInfo": "NA",
                    "mfdBy": "NA",
                    "vendorCode": "",
                    "rmk": "--",
                    "odCrt": "NA",
                    "ordSrc": "ADMINCPPAPI_TRADEAPI",
                    "sipInd": "NA",
                    "prc": "0.00",
                    "prcTp": "MKT",
                    "cnlQty": 0,
                    "uSec": "673859",
                    "classification": "0",
                    "mktPro": "0.00",
                    "ordEntTm": "--",
                    "reqId": "1",
                    "algSeqNo": "NA",
                    "qty": 30000,
                    "unFldSz": 0,
                    "mktProPct": "--",
                    "algCat": "NA",
                    "exOrdId": "NA",
                    "dscQty": 0,
                    "actId": "XIAVR",
                    "expDt": "NA",
                    "trgPrc": "0.00",
                    "tok": "3499",
                    "symOrdId": "NA",
                    "fldQty": 0,
                    "ordDtTm": "05-Nov-2024 09:30:37",
                    "avgPrc": "0.00",
                    "locId": "111111111111100",
                    "algId": "NA",
                    "stat": "Ok",
                    "prod": "MIS",
                    "exSeg": "nse_cm",
                    "GuiOrdId": "1730779237-672239-AOGPK8647F-ADMINAPI",
                    "usrId": "AOGPK8647F",
                    "rptTp": "NA",
                    "exCfmTm": "NA",
                    "hsUpTm": "2024/11/05 09:30:37",
                    "updRecvTm": 1730779237807618300,
                    "ordGenTp": "NA",
                    "vldt": "DAY",
                    "tckSz": "0.01",
                    "ordSt": "rejected",
                    "trnsTp": "B",
                    "refLmtPrc": 0,
                    "coPct": 0,
                    "nOrdNo": "241105000090312",
                    "ordAutSt": "NA",
                    "strategyCode": "NA",
                    "rejRsn": "RMS:Margin Exceeds,Cash Available:5000.00,Additional margin required:890560.00 for entity account-XIAVR across exchange across segment across product ",
                    "boeSec": 1730779237,
                    "expDtSsb": "--",
                    "dscQtyPct": "0",
                    "stkPrc": "0.00",
                    "sym": "TATASTEEL",
                    "trdSym": "TATASTEEL-EQ",
                    "multiplier": "1",
                    "precision": "2",
                    "noMktProFlg": "0.00",
                    "genNum": "1",
                    "series": "EQ",
                    "prcNum": "1",
                    "genDen": "1",
                    "brdLtQty": "1",
                    "mktProFlg": "0.00",
                    "defMktProV": "0.00",
                    "lotSz": "1",
                    "minQty": 0,
                    "optTp": "XX",
                    "prcDen": "1"
                },
                {
                    "brkClnt": "--",
                    "ordValDt": "NA",
                    "exUsrInfo": "NA",
                    "mfdBy": "NA",
                    "vendorCode": "",
                    "rmk": "--",
                    "odCrt": "NA",
                    "ordSrc": "ADMINCPPAPI_TRADEAPI",
                    "sipInd": "NA",
                    "prc": "0.00",
                    "prcTp": "MKT",
                    "cnlQty": 0,
                    "uSec": "794272",
                    "classification": "0",
                    "mktPro": "0.00",
                    "ordEntTm": "--",
                    "reqId": "1",
                    "algSeqNo": "NA",
                    "qty": 1,
                    "unFldSz": 0,
                    "mktProPct": "--",
                    "algCat": "NA",
                    "exOrdId": "NA",
                    "dscQty": 0,
                    "actId": "XIAVR",
                    "expDt": "NA",
                    "trgPrc": "0.00",
                    "tok": "3499",
                    "symOrdId": "NA",
                    "fldQty": 0,
                    "ordDtTm": "05-Nov-2024 08:11:38",
                    "avgPrc": "0.00",
                    "locId": "111111111111100",
                    "algId": "NA",
                    "stat": "Ok",
                    "prod": "MIS",
                    "exSeg": "nse_cm",
                    "GuiOrdId": "1730774498-789083-AOGPK8647F-ADMINAPI",
                    "usrId": "AOGPK8647F",
                    "rptTp": "NA",
                    "exCfmTm": "NA",
                    "hsUpTm": "2024/11/05 09:30:37",
                    "updRecvTm": 1730779237807773400,
                    "ordGenTp": "NA",
                    "vldt": "DAY",
                    "tckSz": "0.01",
                    "ordSt": "rejected",
                    "trnsTp": "B",
                    "refLmtPrc": 0,
                    "coPct": 0,
                    "nOrdNo": "241105000001720",
                    "ordAutSt": "NA",
                    "strategyCode": "NA",
                    "rejRsn": "RMS: Auto Square Off Block",
                    "boeSec": 1730774498,
                    "expDtSsb": "--",
                    "dscQtyPct": "0",
                    "stkPrc": "0.00",
                    "sym": "TATASTEEL",
                    "trdSym": "TATASTEEL-EQ",
                    "multiplier": "1",
                    "precision": "2",
                    "noMktProFlg": "0.00",
                    "genNum": "1",
                    "series": "EQ",
                    "prcNum": "1",
                    "genDen": "1",
                    "brdLtQty": "1",
                    "mktProFlg": "0.00",
                    "defMktProV": "0.00",
                    "lotSz": "1",
                    "minQty": 0,
                    "optTp": "XX",
                    "prcDen": "1"
                },
                {
                    "brkClnt": "08081",
                    "ordValDt": "NA",
                    "exUsrInfo": "NA",
                    "mfdBy": "NA",
                    "vendorCode": "",
                    "rmk": "--",
                    "odCrt": "NA",
                    "ordSrc": "ADMINCPPAPI_TRADEAPI",
                    "sipInd": "NA",
                    "prc": "0.00",
                    "prcTp": "MKT",
                    "cnlQty": 0,
                    "uSec": "799513",
                    "classification": "0",
                    "mktPro": "0.00",
                    "ordEntTm": "05-Nov-2024 09:32:52",
                    "reqId": "1",
                    "algSeqNo": "NA",
                    "qty": vOrderQty,
                    "unFldSz": 0,
                    "mktProPct": "--",
                    "algCat": "NA",
                    "exOrdId": "1300000006110360",
                    "dscQty": 0,
                    "actId": "XIAVR",
                    "expDt": "NA",
                    "trgPrc": "0.00",
                    "tok": "3499",
                    "symOrdId": "NA",
                    "fldQty": 1,
                    "ordDtTm": "05-Nov-2024 09:32:52",
                    "avgPrc": "146.50",
                    "locId": "111111111111100",
                    "algId": "NA",
                    "stat": "Ok",
                    "prod": "MIS",
                    "exSeg": "nse_cm",
                    "GuiOrdId": "1730779372-793970-AOGPK8647F-ADMINAPI",
                    "usrId": "AOGPK8647F",
                    "rptTp": "NA",
                    "exCfmTm": "05-Nov-2024 09:32:52",
                    "hsUpTm": "2024/11/05 09:32:52",
                    "updRecvTm": 1730779372800102400,
                    "ordGenTp": "NA",
                    "vldt": "DAY",
                    "tckSz": "0.01",
                    "ordSt": "complete",
                    "trnsTp": vBorS,
                    "refLmtPrc": 0,
                    "coPct": 0,
                    "nOrdNo": "241105000099999",
                    "ordAutSt": "NA",
                    "strategyCode": "NA",
                    "rejRsn": "--",
                    "boeSec": 1730779372,
                    "expDtSsb": "--",
                    "dscQtyPct": "0",
                    "stkPrc": "0.00",
                    "sym": "TATASTEEL",
                    "trdSym": "TATASTEEL-EQ",
                    "multiplier": "1",
                    "precision": "2",
                    "noMktProFlg": "0.00",
                    "genNum": "1",
                    "series": "EQ",
                    "prcNum": "1",
                    "genDen": "1",
                    "brdLtQty": "1",
                    "mktProFlg": "0.00",
                    "defMktProV": "0.00",
                    "lotSz": "2",
                    "minQty": 0,
                    "optTp": "XX",
                    "prcDen": "1"
                }
            ]
        }
        res.send({ "status": "success", "message": "Order Details Received!", "data": objOrderDtls, "nOrdNo": objOrder });

        ////Uncomment Later for Real Trade

        // objOrder = await fnExecNormalOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vSymbToken, vTrdSymbol, vBorS, vOrderQty, vRandId);

        // console.log(JSON.stringify(objOrder.data));

        // if(objOrder.data.stat === "Ok"){

        //     objOrderDtls = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        //     res.send({ "status": "success", "message": "Order Details Received!", "data": objOrderDtls.data, "nOrdNo" : objOrder.data.nOrdNo });
        // }
        // else{
        //     res.send({ "status": "danger", "message": "Placing Order Failed", "data": "" });
        // }
    }
    catch (err) {
        //console.log("At fnGetRealClosedPosiDetails: " + err.data);
        res.send({ "status": err.status, "message": err.message, "data": err.data });
    }
}

exports.fnGetOrderBook = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    try {
        // Real Orderbook, comment for Temp Orderbook
        let objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        // Real Orderbook, comment for Temp Orderbook

        // for (let j = 0; j < objTempOrderBook.data.data.length; j++){
        //     if ((objTempOrderBook.data.data[j].algCat === "1749444235384") && (objTempOrderBook.data.data[j].trnsTp === "B") && (objTempOrderBook.data.data[j].ordSt === "complete")){
        //         console.log(objTempOrderBook.data.data[j]);
        //     }
        // }
        // // Temp Orderbook, comment for Real Orderbook
        // let objOrderDtls = await fnTempOrderbook();
        // // Temp Orderbook, comment for Real Orderbook

        if (objTempOrderBook.data.stat === "Not_Ok") {
            res.send({ "status": "warning", "message": "Orderbook Error: No Data", "data": objTempOrderBook.data });
        }
        else if (objTempOrderBook.data.stat === "Ok") {
            res.send({ "status": "success", "message": "Orderbook Details Received!", "data": objTempOrderBook.data });
        }
        else {
            res.send({ "status": "danger", "message": "Unknown Error at Orderbook", "data": objTempOrderBook.data });
        }
    }
    catch (err) {
        res.send({ "status": "danger", "message": err.message, "data": err.data });
    }
}

exports.fnPlaceOptionBracketOrder = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    let vOrderQty = req.body.OptQty;
    let vLotSize = req.body.LotSize;
    let vToken = req.body.Token;
    let vExchSeg = req.body.ExchSeg;
    let vBorS = req.body.BorS;
    let vTrdSymbol = req.body.TrdSymbol;
    let vOptionType = req.body.OptionType;
    let vSearchSymbol = req.body.SearchSymbol;
    let vStrikePrice = req.body.StrikePrice;
    let vCurrRate = req.body.CurrRate;
    let vMaxOrderQty = req.body.MaxOptQty;
    let vMultOrdId = req.body.MultOrdId;
    let vPointsSL = req.body.PointsSL;
    let vPointsTP = req.body.PointsTP;
    let objTempOrderBook = "";

    try {
        let vLoopNos = Math.ceil(parseInt(vOrderQty) / parseInt(vMaxOrderQty));
        let vExecTempQty = vOrderQty;

        // Uncomment for Real Trade
        for(let i=0; i<vLoopNos; i++){
            if(i === (vLoopNos - 1)){
                let vTempData = await fnExecOptBracketOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vExecTempQty) * parseInt(vLotSize)), vLotSize, vMultOrdId, vCurrRate, vPointsSL, vPointsTP);
            }
            else{
                let vTempData = await fnExecOptBracketOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vMaxOrderQty) * parseInt(vLotSize)), vLotSize, vMultOrdId, vCurrRate, vPointsSL, vPointsTP);
            }
            vExecTempQty = parseInt(vExecTempQty) - parseInt(vMaxOrderQty);
        }
        objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);

        let vCumFilledQty = 0;
        let vCumPrice = 0;
        let vRecCount = 0;
        let vExpiryDt = "";

        for (let j = 0; j < objTempOrderBook.data.data.length; j++) {

            if ((objTempOrderBook.data.data[j].algCat === (vMultOrdId).toString()) && (objTempOrderBook.data.data[j].trnsTp === "B") && (objTempOrderBook.data.data[j].ordSt === "complete")) {

                vCumFilledQty += parseInt(objTempOrderBook.data.data[j].fldQty);
                vCumPrice += parseFloat(objTempOrderBook.data.data[j].avgPrc);
                vExpiryDt = objTempOrderBook.data.data[j].expDt;
                vRecCount += 1;
            }
        }
        vCumFilledQty = vCumFilledQty / parseInt(vLotSize);
        vCumPrice = vCumPrice / vRecCount;

        if (vCumFilledQty > 0) {
            let vOrdrCnfData = { TradeID: vMultOrdId, SymToken: vToken, ClientID: "", SearchSymbol: vSearchSymbol, TrdSymbol: vTrdSymbol, Expiry: vExpiryDt, Strike: (parseInt(vStrikePrice) / 100), ByorSl: vBorS, OptionType: vOptionType, LotSize: vLotSize, Quantity: vCumFilledQty, BuyPrice: vCumPrice, SellPrice: vCumPrice, ProfitLoss: 0, StopLoss: 10, TakeProfit: 20, TrailSL: 0, EntryDT: "", ExitDT: "", ExchSeg: vExchSeg, MaxOrderQty: vMaxOrderQty };

            res.send({ status: "success", message: "BO Placed Successfully", data: vOrdrCnfData });
        }
        else {
            res.send({ status: "danger", message: "BO Rejected, Please check Orderbook!", data: "" });
        }
    }
    catch (error) {
        console.log(error);
        res.send({ status: "danger", message: "Option Order - " + error.message, data: error.data });
    }    
}

exports.fnPlaceOptionNormalOrder1 = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    let vOrderQty = req.body.OptQty;
    let vLotSize = req.body.LotSize;
    let vToken = req.body.Token;
    let vExchSeg = req.body.ExchSeg;
    let vBorS = req.body.BorS;
    let vTrdSymbol = req.body.TrdSymbol;
    let vOptionType = req.body.OptionType;
    let vSearchSymbol = req.body.SearchSymbol;
    let vStrikePrice = req.body.StrikePrice;
    let vCurrRate = req.body.CurrRate;
    let vMaxOrderQty = req.body.MaxOptQty;
    let vMultOrdId = req.body.MultOrdId;
    // let objOrderData = { OrderData: [] };
    let objTempOrderBook = "";

    try {
        let vLoopNos = Math.ceil(parseInt(vOrderQty) / parseInt(vMaxOrderQty));
        let vExecTempQty = vOrderQty;

        // Uncomment for Real Trade
        for(let i=0; i<vLoopNos; i++){
            if(i === (vLoopNos - 1)){
                let vTempData = await fnExecOptNrmlOrder1(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vExecTempQty) * parseInt(vLotSize)), vLotSize, vMultOrdId);
                // objOrderData.OrderData.push(vTempData.data);
            }
            else{
                let vTempData = await fnExecOptNrmlOrder1(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vMaxOrderQty) * parseInt(vLotSize)), vLotSize, vMultOrdId);
                // objOrderData.OrderData.push(vTempData.data);
            }
            vExecTempQty = parseInt(vExecTempQty) - parseInt(vMaxOrderQty);
        }
        objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        // objTempOrderBook = objTempOrderBook.data;
        // Uncomment for Real Trade

        // // Temp Orderbook, comment for Real Orderbook
        // vMultOrdId = "1748491028677"; //"1748492054242";
        // objTempOrderBook = await fnTempOrderbook();
        // objTempOrderBook = objTempOrderBook.data;
        // // Temp Orderbook, comment for Real Orderbook

        let vCumFilledQty = 0;
        let vCumPrice = 0;
        let vRecCount = 0;
        let vExpiryDt = "";

        // console.log("MultiID: " + vMultOrdId);

        for (let j = 0; j < objTempOrderBook.data.data.length; j++) {

            if ((objTempOrderBook.data.data[j].algCat === (vMultOrdId).toString()) && (objTempOrderBook.data.data[j].trnsTp === "B") && (objTempOrderBook.data.data[j].ordSt === "complete")) {
                // console.log(objTempOrderBook.data.data[j].trnsTp);

                vCumFilledQty += parseInt(objTempOrderBook.data.data[j].fldQty);
                vCumPrice += parseFloat(objTempOrderBook.data.data[j].avgPrc);
                vExpiryDt = objTempOrderBook.data.data[j].expDt;
                vRecCount += 1;
            }
        }
        vCumFilledQty = vCumFilledQty / parseInt(vLotSize);
        vCumPrice = vCumPrice / vRecCount;

        if (vCumFilledQty > 0) {
            let vOrdrCnfData = { TradeID: vMultOrdId, SymToken: vToken, ClientID: "", SearchSymbol: vSearchSymbol, TrdSymbol: vTrdSymbol, Expiry: vExpiryDt, Strike: (parseInt(vStrikePrice) / 100), ByorSl: vBorS, OptionType: vOptionType, LotSize: vLotSize, Quantity: vCumFilledQty, BuyPrice: vCumPrice, SellPrice: vCumPrice, ProfitLoss: 0, StopLoss: 10, TakeProfit: 20, TrailSL: 0, EntryDT: "", ExitDT: "", ExchSeg: vExchSeg, MaxOrderQty: vMaxOrderQty };

            res.send({ status: "success", message: "Order Placed Successfully", data: vOrdrCnfData });
        }
        else {
            res.send({ status: "danger", message: "Order Rejected, Please check Orderbook!", data: "" });
        }
    }
    catch (error) {
        console.log(error);
        res.send({ status: "danger", message: "Option Order - " + error.message, data: error.data });
    }
}

exports.fnGetTradeBook = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    try {
        // // Real Orderbook, comment for Temp Orderbook
        // let objOrderDtls = await fnGetTradeDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        // // Real Orderbook, comment for Temp Orderbook

        // Temp Orderbook, comment for Real Orderbook
        let objOrderDtls = await fnTempTradebook();
        // Temp Orderbook, comment for Real Orderbook

        if (objOrderDtls.data.stat === "Not_Ok") {
            res.send({ "status": "warning", "message": "Tradebook: " + objOrderDtls.data.errMsg, "data": objOrderDtls.data });
        }
        else if (objOrderDtls.data.stat === "ok") {
            res.send({ "status": "success", "message": "Tradebook Details Received!", "data": objOrderDtls.data });
        }
        else {
            res.send({ "status": "danger", "message": "Unknown Error at Tradebook", "data": objOrderDtls.data });
        }
    }
    catch (err) {
        res.send({ "status": "danger", "message": err.message, "data": err.data });
    }
}

exports.fnPlaceCloseTrade = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;
    let vTradeID = req.body.TradeID;
    let vSymbToken = req.body.SymToken;
    let vClientID = req.body.ClientID;
    let vTrdSymbol = req.body.TrdSymbol;
    let vExpiry = req.body.Expiry;
    let vStrike = req.body.Strike;
    let vBorS = req.body.BorS;
    let vOptionType = req.body.OptionType;
    let vLotSize = req.body.LotSize;
    let vQuantity = req.body.Quantity;
    let vBuyPrice = req.body.BuyPrice;
    let vSellPrice = req.body.SellPrice;
    let vExchSeg = req.body.ExchSeg;
    let vEntryDT = req.body.EntryDT;
    let vExitDT = req.body.ExitDT;
    let vTempLTP = "";
    let objOrder, objOrderDtls = "";

    if (vBorS = "S") {
        vTempLTP = vSellPrice;
    }
    else {
        vTempLTP = vBuyPrice;
    }

    try {
        // objOrder = vTradeID;
        // objOrderDtls = {
        //     "tid": "server3_282711",
        //     "stat": "Ok",
        //     "stCode": 200,
        //     "data": [
        //         {
        //             "brkClnt": "08081",
        //             "ordValDt": "NA",
        //             "exUsrInfo": "NA",
        //             "mfdBy": "NA",
        //             "vendorCode": "",
        //             "rmk": "--",
        //             "odCrt": "NA",
        //             "ordSrc": "ADMINCPPAPI_TRADEAPI",
        //             "sipInd": "NA",
        //             "prc": "0.00",
        //             "prcTp": "MKT",
        //             "cnlQty": 0,
        //             "uSec": "799513",
        //             "classification": "0",
        //             "mktPro": "0.00",
        //             "ordEntTm": "05-Nov-2024 09:32:52",
        //             "reqId": "1",
        //             "algSeqNo": "NA",
        //             "qty": vOrderQty,
        //             "unFldSz": 0,
        //             "mktProPct": "--",
        //             "algCat": "NA",
        //             "exOrdId": "1300000006110360",
        //             "dscQty": 0,
        //             "actId": "XIAVR",
        //             "expDt": "NA",
        //             "trgPrc": "0.00",
        //             "tok": "3499",
        //             "symOrdId": "NA",
        //             "fldQty": 1,
        //             "ordDtTm": "05-Nov-2024 09:32:52",
        //             "avgPrc": vTempLTP,
        //             "locId": "111111111111100",
        //             "algId": "NA",
        //             "stat": "Ok",
        //             "prod": "MIS",
        //             "exSeg": "nse_cm",
        //             "GuiOrdId": "1730779372-793970-AOGPK8647F-ADMINAPI",
        //             "usrId": "AOGPK8647F",
        //             "rptTp": "NA",
        //             "exCfmTm": "05-Nov-2024 09:32:52",
        //             "hsUpTm": "2024/11/05 09:32:52",
        //             "updRecvTm": 1730779372800102400,
        //             "ordGenTp": "NA",
        //             "vldt": "DAY",
        //             "tckSz": "0.01",
        //             "ordSt": "complete",
        //             "trnsTp": vBorS,
        //             "refLmtPrc": 0,
        //             "coPct": 0,
        //             "nOrdNo": "241105000099999",
        //             "ordAutSt": "NA",
        //             "strategyCode": "NA",
        //             "rejRsn": "--",
        //             "boeSec": 1730779372,
        //             "expDtSsb": "--",
        //             "dscQtyPct": "0",
        //             "stkPrc": "0.00",
        //             "sym": "TATASTEEL",
        //             "trdSym": "TATASTEEL-EQ",
        //             "multiplier": "1",
        //             "precision": "2",
        //             "noMktProFlg": "0.00",
        //             "genNum": "1",
        //             "series": "EQ",
        //             "prcNum": "1",
        //             "genDen": "1",
        //             "brdLtQty": "1",
        //             "mktProFlg": "0.00",
        //             "defMktProV": "0.00",
        //             "lotSz": "2",
        //             "minQty": 0,
        //             "optTp": "XX",
        //             "prcDen": "1"
        //         }
        //     ]
        // }
        // res.send({ "status": "success", "message": "Close Order Details Received!", "data": objOrderDtls, "nOrdNo": objOrder });

        objOrder = await fnExecCloseOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vSymbToken, vTrdSymbol, vBorS, vOrderQty, vOrderNo);
        // console.log(JSON.stringify(objOrder.data));
        if(objOrder.data.stat === "Ok"){

            objOrderDtls = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);

            res.send({ "status": "success", "message": "Closed Order Details Received!", "data": objOrderDtls.data, "nOrdNo" : objOrder.data.nOrdNo });
        }
        else{
            res.send({ "status": "danger", "message": "Placing Order Failed", "data": "" });
        }
    }
    catch (err) {
        //console.log("At fnGetRealClosedPosiDetails: " + err.data);
        res.send({ "status": err.status, "message": err.message, "data": err.data });
    }
}

exports.fnGetTokenforOptionRate = async (req, res) => {
    let vJsonFileName = req.body.JsonFileName;
    let vSearchSymbol = req.body.SearchSymbol;
    let vOptionType = req.body.OptionType;
    let vExpiryEpoch = req.body.ExpiryEpoch;
    let vStrikePrice = req.body.StrikePrice;

    try {
        let objTokenData = await fnGetTradeTokenData(vJsonFileName, vSearchSymbol, vOptionType, vExpiryEpoch, vStrikePrice);

        // console.log(objTokenData);
        res.send({ status: objTokenData.status, message: objTokenData.message, data: objTokenData.data });
    }
    catch (err) {
        res.send({ status: err.status, message: err.message, data: err.data });
    }
}

exports.fnPlaceOptionNormalOrder = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    let vOrderQty = req.body.OptQty;
    let vLotSize = req.body.LotSize;
    let vToken = req.body.Token;
    let vExchSeg = req.body.ExchSeg;
    let vBorS = req.body.BorS;
    let vTrdSymbol = req.body.TrdSymbol;
    let vOptionType = req.body.OptionType;
    let vSearchSymbol = req.body.SearchSymbol;
    let vStrikePrice = req.body.StrikePrice;
    let vCurrRate = req.body.CurrRate;
    let vMaxOrderQty = req.body.MaxOptQty;
    let vGuid = req.body.Guid;

    let objOrderData = { OrderData: [] };
    let objTempOrderBook = "";

    try {
        //Single to Multiple Trade Orders for Real Trades. comment it if paper trade is on
        let vLoopNos = Math.ceil(parseInt(vOrderQty) / parseInt(vMaxOrderQty));
        let vExecTempQty = vOrderQty;

        for (let i = 0; i < vLoopNos; i++) {
            if (i === (vLoopNos - 1)) {
                let vTempData = await fnExecOptNrmlOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vExecTempQty) * parseInt(vLotSize)), vLotSize);
                objOrderData.OrderData.push(vTempData.data);
            }
            else {
                let vTempData = await fnExecOptNrmlOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vMaxOrderQty) * parseInt(vLotSize)), vLotSize);
                objOrderData.OrderData.push(vTempData.data);
            }
            vExecTempQty = parseInt(vExecTempQty) - parseInt(vMaxOrderQty);
        }
        objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        objTempOrderBook = objTempOrderBook.data;
        //Single to Multiple Trade Orders for Real Trades

        let vCumFilledQty = 0;
        let vCumPrice = 0;
        let vRecCount = 0;
        let vExpiryDt = "";

        for (let i = 0; i < objOrderData.OrderData.length; i++) {
            for (let j = 0; j < objTempOrderBook.data.length; j++) {
                if ((objOrderData.OrderData[i].nOrdNo === objTempOrderBook.data[j].nOrdNo) && (objTempOrderBook.data[j].ordSt === "complete")) {
                    vCumFilledQty += parseInt(objTempOrderBook.data[j].fldQty);
                    vCumPrice += parseFloat(objTempOrderBook.data[j].avgPrc);
                    vExpiryDt = objTempOrderBook.data[j].expDt;
                    vRecCount += 1;
                }
            }
        }
        vCumFilledQty = vCumFilledQty / parseInt(vLotSize);
        vCumPrice = vCumPrice / vRecCount;

        if (vCumFilledQty > 0) {
            let vOrdrCnfData = { TradeID: "", SymToken: vToken, ClientID: "", SearchSymbol: vSearchSymbol, TrdSymbol: vTrdSymbol, Expiry: vExpiryDt, Strike: (parseInt(vStrikePrice) / 100), ByorSl: vBorS, OptionType: vOptionType, LotSize: vLotSize, Quantity: vCumFilledQty, BuyPrice: vCumPrice, SellPrice: vCumPrice, ProfitLoss: 0, StopLoss: 10, TakeProfit: 20, TrailSL: 0, EntryDT: "", ExitDT: "", ExchSeg: vExchSeg, MaxOrderQty: vMaxOrderQty };

            res.send({ status: "success", message: "Order Placed Successfully", data: vOrdrCnfData });
        }
        else {
            res.send({ status: "danger", message: "Order Rejected, Please check Orderbook!", data: "" });
        }
    }
    catch (err) {
        console.log(err);
        res.send({ status: "danger", message: "Option Order - " + err.message, data: err.data });
    }
}

exports.fnPlaceCloseOptTrade = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    let vOrderQty = req.body.OptQty;
    let vLotSize = req.body.LotSize;
    let vToken = req.body.SymToken;
    let vExchSeg = req.body.ExchSeg;
    let vBorS = req.body.BorS;
    let vTrdSymbol = req.body.TrdSymbol;

    let vMaxOrderQty = req.body.MaxOptQty;

    try {
        let vLoopNos = Math.ceil(parseInt(vOrderQty) / parseInt(vMaxOrderQty));
        let vExecTempQty = vOrderQty;

        let objOrderData = { OrderData: [] };

        for (let i = 0; i < vLoopNos; i++) {
            if (i === (vLoopNos - 1)) {
                let vTempData = await fnExecOptNrmlOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vExecTempQty) * parseInt(vLotSize)), vLotSize);
                objOrderData.OrderData.push(vTempData.data);
            }
            else {
                let vTempData = await fnExecOptNrmlOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vMaxOrderQty) * parseInt(vLotSize)), vLotSize);
                objOrderData.OrderData.push(vTempData.data);
            }
            vExecTempQty = parseInt(vExecTempQty) - parseInt(vMaxOrderQty);
        }

        let objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        objTempOrderBook = objTempOrderBook.data;

        let vCumFilledQty = 0;
        let vCumPrice = 0;
        let vRecCount = 0;
        let vExpiryDt = "";

        for (let i = 0; i < objOrderData.OrderData.length; i++) {
            for (let j = 0; j < objTempOrderBook.data.length; j++) {
                if ((objOrderData.OrderData[i].nOrdNo === objTempOrderBook.data[j].nOrdNo) && (objTempOrderBook.data[j].ordSt === "complete")) {
                    vCumFilledQty += parseInt(objTempOrderBook.data[j].fldQty);
                    vCumPrice += parseFloat(objTempOrderBook.data[j].avgPrc);
                    vExpiryDt = objTempOrderBook.data[j].expDt;
                    vRecCount += 1;
                }
            }
        }

        vCumFilledQty = vCumFilledQty / parseInt(vLotSize);
        vCumPrice = vCumPrice / vRecCount;

        if (vCumFilledQty > 0) {
            let vOrdrCnfData = { TradeID: "", SymToken: vToken, ClientID: "", SearchSymbol: vSearchSymbol, TrdSymbol: vTrdSymbol, Expiry: vExpiryDt, Strike: (parseInt(vStrikePrice) / 100), ByorSl: vBorS, OptionType: vOptionType, LotSize: vLotSize, Quantity: vCumFilledQty, BuyPrice: vCumPrice, SellPrice: vCumPrice, ProfitLoss: 0, StopLoss: 10, TakeProfit: 20, TrailSL: 0, EntryDT: "", ExitDT: "", ExchSeg: vExchSeg, MaxOrderQty: vMaxOrderQty };

            res.send({ status: "success", message: "Order Placed Successfully", data: vOrdrCnfData });
        }
        else {
            res.send({ status: "danger", message: "Order Rejected, Please check Orderbook!", data: "" });
        }
    }
    catch (err) {
        console.log("Test");
        res.send({ status: "danger", message: "Option Order - " + err.message, data: err.data });
    }
}

exports.fnPlaceCloseOptTrade1 = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;

    let vOrderQty = req.body.OptQty;
    let vLotSize = req.body.LotSize;
    let vToken = req.body.SymToken;
    let vExchSeg = req.body.ExchSeg;
    let vBorS = req.body.BorS;
    let vTrdSymbol = req.body.TrdSymbol;
    let vMaxOrderQty = req.body.MaxOptQty;
    let vMultOrdId = req.body.MultOrdId;
    let vAvgPrc = req.body.CurrPrice;
    let objOrderData = { OrderData: [] };
    let objTempOrderBook = "";

    // // comment for Real trade
    // vMultOrdId = "1748491028677"; //"1748492054242";
    // // console.log(vMultOrdId);
    // // comment for Real trade

    try {
        let vAvailableQty = 0;

        // Uncomment for Real trade
        objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
        // objTempOrderBook = objTempOrderBook.data;
        // Uncomment for Real trade
        // // comment for Real trade
        // objTempOrderBook = await fnTempOrderbook();
        // objTempOrderBook = objTempOrderBook.data;
        // // comment for Real trade

        for (let j = 0; j < objTempOrderBook.data.data.length; j++) {
            if ((objTempOrderBook.data.data[j].algCat === (vMultOrdId).toString()) && (objTempOrderBook.data.data[j].ordSt === "complete")) {
                if (objTempOrderBook.data.data[j].trnsTp === "B") {
                    vAvailableQty += parseInt(objTempOrderBook.data.data[j].fldQty)
                }
                else if (objTempOrderBook.data.data[j].trnsTp === "S") {
                    vAvailableQty -= parseInt(objTempOrderBook.data.data[j].fldQty)
                }
            }
        }
        let vToExecQty = parseInt(vAvailableQty) / parseInt(vLotSize);
        let vBalQty = 0;

        if(parseInt(vOrderQty) > vToExecQty){
            vOrderQty = vToExecQty;
            vBalQty = 0;
        }
        else{
            vBalQty = vToExecQty - vOrderQty;
        }

        console.log("Available Qty: " + vAvailableQty);
        console.log("Qty To Exec: " + vToExecQty);
        console.log("Order Qty: " + vOrderQty);
        console.log("Balance Qty: " + vBalQty);

        if (vOrderQty === 0) {
            console.log("No Open Position Available");
            res.send({ status: "success", message: "No Open Position Available to Close!", data: { BalQty: vBalQty, AvgPrc: 0, ClsdQty: vOrderQty } });
        }
        else if (vOrderQty > 0) {
            let vLoopNos = Math.ceil(parseInt(vOrderQty) / parseInt(vMaxOrderQty));
            let vExecTempQty = vOrderQty;

            console.log("Loop Nos: " + vLoopNos);

            // Uncomment for Real Trade
            for(let i=0; i<vLoopNos; i++){
                if(i === (vLoopNos - 1)){
                    let vTempData = await fnExecOptNrmlOrder1(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vExecTempQty) * parseInt(vLotSize)), vLotSize, vMultOrdId);
                    objOrderData.OrderData.push(vTempData.data);
                }
                else{
                    let vTempData = await fnExecOptNrmlOrder1(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vMaxOrderQty) * parseInt(vLotSize)), vLotSize, vMultOrdId);
                    objOrderData.OrderData.push(vTempData.data);
                }
                vExecTempQty = parseInt(vExecTempQty) - parseInt(vMaxOrderQty);
            }
            objTempOrderBook = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);
            // objTempOrderBook = objTempOrderBook.data;

            let vCumFilledQty = 0;
            let vCumPrice = 0;
            let vRecCount = 0;

            for (let i = 0; i < objOrderData.OrderData.length; i++) {
                for (let j = 0; j < objTempOrderBook.data.data.length; j++) {
                    if ((objOrderData.OrderData[i].nOrdNo === objTempOrderBook.data.data[j].nOrdNo) && (objTempOrderBook.data.data[j].ordSt === "complete")) {
                        vCumFilledQty += parseInt(objTempOrderBook.data.data[j].fldQty);
                        vCumPrice += parseFloat(objTempOrderBook.data.data[j].avgPrc);
                        vRecCount += 1;
                    }
                }
            }
            vCumFilledQty = vCumFilledQty / parseInt(vLotSize);
            vCumPrice = vCumPrice / vRecCount;

            if (vCumFilledQty > 0){
                res.send({ status: "success", message: "Option Order - Closed!", data: { BalQty: vBalQty, AvgPrc: vCumPrice, ClsdQty: vOrderQty } });
            }
            else{
                res.send({ status: "danger", message: "Order Rejected, Please check Orderbook!", data: "" });
            }
            // Uncomment for Real Trade

            console.log("Position/s Closed!");
            // // comment for Real Trade
            // res.send({ status: "success", message: "Option Order - Closed!", data: { BalQty: vBalQty, AvgPrc: vAvgPrc, ClsdQty: vOrderQty } });
            // // comment for Real Trade
        }
    }
    catch (error) {
        console.log(error);
        res.send({ status: "danger", message: "Option Order - " + error.message, data: error.data });
    }
}

exports.fnExecBackupRate = async (req, res) => {
    let vExchSeg = req.body.ExchSeg;
    let vSymbToken = req.body.SymbToken;
    let vSid = req.body.Sid;
    let vKotakSession = req.body.KotakSession;
    let vAccessToken = req.body.AccessToken;

    try {
        let objData = await fnGetBackupRate(vExchSeg, vSymbToken, vSid, vKotakSession, vAccessToken);

        console.log(objData);
        // if(objOrderDtls.data.stat === "Not_Ok"){
        //     res.send({ "status": "warning", "message": "Tradebook Error: " + objOrderDtls.data.errMsg, "data": objOrderDtls.data });
        // }
        // else if(objOrderDtls.data.stat === "Ok"){
        res.send({ "status": "success", "message": "Backup Rate Details Received!", "data": objData.data });
        // }
        // else{
        //     res.send({ "status": "danger", "message": "Unknown Error at Tradebook", "data": objOrderDtls.data });
        // }
    }
    catch (err) {
        res.send({ "status": "danger", "message": err.message, "data": err.data });
    }
}

const fnGetAccessToken = async (pConsumerKey, pConsumerSecret, pUserNameAPI, pPasswordAPI) => {
    const objAccessToken = new Promise((resolve, reject) => {
        const vConsumerStr = pConsumerKey + ":" + pConsumerSecret;
        const vBase64Str = Buffer.from(vConsumerStr).toString('base64');

        let data = JSON.stringify({
            'grant_type': 'password',
            'username': pUserNameAPI,
            'password': pPasswordAPI
        });

        let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: "https://napi.kotaksecurities.com/oauth2/token",
            headers: {
                'Authorization': 'Basic ' + vBase64Str,
                'Content-Type': 'application/json'
            },
            data: data,
        };

        axios
            .request(config)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "Access Token Received!", "data": objResponse.data.access_token });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "At Get Access Token: " + error.message, "data": error });
            })
    });

    return objAccessToken;
};

const fnGetViewToken = async (pMobileNo, pPassword, pAccessToken) => {
    const objViewToken = new Promise((resolve, reject) => {

        let data = JSON.stringify({
            "mobileNumber": pMobileNo,
            "password": pPassword
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/login/1.0/login/v2/validate',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: data
        };

        axios
            .request(config)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "View Token Received!", "data": objResponse.data });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "At Get View Token: " + error.message, "data": error });
            })
    });

    return objViewToken;
}

const fnParseJwt = (pToken) => {
    try {
        return JSON.parse(atob(pToken.split('.')[1]));
    }
    catch (e) {
        return null;
    }
}

const fnGetKotakSession = async (pSubUserId, pMpin, pSid, pViewToken, pAccessToken) => {
    const objSession = new Promise((resolve, reject) => {
        let data = JSON.stringify({
            "userId": pSubUserId,
            "mpin": pMpin
        });

        let config = {
            method: 'post',
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

        //console.log(pAccessToken);

        axios.request(config)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "Session Received!", "data": objResponse.data });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "At Get Kotak Session: " + error.message, "data": error });
            });
    });

    return objSession;
}

const fnGetUserLimits = async (pHsServerId, pSid, pViewToken, pAccessToken) => {
    const objLimits = new Promise((resolve, reject) => {
        let data = qs.stringify({
            'jData': '{"seg":"ALL","exch":"ALL","prod":"ALL"}'
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/user/limits?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pViewToken,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: data
        };

        axios.request(config)
            .then((objResponse) => {
                //console.log(objResponse.data);
                resolve({ "status": "success", "message": "User Limits Received!", "data": objResponse.data });
            })
            .catch((error) => {
                console.log(error);
                reject({ "status": "danger", "message": "At Get User Limits: " + error.message, "data": error });
            });
    });

    return objLimits;
}

const fnExecNormalOrder = async (pHsServerId, pSid, pKotakSession, pAccessToken, pExchSeg, pSymbToken, pTrdSymbol, pBorS, pOrderQty, pRandId) => {
    const objData = new Promise((resolve, reject) => {

        let data = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"' + pBorS + '", "algId":"' + pRandId + '"}' });
        // let data = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"'+ pBorS + '"}' });

        //Session Token not ViewToken

        let objConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/order/rule/ms/place?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pKotakSession,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: data
        };

        axios.request(objConfig)
            .then((objResponse) => {
                // console.log(JSON.stringify(objResponse.data));
                resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "Error in Placing the Order. " + error.message, "data": error.message });
                console.log(error);
            });
    });
    return objData;
}

const fnExecOptNrmlOrder = async (pHsServerId, pSid, pKotakSession, pAccessToken, pExchSeg, pSymbToken, pTrdSymbol, pBorS, pOrderQty, pLotSize) => {
    const objData = new Promise((resolve, reject) => {

        let data = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"' + pBorS + '", "ig":"TestGUID", "sc":"TestTag"}' });

        let objConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/order/rule/ms/place?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pKotakSession,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: data
        };

        axios.request(objConfig)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "Errrrrrr... " + error.message, "data": error.message });
                console.log("Errrrrrrrr--------");
                console.log(error);
            });
    });
    return objData;
}

const fnGetOrderDetails = async (pHsServerId, pSid, pKotakSession, pAccessToken) => {
    const objData = new Promise((resolve, reject) => {
        var objConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/user/orders?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pKotakSession,
                'neo-fin-key': 'neotradeapi',
                'Authorization': 'Bearer ' + pAccessToken
            }
        };

        axios(objConfig)
            .then(function (objResponse) {
                //console.log(JSON.stringify(objResponse.data));
                resolve({ "status": "success", "message": "Orderbook Details Received!", "data": objResponse.data });
            })
            .catch(function (error) {
                console.log(error);
                reject({ "status": "danger", "message": "Orderbook Error: " + error.message, "data": error.message });
            });
    });
    return objData;
}

const fnTempOrderbook = async () => {
    const objPromise = new Promise((resolve, reject) => {

        let objOrderbook = {
            "stat": "Ok",
            "data": [
                {
                    "actId": "XIAVR",
                    "algId": "NA",
                    "algCat": "1748491028677",
                    "algSeqNo": "NA",
                    "avgPrc": "151.05",
                    "brdLtQty": "75",
                    "brkClnt": "08081",
                    "cnlQty": 0,
                    "coPct": 0,
                    "defMktProV": "0",
                    "dscQtyPct": "0",
                    "dscQty": 0,
                    "exUsrInfo": "NA",
                    "exCfmTm": "29-May-2025 09:27:07",
                    "exOrdId": "1000000014624361",
                    "expDt": "29 May, 2025",
                    "expDtSsb": "1748476800",
                    "exSeg": "nse_fo",
                    "fldQty": 375,
                    "boeSec": 1748491027,
                    "mktProPct": "--",
                    "mktPro": "0",
                    "mfdBy": "NA",
                    "minQty": 0,
                    "mktProFlg": "0",
                    "noMktProFlg": "0",
                    "nOrdNo": "250529000102866",
                    "optTp": "CE",
                    "ordAutSt": "NA",
                    "odCrt": "NA",
                    "ordDtTm": "29-May-2025 09:27:07",
                    "ordEntTm": "29-May-2025 09:27:07",
                    "ordGenTp": "NA",
                    "ordSrc": "ADMINCPPAPI_TRADEAPI",
                    "ordValDt": "NA",
                    "prod": "MIS",
                    "prc": "0.00",
                    "prcTp": "MKT",
                    "qty": 375,
                    "refLmtPrc": 0,
                    "rejRsn": "--",
                    "rmk": "--",
                    "rptTp": "NA",
                    "reqId": "1",
                    "series": "XX",
                    "sipInd": "NA",
                    "stat": "complete",
                    "ordSt": "complete",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "symOrdId": "NA",
                    "tckSz": "0.0500",
                    "tok": "61727",
                    "trnsTp": "B",
                    "trgPrc": "0.00",
                    "trdSym": "NIFTY25MAY24850CE",
                    "unFldSz": 0,
                    "usrId": "AOGPK8647F",
                    "uSec": "1748491027",
                    "vldt": "DAY",
                    "classification": "0",
                    "vendorCode": "",
                    "genDen": "1",
                    "genNum": "1",
                    "prcNum": "1",
                    "prcDen": "1",
                    "lotSz": "75",
                    "multiplier": "1",
                    "precision": "2",
                    "hsUpTm": "2025/05/29 09:27:07",
                    "GuiOrdId": "XIAVR-4c5c07a8-e09d-48cf-92b1-2d26ebb5115b",
                    "locId": "111111111111100",
                    "appInstlId": "NA",
                    "ordModNo": "XIAVR-4c5c07a8-e09d-48cf-92b1-2d26ebb5115b",
                    "strategyCode": "1",
                    "updRecvTm": 1748491027786793500,
                    "it": "OPTIDX"
                }
            ],
            "stCode": 200
        }
        resolve({ "status": "success", "message": "Orderbook Details Received!", "data": objOrderbook });
    });
    return objPromise;
}

const fnTempTradebook = async () => {
    const objPromise = new Promise((resolve, reject) => {

        let objOrderbook = {
            "stat": "ok",
            "stCode": 200,
            "data": [
                {
                    "actId": "XIAVR",
                    "algCat": "NA",
                    "algId": "NA",
                    "avgPrc": "128.10",
                    "boeSec": 1750394786,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000035759799",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:16:26",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1211568",
                    "flLeg": 1,
                    "flTm": "10:16:26",
                    "minQty": 0,
                    "nOrdNo": "250620000175536",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:16:26",
                    "GuiOrdId": "XIAVR-ae72fda2-77d5-4bac-939d-ac743105f4b9",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394786761223700,
                    "uSec": "1750394786",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "164.20",
                    "boeSec": 1750392377,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016096505",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:17",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "528211",
                    "flLeg": 1,
                    "flTm": "09:36:17",
                    "minQty": 0,
                    "nOrdNo": "250620000085937",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:17",
                    "GuiOrdId": "XIAVR-060f38a0-79e7-443e-8144-86d737013be3",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392377022127000,
                    "uSec": "1750392377",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "164.15",
                    "boeSec": 1750392377,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016096505",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:17",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "528212",
                    "flLeg": 1,
                    "flTm": "09:36:17",
                    "minQty": 0,
                    "nOrdNo": "250620000085937",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:17",
                    "GuiOrdId": "XIAVR-060f38a0-79e7-443e-8144-86d737013be3",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392377025544000,
                    "uSec": "1750392377",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.60",
                    "boeSec": 1750392424,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016556263",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:37:04",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "538602",
                    "flLeg": 1,
                    "flTm": "09:37:04",
                    "minQty": 0,
                    "nOrdNo": "250620000087744",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:37:04",
                    "GuiOrdId": "XIAVR-3ffc83c5-4ee3-4a30-b42f-7ac5836f6def",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392424028234200,
                    "uSec": "1750392424",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.60",
                    "boeSec": 1750392424,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016556263",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:37:04",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "538603",
                    "flLeg": 1,
                    "flTm": "09:37:04",
                    "minQty": 0,
                    "nOrdNo": "250620000087744",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:37:04",
                    "GuiOrdId": "XIAVR-3ffc83c5-4ee3-4a30-b42f-7ac5836f6def",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392424035731700,
                    "uSec": "1750392424",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393564742",
                    "algId": "NA",
                    "avgPrc": "185.00",
                    "boeSec": 1750394024,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000032495823",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:03:44",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "981966",
                    "flLeg": 1,
                    "flTm": "10:03:44",
                    "minQty": 0,
                    "nOrdNo": "250620000148701",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:03:44",
                    "GuiOrdId": "XIAVR-0ee088f2-fa85-455e-a492-4543eee6e408",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394024684465000,
                    "uSec": "1750394024",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394527955",
                    "algId": "NA",
                    "avgPrc": "197.40",
                    "boeSec": 1750394743,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000035078395",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:15:43",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1168907",
                    "flLeg": 1,
                    "flTm": "10:15:43",
                    "minQty": 0,
                    "nOrdNo": "250620000172784",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:15:43",
                    "GuiOrdId": "XIAVR-7050bb1c-6eef-4de7-9998-7ecf78b69a73",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394743913214500,
                    "uSec": "1750394743",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "155.45",
                    "boeSec": 1750392147,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000013524431",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:32:27",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "463628",
                    "flLeg": 1,
                    "flTm": "09:32:27",
                    "minQty": 0,
                    "nOrdNo": "250620000075964",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:32:27",
                    "GuiOrdId": "XIAVR-d788febd-c4e2-406a-9cbd-bec7ec0f9964",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392147081346300,
                    "uSec": "1750392147",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "155.40",
                    "boeSec": 1750392147,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000013524431",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:32:27",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "463629",
                    "flLeg": 1,
                    "flTm": "09:32:27",
                    "minQty": 0,
                    "nOrdNo": "250620000075964",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:32:27",
                    "GuiOrdId": "XIAVR-d788febd-c4e2-406a-9cbd-bec7ec0f9964",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392147083894500,
                    "uSec": "1750392147",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "155.45",
                    "boeSec": 1750392147,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000013524431",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:32:27",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "463627",
                    "flLeg": 1,
                    "flTm": "09:32:27",
                    "minQty": 0,
                    "nOrdNo": "250620000075964",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:32:27",
                    "GuiOrdId": "XIAVR-d788febd-c4e2-406a-9cbd-bec7ec0f9964",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392147077387000,
                    "uSec": "1750392147",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394527955",
                    "algId": "NA",
                    "avgPrc": "179.85",
                    "boeSec": 1750394528,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000032733002",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:12:08",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1052636",
                    "flLeg": 1,
                    "flTm": "10:12:08",
                    "minQty": 0,
                    "nOrdNo": "250620000163512",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:12:08",
                    "GuiOrdId": "XIAVR-585cdcc2-222c-4f91-b168-d0cf9b2fc76d",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394528360187100,
                    "uSec": "1750394528",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394527955",
                    "algId": "NA",
                    "avgPrc": "179.90",
                    "boeSec": 1750394528,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000032733002",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:12:08",
                    "fldQty": 225,
                    "flDt": "20-Jun-2025",
                    "flId": "1052637",
                    "flLeg": 1,
                    "flTm": "10:12:08",
                    "minQty": 0,
                    "nOrdNo": "250620000163512",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:12:08",
                    "GuiOrdId": "XIAVR-585cdcc2-222c-4f91-b168-d0cf9b2fc76d",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394528365106400,
                    "uSec": "1750394528",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394527955",
                    "algId": "NA",
                    "avgPrc": "188.15",
                    "boeSec": 1750394711,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000034633564",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:15:11",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1140414",
                    "flLeg": 1,
                    "flTm": "10:15:11",
                    "minQty": 0,
                    "nOrdNo": "250620000170945",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:15:11",
                    "GuiOrdId": "XIAVR-f7220df8-59a3-4e2d-9437-bccd7627f83f",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394711647076000,
                    "uSec": "1750394711",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394286713",
                    "algId": "NA",
                    "avgPrc": "141.70",
                    "boeSec": 1750394523,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000032640503",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:12:03",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1045655",
                    "flLeg": 1,
                    "flTm": "10:12:03",
                    "minQty": 0,
                    "nOrdNo": "250620000163257",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:12:03",
                    "GuiOrdId": "XIAVR-6585e324-4a72-4d57-bb58-343e1c324d9f",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394523550628600,
                    "uSec": "1750394523",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392428079",
                    "algId": "NA",
                    "avgPrc": "157.30",
                    "boeSec": 1750392436,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016682277",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:37:16",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "540887",
                    "flLeg": 1,
                    "flTm": "09:37:16",
                    "minQty": 0,
                    "nOrdNo": "250620000088195",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:37:16",
                    "GuiOrdId": "XIAVR-76b1985b-09e6-4a37-82b8-47cdc4dba213",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392436097894100,
                    "uSec": "1750392436",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "157.65",
                    "boeSec": 1750393264,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000022877079",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:04",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "743025",
                    "flLeg": 1,
                    "flTm": "09:51:04",
                    "minQty": 0,
                    "nOrdNo": "250620000122358",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:04",
                    "GuiOrdId": "XIAVR-9ecf413a-23cd-4d82-bbcf-938ac238435a",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393264215114200,
                    "uSec": "1750393264",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "157.65",
                    "boeSec": 1750393264,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000022877079",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:04",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "743026",
                    "flLeg": 1,
                    "flTm": "09:51:04",
                    "minQty": 0,
                    "nOrdNo": "250620000122358",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:04",
                    "GuiOrdId": "XIAVR-9ecf413a-23cd-4d82-bbcf-938ac238435a",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393264237225500,
                    "uSec": "1750393264",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "157.65",
                    "boeSec": 1750393264,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000022877079",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:04",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "743027",
                    "flLeg": 1,
                    "flTm": "09:51:04",
                    "minQty": 0,
                    "nOrdNo": "250620000122358",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:04",
                    "GuiOrdId": "XIAVR-9ecf413a-23cd-4d82-bbcf-938ac238435a",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393264240683800,
                    "uSec": "1750393264",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "157.70",
                    "boeSec": 1750393264,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000022877079",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:04",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "743028",
                    "flLeg": 1,
                    "flTm": "09:51:04",
                    "minQty": 0,
                    "nOrdNo": "250620000122358",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:04",
                    "GuiOrdId": "XIAVR-9ecf413a-23cd-4d82-bbcf-938ac238435a",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393264244878800,
                    "uSec": "1750393264",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "157.70",
                    "boeSec": 1750393264,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000022877079",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:04",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "743029",
                    "flLeg": 1,
                    "flTm": "09:51:04",
                    "minQty": 0,
                    "nOrdNo": "250620000122358",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:04",
                    "GuiOrdId": "XIAVR-9ecf413a-23cd-4d82-bbcf-938ac238435a",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393264250290700,
                    "uSec": "1750393264",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393564742",
                    "algId": "NA",
                    "avgPrc": "179.85",
                    "boeSec": 1750393565,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000028605916",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:56:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "889612",
                    "flLeg": 1,
                    "flTm": "09:56:05",
                    "minQty": 0,
                    "nOrdNo": "250620000133742",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:56:05",
                    "GuiOrdId": "XIAVR-f6eab1d3-388b-4e8a-8d29-6117762f6b2c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393565192011800,
                    "uSec": "1750393565",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 375,
                    "flDt": "20-Jun-2025",
                    "flId": "507112",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307677588500,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "507113",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307682717000,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "507114",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307687777800,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "507115",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307693403400,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 225,
                    "flDt": "20-Jun-2025",
                    "flId": "507108",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307645731300,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "507109",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307651785700,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "507110",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307666545400,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "159.65",
                    "boeSec": 1750392307,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015265198",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:07",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "507111",
                    "flLeg": 1,
                    "flTm": "09:35:07",
                    "minQty": 0,
                    "nOrdNo": "250620000083140",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:07",
                    "GuiOrdId": "XIAVR-04b489f9-9532-4665-9e96-219fd8568f86",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392307672970500,
                    "uSec": "1750392307",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "168.45",
                    "boeSec": 1750392364,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015917531",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:04",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "522813",
                    "flLeg": 1,
                    "flTm": "09:36:04",
                    "minQty": 0,
                    "nOrdNo": "250620000085350",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:04",
                    "GuiOrdId": "XIAVR-78c9d01a-dace-45b7-9bbe-0d6996c7420c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392364422981600,
                    "uSec": "1750392364",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "168.40",
                    "boeSec": 1750392364,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015917531",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:04",
                    "fldQty": 225,
                    "flDt": "20-Jun-2025",
                    "flId": "522814",
                    "flLeg": 1,
                    "flTm": "09:36:04",
                    "minQty": 0,
                    "nOrdNo": "250620000085350",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:04",
                    "GuiOrdId": "XIAVR-78c9d01a-dace-45b7-9bbe-0d6996c7420c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392364425501200,
                    "uSec": "1750392364",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "168.40",
                    "boeSec": 1750392364,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000015917531",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:04",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "522815",
                    "flLeg": 1,
                    "flTm": "09:36:04",
                    "minQty": 0,
                    "nOrdNo": "250620000085350",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:04",
                    "GuiOrdId": "XIAVR-78c9d01a-dace-45b7-9bbe-0d6996c7420c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392364428144600,
                    "uSec": "1750392364",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "167.55",
                    "boeSec": 1750392370,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016013321",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:10",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "525848",
                    "flLeg": 1,
                    "flTm": "09:36:10",
                    "minQty": 0,
                    "nOrdNo": "250620000085641",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:10",
                    "GuiOrdId": "XIAVR-a9204e98-210a-439e-a9b8-3b5db9859343",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392370748113200,
                    "uSec": "1750392370",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "167.60",
                    "boeSec": 1750392370,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016013321",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:10",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "525846",
                    "flLeg": 1,
                    "flTm": "09:36:10",
                    "minQty": 0,
                    "nOrdNo": "250620000085641",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:10",
                    "GuiOrdId": "XIAVR-a9204e98-210a-439e-a9b8-3b5db9859343",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392370733101800,
                    "uSec": "1750392370",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392307209",
                    "algId": "NA",
                    "avgPrc": "167.55",
                    "boeSec": 1750392370,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016013321",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:36:10",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "525847",
                    "flLeg": 1,
                    "flTm": "09:36:10",
                    "minQty": 0,
                    "nOrdNo": "250620000085641",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:36:10",
                    "GuiOrdId": "XIAVR-a9204e98-210a-439e-a9b8-3b5db9859343",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392370740487400,
                    "uSec": "1750392370",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392428079",
                    "algId": "NA",
                    "avgPrc": "157.70",
                    "boeSec": 1750392428,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016605154",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:37:08",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "539566",
                    "flLeg": 1,
                    "flTm": "09:37:08",
                    "minQty": 0,
                    "nOrdNo": "250620000087902",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:37:08",
                    "GuiOrdId": "XIAVR-35b85dad-da80-48d8-bf99-6b080bbebb77",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392428470005500,
                    "uSec": "1750392428",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392428079",
                    "algId": "NA",
                    "avgPrc": "157.75",
                    "boeSec": 1750392428,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000016605154",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:37:08",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "539567",
                    "flLeg": 1,
                    "flTm": "09:37:08",
                    "minQty": 0,
                    "nOrdNo": "250620000087902",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:37:08",
                    "GuiOrdId": "XIAVR-35b85dad-da80-48d8-bf99-6b080bbebb77",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392428474168800,
                    "uSec": "1750392428",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391706098",
                    "algId": "NA",
                    "avgPrc": "150.15",
                    "boeSec": 1750391706,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000007155963",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:25:06",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "287726",
                    "flLeg": 1,
                    "flTm": "09:25:06",
                    "minQty": 0,
                    "nOrdNo": "250620000055273",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:25:06",
                    "GuiOrdId": "XIAVR-1024994e-daa3-42c1-89a8-bcc9a822806f",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391706516558600,
                    "uSec": "1750391706",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391824936",
                    "algId": "NA",
                    "avgPrc": "129.05",
                    "boeSec": 1750391825,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1500000007778707",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:27:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "210807",
                    "flLeg": 1,
                    "flTm": "09:27:05",
                    "minQty": 0,
                    "nOrdNo": "250620000061234",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24750.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24750PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:27:05",
                    "GuiOrdId": "XIAVR-91eb507a-240a-480a-8963-4c39c6d69800",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391825315979500,
                    "uSec": "1750391825",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391824936",
                    "algId": "NA",
                    "avgPrc": "129.05",
                    "boeSec": 1750391825,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1500000007778707",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:27:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "210808",
                    "flLeg": 1,
                    "flTm": "09:27:05",
                    "minQty": 0,
                    "nOrdNo": "250620000061234",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24750.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24750PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:27:05",
                    "GuiOrdId": "XIAVR-91eb507a-240a-480a-8963-4c39c6d69800",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391825323815200,
                    "uSec": "1750391825",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391824936",
                    "algId": "NA",
                    "avgPrc": "116.60",
                    "boeSec": 1750391897,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1500000008632634",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:28:17",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "229869",
                    "flLeg": 1,
                    "flTm": "09:28:17",
                    "minQty": 0,
                    "nOrdNo": "250620000065280",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24750.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24750PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:28:17",
                    "GuiOrdId": "XIAVR-b1a9ffa0-c771-45c5-a839-b9518a3f5f92",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391897130074600,
                    "uSec": "1750391897",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391824936",
                    "algId": "NA",
                    "avgPrc": "116.60",
                    "boeSec": 1750391897,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1500000008632634",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:28:17",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "229870",
                    "flLeg": 1,
                    "flTm": "09:28:17",
                    "minQty": 0,
                    "nOrdNo": "250620000065280",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24750.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24750PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:28:17",
                    "GuiOrdId": "XIAVR-b1a9ffa0-c771-45c5-a839-b9518a3f5f92",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391897138819600,
                    "uSec": "1750391897",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394043687",
                    "algId": "NA",
                    "avgPrc": "184.20",
                    "boeSec": 1750394283,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000034771206",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:08:03",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1040834",
                    "flLeg": 1,
                    "flTm": "10:08:03",
                    "minQty": 0,
                    "nOrdNo": "250620000157289",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:08:03",
                    "GuiOrdId": "XIAVR-37b02c8b-646d-4465-b542-bc7c05e0a892",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394283568996600,
                    "uSec": "1750394283",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "160.45",
                    "boeSec": 1750393285,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000023077657",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:25",
                    "fldQty": 225,
                    "flDt": "20-Jun-2025",
                    "flId": "752146",
                    "flLeg": 1,
                    "flTm": "09:51:25",
                    "minQty": 0,
                    "nOrdNo": "250620000123399",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:25",
                    "GuiOrdId": "XIAVR-9d866ff1-ffbe-4759-85fe-6e7560780979",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393285738708500,
                    "uSec": "1750393285",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "160.45",
                    "boeSec": 1750393285,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000023077657",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:25",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "752147",
                    "flLeg": 1,
                    "flTm": "09:51:25",
                    "minQty": 0,
                    "nOrdNo": "250620000123399",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:25",
                    "GuiOrdId": "XIAVR-9d866ff1-ffbe-4759-85fe-6e7560780979",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393285747451600,
                    "uSec": "1750393285",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "158.10",
                    "boeSec": 1750393562,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000025302073",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:56:02",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "826395",
                    "flLeg": 1,
                    "flTm": "09:56:02",
                    "minQty": 0,
                    "nOrdNo": "250620000133666",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:56:02",
                    "GuiOrdId": "XIAVR-109bb629-a158-45e3-9f84-98f2ea3c5e35",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393562794286300,
                    "uSec": "1750393562",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "158.05",
                    "boeSec": 1750393562,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000025302073",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:56:02",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "826396",
                    "flLeg": 1,
                    "flTm": "09:56:02",
                    "minQty": 0,
                    "nOrdNo": "250620000133666",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:56:02",
                    "GuiOrdId": "XIAVR-109bb629-a158-45e3-9f84-98f2ea3c5e35",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393562802673700,
                    "uSec": "1750393562",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394043687",
                    "algId": "NA",
                    "avgPrc": "183.00",
                    "boeSec": 1750394044,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000032655742",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:04:04",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "985139",
                    "flLeg": 1,
                    "flTm": "10:04:04",
                    "minQty": 0,
                    "nOrdNo": "250620000149340",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:04:04",
                    "GuiOrdId": "XIAVR-7bc47b5e-5ed9-4559-8614-55b191ef24bc",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394044140560000,
                    "uSec": "1750394044",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "144.65",
                    "boeSec": 1750392185,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000012433072",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:33:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "459869",
                    "flLeg": 1,
                    "flTm": "09:33:05",
                    "minQty": 0,
                    "nOrdNo": "250620000077894",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:33:05",
                    "GuiOrdId": "XIAVR-1958c060-d5a0-49c8-8496-7ebb742ec260",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392185127893200,
                    "uSec": "1750392185",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "144.65",
                    "boeSec": 1750392185,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000012433072",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:33:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "459870",
                    "flLeg": 1,
                    "flTm": "09:33:05",
                    "minQty": 0,
                    "nOrdNo": "250620000077894",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:33:05",
                    "GuiOrdId": "XIAVR-1958c060-d5a0-49c8-8496-7ebb742ec260",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392185135762700,
                    "uSec": "1750392185",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "144.65",
                    "boeSec": 1750392185,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000012433072",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:33:05",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "459865",
                    "flLeg": 1,
                    "flTm": "09:33:05",
                    "minQty": 0,
                    "nOrdNo": "250620000077894",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:33:05",
                    "GuiOrdId": "XIAVR-1958c060-d5a0-49c8-8496-7ebb742ec260",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392185088178700,
                    "uSec": "1750392185",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "144.65",
                    "boeSec": 1750392185,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000012433072",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:33:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "459866",
                    "flLeg": 1,
                    "flTm": "09:33:05",
                    "minQty": 0,
                    "nOrdNo": "250620000077894",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:33:05",
                    "GuiOrdId": "XIAVR-1958c060-d5a0-49c8-8496-7ebb742ec260",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392185090700300,
                    "uSec": "1750392185",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "144.65",
                    "boeSec": 1750392185,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000012433072",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:33:05",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "459867",
                    "flLeg": 1,
                    "flTm": "09:33:05",
                    "minQty": 0,
                    "nOrdNo": "250620000077894",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:33:05",
                    "GuiOrdId": "XIAVR-1958c060-d5a0-49c8-8496-7ebb742ec260",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392185093825000,
                    "uSec": "1750392185",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "144.65",
                    "boeSec": 1750392185,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000012433072",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:33:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "459868",
                    "flLeg": 1,
                    "flTm": "09:33:05",
                    "minQty": 0,
                    "nOrdNo": "250620000077894",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:33:05",
                    "GuiOrdId": "XIAVR-1958c060-d5a0-49c8-8496-7ebb742ec260",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392185106263600,
                    "uSec": "1750392185",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "161.20",
                    "boeSec": 1750393292,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000023139774",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:32",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "754841",
                    "flLeg": 1,
                    "flTm": "09:51:32",
                    "minQty": 0,
                    "nOrdNo": "250620000123725",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:32",
                    "GuiOrdId": "XIAVR-32453a3c-ea27-487c-976b-13732584cf99",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393292072473600,
                    "uSec": "1750393292",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750393263783",
                    "algId": "NA",
                    "avgPrc": "161.15",
                    "boeSec": 1750393292,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000023139774",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:51:32",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "754842",
                    "flLeg": 1,
                    "flTm": "09:51:32",
                    "minQty": 0,
                    "nOrdNo": "250620000123725",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:51:32",
                    "GuiOrdId": "XIAVR-32453a3c-ea27-487c-976b-13732584cf99",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750393292080460300,
                    "uSec": "1750393292",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394286713",
                    "algId": "NA",
                    "avgPrc": "141.70",
                    "boeSec": 1750394523,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000032643074",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:12:03",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "1045764",
                    "flLeg": 1,
                    "flTm": "10:12:03",
                    "minQty": 0,
                    "nOrdNo": "250620000163260",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:12:03",
                    "GuiOrdId": "XIAVR-3928fe0b-4594-471e-af7a-b8a326061eaf",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394523703605000,
                    "uSec": "1750394523",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394286713",
                    "algId": "NA",
                    "avgPrc": "151.30",
                    "boeSec": 1750394287,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000031035752",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:08:07",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "999584",
                    "flLeg": 1,
                    "flTm": "10:08:07",
                    "minQty": 0,
                    "nOrdNo": "250620000157389",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900PE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:08:07",
                    "GuiOrdId": "XIAVR-0d009a8c-ef2d-4a93-bf79-d6ebeabf252f",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394287125276000,
                    "uSec": "1750394287",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750394527955",
                    "algId": "NA",
                    "avgPrc": "188.15",
                    "boeSec": 1750394705,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000034540930",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 10:15:05",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "1133895",
                    "flLeg": 1,
                    "flTm": "10:15:05",
                    "minQty": 0,
                    "nOrdNo": "250620000170559",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 10:15:05",
                    "GuiOrdId": "XIAVR-5439f3ed-daaf-4e7b-beb9-5f7c85a32e58",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750394705239615200,
                    "uSec": "1750394705",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391706098",
                    "algId": "NA",
                    "avgPrc": "138.05",
                    "boeSec": 1750391813,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1100000008271123",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:26:53",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "321549",
                    "flLeg": 1,
                    "flTm": "09:26:53",
                    "minQty": 0,
                    "nOrdNo": "250620000060519",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24900.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24900CE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:26:53",
                    "GuiOrdId": "XIAVR-d29f1d63-6184-4eb8-9f86-4a955b689470",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391813265101000,
                    "uSec": "1750391813",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "141.10",
                    "boeSec": 1750392305,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000013513854",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:05",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "491117",
                    "flLeg": 1,
                    "flTm": "09:35:05",
                    "minQty": 0,
                    "nOrdNo": "250620000083060",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:05",
                    "GuiOrdId": "XIAVR-bf8c6e49-3204-401f-b0a6-1cc15a5cdc4b",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392305304014800,
                    "uSec": "1750392305",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "141.10",
                    "boeSec": 1750392305,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000013513854",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "491118",
                    "flLeg": 1,
                    "flTm": "09:35:05",
                    "minQty": 0,
                    "nOrdNo": "250620000083060",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:05",
                    "GuiOrdId": "XIAVR-bf8c6e49-3204-401f-b0a6-1cc15a5cdc4b",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392305307334700,
                    "uSec": "1750392305",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "141.10",
                    "boeSec": 1750392305,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000013513854",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "491119",
                    "flLeg": 1,
                    "flTm": "09:35:05",
                    "minQty": 0,
                    "nOrdNo": "250620000083060",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:05",
                    "GuiOrdId": "XIAVR-bf8c6e49-3204-401f-b0a6-1cc15a5cdc4b",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392305312245800,
                    "uSec": "1750392305",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "141.10",
                    "boeSec": 1750392305,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000013513854",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "491120",
                    "flLeg": 1,
                    "flTm": "09:35:05",
                    "minQty": 0,
                    "nOrdNo": "250620000083060",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:05",
                    "GuiOrdId": "XIAVR-bf8c6e49-3204-401f-b0a6-1cc15a5cdc4b",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392305318319600,
                    "uSec": "1750392305",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "141.05",
                    "boeSec": 1750392305,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000013513854",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:05",
                    "fldQty": 150,
                    "flDt": "20-Jun-2025",
                    "flId": "491121",
                    "flLeg": 1,
                    "flTm": "09:35:05",
                    "minQty": 0,
                    "nOrdNo": "250620000083060",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:05",
                    "GuiOrdId": "XIAVR-bf8c6e49-3204-401f-b0a6-1cc15a5cdc4b",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392305325177300,
                    "uSec": "1750392305",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392184690",
                    "algId": "NA",
                    "avgPrc": "141.05",
                    "boeSec": 1750392305,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1600000013513854",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:35:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "491122",
                    "flLeg": 1,
                    "flTm": "09:35:05",
                    "minQty": 0,
                    "nOrdNo": "250620000083060",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24800.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24800PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:35:05",
                    "GuiOrdId": "XIAVR-bf8c6e49-3204-401f-b0a6-1cc15a5cdc4b",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392305331579100,
                    "uSec": "1750392305",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750392428079",
                    "algId": "NA",
                    "avgPrc": "145.15",
                    "boeSec": 1750392749,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000019761722",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:42:29",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "603048",
                    "flLeg": 1,
                    "flTm": "09:42:29",
                    "minQty": 0,
                    "nOrdNo": "250620000098254",
                    "nReqId": "1",
                    "optTp": "PE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850PE",
                    "trnsTp": "S",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:42:29",
                    "GuiOrdId": "XIAVR-280822fa-db83-4f55-bb37-7d50ea9d9f80",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750392749648622300,
                    "uSec": "1750392749",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "165.60",
                    "boeSec": 1750391945,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000011213950",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:29:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "411677",
                    "flLeg": 1,
                    "flTm": "09:29:05",
                    "minQty": 0,
                    "nOrdNo": "250620000067796",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:29:05",
                    "GuiOrdId": "XIAVR-e0260346-fab0-4534-9366-8577a5718a8c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391945197141000,
                    "uSec": "1750391945",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "165.75",
                    "boeSec": 1750391945,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000011213950",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:29:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "411678",
                    "flLeg": 1,
                    "flTm": "09:29:05",
                    "minQty": 0,
                    "nOrdNo": "250620000067796",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:29:05",
                    "GuiOrdId": "XIAVR-e0260346-fab0-4534-9366-8577a5718a8c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391945200121600,
                    "uSec": "1750391945",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "165.80",
                    "boeSec": 1750391945,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000011213950",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:29:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "411679",
                    "flLeg": 1,
                    "flTm": "09:29:05",
                    "minQty": 0,
                    "nOrdNo": "250620000067796",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:29:05",
                    "GuiOrdId": "XIAVR-e0260346-fab0-4534-9366-8577a5718a8c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391945202605800,
                    "uSec": "1750391945",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                },
                {
                    "actId": "XIAVR",
                    "algCat": "1750391944803",
                    "algId": "NA",
                    "avgPrc": "165.80",
                    "boeSec": 1750391945,
                    "brdLtQty": 75,
                    "brkClnt": "NA",
                    "cstFrm": "C",
                    "exOrdId": "1000000011213950",
                    "exp": "1750896000",
                    "expDt": "26 Jun, 2025",
                    "exSeg": "nse_fo",
                    "exTm": "20-Jun-2025 09:29:05",
                    "fldQty": 75,
                    "flDt": "20-Jun-2025",
                    "flId": "411680",
                    "flLeg": 1,
                    "flTm": "09:29:05",
                    "minQty": 0,
                    "nOrdNo": "250620000067796",
                    "nReqId": "1",
                    "optTp": "CE",
                    "ordDur": "NA",
                    "ordGenTp": "--",
                    "prcTp": "MKT",
                    "prod": "MIS",
                    "rmk": "--",
                    "rptTp": "fill",
                    "series": "XX",
                    "stkPrc": "24850.00",
                    "sym": "NIFTY",
                    "trdSym": "NIFTY25JUN24850CE",
                    "trnsTp": "B",
                    "usrId": "AOGPK8647F",
                    "genDen": "1",
                    "genNum": "1",
                    "hsUpTm": "2025/06/20 09:29:05",
                    "GuiOrdId": "XIAVR-e0260346-fab0-4534-9366-8577a5718a8c",
                    "locId": "111111111111100",
                    "lotSz": "75",
                    "multiplier": "1",
                    "ordSrc": "NA",
                    "prcNum": "1",
                    "prcDen": "1",
                    "strategyCode": "1",
                    "precision": "2",
                    "tok": "",
                    "updRecvTm": 1750391945205120500,
                    "uSec": "1750391945",
                    "posFlg": "",
                    "prc": "",
                    "qty": 0,
                    "tm": "",
                    "it": "OPTIDX"
                }
            ]
        }
        resolve({ "status": "success", "message": "Orderbook Details Received!", "data": objOrderbook });
    });
    return objPromise;
}

// const fnTempOrderBook = async (pOrderId, pOrderQty, pLotSize, pToken, pExchSeg, pBorS, pTrdSymbol, pOptionType, pSearchSymbol, pStrikePrice, pCurrRate) => {
//     const objData = new Promise((resolve, reject) => {
//         //Single Order for paper Trade
//         const objTempOrdBook = {
//             "tid": "server2_2502351",
//             "stat": "Ok",
//             "stCode": 200,
//             "data": [
//                 {
//                     "brkClnt": "08081",
//                     "ordValDt": "NA",
//                     "exUsrInfo": "NA",
//                     "mfdBy": "NA",
//                     "vendorCode": "",
//                     "rmk": "--",
//                     "odCrt": "NA",
//                     "ordSrc": "ADMINCPPAPI_TRADEAPI",
//                     "sipInd": "NA",
//                     "prc": "0.00",
//                     "prcTp": "MKT",
//                     "cnlQty": 0,
//                     "uSec": "321902",
//                     "classification": "0",
//                     "mktPro": "0.00",
//                     "ordEntTm": "16-Dec-2024 12:59:54",
//                     "reqId": "1",
//                     "algSeqNo": "NA",
//                     "qty": (pOrderQty * pLotSize),
//                     "unFldSz": 0,
//                     "mktProPct": "--",
//                     "algCat": "NA",
//                     "exOrdId": "1300000128766436",
//                     "dscQty": 0,
//                     "actId": "XIAVR",
//                     "expDt": "19 Dec, 2024",
//                     "trgPrc": "0.00",
//                     "tok": pToken,
//                     "symOrdId": "NA",
//                     "fldQty": (pOrderQty * pLotSize),
//                     "ordDtTm": "16-Dec-2024 12:59:54",
//                     "avgPrc": pCurrRate,
//                     "locId": "111111111111100",
//                     "algId": "NA",
//                     "stat": "Ok",
//                     "prod": "MIS",
//                     "exSeg": pExchSeg,
//                     "GuiOrdId": "1734334194-316617-AOGPK8647F-ADMINAPI",
//                     "usrId": "AOGPK8647F",
//                     "rptTp": "NA",
//                     "exCfmTm": "16-Dec-2024 12:59:54",
//                     "hsUpTm": "2024/12/16 12:59:54",
//                     "updRecvTm": 1734334194322887400,
//                     "ordGenTp": "NA",
//                     "vldt": "DAY",
//                     "tckSz": "0.05",
//                     "ordSt": "complete",
//                     "trnsTp": pBorS,
//                     "refLmtPrc": 0,
//                     "coPct": 0,
//                     "nOrdNo": pOrderId,
//                     "ordAutSt": "NA",
//                     "strategyCode": "NA",
//                     "rejRsn": "--",
//                     "boeSec": 1734334194,
//                     "expDtSsb": "1734618600",
//                     "dscQtyPct": "0",
//                     "stkPrc": (parseInt(pStrikePrice)/100),
//                     "sym": pSearchSymbol,
//                     "trdSym": pTrdSymbol,
//                     "multiplier": "1",
//                     "precision": "2",
//                     "noMktProFlg": "0.00",
//                     "genNum": "1",
//                     "series": "XX",
//                     "prcNum": "1",
//                     "genDen": "1",
//                     "brdLtQty": pLotSize,
//                     "mktProFlg": "0.00",
//                     "defMktProV": "0.00",
//                     "lotSz": pLotSize,
//                     "minQty": 0,
//                     "optTp": pOptionType,
//                     "prcDen": "1"
//                 }
//             ]
//         }

//         //Multiple Orders for Paper Trade
//         // const objTempOrdBook = {
//         //     "tid": "server2_2502351",
//         //     "stat": "Ok",
//         //     "stCode": 200,
//         //     "data": [
//         //         {
//         //             "brkClnt": "--",
//         //             "ordValDt": "NA",
//         //             "exUsrInfo": "NA",
//         //             "mfdBy": "NA",
//         //             "vendorCode": "",
//         //             "rmk": "--",
//         //             "odCrt": "NA",
//         //             "ordSrc": "ADMINCPPAPI_TRADEAPI",
//         //             "sipInd": "NA",
//         //             "prc": "0.00",
//         //             "prcTp": "MKT",
//         //             "cnlQty": 0,
//         //             "uSec": "575916",
//         //             "classification": "0",
//         //             "mktPro": "0.00",
//         //             "ordEntTm": "16-Dec-2024 12:35:31",
//         //             "reqId": "1",
//         //             "algSeqNo": "NA",
//         //             "qty": 2,
//         //             "unFldSz": 0,
//         //             "mktProPct": "--",
//         //             "algCat": "NA",
//         //             "exOrdId": "1300000118158688",
//         //             "dscQty": 0,
//         //             "actId": "XIAVR",
//         //             "expDt": "19 Dec, 2024",
//         //             "trgPrc": "0.00",
//         //             "tok": "47421",
//         //             "symOrdId": "NA",
//         //             "fldQty": 0,
//         //             "ordDtTm": "16-Dec-2024 12:35:31",
//         //             "avgPrc": "0.00",
//         //             "locId": "111111111111100",
//         //             "algId": "NA",
//         //             "stat": "Ok",
//         //             "prod": "MIS",
//         //             "exSeg": "nse_fo",
//         //             "GuiOrdId": "1734332731-571360-AOGPK8647F-ADMINAPI",
//         //             "usrId": "AOGPK8647F",
//         //             "rptTp": "NA",
//         //             "exCfmTm": "NA",
//         //             "hsUpTm": "2024/12/16 12:36:39",
//         //             "updRecvTm": 1734332799314122800,
//         //             "ordGenTp": "NA",
//         //             "vldt": "DAY",
//         //             "tckSz": "0.05",
//         //             "ordSt": "rejected",
//         //             "trnsTp": "B",
//         //             "refLmtPrc": 0,
//         //             "coPct": 0,
//         //             "nOrdNo": "241216000373861",
//         //             "ordAutSt": "NA",
//         //             "strategyCode": "NA",
//         //             "rejRsn": "16556 : Quantity less than the minimum lot size",
//         //             "boeSec": 1734332731,
//         //             "expDtSsb": "1734618600",
//         //             "dscQtyPct": "0",
//         //             "stkPrc": "24750.00",
//         //             "sym": "NIFTY",
//         //             "trdSym": "NIFTY24D1924750CE",
//         //             "multiplier": "1",
//         //             "precision": "2",
//         //             "noMktProFlg": "0.00",
//         //             "genNum": "1",
//         //             "series": "XX",
//         //             "prcNum": "1",
//         //             "genDen": "1",
//         //             "brdLtQty": "25",
//         //             "mktProFlg": "0.00",
//         //             "defMktProV": "0.00",
//         //             "lotSz": "25",
//         //             "minQty": 0,
//         //             "optTp": "CE",
//         //             "prcDen": "1"
//         //         },
//         //         {
//         //             "brkClnt": "--",
//         //             "ordValDt": "NA",
//         //             "exUsrInfo": "NA",
//         //             "mfdBy": "NA",
//         //             "vendorCode": "",
//         //             "rmk": "--",
//         //             "odCrt": "NA",
//         //             "ordSrc": "ADMINCPPAPI_TRADEAPI",
//         //             "sipInd": "NA",
//         //             "prc": "0.00",
//         //             "prcTp": "MKT",
//         //             "cnlQty": 0,
//         //             "uSec": "413162",
//         //             "classification": "0",
//         //             "mktPro": "0.00",
//         //             "ordEntTm": "16-Dec-2024 12:35:31",
//         //             "reqId": "1",
//         //             "algSeqNo": "NA",
//         //             "qty": 3,
//         //             "unFldSz": 0,
//         //             "mktProPct": "--",
//         //             "algCat": "NA",
//         //             "exOrdId": "1300000118156643",
//         //             "dscQty": 0,
//         //             "actId": "XIAVR",
//         //             "expDt": "19 Dec, 2024",
//         //             "trgPrc": "0.00",
//         //             "tok": "47421",
//         //             "symOrdId": "NA",
//         //             "fldQty": 0,
//         //             "ordDtTm": "16-Dec-2024 12:35:31",
//         //             "avgPrc": "0.00",
//         //             "locId": "111111111111100",
//         //             "algId": "NA",
//         //             "stat": "Ok",
//         //             "prod": "MIS",
//         //             "exSeg": "nse_fo",
//         //             "GuiOrdId": "1734332731-407215-AOGPK8647F-ADMINAPI",
//         //             "usrId": "AOGPK8647F",
//         //             "rptTp": "NA",
//         //             "exCfmTm": "NA",
//         //             "hsUpTm": "2024/12/16 12:36:39",
//         //             "updRecvTm": 1734332799314258000,
//         //             "ordGenTp": "NA",
//         //             "vldt": "DAY",
//         //             "tckSz": "0.05",
//         //             "ordSt": "rejected",
//         //             "trnsTp": "B",
//         //             "refLmtPrc": 0,
//         //             "coPct": 0,
//         //             "nOrdNo": "241216000373851",
//         //             "ordAutSt": "NA",
//         //             "strategyCode": "NA",
//         //             "rejRsn": "16556 : Quantity less than the minimum lot size",
//         //             "boeSec": 1734332731,
//         //             "expDtSsb": "1734618600",
//         //             "dscQtyPct": "0",
//         //             "stkPrc": "24750.00",
//         //             "sym": "NIFTY",
//         //             "trdSym": "NIFTY24D1924750CE",
//         //             "multiplier": "1",
//         //             "precision": "2",
//         //             "noMktProFlg": "0.00",
//         //             "genNum": "1",
//         //             "series": "XX",
//         //             "prcNum": "1",
//         //             "genDen": "1",
//         //             "brdLtQty": "25",
//         //             "mktProFlg": "0.00",
//         //             "defMktProV": "0.00",
//         //             "lotSz": "25",
//         //             "minQty": 0,
//         //             "optTp": "CE",
//         //             "prcDen": "1"
//         //         },
//         //         {
//         //             "brkClnt": "08081",
//         //             "ordValDt": "NA",
//         //             "exUsrInfo": "NA",
//         //             "mfdBy": "NA",
//         //             "vendorCode": "",
//         //             "rmk": "--",
//         //             "odCrt": "NA",
//         //             "ordSrc": "ADMINCPPAPI_TRADEAPI",
//         //             "sipInd": "NA",
//         //             "prc": "0.00",
//         //             "prcTp": "MKT",
//         //             "cnlQty": 0,
//         //             "uSec": "321902",
//         //             "classification": "0",
//         //             "mktPro": "0.00",
//         //             "ordEntTm": "16-Dec-2024 12:59:54",
//         //             "reqId": "1",
//         //             "algSeqNo": "NA",
//         //             "qty": 75,
//         //             "unFldSz": 0,
//         //             "mktProPct": "--",
//         //             "algCat": "NA",
//         //             "exOrdId": "1300000128766436",
//         //             "dscQty": 0,
//         //             "actId": "XIAVR",
//         //             "expDt": "19 Dec, 2024",
//         //             "trgPrc": "0.00",
//         //             "tok": "47421",
//         //             "symOrdId": "NA",
//         //             "fldQty": 75,
//         //             "ordDtTm": "16-Dec-2024 12:59:54",
//         //             "avgPrc": "128.15",
//         //             "locId": "111111111111100",
//         //             "algId": "NA",
//         //             "stat": "Ok",
//         //             "prod": "MIS",
//         //             "exSeg": "nse_fo",
//         //             "GuiOrdId": "1734334194-316617-AOGPK8647F-ADMINAPI",
//         //             "usrId": "AOGPK8647F",
//         //             "rptTp": "NA",
//         //             "exCfmTm": "16-Dec-2024 12:59:54",
//         //             "hsUpTm": "2024/12/16 12:59:54",
//         //             "updRecvTm": 1734334194322887400,
//         //             "ordGenTp": "NA",
//         //             "vldt": "DAY",
//         //             "tckSz": "0.05",
//         //             "ordSt": "complete",
//         //             "trnsTp": "B",
//         //             "refLmtPrc": 0,
//         //             "coPct": 0,
//         //             "nOrdNo": "241216000405363",
//         //             "ordAutSt": "NA",
//         //             "strategyCode": "NA",
//         //             "rejRsn": "--",
//         //             "boeSec": 1734334194,
//         //             "expDtSsb": "1734618600",
//         //             "dscQtyPct": "0",
//         //             "stkPrc": "24750.00",
//         //             "sym": "NIFTY",
//         //             "trdSym": "NIFTY24D1924750CE",
//         //             "multiplier": "1",
//         //             "precision": "2",
//         //             "noMktProFlg": "0.00",
//         //             "genNum": "1",
//         //             "series": "XX",
//         //             "prcNum": "1",
//         //             "genDen": "1",
//         //             "brdLtQty": "25",
//         //             "mktProFlg": "0.00",
//         //             "defMktProV": "0.00",
//         //             "lotSz": "25",
//         //             "minQty": 0,
//         //             "optTp": "CE",
//         //             "prcDen": "1"
//         //         },
//         //         {
//         //             "brkClnt": "08081",
//         //             "ordValDt": "NA",
//         //             "exUsrInfo": "NA",
//         //             "mfdBy": "NA",
//         //             "vendorCode": "",
//         //             "rmk": "--",
//         //             "odCrt": "NA",
//         //             "ordSrc": "ADMINCPPAPI_TRADEAPI",
//         //             "sipInd": "NA",
//         //             "prc": "0.00",
//         //             "prcTp": "MKT",
//         //             "cnlQty": 0,
//         //             "uSec": "478398",
//         //             "classification": "0",
//         //             "mktPro": "0.00",
//         //             "ordEntTm": "16-Dec-2024 12:59:54",
//         //             "reqId": "1",
//         //             "algSeqNo": "NA",
//         //             "qty": 50,
//         //             "unFldSz": 0,
//         //             "mktProPct": "--",
//         //             "algCat": "NA",
//         //             "exOrdId": "1300000128768357",
//         //             "dscQty": 0,
//         //             "actId": "XIAVR",
//         //             "expDt": "19 Dec, 2024",
//         //             "trgPrc": "0.00",
//         //             "tok": "47421",
//         //             "symOrdId": "NA",
//         //             "fldQty": 50,
//         //             "ordDtTm": "16-Dec-2024 12:59:54",
//         //             "avgPrc": "128.20",
//         //             "locId": "111111111111100",
//         //             "algId": "NA",
//         //             "stat": "Ok",
//         //             "prod": "MIS",
//         //             "exSeg": "nse_fo",
//         //             "GuiOrdId": "1734334194-473765-AOGPK8647F-ADMINAPI",
//         //             "usrId": "AOGPK8647F",
//         //             "rptTp": "NA",
//         //             "exCfmTm": "16-Dec-2024 12:59:54",
//         //             "hsUpTm": "2024/12/16 12:59:54",
//         //             "updRecvTm": 1734334194479088000,
//         //             "ordGenTp": "NA",
//         //             "vldt": "DAY",
//         //             "tckSz": "0.05",
//         //             "ordSt": "complete",
//         //             "trnsTp": "B",
//         //             "refLmtPrc": 0,
//         //             "coPct": 0,
//         //             "nOrdNo": "241216000405368",
//         //             "ordAutSt": "NA",
//         //             "strategyCode": "NA",
//         //             "rejRsn": "--",
//         //             "boeSec": 1734334194,
//         //             "expDtSsb": "1734618600",
//         //             "dscQtyPct": "0",
//         //             "stkPrc": "24750.00",
//         //             "sym": "NIFTY",
//         //             "trdSym": "NIFTY24D1924750CE",
//         //             "multiplier": "1",
//         //             "precision": "2",
//         //             "noMktProFlg": "0.00",
//         //             "genNum": "1",
//         //             "series": "XX",
//         //             "prcNum": "1",
//         //             "genDen": "1",
//         //             "brdLtQty": "25",
//         //             "mktProFlg": "0.00",
//         //             "defMktProV": "0.00",
//         //             "lotSz": "25",
//         //             "minQty": 0,
//         //             "optTp": "CE",
//         //             "prcDen": "1"
//         //         },
//         //         {
//         //             "brkClnt": "08081",
//         //             "ordValDt": "NA",
//         //             "exUsrInfo": "NA",
//         //             "mfdBy": "NA",
//         //             "vendorCode": "",
//         //             "rmk": "--",
//         //             "odCrt": "NA",
//         //             "ordSrc": "ADMINCPPAPI_WEB",
//         //             "sipInd": "NA",
//         //             "prc": "0.00",
//         //             "prcTp": "MKT",
//         //             "cnlQty": 0,
//         //             "uSec": "522169",
//         //             "classification": "0",
//         //             "mktPro": "0.00",
//         //             "ordEntTm": "16-Dec-2024 13:02:30",
//         //             "reqId": "1",
//         //             "algSeqNo": "NA",
//         //             "qty": 125,
//         //             "unFldSz": 0,
//         //             "mktProPct": "--",
//         //             "algCat": "NA",
//         //             "exOrdId": "1300000129784711",
//         //             "dscQty": 0,
//         //             "actId": "XIAVR",
//         //             "expDt": "19 Dec, 2024",
//         //             "trgPrc": "0.00",
//         //             "tok": "47421",
//         //             "symOrdId": "NA",
//         //             "fldQty": 125,
//         //             "ordDtTm": "16-Dec-2024 13:02:30",
//         //             "avgPrc": "132.49",
//         //             "locId": "111111111111100",
//         //             "algId": "NA",
//         //             "stat": "Ok",
//         //             "prod": "MIS",
//         //             "exSeg": "nse_fo",
//         //             "GuiOrdId": "1734334350-516359-AOGPK8647F-ADMINAPI",
//         //             "usrId": "AOGPK8647F",
//         //             "rptTp": "NA",
//         //             "exCfmTm": "16-Dec-2024 13:02:30",
//         //             "hsUpTm": "2024/12/16 13:02:30",
//         //             "updRecvTm": 1734334350523282000,
//         //             "ordGenTp": "NA",
//         //             "vldt": "DAY",
//         //             "tckSz": "0.05",
//         //             "ordSt": "complete",
//         //             "trnsTp": "S",
//         //             "refLmtPrc": 0,
//         //             "coPct": 0,
//         //             "nOrdNo": "241216000409992",
//         //             "ordAutSt": "NA",
//         //             "strategyCode": "NA",
//         //             "rejRsn": "--",
//         //             "boeSec": 1734334350,
//         //             "expDtSsb": "1734618600",
//         //             "dscQtyPct": "0",
//         //             "stkPrc": "24750.00",
//         //             "sym": "NIFTY",
//         //             "trdSym": "NIFTY24D1924750CE",
//         //             "multiplier": "1",
//         //             "precision": "2",
//         //             "noMktProFlg": "0.00",
//         //             "genNum": "1",
//         //             "series": "XX",
//         //             "prcNum": "1",
//         //             "genDen": "1",
//         //             "brdLtQty": "25",
//         //             "mktProFlg": "0.00",
//         //             "defMktProV": "0.00",
//         //             "lotSz": "25",
//         //             "minQty": 0,
//         //             "optTp": "CE",
//         //             "prcDen": "1"
//         //         }
//         //     ]
//         // }

//         resolve({ "status": "success", "message": "Orderbook Details Received!", "data": objTempOrdBook.data });
//     });
//     return objData;
// }

const fnGetTradeDetails = async (pHsServerId, pSid, pKotakSession, pAccessToken) => {
    const objData = new Promise((resolve, reject) => {
        var objConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/user/trades?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pKotakSession,
                'neo-fin-key': 'neotradeapi',
                'Authorization': 'Bearer ' + pAccessToken
            }
        };

        axios(objConfig)
            .then(function (objResponse) {
                //console.log(JSON.stringify(objResponse.data));
                resolve({ "status": "success", "message": "Tradebook Details Received!", "data": objResponse.data });
            })
            .catch(function (error) {
                console.log(error);
                reject({ "status": "danger", "message": "Tradebook Error: " + error.message, "data": error.message });
            });
    });
    return objData;
}

const fnGetTradeTokenData = async (pJsonFileName, pSearchSymbol, pOptionType, pExpiryEpoch, pStrikePrice) => {
    const objData = new Promise((resolve, reject) => {

        const vLocalUrl = process.env.API_PATH + "json/" + pJsonFileName;
        let vToken = "";
        let vExchSeg = "";
        let vExchange = "";
        let vTrdSymbol = "";
        let vLotSize = "";
        let vMaxPerOrdQty = "";

        axios.get(vLocalUrl)
            .then((response) => {
                let vData = response.data;

                if (vData["Symbol"]) {
                    for (let i = 0; i < vData["Symbol"].length; i++) {
                        if ((vData["Symbol"][i].pSymbolName === pSearchSymbol) && (vData["Symbol"][i].pExpiryDate === pExpiryEpoch) && (vData["Symbol"][i].pStrikePrice === pStrikePrice) && (vData["Symbol"][i].pOptionType === pOptionType)) {
                            vToken = vData["Symbol"][i].pSymbol;
                            vExchSeg = vData["Symbol"][i].pExchSeg;
                            vExchange = vData["Symbol"][i].pExchange;
                            vTrdSymbol = vData["Symbol"][i].pTrdSymbol;
                            vLotSize = vData["Symbol"][i].pLotSize;
                            vMaxPerOrdQty = vData["Symbol"][i].MaxPerOrdQty;

                            // console.log(vData["Symbol"][i].pSymbol + " - " + vData["Symbol"][i].pTrdSymbol);
                        }
                    }
                    if (vToken === "") {
                        reject({ "status": "warning", "message": "Option Token Not Found, Check Expiry Date!", "data": "" });
                    }
                    else {
                        resolve({ "status": "success", "message": "Success - Option Data Received!", "data": { Token: vToken, ExchSeg: vExchSeg, Exchange: vExchange, TrdSymbol: vTrdSymbol, LotSize: vLotSize, MaxPerOrdQty: vMaxPerOrdQty } });
                    }
                }
                else {
                    // console.log("Failed");
                    reject({ "status": "warning", "message": "Invalid File Name. Please Check!", "data": "" });
                }
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "File Not Found! " + error.message, "data": "" });
            });
    });

    return objData;
}

const fnGetBackupRate = async (pExchSeg, pScriptToken, pSid, pKotakSession, pAccessToken) => {
    const objData = new Promise((resolve, reject) => {
        var objConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/apim/quotes/1.0/quotes/neosymbol/' + pExchSeg + '|' + pScriptToken + '/all',
            headers: {
                'accept': 'application/json',
                // 'Sid': pSid,
                // 'Auth': pKotakSession,
                // 'neo-fin-key': 'neotradeapi',
                'Authorization': 'Bearer ' + pAccessToken
            }
        };

        axios(objConfig)
            .then(function (objResponse) {
                //console.log(JSON.stringify(objResponse.data));
                resolve({ "status": "success", "message": "Backup Current Rate Received!", "data": objResponse.data });
            })
            .catch(function (error) {
                console.log(error);
                reject({ "status": "danger", "message": "Current Rate Error: " + error.message, "data": error.message });
            });
    });
    return objData;
}

const fnExecOptBracketOrder = async(pHsServerId, pSid, pKotakSession, pAccessToken, pExchSeg, pSymbToken, pTrdSymbol, pBorS, pOrderQty, pLotSize, pGuid, pCurrRate, pPointsSL, pPointsTP) => {
    const objPromise = new Promise((resolve, reject) => {

        let vPointsSL = parseInt(pPointsSL) - (parseInt(pPointsSL) * 0.5);
        //let vData = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"'+ pBorS + '", "ig":"TestGUID", "sc":"TestTag"}' });
        // let vData = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"BO", "pf":"N", "pr":"10", "pt":"SL", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"' + pBorS + '", "sot":"Ticks", "slt":"Ticks", "slv":"7", "sov":"7", "lat":"LTP", "tlt":"Y", "tsv":"5", "sy":"' + pGuid + '", "sn":"' + pGuid + '", "sc":"1"}' });

        // let vData = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"BO", "pf":"N", "pr":"'+ pCurrRate +'", "pt":"L", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"' + pBorS + '", "sot":"Ticks", "slt":"Ticks", "slv":"7", "sov":"7", "lat":"LTP", "tlt":"Y", "tsv":"5", "sy":"' + pGuid + '", "sn":"' + pGuid + '", "sc":"1"}' });
        let vData = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"BO", "pf":"N", "pr":"10", "pt":"L", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"' + pBorS + '", "sot":"Ticks", "slt":"Ticks", "slv":"'+ pPointsSL +'", "sov":"'+ pPointsTP +'", "lat":"LTP", "tlt":"Y", "tsv":"'+ vPointsSL +'", "sy":"' + pGuid + '", "sn":"' + pGuid + '", "sc":"1"}' });

        let objConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/order/rule/ms/place?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pKotakSession,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: vData
        };

        axios.request(objConfig)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "Errrrrrr... " + error.message, "data": error.message });
                console.log("Errrrrrrrr--------");
                console.log(error);
            });
    });
    return objPromise;
}

const fnExecOptNrmlOrder1 = async (pHsServerId, pSid, pKotakSession, pAccessToken, pExchSeg, pSymbToken, pTrdSymbol, pBorS, pOrderQty, pLotSize, pGuid) => {
    const objPromise = new Promise((resolve, reject) => {

        //let vData = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"'+ pBorS + '", "ig":"TestGUID", "sc":"TestTag"}' });
        let vData = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"' + pBorS + '", "sy":"' + pGuid + '", "sn":"' + pGuid + '", "sc":"1"}' });

        let objConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://gw-napi.kotaksecurities.com/Orders/2.0/quick/order/rule/ms/place?sId=' + pHsServerId,
            headers: {
                'accept': 'application/json',
                'Sid': pSid,
                'Auth': pKotakSession,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + pAccessToken
            },
            data: vData
        };

        axios.request(objConfig)
            .then((objResponse) => {
                resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
            })
            .catch((error) => {
                reject({ "status": "danger", "message": "Errrrrrr... " + error.message, "data": error.message });
                console.log("Errrrrrrrr--------");
                console.log(error);
            });
    });
    return objPromise;
}