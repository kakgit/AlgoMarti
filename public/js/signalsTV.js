let isEURUSDCMA = -1;
let isEURUSDNADR = -1;

let isEURJPYCMA = -1;
let isEURJPYNADR = -1;

let isOTCCMA = -1;
let isOTCNADR = -1;

window.addEventListener("DOMContentLoaded", function(){

    fnLoadLabelsTV();

    socket.on("MaheshEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");
        const objMsg = JSON.parse(pMsg);
        // let vDirec = "";

        // if(objMsg.direction === "UP")
        //     vDirec = true;
        // else if(objMsg.direction === "DN")
        //     vDirec = false;
        // else
        //     vDirec = objMsg.direction;

        fnSetSignal(objMsg);

            objDivMsgs.innerHTML += "<p>" + objMsg.symbolName + " - " + objMsg.indType + " - "  + objMsg.direction + "</p>";
            objDivMsgs.scrollTop = objDivMsgs.scrollHeight;
    });

});

function fnSetSignal(objMsg)
{
    if(objMsg.symbolName === "EURUSD")
    {
        fnSetEurUsd(objMsg);
    }
    else if(objMsg.symbolName === "EURJPY")
    {
        fnSetEurJpy(objMsg);
    }
    else if(objMsg.symbolName === "OTC")
    {
        fnSetOtc(objMsg);
    }
    //console.log(objMsg.symbolName);
}

function fnSetEurUsd(objMsg)
{
    let objCma = document.getElementById("spnEurUsdCMA");
    let objNadr = document.getElementById("spnEurUsdNADR");
    let objBoth = document.getElementById("spnEurUsdBoth");

    if(objMsg.indType === "CMA")
    {
        if(objMsg.direction === "UP")
        {
            isEURUSDCMA = 1;
        }
        else if(objMsg.direction === "DN")
        {
            isEURUSDCMA = 0;
        }
        else
        {
            isEURUSDCMA = -1;
        }
    }
    else if(objMsg.indType === "NADR")
    {
        if(objMsg.direction === "UP")
        {
            isEURUSDNADR = 1;
        }
        else if(objMsg.direction === "DN")
        {
            isEURUSDNADR = 0;
        }
        else
        {
            isEURUSDNADR = -1;
        }
    }

    if(isEURUSDCMA === 1)
    {
        objCma.className = "badge rounded-pill text-bg-success";
    }
    else if(isEURUSDCMA === 0)
    {
        objCma.className = "badge rounded-pill text-bg-danger";
    }
    else
    {
        objCma.className = "badge rounded-pill text-bg-warning";
    }

    if(isEURUSDNADR === 1)
    {
        objNadr.className = "badge rounded-pill text-bg-success";        
    }
    else if(isEURUSDNADR === 0)
    {
        objNadr.className = "badge rounded-pill text-bg-danger";        
    }
    else
    {
        objNadr.className = "badge rounded-pill text-bg-warning";        
    }

    if((isEURUSDCMA === 1) && (isEURUSDNADR === 1))
    {
        objBoth.className = "badge rounded-pill text-bg-success";        
    }
    else if((isEURUSDCMA === 0) && (isEURUSDNADR === 0))
    {
        objBoth.className = "badge rounded-pill text-bg-danger";        
    }
    else
    {
        objBoth.className = "badge rounded-pill text-bg-warning";        
    }
}

function fnSetEurJpy(objMsg)
{
    let objCma = document.getElementById("spnEurJpyCMA");
    let objNadr = document.getElementById("spnEurJpyNADR");
    let objBoth = document.getElementById("spnEurJpyBoth");

    if(objMsg.indType === "CMA")
    {
        if(objMsg.direction === "UP")
        {
            isEURJPYCMA = 1;
        }
        else if(objMsg.direction === "DN")
        {
            isEURJPYCMA = 0;
        }
        else
        {
            isEURJPYCMA = -1;
        }
    }
    else if(objMsg.indType === "NADR")
    {
        if(objMsg.direction === "UP")
        {
            isEURJPYNADR = 1;
        }
        else if(objMsg.direction === "DN")
        {
            isEURJPYNADR = 0;
        }
        else
        {
            isEURJPYNADR = -1;
        }
    }

    if(isEURJPYCMA === 1)
    {
        objCma.className = "badge rounded-pill text-bg-success";
    }
    else if(isEURJPYCMA === 0)
    {
        objCma.className = "badge rounded-pill text-bg-danger";
    }
    else
    {
        objCma.className = "badge rounded-pill text-bg-warning";
    }

    if(isEURJPYNADR === 1)
    {
        objNadr.className = "badge rounded-pill text-bg-success";        
    }
    else if(isEURJPYNADR === 0)
    {
        objNadr.className = "badge rounded-pill text-bg-danger";        
    }
    else
    {
        objNadr.className = "badge rounded-pill text-bg-warning";        
    }

    if((isEURJPYCMA === 1) && (isEURJPYNADR === 1))
    {
        objBoth.className = "badge rounded-pill text-bg-success";        
    }
    else if((isEURJPYCMA === 0) && (isEURJPYNADR === 0))
    {
        objBoth.className = "badge rounded-pill text-bg-danger";        
    }
    else
    {
        objBoth.className = "badge rounded-pill text-bg-warning";        
    }
}

