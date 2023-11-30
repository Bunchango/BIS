const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URI); 

        console.log(`MongoDB connected: ${connection.connection.host}`)
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

module.exports = connectDB;