// Password recover model
const mongoose = require("mongoose");

const recoverAccountSchema = new mongoose.Schema({
    gmail: {
        type: String, 
        required: true,
        unique: true,
    }, 
    recoverCode: {
        type: String, 
        required: true,
    },
    createdAt: {
        type: Date, 
        default: Date.now, 
        expires: 3600,
    }
})

module.exports = mongoose.model("Recover Account", recoverAccountSchema);