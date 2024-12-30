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

const connectDB = require("./server/database/connection.js");

const app = express();
app.use(cors());

dotenv.config({path: 'config.env'});

const vPort = process.env.PORT || 8080;

//mongoDB Connection caller
connectDB();

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

app.post("/tv-msg-mahesh", (req, res) => {
    const vSymbolName = req.body.symbolName;
    const vIndType = req.body.indType;
    const vDirection = req.body.direction;
    
    const objMsg = JSON.stringify({ symbolName: vSymbolName, indType: vIndType, direction: vDirection });

    io.emit("MaheshEmit", objMsg);

    res.send("success");
    return;
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