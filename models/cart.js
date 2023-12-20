const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    reader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reader",
        required: true,
    },
    books: [{
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
        }
    }],
    createdOn: {
        type: Date,
        default: Date.now,
    }
})

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;