
const { createHash } = require('node:crypto');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

exports.fnLoginAliceBlue = async (req, res) => {
  // let vClientId = "632665";
  // let vApiKey = "sYtLAxsaZjYPcHEMVKK2yLGvsr9mH1ou9FcFmZuQy5LIuotmzaoN4uof32IavhKaYSUBkQfHWVs4OUlk7FQjYpOWRxJx9BDajn9LKI598LtIbR0STdhK1g0uLIlBLHHW";
  let vClientId = req.body.ClientID;
  let vApiKey = req.body.ApiKey;

  try {
    let vEncKey = await fnGetEncKey(vClientId);
    // console.log(vEncKey);

    let vSHA256 = await fnGetSHA256Updated(vClientId, vApiKey, vEncKey);
    //console.log(vSHA256);

    let vSession = await fnGetSessionAB(vClientId, vSHA256);
    //console.log(vSession);

    let objUserDet = await fnGetProfileDetailsAB(vClientId, vSession);

    let objUserMargin = await fnGetUsermarginsAB(vClientId, vSession);
    //let vData = {accountId : objUserDet.data.accountId, accountName : objUserDet.data.accountName, cellAddr : objUserDet.data.cellAddr, emailAddr : objUserDet.data.emailAddr, accountStatus : objUserDet.data.accountStatus, dataMargins : objUserMargin.data[0]};


    let vData = { EncKey: vEncKey, Session: vSession, accountId: objUserDet.data.accountId, accountName: objUserDet.data.accountName, cellAddr: objUserDet.data.cellAddr, emailAddr: objUserDet.data.emailAddr, accountStatus: objUserDet.data.accountStatus, dataMargins: objUserMargin.data[0] };

    res.send({ "status": "success", "message": "Trader Login - Successful", "data": vData });
  }
  catch (error) {
    //console.log(error);
    res.send({ "status": "danger", "message": error.message });
  }
}

