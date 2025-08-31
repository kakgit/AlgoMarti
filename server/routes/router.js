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
const kotakLiveControllerNS = require("../controller/controllerKotakScalper.js");
const kotakPaperController = require("../controller/controllerKotakPaper.js");
const deltaLiveController = require("../controller/controllerDeltaLive.js");
const deltaFutDemoController = require("../controller/controllerDeltaFutDemo.js");

//home Routes
route.get("/", homeServices.defaultRoute);

//Paper Trade Routes
route.get("/paperTrade", homeServices.paperTrade);

//Tradingview Signals Routes
route.get("/mahesh", homeServices.signalsTV);

//Alice Live Route
route.get("/aliceLive", aliceLiveServices.defaultRoute);

//Kotak Paper Route
route.get("/kotakPaper", kotakPaperController.defaultRoute);

//Kotak Live Route
route.get("/kotakLive", kotakLiveController.defaultRoute);

//Kotak Paper Scalper Nifty Route
route.get("/kotakScalperNiftyPaper", kotakPaperController.fnScalperNifty);

//Kotak Live Scalper Nifty Route
route.get("/kotakScalperNiftyLive", kotakLiveControllerNS.defaultRoute);

//Delta Options Demo Route
route.get("/deltaLive", deltaLiveController.defaultRoute);

//Delta Futures Demo Route
route.get("/deltaFutures-Demo", deltaFutDemoController.defaultRoute);

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

//Kotak Neo Paper Routes
route.post("/kotakNeo/getLoginDetails", kotakPaperController.fnLoginKotakNeo)
route.post("/kotakNeo/setNseCmCsv2NseCashJson", kotakPaperController.fnNseCmCsv2NseCashJson)
route.post("/kotakNeo/setNseFoCsv2OptJson", kotakPaperController.fnNseFoCsv2OptJson)
route.post("/kotakNeo/setBseFoCsv2OptJson", kotakPaperController.fnBseFoCsv2OptJson)
route.post("/kotakNeo/getJsonFiles", kotakPaperController.fnGetJsonFilesData);
route.post("/kotakNeo/placeNormalOrder", kotakPaperController.fnPlaceNormalOrder);
route.post("/kotakNeo/getOrderBook", kotakPaperController.fnGetOrderBook);
route.post("/kotakNeo/getTradeBook", kotakPaperController.fnGetTradeBook);
route.post("/kotakNeo/placeCloseTrade", kotakPaperController.fnPlaceCloseTrade);
route.post("/kotakNeo/getToken4OptRate", kotakPaperController.fnGetTokenforOptionRate);
route.post("/kotakNeo/getOptToken4CurrStrike", kotakPaperController.fnGetOptTokenforCurrStrike);
route.post("/kotakNeo/placeOptNrmlOrder", kotakPaperController.fnPlaceOptionNormalOrder);
route.post("/kotakNeo/placeCloseOptTrade", kotakPaperController.fnPlaceCloseOptTrade);
route.post("/kotakNeo/getBackupRate", kotakPaperController.fnExecBackupRate);

//Kotak Neo Live Routes
route.post("/kotakReal/getLoginDetails", kotakLiveController.fnLoginKotakNeo)
route.post("/kotakReal/setNseCmCsv2NseCashJson", kotakLiveController.fnNseCmCsv2NseCashJson)
route.post("/kotakReal/setNseFoCsv2OptJson", kotakLiveController.fnNseFoCsv2OptJson)
route.post("/kotakReal/setBseFoCsv2OptJson", kotakLiveController.fnBseFoCsv2OptJson)
route.post("/kotakReal/getJsonFiles", kotakLiveController.fnGetJsonFilesData);
route.post("/kotakReal/placeNormalOrder", kotakLiveController.fnPlaceNormalOrder);
route.post("/kotakReal/getOrderBook", kotakLiveController.fnGetOrderBook);
route.post("/kotakReal/getTradeBook", kotakLiveController.fnGetTradeBook);
route.post("/kotakReal/placeCloseTrade", kotakLiveController.fnPlaceCloseTrade);
route.post("/kotakReal/getToken4OptRate", kotakLiveController.fnGetTokenforOptionRate);
route.post("/kotakReal/placeOptNrmlOrder", kotakLiveController.fnPlaceOptionNormalOrder);
route.post("/kotakReal/placeCloseOptTrade", kotakLiveController.fnPlaceCloseOptTrade);
route.post("/kotakReal/getBackupRate", kotakLiveController.fnExecBackupRate);
route.post("/kotakReal/placeOptNrmlOrder1", kotakLiveController.fnPlaceOptionNormalOrder1);
route.post("/kotakReal/placeOptBracketOrder", kotakLiveController.fnPlaceOptionBracketOrder);
route.post("/kotakReal/placeCloseOptTrade1", kotakLiveController.fnPlaceCloseOptTrade1);

//Kotak Neo Live Routes
route.post("/kotakSpeed/getLoginDetails", kotakLiveControllerNS.fnLoginKotakNeo)
route.post("/kotakSpeed/setNseCmCsv2NseCashJson", kotakLiveControllerNS.fnNseCmCsv2NseCashJson)
route.post("/kotakSpeed/setNseFoCsv2OptJson", kotakLiveControllerNS.fnNseFoCsv2OptJson)
route.post("/kotakSpeed/setBseFoCsv2OptJson", kotakLiveControllerNS.fnBseFoCsv2OptJson)
route.post("/kotakSpeed/getJsonFiles", kotakLiveControllerNS.fnGetJsonFilesData);
route.post("/kotakSpeed/placeNormalOrder", kotakLiveControllerNS.fnPlaceNormalOrder);
route.post("/kotakSpeed/getOrderBook", kotakLiveControllerNS.fnGetOrderBook);
route.post("/kotakSpeed/getTradeBook", kotakLiveControllerNS.fnGetTradeBook);
route.post("/kotakSpeed/placeCloseTrade", kotakLiveControllerNS.fnPlaceCloseTrade);
route.post("/kotakSpeed/getToken4OptRate", kotakLiveControllerNS.fnGetTokenforOptionRate);
route.post("/kotakSpeed/placeOptNrmlOrder", kotakLiveControllerNS.fnPlaceOptionNormalOrder);
route.post("/kotakSpeed/placeCloseOptTrade", kotakLiveControllerNS.fnPlaceCloseOptTrade);
route.post("/kotakSpeed/getBackupRate", kotakLiveControllerNS.fnExecBackupRate);
route.post("/kotakSpeed/placeOptNrmlOrder1", kotakLiveControllerNS.fnPlaceOptionNormalOrder1);
route.post("/kotakSpeed/placeOptBracketOrder", kotakLiveControllerNS.fnPlaceOptionBracketOrder);
route.post("/kotakSpeed/placeCloseOptTrade1", kotakLiveControllerNS.fnPlaceCloseOptTrade1);

//Delta Exchange Routes
route.post("/deltaExc/validateLogin", deltaLiveController.fnValidateUserLogin);
route.post("/deltaExc/getSpotPriceByProd", deltaLiveController.fnGetSpotPriceByProd);
route.post("/deltaExc/getProdBySymbol", deltaLiveController.fnGetProdBySymbol);

//Delta Futures Routes
route.post("/deltaExcFut/validateLogin", deltaFutDemoController.fnValidateUserLogin);
route.post("/deltaExcFut/getHistOHLC", deltaFutDemoController.fnHistoricalOHLCAPI);
route.post("/deltaExcFut/getCurrBSRates", deltaFutDemoController.fnGetCurrBuySellRates);


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