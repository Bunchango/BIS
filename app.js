const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const passport = require('passport');
const session = require("express-session");
const flash = require("express-flash");
const methodOverride = require('method-override');
const { categoriesArray } = require('./models/book');
require('./config/passport');

const checkinRoutes = require('./routes/checkin');
const readerRoutes = require('./routes/reader');
const libraryRoutes = require('./routes/library');
const librarianRoutes = require('./routes/librarian');
const adminRoutes = require('./routes/admin');

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

app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Method override for PUT and DELETE requests from forms
app.use(methodOverride('_method'));

app.get("/", (req, res) => {
    // If user has not login render reader's home page, if logged in render respective user's home page
    res.render("index", { user: req.user });
})

app.use("/uploads", express.static("uploads"));

// TODO: Change reader to redirect
app.get("/homepage", (req, res) => {
    // If user has not login render reader's home page, if logged in render respective user's home page
    if (!req.user || req.user.__t === "Reader") {
        res.render("reader/homepage", { user: req.user, categories: categoriesArray });
    } else if (req.user && req.user.__t === "Librarian") {
        res.redirect("/librarian/dashboard");
    } else if (req.user && req.user.__t === "Library") {
        res.redirect("/library/manage");
    } else if (req.user && req.user.__t === "Admin") {
        res.redirect("/admin/create_library");
    }
})

// Route for terms and conditions
app.get("/terms", (req, res) => {
    res.render("reader/terms", { user: req.user });
})

// Set up routers
app.use("/checkin", checkinRoutes);
app.use("/reader", readerRoutes);
app.use("/library", libraryRoutes);
app.use("/librarian", librarianRoutes);
app.use("/admin", adminRoutes);

// Route for 404 page
// TODO: Create a 404 page front end
app.get("*", (req, res) => {
    res.status(404).send("404 Page Not Found");
})

async function createAdmin() {
    const { Admin } = require("./models/user");
    const bcrypt = require("bcrypt");
    const admin = new Admin({
        username: "system_admin",
        password: await bcrypt.hash("system_admin", 10),
        gmail: "system_admin",
    })
    await admin.save();
    console.log("Created admin");
}

// createAdmin();

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
})