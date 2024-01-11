
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
  let vCurentPrice = "";

  try {
    vCurentPrice = await fnGetCurrentPrice(vExchange, vToken, vClientId, vSession);

    if(vCurentPrice !== "")
    {
      //console.log(vCurentPrice);
      
      let VRoundedStrike = await fnGetRoundedStrikePrice(vCurentPrice.data, vStrikeInterval);
      //let VRoundedStrike = await fnGetRoundedStrikePrice(vCurentPrice, vStrikeInterval);

      res.send({"status": VRoundedStrike.status, "message": VRoundedStrike.message, "data": VRoundedStrike.data});
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

const fnGetCurrentPrice = async (pExchange, pToken, pClientId, pSession) => {
  const objData =  new Promise((resolve, reject) => {
    let data = JSON.stringify({
      "exch": pExchange,
      "symbol": pToken
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://ant.aliceblueonline.com/rest/AliceBlueAPIService/api/ScripDetails/getScripQuoteDetails',
      headers: { 
        'Authorization': 'Bearer '+ pClientId +' ' + pSession, 
        'Content-Type': 'application/json'
      },
      data : data
    };

    axios.request(config)
    .then((response) => {
      //console.log(JSON.stringify(response.data));
      resolve({"status": "success", "message": "Success - Symbol Data Received", "data": response.data.LTP});
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
      resolve({"status": "success", "message": "Success - Rounded Strike Rate Received", "data": vRoundedStrike});
    }
  });

  return objData;
}

const fnGetSymbolToken = async (pSource, pExchange, pContract, pSymbol, pExpiry, pStrikeInterval) => {
  const objData = new Promise((resolve, reject) => {
    const vLocalUrl = process.env.API_PATH + "json/" + pContract + ".json";
    const vServerUrl = "https://v2api.aliceblueonline.com/restpy/contract_master?exch=" + pContract;
    let vUrl = "";
    let vLoopData = "";

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
            vLoopData = "";
            if(vData[pContract][i].symbol === pSymbol)
            {
              //vLoopData += vData[pContract][i].symbol;
              console.log(vData[pContract][i].symbol + " ,");
            }
          }
          //console.log("Loop Data: "+ vLoopData);
          console.log("Parameter: "+ pSymbol);
          resolve({"status": "success", "message": "Success - Symbol Token Received", "data": vData[pContract].length});
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