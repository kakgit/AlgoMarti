
window.addEventListener("DOMContentLoaded", function(){
    fnTraderLoginStatus();
    fnAutoTraderStatus();
    fnLoadCnfStatus();

    fnGetSymbolList();

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

        fnSaveConfirmations(objMsg.cnf, objMsg.symbolName, vDirec);

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

function fnUploadFiles()
{
    const objFiles = document.getElementById("flsSelectFiles");
    const objFormData = new FormData();

    if(objFiles.files.length === 0)
    {
        fnGenMessage("Please Select a File to Upload!", `badge bg-danger`, "spnSettingsMsg");
    }
    else
    {
        for(let i=0; i<objFiles.files.length; i++)
        {
            objFormData.append("files", objFiles.files[i]);
        }
    
        //console.log(...objFormData);
    
        fetch("/uploadsAB", {
            method: 'POST',
            body: objFormData
        })
        .then(res => res.json())
        .then(result => {
            //console.log(result);
            fnGenMessage(result.status, `badge bg-${result.status}`, "spnSettingsMsg");
        });
    }
}

function fnTraderLoginStatus()
{
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
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        localStorage.setItem("isTraderLogin", true);
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
                //console.log(result);
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
    //console.log("After: " + localStorage.getItem("isTraderLogin"));
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
    const objDivMsgs = document.getElementById("divMessages");

    objDivMsgs.innerHTML = "";
}

function fnLoadCnfStatus()
{
    let lsCnfAtr = localStorage.getItem("lsCnfAtr");

    let vCnfJson = {
        "cnf1": {
          "BANKNIFTY": -1,
          "NIFTY": -1,
          "FINNIFTY": -1
        },
        "cnf2": {
          "BANKNIFTY": -1,
          "NIFTY": -1,
          "FINNIFTY": -1
        }
      }

    if(lsCnfAtr)
    {
        //alert("exists");
        //console.log(lsCnfAtr);
    }
    else
    {
    localStorage.setItem("lsCnfAtr", JSON.stringify(vCnfJson));
    lsCnfAtr = localStorage.getItem("lsCnfAtr");
    }

    lsCnfAtr = JSON.parse(lsCnfAtr);
    //console.log(lsCnfAtr);
      for(let frm in lsCnfAtr){
        //console.log(frm); // It gives you property name
        //console.log(vCnfJson[frm]); // And this gives you its value
        
        for(let a in lsCnfAtr[frm]){
            //console.log(a + " - " + lsCnfAtr[frm][a]);
            document[frm][a].value = lsCnfAtr[frm][a];
        }
    }
}

function fnTestMe()
{
    const d = new Date("2023-12-13");
    let objTestTxt = document.getElementById("txtTest");

    objTestTxt.value = d.getTime();
}

function fnSaveConfirmations(pFrm, pSymName, pStatus)
{
    let lsCnfAtr = localStorage.getItem("lsCnfAtr");

    lsCnfAtr = JSON.parse(lsCnfAtr);

    lsCnfAtr[pFrm][pSymName] = pStatus;

    var objSavelsCnfAtr = JSON.stringify(lsCnfAtr);
        localStorage.setItem("lsCnfAtr", objSavelsCnfAtr);

    //console.log(lsCnfAtr[pFrm][pSymName] = pStatus);
    //console.log(localStorage.getItem("lsCnfAtr"));

    let vAction = JSON.stringify({
        "jsonName" : "tvConfs",
        "JsonStr" : objSavelsCnfAtr,
        "JsonFileName" : "tvConfirmations.json"
    });

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/json/uorcJSON", requestOptions)
    .then(response => response.json())
    .then(result => {        
        if(result.status === "danger")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
        }
        else if(result.status === "warning")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
        }
        else
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("ErrorC: Unable to Update JSON Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnShowSettingsMdl()
{
    $('#mdlSettingsAB').modal('show');

}

function fnAddEditSymbolDetails()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objGDispMessage = document.getElementById("spnSettingsMsg");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objExchange = document.getElementById("ddlExchange");
    var objContracts = document.getElementById("ddlContracts");
    var objEditCB = document.getElementById("swtEditSymbol");

    var objSybLst = localStorage.getItem("SymbolListS");

    if (objSymName.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Symbol Name!";
    }
    else if (objTradeName.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Index Name!";
    }
    else if (objToken.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Token No!";
    }
    else if (objLotSize.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Lot Size!";
    }
    else if (objStrikeInterval.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Strike Interval!";
    }
    else if ((objSybLst == null) || (objSybLst == "")) {
        const vSymDet = { Symbol: [{ SymbolName: objSymName.value, TradeName: objTradeName.value, Token: objToken.value, Exchange: objExchange.options[objExchange.selectedIndex].text, Contract: objContracts.value, LotSize: objLotSize.value, StrikeInterval: objStrikeInterval.value, StopLoss: objStopLoss.value, TakeProfit: objTakeProfit.value, ExpiryDates: [] }] };
        var vFirstItem = JSON.stringify(vSymDet);
        localStorage.setItem("SymbolListS", vFirstItem);

        //Save to DB code Here
        fnSaveSymbolAttrToDB(vFirstItem);

        //console.log(localStorage.getItem("SymbolListS"));
        objGDispMessage.className = "badge bg-success";
        objGDispMessage.innerText = objSymName.value + " Symbol Details Added!";
        objSymName.value = "";
        objTradeName.value = "";
        objToken.value = "";
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";

        fnGetSymbolList();
    }
    else
    {
        var vExistingData = JSON.parse(objSybLst);

        if (objEditCB.checked == true) {
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol[i].SymbolName = objSymName.value;
                    vExistingData.Symbol[i].TradeName = objTradeName.value;
                    vExistingData.Symbol[i].Token = objToken.value;
                    vExistingData.Symbol[i].Exchange = objExchange.options[objExchange.selectedIndex].text;
                    vExistingData.Symbol[i].Contract = objContracts.value;
                    vExistingData.Symbol[i].LotSize = objLotSize.value;
                    vExistingData.Symbol[i].StrikeInterval = objStrikeInterval.value;
                    vExistingData.Symbol[i].StopLoss = objStopLoss.value;
                    vExistingData.Symbol[i].TakeProfit = objTakeProfit.value;
                }
            }
            var vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);

            //console.log(localStorage.getItem("SymbolListS"));
            objEditCB.checked = false;
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelSym.value + " Symbol Details Edited!";
        }
        else {
            vExistingData.Symbol.push({ SymbolName: objSymName.value, TradeName: objTradeName.value, Token: objToken.value, Exchange: objExchange.options[objExchange.selectedIndex].text, Contract: objContracts.value, LotSize: objLotSize.value, StrikeInterval: objStrikeInterval.value, StopLoss: objStopLoss.value, TakeProfit: objTakeProfit.value, ExpiryDates: [] });
            var vAddlItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vAddlItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vAddlItems);

            //console.log(localStorage.getItem("SymbolListS"));
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSymName.value + " Symbol Details Added!";
        }
        objSymName.value = "";
        objTradeName.value = "";
        objToken.value = "";
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";

        fnGetSymbolList();
    }
}

