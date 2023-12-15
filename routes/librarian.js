const Library = require("../models/library");
const { Book, categoriesArray } = require("../models/book");
const { Borrow, Pickup, Request } = require("../models/borrow");
const { validateBookCreation, validateUsername } = require("../config/validator");
const upload = require("./../config/multer");
const { validationResult } = require("express-validator");
const { Librarian, Reader } = require("../models/user");
const nodemailer = require("nodemailer");

// Flow: Librarian accept the pickup request created by the user or decline it. 
// If Accept, redirect librarian to page to create a pickup and change request status to accept
// If Decline, change request status to decline (Reader can reopen the request)
// Librarian decides on the pickup date, determine which book to let the reader borrow
// User go to the library and pickup the books then librarian create a borrow record
// If Reader doesn't pickup the book, librarian can set the pickup as canceled 
// When change pickup status to canceled, decrease amount books of the pickup by 1, if change from canceled to scheduled, also increase pickup by 1
// If Reader picks up the book, create a borrow record
// Notify the reader if it is turned into overdued
// If borrow is set as canceled, books are considered lost
// When set book as returned, librarian has to determine which book is returned.Automatically increment available of books returned by 1, and decrease amount by 1 of books that are not returned.
// After some time the reader return the book
// The librarian determine if the books are returned and confirm the return

// TODO: Create a schema for pickup request, modify borrow schemas, send email when changing information of the record
// TODO: Real time chat between librarians and readers

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

// Request, Pickup and Borrow management
router.get("/customer", isLibrarian, async (req, res) => {
    // Show all pickups, borrows, and requests of a library
    try {
        const requests = await Request.find({library: req.user.library}); 
        const pickups = await Pickup.find({library: req.user.library});
        const borrows = await Borrow.find({library: req.user.library});

        res.render("librarian/customer", {requests: requests, pickups: pickups, borrows: borrows});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/pickup/:id", isLibrarian, async (req, res) => {
    // Display pickup information
    try {
        const pickup = await Pickup.findById(req.params.id);
        if (pickup.library !== req.user.library) return res.redirect("/librarian/customer");
        res.render("librarian/pickup", {pickup: pickup});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/borrow/:id", isLibrarian, async (req, res) => {
    // Display borrow information
    try {
        const borrow = await Borrow.findById(req.params.id);
        if (borrow.library !== req.user.library) return res.redirect("/librarian/customer");
        res.render("librarian/borrow", {borrow: borrow});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/request/:id", isLibrarian, async (req, res) => {
    // Display pickup request information
    // Librarian chooses books to approve, choose a pickup date which pops up, then confirm the pickup creation by clicking on a button
    // Librarian can click on a book to redirect to that book's detail
    try {
        const request = await Request.findById(req.params.id).populate("reader").populate("books");
        if (request.library !== req.user.library) return res.redirect("/librarian/customer");
        res.render("librarian/request", {request: request});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/request/accept/:id", async (req, res) => {
    // Accept a request and create a pickup record
    try {
        const {approved, takeDate} = req.body;

        // Change request status to accept
        const request = await Request.findByIdAndUpdate(req.params.id, {status: "Accepted"}, {new: true});

        // Create pickup
        const pickup = new Pickup({
            reader: request.reader,
            books: approved, 
            library: request.library,
            takeDate: takeDate,
        })

        await pickup.save();
        
        // Decrease by 1 for all books
        for (let book of pickup.books) {
            await Book.findByIdAndUpdate(book._id, { available: { $inc: -1 } });
        }

        // Redirect to customer page
        res.redirect("/librarian/customer");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/request/decline/:id", async (req, res) => {
    // Decline a request
    try {
        await Request.findByIdAndUpdate(req.params.id, {status: "Declined"});
        res.redirect("/librarian/customer");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

// Dashboard 
router.get("/dashboard", isLibrarian, (req, res) => {
    res.render("librarian/dashboard");
})

module.exports = router;