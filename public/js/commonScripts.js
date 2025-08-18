const socket = io();
var gCaptchaCode;

// $(document).ready(function () {
//   $("#myInput").on("keyup", function () {
//     let value = $(this).val().toLowerCase();
//     $("#tdUserData tr").filter(function () {
//       $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
//     });
//   });
// });

window.addEventListener("DOMContentLoaded", function(){
  fnGetSetAppStatus();
});

function createCaptcha(pLength){
  //clear the contents of captcha div first 
  document.getElementById('divCaptcha').innerHTML = "";
  var charsArray =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@!#$%^&*";
  var lengthOtp = pLength;
  var captcha = [];
  for (var i = 0; i < lengthOtp; i++) {
    //below code will not allow Repetition of Characters
    var index = Math.floor(Math.random() * charsArray.length + 1); //get the next character from the array
    if (captcha.indexOf(charsArray[index]) == -1)
      captcha.push(charsArray[index]);
    else i--;
  }
  var canv = document.createElement("canvas");
  canv.id = "captcha";
  canv.width = 100;
  canv.height = 50;
  var ctx = canv.getContext("2d");
  ctx.font = "25px Georgia";
  ctx.color = ("white");
  ctx.strokeText(captcha.join(""), 0, 30);
  //storing captcha so that can validate you can save it somewhere else according to your specific requirements
  gCaptchaCode = captcha.join("");
  document.getElementById("divCaptcha").appendChild(canv); // adds the canvas to the body element
}

function fnGetSetAppStatus(){
  let bAppStatus = localStorage.getItem("AppMsgStatusS");
  let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));
  let objLoginTxt = document.getElementById("lblAppLoginTxt");
  let objSpnGreet = document.getElementById("spnLoginGreetings");
  let objLiPwd = document.getElementById("liChangePwd");

  let lsPrevSessionDate = localStorage.getItem("lsLoginDate");
  const vDate = new Date();
  let vToday = vDate.getDate();

  if(lsPrevSessionDate === null || lsPrevSessionDate === ""){
    lsPrevSessionDate = 0;
  }

  if ((parseInt(vToday) === parseInt(lsPrevSessionDate)) && (bAppStatus === "true")) {
      objLoginTxt.innerText = "LOGOUT";
      objSpnGreet.innerText = "Hi, " + objAppCred.FullName;
      objLiPwd.style.display = "block";
      fnGenMessage("App is Logged In!", `badge bg-success`, "spnGenMsg");
  }
  else {
      objLoginTxt.innerText = "LOGIN";
      objSpnGreet.innerText = "";
      objLiPwd.style.display = "none";
      localStorage.setItem("lsLoginDate", 0);
      localStorage.setItem("AppMsgStatusS", false);
      document.getElementById("txtLoginEmailId").value = localStorage.getItem("AppLoginEmail");
      fnGenMessage("App is Not Logged In!", `badge bg-warning`, "spnGenMsg");
      // $('#mdlAppLogin').modal('show');
  }
}

async function fnAppLogin(){
  let objEmailId = document.getElementById("txtLoginEmailId");
  let objPassword = document.getElementById("txtLoginPassword");
  let objCapcha = document.getElementById("txtCaptcha");

  if(objEmailId.value === ""){
    fnGenMessage("Please Input Email ID!", `badge bg-warning`, "spnAppLogin");
    objEmailId.focus();
  }
  else if(objPassword.value === ""){
    fnGenMessage("Please Input Password!", `badge bg-warning`, "spnAppLogin");
    objPassword.focus();
  }
  else if(objCapcha.value !== gCaptchaCode){
    fnGenMessage("Invalid Captcha, Re-enter Again!", `badge bg-warning`, "spnAppLogin");
    objCapcha.value = "";
    createCaptcha(4);
    objCapcha.focus();
  }
  else{
    let objUserDet = await fnGetUserDetByEmailPass(objEmailId.value, objPassword.value);

    if(objUserDet.status === "success"){
      //console.log(objUserDet.data);

      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");

      localStorage.setItem("AppCredS", JSON.stringify(objUserDet.data));
      localStorage.setItem("AppMsgStatusS", true);

      const vDate = new Date();
      let vToday = vDate.getDate();
      localStorage.setItem("lsLoginDate", vToday);
      localStorage.setItem("AppLoginEmail", objUserDet.data.EmailId);

      window.location.reload();
    }
    else if(objUserDet.status === "warning"){
      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnAppLogin");
      objCapcha.value = "";
      createCaptcha(4);

       localStorage.setItem("AppMsgStatusS", false);
   }
    else{
      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnAppLogin");
      objCapcha.value = "";
      createCaptcha(4);
      localStorage.setItem("AppMsgStatusS", false);
    }    
  }
}

