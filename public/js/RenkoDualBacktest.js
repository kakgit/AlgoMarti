function fnGetRunPayload(){
    const objForm = document.getElementById("frmRenkoDualBacktest");
    const objData = new FormData(objForm);
    const objPayload = {};
    for(const [k, v] of objData.entries()){
        objPayload[k] = String(v ?? "").trim();
    }
    return objPayload;
}

function fnSetRunStatus(pTxt, pCls = "bg-secondary"){
    const obj = document.getElementById("spnRunStatus");
    obj.className = `badge ${pCls}`;
    obj.innerText = pTxt;
}

function fnSetRunResult(pResp){
    document.getElementById("spnRunMsg").innerText = pResp?.message || "-";
    document.getElementById("spnRunDuration").innerText = (pResp?.data?.durationMs ?? "-");
    document.getElementById("spnExitCode").innerText = (pResp?.data?.exitCode ?? "-");
    document.getElementById("txtStdOut").value = pResp?.data?.stdout || "";
    document.getElementById("txtStdErr").value = pResp?.data?.stderr || "";
}

async function fnRunRenkoBacktest(pEvent){
    pEvent.preventDefault();
    const objBtn = document.getElementById("btnRunBacktest");
    objBtn.disabled = true;
    fnSetRunStatus("Running", "bg-warning");
    document.getElementById("spnRunMsg").innerText = "Backtest started...";

    try{
        const objResp = await fetch("/renkoDualBacktest/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fnGetRunPayload())
        });
        const objData = await objResp.json();
        fnSetRunResult(objData);
        fnSetRunStatus(objData?.status === "success" ? "Success" : "Failed", objData?.status === "success" ? "bg-success" : "bg-danger");
    }
    catch(objErr){
        fnSetRunResult({
            message: "Request failed.",
            data: { stdout: "", stderr: objErr?.message || String(objErr), durationMs: "-", exitCode: "-" }
        });
        fnSetRunStatus("Failed", "bg-danger");
    }
    finally{
        objBtn.disabled = false;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const objForm = document.getElementById("frmRenkoDualBacktest");
    if(objForm){
        objForm.addEventListener("submit", fnRunRenkoBacktest);
    }
});

