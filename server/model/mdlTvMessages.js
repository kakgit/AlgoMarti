const mdlMsgs = require("mongoose");

var objMsgSchema = new mdlMsgs.Schema({
    symbolName: {type:String, require:true},
    indType : {type:String, require:true},
    direction : {type:String, require:true},
    strike : {type:String},
    createdAt: {type: Date, default: Date.now()}
});

const objMsgs = mdlMsgs.model('msgs', objMsgSchema);

module.exports = objMsgs;