function fnAddEditExpiryDetails()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value == "") {
        objGDispMessage.className = "badge bg-warning";
        objGDispMessage.innerText = "Please Select Symbol to Add Expiry Date!";
    }
    else if (objExpDate.value == "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Input Expiry Date!";
    }
    else {
        var vExistingData = JSON.parse(objSybLst);
        if (objEditCB.checked == true) {
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    for (var j = 0; j < vExistingData.Symbol[i].ExpiryDates.length; j++) {
                        if (vExistingData.Symbol[i].ExpiryDates[j] == objSelExp.value) {
                            vExistingData.Symbol[i].ExpiryDates[j] = objExpDate.value;
                        }
                    }
                }
            }
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objExpDate.value + " Expiry Date Updated!";
            objEditCB.checked = false;
        }
        else {
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol[i].ExpiryDates.push(objExpDate.value);
                }
            }
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objExpDate.value + " Expiry Date Added!";
        }
        var vAddlItems = JSON.stringify(vExistingData);
        localStorage.setItem("SymbolListS", vAddlItems);

        //Save to DB code Here
        fnSaveSymbolAttrToDB(vAddlItems);
        //console.log(localStorage.getItem("SymbolListS"));

        objExpDate.value = "";
        fnGetExpiryList();
    }
}

function fnGetSymbolList() {
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelManSym = document.getElementById("ddlManualSymbol");

    var objSybLst = localStorage.getItem("SymbolListS");

    //console.log(objSybLst);
    objSybLst = JSON.parse(objSybLst);

    objSelSym.innerHTML = "";

    objSelSym.innerHTML = "<option value=''>Select Symbol</option>";
    objSelManSym.innerHTML = "<option value=''>Select Symbol</option>"
    if (objSybLst != null) {
        for (var i = 0; i < objSybLst.Symbol.length; i++) {
            var vVal = objSybLst.Symbol[i].SymbolName;
            var vDispName = objSybLst.Symbol[i].TradeName;
            
            objSelSym.innerHTML += "<option value=\"" + vVal + "\">" + vDispName + "</option>";
            objSelManSym.innerHTML += "<option value=\"" + vVal + "\">" + vDispName + "</option>";
        }
        fnGetExpiryList();
    }
}

