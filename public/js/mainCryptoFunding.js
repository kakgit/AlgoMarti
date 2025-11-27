window.addEventListener("DOMContentLoaded", function(){
    fnGetAllStatus();

});

function fnGetAllStatus(){
	let bAppStatus = JSON.parse(localStorage.getItem("AppMsgStatusS"));

	if(bAppStatus){
		fnLoadLoginCred();
        fnGetSetTraderLoginStatus();
		fnGetSetAutoTraderStatus();
	}	
}