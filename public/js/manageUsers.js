
window.addEventListener("DOMContentLoaded", function(){
    fnGetSetDefaultValue();
    // fnGetUserData();
    fnLoadUserJsonData();
});

function fnChangeDispRecNos(objThis){
    let vCurrPage = document.getElementById("hidCurrPage");
    localStorage.setItem("lsRecords", objThis.value);

    vCurrPage.value = 1;

    fnGetUserData();
}

function fnGetUserData(){
    //let vUrl = localStorage.getItem("lsUrl");
    let objSortBy = document.getElementById("hidSortBy");
    let objOrderBy = document.getElementById("hidOrderBy");
    let objCurrPage = document.getElementById("hidCurrPage");

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "action": "feTch",
        "dispRecs": localStorage.getItem("lsRecords"),
        "cuurPage" : objCurrPage.value,
        "sortBy" : objSortBy.value,
        "orderBy" : parseInt(objOrderBy.value)
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
    
    fetch("/api/actionUsers", requestOptions)
        .then(response => response.json())
        .then(result => {

            fnFillUserData(result.data);
            //fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");

            fnFillPagination(result.vRecCount, "ulUserPagination");
            //console.log("result: ", result);
        })
        .catch(error => {
            fnGenMessage("Error: Unable to Load User Data, check URL", `badge bg-danger`, "spnGenMessage");
            // console.log('error: ', error);
        });
}

async function fnGetUserDetailsById(pId){
    let vResult = "";
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "action": "feTchById",
        "id": pId
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
        
    await fetch("/api/actionUsers", requestOptions)
        .then(response => response.json())
        .then(result => {

            //fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
            //console.log("msg: ", result);
            vResult = result;
        })
        .catch(error => {
            fnGenMessage("Error: Unable to Load User Data, check URL", `badge bg-danger`, "spnGenMessage");
            // console.log('error: ', error);
        });
    return vResult;
}

function fnFillUserData(objData){
    let vHtml = "";
    //console.log(objData)

    for(let i=0; i<objData.length; i++)
    {
        vHtml += "<tr>";
        vHtml += "<td class='text-end'>"+ new Date(objData[i].updatedAt).toLocaleString("en-IN") +"</td>";
        vHtml += "<td>"+ objData[i].fullName +"</td>";
        vHtml += "<td>"+ objData[i].phoneNumber +"</td>";
        vHtml += "<td>"+ objData[i].eMailId +"</td>";
        vHtml += "<td>"+ fnDisplayShortText(objData[i].password, 7); +"</td>";
        vHtml += "<td class='text-center'>";
        if(objData[i].isActive)
        {
            vHtml += `<i class='fa fa-eye' aria-hidden='true' style='color:green;' onclick="fnToggleUserActive('${objData[i]._id}', false);"></i>`;
        }
        else
        {
            vHtml += `<i class='fa fa-eye-slash' aria-hidden='true' style='color:red;' onclick="fnToggleUserActive('${objData[i]._id}', true);"></i>`;
        }
        vHtml += "<td class='text-center'>";
        if(objData[i].isAdmin)
        {
            vHtml += `<i class='fa fa-user-circle' aria-hidden='true' style='color:green;' onclick="fnToggleUserAdmin('${objData[i]._id}', false);"></i>`;
        }
        else
        {
            vHtml += `<i class='fa fa-user-circle' aria-hidden='true' style='color:gray;' onclick="fnToggleUserAdmin('${objData[i]._id}', true);"></i>`;
        }
        vHtml += "</td>";
        vHtml += "<td class='text-end'>";
        vHtml += `<i class="fa fa-edit" style="font-size:17px;color:green;cursor: pointer;" aria-hidden="true" onclick="fnShowUserMdlAE('edit', '${objData[i]._id}');"></i> &nbsp;&nbsp;`;
        vHtml += `<i class="fa fa-trash-o" style="font-size:17px;color:red;cursor: pointer;" aria-hidden="true" onclick="fnDelUserDetails('${objData[i]._id}');"></i>`;
        vHtml += "</td>";
        vHtml += "</tr>";
    }

    document.getElementById("tdUserData").innerHTML = vHtml;
    //console.log(objData.length);
}

