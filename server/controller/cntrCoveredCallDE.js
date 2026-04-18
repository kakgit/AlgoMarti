const liveStrategy2FOCtrler = require("./cntrLiveStrategy2FO.js");

exports.defaultRoute = (req, res) => {
    res.render("CoveredCall-DE.ejs");
};

exports.fnValidateUserLogin = liveStrategy2FOCtrler.fnValidateUserLogin;
exports.fnGetOptChnSDKByAstOptTypExp = liveStrategy2FOCtrler.fnGetOptChnSDKByAstOptTypExp;
exports.fnExecOptionByOptTypeExpTransType = liveStrategy2FOCtrler.fnExecOptionByOptTypeExpTransType;
exports.fnExecOptByOTypExpTType = liveStrategy2FOCtrler.fnExecOptByOTypExpTType;
exports.fnExecFutByTType = liveStrategy2FOCtrler.fnExecFutByTType;
exports.fnAbortPendingFutOrders = liveStrategy2FOCtrler.fnAbortPendingFutOrders;
exports.fnSendTelegramAlertMsg = liveStrategy2FOCtrler.fnSendTelegramAlertMsg;
exports.fnCloseLeg = liveStrategy2FOCtrler.fnCloseLeg;
exports.fnGetLiveOpenPositions = liveStrategy2FOCtrler.fnGetLiveOpenPositions;
exports.fnGetBestRatesBySymbol = liveStrategy2FOCtrler.fnGetBestRatesBySymbol;
exports.fnGetFilledOrderHistory = liveStrategy2FOCtrler.fnGetFilledOrderHistory;
