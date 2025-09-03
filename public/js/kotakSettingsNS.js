
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
    fetch("/kotakSpeed/" + pFnCsv2Json, requestOptions)
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

    fetch("/kotakSpeed/getJsonFiles", objRequestOptions)
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

function fnGetIndSymSettings(){
    const objDate = new Date();
    let vSecDt = objDate.valueOf();
  
    gIndData = {
        UpdDt: vSecDt, Symbol: [
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'Nifty 50', SearchSymbol: 'NIFTY', Token: 1, Segment: 'nse_cm', LotSize: 75, MaxLots: 24, StrikeInterval: 50, StopLoss: 10, TakeProfit: 20, ExpiryDates: ['2025-09-09', '2025-09-16', '2025-09-23', '2025-09-30'] },
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'Nifty Bank', SearchSymbol: 'BANKNIFTY', Token: 2, Segment: 'nse_cm', LotSize: 30, MaxLots: 30, StrikeInterval: 100, StopLoss: 20, TakeProfit: 40, ExpiryDates: ['2025-09-30'] },
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'Nifty Fin Service', SearchSymbol: 'FINNIFTY', Token: 3, Segment: 'nse_cm', LotSize: 65, MaxLots: 27, StrikeInterval: 50, StopLoss: 10, TakeProfit: 20, ExpiryDates: ['2025-09-30'] },
            { JsonFileName: 'nse_idx_opt.json', SymbolName: 'NIFTY MID SELECT', SearchSymbol: 'MIDCPNIFTY', Token: 4, Segment: 'nse_cm', LotSize: 120, MaxLots: 23, StrikeInterval: 25, StopLoss: 10, TakeProfit: 20, ExpiryDates: ['2025-09-30'] },
            { JsonFileName: 'bse_idx_opt.json', SymbolName: 'SENSEX', SearchSymbol: 'SENSEX', Token: 5, Segment: 'bse_cm', LotSize: 20, MaxLots: 50, StrikeInterval: 100, StopLoss: 20, TakeProfit: 40, ExpiryDates: ['2025-09-04', '2025-09-11', '2025-09-18', '2025-09-25'] },
            { JsonFileName: 'bse_idx_opt.json', SymbolName: 'BANKEX', SearchSymbol: 'BANKEX', Token: 6, Segment: 'bse_cm', LotSize: 30, MaxLots: 30, StrikeInterval: 100, StopLoss: 20, TakeProfit: 40, ExpiryDates: ['2025-09-25'] },
        ] };

    fnFillIndexSymbolData();
}

function fnFillIndexSymbolData(){
    let objSelSym = document.getElementById("ddlOptionsSymbols");

    // objSelSym.innerHTML = "<option value=0>Select Index Symbol</option>";

    if (gIndData != null) {
        for (let i = 0; i < gIndData.Symbol.length; i++) {
            let vToken = gIndData.Symbol[i].Token;
            let vDispName = gIndData.Symbol[i].SymbolName;

            objSelSym.innerHTML += "<option value=" + vToken + ">" + vDispName + "</option>";
        }
        objSelSym.value = 1;

        fnGetSelSymbolData(1);
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