function fnUserOrderBy(pSortBy){
    let objSortBy = document.getElementById("hidSortBy");
    let objOrderBy = document.getElementById("hidOrderBy");

    objSortBy.value = pSortBy;

    if(parseInt(objOrderBy.value) === 1)
    objOrderBy.value = -1;
    else
    objOrderBy.value = 1;

    fnGetUserData();
}

async function fnShowUserMdlAE(pAorE, pId){
    clearUserForm();

    if(pAorE === "add")
    {
        let btnSubmit = document.getElementById("btnUserFormAE");
        btnSubmit.onclick = function() {fnSaveUserDetails(pAorE)};

        fnGenMessage("Please Input User Details", `badge bg-primary`, "spnUserMsgAE");
        $('#mdlUserFormAE').modal('show');
    }
    else if (pAorE === "edit")
    {
        let result = await fnGetUserDetailsById(pId);

        if(result.status === "success")
        {
            let objId = document.getElementById("hidId");
            let objFullName = document.getElementById("txtFullName");
            let objEmailId = document.getElementById("txtEmailId");
            let objPassword = document.getElementById("txtPassword");
            let objConfirmPassword = document.getElementById("txtConfirmPassword");
            let objPhoneNumber = document.getElementById("txtPhoneNumber");
            let btnSubmit = document.getElementById("btnUserFormAE");
            let objOldPass = document.getElementById("hidOldPass");
        
            objId.value = result.data._id;
            objFullName.value = result.data.fullName;
            objEmailId.value = result.data.eMailId;
            objPassword.value = result.data.password;
            objConfirmPassword.value = result.data.password;
            objPhoneNumber.value = result.data.phoneNumber;
            objEmailId.disabled = true;
            objOldPass.value = result.data.password;
        
            btnSubmit.onclick = function() {fnSaveUserDetails(pAorE)};

            fnGenMessage("Please Update User Details", `badge bg-warning`, "spnUserMsgAE");
            $('#mdlUserFormAE').modal('show');
        }
        else
        {
            fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
        }
    }
}

function fnSaveUserDetails(pAorE){
    let objId = document.getElementById("hidId");
    let objFullName = document.getElementById("txtFullName");
    let objEmailId = document.getElementById("txtEmailId");
    let objPassword = document.getElementById("txtPassword");
    let objConfirmPassword = document.getElementById("txtConfirmPassword");
    let objPhoneNumber = document.getElementById("txtPhoneNumber");
    let objOldPass = document.getElementById("hidOldPass");

    if(objFullName.value === "")
    {
        fnGenMessage("Please Input Full Name", `badge bg-danger`, "spnUserMsgAE");
    }
    else if(objEmailId.value === "")
    {
        fnGenMessage("Please Input Valid Email ID", `badge bg-danger`, "spnUserMsgAE");
    }
    else if(objPassword.value === "" || objPassword.value !== objConfirmPassword.value)
    {
        fnGenMessage("Please Input Same Password and Confirm Password", `badge bg-danger`, "spnUserMsgAE");
    }
    else
    {
        //const vNow = new Date(Date.now());

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        if(pAorE === "add")
        {
            let vAction = JSON.stringify({
                "action": "aDd",
                "fullName" : objFullName.value,
                "phoneNumber" : objPhoneNumber.value,
                "eMailId" : objEmailId.value,
                "password" : objPassword.value
                // "createdAt" : vNow,
                // "updatedAt" : vNow
            });

            let requestOptions = {
                method: 'POST',
                headers: vHeaders,
                body: vAction,
                redirect: 'follow'
            };

            fetch("/api/actionUsers", requestOptions)
            .then(response => response.json())
            .then(result => {
                //console.log("result: ", result);
                fnGetUserData();
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
                $('#mdlUserFormAE').modal('hide');
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error: Unable to Add User Details.", `badge bg-danger`, "spnUserMsgAE");
            });
        }
        else if(pAorE === "edit")
        {
            let vAction = JSON.stringify({
                "action": "eDiT",
                "id" : objId.value,
                "fullName" : objFullName.value,
                "phoneNumber" : objPhoneNumber.value,
                "eMailId" : objEmailId.value,
                "password" : objPassword.value,
                "oldPassword" : objOldPass.value
                // "updatedAt" : vNow
            });

            let requestOptions = {
                method: 'POST',
                headers: vHeaders,
                body: vAction,
                redirect: 'follow'
            };

            fetch("/api/actionUsers", requestOptions)
            .then(response => response.json())
            .then(result => {
                //console.log("result: ", result);
                
                if(result.status === "danger")
                {
                    fnGenMessage("Error: Unable to Update User Details.", `badge bg-danger`, "spnUserMsgAE");
                }
                else
                {
                    fnGetUserData();
                    fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
                    $('#mdlUserFormAE').modal('hide');
                }
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("ErrorC: Unable to Update User Details.", `badge bg-danger`, "spnUserMsgAE");
            });
        }
        else
        {
            fnGenMessage("Invalid Option Received", `warning`, "spnGenMessage");
        }            
    }
}

