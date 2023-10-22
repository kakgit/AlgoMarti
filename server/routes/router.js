const express = require('express');
const route = express.Router();

const homeServices = require('../services/homePage.js');
const samcoServices = require('../services/samcoPage.js');
const controller = require('../controller/controllerTvMsgs.js');

//home Routes
route.get("/", homeServices.defaultRoute);


//Samco Routes
route.get("/samco", samcoServices.defaultRoute);


//API
route.post('/api/tvMsgs', controller.addNewMsg);


module.exports = route;