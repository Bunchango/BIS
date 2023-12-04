const mongoose = require("mongoose");

// All users can login using google and facebook (although admin and librarian will have their account created using their own gmail first)
// Librarian and admin will have to use accounts (gmail) that does not already exist in the system

const userSchema = new mongoose.Schema({
    username: {
        type: String, 
        required: [true, "username is required"], 
    }, 
    password: {
        type: String, 
        required: function() {return !this.googleId && !this.facebookId},
    }, 
    gmail: {
        type: String, 
        unique: [true, "email already exists"], 
        required: [true, "gmail is required"]
    }, 
    profilePicture: {
        data: Buffer,
        contentType: String,
        url: String,
    }, 
    googleId: {
        type: String,
    },
    facebookId: {
        type: String,
    },
})

// Can only borrow books from the same library
const readerSchema = new mongoose.Schema({
    watchlist: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Book"
    }], 
    joinedOn: {
        type: Date, 
        default: Date.now, 
    },
    notification: [{
        message: String, 
        createdOn: {
            type: Date,
            default: Date.now,
        }
    }],
})

const librarianSchema = new mongoose.Schema({
    library: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Library",
        required: true
    }
})

const User = mongoose.model("User", userSchema);
const Reader = User.discriminator("Reader", readerSchema);
const Librarian = User.discriminator("Librarian", librarianSchema);

module.exports = {
  User,
  Reader,
  Librarian,
};