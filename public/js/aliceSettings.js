
function fnChangeConfSteps(objThis){
    localStorage.setItem("ConfStepsS", objThis.value);
}

function fnShowSettingsMdl(){
    $('#mdlSettingsAB').modal('show');
}

function fnGetSymbolList(){
    let objSelSym = document.getElementById("ddlSymbol");
    let objSelManSym = document.getElementById("ddlManualSymbol");

    let objSybLst = localStorage.getItem("SymbolListS");

    objSybLst = JSON.parse(objSybLst);
    //console.log(objSybLst);

    objSelSym.innerHTML = "";

    objSelSym.innerHTML = "<option value=''>Select Symbol</option>";
    objSelManSym.innerHTML = "<option value=''>Select Symbol</option>"
    if (objSybLst != null) {
        for (let i = 0; i < objSybLst.Symbol.length; i++) {
            let vVal = objSybLst.Symbol[i].SymbolName;
            let vDispName = objSybLst.Symbol[i].TradeName;
            
            objSelSym.innerHTML += "<option value=\"" + vVal + "\">" + vDispName + "</option>";
            objSelManSym.innerHTML += "<option value=\"" + vVal + "\">" + vDispName + "</option>";
        }
        fnGetExpiryList();
    }
}

function fnGetExpiryList(){
    let objSelSym = document.getElementById("ddlSymbol");
    let objSymName = document.getElementById("txtSymbolName");
    let objTradeName = document.getElementById("txtTradeName");
    let objToken = document.getElementById("txtToken");
    let objLotSize = document.getElementById("txtLotSize");
    let objMaxLotsLimit = document.getElementById("txtMaxLotsLimit");
    let objStrikeInterval = document.getElementById("txtStrikeInterval");
    let objStopLoss = document.getElementById("txtStopLoss");
    let objTakeProfit = document.getElementById("txtTakeProfit");
    let objHidLotSize = document.getElementById("txtHidLotSize");
    let objEditCB = document.getElementById("swtEditSymbol");
    let objSelExp = document.getElementById("ddlExpiry");
    let objSelManExp = document.getElementById("ddlManualExpiry");
    let objSybLst = localStorage.getItem("SymbolListS");
    let objExpEditCB = document.getElementById("swtEditExpiry");
    let objExpiryDate = document.getElementById("txtExpiryDate");

    objSymName.value = "";
    objTradeName.value = "";
    objToken.value = "";
    objHidLotSize.value = "";
    objLotSize.value = "";
    objMaxLotsLimit.value = 10;
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
        for (let i = 0; i < objSybLst.Symbol.length; i++) {
            if (objSybLst.Symbol[i].SymbolName == objSelSym.value) {
                objHidLotSize.value = objSybLst.Symbol[i].LotSize;
                for (let j = 0; j < objSybLst.Symbol[i].ExpiryDates.length; j++) {
                    let vOption = objSybLst.Symbol[i].ExpiryDates[j];
                    objSelExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                    objSelManExp.innerHTML += "<option value=\"" + vOption + "\">" + vOption + "</option>";
                }
            }
        }
    }
}