function fnGetExpiryList()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objHidLotSize = document.getElementById("txtHidLotSize");
    var objEditCB = document.getElementById("swtEditSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objSelManExp = document.getElementById("ddlManualExpiry");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objExpEditCB = document.getElementById("swtEditExpiry");
    var objExpiryDate = document.getElementById("txtExpiryDate");

    objSymName.value = "";
    objTradeName.value = "";
    objToken.value = "";
    objHidLotSize.value = "";
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";
    objEditCB.checked = false;
    objExpiryDate.value = "";
    objExpEditCB.checked = false;

    objSybLst = JSON.parse(objSybLst);

    objSelExp.innerHTML = "";
    objSelExp.innerHTML = "<option value=''>Select Expiry</option>";
    objSelManExp.innerHTML = "<option value=''>Select Expiry</option>";

    if (objSybLst != null) {
        for (var i = 0; i < objSybLst.Symbol.length; i++) {
            if (objSybLst.Symbol[i].SymbolName == objSelSym.value) {
                objHidLotSize.value = objSybLst.Symbol[i].LotSize;
                for (var j = 0; j < objSybLst.Symbol[i].ExpiryDates.length; j++) {
                    var vOption = objSybLst.Symbol[i].ExpiryDates[j];
                    objSelExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                    objSelManExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                }
            }
        }
    }
}

function fnEditSymbol()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objExchange = document.getElementById("ddlExchange");
    var objContracts = document.getElementById("ddlContracts");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditSymbol");

    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value === "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Select Symbol to Edit!";

        objEditCB.checked = false;
    }
    else {
        objSybLst = JSON.parse(objSybLst);
        if (objSybLst != null && objEditCB.checked == true) {
            for (var i = 0; i < objSybLst.Symbol.length; i++) {
                if (objSybLst.Symbol[i].SymbolName == objSelSym.value) {
                    objSymName.value = objSybLst.Symbol[i].SymbolName;
                    objTradeName.value = objSybLst.Symbol[i].TradeName;
                    objToken.value = objSybLst.Symbol[i].Token;
                    objExchange.options[objExchange.selectedIndex].text = objSybLst.Symbol[i].Exchange;
                    objContracts.value = objSybLst.Symbol[i].Contract;
                    objLotSize.value = objSybLst.Symbol[i].LotSize;
                    objStrikeInterval.value = objSybLst.Symbol[i].StrikeInterval;
                    objStopLoss.value = objSybLst.Symbol[i].StopLoss;
                    objTakeProfit.value = objSybLst.Symbol[i].TakeProfit;
                }
                //alert(objSybLst.Symbol[i].SymbolName);
            }
            objGDispMessage.className = "badge bg-warning";
            objGDispMessage.innerText = "Editing Symbol Details!";
        }
        else {
            objSymName.value = "";
            objTradeName.value = "";
            objToken.value = "";
            objLotSize.value = "";
            objStrikeInterval.value = "";
            objStopLoss.value = "";
            objTakeProfit.value = "";
        }
    }
}

function fnEditExpiry()
{
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelExp.value == "") {
        objGDispMessage.className = "badge bg-warning";
        objGDispMessage.innerText = "Please Select Expiry Date to Edit!";
        objEditCB.checked = false;
    }
    else {
        if (objEditCB.checked == true) {
            objExpDate.value = objSelExp.value;
            objGDispMessage.className = "badge bg-warning";
            objGDispMessage.innerText = "Editing Expiry Date!";
        }
        else {
            objExpDate.value = "";
        }
    }
}

function fnDeleteSymbol()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditSymbol");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value === "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Select Symbol to Delete!";
        //alert("Please Select Symbol to Delete!");
        objEditCB.checked = false;
    }
    else {
        if (confirm("Do You Want To Delete " + objSelSym.value + " Data?")) {
            var vExistingData = JSON.parse(objSybLst);
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol.splice(i, 1);
                }
            }
            var vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);
            //console.log(localStorage.getItem("SymbolListS"));

            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelSym.value + " Details Deleted!";
            objSymName.value = "";
            objTradeName.value = "";
            objToken.value = "";
            objLotSize.value = "";
            objStrikeInterval.value = "";
            objStopLoss.value = "";
            objTakeProfit.value = "";
            objEditCB.checked = false;
            fnGetSymbolList();
        }
    }
}

