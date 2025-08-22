
function fnSetRecentDates(){
    let objRecentDates = document.getElementById("ddlRecentDates");

    let vDate = new Date();
    let vToday =  vDate.getFullYear() + "-" + (vDate.getMonth() + 1).toString().padStart(2,0) + "-" + (vDate.getDate()).toString().padStart(2,0);
    vDate.setDate(vDate.getDate() - 1);
    let vTodayM1 =  vDate.getFullYear() + "-" + (vDate.getMonth() + 1).toString().padStart(2,0) + "-" + (vDate.getDate()).toString().padStart(2,0);
    vDate.setDate(vDate.getDate() - 1);
    let vTodayM2 =  vDate.getFullYear() + "-" + (vDate.getMonth() + 1).toString().padStart(2,0) + "-" + (vDate.getDate()).toString().padStart(2,0);
    vDate.setDate(vDate.getDate() - 1);
    let vTodayM3 =  vDate.getFullYear() + "-" + (vDate.getMonth() + 1).toString().padStart(2,0) + "-" + (vDate.getDate()).toString().padStart(2,0);

    objRecentDates.innerHTML = "<option value='"+ vToday +"'>"+ vToday +"</option>";
    objRecentDates.innerHTML += "<option value='"+ vTodayM1 +"'>"+ vTodayM1 +"</option>";
    objRecentDates.innerHTML += "<option value='"+ vTodayM2 +"'>"+ vTodayM2 +"</option>";
    objRecentDates.innerHTML += "<option value='"+ vTodayM3 +"'>"+ vTodayM3 +"</option>";

    fnUpdDldLink(objRecentDates.value);
}

function fnUpdDldLink(pThisVal){
    let objNseCm = document.getElementById("lnkNseCm");
    let objNseFo = document.getElementById("lnkNseFo");
    let objBseCm = document.getElementById("lnkBseFo");

    objNseCm.href = "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/"+ pThisVal +"/transformed/nse_cm.csv";
    objNseFo.href = "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/"+ pThisVal +"/transformed/nse_fo.csv";
    objBseCm.href = "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/"+ pThisVal +"/transformed/bse_fo.csv";
}