const fnGetEncKey = async (pClientId) => {
  const objEncKey = new Promise((resolve, reject) => {
    let data = JSON.stringify({
      userId: pClientId,
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/customer/getAPIEncpkey",
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios
      .request(config)
      .then((response) => {
        const isEncKey = response.data.login;
        //console.log(response.data);

        if (isEncKey) {
          const vEncKey = response.data.encKey;

          resolve(vEncKey);

        } else {
          //console.log(response.data.emsg);
          reject(new Error(response.data.emsg));
        }
      })
      .catch((error) => {
        reject(new Error("Error at getting Enc Code"));
      });

    //do more reserach from youtube
    // setTimeout(()=>{
    //         resolve(
    //             console.log("Wating...")
    //         );
    //     }, 2000)
  });

  return objEncKey;
};

async function fnGetSHA256Updated(pClientID, pApiKey, pEncKey) {
  // const vRes = createHash('sha256').update("632665sYtLAxsaZjYPcHEMVKK2yLGvsr9mH1ou9FcFmZuQy5LIuotmzaoN4uof32IavhKaYSUBkQfHWVs4OUlk7FQjYpOWRxJx9BDajn9LKI598LtIbR0STdhK1g0uLIlBLHHW0D8V646QTFM7MCCHH95N2UIQW7UNZBO2").digest('hex');
  const vHash256 = createHash('sha256').update(pClientID + pApiKey + pEncKey).digest('hex');

  return vHash256;
}

async function fnGetSessionAB(pClientID, pSHA256) {
  const objSession = new Promise((resolve, reject) => {
    let data = JSON.stringify({
      userId: pClientID,
      userData: pSHA256,
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/customer/getUserSID",
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };
    axios
      .request(config)
      .then((response) => {

        const vIsOk = response.data.stat;
        //console.log(response.data);

        if (vIsOk === "Ok") {
          const vSessionAB = response.data.sessionID;

          resolve(vSessionAB);

        } else {
          //console.log(response.data.emsg);
          reject(new Error(response.data.emsg));
        }
      })
      .catch((error) => {
        //console.log(error);
        reject(new Error("Error at getting Session"));
      });
  });
  return objSession;
}

exports.fnGetUserProfileDetails = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let objUserDet, objUserMargin = "";

  try {
    objUserDet = await fnGetProfileDetailsAB(vClientId, vSession);

    if (objUserDet.data !== "") {
      objUserMargin = await fnGetUsermarginsAB(vClientId, vSession);

      if (objUserMargin.data !== "") {
        let vData = { accountId: objUserDet.data.accountId, accountName: objUserDet.data.accountName, cellAddr: objUserDet.data.cellAddr, emailAddr: objUserDet.data.emailAddr, accountStatus: objUserDet.data.accountStatus, dataMargins: objUserMargin.data[0] };

        res.send({ "status": objUserMargin.status, "message": objUserMargin.message, "data": vData });
      }
      else {
        res.send({ "status": "warning", "message": "Error in Receiving User Margins!", "data": "" });
      }
    }
    else {
      res.send({ "status": "warning", "message": "Error in Receiving User Data!", "data": "" });
    }
  }
  catch (err) {
    console.log("At fnGetUserProfileDetails: " + err.data);
    res.send({ "status": err.status, "message": err.message, "data": err.data });
  }

}

exports.fnGetStrikePrice = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let vExchange = req.body.Exchange;
  let vStrikeInterval = req.body.StrikeInterval;
  let vToken = req.body.Token;
  let objSpotPrice = "";

  try {
    objSpotPrice = await fnGetSpotPrice(vExchange, vToken, vClientId, vSession);

    if (objSpotPrice.data !== "") {
      //console.log(objSpotPrice);

      let vStrike = await fnGetRoundedStrikePrice(objSpotPrice.data, vStrikeInterval);
      //let VRoundedStrike = await fnGetRoundedStrikePrice(objSpotPrice, vStrikeInterval);

      res.send({ "status": vStrike.status, "message": vStrike.message, "data": vStrike.data });
    }
    else {
      res.send({ "status": "warning", "message": "Received LTP for the Symbol is Empty, Please Check!", "data": "" });
    }
    // vTokenNo = await fnGetSymbolToken(vSource, vExchange, vContract, vSymbol, vExpiry, vStrikeInterval);

    // res.send({"status": vTokenNo.status, "message": vTokenNo.message, "data": vTokenNo.data});
  }
  catch (err) {
    console.log("At fnGetStrikePrice: " + err.data);
    res.send({ "status": err.status, "message": err.message, "data": err.data });
  }
}

exports.fnGetExecutedTradeRate = async (req, res) => {
  let vActualStrikeRate = req.body.ActualStrikeRate;
  let vCurrStrikeRate = req.body.CurrStrikeRate;
  let vStrikeOption = req.body.StrikeOption;
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let vExchange = req.body.Exchange;
  let vStrikeInterval = req.body.StrikeInterval;
  let vToken = req.body.Token;
  let vBorS = req.body.BorS;
  let vCorP = req.body.CorP;
  let vContract = req.body.Contract;
  let vSource = req.body.Source;
  let vSymbol = req.body.Symbol;
  let vDateToTime = req.body.DateToTime;

  try {
    if (vActualStrikeRate !== "") {
      let vRoundedStrike = parseInt(vActualStrikeRate) + parseInt(vStrikeOption);
      let objTokenData = await fnGetTradeToken(vCorP, vActualStrikeRate, vRoundedStrike, vContract, vSource, vSymbol, vDateToTime);

      let objTradeDetails = await fnGetTradeDetails(vContract, objTokenData.data.TradeToken, vClientId, vSession, objTokenData.data.ActualStrike, objTokenData.data.RoundedStrike);

      res.send({ status: objTradeDetails.status, message: objTradeDetails.message, data: objTradeDetails.data });
    }
    else {
      let objSpotPrice = await fnGetSpotPrice(vExchange, vToken, vClientId, vSession);
      let vRoundedStrike = await fnGetRoundedStrikePrice(objSpotPrice.data, vStrikeInterval);
      vRoundedStrike.data.RoundedStrike = parseInt(vRoundedStrike.data.ActualStrike) + parseInt(vStrikeOption);

      let objTokenData = await fnGetTradeToken(vCorP, vRoundedStrike.data.ActualStrike, vRoundedStrike.data.RoundedStrike, vContract, vSource, vSymbol, vDateToTime);

      let objTradeDetails = await fnGetTradeDetails(vContract, objTokenData.data.TradeToken, vClientId, vSession, objTokenData.data.ActualStrike, objTokenData.data.RoundedStrike);

      res.send({ status: objTradeDetails.status, message: objTradeDetails.message, data: objTradeDetails.data });
    }
  }
  catch (err) {
    console.log("At Executed Trade: " + err.data);
    res.send({ status: err.status, message: err.message, data: err.data });
  }
};

exports.fnOrderPlacedDetails = async (req, res) => {
  let vActualStrikeRate = req.body.ActualStrikeRate;
  let vExchange = req.body.Exchange;
  let vToken = req.body.Token;
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let vStrikeInterval = req.body.StrikeInterval;
  let vStrikeOption = req.body.StrikeOption;
  let vCorP = req.body.CorP;
  let vContract = req.body.Contract;
  let vSource = req.body.Source;
  let vSymbol = req.body.Symbol;
  let vDateToTime = req.body.DateToTime;
  let vQtyToTrade = req.body.QtyToTrade;
  let vBorS = req.body.BorS;
  let vRandID = req.body.RandID;

  try {
    if (vActualStrikeRate !== "") {

      res.send({ status: objSpotPrice.status, message: objSpotPrice.message, data: objSpotPrice.data });
    }
    else {
      let objSpotPrice = await fnGetSpotPrice(vExchange, vToken, vClientId, vSession);
      let vRoundedStrike = await fnGetRoundedStrikePrice(objSpotPrice.data, vStrikeInterval);
      vRoundedStrike.data.RoundedStrike = parseInt(vRoundedStrike.data.ActualStrike) + parseInt(vStrikeOption);

      let objTokenData = await fnGetTradeToken(vCorP, vRoundedStrike.data.ActualStrike, vRoundedStrike.data.RoundedStrike, vContract, vSource, vSymbol, vDateToTime);

      let objTradeDetails = await fnGetRealTradeDetails(vContract, vQtyToTrade, objTokenData.data.TradeToken, vSymbol, vBorS, vRandID, vClientId, vSession, vExchange, objTokenData.data.ActualStrike, objTokenData.data.RoundedStrike);

      console.log(objTradeDetails.data);

      res.send({ status: objTradeDetails.status, message: objTradeDetails.message, data: objTradeDetails.data });
    }
  } catch (err) {
    console.log(err);
    res.send({ status: err.status, message: err.message, data: err.data });
  }
}

exports.fnGetOpenTradeRate = async (req, res) => {
  let vContract = req.body.Contract;
  let vToken = req.body.Token;
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;

  if (vSession === "" || vClientId === "") {
    res.send({ status: "warning", message: "Session Expired! Please Login!", data: "" });
  }
  else if (vToken === "" || vContract === "") {
    res.send({ status: "warning", message: "Invalid Token! Please Check!", data: "" });
  }
  else {
    let objTradeDetails = await fnGetOpenTradeDetails(vContract, vToken, vClientId, vSession);

    //console.log(objTradeDetails);
    res.send({ status: objTradeDetails.status, message: objTradeDetails.message, data: objTradeDetails.data });
  }
};

exports.fnGetJsonFilesData = async (req, res) => {
  // let nowDate = new Date();

  // console.log(nowDate.valueOf());

  let reqPath = path.join(__dirname, '../../public/json/abSymbols.json');

  //Read JSON from relative path of this file
  fs.readFile(reqPath, 'utf8', function (err, data) {
    //Handle Error
    if (!err) {
      //Handle Success
      //console.log("Success: " + data);
      // Parse Data to JSON OR
      var jsonObj = JSON.parse(data);
      //console.log(jsonObj);
      //Send back as Response
      //res.end(data);
      res.send({ status: "success", message: "Symbol File Received!", data: jsonObj });
    }
    else {
      //Handle Error
      //console.log("Error: " + err);
      //res.end("Error: " + err)
      res.send({ status: "danger", message: "Error Reading File!", data: err });
    }
  });
}

exports.fnSqOffPositions = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let objData = "";

  try {
    objData = await fnGetRealClosedPosiDetails(vClientId, vSession);
    console.log(objData);
    res.send({ "status": "success", "message": "Position/s Closed!", "data": objData.data });
  } catch (err) {
    //console.log("At fnGetRealClosedPosiDetails: " + err.data);
    res.send({ "status": err.status, "message": err.message, "data": err.data });
  }
}

