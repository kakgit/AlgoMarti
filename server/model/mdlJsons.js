const mongoose = require('mongoose');

const jsonSchema = new mongoose.Schema({
    jsonName: {
        type: String,
        required: true
    },
    jsonStr: {
        type: String
    },

},
{ timestamps: true }
);

module.exports = mongoose.model('jsondbs', jsonSchema);