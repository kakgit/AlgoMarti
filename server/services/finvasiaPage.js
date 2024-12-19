const {createHash} = require('node:crypto');
const axios = require("axios");


exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("finvasia.ejs");

    //Make a get request to /api/users
    // axios.get(process.env.API_PATH + 'api/users')
    // .then(function(response){
    //     //console.log(response);
    //     res.render("index.ejs", { users : response.data});
    // })
    // .catch(error => {
    //     res.send(error);
    // })
}

exports.fnLoginFinvasia = async (req, res) => {
    // let vClientId = "FA153006";
    // let vVendorCode = "FA153006_U";
    // let vPassword = "Lion@113";
    // let vApiKey = "75c4451a5b5df874c59d7ed6284d0fb1";
    // let vIMEI = "abc1234";

    let vClientId = req.body.UserId;
    let vPassword = req.body.Password;
    let vTwoFa = req.body.TwoFA;
    let vVendorCode = req.body.VendorCode;
    let vApiSecret = req.body.ApiSecret;
    let vImei = req.body.Imei;
  
    try {
        let vPasswordSHA256 = await fnGetSHA256Updated(vPassword);
  
        let vAppKey = vClientId + "|" + vApiSecret;
        let vAppKeySHA256 = await fnGetSHA256Updated(vAppKey);

        let vSession = await fnGetSession(vClientId, vPasswordSHA256, vTwoFa, vVendorCode, vAppKeySHA256, vImei);
    //   //console.log(vSession);
  
    //   let objUserDet = await fnGetProfileDetailsAB(vClientId, vSession);
  
    //   let objUserMargin = await fnGetUsermarginsAB(vClientId, vSession);
    //   //let vData = {accountId : objUserDet.data.accountId, accountName : objUserDet.data.accountName, cellAddr : objUserDet.data.cellAddr, emailAddr : objUserDet.data.emailAddr, accountStatus : objUserDet.data.accountStatus, dataMargins : objUserMargin.data[0]};
  
  
    //   let vData = {EncKey : vEncKey, Session : vSession, accountId : objUserDet.data.accountId, accountName : objUserDet.data.accountName, cellAddr : objUserDet.data.cellAddr, emailAddr : objUserDet.data.emailAddr, accountStatus : objUserDet.data.accountStatus, dataMargins : objUserMargin.data[0]};
  
      res.send({"status": "success", "message": "Trader Login - Successful", "data": "vData"});
    }
    catch (error) {
      //console.log(error);
      res.send({"status": "danger", "message": error.message});
    }
}

async function fnGetSHA256Updated(pText)
{
    // const vRes = createHash('sha256').update("632665sYtLAxsaZjYPcHEMVKK2yLGvsr9mH1ou9FcFmZuQy5LIuotmzaoN4uof32IavhKaYSUBkQfHWVs4OUlk7FQjYpOWRxJx9BDajn9LKI598LtIbR0STdhK1g0uLIlBLHHW0D8V646QTFM7MCCHH95N2UIQW7UNZBO2").digest('hex');
    const vHash256 = createHash('sha256').update(pText).digest('hex');

    return vHash256;
}
