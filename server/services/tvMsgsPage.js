const mdlTvMsg = require('../model/mdlTvMessages');
const axios = require("axios");

exports.defaultRoute = (req, res) => {
    //Make a get request to /api/users
    axios.get(process.env.API_PATH + 'api/tvMsgs')
    .then(function(response){
        //console.log(response);

        res.render("manageMsgsTV.ejs", { tvMsgs : response.data});
    })
    .catch(error => {
        res.send(error);
    })
    
    //res.render("manageMsgsTV.ejs");

}


exports.addNewMsg = (req, res) => {
    if(!req.body){
        res.status(400).send({ message : "Content can not be empty!"});
        return;
    }

    //New TV Msg
    const objMsg = new mdlTvMsg({
        symbolName: req.body.symbolName,
        indType: req.body.indType,
        direction: req.body.direction,
        strike: req.body.strike
    });

    //Save TV Msg in the DB
    objMsg
    .save(objMsg)
    .then(data => {
        res.status(200).send(data);
        //res.redirect("/");
    })
    .catch(error => {
        res.status(500).send({
            message: error.message || "Some Error Occured while creating a create operation.."
        });
    });
}
