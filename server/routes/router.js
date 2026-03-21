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
const deltaFutScprDemoController = require("../controller/controllerDeltaFutScprDemo.js");
const deltaFutLiveController = require("../controller/controllerDeltaFutLive.js");
const deltaFutScprLiveController = require("../controller/controllerDeltaFutScprLive.js");
const deltaOptDemoController = require("../controller/controllerDeltaOptDemo.js");
const deltaFundingLiveCtrler = require("../controller/controllerDeltaFundingLive.js");
const deltaSStraddleLiveCtrler = require("../controller/cntrDeltaSStraddleL.js");
const strategy1FOCtrler = require("../controller/cntrStrategy1FO.js");
const strategy2FOCtrler = require("../controller/cntrStrategy2FO.js");
const liveStrategy1FOCtrler = require("../controller/cntrLiveStrategy1FO.js");
const deltaSStrangleLiveCtrler = require("../controller/cntrDeltaSStrangleL.js");
const ctrlCryptoFunding = require("../controller/controllerCryptoFunding.js");
const ctrlCryptoFundingV2 = require("../controller/controllerCryptoFundingV2.js");

//home Routes
route.get("/", homeServices.defaultRoute);

// //Paper Trade Routes
// route.get("/paperTrade", homeServices.paperTrade);

//Tradingview Signals Routes
route.get("/mahesh", homeServices.signalsTV);

// //Alice Live Route
// route.get("/aliceLive", aliceLiveServices.defaultRoute);

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
route.get("/DeltaFutScprDemo", deltaFutScprDemoController.defaultRoute);
route.get("/DeltaFutScprLive", deltaFutScprLiveController.defaultRoute);

//Delta Futures Live Route
route.get("/deltaFutures-Live", deltaFutScprLiveController.defaultRoute);

//Delta Options Demo Route
route.get("/deltaOptions-Demo", deltaOptDemoController.defaultRoute);

//Delta Funding Demo Route
route.get("/deltaFunding-Live", deltaFundingLiveCtrler.defaultRoute);

//Delta Short Straddle Live Route
route.get("/deltaSStraddleLive", deltaSStraddleLiveCtrler.defaultRoute);

//Strategy1FO Route
route.get("/Strategy1FO", strategy1FOCtrler.defaultRoute);
route.get("/Strategy2FO", strategy2FOCtrler.defaultRoute);
route.get("/LiveStrategy1FO", liveStrategy1FOCtrler.defaultRoute);

//Delta Short Strangle Live Route
route.get("/deltaSStrangleLive", deltaSStrangleLiveCtrler.defaultRoute);

//Crypto Funding Route
route.get("/cryptoFunding", ctrlCryptoFunding.defaultRoute);
route.get("/cryptoFundingV2", ctrlCryptoFundingV2.defaultRoute);

// //Samco Routes
// route.get("/samco", samcoServices.defaultRoute);

// //Samco Routes
// route.get("/finvasia", finvasiaServices.defaultRoute);
// route.post("/finvasia/getSession", finvasiaServices.fnLoginFinvasia);

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

//Delta Futures Live Routes
route.post("/deltaExcFutR/validateLogin", deltaFutLiveController.fnValidateUserLogin);
route.post("/deltaExcFutR/placeRealOrder", deltaFutLiveController.fnPlaceOrderSDK);
route.post("/deltaExcFutR/getOrderDetails", deltaFutLiveController.fnGetOrderDetails);
route.post("/deltaExcFutR/editPendingOrder", deltaFutLiveController.fnEditOrderSDK);
route.post("/deltaExcFutR/cancelPendingOrder", deltaFutLiveController.fnCancelOrderSDK);
route.post("/deltaExcFutR/getFilledPosById", deltaFutLiveController.fnGetOpenPositionByIdSDK);
route.post("/deltaExcFutR/getFilledOrderHistory", deltaFutLiveController.fnGetFilledOrderHistory);
route.post("/deltaExcFutR/getProductsList", deltaFutLiveController.fnGetProductsList);
route.post("/deltaExcFutR/closeRealPosition", deltaFutLiveController.fnCloseRealPoistion);

//Delta Funding Live Routes
route.post("/deltaExcFunding/validateLogin", deltaFundingLiveCtrler.fnValidateUserLogin);
route.post("/deltaExcFunding/getOptChnSDKByAstOptTypExp", deltaFundingLiveCtrler.fnGetOptChnSDKByAstOptTypExp);
route.post("/deltaExcFunding/execOption", deltaFundingLiveCtrler.fnExecOptionByOptTypeExpTransType);
route.post("/deltaExcFunding/getBestRatesBySymb", deltaFundingLiveCtrler.fnGetBestRatesBySymbol);

