
window.addEventListener("DOMContentLoaded", function(){
    
    const objTxtMsg = document.getElementById("txtMessageToAll");
    
    socket.on("ServerEmit", (pMsg) => {
        const objDivMsgs = document.getElementById("divMessages");

        objDivMsgs.innerHTML += "<br />" + pMsg;
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