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
const Library = require('./models/library');

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
// TODO: Query more data from library to display in the homepage for Reader role
app.get("/homepage", async (req, res) => {
    // If user has not login render reader's home page, if logged in render respective user's home page
    if (!req.user || req.user.__t === "Reader") {
        // Query data of 6 libraries
        const libraries = await Library.find().limit(6);
        res.render("reader/homepage", { user: req.user, categories: categoriesArray, libraries: libraries });
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
//TODO: Create a 404 page front end
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

// Save the book object to the database
async function saveBook() { 
    try {
        const { Book } = require("./models/book")
        // Create a new book object
        const book = new Book({
            title: 'To Kill a Mockingbird',
            coverImages: ['uploads/tokillamockingbird1.jpg', 'uploads/tokillamockingbird2.jpg', 'uploads/tokillamockingbird3.jpg'],
            author: 'Harper Lee',
            category: [" Romance"],
            description: 'A novel about the injustices of the adult world as seen through the eyes of a young girl in the American South.',
            publishDate: new Date('1960-07-11'),
            library: '65859e0789225b047162498a', // replace with the id of the library
            dateImported: new Date(),
            amount: 10,
        });
        const savedBook = await book.save();
        console.log('Book saved successfully:', savedBook);
    } catch (err) {
        console.error('Error saving book:', err);
    }
}
saveBook()
   

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
})