function connectHsm(token, sid)
{
    let url = "wss://mlhsm.kotaksecurities.com"; //<!--wss://qhsm.kotaksecurities.online/is for UAT with VPN,wss://mlhsm.kotaksecurities.com/ for prod   -->
    userWS = new HSWebSocket(url);
    console.log(document.getElementById('channel_number').value)


    userWS.onopen = function () {
        consoleLog('[Socket]: Connected to "' + url + '"\n');
        let jObj = {};
        jObj["Authorization"] = token;
        jObj["Sid"] = sid; 
        jObj["type"] = "cn";
        userWS.send(JSON.stringify(jObj));
    }

    userWS.onclose = function () {
        consoleLog("[Socket]: Disconnected !\n");
    }

    userWS.onerror = function () {
        consoleLog("[Socket]: Error !\n");
    }

    userWS.onmessage = function (msg) {
        const result= JSON.parse(msg);
        consoleLog('[Res]: ' + msg + "\n");
    }
}
resumeandpause = function(typeRequest,channel_number) {
    let jObj = {};
    jObj["type"] = typeRequest;
    jObj["channelnums"] = channel_number.split(',').map(function (val) { return parseInt(val, 10); })
    if (userWS != null) {
        let req = JSON.stringify(jObj);
       userWS.send(req);
    }
}


function subscribe_scrip(typeRequest,scrips,channel_number)
{
	//  mws ifs dps	
    let jObj = {"type":typeRequest, "scrips":scrips, "channelnum":channel_number};
    userWS.send(JSON.stringify(jObj));
}

function connectHsi(token,sid,handshakeServerId)
{
    let url = "wss://mlhsi.kotaksecurities.com/realtime?sId="+handshakeServerId;  //<!--qhsiftws.kotaksecurities.online(b2b),qhsi.kotaksecurities.online/realtime  -->
    hsWs = new HSIWebSocket(url);

    hsWs.onopen = function () {
        consoleLog1('[Socket]: Connected to "' + url + '"\n');

        let hsijObj = {};
        hsijObj["type"] = "cn";
        hsijObj["Authorization"] = token;
        hsijObj["Sid"] = sid;
        hsijObj["source"] = "WEB";
        hsWs.send(JSON.stringify(hsijObj));
    }

    hsWs.onclose = function () {
        consoleLog1("[Socket]: Disconnected !\n");
    }

    hsWs.onerror = function () {
        consoleLog1("[Socket]: Error !\n");
    }

    hsWs.onmessage = function (msg) {
        consoleLog1('[Res]: ' + msg + "\n");
    }
}