function fnDelUserDetails(pRecId){
    if(confirm("Are You Sure, You Want to Delete this Record?"))
    {    
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let vAction = JSON.stringify({
            "action": "dEl",
            "id" : pRecId
        });

        let requestOptions = {
            method: 'POST',
            headers: vHeaders,
            body: vAction,
            redirect: 'follow'
        };
        
        fetch("/api/actionUsers", requestOptions)
            .then(response => response.json())
            .then(result => {
                //console.log("result: ", result);
                fnGetUserData();
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error: Unable to Delete User Details.", `badge bg-danger`, "spnGenMessage");
            });
    }
}

function fnToggleUserActive(pRecId, pActiveState){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "action": "aCtIvE",
        "id" : pRecId,
        "isActive": pActiveState
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
        
    fetch("/api/actionUsers", requestOptions)
    .then(response => response.json())
    .then(result => {
        //console.log("result: ", result);
        fnGetUserData();
        fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
    })
    .catch(error => {
        // console.log('error: ', error);
        fnGenMessage("Error: Unable to Update User Active State.", `badge bg-danger`, "spnGenMessage");
    });
}

function fnToggleUserAdmin(pRecId, pAdminState){
    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "action": "aDmIn",
        "id" : pRecId,
        "isAdmin": pAdminState
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
        
    fetch("/api/actionUsers", requestOptions)
    .then(response => response.json())
    .then(result => {
        //console.log("result: ", result);
        fnGetUserData();
        fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
    })
    .catch(error => {
        // console.log('error: ', error);
        fnGenMessage("Error: Unable to Update User State.", `badge bg-danger`, "spnGenMessage");
    });
}

function clearUserForm(){
    let objId = document.getElementById("hidId");
    let objFullName = document.getElementById("txtFullName");
    let objEmailId = document.getElementById("txtEmailId");
    let objPassword = document.getElementById("txtPassword");
    let objConfirmPassword = document.getElementById("txtConfirmPassword");
    let objPhoneNumber = document.getElementById("txtPhoneNumber");
    let objOldPass = document.getElementById("hidOldPass");

    objId.value = "";
    objFullName.value = "";
    objEmailId.value = "";
    objPassword.value = "";
    objConfirmPassword.value = "";
    objPhoneNumber.value = "";
    objOldPass.value = "";
    objEmailId.disabled = false;
}

function fnShowUserMdlAddJ(){
    //clearUserFormJ();
    fnGenMessage("Please Input User Details", `badge bg-primary`, "spnUserMsgAddJ");
    $('#mdlUserFormAddJ').modal('show');
}

function clearUserFormJ(){
    let objId = document.getElementById("hidIdJ");
    let objFullName = document.getElementById("txtFullNameJ");
    let objEmailId = document.getElementById("txtEmailIdJ");
    let objPassword = document.getElementById("txtPasswordJ");
    let objConfirmPassword = document.getElementById("txtConfirmPasswordJ");
    let objPhoneNumber = document.getElementById("txtPhoneNumberJ");
    let objOldPass = document.getElementById("hidOldPassJ");

    objId.value = "";
    objFullName.value = "";
    objEmailId.value = "";
    objPassword.value = "";
    objConfirmPassword.value = "";
    objPhoneNumber.value = "";
    objOldPass.value = "";
    objEmailId.disabled = false;
}

async function fnAddAdminUser(){
    let vId = fnGetIdFromDate();

    let objUserDet = await fnSaveAdminUserDetails(vId, "Anil Kumar K", "kamarthi.anil@gmail.com");

    if(objUserDet.status === "success"){

        document.getElementById("spnAdmUser").style.visibility = "hidden";
        fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");        
    }
    else{
        fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
    }
}