//Delta Short Straddle Live Routes
route.post("/deltaSStraddleLive/validateLogin", deltaSStraddleLiveCtrler.fnValidateUserLogin);
route.post("/deltaSStraddleLive/getWalletDetails", deltaSStraddleLiveCtrler.fnWalletDetails);
route.post("/deltaSStraddleLive/getOptChnSDKByAstOptTypExp", deltaSStraddleLiveCtrler.fnGetOptChnSDKByAstOptTypExp);
route.post("/deltaSStraddleLive/execOption", deltaSStraddleLiveCtrler.fnExecOptionByOptTypeExpTransType);
route.post("/deltaSStraddleLive/getBestRatesBySymb", deltaSStraddleLiveCtrler.fnGetBestRatesBySymbol);
route.post("/deltaSStraddleLive/getRealOpenPos", deltaSStraddleLiveCtrler.fnGetRealOpenPositions);
route.post("/deltaSStraddleLive/getRealClsdPos", deltaSStraddleLiveCtrler.fnGetRealClsdPositions);
route.post("/deltaSStraddleLive/openRealPosition", deltaSStraddleLiveCtrler.fnOpenRealPoistion);
route.post("/deltaSStraddleLive/closeRealPosition", deltaSStraddleLiveCtrler.fnCloseRealPoistion);

//Strategy1FO Routes
route.post("/strategy1fo/validateLogin", strategy1FOCtrler.fnValidateUserLogin);
route.post("/strategy1fo/getOptChnSDKByAstOptTypExp", strategy1FOCtrler.fnGetOptChnSDKByAstOptTypExp);
route.post("/strategy1fo/execOption", strategy1FOCtrler.fnExecOptionByOptTypeExpTransType);
route.post("/strategy1fo/execOptionLeg", strategy1FOCtrler.fnExecOptByOTypExpTType);
route.post("/strategy1fo/execFutureLeg", strategy1FOCtrler.fnExecFutByTType);
route.post("/strategy1fo/getBestRatesBySymb", strategy1FOCtrler.fnGetBestRatesBySymbol);
route.post("/strategy2fo/validateLogin", strategy2FOCtrler.fnValidateUserLogin);
route.post("/strategy2fo/getOptChnSDKByAstOptTypExp", strategy2FOCtrler.fnGetOptChnSDKByAstOptTypExp);
route.post("/strategy2fo/execOption", strategy2FOCtrler.fnExecOptionByOptTypeExpTransType);
route.post("/strategy2fo/execOptionLeg", strategy2FOCtrler.fnExecOptByOTypExpTType);
route.post("/strategy2fo/execFutureLeg", strategy2FOCtrler.fnExecFutByTType);
route.post("/strategy2fo/getBestRatesBySymb", strategy2FOCtrler.fnGetBestRatesBySymbol);
route.post("/liveStrategy1fo/validateLogin", liveStrategy1FOCtrler.fnValidateUserLogin);
route.post("/liveStrategy1fo/getOptChnSDKByAstOptTypExp", liveStrategy1FOCtrler.fnGetOptChnSDKByAstOptTypExp);
route.post("/liveStrategy1fo/execOption", liveStrategy1FOCtrler.fnExecOptionByOptTypeExpTransType);
route.post("/liveStrategy1fo/execOptionLeg", liveStrategy1FOCtrler.fnExecOptByOTypExpTType);
route.post("/liveStrategy1fo/execFutureLeg", liveStrategy1FOCtrler.fnExecFutByTType);
route.post("/liveStrategy1fo/closeLeg", liveStrategy1FOCtrler.fnCloseLeg);
route.post("/liveStrategy1fo/getLiveOpenPositions", liveStrategy1FOCtrler.fnGetLiveOpenPositions);
route.post("/liveStrategy1fo/getBestRatesBySymb", liveStrategy1FOCtrler.fnGetBestRatesBySymbol);
route.post("/liveStrategy1fo/getFilledOrderHistory", liveStrategy1FOCtrler.fnGetFilledOrderHistory);
//Delta Short Strangle Live Routes
route.post("/deltaSStrangleLive/validateLogin", deltaSStrangleLiveCtrler.fnValidateUserLogin);
route.post("/deltaSStrangleLive/getWalletDetails", deltaSStrangleLiveCtrler.fnWalletDetails);
route.post("/deltaSStrangleLive/execOption", deltaSStrangleLiveCtrler.fnExecOptionByOptTypeExpTransType);
route.post("/deltaSStrangleLive/getBestRatesBySymb", deltaSStrangleLiveCtrler.fnGetBestRatesBySymbol);
route.post("/deltaSStrangleLive/getRealOpenPos", deltaSStrangleLiveCtrler.fnGetRealOpenPositions);
route.post("/deltaSStrangleLive/openRealPosition", deltaSStrangleLiveCtrler.fnOpenRealPoistion);
route.post("/deltaSStrangleLive/closeRealPosition", deltaSStrangleLiveCtrler.fnCloseRealPoistion);
route.post("/deltaSStrangleLive/getRealClsdPos", deltaSStrangleLiveCtrler.fnGetRealClsdPositions);
route.post("/deltaSStrangleLive/getOptChnSDKByAstOptTypExp", deltaSStrangleLiveCtrler.fnGetOptChnSDKByAstOptTypExp);