async function fnValidateForgotPassword(){
  let objEmailId = document.getElementById("txtLoginEmailId");
  let objCapcha = document.getElementById("txtCaptcha");

  if(objEmailId.value === ""){
    fnGenMessage("Please Input Email ID!", `badge bg-warning`, "spnAppLogin");
    objEmailId.focus();
  }
  else if(objCapcha.value !== gCaptchaCode){
    fnGenMessage("Invalid Captcha, Re-enter Again!", `badge bg-warning`, "spnAppLogin");
    objCapcha.value = "";
    createCaptcha(4);
    objCapcha.focus();
  }
  else{
    let vRandomPassword = generatePassword(10);

    let objUserDet = await fnCheckEmailSendPwd(objEmailId.value, vRandomPassword);

    if(objUserDet.status === "success"){

      fnSendEmail(objEmailId.value, vRandomPassword);
      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnAppLogin");
      objCapcha.value = "";
      createCaptcha(4);
    }
  else{
      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnAppLogin");
      objCapcha.value = "";
      createCaptcha(4);
      objCapcha.focus();
    }
  }
}

function generatePassword(pLength) {
  var length = pLength,
      charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      retVal = "";
  for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

function fnCheckEmailSendPwd(pEmailId, pRandPwd){
    const objUserDet = new Promise((resolve, reject) => {

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ EmailId: pEmailId, RandPwd: pRandPwd }),
            redirect: 'follow'
        };

        fetch("/Users/getEmailSavePwd", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in E-Mail ID, Please Check!.", `badge bg-danger`, "spnAppLogin");
                reject({ "status": "danger", "message": "Error in Sending E-Mail, Contact Admin!", "data": "" });
            });
    });
    return objUserDet;
}

function fnSendEmail(pEmailId, pRandPwd){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestData = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ EmailId: pEmailId, RandPwd: pRandPwd }),
        redirect: 'follow'
    };

    fetch("/Users/sendPwdByEmail", objRequestData)
        .then(objResponse => objResponse.json())
        .then(objResult => {

            fnGenMessage(objResult.message, `badge bg-success`, "spnAppLogin");
        })
        .catch(error => {
            // console.log('error: ', error);
            fnGenMessage("Error in E-Mail ID!.", `badge bg-danger`, "spnAppLogin");
        });
}

async function fnSubmitChangePwd(){
  let objCurrPwd = document.getElementById("txtCurrPwd");
  let objNewPwd = document.getElementById("txtNewPwd");
  let objNewConfPwd = document.getElementById("txtNewConfPwd");
  let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

  if(objCurrPwd.value === ""){
    fnGenMessage("Please Input Current Password!", `badge bg-warning`, "spnChgPwdMsg");
    objCurrPwd.focus();
  }
  else if(objNewPwd.value === ""){
    fnGenMessage("Please Input New Password!", `badge bg-warning`, "spnChgPwdMsg");
    objNewPwd.focus();
  }
  else if(objNewPwd.value !== objNewConfPwd.value){
    fnGenMessage("New Password and Confirm New Password must be Same!", `badge bg-warning`, "spnChgPwdMsg");
    objNewConfPwd.focus();
  }
  else{
    let objUserDet = await fnGetChangePwdStatus(objCurrPwd.value, objNewPwd.value, objAppCred.UserId, objAppCred.Password);
    if(objUserDet.status === "success"){

      fnLoginStatus();
      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
    }
    else{
      fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnChgPwdMsg");
    }
  }
}