function fnEditSymbol(){
    let objSelSym = document.getElementById("ddlSymbol");
    let objSymName = document.getElementById("txtSymbolName");
    let objTradeName = document.getElementById("txtTradeName");
    let objToken = document.getElementById("txtToken");
    let objExchange = document.getElementById("ddlExchange");
    let objContracts = document.getElementById("ddlContracts");
    let objMaxLotsLimit = document.getElementById("txtMaxLotsLimit");
    let objLotSize = document.getElementById("txtLotSize");
    let objStrikeInterval = document.getElementById("txtStrikeInterval");
    let objStopLoss = document.getElementById("txtStopLoss");
    let objTakeProfit = document.getElementById("txtTakeProfit");
    let objSybLst = localStorage.getItem("SymbolListS");
    let objEditCB = document.getElementById("swtEditSymbol");

    let objGDispMessage = document.getElementById("spnSettingsMsg");

    if (objSelSym.value === "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Select Symbol to Edit!";

        objEditCB.checked = false;
    }
    else {
        objSybLst = JSON.parse(objSybLst);
        if (objSybLst != null && objEditCB.checked == true) {
            for (let i = 0; i < objSybLst.Symbol.length; i++) {
                if (objSybLst.Symbol[i].SymbolName == objSelSym.value) {
                    objSymName.value = objSybLst.Symbol[i].SymbolName;
                    objTradeName.value = objSybLst.Symbol[i].TradeName;
                    objToken.value = objSybLst.Symbol[i].Token;
                    objExchange.options[objExchange.selectedIndex].text = objSybLst.Symbol[i].Exchange;
                    objContracts.value = objSybLst.Symbol[i].Contract;
                    objLotSize.value = objSybLst.Symbol[i].LotSize;
                    objMaxLotsLimit.value = objSybLst.Symbol[i].MaxLots;
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
            objMaxLotsLimit.value.value = 10;
            objStrikeInterval.value = "";
            objStopLoss.value = "";
            objTakeProfit.value = "";
        }
    }
}

function fnDeleteSymbol(){
    let objSelSym = document.getElementById("ddlSymbol");
    let objSymName = document.getElementById("txtSymbolName");
    let objTradeName = document.getElementById("txtTradeName");
    let objToken = document.getElementById("txtToken");
    let objMaxLotsLimit = document.getElementById("txtMaxLotsLimit");
    let objLotSize = document.getElementById("txtLotSize");
    let objStrikeInterval = document.getElementById("txtStrikeInterval");
    let objStopLoss = document.getElementById("txtStopLoss");
    let objTakeProfit = document.getElementById("txtTakeProfit");
    let objSybLst = localStorage.getItem("SymbolListS");
    let objEditCB = document.getElementById("swtEditSymbol");
    let objGDispMessage = document.getElementById("spnSettingsMsg");

    const objDate = new Date();
    let vSecDt = objDate.valueOf();

    if (objSelSym.value === "") {
        objGDispMessage.className = "badge bg-danger";
        objGDispMessage.innerText = "Please Select Symbol to Delete!";
        //alert("Please Select Symbol to Delete!");
        objEditCB.checked = false;
    }
    else {
        if (confirm("Do You Want To Delete " + objSelSym.value + " Data?")) {
            let vExistingData = JSON.parse(objSybLst);
            for (let i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol.splice(i, 1);
                }
            }

            vExistingData.UpdDt = vSecDt;
            let vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);
            //console.log(localStorage.getItem("SymbolListS"));

            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelSym.value + " Details Deleted!";
            objSymName.value = "";
            objTradeName.value = "";
            objToken.value = "";
            objMaxLotsLimit.value = 10;
            objLotSize.value = "";
            objStrikeInterval.value = "";
            objStopLoss.value = "";
            objTakeProfit.value = "";
            objEditCB.checked = false;
            fnGetSymbolList();
        }
    }
}

function fnSaveSymbolAttrToDB(pSymbolDetails){
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
            fnUpdateSymbolsForAll();
        }
    })
    .catch(error => {
        console.log('error: ', error);
        fnGenMessage("ErrorC: Unable to Update JSON Details.", `badge bg-danger`, "spnSettingsMsg");
    });
}

function fnUpdateSymbolsForAll(){
    socket.emit("SymbolsUpdated", "Updated Ur Symbol!");
}

function fnChangeContracts(pThis) {
    var objSelContract = document.getElementById("ddlContracts");

    objSelContract.value = pThis.value;
}

function fnDeleteLocalStorageSymbol(){
    let objGDispMessage = document.getElementById("spnSettingsMsg");

    const vSymDet = { Symbol: [] };
    let vFirstItem = JSON.stringify(vSymDet);

    //Save to DB code Here
    fnSaveSymbolAttrToDB(vFirstItem);

    localStorage.setItem("SymbolListS", vFirstItem);

    let objSymName = document.getElementById("txtSymbolName");
    let objMaxLotsLimit = document.getElementById("txtMaxLotsLimit");
    let objLotSize = document.getElementById("txtLotSize");
    let objStrikeInterval = document.getElementById("txtStrikeInterval");
    let objHidLotSize = document.getElementById("txtHidLotSize");
    let objStopLoss = document.getElementById("txtStopLoss");
    let objTakeProfit = document.getElementById("txtTakeProfit");

    objSymName.value = "";
    objMaxLotsLimit.value = 10;
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objHidLotSize.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";

    fnGetSymbolList();

    objGDispMessage.className = "badge bg-success";
    objGDispMessage.innerText = "All Symbol Date Removed!";
    //console.log(localStorage.getItem("SymbolListS"));
    // console.log("All Symbol Date Removed & Set to NULL");    
}

