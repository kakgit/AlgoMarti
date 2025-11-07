
window.addEventListener("DOMContentLoaded", function(){
    fnGetAllStatus();

    socket.on("CdlEmaTrend", (pMsg) => {
        let objTradeSideVal = document["frmSide"]["rdoTradeSide"];
        let objJson = JSON.parse(pMsg);

        if(objJson.Direc === "UP"){
            objTradeSideVal.value = true;
        }
        else if(objJson.Direc === "DN"){
            objTradeSideVal.value = false;
        }
        else{
            objTradeSideVal.value = -1;
        }
        fnTradeSide();
    });

});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

    if(bAppStatus){
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();

        fnLoadTradeSide();

    }
}

function fnChangeStartQty(pThisVal){
    // let objQty = document.getElementById("txtQty");

    if(pThisVal.value === "" || pThisVal.value === "0"){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDFL", 1);
    }
    else if(isNaN(parseInt(pThisVal.value))){
        fnGenMessage("Not a Valid Qty No to Start with, Please Check", `badge bg-danger`, "spnGenMsg");
        pThisVal.value = 1;
        localStorage.setItem("StartQtyNoDFL", 1);
    }
    else{
        fnGenMessage("No of Qty to Start With is Changed!", `badge bg-success`, "spnGenMsg");
        localStorage.setItem("StartQtyNoDFL", pThisVal.value);

        if(confirm("Are You Sure You want to change the Quantity?")){
            // objQty.value = pThisVal.value;
            localStorage.setItem("QtyMultiplierDFL", pThisVal.value);
        }
    }
}


function fnClearLocalStorageTemp(){
    localStorage.removeItem("DeltaCurrOptPosD");
    localStorage.removeItem("TrdBkOSD");
    // localStorage.removeItem("StartQtyNoDeltaOSD");
    // localStorage.removeItem("DeltaOptMartiOSD");
    // localStorage.removeItem("DeltaOptMultiLegOSD");
    localStorage.setItem("QtyMultiplierDFL", 0);
    localStorage.setItem("TotLossAmtOSD", 0);
    localStorage.setItem("CurrPLOSD", 0);
    localStorage.removeItem("LossRecMOSD");
    // localStorage.removeItem("MultiplierXOSD");
    localStorage.removeItem("DeltaCurrOptSlTpOSD");

    gSymbBRateList = {};
    gSymbBDeltaList = {};
    gSymbSRateList = {};
    gSymbSDeltaList = {};

    fnGetAllStatus();
    console.log("Memory Cleared!!!");
}


//********** Indicators Sections *************//

function fnTradeSide(){
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    localStorage.setItem("TradeSideSwtS", objTradeSideVal.value);
}

function fnLoadTradeSide(){
    if(localStorage.getItem("TradeSideSwtS") === null){
        localStorage.setItem("TradeSideSwtS", "-1");
    }
    let lsTradeSideSwitchS = localStorage.getItem("TradeSideSwtS");
    let objTradeSideVal = document["frmSide"]["rdoTradeSide"];

    if(lsTradeSideSwitchS === "true"){
        objTradeSideVal.value = true;
    }
    else if(lsTradeSideSwitchS === "false"){
        objTradeSideVal.value = false;
    }
    else{
        objTradeSideVal.value = -1;
    }
}

//********** Indicators Sections *************//
