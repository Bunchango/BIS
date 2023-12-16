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
        enum: ["Returned", "Ongoing", "Overdue", "Canceled"], // Canceled if the reader doesn't come to return books
        default: "Ongoing",
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
        enum: ["Completed", "Scheduled", "Canceled"], // Canceled if the reader don't come pickup on time
        default: "Scheduled",
    }
})

const requestSchema = new mongoose.Schema({
    reader: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Reader", 
        required: true,
    }, 
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
    status: {
        type: String, 
        required: true, 
        enum: ["Accepted", "Pending", "Declined"],
        default: "Pending",
    }
})

function isPassCreatedOn(value) {
    return value > this.createdOn;
}

const Borrow = mongoose.model("Borrow", borrowSchema);
const Pickup = mongoose.model("Pickup", pickupSchema);
const Request = mongoose.model("Request", requestSchema);

module.exports = {
    Borrow, 
    Pickup,
    Request, 
}