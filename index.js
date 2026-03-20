//Replace in config.env
//MONGODB_URI=mongodb+srv://kamarthianil:JClOaCHWnkye9O6g@clusterkak.2qbgbpn.mongodb.net/AlgoDB
//MONGODB_URI=mongodb://127.0.0.1:27017/AlgoDB


const http = require("http");
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const expressLayout = require('express-ejs-layouts');
const dotenv = require("dotenv");
const morgan = require("morgan");
const bodyparser = require("body-parser");
const path = require("path");
const axios = require("axios");
const { Server } = require("socket.io");

// const connectDB = require("./server/database/connection.js");

const app = express();
app.use(cors());

dotenv.config({path: 'config.env'});

const vPort = process.env.PORT || 8080;

//mongoDB Connection caller
//connectDB();

const server = http.createServer(app);
const io = new Server(server);
const objCFV2RateWatchers = new Map();

io.on("connection", (cSocket) => {
    //console.log("New User ID: ", cSocket.id);

    cSocket.on("UserMessage", (pMsg) => {
        //console.log("New Msg from client: " + pMsg);
        io.emit("ClientEmit", pMsg);
    });

    cSocket.on("MaheshMsg", (pObjMsg) => {
        //console.log("New Msg from client: " + pObjMsg.symbolName);

        io.emit("MaheshEmit", pObjMsg);
    });

    cSocket.on("SymbolsUpdated", (pMsg) => {
        //console.log("New Msg from client: " + pMsg);
        io.emit("UpdateSym", pMsg);
    });

    cSocket.on("SendTrdToAll", (pObjMsg) => {
        io.emit("ServerEmit", pObjMsg);
    });

    cSocket.on("DeltaMsgAll1", (pObjMsg) => {
        io.emit("DeltaMsgRec1", pObjMsg);
    });

    cSocket.on("CFV2_WatchPaperTrades", (pObjMsg) => {
        fnSetCFV2RatesWatcher(cSocket, pObjMsg);
    });

    cSocket.on("disconnect", () => {
        fnClearCFV2RatesWatcher(cSocket.id);
    });
});

//log requests
//app.use(morgan("tiny"));

//static folder files
app.use(express.static('public'));


//parse request to body-parser
app.use(bodyparser.urlencoded({extended:true}));
app.use(bodyparser.json());

//Setup Templating Engine
app.use(expressLayout);
app.set('layout', "./layouts/main");
app.set('view engine', 'ejs');

//uncomment the below stmt only if the views has subfolders. By Default root of views is searched
//app.set("views", path.resolve(__dirname, "views/ejs"));

// //load assets
// app.use("/css", express.static(path.resolve(__dirname, "assets/css")));
// app.use("/img", express.static(path.resolve(__dirname, "assets/img")));
// app.use("/js", express.static(path.resolve(__dirname, "assets/js")));

app.post("/tv-msg-delta-fut", (req, res) => {
    const vSymbolName = req.body.symbolName;
    const vStrategy = req.body.strategy;
    const vDirection = req.body.direction;
    const vIgnorePrevIndc = req.body.ignorePrevIndc

    const objMsg = JSON.stringify({ symbolName: vSymbolName, strategy: vStrategy, direction: vDirection, ignorePrevIndc: vIgnorePrevIndc });

    io.emit("DeltaEmit1", objMsg);

    res.send("Success");
});

app.post("/tv-msg-delta-opt", (req, res) => {
    const vSymbolName = req.body.symbolName;
    const vStrategy = req.body.strategy;
    const vDirection = req.body.direction;
    const vOptionType = req.body.optionType;
    const vClosePrice = req.body.closePrice;
    const vIgnorePrevIndc = req.body.ignorePrevIndc

    const objMsg = JSON.stringify({ symbolName: vSymbolName, strategy: vStrategy, direction: vDirection, optionType: vOptionType, closePrice: vClosePrice, ignorePrevIndc: vIgnorePrevIndc });

    io.emit("DeltaEmitOpt", objMsg);

    res.send({ status: "success", message: vSymbolName + " " + vDirection + " - " + vOptionType + " Trade Sent to Admin!", data: objMsg });
});

app.post("/tvMsgOSD", (req, res) => {
    const vSymbolName = req.body.symbolName;
    const vDirection = req.body.direction;
    const vOptionType = req.body.optionType;

    const objMsg = JSON.stringify({ symbolName: vSymbolName, direction: vDirection, optionType: vOptionType });

    io.emit("DeltaEmitOSD", objMsg);

    res.send({ status: "success", message: vSymbolName + " " + vDirection + " - " + vOptionType + " Trade Sent to Admin!", data: objMsg });
});

