const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String, 
        unique: [true, "username already exists"],
        required: [true, "username is required"], 
        minlength: [5, "username must be at least 6 characters"],
        maxlength: [12, "username must be at most 12 characters"],
    }, 
    password: {
        type: String, 
        required: [true, "password is required"],
        validate: [passwordValidator, "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"]
    }, 
    gmail: {
        type: String, 
        unique: [true, "email already exists"], 
        required: [true, "gmail is required"]
    }, 
    profilePicture: {
        data: Buffer,
        contentType: String,
    },
})

// Can only borrow books from   the same library
const readerSchema = new mongoose.Schema({
    watchlist: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Book"
    }], 
    joinedOn: {
        type: Date, 
        default: Date.now, 
        required: true,
    },
})

const librarianSchema = new mongoose.Schema({
    library: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Library",
        required: true
    }
})

const adminSchema = new mongoose.Schema({
    library: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Library",
        required: true
    }
})

function passwordValidator(val) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(val);
}

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