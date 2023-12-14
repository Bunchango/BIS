const Library = require("../models/library");
const { Book, categoriesArray } = require("../models/book");
const { Borrow, Pickup } = require("../models/borrow");
const { validateBookCreation, validateUsername } = require("../config/validator");
const upload = require("./../config/multer");
const { validationResult } = require("express-validator");
const { Librarian, Reader } = require("../models/user");
const nodemailer = require("nodemailer");

// Flow: Librarian confirm the pickup request created by the user or decline it. 
// Librarian decides on the pickup date, determine which book to let the reader borrow
// User go to the library and pickup the books then librarian create a borrow record
// After some time the reader return the book
// The librarian determine if the books are returned and confirm the return
// TODO: Create a schema for pickup request, modify borrow schemas, send email when changing information of the record

const router = require("express").Router();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
})

function isLibrarian(req, res, next) {
    // If is librarian then move to the next task
    if (req.isAuthenticated && req.user && req.user.__t === "Librarian") {
        return next();
    }
    res.redirect("/homepage");
}

// Profile 
router.get("/profile", isLibrarian, async (req, res) => {
    // View both account info and library info
    try {
        const library = await Library.findById(req.user.library);

        res.render("librarian/profile", { user: req.user, library: library, errors: [] });
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/profile", validateUsername, async (req, res) => {
    // Change account info (only allow changing username)
    try {
        const library = await Library.findById(req.user.library);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('librarian/profile', { user: req.user, library: library, errors: errors.array() })
        }

        await Librarian.findByIdAndUpdate(req.user._id, { username: req.body.username });

        res.render("librarian/profile", { user: req.user, library: library, errors: [] })
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

// Inventory
router.get("/inventory", isLibrarian, async (req, res) => {
    // Display all the books
    try {
        const books = await Book.find({ library: req.user.library });
        res.render("librarian/inventory", { books: books });
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/add_book", isLibrarian, (req, res) => {
    // Render form
    res.render("librarian/add_book", { categories: categoriesArray });
})

router.post("/add_book", upload.array("images", 3), validateBookCreation, async (req, res) => {
    // Confirm form
    if (req.files.length !== 3) {
        return res.render("librarian/add_book", { errors: [{ msg: "Book require exactly 3 images" }], categories: categoriesArray });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('librarian/add_book', { errors: errors.array(), categories: categoriesArray });
    }

    try {
        // Category will be a checklist to add multiple tags
        const { title, author, categories, description, publishDate, amount } = req.body;

        // Ensure book is unique within a library
        const book = await Book.findOne({ title: title });
        if (book) return res.render("librarian/add_book", { errors: [{ msg: "Book already exists in this library" }], categories: categoriesArray })

        // Create a new book
        const newBook = new Book({
            title: title,
            coverImages: req.files.map(file => file.path),
            author: author,
            category: categories,
            description: description,
            publishDate: publishDate,
            amount: amount,
            library: req.user.library,
        });

        await newBook.save();
        res.redirect("/librarian/inventory");
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

// Route shared by librarian and reader
router.get("/book_detail/:id", async (req, res) => {
    // View book detail
    try {
        const book = await Book.findById(req.params.id);

        res.render("book/book_detail", { book: book });
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/book_detail/:id", isLibrarian, (req, res) => {
    // Change book detail (when changing amount, only allow reducing the amount at most by the available amount)

})

// Pickup and borrow
router.get("/customer", isLibrarian, async (req, res) => {

})

router.get("/pickup/:id", isLibrarian, async (req, res) => {

})

router.post("/pickup/update_status/:id", async (req, res) => {

})

router.post("/pickup/update_date/:id", async (req, res) => {

})

router.get("/borrow/:id", isLibrarian, async (req, res) => {

})

router.post("/borrow/update_status/:id", async (req, res) => {

})

router.post("/borrow/update_date/:id", async (req, res) => {

})

// TODO: Librarian can chat real time with readers

// Dashboard 
router.get("/dashboard", isLibrarian, (req, res) => {
    res.render("librarian/dashboard");
})

module.exports = router;