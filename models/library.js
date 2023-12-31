const mongoose = require("mongoose");
const {User} = require("./user");
const geocoder = require("./../config/geocoder");

const librarySchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        }, 
        coordinates: {
            type: [Number],
            index: "2dsphere", 
        }, 
        formattedAddress: String,
    }, 
    joinedAt: {
        type: Date, 
        default: Date.now,
    },
    banner: {
        type: String,
        default: "uploads/default_banner.jpg",
    },
    description: {
        type: String,
        minlength: [10, "Description must be at least 10 characters"],
        default: "This is a brand new library",
    }
})

librarySchema.pre("save", async function(next) {
    const location = await geocoder.geocode(this.address);
    this.location = {
        type: "Point", 
        coordinates: [location[0].longitude, location[0].latitude],
        formattedAddress: location[0].formattedAddress
    }
    // Don't save address
    this.address = undefined; 
    next();
})

const Library = User.discriminator("Library", librarySchema);

module.exports = Library;