app.post("/tv-msg", (req, res) => {
    const vSymbolName = req.body.symbolName;
    const vIndType = req.body.indType;
    const vDirection = req.body.direction;
    const vStrike = req.body.strike;
    const vCnf = req.body.cnf;
    
    //console.log(vCnf);

    const objMsg = JSON.stringify({ symbolName: vSymbolName, indType: vIndType, direction: vDirection, strike: vStrike, cnf: vCnf });

    io.emit("ServerEmit", objMsg);

    res.send("success");
});

app.post("/c3mh/:symb/:optTyp", (req, res) => {

    let objMsg = {Symbol: req.params.symb, OptionType: req.params.optTyp};

    io.emit("c3mh", objMsg);
    res.send({ status: "success", message: objMsg.OptionType + " Trade Received!", data: objMsg });
});

app.post("/tv-exec-msg", (req, res) => {
    const vSymbolName = req.body.symbol;
    const vDirection = req.body.direc;
    const vOpen = req.body.open;
    const vHigh = req.body.high;
    const vLow = req.body.low;
    const vClose = req.body.close;

    let objMsg = {Symbol: vSymbolName, OptionType: vDirection, Open: vOpen, High: vHigh, Low: vLow, Close: vClose};

    io.emit("tv-exec", objMsg);
    res.send({ status: "success", message: objMsg.OptionType + " Trade Received!", data: objMsg });
});

app.post("/tv-exec-close", (req, res) => {
    const vDirection = req.body.direc;

    let objMsg = {OptionType: vDirection};

    io.emit("tv-exec-close", objMsg);
    res.send({ status: "success", message: "Close " + objMsg.OptionType + " Trade Received!", data: objMsg });
});

app.post("/tv-msg-mahesh", (req, res) => {
    const vSymbolName = req.body.symbolName;
    const vIndType = req.body.indType;
    const vDirection = req.body.direction;
    
    const objMsg = JSON.stringify({ symbolName: vSymbolName, indType: vIndType, direction: vDirection });

    io.emit("MaheshEmit", objMsg);

    res.send("success");
});

app.post("/tv-msg-trend", (req, res) => {
    const vHigh = req.body.High;
    const vLow = req.body.Low;
    const vClose = req.body.Close;
    
    const objMsg = JSON.stringify({ High15M: vHigh, Low15M: vLow, Close15M: vClose });

    //console.log(objMsg);
    io.emit("CdlTrend", objMsg);

    res.send("success");
});

app.post("/tv-msg-ema-trend", (req, res) => {
    const vIndc = req.body.Indc;
    const vDirec = req.body.Direc;
    const vQty = req.body.Qty;
    
    const objMsg = JSON.stringify({ Indc: vIndc, Direc: vDirec, Qty: vQty });

    //console.log(objMsg);
    io.emit("CdlEmaTrend", objMsg);

    res.send("success");
});

app.post("/tv-msg-ohlc", (req, res) => {
    const vIndc = req.body.Indc;
    const vOpen = req.body.Open;
    const vHigh = req.body.High;
    const vLow = req.body.Low;
    const vCLose = req.body.Close;

    const objMsg = { Indc: vIndc, Open: vOpen, High: vHigh, Low: vLow, Close: vCLose };

    //console.log(objMsg);
    io.emit("cdlOHLC", objMsg);

    res.send("success");
});

app.post("/tv-btcusd-exec", (req, res) => {
    const vIndc = req.body.Indc;
    const vTransType = req.body.direc;

    let objMsg = { Indc: vIndc, TransType: vTransType};

    io.emit("tv-btcusd-exec", objMsg);
    res.send({ status: "success", message: "Open " + objMsg.TransType + " Trade Received!", data: objMsg });
});

app.post("/tvMsgOptSellST", (req, res) => {
    const vAccount = req.body.account;
    const vOptionType = req.body.optionType;

    let objMsg = { Account: vAccount, OptionType : vOptionType };

    io.emit("tv-Msg-Opt-Sell-ST", objMsg);
    res.send({ status: "success", message: "Open " + objMsg.OptionType + " Trade Received!", data: objMsg });
});

app.post("/tvMsgSSDemoOpen", (req, res) => {
    const vOptionType = req.body.optionType;
    const vTransType = req.body.transType;

    let objMsg = { OptionType : vOptionType, TransType : vTransType };

    io.emit("tv-Msg-SSDemo-Open", objMsg);
    res.send({ status: "success", message: "Open " + objMsg.OptionType + " Trade Received!", data: objMsg });
});