async function fnAddUserDetailsJ(){
    let objFullName = document.getElementById("txtFullNameJ");
    let objEmailId = document.getElementById("txtEmailIdJ");
    let objPassword = document.getElementById("txtPasswordJ");
    let objConfirmPassword = document.getElementById("txtConfirmPasswordJ");
    let objPhoneNumber = document.getElementById("txtPhoneNumberJ");

    if(objFullName.value === ""){
        fnGenMessage("Please Input Full Name", `badge bg-warning`, "spnUserMsgAddJ");
        objFullName.focus();
    }
    else if(objEmailId.value === ""){
        fnGenMessage("Please Input Valid Email ID", `badge bg-warning`, "spnUserMsgAddJ");
        objEmailId.focus();
    }
    else if(objPassword.value === "" || objPassword.value !== objConfirmPassword.value){
        fnGenMessage("Please Input Same Password and Confirm Password", `badge bg-warning`, "spnUserMsgAddJ");
        objPassword.focus();
    }
    else if(objPhoneNumber.value === ""){
        fnGenMessage("Please Input Valid Phone Number", `badge bg-warning`, "spnUserMsgAddJ");
        objPhoneNumber.focus();
    }
    else{
        let vId = fnGetIdFromDate();

        let objUserDet = await fnGetAddedUserDetailsJ(vId, objFullName.value, objEmailId.value, objPassword.value, objPhoneNumber.value, false, false);

        if(objUserDet.status === "success"){

            //console.log(objUserDet.data);
            fnLoadUserJsonData();
            $('#mdlUserFormAddJ').modal('hide');

            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnUserMsgAddJ");
        }
    }
}

function fnSaveAdminUserDetails(pUserId, pFullName, pEMailId){
    const objUserDet = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId, FullName: pFullName, EmailId: pEMailId }),
            redirect: 'follow'
        };

        fetch("/Users/saveAdminDetails", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in Saving Admin Details.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Saving Admin Details!", "data": "" });
            });

    });
    return objUserDet;
}

function fnGetAddedUserDetailsJ(pUserId, pFullName, pEMailId, pPassword, pPhoneNumber, pIsActive, pIsAdmin){
    const objUserDet = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId, FullName: pFullName, EmailId: pEMailId, Password: pPassword, PhoneNumber: pPhoneNumber, IsActive: pIsActive, IsAdmin: pIsAdmin }),
            redirect: 'follow'
        };

        fetch("/Users/saveUserDetails", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in Saving User Details.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Saving User Details!", "data": "" });
            });
    });
    return objUserDet;
}

async function fnLoadUserJsonData(){
    let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));
    let objUsersDiv = document.getElementById("divUsrPanel");
    
    if(objAppCred !== null){
        if(objAppCred.IsAdmin){
            objUsersDiv.style.display = "block";

            let objUserDet = await fnGetUserJsonData();

            if(objUserDet.status === "success"){
                fnFillUserJsonData(objUserDet.data.UserDet);
            }
            else if(objUserDet.status === "warning"){
                // console.log("Create Admin User!");

                document.getElementById("spnAdmUser").style.visibility = "visible";
                fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
            }
            else{
                fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
            }
        }
        else{
            objUsersDiv.style.display = "none";
        }
    }
    else{
        objUsersDiv.style.display = "none";
    }
}