exports.fnGetTradeBook = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let objData = "";

  try {
    objData = await fnGetRealTradeBookDetails(vClientId, vSession);
    console.log("Data: " + objData);
    res.send({ "status": "success", "message": "Tradebook Received", "data": objData.data });
  } catch (err) {
    //console.log("At fnGetRealClosedPosiDetails: " + err.data);
    res.send({ "status": err.status, "message": err.message, "data": err.data });
  }
}

exports.fnPlaceBasketOrder = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let vRandId = req.body.RandId;
  //let vRandId = "1728446812442";

  let objData, objTradeDtls = "";
  let bHasTrade = false;
  let vOrderQty = 0;
  let vAvgPrice = 0;
  let vOrdersCount = 0;

  try {
    objData = await fnExecBasketOrder(vClientId, vSession, vRandId);

    if (objData.data.length > 0) {
      for (let i = 0; i < objData.data.length; i++) {
        if (objData.data[i].stat === "Ok") {
          //console.log("Data: " + objData.data[i].stat + " - " + objData.data[i].NOrdNo);
          bHasTrade = true;
        }
      }
    }

    if(bHasTrade){
      objTradeDtls = await fnGetTradePositions(vClientId, vSession, vRandId);

      for(let i=0; i < objTradeDtls.data.length; i++){
        if(objTradeDtls.data[i].remarks === vRandId && objTradeDtls.data[i].Status === "complete"){
          vOrderQty += parseInt(objTradeDtls.data[i].Fillshares);
          vAvgPrice += parseFloat(objTradeDtls.data[i].Avgprc);

          vOrdersCount++;
        }
      }

      vAvgPrice = vAvgPrice / vOrdersCount;

      console.log("Avg Price: " + vAvgPrice);
      res.send({ "status": "success", "message": "Traded Qty and Rate Details!", "data": { Qty: vOrderQty, AvgPrice: vAvgPrice } });
    }
    else{
      objTradeDtls = { RandId: vRandId }
      res.send({ "status": "danger", "message": "Error in Basket Order!", "data": objTradeDtls });
    }

    //console.log(objData.data);
  } catch (err) {
    //console.log("At fnGetRealClosedPosiDetails: " + err.data);
    res.send({ "status": err.status, "message": err.message, "data": err.data });
  }
}