app.post("/tvMsgSSDemoClose", (req, res) => {
    const vOptionType = req.body.optionType;
    const vTransType = req.body.transType;

    let objMsg = { OptionType : vOptionType, TransType : vTransType };

    io.emit("tv-Msg-SSDemo-Close", objMsg);
    res.send({ status: "success", message: "Close " + objMsg.OptionType + " Trade Received!", data: objMsg });
});

app.post("/tv-AutoTrd", (req, res) => {
    const vAutoTrade = req.body.AutoTrade;
    let vMsgOnOff = "OFF";
    let objMsg = {AutoTrade : vAutoTrade};

    io.emit("tv-AutoTrade", objMsg);

    if(objMsg.AutoTrade === "true"){
        vMsgOnOff = "ON";
    }
    else{
        vMsgOnOff = "OFF";
    }

    res.send({ status: "success", message: "Auto Trade is " + vMsgOnOff + " !", data: objMsg });
});

app.post("/tv-btcusd-close", (req, res) => {
    const vIndc = req.body.Indc;
    const vTransType = req.body.direc;

    let objMsg = { Indc: vIndc, TransType: vTransType};

    io.emit("tv-btcusd-close", objMsg);
    res.send({ status: "success", message: "Close " + objMsg.TransType + " Trade Received!", data: objMsg });
});

app.post("/refreshAllDFL", (req, res) => {

    io.emit("refreshAllDFL");
    res.send({ status: "success", message: "Refresh All Open DFL Browsers!", data: "" });
});

const storage = multer.diskStorage({
    destination: function(req, file, callback){
        callback(null, __dirname + "/public/uploads");
    },
    filename: function(req, file, callback){

        callback(null, file.originalname);
    }
});

const objUploads = multer({storage: storage});

app.post("/uploadsAB", objUploads.array("files"), (req, res) => {
    // console.log(req.files);
    //console.log("File Name:  " + req.body.pFileName);

    //res.json({status: "files received"});
    res.json({"status": "success", "message": "File/s Uploaded Successfully!"});
});

app.use('/', require('./server/routes/router.js'));

// app.get('*', (req, res) => {
//     res.status(404).render('404.ejs');
// });

server.listen(vPort, ()=> {
    console.log(`Server is running on ${process.env.API_PATH}`);
});

function fnClearCFV2RatesWatcher(pSocketId) {
    const objWatch = objCFV2RateWatchers.get(pSocketId);
    if (objWatch && objWatch.deltaTimer) {
        clearInterval(objWatch.deltaTimer);
    }
    if (objWatch && objWatch.coinTimer) {
        clearInterval(objWatch.coinTimer);
    }
    objCFV2RateWatchers.delete(pSocketId);
}

function fnSetCFV2RatesWatcher(pSocket, pPayload) {
    try {
        const objTrades = Array.isArray(pPayload?.trades) ? pPayload.trades : [];

        fnClearCFV2RatesWatcher(pSocket.id);
        if (objTrades.length === 0) return;

        const objWatch = {
            deltaTimer: null,
            coinTimer: null,
            busyDelta: false,
            busyCoin: false,
            trades: objTrades
        };

        objWatch.deltaTimer = setInterval(async () => {
            if (objWatch.busyDelta) return;
            objWatch.busyDelta = true;
            try {
                const objRates = await fnGetCFV2DeltaRatesByTrades(objWatch.trades);
                pSocket.emit("CFV2_DeltaRatesUpdate", { status: "success", data: objRates, ts: Date.now() });
            } catch (err) {
                pSocket.emit("CFV2_DeltaRatesUpdate", { status: "danger", data: [], ts: Date.now() });
            } finally {
                objWatch.busyDelta = false;
            }
        }, 5000);

        objWatch.coinTimer = setInterval(async () => {
            if (objWatch.busyCoin) return;
            objWatch.busyCoin = true;
            try {
                const objRates = await fnGetCFV2CoinRatesByTrades(objWatch.trades);
                pSocket.emit("CFV2_CoinRatesUpdate", { status: "success", data: objRates, ts: Date.now() });
            } catch (err) {
                pSocket.emit("CFV2_CoinRatesUpdate", { status: "danger", data: [], ts: Date.now() });
            } finally {
                objWatch.busyCoin = false;
            }
        }, 5000);

        objCFV2RateWatchers.set(pSocket.id, objWatch);
    } catch (err) {
        // ignore watcher setup failures for now
    }
}

