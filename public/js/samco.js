
window.addEventListener("DOMContentLoaded", function(){
    
    const objTxtMsg = document.getElementById("txtMessageToAll");
    
    socket.on("ServerEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");
        const objMsg = JSON.parse(pMsg);

        objDivMsgs.innerHTML += "<p>" + objMsg.symbolName + " - " + objMsg.indType + " - "  + objMsg.direction + " - " + objMsg.strike + "</p>";
        objDivMsgs.scrollTop = objDivMsgs.scrollHeight;
    });

    socket.on("ClientEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");

        objDivMsgs.innerHTML += "<p>" + pMsg + "</p>";
        objDivMsgs.scrollTop = objDivMsgs.scrollHeight;
    });

    objTxtMsg.addEventListener("keypress", function(event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
          // Cancel the default action, if needed
          event.preventDefault();
          // Trigger the button element with a click
          document.getElementById("btnSendMsg").click();
        }
      });
});


function fnSendMessageToAll()
{
    const objMsg = document.getElementById("txtMessageToAll");

    socket.emit("UserMessage", objMsg.value);

    objMsg.value = "";
}

function fnClearMessage()
{
    const objDivMsgs = document.getElementById("divMessages");

    objDivMsgs.innerHTML = "";
}

function fnShowTraderLoginMdl(objThis)
{
    let isAppLoginStatus = localStorage.getItem("AppMsgStatusS");

    //console.log(isAppLoginStatus);
    if(isAppLoginStatus === "false")
    {
        $('#mdlAppLogin').modal('show');
    }
    else if(objThis.className === "badge bg-danger")
    {
        $('#mdlSamcoLogin').modal('show');
    }
    else
    {
        fnClearPrevLoginSession();
        //fnGetSetAutoTraderStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnClearPrevLoginSession()
{
    let objSession = document.getElementById("hidSession");

    localStorage.removeItem("lsLoginDate");
    localStorage.removeItem("lsSamcoSession");
    localStorage.removeItem("isSamcoLogin");
    localStorage.removeItem("isSamcoAutoTrader");
    // localStorage.removeItem("UserDetS");

    objSession.value = "";

    fnGetSetTraderLoginStatus();
    //fnSetUserProfileDets();
}

function fnGetSetTraderLoginStatus()
{
    let lsPrevSessionDate = localStorage.getItem("lsLoginDate");
    let lsSamcoID = localStorage.getItem("lsSamcoID");
    let lsApiKey = localStorage.getItem("lsSamcoApiKey");
    let lsSessionID = localStorage.getItem("lsSamcoSession");
    let objClientId = document.getElementById("txtClientId");
    let objApiKey = document.getElementById("txtApiKey");
    let objSession = document.getElementById("hidSession");
    
    let objTraderStatus = document.getElementById("btnTraderStatus");

    const vDate = new Date();
    let vToday = vDate.getDate();

    objClientId.value = lsSamcoID;
    objApiKey.value = lsApiKey;
    objSession.value = lsSessionID;

    if (lsPrevSessionDate != (vToday) || objClientId.value == "") {
        localStorage.removeItem("lsSamcoSession");
        objSession.value = "";
    }

    if (objSession.value == "") {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
        localStorage.setItem("isSamcoLogin", false);
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        localStorage.setItem("isSamcoLogin", true);
    }
}