exports.fnPlaceNormalOrder = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let vRandId = req.body.RandId;

  let objData, objTradeDtls = "";
  let bHasTrade = false;
  let vOrderQty = 0;
  let vAvgPrice = 0;
  let vOrdersCount = 0;

  try {
    objData = await fnExecNormalOrder(vClientId, vSession, vRandId);

    if (objData.data.length > 0) {
      for (let i = 0; i < objData.data.length; i++) {
        if (objData.data[i].stat === "Ok") {
          console.log("Data: " + objData.data[i].stat + " - " + objData.data[i].NOrdNo);
          bHasTrade = true;
        }
      }
    }

    if(bHasTrade){
      objTradeDtls = await fnGetTradePositions(vClientId, vSession, vRandId);

      for(let i=0; i < objTradeDtls.data.length; i++){
        if(objTradeDtls.data[i].remarks === vRandId && objTradeDtls.data[i].Status === "complete"){
          vOrderQty += parseInt(objTradeDtls.data[i].Fillshares);
          vAvgPrice += parseFloat(objTradeDtls.data[i].Avgprc);

          vOrdersCount++;
        }
      }

      if(vOrderQty === 0){
        res.send({ "status": "warning", "message": "Normal Order is incomplete..", "data": { Qty: vOrderQty, AvgPrice: vAvgPrice } });
      }
      else{
        vAvgPrice = vAvgPrice / vOrdersCount;

        console.log("Avg Price: " + vAvgPrice);
        res.send({ "status": "success", "message": "Traded Qty and Rate Details!", "data": { Qty: vOrderQty, AvgPrice: vAvgPrice } });
        }
    }
    else{
      objTradeDtls = { RandId: vRandId }
      res.send({ "status": "danger", "message": "Error in Basket Order!", "data": objTradeDtls });
    }

    //console.log(objData.data);
  }
  catch (err) {
    //console.log("At fnGetRealClosedPosiDetails: " + err.data);
    res.send({ "status": err.status, "message": err.message, "data": err.data });
  }
}

