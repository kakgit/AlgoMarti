//Replace in config.env
//MONGODB_URI=mongodb+srv://kamarthianil:JClOaCHWnkye9O6g@clusterkak.2qbgbpn.mongodb.net/AlgoDB
//MONGODB_URI=mongodb://127.0.0.1:27017/AlgoDB


const http = require("http");
const express = require("express");
const expressLayout = require('express-ejs-layouts');
const dotenv = require("dotenv");
const morgan = require("morgan");
const bodyparser = require("body-parser");
const path = require("path");
const { Server } = require("socket.io");
var request = require('request');

const connectDB = require("./server/database/connection.js");

const app = express();

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
    
    const objMsg = JSON.stringify({ symbolName: vSymbolName, indType: vIndType, direction: vDirection, strike: vStrike, cnf: vCnf });

    //console.log(objMsg);

    // var options = {
    //   'method': 'POST',
    //   'url': process.env.API_PATH + 'api/tvMsgs',
    //   'headers': {
    //     'Content-Type': 'application/json'
    //   },
    //   body: objMsg
    // };

    // request(options, function (error, response) {
    //   if (error) throw new Error(error);
    //   //console.log(response.body);
    // });

    io.emit("ServerEmit", objMsg);

    res.send("success");
    //res.render("index.ejs");
    return;
});

app.use('/', require('./server/routes/router.js'));

// app.get('*', (req, res) => {
//     res.status(404).render('404.ejs');
// });

server.listen(vPort, ()=> {
    console.log(`Server is running on ${process.env.API_PATH}`);
});