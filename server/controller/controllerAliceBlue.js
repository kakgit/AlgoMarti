
const {createHash} = require('node:crypto');
const axios = require('axios');

// exports.fnLoginAliceBlue = async (req, res) => {
//     let vClientId = "632665";
//     let vApiKey = "sYtLAxsaZjYPcHEMVKK2yLGvsr9mH1ou9FcFmZuQy5LIuotmzaoN4uof32IavhKaYSUBkQfHWVs4OUlk7FQjYpOWRxJx9BDajn9LKI598LtIbR0STdhK1g0uLIlBLHHW";

//     // const vEncKey = await fnGetEncKey(req, res, vClientId);

//     // console.log(vEncKey);

//     let data = JSON.stringify({
//       userId: vClientId,
//     });
//     let config = {
//       method: "post",
//       maxBodyLength: Infinity,
//       url: "https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/customer/getAPIEncpkey",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       data: data,
//     };

//     await axios
//       .request(config)
//       .then((response) => {
//         //console.log(JSON.stringify(response.data));
//         const isEncKey = response.data.login;

//         if(isEncKey)
//         {
//             const vEncKey = response.data.encKey;

//             const objSession = fnGetSHA256Code(req, res, vClientId, vApiKey, vEncKey);
//             //console.log(objSession);
//         }
//         else
//         {
//             res.send({"status": "warning", "message": response.data.emsg});
//         }
//       })
//       .catch((error) => {
//         console.log(error);
//         res.send({"status": "danger", "message": "Error: Error at getting Enc Code!"});
//     });

//     // console.log(vEncKey);
//     // res.send({"status": "success"});
// }

