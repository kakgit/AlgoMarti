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

async function fnLoginAliceBlue(req, res)
{
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

    } catch (error) {
    //console.log(error);
    res.send({"status": "danger", "message": error.message});
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


module.exports = fnLoginAliceBlue;