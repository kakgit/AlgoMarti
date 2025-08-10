const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const csvToJson = require('convert-csv-to-json');

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("kotakPaper.ejs");
}

exports.fnScalperNifty = (req, res) => {
    //res.send("Crud Application");
    res.render("kotakPaperNS.ejs");
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

        if(bIsPwdExpired === true){
            res.send({ "status": "danger", "message": "Password Expired, Please reset in the Trading APP.", "data": objViewToken.data.data });
        }
        else{
            let objJWT = await fnParseJwt(vViewToken);
            vSubUserId = objJWT.sub;

            let objSession = await fnGetKotakSession(vSubUserId, vMpin, vSid, vViewToken, vAccessToken.data);

            let objLimits = await fnGetUserLimits(vHsServerId, vSid, vViewToken, vAccessToken.data);

            //console.log(objLimits.data);

            res.send({ "status": "success", "message": "Trader Login - Successful", "data": {Session : objSession.data.data.token, SubUserId : vSubUserId, Sid : objSession.data.data.sid, ViewToken : vViewToken, HsServerId : vHsServerId, AccessToken : vAccessToken.data, Limits : objLimits.data } });
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

        for(let i=0; i<objJson.length;i++){
            if(objJson[i].pGroup === "EQ"){
                objResJson.Symbol.push({ pSymbol : objJson[i].pSymbol, pSymbolName : objJson[i].pSymbolName, pTrdSymbol : objJson[i].pTrdSymbol });
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

exports.fnNseFoCsv2OptJson = async(req, res) => {
    try {
        let fileInputName = path.join(__dirname, '../../public/uploads/nse_fo.csv');
        // let fileOutputName = path.join(__dirname, '../../public/json/nse_cm.json');
        const objDate = new Date();
        let vSecDt = objDate.valueOf();
    
        let objJson = csvToJson.fieldDelimiter(',').getJsonFromCsv(fileInputName);
        let objResJson = { UpdDt: vSecDt, Symbol: [] };
        //csvToJson.fieldDelimiter(',').generateJsonFileFromCsv(fileInputName, fileOutputName);

        for(let i=0; i<objJson.length;i++){
            if(objJson[i].pInstType === "OPTIDX"){
                objResJson.Symbol.push({ pSymbol : objJson[i].pSymbol, pExchSeg : objJson[i].pExchSeg, pSymbolName : objJson[i].pSymbolName, pTrdSymbol : objJson[i].pTrdSymbol, pOptionType : objJson[i].pOptionType, pLotSize : parseInt(objJson[i].lLotSize), pExchange : objJson[i].pExchange, pExpiryDate : parseFloat(objJson[i].lExpiryDate), pStrikePrice : parseFloat(objJson[i]["dStrikePrice;"]), MaxPerOrdQty : (parseFloat(objJson[i].lFreezeQty) - 1) });
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

exports.fnBseFoCsv2OptJson = async(req, res) => {
    try {
        let fileInputName = path.join(__dirname, '../../public/uploads/bse_fo.csv');
        // let fileOutputName = path.join(__dirname, '../../public/json/nse_cm.json');
        const objDate = new Date();
        let vSecDt = objDate.valueOf();
    
        let objJson = csvToJson.fieldDelimiter(',').getJsonFromCsv(fileInputName);
        let objResJson = { UpdDt: vSecDt, Symbol: [] };
        //csvToJson.fieldDelimiter(',').generateJsonFileFromCsv(fileInputName, fileOutputName);

        for(let i=0; i<objJson.length;i++){
            if(objJson[i].pInstType === "IO"){
                objResJson.Symbol.push({ pSymbol : objJson[i].pSymbol, pExchSeg : objJson[i].pExchSeg, pSymbolName : objJson[i].pSymbolName, pTrdSymbol : objJson[i].pTrdSymbol, pOptionType : objJson[i].pOptionType, pLotSize : parseInt(objJson[i].lLotSize), pExchange : objJson[i].pExchange, pExpiryDate : parseFloat(objJson[i].lExpiryDate), pStrikePrice : parseFloat(objJson[i]["dStrikePrice;"]), MaxPerOrdQty : parseFloat(objJson[i].lFreezeQty) });
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
        res.send({ "status": "success", "message": "Order Details Received!", "data": objOrderDtls, "nOrdNo" : objOrder });

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
        let objOrderDtls = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);

        if(objOrderDtls.data.stat === "Not_Ok"){
            res.send({ "status": "warning", "message": "Orderbook Error: " + objOrderDtls.data.errMsg, "data": objOrderDtls.data });
        }
        else if(objOrderDtls.data.stat === "Ok"){
            res.send({ "status": "success", "message": "Orderbook Details Received!", "data": objOrderDtls.data });
        }
        else{
            res.send({ "status": "danger", "message": "Unknown Error at Orderbook", "data": objOrderDtls.data });
        }
    }
    catch (err) {
      res.send({ "status": "danger", "message": err.message, "data": err.data });
    }
}

exports.fnGetTradeBook = async (req, res) => {
    let vHsServerId = req.body.HsServerId;
    let vSid = req.body.Sid;
    let vAccessToken = req.body.AccessToken;
    let vKotakSession = req.body.KotakSession;
  
    try {
        let objOrderDtls = await fnGetTradeDetails(vHsServerId, vSid, vKotakSession, vAccessToken);

        if(objOrderDtls.data.stat === "Not_Ok"){
            res.send({ "status": "warning", "message": "Tradebook: " + objOrderDtls.data.errMsg, "data": objOrderDtls.data });
        }
        else if(objOrderDtls.data.stat === "ok"){
            res.send({ "status": "success", "message": "Tradebook Details Received!", "data": objOrderDtls.data });
        }
        else{
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

    if(vBorS = "S"){
        vTempLTP = vSellPrice;
    }
    else{
        vTempLTP = vBuyPrice;
    }

    try {
        objOrder = vTradeID;
        objOrderDtls = {
            "tid": "server3_282711",
            "stat": "Ok",
            "stCode": 200,
            "data": [
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
                    "avgPrc": vTempLTP,
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
        res.send({ "status": "success", "message": "Close Order Details Received!", "data": objOrderDtls, "nOrdNo" : objOrder });

        // objOrder = await fnExecCloseOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vSymbToken, vTrdSymbol, vBorS, vOrderQty, vOrderNo);
        // // console.log(JSON.stringify(objOrder.data));
        // if(objOrder.data.stat === "Ok"){

        //     objOrderDtls = await fnGetOrderDetails(vHsServerId, vSid, vKotakSession, vAccessToken);

        //     res.send({ "status": "success", "message": "Closed Order Details Received!", "data": objOrderDtls.data, "nOrdNo" : objOrder.data.nOrdNo });
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

exports.fnGetTokenforOptionRate = async (req, res) => {
    let vJsonFileName = req.body.JsonFileName;
    let vSearchSymbol = req.body.SearchSymbol;
    let vOptionType = req.body.OptionType;
    let vExpiryEpoch = req.body.ExpiryEpoch;
    let vStrikePrice = req.body.StrikePrice;

    console.log(vStrikePrice);
    try{
        let objTokenData = await fnGetTradeTokenData(vJsonFileName, vSearchSymbol, vOptionType, vExpiryEpoch, vStrikePrice);

        // console.log(objTokenData);
        res.send({ status: objTokenData.status, message: objTokenData.message, data: objTokenData.data });
    }
    catch (err) {
        res.send({ status: err.status, message: err.message, data: err.data });
    }
}

exports.fnGetOptTokenforCurrStrike = async (req, res) => {
    let vJsonFileName = req.body.JsonFileName;
    let vSearchSymbol = req.body.SearchSymbol;
    let vExpiryEpoch = req.body.ExpiryEpoch;
    let vStrikePriceCE = req.body.StrikePriceCE;
    let vStrikePricePE = req.body.StrikePricePE;

    // console.log(vJsonFileName);
    try{
        let objTokenDataCE = await fnGetOptTradeTokenData(vJsonFileName, vSearchSymbol, "CE", vExpiryEpoch, vStrikePriceCE);
        let objTokenDataPE = await fnGetOptTradeTokenData(vJsonFileName, vSearchSymbol, "PE", vExpiryEpoch, vStrikePricePE);

        // console.log(objTokenDataCE.data.Token);
        // console.log(objTokenDataCE.data);
        // console.log(objTokenDataPE.data);
        
        let objFData = { TokenCE: objTokenDataCE.data.Token, TokenPE: objTokenDataPE.data.Token, TrdSymbolCE: objTokenDataCE.data.TrdSymbol, TrdSymbolPE: objTokenDataPE.data.TrdSymbol, ExchSeg: objTokenDataPE.data.ExchSeg, Exchange: objTokenDataPE.data.Exchange, LotSize: objTokenDataPE.data.LotSize, MaxPerOrdQty: objTokenDataPE.data.MaxPerOrdQty };

        res.send({ status: objTokenDataCE.status, message: objTokenDataCE.message, data: objFData });
    }
    catch (err) {
        res.send({ status: err.status, message: err.message, data: err.data });
    }
    // res.send({ status: "success", message: "Option Token Received", data: "" });
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
    let objOrderData = {OrderData: []};
    let objTempOrderBook = "";

    try{
        // objTempOrderBook = objOrderData.OrderData;
        objOrderData = { OrderData: [{ "stat": "Ok", "nOrdNo": "241216000405363", "tid": "server2_2451094", "stCode": 200 }] };
        
        objTempOrderBook = await fnTempOrderBook("241216000405363", parseInt(vOrderQty), parseInt(vLotSize), vToken, vExchSeg, vBorS, vTrdSymbol, vOptionType, vSearchSymbol, vStrikePrice, vCurrRate);
        // Single Order for Paper Trade

        let vCumFilledQty = 0;
        let vCumPrice = 0;
        let vRecCount = 0;
        let vExpiryDt = "";

        for(let i=0; i<objOrderData.OrderData.length; i++){
            for(let j=0; j<objTempOrderBook.data.length; j++){
                if((objOrderData.OrderData[i].nOrdNo === objTempOrderBook.data[j].nOrdNo) && (objTempOrderBook.data[j].ordSt === "complete")){
                    vCumFilledQty += parseInt(objTempOrderBook.data[j].fldQty);
                    vCumPrice += parseFloat(objTempOrderBook.data[j].avgPrc);
                    vExpiryDt = objTempOrderBook.data[j].expDt;
                    vRecCount += 1;
                }
            }
        }
        vCumFilledQty = vCumFilledQty/parseInt(vLotSize);
        vCumPrice = vCumPrice/vRecCount;
        
        if(vCumFilledQty > 0){
            let vOrdrCnfData = { TradeID:"", SymToken: vToken, ClientID: "", SearchSymbol: vSearchSymbol, TrdSymbol: vTrdSymbol, Expiry: vExpiryDt, Strike: (parseInt(vStrikePrice)/100), ByorSl: vBorS, OptionType: vOptionType, LotSize: vLotSize, Quantity: vCumFilledQty, BuyPrice: vCumPrice, SellPrice: vCumPrice, ProfitLoss: 0, StopLoss: 10, TakeProfit: 20, TrailSL: 0, EntryDT: "", ExitDT: "", ExchSeg: vExchSeg, MaxOrderQty: vMaxOrderQty };

            res.send({ status: "success", message: "Order Placed Successfully", data: vOrdrCnfData });    
        }
        else{
            res.send({ status: "danger", message: "Order Rejected, Please check Orderbook!", data: "" });    
        }
    }
    catch (err) {
        res.send({ status: err.status, message: "Option Order - " + err.message, data: err.data });
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

    try{
        let vLoopNos = Math.ceil(parseInt(vOrderQty) / parseInt(vMaxOrderQty));
        let vExecTempQty = vOrderQty;
    
        let objOrderData = {OrderData: []};
    
        for(let i=0; i<vLoopNos; i++){
            if(i === (vLoopNos - 1)){
                let vTempData = await fnExecOptNrmlOrder(vHsServerId, vSid, vKotakSession, vAccessToken, vExchSeg, vToken, vTrdSymbol, vBorS, (parseInt(vExecTempQty) * parseInt(vLotSize)), vLotSize);
                objOrderData.OrderData.push(vTempData.data);
            }
            else{
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
    
        for(let i=0; i<objOrderData.OrderData.length; i++){
            for(let j=0; j<objTempOrderBook.data.length; j++){
                if((objOrderData.OrderData[i].nOrdNo === objTempOrderBook.data[j].nOrdNo) && (objTempOrderBook.data[j].ordSt === "complete")){
                    vCumFilledQty += parseInt(objTempOrderBook.data[j].fldQty);
                    vCumPrice += parseFloat(objTempOrderBook.data[j].avgPrc);
                    vExpiryDt = objTempOrderBook.data[j].expDt;
                    vRecCount += 1;
                }
            }
        }
    
        vCumFilledQty = vCumFilledQty/parseInt(vLotSize);
        vCumPrice = vCumPrice/vRecCount;
    
        if(vCumFilledQty > 0){
            let vOrdrCnfData = { TradeID:"", SymToken: vToken, ClientID: "", SearchSymbol: vSearchSymbol, TrdSymbol: vTrdSymbol, Expiry: vExpiryDt, Strike: (parseInt(vStrikePrice)/100), ByorSl: vBorS, OptionType: vOptionType, LotSize: vLotSize, Quantity: vCumFilledQty, BuyPrice: vCumPrice, SellPrice: vCumPrice, ProfitLoss: 0, StopLoss: 10, TakeProfit: 20, TrailSL: 0, EntryDT: "", ExitDT: "", ExchSeg: vExchSeg, MaxOrderQty: vMaxOrderQty };

            res.send({ status: "success", message: "Order Placed Successfully", data: vOrdrCnfData });    
        }
        else{
            res.send({ status: "danger", message: "Order Rejected, Please check Orderbook!", data: "" });    
        }
    }
    catch (err) {
        console.log("Test");
        res.send({ status: "danger", message: "Option Order - " + err.message, data: err.data });
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
            data : data
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
            data : data
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

        let data = qs.stringify({ 'jData': '{"am":"NO", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "tk":"' + pSymbToken + '", "ts":"' + pTrdSymbol + '", "tt":"'+ pBorS + '", "algId":"'+ pRandId +'"}' });
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

        let data = qs.stringify({ 'jData': '{"am":"NO", "cf":"", "dq":"0","es":"' + pExchSeg + '", "mp":"0", "pc":"MIS", "pf":"N", "pr":"0", "pt":"MKT", "qt":"' + pOrderQty + '", "rt":"DAY", "tp":"0", "ts":"' + pTrdSymbol + '", "tt":"'+ pBorS + '", "tk":"' + pSymbToken + '", "ig":"TestGUID", "sc":"TestTag"}' });

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

const fnTempOrderBook = async (pOrderId, pOrderQty, pLotSize, pToken, pExchSeg, pBorS, pTrdSymbol, pOptionType, pSearchSymbol, pStrikePrice, pCurrRate) => {
    const objData = new Promise((resolve, reject) => {
        //Single Order for paper Trade
        const objTempOrdBook = {
            "tid": "server2_2502351",
            "stat": "Ok",
            "stCode": 200,
            "data": [
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
                    "uSec": "321902",
                    "classification": "0",
                    "mktPro": "0.00",
                    "ordEntTm": "16-Dec-2024 12:59:54",
                    "reqId": "1",
                    "algSeqNo": "NA",
                    "qty": (pOrderQty * pLotSize),
                    "unFldSz": 0,
                    "mktProPct": "--",
                    "algCat": "NA",
                    "exOrdId": "1300000128766436",
                    "dscQty": 0,
                    "actId": "XIAVR",
                    "expDt": "19 Dec, 2024",
                    "trgPrc": "0.00",
                    "tok": pToken,
                    "symOrdId": "NA",
                    "fldQty": (pOrderQty * pLotSize),
                    "ordDtTm": "16-Dec-2024 12:59:54",
                    "avgPrc": pCurrRate,
                    "locId": "111111111111100",
                    "algId": "NA",
                    "stat": "Ok",
                    "prod": "MIS",
                    "exSeg": pExchSeg,
                    "GuiOrdId": "1734334194-316617-AOGPK8647F-ADMINAPI",
                    "usrId": "AOGPK8647F",
                    "rptTp": "NA",
                    "exCfmTm": "16-Dec-2024 12:59:54",
                    "hsUpTm": "2024/12/16 12:59:54",
                    "updRecvTm": 1734334194322887400,
                    "ordGenTp": "NA",
                    "vldt": "DAY",
                    "tckSz": "0.05",
                    "ordSt": "complete",
                    "trnsTp": pBorS,
                    "refLmtPrc": 0,
                    "coPct": 0,
                    "nOrdNo": pOrderId,
                    "ordAutSt": "NA",
                    "strategyCode": "NA",
                    "rejRsn": "--",
                    "boeSec": 1734334194,
                    "expDtSsb": "1734618600",
                    "dscQtyPct": "0",
                    "stkPrc": (parseInt(pStrikePrice)/100),
                    "sym": pSearchSymbol,
                    "trdSym": pTrdSymbol,
                    "multiplier": "1",
                    "precision": "2",
                    "noMktProFlg": "0.00",
                    "genNum": "1",
                    "series": "XX",
                    "prcNum": "1",
                    "genDen": "1",
                    "brdLtQty": pLotSize,
                    "mktProFlg": "0.00",
                    "defMktProV": "0.00",
                    "lotSz": pLotSize,
                    "minQty": 0,
                    "optTp": pOptionType,
                    "prcDen": "1"
                }
            ]
        }

        //Multiple Orders for Paper Trade
        // const objTempOrdBook = {
        //     "tid": "server2_2502351",
        //     "stat": "Ok",
        //     "stCode": 200,
        //     "data": [
        //         {
        //             "brkClnt": "--",
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
        //             "uSec": "575916",
        //             "classification": "0",
        //             "mktPro": "0.00",
        //             "ordEntTm": "16-Dec-2024 12:35:31",
        //             "reqId": "1",
        //             "algSeqNo": "NA",
        //             "qty": 2,
        //             "unFldSz": 0,
        //             "mktProPct": "--",
        //             "algCat": "NA",
        //             "exOrdId": "1300000118158688",
        //             "dscQty": 0,
        //             "actId": "XIAVR",
        //             "expDt": "19 Dec, 2024",
        //             "trgPrc": "0.00",
        //             "tok": "47421",
        //             "symOrdId": "NA",
        //             "fldQty": 0,
        //             "ordDtTm": "16-Dec-2024 12:35:31",
        //             "avgPrc": "0.00",
        //             "locId": "111111111111100",
        //             "algId": "NA",
        //             "stat": "Ok",
        //             "prod": "MIS",
        //             "exSeg": "nse_fo",
        //             "GuiOrdId": "1734332731-571360-AOGPK8647F-ADMINAPI",
        //             "usrId": "AOGPK8647F",
        //             "rptTp": "NA",
        //             "exCfmTm": "NA",
        //             "hsUpTm": "2024/12/16 12:36:39",
        //             "updRecvTm": 1734332799314122800,
        //             "ordGenTp": "NA",
        //             "vldt": "DAY",
        //             "tckSz": "0.05",
        //             "ordSt": "rejected",
        //             "trnsTp": "B",
        //             "refLmtPrc": 0,
        //             "coPct": 0,
        //             "nOrdNo": "241216000373861",
        //             "ordAutSt": "NA",
        //             "strategyCode": "NA",
        //             "rejRsn": "16556 : Quantity less than the minimum lot size",
        //             "boeSec": 1734332731,
        //             "expDtSsb": "1734618600",
        //             "dscQtyPct": "0",
        //             "stkPrc": "24750.00",
        //             "sym": "NIFTY",
        //             "trdSym": "NIFTY24D1924750CE",
        //             "multiplier": "1",
        //             "precision": "2",
        //             "noMktProFlg": "0.00",
        //             "genNum": "1",
        //             "series": "XX",
        //             "prcNum": "1",
        //             "genDen": "1",
        //             "brdLtQty": "25",
        //             "mktProFlg": "0.00",
        //             "defMktProV": "0.00",
        //             "lotSz": "25",
        //             "minQty": 0,
        //             "optTp": "CE",
        //             "prcDen": "1"
        //         },
        //         {
        //             "brkClnt": "--",
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
        //             "uSec": "413162",
        //             "classification": "0",
        //             "mktPro": "0.00",
        //             "ordEntTm": "16-Dec-2024 12:35:31",
        //             "reqId": "1",
        //             "algSeqNo": "NA",
        //             "qty": 3,
        //             "unFldSz": 0,
        //             "mktProPct": "--",
        //             "algCat": "NA",
        //             "exOrdId": "1300000118156643",
        //             "dscQty": 0,
        //             "actId": "XIAVR",
        //             "expDt": "19 Dec, 2024",
        //             "trgPrc": "0.00",
        //             "tok": "47421",
        //             "symOrdId": "NA",
        //             "fldQty": 0,
        //             "ordDtTm": "16-Dec-2024 12:35:31",
        //             "avgPrc": "0.00",
        //             "locId": "111111111111100",
        //             "algId": "NA",
        //             "stat": "Ok",
        //             "prod": "MIS",
        //             "exSeg": "nse_fo",
        //             "GuiOrdId": "1734332731-407215-AOGPK8647F-ADMINAPI",
        //             "usrId": "AOGPK8647F",
        //             "rptTp": "NA",
        //             "exCfmTm": "NA",
        //             "hsUpTm": "2024/12/16 12:36:39",
        //             "updRecvTm": 1734332799314258000,
        //             "ordGenTp": "NA",
        //             "vldt": "DAY",
        //             "tckSz": "0.05",
        //             "ordSt": "rejected",
        //             "trnsTp": "B",
        //             "refLmtPrc": 0,
        //             "coPct": 0,
        //             "nOrdNo": "241216000373851",
        //             "ordAutSt": "NA",
        //             "strategyCode": "NA",
        //             "rejRsn": "16556 : Quantity less than the minimum lot size",
        //             "boeSec": 1734332731,
        //             "expDtSsb": "1734618600",
        //             "dscQtyPct": "0",
        //             "stkPrc": "24750.00",
        //             "sym": "NIFTY",
        //             "trdSym": "NIFTY24D1924750CE",
        //             "multiplier": "1",
        //             "precision": "2",
        //             "noMktProFlg": "0.00",
        //             "genNum": "1",
        //             "series": "XX",
        //             "prcNum": "1",
        //             "genDen": "1",
        //             "brdLtQty": "25",
        //             "mktProFlg": "0.00",
        //             "defMktProV": "0.00",
        //             "lotSz": "25",
        //             "minQty": 0,
        //             "optTp": "CE",
        //             "prcDen": "1"
        //         },
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
        //             "uSec": "321902",
        //             "classification": "0",
        //             "mktPro": "0.00",
        //             "ordEntTm": "16-Dec-2024 12:59:54",
        //             "reqId": "1",
        //             "algSeqNo": "NA",
        //             "qty": 75,
        //             "unFldSz": 0,
        //             "mktProPct": "--",
        //             "algCat": "NA",
        //             "exOrdId": "1300000128766436",
        //             "dscQty": 0,
        //             "actId": "XIAVR",
        //             "expDt": "19 Dec, 2024",
        //             "trgPrc": "0.00",
        //             "tok": "47421",
        //             "symOrdId": "NA",
        //             "fldQty": 75,
        //             "ordDtTm": "16-Dec-2024 12:59:54",
        //             "avgPrc": "128.15",
        //             "locId": "111111111111100",
        //             "algId": "NA",
        //             "stat": "Ok",
        //             "prod": "MIS",
        //             "exSeg": "nse_fo",
        //             "GuiOrdId": "1734334194-316617-AOGPK8647F-ADMINAPI",
        //             "usrId": "AOGPK8647F",
        //             "rptTp": "NA",
        //             "exCfmTm": "16-Dec-2024 12:59:54",
        //             "hsUpTm": "2024/12/16 12:59:54",
        //             "updRecvTm": 1734334194322887400,
        //             "ordGenTp": "NA",
        //             "vldt": "DAY",
        //             "tckSz": "0.05",
        //             "ordSt": "complete",
        //             "trnsTp": "B",
        //             "refLmtPrc": 0,
        //             "coPct": 0,
        //             "nOrdNo": "241216000405363",
        //             "ordAutSt": "NA",
        //             "strategyCode": "NA",
        //             "rejRsn": "--",
        //             "boeSec": 1734334194,
        //             "expDtSsb": "1734618600",
        //             "dscQtyPct": "0",
        //             "stkPrc": "24750.00",
        //             "sym": "NIFTY",
        //             "trdSym": "NIFTY24D1924750CE",
        //             "multiplier": "1",
        //             "precision": "2",
        //             "noMktProFlg": "0.00",
        //             "genNum": "1",
        //             "series": "XX",
        //             "prcNum": "1",
        //             "genDen": "1",
        //             "brdLtQty": "25",
        //             "mktProFlg": "0.00",
        //             "defMktProV": "0.00",
        //             "lotSz": "25",
        //             "minQty": 0,
        //             "optTp": "CE",
        //             "prcDen": "1"
        //         },
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
        //             "uSec": "478398",
        //             "classification": "0",
        //             "mktPro": "0.00",
        //             "ordEntTm": "16-Dec-2024 12:59:54",
        //             "reqId": "1",
        //             "algSeqNo": "NA",
        //             "qty": 50,
        //             "unFldSz": 0,
        //             "mktProPct": "--",
        //             "algCat": "NA",
        //             "exOrdId": "1300000128768357",
        //             "dscQty": 0,
        //             "actId": "XIAVR",
        //             "expDt": "19 Dec, 2024",
        //             "trgPrc": "0.00",
        //             "tok": "47421",
        //             "symOrdId": "NA",
        //             "fldQty": 50,
        //             "ordDtTm": "16-Dec-2024 12:59:54",
        //             "avgPrc": "128.20",
        //             "locId": "111111111111100",
        //             "algId": "NA",
        //             "stat": "Ok",
        //             "prod": "MIS",
        //             "exSeg": "nse_fo",
        //             "GuiOrdId": "1734334194-473765-AOGPK8647F-ADMINAPI",
        //             "usrId": "AOGPK8647F",
        //             "rptTp": "NA",
        //             "exCfmTm": "16-Dec-2024 12:59:54",
        //             "hsUpTm": "2024/12/16 12:59:54",
        //             "updRecvTm": 1734334194479088000,
        //             "ordGenTp": "NA",
        //             "vldt": "DAY",
        //             "tckSz": "0.05",
        //             "ordSt": "complete",
        //             "trnsTp": "B",
        //             "refLmtPrc": 0,
        //             "coPct": 0,
        //             "nOrdNo": "241216000405368",
        //             "ordAutSt": "NA",
        //             "strategyCode": "NA",
        //             "rejRsn": "--",
        //             "boeSec": 1734334194,
        //             "expDtSsb": "1734618600",
        //             "dscQtyPct": "0",
        //             "stkPrc": "24750.00",
        //             "sym": "NIFTY",
        //             "trdSym": "NIFTY24D1924750CE",
        //             "multiplier": "1",
        //             "precision": "2",
        //             "noMktProFlg": "0.00",
        //             "genNum": "1",
        //             "series": "XX",
        //             "prcNum": "1",
        //             "genDen": "1",
        //             "brdLtQty": "25",
        //             "mktProFlg": "0.00",
        //             "defMktProV": "0.00",
        //             "lotSz": "25",
        //             "minQty": 0,
        //             "optTp": "CE",
        //             "prcDen": "1"
        //         },
        //         {
        //             "brkClnt": "08081",
        //             "ordValDt": "NA",
        //             "exUsrInfo": "NA",
        //             "mfdBy": "NA",
        //             "vendorCode": "",
        //             "rmk": "--",
        //             "odCrt": "NA",
        //             "ordSrc": "ADMINCPPAPI_WEB",
        //             "sipInd": "NA",
        //             "prc": "0.00",
        //             "prcTp": "MKT",
        //             "cnlQty": 0,
        //             "uSec": "522169",
        //             "classification": "0",
        //             "mktPro": "0.00",
        //             "ordEntTm": "16-Dec-2024 13:02:30",
        //             "reqId": "1",
        //             "algSeqNo": "NA",
        //             "qty": 125,
        //             "unFldSz": 0,
        //             "mktProPct": "--",
        //             "algCat": "NA",
        //             "exOrdId": "1300000129784711",
        //             "dscQty": 0,
        //             "actId": "XIAVR",
        //             "expDt": "19 Dec, 2024",
        //             "trgPrc": "0.00",
        //             "tok": "47421",
        //             "symOrdId": "NA",
        //             "fldQty": 125,
        //             "ordDtTm": "16-Dec-2024 13:02:30",
        //             "avgPrc": "132.49",
        //             "locId": "111111111111100",
        //             "algId": "NA",
        //             "stat": "Ok",
        //             "prod": "MIS",
        //             "exSeg": "nse_fo",
        //             "GuiOrdId": "1734334350-516359-AOGPK8647F-ADMINAPI",
        //             "usrId": "AOGPK8647F",
        //             "rptTp": "NA",
        //             "exCfmTm": "16-Dec-2024 13:02:30",
        //             "hsUpTm": "2024/12/16 13:02:30",
        //             "updRecvTm": 1734334350523282000,
        //             "ordGenTp": "NA",
        //             "vldt": "DAY",
        //             "tckSz": "0.05",
        //             "ordSt": "complete",
        //             "trnsTp": "S",
        //             "refLmtPrc": 0,
        //             "coPct": 0,
        //             "nOrdNo": "241216000409992",
        //             "ordAutSt": "NA",
        //             "strategyCode": "NA",
        //             "rejRsn": "--",
        //             "boeSec": 1734334350,
        //             "expDtSsb": "1734618600",
        //             "dscQtyPct": "0",
        //             "stkPrc": "24750.00",
        //             "sym": "NIFTY",
        //             "trdSym": "NIFTY24D1924750CE",
        //             "multiplier": "1",
        //             "precision": "2",
        //             "noMktProFlg": "0.00",
        //             "genNum": "1",
        //             "series": "XX",
        //             "prcNum": "1",
        //             "genDen": "1",
        //             "brdLtQty": "25",
        //             "mktProFlg": "0.00",
        //             "defMktProV": "0.00",
        //             "lotSz": "25",
        //             "minQty": 0,
        //             "optTp": "CE",
        //             "prcDen": "1"
        //         }
        //     ]
        // }

        resolve({ "status": "success", "message": "Orderbook Details Received!", "data": objTempOrdBook.data });
    });
    return objData;
}

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
  
          if(vData["Symbol"]){
            for (let i = 0; i < vData["Symbol"].length; i++){
                if((vData["Symbol"][i].pSymbolName === pSearchSymbol) && (vData["Symbol"][i].pExpiryDate === pExpiryEpoch) && (vData["Symbol"][i].pStrikePrice === pStrikePrice) && (vData["Symbol"][i].pOptionType === pOptionType)){
                    vToken = vData["Symbol"][i].pSymbol;
                    vExchSeg = vData["Symbol"][i].pExchSeg;
                    vExchange = vData["Symbol"][i].pExchange;
                    vTrdSymbol = vData["Symbol"][i].pTrdSymbol;
                    vLotSize = vData["Symbol"][i].pLotSize;
                    vMaxPerOrdQty = vData["Symbol"][i].MaxPerOrdQty;
                    
                    // console.log(vData["Symbol"][i].pSymbol + " - " + vData["Symbol"][i].pTrdSymbol);
                }
            }
            if (vToken === ""){
                reject({ "status": "warning", "message": "Option Token Not Found, Check Expiry Date!", "data": "" });
            }
            else{
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

const fnGetOptTradeTokenData = async (pJsonFileName, pSearchSymbol, pOptionType, pExpiryEpoch, pStrikePrice) => {
    const objData = new Promise((resolve, reject) => {
        // console.log(pJsonFileName + " - " + pSearchSymbol + " - " + pOptionType + " - " + pExpiryEpoch + " - " + pStrikePrice);
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

            if(vData["Symbol"]){
            for (let i = 0; i < vData["Symbol"].length; i++){
                if((vData["Symbol"][i].pSymbolName === pSearchSymbol) && (vData["Symbol"][i].pExpiryDate === parseInt(pExpiryEpoch)) && (vData["Symbol"][i].pStrikePrice === pStrikePrice) && (vData["Symbol"][i].pOptionType === pOptionType)){
                    vToken = vData["Symbol"][i].pSymbol;
                    vExchSeg = vData["Symbol"][i].pExchSeg;
                    vExchange = vData["Symbol"][i].pExchange;
                    vTrdSymbol = vData["Symbol"][i].pTrdSymbol;
                    vLotSize = vData["Symbol"][i].pLotSize;
                    vMaxPerOrdQty = vData["Symbol"][i].MaxPerOrdQty;
                    
                    // console.log(vData["Symbol"][i].pSymbol + " - " + vData["Symbol"][i].pTrdSymbol);
                }
            }
            if (vToken === ""){
                reject({ "status": "warning", "message": "Option Token Not Found, Check Expiry Date!", "data": "" });
            }
            else{
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
        // resolve({ "status": "success", "message": "Success - Option Data Received!", "data": "" });
    });

    // console.log(pExpiryEpoch);

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