function fnGetChangePwdStatus(pCurrPwd, pNewPwd, pUserId, pEncPwd){
  const objUserDet = new Promise((resolve, reject) => {

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestData = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ CurrPwd: pCurrPwd, NewPwd: pNewPwd, UserId: pUserId, EncPwd: pEncPwd }),
        redirect: 'follow'
    };

    fetch("/Users/getUserChangedPwdStatus", objRequestData)
        .then(objResponse => objResponse.json())
        .then(objResult => {

            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
        })
        .catch(error => {
            // console.log('error: ', error);
            fnGenMessage("Error in Updating Password! " + error, `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Updating Password!", "data": "" });
        });
    });
    return objUserDet;
}

function fnGetUserDetByEmailPass(pEmailId, pPassword){
  const objUserDet = new Promise((resolve, reject) => {
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let objRequestData = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ EmailId: pEmailId, Password: pPassword }),
        redirect: 'follow'
    };

    fetch("/Users/getUserDetByEmailPass", objRequestData)
        .then(objResponse => objResponse.json())
        .then(objResult => {

            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
        })
        .catch(error => {
            // console.log('error: ', error);
            fnGenMessage("Error in Getting Login Details! " + error, `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting Login Details!", "data": "" });
        });
    });
    return objUserDet;
}

function fnLoginStatus(){
  let objLoginTxt = document.getElementById("lblAppLoginTxt");
  // let objSession = document.getElementById("txtKotakSession");

  if(objLoginTxt.innerText === "LOGOUT")
  {
    localStorage.setItem("AppMsgStatusS", false);

    fnClearPrevLoginSession();

    window.location.reload();
  }
  else
  {
    fnGenMessage("Please Input Login Details!", `badge bg-primary`, "spnAppLogin");
    document.getElementById("txtLoginPassword").value = "";
    createCaptcha(4);
    $('#mdlAppLogin').modal('show');
  }
}

function fnDisplayChangePwd(){
  let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

  if(objAppCred.IsActive){
    $('#mdlChangePwdJ').modal('show');
  }
  else{
    fnGenMessage("Your Login is InActive, Contact Admin!", `badge bg-warning`, "spnGenMsg");
  }
}

function fnShowMyProfileMdl(){
  if(gIsTraderLogin){
    fnGenMessage("Profile Details", `badge bg-primary`, "spnABProfile");
    $('#mdlUserProfile').modal('show');
  }
  else{
    fnGenMessage("Login to Trading Account to Display Profile!", `badge bg-danger`, "spnGenMsg");
  }

  //console.log("Profile - " + localStorage.getItem("UserDetS"));
}

function fnChangeBtnProps(pId, pClassName, pDispText){
    let objBtn = document.getElementById(pId);

    objBtn.innerText = pDispText;
    objBtn.className = pClassName;
}

function fnGetSetDefaultValue(){
    //alert(localStorage.getItem("lsRecords"));
    let objRecordsDdl = document.getElementById("ddlDispRecNos");
    //let lsRecords = localStorage.getItem("lsRecords") || 10;
    if(localStorage.getItem("lsRecords") === null || localStorage.getItem("lsRecords") === ""){
        localStorage.setItem("lsRecords", 0);
    }
    objRecordsDdl.value = localStorage.getItem("lsRecords");
}

function fnSearchTable(objThis, pContentId) {
    //console.log(objThis);
    let value = $(objThis).val().toLowerCase();
    $(pContentId).filter(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
    });
}

function fnGenMessage(pMsg, pStyle, pSpnId) {
  objSpan = document.getElementById(pSpnId);

  objSpan.innerHTML = pMsg;
  objSpan.className = pStyle;
}

function fnDisplayShortText(pTxt, pLength) {
  if (pTxt.length > pLength) {
    pTxt = pTxt.substring(0, pLength) + "...";
  }

  return pTxt;
}