exports.fnLoginAliceBlue = async (req, res) => {
  // let vClientId = "632665";
  // let vApiKey = "sYtLAxsaZjYPcHEMVKK2yLGvsr9mH1ou9FcFmZuQy5LIuotmzaoN4uof32IavhKaYSUBkQfHWVs4OUlk7FQjYpOWRxJx9BDajn9LKI598LtIbR0STdhK1g0uLIlBLHHW";
  let vClientId = req.body.ClientID;
  let vApiKey = req.body.ApiKey;

  try {
    let vEncKey = await fnGetEncKey(vClientId);
    // console.log(vEncKey);

    let vSHA256 = await fnGetSHA256Updated(vClientId, vApiKey, vEncKey);
    // console.log(vSHA256);

    let vSession = await fnGetSessionAB(vClientId, vSHA256);
    // console.log(vSession);

    let vData = {EncKey : vEncKey, Session : vSession};

    res.send({"status": "success", "message": "Login - Successful", "data": vData});

    return true;
    } catch (error) {
    //console.log(error);
    res.send({"status": "danger", "message": error.message});

    return false;
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

async function fnGetSHA256Updated(pClientID, pApiKey, pEncKey)
{
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

exports.fnGetStrikePrice = async (req, res) => {
  let vClientId = req.body.ClientID;
  let vSession = req.body.Session;
  let vExchange = req.body.Exchange;
  let vStrikeInterval = req.body.StrikeInterval;
  let vToken = req.body.Token;
  let objCurentPrice = "";

  try {
    objCurentPrice = await fnGetCurrentPrice(vExchange, vToken, vClientId, vSession);

    if(objCurentPrice.data !== "")
    {
      //console.log(objCurentPrice);
      
      let vStrike = await fnGetRoundedStrikePrice(objCurentPrice.data, vStrikeInterval);
      //let VRoundedStrike = await fnGetRoundedStrikePrice(objCurentPrice, vStrikeInterval);

      res.send({"status": vStrike.status, "message": vStrike.message, "data": vStrike.data});
    }
    else
    {
      res.send({"status": "warning", "message": "Received LTP for the Symbol is Empty, Please Check!", "data": ""});
    }
    // vTokenNo = await fnGetSymbolToken(vSource, vExchange, vContract, vSymbol, vExpiry, vStrikeInterval);

    // res.send({"status": vTokenNo.status, "message": vTokenNo.message, "data": vTokenNo.data});
  }
  catch(err) {
    console.log("At fnGetCurrentPrice: " + err.data);
    res.send({"status": err.status, "message": err.message, "data": err.data});
  }

  // const objData = new Promise((resolve, reject) => {
  //   let data = JSON.stringify({
  //     exch: pClientID,
  //     symbol: pSHA256,
  //   });

  //   let config = {
  //     method: "post",
  //     maxBodyLength: Infinity,
  //     url: "https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails",
  //     headers: {
  //        "Authorization": `Bearer ${pClientID} ${Session}`,
  //       "Content-Type": "application/json",
  //     },
  //     data: data,
  //   };
  //   axios
  //     .request(config)
  //     .then((response) => {

  //       const vIsOk = response.data.stat;
  //       //console.log(response.data);

  //       if (vIsOk === "Ok") {
  //         const vSessionAB = response.data.sessionID;

  //         resolve(vSessionAB);

  //       } else {
  //         //console.log(response.data.emsg);
  //         reject(new Error(response.data.emsg));
  //       }
  //     })
  //     .catch((error) => {
  //       //console.log(error);
  //       reject(new Error("Error at getting Session"));
  //     });
  // });
}

exports.fnGetExecutedTradeRate = async (req, res) => {
  let vActualStrikeRate = req.body.ActualStrikeRate;
  let vCurrStrikeRate = req.body.CurrStrikeRate;
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

  let objCurentPrice = "";

  if(vActualStrikeRate !== "")
  {
    let objTokenData = await fnGetTradeToken(vBorS, vCorP, vActualStrikeRate, vCurrStrikeRate, vStrikeInterval, vContract, vSource, vSymbol, vDateToTime);

      if(objTokenData.data.TradeToken !== "")
      {
        let objTradeDetails = await fnGetTradeDetails(vContract, objTokenData.data.TradeToken, vClientId, vSession, objTokenData.data.ActualStrike, objTokenData.data.RoundedStrike, vBorS);

        res.send({ status: objTradeDetails.status, message: objTradeDetails.message, data: objTradeDetails.data });
      }
      else
      {
        res.send({ status: "warning", message: "Received Token Data is Invalid, Please Check!", data: "" });
      }
    }
  else
  {
    try {
      objCurentPrice = await fnGetCurrentPrice(vExchange, vToken, vClientId, vSession);

      if (objCurentPrice.data !== "")
      {
        let vStrike = await fnGetRoundedStrikePrice(objCurentPrice.data, vStrikeInterval);

        if(vStrike.data.RoundedStrike !== "")
        {
          let objTokenData = await fnGetTradeToken(vBorS, vCorP, vStrike.data.ActualStrike, vStrike.data.RoundedStrike, vStrikeInterval, vContract, vSource, vSymbol, vDateToTime);

          if(objTokenData.data.TradeToken !== "")
          {
            let objTradeDetails = await fnGetTradeDetails(vContract, objTokenData.data.TradeToken, vClientId, vSession, objTokenData.data.ActualStrike, objTokenData.data.RoundedStrike, vBorS);

            res.send({ status: objTradeDetails.status, message: objTradeDetails.message, data: objTradeDetails.data });
          }
          else
          {
            res.send({ status: "warning", message: "Received Token Data is Invalid, Please Check!", data: "" });
          }
        }
        else
        {
          res.send({ status: "warning", message: "Received Strike Price is Invalid, Please Check!", data: "" });
        }
      }
      else
      {
        res.send({ status: "warning", message: "Received LTP for the Symbol is Empty, Please Check!", data: "" });
      }
    }
    catch (err)
    {
      console.log("At Executed Trade: " + err.data);
      res.send({ status: err.status, message: err.message, data: err.data });
    }
  }
};

const fnGetCurrentPrice = async (pExchange, pToken, pClientId, pSession) => {
  const objData =  new Promise((resolve, reject) => {
    let objParams = JSON.stringify({
      "exch": pExchange,
      "symbol": pToken
    });

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails',
      headers: { 
        'Authorization': 'Bearer '+ pClientId +' ' + pSession, 
        'Content-Type': 'application/json'
      },
      data : objParams
    };

    axios.request(objConfig)
    .then((objResponse) => {
      //console.log(JSON.stringify(response.data));
      resolve({"status": "success", "message": "Success - Symbol Data Received", "data": objResponse.data.LTP});
    })
    .catch((error) => {
      //console.log(error);
      reject({"status": "danger", "message": "Error in getting LTP, Please Check!", "data": error.message});
    });
  });
  //console.log(pExchange + " - " + pToken + " - " + pClientId + " - " + pSession);

  return objData;
}

const fnGetRoundedStrikePrice = async (pActualStrike, pStrikeInterval) => {

  const objData = new Promise((resolve, reject) => {
    
    let vRoundedStrike = Math.round(parseInt(pActualStrike) / parseInt(pStrikeInterval)) * parseInt(pStrikeInterval);

    if(isNaN(vRoundedStrike))
    {
      reject({"status": "danger", "message": "Error - Strike Price is Invalid!", "data": ""});
    }
    else
    {
      resolve({"status": "success", "message": "Success - Rounded Strike Rate Received", "data": {"ActualStrike": vRoundedStrike, "RoundedStrike": vRoundedStrike} });
    }
  });

  return objData;
}

const fnGetTradeToken = async (pBorS, pCorP, pActualStrike, pRoundedStrike, pStrikeInterval, pContract, pSource, pSymbol, pDateToTime) => {
  const objData =  new Promise((resolve, reject) => {
    let vITMStrike = pActualStrike;

    //console.log(pContract + " - " + pCorP);
    if(pBorS === "buy")
    {
      if(pCorP === "CE")
      {
        vITMStrike = parseFloat(vITMStrike) - parseFloat(pStrikeInterval);
      }
      else if(pCorP === "PE")
      {
        vITMStrike = parseFloat(vITMStrike) + parseFloat(pStrikeInterval);
      }
      else
      {
        vITMStrike = pActualStrike;
      }
    }
    else
    {
      vITMStrike = pActualStrike;
    }

    const vLocalUrl = process.env.API_PATH + "json/" + pContract + ".json";
    const vServerUrl = "https://v2api.aliceblueonline.com/restpy/contract_master?exch=" + pContract;
    let vUrl = "";
    let vNewToken = "";
    
    if(pSource === "0")
    {
      vUrl = vLocalUrl;
    }
    else if(pSource === "1")
    {
      vUrl = vServerUrl;
    }
    else
    {
      vUrl = "";
    }

    axios.get(vUrl)
    .then((response) => {
      let vData = response.data;
      
      if(vData[pContract])
      {
        for(let i=0; i<vData[pContract].length; i++)
        {
          if((vData[pContract][i].symbol === pSymbol) && (vData[pContract][i].expiry_date === parseInt(pDateToTime)) && (parseFloat(vData[pContract][i].strike_price) === parseFloat(vITMStrike)) && (vData[pContract][i].option_type === pCorP))
          {
            vNewToken = vData[pContract][i].token;
            //console.log(vData[pContract][i].token + " ,");
          }
        }

        resolve({"status": "success", "message": "Success - Option Token Received!", "data": { ActualStrike: pActualStrike, RoundedStrike: vITMStrike, TradeToken: vNewToken }});
      }
      else
      {
        // console.log("Failed");
        reject({"status": "warning", "message": "No Data Found in File", "data": ""});
      }
    })
    .catch((error) => {
      //console.log("Error: " + error);
      reject({"status": "danger", "message": error.message, "data": ""});
    });
  });

  return objData;
}

const fnGetTradeDetails = async (pContract, pToken, pClientId, pSession, pActualStrike, pRoundedStrike, pBorS) => {
  const objData =  new Promise((resolve, reject) => {

    let objParams = JSON.stringify({
      "exch": pContract,
      "symbol": pToken
    });

    let objConfig = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails',
      headers: { 
        'Authorization': 'Bearer '+ pClientId +' ' + pSession, 
        'Content-Type': 'application/json'
      },
      data : objParams
    };

    //console.log(pContract + " - " + pToken + " - " + pBorS);
    axios.request(objConfig)
    .then((objResponse) => {
      let vLTP = 0;
      console.log(JSON.stringify(objResponse.data));

      if(pBorS === "buy")
      {
        vLTP = objResponse.data.SRate;
      }
      else if(pBorS === "sell")
      {
        vLTP = objResponse.data.BRate;
      }
      else
      {
        vLTP = 0;
      }

      resolve({"status": "success", "message": "Success - Option Data Received", "data": { ActualStrike: pActualStrike, RoundedStrike: pRoundedStrike, TradeToken: pToken, LTP: vLTP }});
    })
    .catch((error) => {
      //console.log(error);
      reject({"status": "danger", "message": "Error in getting LTP, Please Check!", "data": error.message});
    });
  });

  return objData;
}

//Not Used Delete Later if reference not required
// async function fnGetSHA256Code(req, res, pClientID, pApiKey, pEncKey)
// {
//     // const vRes = createHash('sha256').update("632665sYtLAxsaZjYPcHEMVKK2yLGvsr9mH1ou9FcFmZuQy5LIuotmzaoN4uof32IavhKaYSUBkQfHWVs4OUlk7FQjYpOWRxJx9BDajn9LKI598LtIbR0STdhK1g0uLIlBLHHW0D8V646QTFM7MCCHH95N2UIQW7UNZBO2").digest('hex');
//     const vHash256 = createHash('sha256').update(pClientID + pApiKey + pEncKey).digest('hex');

//     const vRes = await fnGetSessionCode(req, res, pClientID, vHash256);

//     return vRes;
// }

// async function fnGetSessionCode(req, res, pClientID, pSHA256)
// {
//     let data = JSON.stringify({
//       userId: pClientID,
//       userData: pSHA256,
//     });

//     let config = {
//       method: "post",
//       maxBodyLength: Infinity,
//       url: "https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/customer/getUserSID",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       data: data,
//     };

//     axios
//       .request(config)
//       .then((response) => {

//         const vIsOk = response.data.stat;
//         console.log(JSON.stringify(response.data));

//         if(vIsOk === "Ok")
//         res.send({"status": "success", "message": "Login Successful", "session": response.data.sessionID});
//         else
//         res.send({"status": "danger", "message": response.data.emsg});

//       })
//       .catch((error) => {
//         console.log(error);
//         res.send({"status": "danger", "message": "Error: Error at Sending Session"});
//       });
// }


//module.exports = fnLoginAliceBlue, fnGetStrikePrice;