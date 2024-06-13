
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
        $('#mdlFinvasiaLogin').modal('show');
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
    localStorage.removeItem("lsFinvasiaSession");
    localStorage.removeItem("isFinvasiaLogin");
    localStorage.removeItem("isFinvasiaAutoTrader");
    // localStorage.removeItem("UserDetS");

    objSession.value = "";

    fnGetSetTraderLoginStatus();
    //fnSetUserProfileDets();
}

function fnGetSetTraderLoginStatus()
{
    let lsPrevSessionDate = localStorage.getItem("lsLoginDate");
    let lsTraderID = localStorage.getItem("lsFinvasiaID");
    let lsApiKey = localStorage.getItem("lsFinvasiaApiKey");
    let lsSessionID = localStorage.getItem("lsFinvasiaSession");
    // let objClientId = document.getElementById("txtClientId");
    // let objApiKey = document.getElementById("txtApiKey");
    let objSession = document.getElementById("hidSession");
    
    let objTraderStatus = document.getElementById("btnTraderStatus");

    const vDate = new Date();
    let vToday = vDate.getDate();

    // objClientId.value = lsTraderID;
    // objApiKey.value = lsApiKey;
    objSession.value = lsSessionID;

    if (lsPrevSessionDate != (vToday) || objClientId.value == "") {
        localStorage.removeItem("lsFinvasiaSession");
        objSession.value = "";
    }

    if (objSession.value == "") {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
        localStorage.setItem("isFinvasiaLogin", false);
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        localStorage.setItem("isFinvasiaLogin", true);
    }
}

function fnLoginFinvasia()
{
    let objClientId = document.getElementById("txtClientId");
    let objVendorCode = document.getElementById("txtVendorCode");
    let objImei = document.getElementById("txtImei");
    let objApiKey = document.getElementById("txtApiKey");
    let objPassword = document.getElementById("txtPassword");
    let objTotp = document.getElementById("txtTOTP");
    let objSession = document.getElementById("hidSession");
    
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "UserId" : objClientId.value,
        "Password" : objPassword.value,
        "TwoFA" : objTotp.value,
        "VendorCode" : objVendorCode.value,
        "ApiSecret" : objApiKey.value,
        "Imei" : objImei.value
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    if(objClientId.value === ""){
        fnGenMessage("Please Enter Login ID", `badge bg-warning`, "spnFinvasiaLogin");
    }
    else if(objVendorCode.value === ""){
        fnGenMessage("Please Enter Vendor Code", `badge bg-warning`, "spnFinvasiaLogin");
    }
    else if(objImei.value === ""){
        fnGenMessage("Please Enter IMEI", `badge bg-warning`, "spnFinvasiaLogin");
    }
    else if(objApiKey.value === ""){
        fnGenMessage("Please Enter API Key", `badge bg-warning`, "spnFinvasiaLogin");
    }
    else if(objPassword.value === ""){
        fnGenMessage("Please Enter Password", `badge bg-warning`, "spnFinvasiaLogin");
    }
    else if(objTotp.value === ""){
        fnGenMessage("Please Enter OTP / TOTP", `badge bg-warning`, "spnFinvasiaLogin");
    }    
    else
    {
        fetch("/finvasia/getSession", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            //console.log(objResult);
            if(objResult.status === "success")
            {
                console.log(objResult);
                // objSession.value = objResult.data.Session;
    
                // localStorage.setItem("lsAliceBlueID", objClientId.value);
                // localStorage.setItem("lsAliceBlueApiKey", objApiKey.value);
                // localStorage.setItem("lsAliceBlueSession", objSession.value);

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsLoginDate", vToday);
                localStorage.setItem("isTraderLogin", true);
                let objUserDets = localStorage.getItem("UserDetS");

                // if (objUserDets == null || objUserDets == "") {
                //     let vUserDet = { ClientId: objResult.data.accountId, FullName: objResult.data.accountName, Mobile: objResult.data.cellAddr, EmailId: objResult.data.emailAddr, Status: objResult.data.accountStatus, CashMargin: objResult.data.dataMargins.cashmarginavailable, PaperMargin: 500000 };
                //     let vFirstTime= JSON.stringify(vUserDet);
                //     localStorage.setItem("UserDetS", vFirstTime);
                // }
                // else {
                //     let vExistingData = JSON.parse(objUserDets);
            
                //     vExistingData.ClientId = objResult.data.accountId;
                //     vExistingData.FullName = objResult.data.accountName;
                //     vExistingData.Mobile = objResult.data.cellAddr;
                //     vExistingData.EmailId = objResult.data.emailAddr;
                //     vExistingData.Status = objResult.data.accountStatus;
                //     vExistingData.CashMargin = objResult.data.dataMargins.cashmarginavailable;
            
                //     let vUpdData = JSON.stringify(vExistingData);
                //     localStorage.setItem("UserDetS", vUpdData);
                // }

                // fnSetUserProfileDets();
                fnChangeBtnProps("btnTraderStatus", "badge bg-success", "TRADER - Connected");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                $('#mdlFinvasiaLogin').modal('hide');
            }
            else if(objResult.status === "danger")
            {
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnFinvasiaLogin");
            }
            else if(objResult.status === "warning")
            {
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnFinvasiaLogin");
            }
            else
            {
                fnClearPrevLoginSession();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnFinvasiaLogin");
            }
        })
        .catch(error => {
            fnClearPrevLoginSession();
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnFinvasiaLogin");
        });
    }
}
