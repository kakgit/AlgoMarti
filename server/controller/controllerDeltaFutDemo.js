const axios = require("axios");
const path = require('path');
const qs = require('qs');
const fs = require('fs');
const crypto = require("crypto");
const R = require("ramda");
const DeltaRestClient = require("delta-rest-client");

//Live Account
const vBaseUrl = 'https://api.india.delta.exchange';
const vApiKey = 'zhckjOdxFmHCTFx664ZpJ5H7Oxb3Db';
const vApiSecret = 'IqSL4kBct7CakpEDH9grdWuAgjM0zg4KgB3yGoRjj4xPZm8Qz57LWLaVWqCK';

// //Testnet Account
// const vBaseUrl = 'https://cdn-ind.testnet.deltaex.org';
// const vApiKey = 'jFF1ac2CZ1pYeWD5Gq9pa5CcAg57Pi';
// const vApiSecret = 'xGyqQdrRnEdLHEaPB5pdlgORoe9ZvdWoxQm8F44fKSiXZiXMhujOJzhw8DJO';

exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("deltaFuturesDemo.ejs");
}