const fnGetRealTradeDetails = async (pContract, pQtyToTrade, vTradeToken, pSymbol, pBorS, pRandID, pClientId, pSession, pExchange, pActualStrike, pRoundedStrike) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = JSON.stringify([
      {
        "complexty": "regular", "discqty": "0", "exch": pContract, "pCode": "MIS", "prctyp": "MKT", "price": "0", "qty": pQtyToTrade, "ret": "DAY", "symbol_id": vTradeToken, "trading_symbol": pSymbol, "transtype": pBorS, "trigPrice": "0", "orderTag": pRandID
      }
    ]);

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/placeOrder/executePlaceOrder',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {

        resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
      })
      .catch((error) => {
        console.log(error.message);
        reject({ "status": "danger", "message": "Error in Placing the Order, Please Check!", "data": error.message });
      });
  });

  return objData;
}

const fnExecBasketOrder = async (pClientId, pSession, pRandId) => {
  const objData = new Promise((resolve, reject) => {
    // let objParams = JSON.stringify([
    //   {
    //     "complexty": "regular",
    //     "discqty": "0",
    //     "exch": "NSE",
    //     "pCode": "MIS",
    //     "prctyp": "MKT",
    //     "price": "0",
    //     "qty": 1,
    //     "ret": "DAY",
    //     "symbol_id": "3499",
    //     "trading_symbol": "TATASTEEL-EQ",
    //     "transtype": "S",
    //     "trigPrice": "0",
    //     "orderTag": pRandId
    //   },
    //   {
    //     "complexty": "regular",
    //     "discqty": "0",
    //     "exch": "NSE",
    //     "pCode": "MIS",
    //     "prctyp": "MKT",
    //     "price": "0",
    //     "qty": 1,
    //     "ret": "DAY",
    //     "symbol_id": "3499",
    //     "trading_symbol": "TATASTEEL-EQ",
    //     "transtype": "S",
    //     "trigPrice": "0",
    //     "orderTag": pRandId
    //   }
    // ]);

    // let objConfig = {
    //   method: 'post',
    //   maxBodyLength: Infinity,
    //   url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/placeOrder/executePlaceOrder',
    //   headers: {
    //     'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
    //     'Content-Type': 'application/json'
    //   },
    //   data: objParams
    // };

    // axios.request(objConfig)
    //   .then((objResponse) => {
    //     resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
    //   })
    //   .catch((error) => {
    //     console.log(error.message);
    //     reject({ "status": "danger", "message": "Error in Placing the Order, Please Check!", "data": error.message });
    //   });
    
    let vObjectData = [
      { stat: 'Ok', NOrdNo: '24100900030716' },
      { stat: 'Ok', NOrdNo: '24100900030717' }
    ];
    resolve({ "status": "success", "message": "Success - Order Placed", "data": vObjectData });

  });
  return objData;
}

const fnExecNormalOrder = async (pClientId, pSession, pRandId) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = JSON.stringify([
      {
        "complexty": "regular",
        "discqty": "0",
        "exch": "NSE",
        "pCode": "MIS",
        "prctyp": "MKT",
        "price": "0",
        "qty": 1,
        "ret": "DAY",
        "symbol_id": "3499",
        "trading_symbol": "TATASTEEL-EQ",
        "transtype": "B",
        "trigPrice": "0",
        "orderTag": pRandId
      }
    ]);

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/placeOrder/executePlaceOrder',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        resolve({ "status": "success", "message": "Success - Order Placed", "data": objResponse.data });
      })
      .catch((error) => {
        console.log(error.message);
        reject({ "status": "danger", "message": "Error in Placing the Order, Please Check!", "data": error.message });
      });
  });
  return objData;
}

