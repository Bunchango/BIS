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
        required: function () { return !this.googleId && !this.facebookId },
    },
    gmail: {
        type: String,
        unique: [true, "email already exists"],
        required: [true, "gmail is required"]
    },
    profilePicture: {
        type: String,
        default: "uploads/default_ava.png",
    },
    googleId: {
        type: String,
    },
    facebookId: {
        type: String,
    },
})

const readerSchema = new mongoose.Schema({
    wishList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book"
    }],
    joinedOn: {
        type: Date,
        default: Date.now,
    },
    notification: [{
        title: String,
        message: String,
        createdOn: {
            type: Date,
            default: Date.now,
        }
    }],
    background: {
        type: String, 
        default: "uploads/default_bg.png",
    }
})

const librarianSchema = new mongoose.Schema({
    library: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Library",
        required: true
    }
})

const adminSchema = new mongoose.Schema({})

const User = mongoose.model("User", userSchema);
const Reader = User.discriminator("Reader", readerSchema);
const Librarian = User.discriminator("Librarian", librarianSchema);
const Admin = User.discriminator("Admin", adminSchema);

module.exports = {
    User,
    Reader,
    Librarian,
    Admin,
};