function fnLoginKotakNeo(){
    let objConsumerKey = document.getElementById("txtConsumerKey");
    let objConsumerSecret = document.getElementById("txtConsumerSecret");
    let objUserNameAPI = document.getElementById("txtUserNameAPI");
    let objPasswordAPI = document.getElementById("txtPasswordAPI");
    let objMobileNo = document.getElementById("txtMobileNo");
    let objPassword = document.getElementById("txtPassword");
    let objMpin = document.getElementById("txtMpin");

    let objKotakSession = document.getElementById("txtKotakSession");
    let objViewToken = document.getElementById("txtViewToken");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objSubUserId = document.getElementById("txtSubUserId");
    let objSid = document.getElementById("txtSid");
    let objHsServerId = document.getElementById("txtHsServerId");

    let objCurrMargin = document.getElementById("txtCurrMargin");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "ConsumerKey" : objConsumerKey.value,
        "ConsumerSecret" : objConsumerSecret.value,
        "UserNameAPI" : objUserNameAPI.value,
        "PasswordAPI" : objPasswordAPI.value,
        "MobileNo" : objMobileNo.value,
        "Password" : objPassword.value,
        "Mpin" : objMpin.value
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    if(objConsumerKey.value === ""){
        fnGenMessage("Please Enter Consumer Key", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objConsumerSecret.value === ""){
        fnGenMessage("Please Enter Consumer Secret", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objMobileNo.value === ""){
        fnGenMessage("Please Enter Mobile No", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objPassword.value === ""){
        fnGenMessage("Please Enter Password", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else if(objMpin.value === ""){
        fnGenMessage("Please Enter Mobile Pin", `badge bg-warning`, "spnAliceBlueLogin");
    }
    else{
        fetch("/kotakNeo/getLoginDetails", requestOptions)
        .then(response => response.json())
        .then(objResult => {
            if(objResult.status === "success"){

                objKotakSession.value = objResult.data.Session;
                objViewToken.value = objResult.data.ViewToken;
                objAccessToken.value = objResult.data.AccessToken;
                objSubUserId.value = objResult.data.SubUserId;
                objSid.value = objResult.data.Sid;
                objHsServerId.value = objResult.data.HsServerId;

                objCurrMargin.value = objResult.data.Limits.Net;

                localStorage.setItem("lsKotakMobileNo", objMobileNo.value);
                localStorage.setItem("lsKotakPassword", objPassword.value);
                localStorage.setItem("lsKotakMpin", objMpin.value);
                localStorage.setItem("lsKotakConsumerKey", objConsumerKey.value);
                localStorage.setItem("lsKotakConsumerSecret", objConsumerSecret.value);
                localStorage.setItem("lsKotakUserNameAPI", objUserNameAPI.value);
                localStorage.setItem("lsKotakPasswordAPI", objPasswordAPI.value);

                localStorage.setItem("lsKotakNeoSession", objKotakSession.value);
                localStorage.setItem("lsKotakViewToken", objViewToken.value);
                localStorage.setItem("lsKotakAccessToken", objAccessToken.value);
                localStorage.setItem("lsKotakSub", objSubUserId.value);
                localStorage.setItem("lsKotakSid", objSid.value);
                localStorage.setItem("lsKotakHsServerId", objHsServerId.value);
                localStorage.setItem("lsNetLimit", objCurrMargin.value);

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsLoginDate", vToday);

                $('#mdlKotakLogin').modal('hide');
                //fnChangeBtnProps("btnTraderStatus", "badge bg-success", "TRADER - Connected");
                fnGetSetTraderLoginStatus();
                //fnSetPerDayTP();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "danger"){
                //console.log(objResult.data);
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else if(objResult.status === "warning"){
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnClearPrevLoginSession();
                fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnGenMsg");
            }
        })
        .catch(error => {
            fnClearPrevLoginSession();
            //console.log('error: ', error);
            fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnGenMsg");
        });
    }
}

function fnSetPerDayTP(){
    let objCurrMargin = document.getElementById("txtCurrMargin");
    let objPerDayTP = document.getElementById("txtPerDayTP");
    let objPerDayProfit = document.getElementById("txtPerDayProfitAmt");

    objCurrMargin.value = localStorage.getItem("lsNetLimit");

    if((localStorage.getItem("lsPerDayTPPrct") === null) || (localStorage.getItem("lsPerDayTPPrct") === "") || (parseInt(localStorage.getItem("lsPerDayTPPrct")) < 1)){
        objPerDayTP.value = 1;
        localStorage.setItem("lsPerDayTPPrct", objPerDayTP.value);
        objPerDayProfit.value = (parseInt(objCurrMargin.value) * parseInt(objPerDayTP.value)) / 100;
    }
    else{
        objPerDayTP.value = localStorage.getItem("lsPerDayTPPrct");
    }

    if(objCurrMargin.value === ""){
        if(localStorage.getItem("isAutoTrader") === "true"){
            $('#btnAutoTraderStatus').trigger('click');
        }
        fnGenMessage("No Capital or Margin Available to Trade!", `badge bg-warning`, "spnGenMsg");
    }
    else if(parseInt(objCurrMargin.value) < 400000){
        if(localStorage.getItem("isAutoTrader") === "true"){
            $('#btnAutoTraderStatus').trigger('click');
        }
        fnGenMessage("Capital or Margin is LOW for Auto Trade!", `badge bg-warning`, "spnGenMsg");
    }
    else{
        objPerDayProfit.value = ((parseInt(objCurrMargin.value) * parseInt(objPerDayTP.value)) / 100).toFixed(0);
    }
}

function fnSetProfitPrct(objThis){
    let objCurrMargin = document.getElementById("txtCurrMargin");
    let objPerDayProfit = document.getElementById("txtPerDayProfitAmt");

    if((objThis.value < 1) || (isNaN(objThis.value))){
        objThis.value = 1;
    }
    localStorage.setItem("lsPerDayTPPrct", objThis.value);

    objPerDayProfit.value = ((parseInt(objCurrMargin.value) * parseInt(objThis.value)) / 100).toFixed(0);
}

//To encode String to Base64
function fnEncodeToBase64(){
    let vRes = window.btoa("NHbQHP1M5Z6djc1KG3yXjR0RXDga:9DzmzfGKdeq2yFOS5BrbNfjwAooa");

    // alert(vRes);
}

function fnShowTraderLoginMdl(objThis){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    if(bAppStatus === "false"){
        //$('#mdlAppLogin').modal('show');
        fnGenMessage("First Login to App for Trading Account Login!", `badge bg-warning`, "spnGenMsg");
        fnGetSetAllStatus();
    }
    else if(objThis.className === "badge bg-danger"){
        $('#mdlKotakLogin').modal('show');
        fnGetSetAllStatus();
    }
    else{
        fnClearPrevTraderSession();
        fnGetSetTraderLoginStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnClearPrevTraderSession(){
  gIsTraderLogin = false;
  localStorage.removeItem("lsKotakNeoSession");
  localStorage.removeItem("isAutoTrader");
  localStorage.removeItem("KotakUserDetS");
}

function fnGetSetTraderLoginStatus(){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    let lsKotakConsumerKey = localStorage.getItem("lsKotakConsumerKey");
    let lsKotakConsumerSecret = localStorage.getItem("lsKotakConsumerSecret");
    let lsKotakUserNameAPI = localStorage.getItem("lsKotakUserNameAPI");
    let lsKotakPasswordAPI = localStorage.getItem("lsKotakPasswordAPI");

    let lsKotakLoginID = localStorage.getItem("lsKotakMobileNo");
    let lsKotakPassword = localStorage.getItem("lsKotakPassword");
    let lsKotakMpin = localStorage.getItem("lsKotakMpin");

    let lsSessionID = localStorage.getItem("lsKotakNeoSession");
    let lsViewToken = localStorage.getItem("lsKotakViewToken");
    let lsAccessToken = localStorage.getItem("lsKotakAccessToken");
    let lsSub = localStorage.getItem("lsKotakSub");
    let lsSid = localStorage.getItem("lsKotakSid");
    let lsHsServerID = localStorage.getItem("lsKotakHsServerId");

    let objClientId = document.getElementById("txtMobileNo");
    let objKotakPassword = document.getElementById("txtPassword");
    let objKotakMpin = document.getElementById("txtMpin");

    let objSession = document.getElementById("txtKotakSession");
    let objViewToken = document.getElementById("txtViewToken");
    let objAccessToken = document.getElementById("txtAccessToken");
    let objSubUserId = document.getElementById("txtSubUserId");
    let objSid = document.getElementById("txtSid");
    let objHsServerId = document.getElementById("txtHsServerId");
    
    let objTraderStatus = document.getElementById("btnTraderStatus");

    const vDate = new Date();
    let vToday = vDate.getDate();

    objClientId.value = lsKotakLoginID;

    objSession.value = lsSessionID;
    objViewToken.value = lsViewToken;
    objAccessToken.value = lsAccessToken;
    objSid.value = lsSid;
    objSubUserId.value = lsSub;
    objHsServerId.value = lsHsServerID;

    if (bAppStatus === "false") {
        localStorage.removeItem("lsKotakNeoSession");
        localStorage.removeItem("lsKotakViewToken");
        localStorage.removeItem("lsKotakAccessToken");
        localStorage.removeItem("lsKotakSub");
        localStorage.removeItem("lsKotakSid");
        localStorage.removeItem("lsKotakHsServerId");
        gIsTraderLogin = false;
        objSession.value = "";
    }

    if (objSession.value == "") {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-danger", "TRADER - Disconnected");
        gIsTraderLogin = false;
    }
    else {
        fnChangeBtnProps(objTraderStatus.id, "badge bg-success", "TRADER - Connected");
        gIsTraderLogin = true;
    }
    fnGetSetAutoTraderStatus();
    fnGetSetAllStatus();
}

function fnGetSetAutoTraderStatus(){
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(gIsTraderLogin === true && isLsAutoTrader === "true")
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else
    {
        fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-danger", "Auto Trader - OFF");
        localStorage.setItem("isAutoTrader", false);
    }
}

function fnToggleAutoTrader(){
    let isLsAutoTrader = localStorage.getItem("isAutoTrader");
    
    let objAutoTraderStatus = document.getElementById("btnAutoTraderStatus");

    if(isLsAutoTrader === null || isLsAutoTrader === "false")
    {
        if(gIsTraderLogin === true)
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
}

// function fnToggleRealTrade(){
//     let isLsRealTrader = localStorage.getItem("isRealTrade");

//     let objRealTraderStatus = document.getElementById("btnRealTradeStatus");

//     if(isLsRealTrader === null || isLsRealTrader === "true"){
//         fnChangeBtnProps(objRealTraderStatus.id, "badge bg-warning", "Paper Trade - ON");
//         fnGenMessage("Paper Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
//         localStorage.setItem("isRealTrade", false);
//         $('#btnTabClsdPaperTrds').trigger('click');

// }
//     else{
//         fnChangeBtnProps(objRealTraderStatus.id, "badge bg-success", "Real Trade - ON");
//         fnGenMessage("Real Trading Mode is ON!", `badge bg-success`, "spnGenMsg");
//         localStorage.setItem("isRealTrade", true);
//         $('#btnTabClsdRealTrds').trigger('click');
//     }
// }

function fnShowSettingsMdl(){
    $('#mdlKotakSettings').modal('show');
}

function fnUploadFiles(pSelFileId, pFnCsv2Json){
    const objFiles = document.getElementById(pSelFileId);
    const objFormData = new FormData();

    if(objFiles.files.length === 0)
    {
        fnGenMessage("Please Select a File to Upload!", `badge bg-danger`, "spnKotakNeoSettings");
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
            fnConvertCsv2Json(pFnCsv2Json);
            // fnGenMessage(result.status, `badge bg-${result.status}`, "spnKotakNeoSettings");
        });
    }
}

function fnConvertCsv2Json(pFnCsv2Json){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = "";

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
    fetch("/kotakNeo/" + pFnCsv2Json, requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnKotakNeoSettings");
        }
        else if(objResult.status === "danger"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnKotakNeoSettings");
        }
        else if(objResult.status === "warning"){
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnKotakNeoSettings");
        }
        else{
            fnGenMessage("Error in converting CSV to JSON.", `badge bg-danger`, "spnKotakNeoSettings");
        }
    })
    .catch(error => {
        fnGenMessage("Error to Fetch CSV file.", `badge bg-danger`, "spnKotakNeoSettings");
    });
}

function getJsonDataFile(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vOldSybDt = localStorage.getItem("NSECashSymbolS");
    vOldSybDt = JSON.parse(vOldSybDt);

    if(vOldSybDt === null || vOldSybDt.UpdDt === null || vOldSybDt.UpdDt === ""){
        vOldSybDt = {};
        vOldSybDt.UpdDt = 0;
    }

    let objRequestOptions = {
    method: 'POST',
    headers: vHeaders,
    body: "",
    redirect: 'follow'
    };

    fetch("/kotakNeo/getJsonFiles", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success")
        {
            let vNewSybDt = objResult.data;

            if(parseInt(vNewSybDt.UpdDt) > parseInt(vOldSybDt.UpdDt)){

                localStorage.setItem("NSECashSymbolS", JSON.stringify(objResult.data));

                fnGetNseCashList();

                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGetNseCashList();
            }
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
            fnGenMessage("Error in JSON Data, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("Error to fetch JSON Data. " + error, `badge bg-danger`, "spnGenMsg");
    });
}

function fnGetNseCashList(){
    // let objSelSym = document.getElementById("ddlSymbol");
    let objSelManSym = document.getElementById("ddlNseCashSymbols");

    let objSybLst = localStorage.getItem("NSECashSymbolS");

    objSybLst = JSON.parse(objSybLst);

    // objSelSym.innerHTML = "";

    // objSelSym.innerHTML = "<option value=''>Select Symbol</option>";
    objSelManSym.innerHTML = "<option value=''>Select NSE Symbol</option>"
    if (objSybLst != null) {
       for (let i = 0; i < objSybLst.Symbol.length; i++) {
            let vVal = objSybLst.Symbol[i].pSymbol;
            let vTradeSymbol = objSybLst.Symbol[i].pTrdSymbol;
            // objSelSym.innerHTML += "<option value=\"" + vVal + "\">" + vTradeSymbol + "</option>";
            objSelManSym.innerHTML += "<option value=\"" + vVal + "\">" + vTradeSymbol + "</option>";
        }
    }
}

function fnPositionStatus(){
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("KotakCurrPosiS") === null)
    {
        fnGenMessage("Position Closed!", `badge bg-success`, "spnGenMsg");
        fnGenMessage("No Open Position", `badge bg-success`, "btnPositionStatus");
    }
    else
    {
        objBtnPosition.className = "badge bg-warning";
        objBtnPosition.innerText = "Position is open";
        fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnSaveProfileDetails(){
    let objRealMargin = document.getElementById("txtRealMarginUP");

    localStorage.setItem("lsNetLimit", objRealMargin.value);

    $('#mdlUserProfile').modal('hide');
}

function fnAddEditOptSLTP(){
    let objOptSL = document.getElementById("txtOptionsSL");
    let objOptTP = document.getElementById("txtOptionsTP");

    let objVars = localStorage.getItem("OptVars");

    if (objOptSL.value == "") {
        fnGenMessage("Please Input Stop loss %", `badge bg-danger`, "spnKotakNeoSettings");
    }
    else if (objOptTP.value == "") {
        fnGenMessage("Please Input Take Profit %", `badge bg-danger`, "spnKotakNeoSettings");
    }
    else if ((objVars == null) || (objVars == "")){
        const vVarsDet = { StopLoss: objOptSL.value, TakeProfit: objOptTP.value };
        let vFirstItem = JSON.stringify(vVarsDet);
        localStorage.setItem("OptVars", vFirstItem);

        fnGetOptSettings();

        fnGenMessage("Options SL and TP Added!", `badge bg-success`, "spnKotakNeoSettings");
    }
    else{
        let vExistingData = JSON.parse(objVars);
        vExistingData.StopLoss = objOptSL.value;
        vExistingData.TakeProfit = objOptTP.value;

        let vEditedItems = JSON.stringify(vExistingData);
        localStorage.setItem("OptVars", vEditedItems);

        fnGetOptSettings();
        fnGenMessage("Options SL and TP Updated.", `badge bg-success`, "spnKotakNeoSettings");
    }
}

function fnGetOptSettings(){
    let objOptSL = document.getElementById("txtOptionsSL");
    let objOptTP = document.getElementById("txtOptionsTP");
    let objOptSL1 = document.getElementById("txtOptionsSL1");
    let objOptTP1 = document.getElementById("txtOptionsTP1");

    let objVars = localStorage.getItem("OptVars");

    if(objVars === null || objVars === "")
        objVars = JSON.stringify({ StopLoss: 10, TakeProfit: 20 });

    objVars = JSON.parse(objVars);

    objOptSL.value = objVars.StopLoss;
    objOptTP.value = objVars.TakeProfit;
    objOptSL1.value = objVars.StopLoss;
    objOptTP1.value = objVars.TakeProfit;
}

function fnAddEditNseCashSLTP(){
    let objNseCashSL = document.getElementById("txtNseCashSL");
    let objNseCashTP = document.getElementById("txtNseCashTP");

    let objVars = localStorage.getItem("NseCashVars");

    if (objNseCashSL.value == "") {
        fnGenMessage("Please Input Stop loss %", `badge bg-danger`, "spnKotakNeoSettings");
    }
    else if (objNseCashTP.value == "") {
        fnGenMessage("Please Input Take Profit %", `badge bg-danger`, "spnKotakNeoSettings");
    }
    else if ((objVars == null) || (objVars == "")){
        const vVarsDet = { StopLoss: objNseCashSL.value, TakeProfit: objNseCashTP.value };
        let vFirstItem = JSON.stringify(vVarsDet);
        localStorage.setItem("NseCashVars", vFirstItem);

        fnGetNseCashSettings();

        fnGenMessage("Success! Data Added.", `badge bg-success`, "spnKotakNeoSettings");
    }
    else{
        let vExistingData = JSON.parse(objVars);
        vExistingData.StopLoss = objNseCashSL.value;
        vExistingData.TakeProfit = objNseCashTP.value;

        let vEditedItems = JSON.stringify(vExistingData);
        localStorage.setItem("NseCashVars", vEditedItems);

        fnGetNseCashSettings();
        fnGenMessage("Success! Data Updated.", `badge bg-success`, "spnKotakNeoSettings");
    }
}

function fnGetNseCashSettings(){
    let objNseCashSL = document.getElementById("txtNseCashSL");
    let objNseCashTP = document.getElementById("txtNseCashTP");
    let objNseCashSL1 = document.getElementById("txtNseCashSL1");
    let objNseCashTP1 = document.getElementById("txtNseCashTP1");

    let objVars = localStorage.getItem("NseCashVars");

    if(objVars === null || objVars === "")
        objVars = JSON.stringify({ StopLoss: 1, TakeProfit: 2 });

    objVars = JSON.parse(objVars);

    objNseCashSL.value = objVars.StopLoss;
    objNseCashTP.value = objVars.TakeProfit;
    objNseCashSL1.value = objVars.StopLoss;
    objNseCashTP1.value = objVars.TakeProfit;
}

function fnGetIndSymSettings(){
    const objDate = new Date();
    let vSecDt = objDate.valueOf();
  
    gIndData = {
        UpdDt: vSecDt, Symbol: [
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'Nifty 50', SearchSymbol: 'NIFTY', Token: 1, Segment: 'nse_cm', LotSize: 75, MaxLots: 24, StrikeInterval: 50, StopLoss: 10, TakeProfit: 20, ExpiryDates: ['2025-08-28'] },
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'Nifty Bank', SearchSymbol: 'BANKNIFTY', Token: 2, Segment: 'nse_cm', LotSize: 30, MaxLots: 30, StrikeInterval: 100, StopLoss: 20, TakeProfit: 40, ExpiryDates: ['2025-08-28'] },
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'Nifty Fin Service', SearchSymbol: 'FINNIFTY', Token: 3, Segment: 'nse_cm', LotSize: 65, MaxLots: 27, StrikeInterval: 50, StopLoss: 10, TakeProfit: 20, ExpiryDates: ['2025-08-28'] },
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'NIFTY MID SELECT', SearchSymbol: 'MIDCPNIFTY', Token: 4, Segment: 'nse_cm', LotSize: 120, MaxLots: 23, StrikeInterval: 25, StopLoss: 10, TakeProfit: 20, ExpiryDates: ['2025-08-28'] },
            { JsonFileName: 'bse_idx_opt.json', SymbolName: 'SENSEX', SearchSymbol: 'SENSEX', Token: 5, Segment: 'bse_cm', LotSize: 20, MaxLots: 50, StrikeInterval: 100, StopLoss: 20, TakeProfit: 40, ExpiryDates: ['2025-08-26'] },
            { JsonFileName: 'bse_idx_opt.json', SymbolName: 'BANKEX', SearchSymbol: 'BANKEX', Token: 6, Segment: 'bse_cm', LotSize: 30, MaxLots: 30, StrikeInterval: 100, StopLoss: 20, TakeProfit: 40, ExpiryDates: ['2025-08-26'] },
        ] };

    fnFillIndexSymbolData();
}

function fnFillIndexSymbolData(){
    let objSelSym = document.getElementById("ddlOptionsSymbols");

    objSelSym.innerHTML = "<option value=0>Select Index Symbol</option>";

    if (gIndData != null) {
        for (let i = 0; i < gIndData.Symbol.length; i++) {
            let vToken = gIndData.Symbol[i].Token;
            let vDispName = gIndData.Symbol[i].SymbolName;

            objSelSym.innerHTML += "<option value=" + vToken + ">" + vDispName + "</option>";
        }
        fnFillIndexExpData();
    }
    // console.log(gIndData);
}

function fnFillIndexExpData(){
    let objSelSym = document.getElementById("ddlOptionsSymbols");
    let objSelExp = document.getElementById("ddlOptionsExpiry");

    objSelExp.innerHTML = "";

    if (gIndData != null) {
        for (let i = 0; i < gIndData.Symbol.length; i++){
            if (gIndData.Symbol[i].Token === parseInt(objSelSym.value)){
                for (let j = 0; j < gIndData.Symbol[i].ExpiryDates.length; j++){
                    let vOption = gIndData.Symbol[i].ExpiryDates[j];
                    objSelExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                }
                //alert(gIndData.Symbol[i].LotSize);
            }
        }
    }

    if(parseInt(objSelSym.value) === 0){
        objSelExp.innerHTML = "<option value=''>Select Expiry</option>";
    }
}

function fnChangeStartLotNos(pThisVal){

    let objQty = document.getElementById("txtManualQty");
    let objOptQty = document.getElementById("txtOptionsQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNoR", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNoR", 1);
    }
    else{
        fnGenMessage("No of Lots to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartLotNoR", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            objQty.value = pThisVal.value;
            objOptQty.value = pThisVal.value;
            localStorage.setItem("QtyMulR", pThisVal.value);
        }
    }
}

function fnSetDDLTrailSLTP(objThis){
    localStorage.setItem("DDLDefSLTP", objThis.value);
}

function fnLoadDefaultSLTP(){
    let vDefSLTPLS = localStorage.getItem("DDLDefSLTP");
    let objDefSLTP = document.getElementById("ddlTrailSLTP");

    if(vDefSLTPLS === null || vDefSLTPLS === ""){
        localStorage.setItem("DDLDefSLTP", objDefSLTP.value);
        objDefSLTP.value = 0;
    }
    else
    {
        objDefSLTP.value = localStorage.getItem("DDLDefSLTP");
    }
}

function fnSetCurrTraderTab(pTabType){
    //let vTraderTab = localStorage.getItem("TraderTab");

    if(pTabType === "cash"){
        localStorage.setItem("TraderTab", "cash");
    }
    else if(pTabType === "futures"){
        localStorage.setItem("TraderTab", "futures");
    }
    else{
        localStorage.setItem("TraderTab", "options");        
    }

    //alert(localStorage.getItem("TraderTab"));
}

function fnSetDefaultTraderTab(){
    let vTraderTab = localStorage.getItem("TraderTab");

    if(vTraderTab === "futures"){
        $('#btnTabFutures').trigger('click');
    }
    else if(vTraderTab === "cash"){
        $('#btnTabCash').trigger('click');
    }
    else{
        $('#btnTabOptions').trigger('click');
    }
}
