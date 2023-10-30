
window.addEventListener("DOMContentLoaded", function(){
    fnGetSetDefaultValue();
    fnGetUserData();
});

function fnChangeDispRecNos(objThis)
{
    let vCurrPage = document.getElementById("hidCurrPage");
    localStorage.setItem("lsRecords", objThis.value);

    vCurrPage.value = 1;

    fnGetUserData();
}

function fnGetUserData()
{
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
            console.log('error: ', error);
        });
}

async function fnGetUserDetailsById(pId)
{
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
            console.log('error: ', error);
        });
    return vResult;
}

function fnFillUserData(objData)
{
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

function fnUserOrderBy(pSortBy)
{
    let objSortBy = document.getElementById("hidSortBy");
    let objOrderBy = document.getElementById("hidOrderBy");

    objSortBy.value = pSortBy;

    if(parseInt(objOrderBy.value) === 1)
    objOrderBy.value = -1;
    else
    objOrderBy.value = 1;

    fnGetUserData();
}

async function fnShowUserMdlAE(pAorE, pId)
{
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

function fnSaveUserDetails(pAorE)
{
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
                console.log('error: ', error);
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
                console.log('error: ', error);
                fnGenMessage("ErrorC: Unable to Update User Details.", `badge bg-danger`, "spnUserMsgAE");
            });
        }
        else
        {
            fnGenMessage("Invalid Option Received", `warning`, "spnGenMessage");
        }            
    }
}

async function fnAddNewUserDetails()
{
    const vNow = fnGetCurrDate();

    let vHeaders = new Headers();
    vHeaders.append("Content-Type", "application/json");

    let vAction = JSON.stringify({
        "action": "aDd",
        "fullName" : "Anil",
        "phoneNumber" : "1231231232",
        "eMailId" : "asds@asad.com",
        "password" : "aaa",
        "isActive" : true
        // "createdAt" : vNow,
        // "updatedAt" : vNow
    });

    let requestOptions = {
        method: 'POST',
        headers: vHeaders,
        body: vAction,
        redirect: 'follow'
    };
    
    //console.log(vAction);

    document.getElementById("divLoading").style.visibility = "visible";
    
    //await new Promise(resolve => setTimeout(resolve, 3000));

    fetch("/api/actionUsers", requestOptions)
        .then(response => response.json())
        .then(result => {
            //console.log(result);
            if(result.status === "success")
            {
                fnGetUserData();
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
            }
            else if(result.status === "danger")
            {
                if(result.data.code === 11000)
                {
                    fnGenMessage("Email-ID Already exists, Pls Check.", `badge bg-${result.status}`, "spnGenMessage");
                }
                else
                {
                    fnGenMessage("New Code " + result.message, `badge bg-${result.status}`, "spnGenMessage");
                }
            }
            else
            {
                fnGenMessage(result.message, `badge bg-${result.status}`, "spnGenMessage");
            }
        })
        .catch(error => {
            console.log('error: ', error);
            fnGenMessage("Error: Unable to Add User Details.", `badge bg-danger`, "spnGenMessage");
        });
    document.getElementById("divLoading").style.visibility = "hidden";
}

function fnDelUserDetails(pRecId)
{
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
                console.log('error: ', error);
                fnGenMessage("Error: Unable to Delete User Details.", `badge bg-danger`, "spnGenMessage");
            });
    }
}

function fnToggleUserActive(pRecId, pActiveState)
{
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
        console.log('error: ', error);
        fnGenMessage("Error: Unable to Update User Active State.", `badge bg-danger`, "spnGenMessage");
    });

}

function fnToggleUserAdmin(pRecId, pAdminState)
{
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
        console.log('error: ', error);
        fnGenMessage("Error: Unable to Update User State.", `badge bg-danger`, "spnGenMessage");
    });

}

function clearUserForm()
{
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