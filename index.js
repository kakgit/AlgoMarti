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
    return;
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
    return;
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
    const vDirec = req.body.Direc;
    
    const objMsg = JSON.stringify({ Direc: vDirec });

    //console.log(objMsg);
    io.emit("CdlEmaTrend", objMsg);

    res.send("success");
});

app.post("/tv-btcusd-exec", (req, res) => {
    const vTransType = req.body.direc;

    let objMsg = {TransType: vTransType};

    io.emit("tv-btcusd-exec", objMsg);
    res.send({ status: "success", message: "Open " + objMsg.TransType + " Trade Received!", data: objMsg });
});

app.post("/tv-btcusd-close", (req, res) => {
    const vTransType = req.body.direc;

    let objMsg = {TransType: vTransType};

    io.emit("tv-btcusd-close", objMsg);
    res.send({ status: "success", message: "Close " + objMsg.TransType + " Trade Received!", data: objMsg });
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