//Crypto Funding Routes
route.post("/execCryptoFunding/DeltaCredValidate", ctrlCryptoFunding.fnDeltaCredValidate);
route.post("/execCryptoFunding/CDcxCredValidate", ctrlCryptoFunding.fnCDcxCredValidate);
route.post("/execCryptoFunding/updCoinDcxDeltaData", ctrlCryptoFunding.fnUpdCoindcxDeltaCoinsList);
route.post("/execCryptoFunding/getCoinDcxDeltaData", ctrlCryptoFunding.fnGetCoinDcxDeltaData);
route.post("/execCryptoFunding/getDeltaCoinList", ctrlCryptoFunding.fnGetDeltaCoinsList);
route.post("/execCryptoFunding/getCdcxCoinList", ctrlCryptoFunding.fnGetCdcxCoinsList);
route.post("/execCryptoFunding/getCdcxCoinDetails", ctrlCryptoFunding.fnGetCdcxCoinsDetails);
route.post("/execCryptoFunding/getDeltaFundingList", ctrlCryptoFunding.fnGetDeltaFundingList);
route.post("/execCryptoFunding/updDeltaLeverage", ctrlCryptoFunding.fnUpdateDeltaLeverage);
route.post("/execCryptoFunding/execOpenOrderCDcx", ctrlCryptoFunding.fnExecOpenOrderCDcx);

//Crypto Funding V2 Routes
route.post("/execCryptoFundingV2/DeltaCredValidate", ctrlCryptoFundingV2.fnDeltaCredValidate);
route.post("/execCryptoFundingV2/refreshFundingData", ctrlCryptoFundingV2.fnRefreshFundingData);
route.post("/execCryptoFundingV2/getLatestTradeRates", ctrlCryptoFundingV2.fnGetLatestTradeRates);
route.post("/execCryptoFundingV2/previewRealTrade", ctrlCryptoFundingV2.fnPreviewRealTrade);
route.post("/execCryptoFundingV2/executeRealTrade", ctrlCryptoFundingV2.fnExecuteRealTrade);

//Delta Futures Demo Routes
route.post("/deltaExcFut/validateLogin", deltaFutDemoController.fnValidateUserLogin);
route.post("/deltaExcFut/getHistOHLC", deltaFutDemoController.fnHistoricalOHLCAPI);
route.post("/deltaExcFut/getCurrBSRates", deltaFutDemoController.fnGetCurrBuySellRates);
route.post("/deltaExcFut/placeLimitOrder", deltaFutDemoController.fnPlaceLimitOrderSDK);
route.post("/deltaFutScprDemo/validateLogin", deltaFutScprDemoController.fnValidateUserLogin);
route.post("/deltaFutScprDemo/getHistOHLC", deltaFutScprDemoController.fnHistoricalOHLCAPI);
route.post("/deltaFutScprDemo/getCurrBSRates", deltaFutScprDemoController.fnGetCurrBuySellRates);
route.post("/deltaFutScprDemo/placeLimitOrder", deltaFutScprDemoController.fnPlaceLimitOrderSDK);

//Delta Options Routes
route.post("/deltaExcOpt/getOptionChainSDK", deltaOptDemoController.fnGetOptionChainSDK);
route.post("/deltaExcOpt/getOptChnSDKByAstOptTypExp", deltaOptDemoController.fnGetOptChnSDKByAstOptTypExp);
route.post("/deltaExcOpt/getBestRatesBySymb", deltaOptDemoController.fnGetBestRatesBySymbol);

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
