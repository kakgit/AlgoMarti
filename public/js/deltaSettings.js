
function fnShowTraderLoginMdl(objThis){
    let bAppStatus = localStorage.getItem("AppMsgStatusS");

    if(bAppStatus === "false"){
        //$('#mdlAppLogin').modal('show');
        fnGenMessage("First Login to App for Trading Account Login!", `badge bg-warning`, "spnGenMsg");
        // fnGetSetAllStatus();
    }
    else if(objThis.className === "badge bg-danger"){
        $('#mdlDeltaLogin').modal('show');
        // fnGetSetAllStatus();
    }
    else{
        // fnClearPrevTraderSession();
        // fnGetSetTraderLoginStatus();
        fnGenMessage("Trader Disconnected Successfully!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnLoginDeltaExc(){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({ });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };

    fetch("/deltaExc/getLoginDetails", requestOptions)
    .then(response => response.json())
    .then(objResult => {
        if(objResult.status === "success"){
            const vDate = new Date();
            let vToday = vDate.getDate();            
            localStorage.setItem("lsLoginDate", vToday);

            $('#mdlDeltaLogin').modal('hide');
            console.log(JSON.parse(objResult.data));

            // fnGetSetTraderLoginStatus();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "danger"){
            // fnClearPrevLoginSession();
            console.log(objResult.data)
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else if(objResult.status === "warning"){
            // fnClearPrevLoginSession();
            fnGenMessage(objResult.message, `badge bg-${objResult.status}`, "spnGenMsg");
        }
        else{
            // fnClearPrevLoginSession();
            fnGenMessage("Error in Login, Contact Admin.", `badge bg-danger`, "spnGenMsg");
        }
    })
    .catch(error => {
        // fnClearPrevLoginSession();
        fnGenMessage("Error to Fetch with Login Details.", `badge bg-danger`, "spnGenMsg");
    });
}

function fnTest(){
    const objDate = new Date();
    let vTimeStamp = (objDate.valueOf()).toString();
    var myDate = new Date(vTimeStamp);

    const timestamp = String(Math.floor(Date.now() / 1000));

    // var result;
    // time = parseInt(time);
    // var msec = time/1000; // convert __REALTIME_TIMESTAMP to milliseconds from microseconds
    // var myDate = new Date(msec);
    // var isoDate = myDate.toISOString();

    console.log(timestamp);
}