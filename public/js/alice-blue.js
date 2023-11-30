
window.addEventListener("DOMContentLoaded", function(){
    fnTraderLoginStatus();
    fnAutoTraderStatus();
    fnLoadCnfStatus();

    const objTxtMsg = document.getElementById("txtMessageToAll");

    socket.on("ServerEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");
        const objMsg = JSON.parse(pMsg);
        let vDirec = "";

        if(objMsg.direction === "UP")
            vDirec = true;
        else if(objMsg.direction === "DN")
            vDirec = false;
        else
            vDirec = objMsg.direction;

        if((objMsg.cnf === "cnf1") || (objMsg.cnf === "cnf2"))
        {
            document[objMsg.cnf][objMsg.symbolName].value = vDirec;
        }
        else
        {
            objDivMsgs.innerHTML += "<p>" + objMsg.symbolName + " - " + objMsg.indType + " - "  + objMsg.direction + " - " + objMsg.strike + "</p>";
            objDivMsgs.scrollTop = objDivMsgs.scrollHeight;
        }
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

function fnTraderLoginStatus()
{
    // console.log("At Login Status: ")
    let lsPrevSessionDate = localStorage.getItem("lsLoginDate");
    let lsAliceBlueID = localStorage.getItem("lsAliceBlueID");
    let lsApiKey = localStorage.getItem("lsAliceBlueApiKey");
    let lsSessionID = localStorage.getItem("lsAliceBlueSession");
    let objClientId = document.getElementById("txtClientId");
    let objApiKey = document.getElementById("txtApiKey");
    let objSession = document.getElementById("hidSession");
    
    let objTraderStatus = document.getElementById("btnTraderStatus");

    const vDate = new Date();
    let vToday = vDate.getDate();

    // console.log("PrevSesDate: " + lsPrevSessionDate);

    objClientId.value = lsAliceBlueID;
    objApiKey.value = lsApiKey;
    objSession.value = lsSessionID;

    if (lsPrevSessionDate != (vToday) || objClientId.value == "") {
        localStorage.removeItem("lsAliceBlueSession", "");
        objSession.value = "";
    }

    if (objSession.value == "") {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
        localStorage.setItem("isTraderLogin", false);
        // objTraderStatus.className = "badge bg-danger";
        // objTraderStatus.innerText = "TRADER - Disconnected";
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        localStorage.setItem("isTraderLogin", true);
        // objTraderStatus.className = "badge bg-success";
        // objTraderStatus.innerText = "TRADER - Connected";
    }
}

function fnAutoTraderStatus()
{
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");

    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsTraderLogin === "true" && isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
    }
}

function fnToggleAutoTrader()
{
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === null || isLsAutoTrader === "false")
    {
        if(isLsTraderLogin === "true")
        {
            fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
            fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
            localStorage.setItem("isAutoTrader", true);
        }
        else
        {
            fnGenMessage("Login to Trading Account to Activate Auto Trader", `badge bg-warning`, "spnGenMsg");
            localStorage.setItem("isAutoTrader", false);
        }
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        fnGenMessage("Auto Trading Mode is OFF!", `badge bg-danger`, "spnGenMsg");
        localStorage.setItem("isAutoTrader", false);
    }

    // if(isLsTraderLogin)
    // {
    //     fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    //     fnGenMessage("Auto Trading Mode is ON!", `badge bg-success`, "spnGenMsg");

    // }
    // else
    // {
    //     fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
    // }
}

