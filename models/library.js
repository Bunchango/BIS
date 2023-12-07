const mongoose = require("mongoose");
const {User} = require("./user");

const librarySchema = new mongoose.Schema({
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        }, 
        coordinates: {
            type: [Number],
            index: "2dsphere", // Might have to switch this tolocation
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
    banner: {
        type: String,
    },
})

const Library = User.discriminator("Library", librarySchema);

module.exports = Library;