const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
// const DeltaRestClient = require("delta-rest-client");

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaDemo.ejs");
}

exports.fnExecTraderLogin = async (req, res) => {
    try {
        let objSession = await fnGetDeltaSession();

        res.send({ "status": "success", "message": "Trader Login - Successful", "data": "" });
    }
    catch (error) {
        console.log("Error: " + error.data);
        res.send({ "status": "danger", "message": error.message, "data": error.data });
    }
}

const fnGetDeltaSession = async () => {
    const objPromise = new Promise((resolve, reject) => {

        resolve({ "status": "success", "message": "Session Received!", "data": "" });
    });
}