function fnAddEditSymbolDetails(){
    let objSelSym = document.getElementById("ddlSymbol");
    let objGDispMessage = document.getElementById("spnSettingsMsg");
    let objSymName = document.getElementById("txtSymbolName");
    let objTradeName = document.getElementById("txtTradeName");
    let objToken = document.getElementById("txtToken");
    let objMaxLotsLimit = document.getElementById("txtMaxLotsLimit");
    let objLotSize = document.getElementById("txtLotSize");
    let objStrikeInterval = document.getElementById("txtStrikeInterval");
    let objStopLoss = document.getElementById("txtStopLoss");
    let objTakeProfit = document.getElementById("txtTakeProfit");
    let objExchange = document.getElementById("ddlExchange");
    let objContracts = document.getElementById("ddlContracts");
    let objEditCB = document.getElementById("swtEditSymbol");

    let objSybLst = localStorage.getItem("SymbolListS");

    const objDate = new Date();
    let vSecDt = objDate.valueOf();

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
        const vSymDet = { UpdDt: vSecDt, Symbol: [{ SymbolName: objSymName.value, TradeName: objTradeName.value, Token: objToken.value, Exchange: objExchange.options[objExchange.selectedIndex].text, Contract: objContracts.value, LotSize: objLotSize.value, MaxLots: objMaxLotsLimit.value, StrikeInterval: objStrikeInterval.value, StopLoss: objStopLoss.value, TakeProfit: objTakeProfit.value, ExpiryDates: [] }] };
        let vFirstItem = JSON.stringify(vSymDet);
        localStorage.setItem("SymbolListS", vFirstItem);

        //Save to DB code Here
        fnSaveSymbolAttrToDB(vFirstItem);

        //console.log(localStorage.getItem("SymbolListS"));
        objGDispMessage.className = "badge bg-success";
        objGDispMessage.innerText = objSymName.value + " Symbol Details Added!";
        objSymName.value = "";
        objTradeName.value = "";
        objToken.value = "";
        objMaxLotsLimit.value = 10;
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";

        fnGetSymbolList();
    }
    else
    {
        let vExistingData = JSON.parse(objSybLst);

        if (objEditCB.checked == true) {
            for (let i = 0; i < vExistingData.Symbol.length; i++) {
                if (vExistingData.Symbol[i].SymbolName == objSelSym.value) {
                    vExistingData.Symbol[i].SymbolName = objSymName.value;
                    vExistingData.Symbol[i].TradeName = objTradeName.value;
                    vExistingData.Symbol[i].Token = objToken.value;
                    vExistingData.Symbol[i].Exchange = objExchange.options[objExchange.selectedIndex].text;
                    vExistingData.Symbol[i].Contract = objContracts.value;
                    vExistingData.Symbol[i].MaxLots = objMaxLotsLimit.value;
                    vExistingData.Symbol[i].LotSize = objLotSize.value;
                    vExistingData.Symbol[i].StrikeInterval = objStrikeInterval.value;
                    vExistingData.Symbol[i].StopLoss = objStopLoss.value;
                    vExistingData.Symbol[i].TakeProfit = objTakeProfit.value;
                }
            }

            vExistingData.UpdDt = vSecDt;
            let vEditedItems = JSON.stringify(vExistingData);
            localStorage.setItem("SymbolListS", vEditedItems);

            //Save to DB code Here
            fnSaveSymbolAttrToDB(vEditedItems);

            //console.log(localStorage.getItem("SymbolListS"));
            objEditCB.checked = false;
            objGDispMessage.className = "badge bg-success";
            objGDispMessage.innerText = objSelSym.value + " Symbol Details Edited!";
        }
        else {
            vExistingData.UpdDt = vSecDt;
            vExistingData.Symbol.push({ SymbolName: objSymName.value, TradeName: objTradeName.value, Token: objToken.value, Exchange: objExchange.options[objExchange.selectedIndex].text, Contract: objContracts.value, LotSize: objLotSize.value, MaxLots: objMaxLotsLimit.value, StrikeInterval: objStrikeInterval.value, StopLoss: objStopLoss.value, TakeProfit: objTakeProfit.value, ExpiryDates: [] });
            let vAddlItems = JSON.stringify(vExistingData);
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
        objMaxLotsLimit.value = 10;
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";

        document.getElementById("ddlManualSymbol").value = "";

        $('#ddlManualSymbol').change();

        fnGetSymbolList();
    }
}

