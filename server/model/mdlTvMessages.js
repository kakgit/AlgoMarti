const mongoose = require("mongoose");

const objMsgSchema = new mongoose.Schema({
    symbolName: {type:String, require:true},
    indType : {type:String, require:true},
    direction : {type:String, require:true},
    strike : {type:String},
    createdAt: {type: Date, default: Date.now()}
});

const objMsgs = mongoose.model('msgs', objMsgSchema);

module.exports = objMsgs;