function fnSetOtc(objMsg)
{
    let objCma = document.getElementById("spnOtcCMA");
    let objNadr = document.getElementById("spnOtcNADR");
    let objBoth = document.getElementById("spnOtcBoth");

    if(objMsg.indType === "CMA")
    {
        if(objMsg.direction === "UP")
        {
            isOTCCMA = 1;
        }
        else if(objMsg.direction === "DN")
        {
            isOTCCMA = 0;
        }
        else
        {
            isOTCCMA = -1;
        }
    }
    else if(objMsg.indType === "NADR")
    {
        if(objMsg.direction === "UP")
        {
            isOTCNADR = 1;
        }
        else if(objMsg.direction === "DN")
        {
            isOTCNADR = 0;
        }
        else
        {
            isOTCNADR = -1;
        }
    }

    if(isOTCCMA === 1)
    {
        objCma.className = "badge rounded-pill text-bg-success";
    }
    else if(isOTCCMA === 0)
    {
        objCma.className = "badge rounded-pill text-bg-danger";
    }
    else
    {
        objCma.className = "badge rounded-pill text-bg-warning";
    }

    if(isOTCNADR === 1)
    {
        objNadr.className = "badge rounded-pill text-bg-success";        
    }
    else if(isOTCNADR === 0)
    {
        objNadr.className = "badge rounded-pill text-bg-danger";        
    }
    else
    {
        objNadr.className = "badge rounded-pill text-bg-warning";        
    }

    if((isOTCCMA === 1) && (isOTCNADR === 1))
    {
        objBoth.className = "badge rounded-pill text-bg-success";        
    }
    else if((isOTCCMA === 0) && (isOTCNADR === 0))
    {
        objBoth.className = "badge rounded-pill text-bg-danger";        
    }
    else
    {
        objBoth.className = "badge rounded-pill text-bg-warning";        
    }
}
function fnSetClientSignal(pSymbolName, pIndType, pDirection)
{
let objMsg = JSON.stringify({symbolName: pSymbolName, indType: pIndType, direction: pDirection});

socket.emit("MaheshMsg", objMsg);
}

function fnClearLabelsData() {
    localStorage.removeItem("LabelListS");
    console.log("Cleared Data!")
}

function fnAddEddLabelsTV(pObj, pId) {
    var objLblLst = localStorage.getItem("LabelListS");

    var vExistingData = JSON.parse(objLblLst);

    ////for (var i = 0; i < vExistingData.LabelsData.length; i++) {
    ////    if (vExistingData.LabelsData[i].vLblId)
    ////}
    if (pObj.innerText == "")
        vExistingData[pId] = " ";
    else
        vExistingData[pId] = pObj.innerText;


    var vEditedItems = JSON.stringify(vExistingData);
    console.log(vEditedItems);
    localStorage.setItem("LabelListS", vEditedItems);
    fnLoadLabelsTV();
}

function fnLoadLabelsTV() {
    var objLblLst = localStorage.getItem("LabelListS");

    if ((objLblLst == null) || (objLblLst == "")) {
        //const vLblDet = { LabelsData: [{ lblS1: "Strategy", lblS2: "Strategy", lblS3: "Strategy", lblS4: "Strategy", lblS5: "Strategy", lblS6: "Strategy", lblS7: "Strategy", lblS82: "Strategy", lblS9: "Strategy" }] };
        const vLblDet = ["Strategy", "Strategy", "Strategy", "Strategy", "Strategy", "Strategy", "Strategy", "Strategy", "Strategy"];
        var vFirstTime = JSON.stringify(vLblDet);
        localStorage.setItem("LabelListS", vFirstTime);
    }

    var objLblLst1 = localStorage.getItem("LabelListS");
    var vExistingData = JSON.parse(objLblLst1);

    document.getElementById("lblS1").innerText = vExistingData[0];
    document.getElementById("lblS2").innerText = vExistingData[1];
    document.getElementById("lblS3").innerText = vExistingData[2];
    document.getElementById("lblS4").innerText = vExistingData[3];
    document.getElementById("lblS5").innerText = vExistingData[4];
    document.getElementById("lblS6").innerText = vExistingData[5];
    document.getElementById("lblS7").innerText = vExistingData[6];
    document.getElementById("lblS8").innerText = vExistingData[7];
    document.getElementById("lblS9").innerText = vExistingData[8];

    console.log(objLblLst1);
}