function fnResetAllDetails(){
    var objExpEditCB = document.getElementById("swtEditExpiry");
    var objExpiryDate = document.getElementById("txtExpiryDate");
    var objSymName = document.getElementById("txtSymbolName");
    var objTradeName = document.getElementById("txtTradeName");
    var objToken = document.getElementById("txtToken");
    var objMaxLotsLimit = document.getElementById("txtMaxLotsLimit");
    var objLotSize = document.getElementById("txtLotSize");
    var objStrikeInterval = document.getElementById("txtStrikeInterval");
    var objStopLoss = document.getElementById("txtStopLoss");
    var objTakeProfit = document.getElementById("txtTakeProfit");
    var objEditCB = document.getElementById("swtEditSymbol");

    objSymName.value = "";
    objTradeName.value = "";
    objToken.value = "";
    objMaxLotsLimit.value = 10;
    objLotSize.value = "";
    objStrikeInterval.value = "";
    objStopLoss.value = "";
    objTakeProfit.value = "";
    objExpiryDate.value = "";
    objEditCB.checked = false;
    objExpEditCB.checked = false;
}

function fnEditExpiry(){
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

function fnDeleteExpiry(){
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    const objDate = new Date();
    let vSecDt = objDate.valueOf();

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

            vExistingData.UpdDt = vSecDt;
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

function fnAddEditExpiryDetails(){
    var objSelSym = document.getElementById("ddlSymbol");
    var objSelExp = document.getElementById("ddlExpiry");
    var objExpDate = document.getElementById("txtExpiryDate");
    var objSybLst = localStorage.getItem("SymbolListS");
    var objEditCB = document.getElementById("swtEditExpiry");
    var objGDispMessage = document.getElementById("spnSettingsMsg");

    const objDate = new Date();
    let vSecDt = objDate.valueOf();

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
        vExistingData.UpdDt = vSecDt;

        var vAddlItems = JSON.stringify(vExistingData);
        localStorage.setItem("SymbolListS", vAddlItems);

        //Save to DB code Here
        fnSaveSymbolAttrToDB(vAddlItems);
        //console.log(localStorage.getItem("SymbolListS"));

        objExpDate.value = "";

        fnGetExpiryList();
    }
}

function fnGetSelSymbolData(pSymbolVal){
    let objSelExp = document.getElementById("ddlManualExpiry");
    let objSybLst = localStorage.getItem("SymbolListS");
    let objStrikeInterval = document.getElementById("hidStrikeInterval");
    let objToken = document.getElementById("hidToken");
    let objManualTradePrice = document.getElementById("txtManualTradePrice");
    let objLotSize = document.getElementById("txtManualBuyQty");
    let objStopLoss = document.getElementById("txtManualStopLoss");
    let objTakeProfit = document.getElementById("txtManualTakeProfit");
    let objExchange = document.getElementById("hidExchange");
    let objContract = document.getElementById("hidContract");
    let objMaxLotsLimit = document.getElementById("hidMaxLotsLimit");
    let objManualStrike = document.getElementById("txtManualStrike");
    let objActualStrike = document.getElementById("txtActualStrike");
    let objTradeToken = document.getElementById("hidTradeToken");
    let objDateToTime = document.getElementById("txtDateToTime");

    //console.log(objSybLst);
    objSybLst = JSON.parse(objSybLst);

    objSelExp.innerHTML = "";
    objManualStrike.value = "";
    objActualStrike.value = "";
    objManualTradePrice.value = "";
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
                objMaxLotsLimit.value = objSybLst.Symbol[i].MaxLots;
                objLotSize.value = objSybLst.Symbol[i].LotSize;
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
        objMaxLotsLimit.value = 10;
        objLotSize.value = "";
        objStrikeInterval.value = "";
        objStopLoss.value = "";
        objTakeProfit.value = "";
        objExchange.value = "";
        objContract.value = "";
        objSelExp.innerHTML = "<option value=\"\">Select Expiry</option>";
    }
}