const fnGetRealTradeBookDetails = async (pClientId, pSession) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = "";

    //open, complete, rejected
    let objConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/placeOrder/fetchTradeBook',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        resolve({ "status": "success", "message": "Success - Tradabook Received", "data": objResponse.data });
      })
      .catch((error) => {
        console.log(error.message);
        reject({ "status": "danger", "message": "Error in to Receive Tradebook, Please Check!", "data": error.message });
      });
  });

  return objData;
}

const fnGetTradePositions = async (pClientId, pSession, pRandId) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = "";

    //open, complete, rejected
    let objConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/placeOrder/fetchOrderBook',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {

        resolve({ "status": "success", "message": "Success - Tradabook Received", "data": objResponse.data });
      })
      .catch((error) => {
        console.log(error.message);
        reject({ "status": "danger", "message": "Error to Receive Order Details. " + error.message, "data": error.message });
      });
  });
  
  return objData;
}

const fnGetRealClosedPosiDetails = async (pClientId, pSession) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = "";

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/positionAndHoldings/squareOffAllPositions',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        resolve({ "status": "success", "message": "Success - Position Closed", "data": objResponse.data });
      })
      .catch((error) => {
        console.log(error.message);
        reject({ "status": "danger", "message": "Error in Closing Position, Please Check!", "data": error.message });
      });
  });

  return objData;
}

const fnGetSpotPrice = async (pExchange, pToken, pClientId, pSession) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = JSON.stringify({
      "exch": pExchange,
      "symbol": pToken
    });

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        //console.log("Res: " + objResponse.data.LTP);

        if (objResponse.data.stat === "Ok") {
          resolve({ "status": "success", "message": "Success - Spot Price Received", "data": objResponse.data.LTP });
        }
        else {
          reject({ "status": "danger", "message": "Error in getting Spot Price. " + objResponse.data.emsg, "data": objResponse.data.emsg });
        }
      })
      .catch((error) => {
        //console.log(error.message);
        reject({ "status": "danger", "message": "Error in getting Spot Price. " + error.message, "data": error.message });
      });
  });
  //console.log(pExchange + " - " + pToken + " - " + pClientId + " - " + pSession);

  return objData;
}

const fnGetProfileDetailsAB = async (pClientId, pSession) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = "";

    let objConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/customer/accountDetails',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        //console.log(JSON.stringify(response.data));
        resolve({ "status": "success", "message": "Success - Profile Data Received", "data": objResponse.data });
      })
      .catch((error) => {
        //console.log(error);
        reject({ "status": "danger", "message": "Error in getting Profile Details, Please Check!", "data": error.message });
      });
  });

  return objData;
}

const fnGetUsermarginsAB = async (pClientId, pSession) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = "";

    let objConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/limits/getRmsLimits',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        //console.log(JSON.stringify(response.data));
        resolve({ "status": "success", "message": "Success - User Margins Received", "data": objResponse.data });
      })
      .catch((error) => {
        //console.log(error);
        reject({ "status": "danger", "message": "Error in getting User Margins, Please Check!", "data": error.message });
      });
  });

  return objData;
}

const fnGetRoundedStrikePrice = async (pActualStrike, pStrikeInterval) => {
  const objData = new Promise((resolve, reject) => {

    let vRoundedStrike = Math.round(parseInt(pActualStrike) / parseInt(pStrikeInterval)) * parseInt(pStrikeInterval);

    if (isNaN(vRoundedStrike)) {
      reject({ "status": "danger", "message": "Error - Strike Price is Invalid!", "data": "" });
    }
    else {
      resolve({ "status": "success", "message": "Success - Rounded Strike Rate Received", "data": { "ActualStrike": vRoundedStrike, "RoundedStrike": vRoundedStrike } });
    }
  });

  return objData;
}

