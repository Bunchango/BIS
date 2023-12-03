const mongoose = require("mongoose");

const borrowSchema = new mongoose.Schema({
    // Librarian can cancel borrow (ex: When it is way past due date)
    reader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reader",
        required: true
    }, 
    // Can only pickup books from the same library
    books: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book", 
    }], 
    library: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Library", 
        required: true,
    }, 
    createdOn: {
        type: Date, 
        default: Date.now, 
        required: true, 
    },
    dueDate: {
        type: Date,
        required: true,
        validate: [isPassCreatedOn, "Due date must be after created date"],
    }, 
    status: {
        type: String, 
        required: true, 
        enum: ["Returned", "Ongoing", "Canceled"]
    }
});

const pickupSchema = new mongoose.Schema({
    // Librarian can cancel borrow (ex: When it is way past due date)
    reader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reader",
        required: true
    }, 
    // Can only pickup books from the same library
    books: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book", 
    }], 
    library: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Library", 
        required: true,
    }, 
    createdOn: {
        type: Date, 
        default: Date.now, 
        required: true, 
    },
    takeDate: {
        type: Date, 
        required: true,
        validate: [isPassCreatedOn, "Take date must be after created date"],
    }, 
    // Librarian confirm the pickup, marking it as scheduled, when user pick up the book, it is marked as completed
    status: {
        type: String,
        required: true,
        enum: ["Completed", "Scheduled", "Canceled"],
    }
})

function isPassCreatedOn(value) {
    return value > this.createdOn;
}

const Borrow = mongoose.model("Borrow", borrowSchema);
const Pickup = mongoose.model("Pickup", pickupSchema);

module.exports = {
    Borrow, 
    Pickup, 
}