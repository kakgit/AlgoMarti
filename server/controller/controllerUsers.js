const mdlUsers = require('../model/mdlUsers.js');
const bcrypt = require("bcryptjs");
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

exports.fnUsersDefault = (req, res) => {

    res.render("users/usersHome.ejs");
    //console.log("Server OK");
}

exports.fnActions = async (req, res) => {
    let vAction = req.body.action;

    //console.log("action: " + vAction);

    if(vAction === "feTch")
    {
        const objData = await fnGetUsersData(req, res);

        res.send(objData);
    }
    else if(vAction === "aDd")
    {
        const objData = await fnAddNewUserData(req, res);

        //return objData;
        res.send(objData);
    }
    else if(vAction === "eDiT")
    {
        const objData = await fnUpdateUserData(req, res);

        res.send(objData);
    }
    else if(vAction === "dEl")
    {
        const objData = await fnDelUserData(req, res);

        res.send(objData);
    }
    else if(vAction === "feTchById")
    {
        const objData = await fnGetUsersDataById(req, res);

        res.send(objData);
    }
    else if(vAction === "aCtIvE")
    {
        const objData = await fnUpdateUserActive(req, res);

        res.send(objData);
    }
    else if(vAction === "aDmIn")
    {
        const objData = await fnUpdateUserAdmin(req, res);

        res.send(objData);
    }
    else
    {
        res.send({"status": "warning", "message": "Valid Action is not Received..."});
    }
}

exports.fnLoadUserDetFromJson = async (req, res) => {
    try {
        let vUserData = await fnGetUserJsonData();
        res.send({"status": vUserData.status, "message": vUserData.message, "data": vUserData.data});

    } catch (error) {
        res.send({ "status": error.status, "message": error.message, "data": "" });        
    }
}