function fnDeleteExpiry()
{
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelExp.value == "") {
        objGDispMessage.className = "badge bg-warning";
        objGDispMessage.innerText = "Please Select Expiry Date to Delete!";
        objEditCB.checked = false;
    }
    else {
        if (confirm("Do You Want To Delete " + objSelExp.value + " ?")) {
            var vExistingData = JSON.parse(objSybLst);
            for (var i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    for (var j = 0; j < vExistingData.Symbol[i].ExpiryDates.length; j++) {
                        if (vExistingData.Symbol[i].ExpiryDates[j] == objSelExp.value) {
                            vExistingData.Symbol[i].ExpiryDates.splice(j, 1);
                        }
                    }
                }
            }
            var vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);
            //console.log(localStorage.getItem("SymbolListS"));
            
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelExp.value + " Expiry Date Deleted!";
            objExpDate.value = "";
            objEditCB.checked = false;
            fnGetExpiryList();
        }
    }
}

function fnChangeContracts(pThis) {
    var objSelContract = document.getElementById("ddlContracts");

    objSelContract.value = pThis.value;
}

function fnResetAllDetails()
{
    var objExpEditCB = document.getElementById("swtEditExpiry");
    var objExpiryDate = document.getElementById("txtExpiryDate");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objEditCB = document.getElementById("swtEditSymbol");

    objSymName.value = "";
    objTradeName.value = "";
    objToken.value = "";
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";
    objExpiryDate.value = "";
    objEditCB.checked = false;
    objExpEditCB.checked = false;
}

function fnDeleteLocalStorageSymbol()
{
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    const vSymDet = { Symbol: [] };
    var vFirstItem = JSON.stringify(vSymDet);

    //Save to DB code Here
    fnSaveSymbolAttrToDB(vFirstItem);

    localStorage.setItem("SymbolListS", vFirstItem);

    var objSymName = document.getElementById("txtSymbolName");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objHidLotSize = document.getElementById("txtHidLotSize");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");

    objSymName.value = "";
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objHidLotSize.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";

    fnGetSymbolList();

    objGDispMessage.className = "badge bg-success";
    objGDispMessage.innerText = "All Symbol Date Removed!";
    //console.log(localStorage.getItem("SymbolListS"));
    console.log("All Symbol Date Removed & Set to NULL");    
}

function fnSaveSymbolAttrToDB(pSymbolDetails)
{
    let vAction = JSON.stringify({
        "jsonName" : "abSymbs",
        "JsonStr" : pSymbolDetails,
        "JsonFileName" : "abSymbols.json"
    });

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
    
    fetch("/json/uorcJSON", requestOptions)
    .then(response => response.json())
    .then(result => {        
        if(result.status === "danger")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnSettingsMsg");
        }
        else if(result.status === "warning")
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnSettingsMsg");
        }
        else
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnSettingsMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("ErrorC: Unable to Update JSON Details.", `badge bg-danger`, "spnSettingsMsg");
    });
}

//Trading Code Starts from Here

function fnGetSelSymbolData(pSymbolVal)
{
    let objSelExp = document.getElementById("ddlManualExpiry");
    let objSybLst = localStorage.getItem("SymbolListS");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objToken = document.getElementById("hidToken");
    let objManualBuyPrice = document.getElementById("txtManualBuyPrice");
    let objLotSize = document.getElementById("txtManualBuyQty");
    let objNoOfLots = document.getElementById("txtManualLots");
    let objStopLoss = document.getElementById("txtManualStopLoss");
    let objTakeProfit = document.getElementById("txtManualTakeProfit");
    let objExchange = document.getElementById("hidExchange");
    let objContract = document.getElementById("hidContract");
    let objManualStrike = document.getElementById("txtManualStrike");
    let objActualStrike = document.getElementById("txtActualStrike");
    let objTradeToken = document.getElementById("hidTradeToken");
    let objDateToTime = document.getElementById("txtDateToTime");

    objSybLst = JSON.parse(objSybLst);

    objSelExp.innerHTML = "";
    objManualStrike.value = "";
    objActualStrike.value = "";
    objManualBuyPrice.value = "";
    objDateToTime.value = "";
    objTradeToken.value = "";
    //console.log(objSybLst);

    if (objSybLst != null)
    {
        for (var i = 0; i < objSybLst.Symbol.length; i++)
        {
            if (objSybLst.Symbol[i].SymbolName == pSymbolVal)
            {
                objToken.value = objSybLst.Symbol[i].Token;
                objLotSize.value = objSybLst.Symbol[i].LotSize;
                objNoOfLots.value = 1;
                objStrikeInterval.value = objSybLst.Symbol[i].StrikeInterval;
                objStopLoss.value = objSybLst.Symbol[i].StopLoss;
                objTakeProfit.value = objSybLst.Symbol[i].TakeProfit;
                objExchange.value = objSybLst.Symbol[i].Exchange;
                objContract.value = objSybLst.Symbol[i].Contract;

                for (var j = 0; j < objSybLst.Symbol[i].ExpiryDates.length; j++) {
                    var vOption = objSybLst.Symbol[i].ExpiryDates[j];
                    objSelExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                }
            }
        }
    }
    if(pSymbolVal === "")
    {
        objToken.value = "";
        objLotSize.value = "";
        objNoOfLots.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";
        objExchange.value = "";
        objContract.value = "";
        objSelExp.innerHTML = "<option value=\"\">Select Expiry</option>";
    }
}