const fnGetTradeToken = async (pCorP, pActualStrike, pRoundedStrike, pContract, pSource, pSymbol, pDateToTime) => {
  const objData = new Promise((resolve, reject) => {

    //console.log(pContract + " - " + pCorP);
    // if (pCorP === "PE") {
    //   pStrikeOption = -(pStrikeOption);
    // }
    // vCurrStrike = parseInt(vCurrStrike) + pStrikeOption;

    const vLocalUrl = process.env.API_PATH + "json/" + pContract + ".json";
    const vServerUrl = "https://v2api.aliceblueonline.com/restpy/contract_master?exch=" + pContract;
    let vUrl = "";
    let vNewToken = "";

    if (pSource === "0") {
      vUrl = vLocalUrl;
    }
    else if (pSource === "1") {
      vUrl = vServerUrl;
    }
    else {
      vUrl = "";
    }

    axios.get(vUrl)
      .then((response) => {
        let vData = response.data;

        if (vData[pContract]) {
          for (let i = 0; i < vData[pContract].length; i++) {
            if ((vData[pContract][i].symbol === pSymbol) && (vData[pContract][i].expiry_date === parseInt(pDateToTime)) && (parseFloat(vData[pContract][i].strike_price) === parseFloat(pRoundedStrike)) && (vData[pContract][i].option_type === pCorP)) {
              vNewToken = vData[pContract][i].token;
              // console.log(vData[pContract][i].token + " ,");
            }
          }

          if (vNewToken === "") {
            reject({ "status": "warning", "message": "Option Token Not Found, Check Expiry Date!", "data": "" });
          }
          else {
            resolve({ "status": "success", "message": "Success - Option Token Received!", "data": { ActualStrike: pActualStrike, RoundedStrike: pRoundedStrike, TradeToken: vNewToken } });
          }
        }
        else {
          // console.log("Failed");
          reject({ "status": "warning", "message": "Invalid Contract Name. Please Check!", "data": "" });
        }
      })
      .catch((error) => {
        //console.log("Error: " + error);
        reject({ "status": "danger", "message": error.message, "data": "" });
      });
  });

  return objData;
}

const fnGetOpenTradeDetails = async (pContract, pToken, pClientId, pSession) => {
  const objData = new Promise((resolve, reject) => {
    let objParams = JSON.stringify({
      "exch": pContract,
      "symbol": pToken
    });

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    axios.request(objConfig)
      .then((objResponse) => {
        //console.log(JSON.stringify(objResponse.data));

        resolve({ "status": "success", "message": "Success - Option Data Received", "data": { BuyPrice: objResponse.data.BRate, SellRate: objResponse.data.SRate, ReqStatus: objResponse.data.stat } });
      })
      .catch((error) => {
        //console.log(error);
        reject({ "status": "danger", "message": "Error in getting LTP, Please Check!", "data": error.message });
      });
  });
  return objData;
}

const fnGetTradeDetails = async (pContract, pToken, pClientId, pSession, pActualStrike, pRoundedStrike) => {
  const objData = new Promise((resolve, reject) => {

    let objParams = JSON.stringify({
      "exch": pContract,
      "symbol": pToken
    });

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails',
      headers: {
        'Authorization': 'Bearer ' + pClientId + ' ' + pSession,
        'Content-Type': 'application/json'
      },
      data: objParams
    };

    //console.log(pContract + " - " + pToken + " - " + pBorS);
    axios.request(objConfig)
      .then((objResponse) => {
        //console.log(JSON.stringify(objResponse.data));

        resolve({ "status": "success", "message": "Success - Option Data Received", "data": { ActualStrike: pActualStrike, RoundedStrike: pRoundedStrike, TradeToken: pToken, BuyPrice: objResponse.data.BRate, SellRate: objResponse.data.SRate, ReqStatus: objResponse.data.stat } });
      })
      .catch((error) => {
        //console.log(error);
        reject({ "status": "danger", "message": "Error in getting LTP, Please Check!", "data": error.message });
      });
  });

  return objData;
}