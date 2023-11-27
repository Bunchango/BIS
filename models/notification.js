const mongoose = require("mongoose");

// When a book is new due date, or available of wishlist book is > 0, or librarian send message(rethink), or book is due, then create a new notification
// Use websocket to get real time update
const notificationSchema = new mongoose.Schema({
    reader: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Reader",
    }, 
    message: {
        type: String,
        required: true
    }, 
    createdOn: {
        type: Date,
        default: Date.now, 
        required: true,
    }
})

module.exports = mongoose.model("Notification", notificationSchema);