function fnGetLiveRate()
{
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");
    let objSymbol = document.getElementById("ddlManualSymbol");
    let objExchange = document.getElementById("hidExchange");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objManualStrikePrice = document.getElementById("txtManualStrike");
    let objActualStrikePrice = document.getElementById("txtActualStrike");
    let objSelToken = document.getElementById("hidToken");

    if(objSession.value === "")
    {
        fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objSymbol.value === "")
    {
        fnGenMessage("Please Select Symbol to get Strike Price!", `badge bg-danger`, "spnGenMsg");
    }
    else
    {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: JSON.stringify({ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value}),
        redirect: 'follow'
        };

        fetch("/alice-blue/getStrikePrice", objRequestOptions)
        .then(objResponse => objResponse.json())
        .then(objResult => {
            if(objResult.status === "success")
            {
                //console.log(objResult);
                objManualStrikePrice.value = objResult.data.RoundedStrike;
                objActualStrikePrice.value = objResult.data.ActualStrike;
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger")
            {
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning")
            {
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else
            {
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnGenMsg");
        });

        //console.log(vAction);
    }
}

async function fnInitiateManualTrade(pBYorSL, pCEorPE)
{
    let objManualStrike = document.getElementById("txtManualStrike");
    let objClientId = document.getElementById("txtClientId");
    let objSession = document.getElementById("hidSession");
    let objSymbol = document.getElementById("ddlManualSymbol");
    let objExpiry = document.getElementById("ddlManualExpiry");
    let objExchange = document.getElementById("hidExchange");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objManualStrikePrice = document.getElementById("txtManualStrike");
    let objActualStrikePrice = document.getElementById("txtActualStrike");
    let objBuyPrice = document.getElementById("txtManualBuyPrice");
    let objSelToken = document.getElementById("hidToken");
    let objManualQty = document.getElementById("txtManualBuyQty");
    let objManualLots = document.getElementById("txtManualLots");
    let objDateToTime = document.getElementById("txtDateToTime");
    let objContract = document.getElementById("hidContract");
    let objSource = document.getElementById("ddlManualSource");
    let objTradeToken = document.getElementById("hidTradeToken");

    if(objSession.value === "")
    {
        fnGenMessage("Please Login to Trader!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objSymbol.value === "")
    {
        fnGenMessage("Please Select Symbol to Trade!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objExpiry.value === "")
    {
        fnGenMessage("Please Select Expiry to Trade!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objManualQty.value === "")
    {
        fnGenMessage("Please Input Valid Quantity!", `badge bg-danger`, "spnGenMsg");
    }
    else if(objManualLots.value === "")
    {
        fnGenMessage("Please Input Valid No Of Lots!", `badge bg-danger`, "spnGenMsg");
    }
    else
    {
        let objDate = new Date(objExpiry.value);
        objDateToTime.value = objDate.getTime();
    
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ ActualStrikeRate: objActualStrikePrice.value, CurrStrikeRate: objManualStrike.value, ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value, BorS: pBYorSL, CorP: pCEorPE, Contract: objContract.value, Source: objSource.value, Symbol: objSymbol.value, DateToTime: objDateToTime.value }),
            redirect: 'follow'
            };

            fetch("/alice-blue/getExecutedTradeRate", objRequestOptions)
            .then(objResponse => objResponse.json())
            .then(objResult => {
                if(objResult.status === "success")
                {
                    //console.log(objResult);
                    objManualStrikePrice.value = objResult.data.RoundedStrike;
                    objActualStrikePrice.value = objResult.data.ActualStrike;
                    objTradeToken.value = objResult.data.TradeToken;
                    objBuyPrice.value = objResult.data.LTP;
                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else if(objResult.status === "danger")
                {
                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else if(objResult.status === "warning")
                {
                    fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                }
                else
                {
                    fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnGenMsg");
                }
            })
            .catch(error => {
                console.log('error: ', error);
                fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnGenMsg");
            });
        
        //console.log(pCEorPE);
    }
}
