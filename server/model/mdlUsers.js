const mongoose = require('mongoose');

// const schema = mongoose.Schema;
const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    dob: {
        type: Date
    },
    phoneNumber: {
        type: String
    },
    eMailId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },    
    isActive: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
    // createdAt: {
    //     type: Date
    // },
    // updatedAt: {
    //     type: Date
    // }
},
{ timestamps: true }
);


module.exports = mongoose.model('userdbs', userSchema);