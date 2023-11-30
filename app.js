const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const passport = require('passport');
const session = require("express-session");
require('./config/passport');

const checkinRoutes = require('./routes/checkin');

// Load global vars
dotenv.config({path: "./config/config.env"})
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

// Initialize passport
app.use(passport.initialize());

app.use(passport.session());

// View engine
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.render("reader/homepage");
})

// Redirect to the homepage
app.get("/home-page", (req, res) => {
    res.redirect("/");
});

// Set up routers
app.use("/checkin", checkinRoutes);

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
})