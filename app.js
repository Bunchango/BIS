const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const passport = require('passport');
const session = require("express-session");
const flash = require("express-flash");
require('./config/passport');

const checkinRoutes = require('./routes/checkin');
const readerRoutes = require('./routes/reader');
const libraryRoutes = require('./routes/library');

// Load global vars
dotenv.config({ path: "./config/config.env" })
const PORT = process.env.PORT || 5000;

const app = express();

// Connect to db
connectDB();

// Enable cors
app.use(cors());

app.use(
    session({
        secret: "SUPER Secret Password",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 3600000,
        },
    }),
);

// Prevent users from going back
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

app.use(flash());

// Initialize passport
app.use(passport.initialize());

app.use(passport.session());

// View engine
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get("/", (req, res) => {
    // If user has not login render reader's home page, if logged in render respective user's home page
    res.render("index", {user: req.user});
})

app.use("/uploads", express.static("uploads"));

// TODO: Recheck later when done main pages 
app.get("/homepage", (req, res) => {
    // If user has not login render reader's home page, if logged in render respective user's home page
    if (!req.user || req.user.__t === "Reader") {
        res.render("reader/homepage", {user: req.user});
    } else if (req.user && req.user.__t === "Librarian") {
        res.render("librarian/library", {user: req.user});
    } else if (req.user && req.user.__t === "Library") {
        res.render("admin/library", {user: req.user});
    } 
})

// Set up routers
app.use("/checkin", checkinRoutes);
app.use("/reader", readerRoutes);
app.use("/library", libraryRoutes);

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
})