function fnGetUserJsonData(){
    const objUserDet = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'GET',
            headers: vHeaders,
            redirect: 'follow'
        };

    fetch("/Users/getUserJsonData", objRequestData)
        .then(objResponse => objResponse.json())
        .then(objResult => {

            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
        })
        .catch(error => {
            // console.log('error: ', error);
            fnGenMessage("Error in Getting User Details.", `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting User Details!", "data": "" });
        });

    });
    return objUserDet;
}

function fnFillUserJsonData(objData){
    let vHtml = "";
    //console.log(objData)

    for(let i=0; i<objData.length; i++){
        vHtml += "<tr>";
        vHtml += "<td class='text-end'>"+ new Date(objData[i].UpdatedAt).toLocaleString("en-IN") +"</td>";
        vHtml += "<td>"+ objData[i].FullName +"</td>";
        vHtml += "<td>"+ objData[i].PhoneNumber +"</td>";
        vHtml += "<td>"+ objData[i].EmailId +"</td>";
        vHtml += "<td>"+ fnDisplayShortText(objData[i].Password, 10); +"</td>";
        vHtml += "<td class='text-center'>";
        if(objData[i].IsActive){
            vHtml += `<i class='fa fa-eye' aria-hidden='true' style='color:green;' onclick="fnToggleUserActiveJ('${objData[i].UserId}', false);"></i>`;
        }
        else{
            vHtml += `<i class='fa fa-eye-slash' aria-hidden='true' style='color:red;' onclick="fnToggleUserActiveJ('${objData[i].UserId}', true);"></i>`;
        }
        vHtml += "<td class='text-center'>";
        if(objData[i].IsAdmin){
            vHtml += `<i class='fa fa-user-circle' aria-hidden='true' style='color:green;' onclick="fnToggleUserAdminJ('${objData[i].UserId}', false);"></i>`;
        }
        else{
            vHtml += `<i class='fa fa-user-circle' aria-hidden='true' style='color:gray;' onclick="fnToggleUserAdminJ('${objData[i].UserId}', true);"></i>`;
        }
        vHtml += "</td>";
        vHtml += "<td class='text-end'>";
        vHtml += `<i class="fa fa-edit" style="font-size:17px;color:green;cursor: pointer;" aria-hidden="true" onclick="fnShowUserMdlEditJ('${objData[i].UserId}');"></i> &nbsp;&nbsp;`;
        vHtml += `<i class="fa fa-trash-o" style="font-size:17px;color:red;cursor: pointer;" aria-hidden="true" onclick="fnShowDelConfModel('${objData[i].UserId}');"></i>`;
        vHtml += "</td>";
        vHtml += "</tr>";
    }

    document.getElementById("tdUserDataJ").innerHTML = vHtml;
}

function fnShowDelConfModel(pUserId){    
    let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

    if(!objAppCred.IsActive){
        fnGenMessage("Your Login Status is InActive!", `badge bg-warning`, "spnGenMsg");
    }
    else if(parseInt(objAppCred.UserId) === parseInt(pUserId)){
        fnGenMessage("You can not Delete Your Own Account!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objAppCred.IsAdmin){
        document.getElementById("hidActUserId").value = pUserId;
        document.getElementById("txtDelPwd").value = "";
        fnGenMessage("Please Input Password!", `badge bg-primary`, "spnDelMdlMsg");
        $('#mdlDelUserJ').modal('show');
    }
    else{
        fnGenMessage("You do not have Delete Rights!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnSubmitDelUser(){
    let objDelPwd = document.getElementById("txtDelPwd");

    if(objDelPwd.value === ""){
        fnGenMessage("Please Input Password to Delete!", `badge bg-warning`, "spnDelMdlMsg");
        objDelPwd.focus();
    }
    else{
        let objUserDet = await fnDeleteUserDetails(document.getElementById("hidActUserId").value, objDelPwd.value);

        if(objUserDet.status === "success"){
            fnLoadUserJsonData();
            $('#mdlDelUserJ').modal('hide');
            document.getElementById("hidActUserId").value = "";
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnDelMdlMsg");
        }
    }
}

function fnDeleteUserDetails(pUserId, pPassword){
    const objUserDet = new Promise((resolve, reject) => {
        let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId, Password: pPassword, EncPwd: objAppCred.Password }),
            redirect: 'follow'
        };

        fetch("/Users/deleteUserDetails", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in Deleting User Details.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Deleting User Details!", "data": "" });
            });
    });
    return objUserDet;
}

function fnToggleUserAdminJ(pUserId, pIsAdmin){
    let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

    if(!objAppCred.IsActive){
        fnGenMessage("Your Login Status is InActive", `badge bg-warning`, "spnGenMsg");
    }
    else if(parseInt(objAppCred.UserId) === parseInt(pUserId)){
        fnGenMessage("You can not make or remove yourself as Admin!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objAppCred.IsAdmin){
        document.getElementById("hidActUserId").value = pUserId;
        document.getElementById("hidToggleAct").value = pIsAdmin;
        document.getElementById("txtAdmPwd").value = "";
        fnGenMessage("Please Input Password!", `badge bg-primary`, "spnAdmMdlMsg");
        $('#mdlAdminUserJ').modal('show');
    }
    else{
        fnGenMessage("You do not have Rights to Change!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnSubmitAdmUser(){
    let objAdmPwd = document.getElementById("txtAdmPwd");

    if(objAdmPwd.value === ""){
        fnGenMessage("Please Input Password to Change Admin Rights!", `badge bg-warning`, "spnAdmMdlMsg");
        objAdmPwd.focus();
    }
    else{
        let objUserDet = await fnAdmRightsUserDetails(document.getElementById("hidActUserId").value, document.getElementById("hidToggleAct").value, objAdmPwd.value);

        if(objUserDet.status === "success"){
            fnLoadUserJsonData();
            $('#mdlAdminUserJ').modal('hide');
            document.getElementById("hidActUserId").value = "";
            document.getElementById("hidToggleAct").value = "";
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnAdmMdlMsg");
        }
    }
}

function fnAdmRightsUserDetails(pUserId, pIsAdmin, pPassword){
    const objUserDet = new Promise((resolve, reject) => {
        let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId, IsAdmin: pIsAdmin, Password: pPassword, EncPwd: objAppCred.Password }),
            redirect: 'follow'
        };

        fetch("/Users/toggleAdmUserRights", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in Changing User Rights.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Changing User Rights!", "data": "" });
            });
    });
    return objUserDet;
}

function fnToggleUserActiveJ(pUserId, pIsActive){
    let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

    if(!objAppCred.IsActive){
        fnGenMessage("Your Login Status is InActive", `badge bg-warning`, "spnGenMsg");
    }
    else if(parseInt(objAppCred.UserId) === parseInt(pUserId)){
        fnGenMessage("You can not Activate or Deactivate yourself!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objAppCred.IsAdmin){
        document.getElementById("hidActUserId").value = pUserId;
        document.getElementById("hidToggleAct").value = pIsActive;
        document.getElementById("txActivePwd").value = "";
        fnGenMessage("Please Input Password!", `badge bg-primary`, "spnActiveMdlMsg");
        $('#mdlActiveUserJ').modal('show');
    }
    else{
        fnGenMessage("You do not have Rights to Change!", `badge bg-warning`, "spnGenMsg");
    }
}

async function fnSubmitActiveUser(){
    let objActivePwd = document.getElementById("txActivePwd");

    if(objActivePwd.value === ""){
        fnGenMessage("Please Input Password to Change User Active State!", `badge bg-warning`, "spnActiveMdlMsg");
        objActivePwd.focus();
    }
    else{
        let objUserDet = await fnUserActiveState(document.getElementById("hidActUserId").value, document.getElementById("hidToggleAct").value, objActivePwd.value);

        if(objUserDet.status === "success"){
            fnLoadUserJsonData();
            $('#mdlActiveUserJ').modal('hide');
            document.getElementById("hidActUserId").value = "";
            document.getElementById("hidToggleAct").value = "";
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnActiveMdlMsg");
        }
    }
}

function fnUserActiveState(pUserId, pIsActive, pPassword){
    const objUserDet = new Promise((resolve, reject) => {
        let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId, IsActive: pIsActive, Password: pPassword, EncPwd: objAppCred.Password }),
            redirect: 'follow'
        };

        fetch("/Users/toggleUserActiveState", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in Changing User Active State.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Changing User Active State!", "data": "" });
            });
    });
    return objUserDet;
}

async function fnShowUserMdlEditJ(pUserId){
    let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));

    if(!objAppCred.IsActive){
        fnGenMessage("Your Login Status is InActive!", `badge bg-warning`, "spnGenMsg");
    }
    else if(objAppCred.IsAdmin){
        document.getElementById("hidActUserId").value = pUserId;
        let objUserDet = await fnGetUserJsonDataById(pUserId);

        if(objUserDet.status === "success"){
            document.getElementById("txtFullNameEdJ").value = objUserDet.data.FullName;
            document.getElementById("txtEmailIdEdJ").value = objUserDet.data.EmailId;
            document.getElementById("txtPasswordEdJ").value = "";
            document.getElementById("txtConfirmPasswordEdJ").value = "";
            document.getElementById("txtPhoneNumberEdJ").value = objUserDet.data.PhoneNumber;
            document.getElementById("txtYourPasswordEdJ").value = "";

            //console.log(objUserDet);
            fnGenMessage("Update User Details!", `badge bg-primary`, "spnUserMsgEditJ");
            $('#mdlUserFormEditJ').modal('show');
        }
        else{
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
        }
    }
    else{
        fnGenMessage("You do not have Edit Rights!", `badge bg-warning`, "spnGenMsg");
    }
}

function fnGetUserJsonDataById(pUserId){
    const objUserDet = new Promise((resolve, reject) => {
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId }),
            redirect: 'follow'
        };

    fetch("/Users/getUserJsonDataById", objRequestData)
        .then(objResponse => objResponse.json())
        .then(objResult => {

            resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
        })
        .catch(error => {
            // console.log('error: ', error);
            fnGenMessage("Error in Getting User Details for Editing!", `badge bg-danger`, "spnGenMsg");
            reject({ "status": "danger", "message": "Error in Getting User Details for Editing!", "data": "" });
        });

    });
    return objUserDet;
}

async function fnUpdateUserDetailsJ(){
    let objFullName = document.getElementById("txtFullNameEdJ");
    let objEmailId = document.getElementById("txtEmailIdEdJ");
    let objPassword = document.getElementById("txtPasswordEdJ");
    let objConfirmPassword = document.getElementById("txtConfirmPasswordEdJ");
    let objPhoneNumber = document.getElementById("txtPhoneNumberEdJ");
    let objYourPasswordEdJ = document.getElementById("txtYourPasswordEdJ");

    if(objFullName.value === ""){
        fnGenMessage("Please Input Full Name!", `badge bg-warning`, "spnUserMsgEditJ");
        objFullName.focus();
    }
    else if(objEmailId.value === ""){
        fnGenMessage("Please Input Valid Email ID!", `badge bg-warning`, "spnUserMsgEditJ");
        objEmailId.focus();
    }
    else if(objPassword.value !== objConfirmPassword.value){
        fnGenMessage("Please Input Same Password and Confirm Password!", `badge bg-warning`, "spnUserMsgEditJ");
        objPassword.focus();
    }
    else if(objPhoneNumber.value === ""){
        fnGenMessage("Please Input Valid Phone Number!", `badge bg-warning`, "spnUserMsgEditJ");
        objPhoneNumber.focus();
    }
    else if(objYourPasswordEdJ.value === ""){
        fnGenMessage("Please Input Your Password to Update Profile!", `badge bg-warning`, "spnUserMsgEditJ");
        objYourPasswordEdJ.focus();
    }
    else{
        let objId = document.getElementById("hidActUserId");

        let objUserDet = await fnGetUpdatedUserDetailsJ(objId.value, objFullName.value, objEmailId.value, objPassword.value, objPhoneNumber.value, objYourPasswordEdJ.value);

        if(objUserDet.status === "success"){

            //console.log(objUserDet.data);
            fnLoadUserJsonData();
            $('#mdlUserFormEditJ').modal('hide');

            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnGenMsg");
        }
        else{
            fnGenMessage(objUserDet.message, `badge bg-${objUserDet.status}`, "spnUserMsgEditJ");
        }
    }
}

function fnGetUpdatedUserDetailsJ(pUserId, pFullName, pEMailId, pPassword, pPhoneNumber, pAdminPassword){
    const objUserDet = new Promise((resolve, reject) => {
        let objAppCred = JSON.parse(localStorage.getItem("AppCredS"));
        let vHeaders = new Headers();
        vHeaders.append("Content-Type", "application/json");

        let objRequestData = {
            method: 'POST',
            headers: vHeaders,
            body: JSON.stringify({ UserId: pUserId, FullName: pFullName, EmailId: pEMailId, Password: pPassword, PhoneNumber: pPhoneNumber, AdminPwd: pAdminPassword, EncPwd: objAppCred.Password }),
            redirect: 'follow'
        };

        fetch("/Users/updateUserJsonDetails", objRequestData)
            .then(objResponse => objResponse.json())
            .then(objResult => {

                resolve({ "status": objResult.status, "message": objResult.message, "data": objResult.data });            
            })
            .catch(error => {
                // console.log('error: ', error);
                fnGenMessage("Error in Updating User Details.", `badge bg-danger`, "spnGenMsg");
                reject({ "status": "danger", "message": "Error in Updating User Details!", "data": "" });
            });
    });
    return objUserDet;
}
