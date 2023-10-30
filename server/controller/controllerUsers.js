const mdlUsers = require('../model/mdlUsers.js');
const bcrypt = require("bcryptjs");

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

async function fnGetUsersData(req, res)
{
    const vSortKey  = {[req.body.sortBy] : req.body.orderBy};
    const vPage = req.body.cuurPage;
    const vDispRecs = req.body.dispRecs;
    const vSkip = (vPage - 1) * vDispRecs;

    //console.log("Recs: " + vSkip);
    try {
        //const objUsers = await mdlUsers.aggregate([{ $sort: vSortKey }]);
        //const objUsers = await mdlUsers.find().limit(10);
        const objUsers = await mdlUsers.find().sort(vSortKey).limit(vDispRecs).skip(vSkip).exec();

        const vRecCount = await mdlUsers.count();

        return {"status": "success", "message" : "User Details Retreived Successfully!", "data" : objUsers, vRecCount};
    } catch (error) {
        return {"status": "danger", "message" : error};
    }
    //return objUsers;
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

    // const vPassCompare = await bcrypt.compare("abc", vHashedPass);

    // console.log(vPassCompare);
    return vHashedPass;
}