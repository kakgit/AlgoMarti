const socket = io();

// $(document).ready(function () {
//   $("#myInput").on("keyup", function () {
//     let value = $(this).val().toLowerCase();
//     $("#tdUserData tr").filter(function () {
//       $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
//     });
//   });
// });

window.addEventListener("DOMContentLoaded", function(){

});

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

  objSpan.innerText = pMsg;
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
  
  console.log("Parameter: " + pDate);
  console.log("Converted to Date: " + dtNow);
  console.log("Converted to Local Str: " + dtNow.toDateString());
  console.log("Converted to GMT Str: " + dtNow.toGMTString());
  console.log("Converted to UTC Str: " + dtNow.toUTCString());
  console.log("Converted to ISO Str: " + dtNow.toISOString());
  console.log("Converted to JSON Str: " + dtNow.toJSON());
  console.log("Converted to to Local Dt Str: " + dtNow.toLocaleDateString());
  console.log("Converted to to Local Tm Str: " + dtNow.toLocaleTimeString());
  console.log("Converted to to Local DT en-US: " + dtNow.toLocaleString("en-IN"));
}

function fnLoginStatus(){
  let objLoginTxt = document.getElementById("lblAppLoginTxt");
  let objSession = document.getElementById("hidSession");
  let objTraderStatus = document.getElementById("btnTraderStatus");

  if(objLoginTxt.innerText === "LOGOUT")
  {
    localStorage.setItem("AppMsgStatusS", false);
    localStorage.setItem("isTraderLogin", false);
    localStorage.removeItem("lsAliceBlueSession", "");
    localStorage.removeItem("UserDetS");

    objSession.value = "";

    objLoginTxt.innerText = "LOGIN";

    fnSetUserProfileDets();
    fnGenMessage("App is Logged Out!", `badge bg-success`, "spnGenMsg");
    fnGenMessage("TRADER - Disconnected", `badge bg-danger`, "btnTraderStatus");
    //fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
  }
  else
  {
    $('#mdlAppLogin').modal('show');
  }
}

function fnAppLogin(){
  let objLoginTxt = document.getElementById("lblAppLoginTxt");

  localStorage.setItem("AppMsgStatusS", true);
  objLoginTxt.innerText = "LOGOUT";
  $('#mdlAppLogin').modal('hide');
  fnGenMessage("App is Logged In!", `badge bg-success`, "spnGenMsg");
}