function fnFillPagination(pRecCount, pDispLocId){
    let vRecPerPage = localStorage.getItem("lsRecords");
    let vPages = 1;

    if(parseInt(vRecPerPage) === 0)
    vPages = Math.ceil(pRecCount / pRecCount);
    else
    vPages = Math.ceil(pRecCount / vRecPerPage);

    let objUl = document.getElementById(pDispLocId);
    let vCurrPage = document.getElementById("hidCurrPage");
    let vHtml = "";
    //alert(vPages);

    if(parseInt(vCurrPage.value) > 1)
    {
      vHtml = '<li class="page-item"><a class="page-link" href="javascript: void(null);" onclick="fnSetCurrPaginationNo(0, `prev`);"><span aria-hidden="true">&lt;</span></a></li>';
    }
    else
    {
      vHtml = '<li class="page-item"><a class="page-link disabled" href="javascript: void(null);"><span aria-hidden="true">&lt;</span></a></li>';
    }

    //If more no of Pages Comment the below for loop
    for(i=0; i< vPages; i++)
    {
        if(parseInt(vCurrPage.value) === (i+1))
        {
            vHtml += '<li class="page-item active"><a class="page-link">'+ (i + 1) +'</a></li>';
        }
        else
        {
            vHtml += '<li class="page-item"><a class="page-link" href="javascript: void(null);" onclick="fnSetCurrPaginationNo('+ (i+1) +', `same`);">'+ (i + 1) +'</a></li>';
        }
    }

    //console.log(vCurrPage.value + " - " + vPages)
    if(parseInt(vCurrPage.value) === vPages)
    {
      vHtml += '<li class="page-item"><a class="page-link disabled"><span aria-hidden="true">&gt;</span></a></li>';
    }
    else
    {
      vHtml += '<li class="page-item"><a class="page-link" href="javascript: void(null);" onclick="fnSetCurrPaginationNo(0, `next`);"><span aria-hidden="true">&gt;</span></a></li>';
    }

    objUl.innerHTML = vHtml;
}

function fnSetCurrPaginationNo(pClickedPage, pAction){
  let vCurrPage = document.getElementById("hidCurrPage");

  if(pAction === "next")
  {
    vCurrPage.value = parseInt(vCurrPage.value) + 1;
  }
  else if(pAction === "prev")
  {
    vCurrPage.value = parseInt(vCurrPage.value) - 1;
  }
  else
  {
    vCurrPage.value = pClickedPage;
  }

  fnGetUserData();
}

function fnClearStorage(){
  localStorage.removeItem("lsRecords");
}

function fnGetCurrDate(){
  const vNow = new Date(Date.now());

  let vDay = vNow.getDate();
  let vMonth = vNow.getMonth() + 1;
  let vYear = vNow.getFullYear();
  let vHour = vNow.getHours();
  let vMinute = vNow.getMinutes();
  let vSecond = vNow.getSeconds();
  let vMilliSecond = vNow.getMilliseconds();

  let vDateTimeStr = vYear + "-" + vMonth + "-" + vDay + "T" + vHour + ":" + vMinute + ":" + vSecond + "." + vMilliSecond + "Z";
  
  return vDateTimeStr;
}

function fnSetCurrDate(pDate){
  let dtNow = new Date(pDate);
  
  // console.log("Parameter: " + pDate);
  // console.log("Converted to Date: " + dtNow);
  // console.log("Converted to Local Str: " + dtNow.toDateString());
  // console.log("Converted to GMT Str: " + dtNow.toGMTString());
  // console.log("Converted to UTC Str: " + dtNow.toUTCString());
  // console.log("Converted to ISO Str: " + dtNow.toISOString());
  // console.log("Converted to JSON Str: " + dtNow.toJSON());
  // console.log("Converted to to Local Dt Str: " + dtNow.toLocaleDateString());
  // console.log("Converted to to Local Tm Str: " + dtNow.toLocaleTimeString());
  // console.log("Converted to to Local DT en-US: " + dtNow.toLocaleString("en-IN"));
}

function fnShowHideMarginData(){
  let objDivMarginData = document.getElementById("divMarginData");

  if(objDivMarginData.style.display === "none"){
    objDivMarginData.style.display = "block";
  }
  else{
    objDivMarginData.style.display = "none";
  }
}

function fnChangeOptionStrike(objThis){
    localStorage.setItem("StrikeOptionS", objThis.value);
}

function fnGetSetOptionStrike(){
    let vCurrOS = localStorage.getItem("StrikeOptionS");
    let objDDLStrikeOption = document.getElementById("ddlOptionStrike");

    if(vCurrOS === "" || vCurrOS === null){
        objDDLStrikeOption.value = 0;
    }
    else{
        objDDLStrikeOption.value = vCurrOS;
    }
}

function fnGetIdFromDate(){
    const vDate = new Date();
    return vDate.valueOf();
}