exports.fnSaveUserDetails = async (req, res) => {
    let vUserId = req.body.UserId;
    let vFullName = req.body.FullName;
    let vEmailId = req.body.EmailId;
    let vPassword = req.body.Password;
    let vPhoneNumber = req.body.PhoneNumber;
    let vIsActive = req.body.IsActive;
    let vIsAdmin = req.body.IsAdmin;

    try {
        let vUserData = await fnGetUserJsonData();

        if(vUserData.status === "success"){
            let vIsExist = false;
            for(let i=0; i<vUserData.data.UserDet.length;i++){
                if(vUserData.data.UserDet[i].EmailId === vEmailId){
                    vIsExist = true;
                }
            }

            if(!vIsExist){
                vUserData.data.UpdDt = vUserId;
                const vHashedPass = await fnGetHashedPassword(vPassword);
                const vNow = new Date();

                vUserData.data.UserDet.push({ UserId : vUserId, FullName : vFullName, EmailId : vEmailId, Password : vHashedPass, PhoneNumber : vPhoneNumber, IsActive : vIsActive, IsAdmin : vIsAdmin, CreatedAt: vNow, UpdatedAt: vNow });
    
                let vSavedData = await fnSaveUserJsonData(vUserData.data);
    
                res.send({"status": vSavedData.status, "message": vSavedData.message, "data": vSavedData.data});
            }
            else{
                res.send({"status": "warning", "message": "User with this EmailId already Exists!", "data": "" });
            }
        }
        else{
            res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": error.data });        
    }
}

exports.fnSaveAdminDetails = async (req, res) => {
    let vUserId = req.body.UserId;
    let vFullName = req.body.FullName;
    let vEmailId = req.body.EmailId;
    let vPassword = "Admin@113";
    let vPhoneNumber = "+916301904398";
    let vIsActive = true;
    let vIsAdmin = true;

    try {
        let objResJson = { UpdDt: vUserId, UserDet: [] };

        const vHashedPass = await fnGetHashedPassword(vPassword);
        const vNow = new Date();

        objResJson.UserDet.push({ UserId : vUserId, FullName : vFullName, EmailId : vEmailId, Password : vHashedPass, PhoneNumber : vPhoneNumber, IsActive : vIsActive, IsAdmin : vIsAdmin, CreatedAt: vNow, UpdatedAt: vNow });

        let vSavedData = await fnSaveUserJsonData(objResJson);

        res.send({"status": vSavedData.status, "message": vSavedData.message, "data": vSavedData.data});
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": error.data });        
    }
}

exports.fnGetUserDetByEmailPass = async (req, res) => {
    let vEmailId = req.body.EmailId;
    let vPassword = req.body.Password;

    try {
        let vUserData = await fnGetUserJsonData();

        if(vUserData.status === "success"){
            let vIsExist = false;
            let vResData;

            for(let i=0; i<vUserData.data.UserDet.length;i++){
                if((vUserData.data.UserDet[i].EmailId === vEmailId) && (vUserData.data.UserDet[i].IsActive === true)){
                    vIsExist = true;
                    vResData = vUserData.data.UserDet[i];
                }
            }

            if(vIsExist){
                const vPassCompare = await bcrypt.compare(vPassword, vResData.Password);

                if(vPassCompare){
                    // console.log(vResData.Password);
                    res.send({"status": vUserData.status, "message": "App Login is Successful!", "data": vResData});
                }
                else{
                    res.send({"status": "warning", "message": "Incorrect Password, Please Check!", "data": ""});
                }
            }
            else{
                res.send({"status": "warning", "message": "Email ID is InActive or does not Exist, Contact Admin!", "data": ""});
            }
        }
        else{
            res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": error.status, "message": error.message, "data": "" });        
    }
}

exports.fnGetUserChangedPwd = async (req, res) => {
    let vCurrPwd = req.body.CurrPwd;
    let vNewPwd = req.body.NewPwd;
    let vUserId = req.body.UserId;
    let vEncPwd = req.body.EncPwd;
    
    try {
        const vPassCompare = await bcrypt.compare(vCurrPwd, vEncPwd);

        if(vPassCompare){
            let vUserData = await fnGetUserJsonData();
            if(vUserData.status === "success"){
                const vHashedPass = await fnGetHashedPassword(vNewPwd);
                const vNow = new Date();
    
                for(let i=0; i<vUserData.data.UserDet.length;i++){
                    if(vUserData.data.UserDet[i].UserId === vUserId){
                        vUserData.data.UserDet[i].Password = vHashedPass;
                        vUserData.data.UserDet[i].UpdatedAt = vNow;
                    }
                }
                let vSavedData = await fnSaveUserJsonData(vUserData.data);

                res.send({"status": vSavedData.status, "message": "Password Changed Successfully!", "data": ""});
            }
            else{
                res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
            }
        }
        else{
            res.send({"status": "warning", "message": "Incorrect Password, Please Check!", "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": "" });        
    }
}

exports.fnDeleteUserDetails = async (req, res) => {
    let vUserId = req.body.UserId;
    let vPassword = req.body.Password;
    let vEncPwd = req.body.EncPwd;

    try {
        const vPassCompare = await bcrypt.compare(vPassword, vEncPwd);

        if(vPassCompare){
            let vUserData = await fnGetUserJsonData();
            if(vUserData.status === "success"){
                for(let i=0; i<vUserData.data.UserDet.length;i++){
                    if(parseInt(vUserData.data.UserDet[i].UserId) === parseInt(vUserId)){
                        vUserData.data.UserDet.splice(i, 1);
                    }
                }
                let vSavedData = await fnSaveUserJsonData(vUserData.data);

                res.send({"status": vSavedData.status, "message": "User Details Deleted Successfully!", "data": ""});
            }
            else{
                res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
            }
        }
        else{
            res.send({"status": "warning", "message": "Incorrect Password, Please Check!", "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": "" });        
    }
}

exports.fnToggleAdmUserRights = async (req, res) => {
    let vUserId = req.body.UserId;
    let vIsAdmin = req.body.IsAdmin;
    let vPassword = req.body.Password;
    let vEncPwd = req.body.EncPwd;

    try {
        const vPassCompare = await bcrypt.compare(vPassword, vEncPwd);

        if(vPassCompare){
            let vUserData = await fnGetUserJsonData();
            if(vUserData.status === "success"){
                const vNow = new Date();

                for(let i=0; i<vUserData.data.UserDet.length;i++){
                    if(parseInt(vUserData.data.UserDet[i].UserId) === parseInt(vUserId)){
                        vUserData.data.UserDet[i].IsAdmin = JSON.parse(vIsAdmin);
                        vUserData.data.UserDet[i].UpdatedAt = vNow;
                    }
                }
                let vSavedData = await fnSaveUserJsonData(vUserData.data);

                res.send({"status": vSavedData.status, "message": "Admin Rights Changed Successfully!", "data": ""});
            }
            else{
                res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
            }
        }
        else{
            res.send({"status": "warning", "message": "Incorrect Password, Please Check!", "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": "" });        
    }
}

exports.fnToggleUserActiveState = async (req, res) => {
    let vUserId = req.body.UserId;
    let vIsActive = req.body.IsActive;
    let vPassword = req.body.Password;
    let vEncPwd = req.body.EncPwd;

    try {
        const vPassCompare = await bcrypt.compare(vPassword, vEncPwd);

        if(vPassCompare){
            let vUserData = await fnGetUserJsonData();
            if(vUserData.status === "success"){
                const vNow = new Date();

                for(let i=0; i<vUserData.data.UserDet.length;i++){
                    if(parseInt(vUserData.data.UserDet[i].UserId) === parseInt(vUserId)){
                        vUserData.data.UserDet[i].IsActive = JSON.parse(vIsActive);
                        vUserData.data.UserDet[i].UpdatedAt = vNow;
                    }
                }
                let vSavedData = await fnSaveUserJsonData(vUserData.data);

                res.send({"status": vSavedData.status, "message": "User Active State Changed Successfully!", "data": ""});
            }
            else{
                res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
            }
        }
        else{
            res.send({"status": "warning", "message": "Incorrect Password, Please Check!", "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": "" });        
    }
}

exports.fnGetUserJsonDataById = async (req, res) => {
    let vUserId = req.body.UserId;

    try {
        let vUserData = await fnGetUserJsonData();
        if(vUserData.status === "success"){
            let vIsExist = false;
            let vResData;

            for(let i=0; i<vUserData.data.UserDet.length;i++){
                if(parseInt(vUserData.data.UserDet[i].UserId) === parseInt(vUserId)){
                    vIsExist = true;
                    vResData = vUserData.data.UserDet[i];
                }
            }

            if(vIsExist){
                res.send({"status": vUserData.status, "message": "User Details Received Successful!", "data": vResData});
            }
            else{
                res.send({"status": "warning", "message": "User ID does not Exist, Please Check!", "data": ""});
            }
        }
        else{
            res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": error.status, "message": error.message, "data": "" });        
    }
}

exports.fnUpdateUserJsonDataById = async (req, res) => {
    let vUserId = req.body.UserId;
    let vFullName = req.body.FullName;
    let vEmailId = req.body.EmailId;
    let vPassword = req.body.Password;
    let vPhoneNumber = req.body.PhoneNumber;
    let vAdminPwd = req.body.AdminPwd;
    let vEncPwd = req.body.EncPwd;

    try {
        const vPassCompare = await bcrypt.compare(vAdminPwd, vEncPwd);
        if(vPassCompare){
            let vUserData = await fnGetUserJsonData();

            if(vUserData.status === "success"){
                let vIsExist = false;
                for(let i=0; i<vUserData.data.UserDet.length;i++){
                    if((vUserData.data.UserDet[i].EmailId === vEmailId) && (parseInt(vUserData.data.UserDet[i].UserId) !== parseInt(vUserId))){
                        vIsExist = true;
                    }
                }

                if(!vIsExist){
                    const vNow = new Date();
                    vUserData.data.UpdDt = vNow.valueOf();
        
                    for(let i=0; i<vUserData.data.UserDet.length;i++){
                        if(parseInt(vUserData.data.UserDet[i].UserId) === parseInt(vUserId)){
                            vUserData.data.UserDet[i].FullName = vFullName;
                            vUserData.data.UserDet[i].EmailId = vEmailId;
                            if(vPassword !== ""){
                                const vHashedPass = await fnGetHashedPassword(vPassword);
                                vUserData.data.UserDet[i].Password = vHashedPass;
                            }
                            vUserData.data.UserDet[i].PhoneNumber = vPhoneNumber;
                            vUserData.data.UserDet[i].UpdatedAt = vNow;
                        }
                    }
                    let vSavedData = await fnSaveUserJsonData(vUserData.data);
        
                    res.send({"status": vSavedData.status, "message": vSavedData.message, "data": vSavedData.data });
                }
                else{
                    res.send({"status": "warning", "message": "User with this EmailId already Exists!", "data": "" });
                }
            }
            else{
                res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
            }
        }
        else{
            res.send({"status": "warning", "message": "Incorrect Password, Please Check!", "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": error.data });        
    }
}

exports.fnCheckEmailSavePwd = async (req, res) => {
    let vEmailId = req.body.EmailId;
    let vRandPwd = req.body.RandPwd;

    try {
        let vUserData = await fnGetUserJsonData();
        let vIfExists = false;

        if(vUserData.status === "success"){
            const vHashedPass = await fnGetHashedPassword(vRandPwd);
            const vNow = new Date();

            vUserData.data.UpdDt = vNow;

            for(let i=0; i<vUserData.data.UserDet.length;i++){
                if(vUserData.data.UserDet[i].EmailId === vEmailId){
                    vIfExists = true;
                    vUserData.data.UserDet[i].Password = vHashedPass;
                    vUserData.data.UserDet[i].UpdatedAt = vNow;
                }
            }

            if(vIfExists){
                let vSavedData = await fnSaveUserJsonData(vUserData.data);

                if(vSavedData.status === "success"){
                    res.send({"status": vSavedData.status, "message": "New Password Updated!", "data": "" });
                }
                else{
                    res.send({"status": vSavedData.status, "message": vSavedData.message, "data": ""});
                }
            }
            else{
                res.send({"status": "warning", "message": "Invalid Email ID, Please Check!", "data": "" });
            }
        }
        else{
            res.send({"status": vUserData.status, "message": vUserData.message, "data": ""});
        }
    }
    catch (error) {
        res.send({ "status": "danger", "message": error.message, "data": "" });        
    }
}

// const fnGetEmailSentData = async (pEmailId, pRandPwd) => {
//     return new Promise((resolve, reject) => {
//         let transporter = nodemailer.createTransport({
//             service: 'gmail',
//             auth: {
//                 user: 'anil.acton@gmail.com',
//                 pass: 'qzit izge lzxc xphv'
//             }
//         });
//         let mailOptions = {
//             from: 'anil.acton@gmail.com',
//             to: pEmailId,
//             subject: 'Temporarory Password from optionyze',
//             text: pRandPwd
//         };
    
//         transporter.sendMail(mailOptions, function(error, info){
//             if (error) {
//                 console.log(error);
//                 reject({ "status": "warning", "message": "Error sending E-Mail, Contact Admin!", "data": jsonObj });
//             }
//             else {
//                 console.log('Email sent: ' + info.response);
//                 resolve({ "status": "success", "message": "Temporary Password Sent, Please Check Your E-Mail!", "data": "" });
//             }
//         });
//     });
// }

exports.fnSendPwdByEmail = async(req, res) => {
    let vEmailId = req.body.EmailId;
    let vRandPwd = req.body.RandPwd;

    console.log(vRandPwd);
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'anil.acton@gmail.com',
            pass: 'qzit izge lzxc xphv'
        }
    });

    let mailOptions = {
        from: 'anil.acton@gmail.com',
        to: vEmailId,
        subject: 'Temporarory Password from optionyze',
        text: vRandPwd
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log("error is " + error);
            res.send({"status": "warning", "message": "Error in Sending Email, Contact Admin!", "data": "" });
        } 
        else {
            console.log('Email sent: ' + info.response);
            res.send({"status": "success", "message": "New Password Send to E-Mail!", "data": "" });
        }
    });
}

const fnGetUserJsonData = async () => {
    const objPromise = new Promise((resolve, reject) => {
        let vJsonPath = path.join(__dirname, '../../public/json/UserDetails.json');

        //Read JSON from relative path of this file
        if (fs.existsSync(vJsonPath)){
            fs.readFile(vJsonPath, 'utf8', function (err, data) {
                //Handle Error
                if (!err) {
                    var jsonObj = JSON.parse(data);
        
                    resolve({ "status": "success", "message": "User Json Data Received!", "data": jsonObj });
                }
                else {
                    reject({ "status": "danger", "message": "Error in Getting User Json Data! " + err, "data": "" });
                }
            });    
        }
        else{
            resolve({ "status": "warning", "message": "File Not Found, Click to Create Admin User!", "data": "" });
        }
    });

    return objPromise;
}

const fnSaveUserJsonData = async (objResJson) => {
    const objPromise = new Promise((resolve, reject) => {
        fs.writeFile("./public/json/UserDetails.json", JSON.stringify(objResJson, null, 4), (err) => {
            if (!err) {
                resolve({ "status": "success", "message": "User Json Data Saved!", "data": objResJson });
                console.log("File Updated!");
            }
            else{
                reject({ "status": "danger", "message": "Error in Saving User Json Data!" + err, "data": "" });
                console.error(err);
                return;
            }
        });
    });

    return objPromise;
}

async function fnGetUsersData(req, res)
{
    const vSortKey  = {[req.body.sortBy] : req.body.orderBy};
    const vPage = req.body.cuurPage;
    const vDispRecs = req.body.dispRecs;
    const vSkip = (vPage - 1) * vDispRecs;

    try {
        //const objUsers = await mdlUsers.aggregate([{ $sort: vSortKey }]);
        //const objUsers = await mdlUsers.find().limit(10);
        const objUsers = await mdlUsers.find().sort(vSortKey).limit(vDispRecs).skip(vSkip).exec();

        const vRecCount = await mdlUsers.count();

        return {"status": "success", "message" : "User Details Retreived Successfully!", "data" : objUsers, vRecCount};
    } catch (error) {
        return {"status": "danger", "message" : error};
    }
}

async function fnGetUsersDataById(req, res)
{
    let vId = req.body.id;

    try {
        const objUsers = await mdlUsers.findById(vId)

        return {"status": "success", "message" : "User Details Retreived Successfully!", "data" : objUsers};
    } catch (error) {
        return {"status": "danger", "message" : error};
    }
}

async function fnAddNewUserData(req, res)
{
    try {
        const vHashedPass = await fnGetHashedPassword(req.body.password);
        const vNow = new Date();

        const newUser = new mdlUsers({
            fullName: req.body.fullName,
            dob: vNow,
            phoneNumber: req.body.phoneNumber,
            eMailId: req.body.eMailId,
            password: vHashedPass,
            isActive: req.body.isActive
            // createdAt: req.body.createdAt,
            // updatedAt: req.body.updatedAt
        });

        const vMsg = await mdlUsers.create(newUser);

        //console.log(newUser);
        return {"status": "success", "message" : "User Details Added Successfully!", "data" : vMsg};

    } catch (error) {
        console.log("Error: ", error);

        return {"status": "danger", "message" : "Error: Unable to Save Data", "data" : error};
    }
}

async function fnUpdateUserData(req, res)
{
    let vId = req.body.id;
    let vMsg = "";

    try {
        if(req.body.password !== req.body.oldPassword)
        {
            const vHashedPass = await fnGetHashedPassword(req.body.password);

            vMsg = await mdlUsers.findByIdAndUpdate(vId, {fullName: req.body.fullName, phoneNumber: req.body.phoneNumber, password: vHashedPass});
        }
        else
        {
            vMsg = await mdlUsers.findByIdAndUpdate(vId, {fullName: req.body.fullName, phoneNumber: req.body.phoneNumber});
        }

        return {"status": "success", "message" : "User Details Updated Successfully!", "data" : vMsg};

    } catch (error) {
        console.log(error);
        return {"status": "danger", "message" : error};
    }
}

async function fnDelUserData(req, res)
{
    let vId = req.body.id;

    try {
        const vMsg = await mdlUsers.findByIdAndDelete(vId);

        return {"status": "warning", "message" : "User Details Deleted!", "data" : vMsg};
    } catch (error) {
        return {"status": "danger", "message" : error};
    }
}

async function fnUpdateUserActive(req, res)
{
    let vId = req.body.id;

    try {
        const vMsg = await mdlUsers.findByIdAndUpdate(vId, {isActive: req.body.isActive});

        return {"status": "success", "message" : "Users Active State Changed!", "data" : vMsg};
    } catch (error) {
        return {"status": "danger", "message" : error};
    }
}

async function fnUpdateUserAdmin(req, res)
{
    let vId = req.body.id;

    try {
        const vMsg = await mdlUsers.findByIdAndUpdate(vId, {isAdmin: req.body.isAdmin, isActive: req.body.isAdmin});

        return {"status": "success", "message" : "Users Status Changed!", "data" : vMsg};
    } catch (error) {
        return {"status": "danger", "message" : error};
    }
}

const fnGetHashedPassword = async (vPass) => {
    const vHashedPass = await bcrypt.hash(vPass, 10);

    // const vPassCompare = await bcrypt.compare(vPass, vHashedPass);

    // console.log(vPassCompare);
    return vHashedPass;
}