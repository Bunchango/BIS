const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const checkinRoutes = require("./routes/checkin");

// Load global vars
dotenv.config({path: "./config/config.env"})
const PORT = process.env.PORT || 5000;

const app = express();

// Connect to db
connectDB();

// Enable cors
app.use(cors());

// View engine
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.render("reader/homepage");
})

// Set up routers
app.use("/checkin", checkinRoutes);

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
})