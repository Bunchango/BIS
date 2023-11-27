const mongoose = require("mongoose");

const borrowSchema = new mongoose.Schema({
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
});

const pickupSchema = new mongoose.Schema({
    takeDate: {
        type: Date, 
        required: true,
        validate: [isPassCreatedOn, "Take date must be after created date"],
    }, 
    // Librarian confirm the pickup, marking it as scheduled, when user pick up the book, it is marked as picked up
    status: {
        type: String,
        required: true,
        enum: ["Completed", "Scheduled", "Canceled"],
    }
})

const loanSchema = new mongoose.Schema({
    dueDate: {
        type: Date,
        required: true,
        validate: [isPassCreatedOn, "Due date must be after created date"],
    }, 
    status: {
        type: String, 
        required: true, 
        enum: ["Returned", "Ongoing", "Past Due", "Canceled"]
    }
})

function isPassCreatedOn(value) {
    return value > this.createdOn;
}

const Borrow = mongoose.model("Borrow", borrowSchema);
const Pickup = mongoose.model("Pickup", pickupSchema);
const Loan = mongoose.model("Loan", loanSchema);

module.exports = {
    Borrow, 
    Pickup, 
    Loan,
}