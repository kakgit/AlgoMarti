const express = require('express');
const route = express.Router();

const homeServices = require('../services/homePage.js');
const aliceLiveServices = require('../services/aliceLivePage.js');
const samcoServices = require('../services/samcoPage.js');
const finvasiaServices = require('../services/finvasiaPage.js');
const tvMsgsServices = require('../services/tvMsgsPage.js');
const tvMsgsController = require('../controller/controllerTvMsgs.js');
const usersController = require('../controller/controllerUsers.js');
const tvConfsController = require('../controller/controllerJSON.js');
const abController = require("../controller/controllerAliceBlue.js");
const aliceLiveController = require("../controller/controllerAliceLive.js");
const kotakLiveController = require("../controller/controllerKotakLive.js");
const deltaLiveController = require("../controller/controllerDeltaLive.js");

//home Routes
route.get("/", homeServices.defaultRoute);

//Tradingview Signals Routes
route.get("/mahesh", homeServices.signalsTV);

//Alice Live Route
route.get("/aliceLive", aliceLiveServices.defaultRoute);

//Alice Live Route
route.get("/kotakLive", kotakLiveController.defaultRoute);

//Delta Demo Route
route.get("/deltaLive", deltaLiveController.defaultRoute);

//Samco Routes
route.get("/samco", samcoServices.defaultRoute);

//Samco Routes
route.get("/finvasia", finvasiaServices.defaultRoute);
route.post("/finvasia/getSession", finvasiaServices.fnLoginFinvasia);

//manageMsgsTV Routes
//API
route.post('/api/tvMsgs', tvMsgsServices.addNewMsg);

route.get("/manageMsgsTV", tvMsgsServices.defaultRoute);
//route.delete('/deleteMsgsTV/:id', tvMsgsController.fnDeleteTvMsgs);
route.get('/api/tvMsgs', tvMsgsController.fnGetAllTvMsgs);
route.post('/api/tvMsgs/:id', tvMsgsController.fnDelTvMsgById);

route.get('/mngUsers', usersController.fnUsersDefault);
route.post('/api/actionUsers', usersController.fnActions);
route.post('/Users/saveUserDetails', usersController.fnSaveUserDetails);
route.post('/Users/saveAdminDetails', usersController.fnSaveAdminDetails);
route.post('/Users/getUserDetByEmailPass', usersController.fnGetUserDetByEmailPass);
route.post('/Users/getUserChangedPwdStatus', usersController.fnGetUserChangedPwd);
route.post('/Users/deleteUserDetails', usersController.fnDeleteUserDetails);
route.post('/Users/toggleAdmUserRights', usersController.fnToggleAdmUserRights);
route.post('/Users/toggleUserActiveState', usersController.fnToggleUserActiveState);
route.post('/Users/getUserJsonDataById', usersController.fnGetUserJsonDataById);
route.post('/Users/updateUserJsonDetails', usersController.fnUpdateUserJsonDataById);
route.get('/Users/getUserJsonData', usersController.fnLoadUserDetFromJson);
route.post('/Users/getEmailSavePwd', usersController.fnCheckEmailSavePwd);
route.post('/Users/sendPwdByEmail', usersController.fnSendPwdByEmail);

//AliceBlue Routes
route.post("/alice-blue/getSession", abController.fnLoginAliceBlue);
route.post("/alice-blue/getStrikePrice", abController.fnGetStrikePrice);
route.post("/alice-blue/getExecutedTradeRate", abController.fnGetExecutedTradeRate);
route.post("/alice-blue/getOpenTradeRate", abController.fnGetOpenTradeRate);
route.post("/alice-blue/getUserProfileDetails", abController.fnGetUserProfileDetails);
route.post("/alice-blue/getJsonFiles", abController.fnGetJsonFilesData);
route.post("/alice-blue/sqOffPositions", abController.fnSqOffPositions);
route.post("/alice-blue/getTradeBook", abController.fnGetTradeBook);
route.post("/alice-blue/placeBasketOrder", abController.fnPlaceBasketOrder);
route.post("/alice-blue/placeNormalOrder", abController.fnPlaceNormalOrder);

//AliceBlue Real Trade Routes
route.post("/alice-blue/getOrderPlacedDetails", abController.fnOrderPlacedDetails);

//Kotak Neo Routes
route.post("/kotakNeo/getLoginDetails", kotakLiveController.fnLoginKotakNeo)
route.post("/kotakNeo/setNseCmCsv2NseCashJson", kotakLiveController.fnNseCmCsv2NseCashJson)
route.post("/kotakNeo/setNseFoCsv2OptJson", kotakLiveController.fnNseFoCsv2OptJson)
route.post("/kotakNeo/setBseFoCsv2OptJson", kotakLiveController.fnBseFoCsv2OptJson)
route.post("/kotakNeo/getJsonFiles", kotakLiveController.fnGetJsonFilesData);
route.post("/kotakNeo/placeNormalOrder", kotakLiveController.fnPlaceNormalOrder);
route.post("/kotakNeo/getOrderBook", kotakLiveController.fnGetOrderBook);
route.post("/kotakNeo/getTradeBook", kotakLiveController.fnGetTradeBook);
route.post("/kotakNeo/placeCloseTrade", kotakLiveController.fnPlaceCloseTrade);
route.post("/kotakNeo/getToken4OptRate", kotakLiveController.fnGetTokenforOptionRate);
route.post("/kotakNeo/placeOptNrmlOrder", kotakLiveController.fnPlaceOptionNormalOrder);
route.post("/kotakNeo/placeCloseOptTrade", kotakLiveController.fnPlaceCloseOptTrade);
route.post("/kotakNeo/getBackupRate", kotakLiveController.fnExecBackupRate);

//Delta Expchange Routes
route.post("/deltaExc/validateLogin", deltaLiveController.fnValidateUserLogin);

//Samples
route.post("/deltaExc/getTestWalletAPI", deltaLiveController.fnTestWalletAPI);
route.post("/deltaExc/setLeverageAPI", deltaLiveController.fnSetLeverageAPI);
route.post("/deltaExc/getUserWalletSDK", deltaLiveController.fnGetUserWalletSDK);
route.post("/deltaExc/getLeverageSDK", deltaLiveController.fnGetLeverageSDK);
route.post("/deltaExc/setLeverageSDK", deltaLiveController.fnSetLeverageSDK);
route.post("/deltaExc/placeLimitOrderSDK", deltaLiveController.fnPlaceLimitOrderSDK);
route.post("/deltaExc/placeSLTPLimitOrderSDK", deltaLiveController.fnPlaceSLTPLimitOrderSDK);
route.post("/deltaExc/cancelOrderSDK", deltaLiveController.fnCancelOrderSDK);
route.post("/deltaExc/getTestGetAllOrderAPI", deltaLiveController.fnTestGetAllOrderAPI);
route.post("/deltaExc/getCurrPriceByProd", deltaLiveController.fnGetCurrPriceByProd);
route.post("/deltaExc/getProductsList", deltaLiveController.fnGetProductsList);
route.post("/deltaExc/getOptionChainSDK", deltaLiveController.fnGetOptionChainSDK);

//Update JSON file Routes
route.post("/json/uorcJSON", tvConfsController.fnUpdJsons);

route.get('*', (req, res) => {
    res.status(404).send({"message": "No Page to Display"});
});
route.post('*', (req, res) => {
    res.status(404).send({"message": "No Page to Display"});
});


module.exports = route;