let objKNeoWS = null;

function fnConnectionWS(){
    var vToken = document.getElementById("txtAccessToken").value;
    var vSid = document.getElementById("txtSid").value;
    var vServerIdHS = document.getElementById("txtHsServerId").value;
    
    // if(vConnectionType=='Hsi'){
    //     connectHsi(vToken, vSid, vServerIdHS);    
        
    // }
    // else if(vConnectionType=='Hsm'){
        fnConnectHSM(vToken, vSid);  
    // }
        
    return;
}

function fnConnectHSM(token, sid){
    let objCurrPos = JSON.parse(localStorage.getItem("KotakCurrOptPosiS"));
    let objIndexTick = document.getElementById("hidSpotPrice");
    let objScriptTick = document.getElementById("txtCurrentRate");

    let objTokenCE = document.getElementById("hidTokenCE");
    let objTokenPE = document.getElementById("hidTokenPE");

    let url = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
    objKNeoWS = new HSWebSocket(url);

    objKNeoWS.onopen = function () {
        console.log('[Socket]: Connected to "' + url + '"\n');
        let jObj = {};
        jObj["Authorization"] = token;
        jObj["Sid"] = sid; 
        jObj["type"] = "cn";
        objKNeoWS.send(JSON.stringify(jObj));
    }

    objKNeoWS.onclose = function () {
        console.log("[Socket]: Disconnected !\n");
        fnConnectionWS("Hsm");
    }

    objKNeoWS.onerror = function () {
        console.log("[Socket]: Error !\n");
    }

    objKNeoWS.onmessage = function (objMsg) {
        const objRes= JSON.parse(objMsg);
        // console.log('[Res]: ' + objMsg + "\n");

        if((objRes[0].name === "if")){
            if(objRes[0].iv !== undefined){
                objIndexTick.value = objRes[0].iv;
            }
        }

        if(objRes[0].name === "sf"){
            if(objRes[0].ltp !== undefined){
                objScriptTick.value = objRes[0].ltp;
                // console.log(objRes[0].ltp);
            }
        }

        if(objRes[0].type === "cn"){
            if(objCurrPos !== null){
                fnRestartOptionStream();
            }
            // wsub('ifs', 'sub_indices', '5');
            // setTimeout(wsub, 1000, 'mws', 'sub_scrips', '6');
            // wsub('mws', 'sub_scrips', '2');
        }
    }
}

function fnSubFeeds(typeRequest, scrips, channel_number){
    let vRes = "";
    //mws ifs dps 
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    if (objKNeoWS != null) {
        objKNeoWS.send(JSON.stringify(jObj));
    }
    else{
        console.log("Websocket Inactive, Connecting please wait....")
        fnConnectionWS();
    }
    return true;
}

function fnUnSubTickerData(typeRequest, scrips, channel_number){
//mwu
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    // if (objKNeoWS != null) {
        objKNeoWS.send(JSON.stringify(jObj));
    // }
    // else{
    //     console.log("Please Connect to Websocket.......")
    // }    
}