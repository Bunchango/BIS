const mongoose = require("mongoose");

const librarySchema = new mongoose.Schema({
    name: {
        type: String, 
        required: true,
        unique: true,
        minlength: [8, "Library name must be at least 8 characters"],
        maxlength: [24, "Library name must be at most 24 characters"],
    }, 
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
    joinedAt: {
        type: Date, 
        default: Date.now,
    },
    noticeBoard: [{
        image: {
            data: Buffer,
            contentType: String,
        },
        description: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date, 
            default: Date.now,
        }
    }], 
    logo: {
        data: Buffer,
        contentType: String,
    },
})

module.exports = mongoose.model("Library", librarySchema);