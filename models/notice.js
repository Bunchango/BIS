const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema({
    library: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Library",
        required: true,
    }, 
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Librarian",
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date, 
        default: Date.now,
    }
})

const Notice = mongoose.model("Notice", noticeSchema);
module.exports = Notice;