function fnShowTraderLoginMdl(objThis)
{
    if(objThis.className === "badge bg-danger")
    {
        $('#mdlAliceLogin').modal('show');
    }
    else
    {
        fnClearPrevLoginSession();
        fnAutoTraderStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnLoginAliceBlue()
{
    let objClientId = document.getElementById("txtClientId");
    let objApiKey = document.getElementById("txtApiKey");
    let objEncKey = document.getElementById("hidEncKey");
    let objSession = document.getElementById("hidSession");
    
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ClientID" : objClientId.value,
        "ApiKey" : objApiKey.value
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    if(objClientId.value === "")
    {
        fnGenMessage("Please Enter Client ID", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objApiKey.value === "")
    {
        fnGenMessage("Please Enter API KEY", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else
    {
        fetch("/alice-blue/getSession", requestOptions)
        .then(response => response.json())
        .then(result => {
            //console.log(result);
            if(result.status === "success")
            {
                console.log(result);
                objEncKey.value = result.data.EncKey;
                objSession.value = result.data.Session;
    
                localStorage.setItem("lsAliceBlueID", objClientId.value);
                localStorage.setItem("lsAliceBlueApiKey", objApiKey.value);
                localStorage.setItem("lsAliceBlueSession", objSession.value);

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsLoginDate", vToday);
                localStorage.setItem("isTraderLogin", true);

                fnChangeBtnProps("btnTraderStatus", "badge bg-success", "TRADER - Connected");
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
                $('#mdlAliceLogin').modal('hide');
            }
            else if(result.status === "danger")
            {
                fnClearPrevLoginSession();
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnAliceBlueLogin");
            }
            else if(result.status === "warning")
            {
                fnClearPrevLoginSession();
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnAliceBlueLogin");
            }
            else
            {
                fnClearPrevLoginSession();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnAliceBlueLogin");
            }
        })
        .catch(error => {
            fnClearPrevLoginSession();
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnAliceBlueLogin");
        });
    }
}

function fnClearLocalStorageTemp()
{
    console.log("Before: " + localStorage.getItem("isTraderLogin"));
    localStorage.removeItem("lsAliceBlueID");
    localStorage.removeItem("lsAliceBlueApiKey");
    localStorage.removeItem("lsLoginDate");
    localStorage.removeItem("isTraderLogin");
    localStorage.removeItem("isAutoTrader");
    //localStorage.removeItem("lsAliceBlueSession");
    console.log("After: " + localStorage.getItem("isTraderLogin"));
}

function fnClearPrevLoginSession()
{
    let objSession = document.getElementById("hidSession");

    localStorage.removeItem("lsLoginDate");
    localStorage.removeItem("lsAliceBlueSession");
    localStorage.removeItem("isTraderLogin");
    localStorage.removeItem("isAutoTrader");

    objSession.value = "";

    fnTraderLoginStatus();
}

function fnChangeBtnProps(pId, pClassName, pDispText)
{
    let objBtn = document.getElementById(pId);

    objBtn.innerText = pDispText;
    objBtn.className = pClassName;
}

function fnSendMessageToAll()
{
    const objMsg = document.getElementById("txtMessageToAll");

    socket.emit("UserMessage", objMsg.value);

    objMsg.value = "";
}

function fnClearMessage()
{
    const objDivMsgs = document.getElementById("divMessages-3");

    objDivMsgs.innerHTML = "";
}

function fnLoadCnfStatus()
{
    let lsCnfAtr = localStorage.getItem("lsCnfAtr");

    let vCnfJson = {
        "cnf1": {
          "BANKNIFTY": "-1",
          "NIFTY": "-1",
          "FINNIFTY": "-1"
        },
        "cnf2": {
          "BANKNIFTY": "-1",
          "NIFTY": "-1",
          "FINNIFTY": "-1"
        }
      }

    if(lsCnfAtr)
    {
        //alert("exists");
        console.log(lsCnfAtr);
    }
    else
    {
    localStorage.setItem("lsCnfAtr", JSON.stringify(vCnfJson));
    lsCnfAtr = localStorage.getItem("lsCnfAtr");
    }

      for(let frm in JSON.parse(lsCnfAtr)){
        console.log(frm); // It gives you property name
        //console.log(vCnfJson[frm]); // And this gives you its value
        
        for(let a in vCnfJson[frm]){
            console.log(a + " - " + vCnfJson[frm][a]);
            document[frm][a].value = vCnfJson[frm][a];
        }
    }
}

function fnTestToggle(pFrm, pName)
{
    document[pFrm][pName].value = true;
}