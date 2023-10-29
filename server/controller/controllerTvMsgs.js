const mdlTvMsg = require('../model/mdlTvMessages');
const axios = require('axios');


exports.fnGetAllTvMsgs = async (req, res) => {

    await fnGetTvMsgs(req, res);
}

exports.fnDelTvMsgById = (req, res) => {
    const id = req.params.id;

    //console.log(id);

    mdlTvMsg.findByIdAndDelete(id)
    .then(data => {
        if(!data){
            res.status(404).send({ message : `Connot Delete with id ${id}. Maybe id is wrong...`})
        }
        else{
            res.status(200).send({
                message : "User Was Deleted Successfully!"
            })
        }
    })
    .catch(error => {
        res.status(500).send({
            message : "Could not delete User with Id = " + id
        });
    });

}

async function fnGetTvMsgs(req, res)
{
    mdlTvMsg.aggregate([{ $sort: {createdAt: 1 } }])
    .then(rec => {
        res.send(rec);
    })
    .catch(error => {
        res.status(500).send({ message: error.message || "Error Occurred while retreiving Information!"});
    })
}