async function fnGetCFV2DeltaRatesByTrades(pTrades) {
    const objDeltaResp = await axios.get("https://api.india.delta.exchange/v2/tickers?contract_types=perpetual_futures");
    const objDeltaRows = Array.isArray(objDeltaResp.data?.result) ? objDeltaResp.data.result : [];
    const objDeltaMap = {};
    for (const row of objDeltaRows) {
        if (!row?.symbol) continue;
        objDeltaMap[row.symbol] = {
            bestAsk: Number(row?.quotes?.best_ask),
            bestBid: Number(row?.quotes?.best_bid),
            fundingRate: Number(row?.funding_rate),
            nextFundingRealization: normalizeTimestampToMsCFV2(row?.next_funding_realization)
        };
    }

    const objUpdates = [];
    for (const objTrade of (pTrades || [])) {
        const objDelta = objDeltaMap[objTrade.symbolD] || {};
        const vDRate = fnPickRateBySide(objTrade.sideD, objDelta.bestAsk, objDelta.bestBid);
        const vDFunding = Number(objDelta.fundingRate);
        const vDNextFundingTs = Number(objDelta.nextFundingRealization);
        objUpdates.push({
            id: objTrade.id,
            dRate: Number.isFinite(vDRate) ? vDRate : null,
            dBestAsk: Number.isFinite(Number(objDelta.bestAsk)) ? Number(objDelta.bestAsk) : null,
            dBestBid: Number.isFinite(Number(objDelta.bestBid)) ? Number(objDelta.bestBid) : null,
            dFunding: Number.isFinite(vDFunding) ? vDFunding : null,
            dNextFundingTs: Number.isFinite(vDNextFundingTs) ? vDNextFundingTs : null
        });
    }

    return objUpdates;
}

async function fnGetCFV2CoinRatesByTrades(pTrades) {
    const objCoinPairs = [...new Set((pTrades || []).map((x) => x.symbolC).filter(Boolean))];
    const objCoinMap = {};
    const objCoinFundingMap = {};
    try {
        const objFundResp = await axios.get("https://public.coindcx.com/market_data/v3/current_prices/futures/rt");
        const objPrices = objFundResp.data?.prices || {};
        for (const [symb, val] of Object.entries(objPrices)) {
            const vFr = Number(val?.fr);
            objCoinFundingMap[symb] = Number.isFinite(vFr) ? vFr * 100 : null;
        }
    } catch (err) {
        // funding map best-effort only
    }

    await Promise.all(objCoinPairs.map(async (vPair) => {
        try {
            const objResp = await axios.get(`https://public.coindcx.com/market_data/v3/orderbook/${encodeURIComponent(vPair)}-futures/50`);
            const objAsks = objResp.data?.asks || {};
            const objBids = objResp.data?.bids || {};
            const objAskKeys = Object.keys(objAsks).map((x) => Number(x)).filter((x) => Number.isFinite(x));
            const objBidKeys = Object.keys(objBids).map((x) => Number(x)).filter((x) => Number.isFinite(x));
            objCoinMap[vPair] = {
                bestAsk: objAskKeys.length > 0 ? Math.min(...objAskKeys) : null,
                bestBid: objBidKeys.length > 0 ? Math.max(...objBidKeys) : null
            };
        } catch (err) {
            objCoinMap[vPair] = { bestAsk: null, bestBid: null };
        }
    }));

    const objUpdates = [];
    for (const objTrade of (pTrades || [])) {
        const objCoin = objCoinMap[objTrade.symbolC] || {};
        const vCRate = fnPickRateBySide(objTrade.sideC, objCoin.bestAsk, objCoin.bestBid);
        const vCFunding = Number(objCoinFundingMap[objTrade.symbolC]);
        objUpdates.push({
            id: objTrade.id,
            cRate: Number.isFinite(vCRate) ? vCRate : null,
            cBestAsk: Number.isFinite(Number(objCoin.bestAsk)) ? Number(objCoin.bestAsk) : null,
            cBestBid: Number.isFinite(Number(objCoin.bestBid)) ? Number(objCoin.bestBid) : null,
            cFunding: Number.isFinite(vCFunding) ? vCFunding : null
        });
    }
    return objUpdates;
}

function normalizeTimestampToMsCFV2(rawTs) {
    const ts = Number(rawTs);
    if (!Number.isFinite(ts) || ts <= 0) return null;
    // Handle seconds, milliseconds, or microseconds defensively.
    if (ts > 1e14) return Math.floor(ts / 1000); // microseconds -> ms
    if (ts > 1e11) return Math.floor(ts); // already ms
    return Math.floor(ts * 1000); // seconds -> ms
}

function fnPickRateBySide(pSide, pBestAsk, pBestBid) {
    const vAsk = Number(pBestAsk);
    const vBid = Number(pBestBid);
    if (pSide === "B") return Number.isFinite(vAsk) ? vAsk : null;
    if (pSide === "S") return Number.isFinite(vBid) ? vBid : null;
    return null;
}