function fnUploadFiles(){
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

function getSymbolsDataFile(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vOldSybDt = localStorage.getItem("SymbolListS");
    vOldSybDt = JSON.parse(vOldSybDt);

    if(vOldSybDt === null || vOldSybDt.UpdDt === null || vOldSybDt.UpdDt === ""){
        vOldSybDt = {};
        vOldSybDt.UpdDt = 0;
    }

    let objRequestOptions = {
    method: 'POST',
    headers: vHeaders,
    body: "", //JSON.stringify({ClientID: objClientId.value, Session: objSession.value, Exchange: objExchange.value, StrikeInterval: objStrikeInterval.value, Token: objSelToken.value}),
    redirect: 'follow'
    };

    fetch("/alice-blue/getJsonFiles", objRequestOptions)
    .then(objResponse => objResponse.json())
    .then(objResult => {
        if(objResult.status === "success")
        {
            let vNewSybDt = JSON.parse(objResult.data);
            if(parseInt(vNewSybDt.UpdDt) > parseInt(vOldSybDt.UpdDt)){

                localStorage.setItem("SymbolListS", objResult.data);

                fnGetSymbolList();

                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
            }
            else{
                fnGetSymbolList();
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

function fnShowTraderLoginMdl(objThis){
    let isAppLoginStatus = localStorage.getItem("AppMsgStatusS");

    //console.log("Login Status: " + isAppLoginStatus);
    if(isAppLoginStatus === "false")
    {
        $('#mdlAppLogin').modal('show');
    }
    else if(objThis.className === "badge bg-danger")
    {
        $('#mdlAliceLogin').modal('show');
    }
    else
    {
        fnClearPrevLoginSession();
        fnGetSetAutoTraderStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnSetUserProfileDets(){
    let isLsTraderLogin = localStorage.getItem("isTraderLogin");
    let objUserDets = localStorage.getItem("UserDetS");
    let objClientId = document.getElementById("txtClientIdUP");
    let objFullName = document.getElementById("txtFullNameUP");
    let objMobileNumber = document.getElementById("txtClientMobileUP");
    let objEmailId = document.getElementById("txtClientEmailUP");
    let objStatus = document.getElementById("txtClientStatusUP");
    let objRealMargin = document.getElementById("txtRealMarginUP");
    let objPaperMargin = document.getElementById("txtPaperMarginUP");

    if(isLsTraderLogin === "true") {
        if (objUserDets == null || objUserDets == ""){
        //Empty all Fields
        objClientId.value = "";
        objFullName.value = "";
        objMobileNumber.value = "";
        objEmailId.value = "";
        objStatus.value = "";
        objRealMargin.value = 0;
        }
        else{
        //Fill all Fields
        let vExistingData = JSON.parse(objUserDets);

        objClientId.value = vExistingData.ClientId;
        objFullName.value = vExistingData.FullName;
        objMobileNumber.value = vExistingData.Mobile;
        objEmailId.value = vExistingData.EmailId;
        objStatus.value = vExistingData.Status;
        objRealMargin.value = vExistingData.CashMargin;
        objPaperMargin.value = vExistingData.PaperMargin;
        }
        //fnChangeBtnProps(objAutoTraderStatus.id, "badge bg-success", "Auto Trader - ON");
    }
    else {
        //Empty all Fields
        objClientId.value = "";
        objFullName.value = "";
        objMobileNumber.value = "";
        objEmailId.value = "";
        objStatus.value = "";
        objRealMargin.value = 0;
    }
}

function fnLoginAliceBlue(){
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
        .then(objResult => {
            //console.log(objResult);
            if(objResult.status === "success")
            {
                //console.log(objResult);
                objEncKey.value = objResult.data.EncKey;
                objSession.value = objResult.data.Session;
    
                localStorage.setItem("lsAliceBlueID", objClientId.value);
                localStorage.setItem("lsAliceBlueApiKey", objApiKey.value);
                localStorage.setItem("lsAliceBlueSession", objSession.value);

                const vDate = new Date();
                let vToday = vDate.getDate();            
                localStorage.setItem("lsLoginDate", vToday);
                localStorage.setItem("isTraderLogin", true);
                let objUserDets = localStorage.getItem("UserDetS");

                if (objUserDets == null || objUserDets == "") {
                    let vUserDet = { ClientId: objResult.data.accountId, FullName: objResult.data.accountName, Mobile: objResult.data.cellAddr, EmailId: objResult.data.emailAddr, Status: objResult.data.accountStatus, CashMargin: objResult.data.dataMargins.cashmarginavailable, PaperMargin: 500000 };
                    let vFirstTime= JSON.stringify(vUserDet);
                    localStorage.setItem("UserDetS", vFirstTime);
                }
                else {
                    let vExistingData = JSON.parse(objUserDets);
            
                    vExistingData.ClientId = objResult.data.accountId;
                    vExistingData.FullName = objResult.data.accountName;
                    vExistingData.Mobile = objResult.data.cellAddr;
                    vExistingData.EmailId = objResult.data.emailAddr;
                    vExistingData.Status = objResult.data.accountStatus;
                    vExistingData.CashMargin = objResult.data.dataMargins.cashmarginavailable;
            
                    let vUpdData = JSON.stringify(vExistingData);
                    localStorage.setItem("UserDetS", vUpdData);
                }

                fnSetUserProfileDets();
                fnChangeBtnProps("btnTraderStatus", "badge bg-success", "TRADER - Connected");
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
                getSymbolsDataFile();
                $('#mdlAliceLogin').modal('hide');
            }
            else if(objResult.status === "danger")
            {
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnAliceBlueLogin");
            }
            else if(objResult.status === "warning")
            {
                fnClearPrevLoginSession();
                fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnAliceBlueLogin");
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

function fnClearPrevLoginSession(){
    let objSession = document.getElementById("hidSession");

    localStorage.removeItem("lsLoginDate");
    localStorage.removeItem("lsAliceBlueSession");
    localStorage.removeItem("isTraderLogin");
    localStorage.removeItem("isAutoTrader");
    localStorage.removeItem("UserDetS");

    objSession.value = "";

    fnGetSetTraderLoginStatus();
    fnSetUserProfileDets();
}

function fnGetSetTraderLoginStatus(){
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

function fnGetSetAutoTraderStatus(){
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

function fnToggleAutoTrader(){
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
}

function fnPositionStatus(){
    let objBtnPosition = document.getElementById("btnPositionStatus");

    if(localStorage.getItem("CurrPositionS") === null)
    {
        objBtnPosition.className = "badge bg-success";
        objBtnPosition.innerText = "No Open Position";
        fnGenMessage("No Open Positions!", `badge bg-success`, "spnGenMsg");
    }
    else
    {
        objBtnPosition.className = "badge bg-warning";
        objBtnPosition.innerText = "Position is open";
        fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");

        // if (confirm("Are You Sure, You Want to Close the Open Position?"))
        // {
        //     localStorage.removeItem("CurrPositionS");
        //     objBtnPosition.className = "badge bg-danger";
        //     objBtnPosition.innerText = "No Open Position";
        //     fnGenMessage("Position is Closed!", `badge bg-success`, "spnGenMsg");
        //     //fnSetCurrentTradeDetails();
        // }
        // else
        // {
        //     objBtnPosition.className = "badge bg-warning";
        //     objBtnPosition.innerText = "Position is open";
        //     fnGenMessage("Position is Still Open!", `badge bg-warning`, "spnGenMsg");
        // }
    }
}

function fnGetSetConfStepsDDL(){
    let vCurrCS = localStorage.getItem("ConfStepsS");
    let objDDLConfSteps = document.getElementById("ddlConfSteps");

    if(vCurrCS === "" || vCurrCS === null){
        objDDLConfSteps.value = "111111";
    }
    else{
        objDDLConfSteps.value = vCurrCS;
    }
}

function fnGetCurrStrike(){
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
                objManualStrikePrice.value = objResult.data.ActualStrike;
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

function fnChangeStartLotNos(pThisVal){

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNo", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Lot No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartLotNo", 1);
    }
    else{
        fnGenMessage("No of Lots to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartLotNo", pThisVal.value);
    }
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
    //$('#mdlAppLogin').modal('show');
  }
}

function fnAppLogin(){
  let objLoginTxt = document.getElementById("lblAppLoginTxt");

  localStorage.setItem("AppMsgStatusS", true);
  objLoginTxt.innerText = "LOGOUT";
  $('#mdlAppLogin').modal('hide');
  fnGenMessage("App is Logged In!", `badge bg-success`, "spnGenMsg");
}
