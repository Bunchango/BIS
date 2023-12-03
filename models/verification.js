// All user must verify the account ( library must also verify )
const mongoose = require("mongoose");

// Register then use the link sent by email to verify, if don't verify in 1 day then automatically delete the account
const userVerificationSchema = new mongoose.Schema({
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
    verificationCode: {
        type: String, 
        required: true, 
    },
    createdAt: {
        type: Date, 
        default: Date.now, 
        expires: 86400,
    }
})

const readerVerificationSchema = new mongoose.Schema({})

const librarianVerifcationSchema = new mongoose.Schema({
    library: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Library",
        required: true
    }
})

const libraryVerificationSchema = new mongoose.Schema({
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        }, 
        coordinates: {
            type: [Number],
            index: "2dsphere", // Might have to switch this location
        }, 
        formattedAddress: String,
    },
})

const UserVerification = mongoose.model("User Verification", userVerificationSchema);
const ReaderVerification = UserVerification.discriminator("Reader Verification", readerVerificationSchema);
const LibrarianVerification = UserVerification.discriminator("Librarian Verification", librarianVerifcationSchema);
const libraryVerification = UserVerification.discriminator("Library Verification", libraryVerificationSchema);

module.exports = {
    UserVerification, 
    ReaderVerification, 
    LibrarianVerification, 
    libraryVerification
}