const Library = require("../models/library");
const { Book, categoriesArray } = require("../models/book");
const { Borrow, Pickup } = require("../models/borrow");
const { validateBookCreation, validateUsername } = require("../config/validator");
const upload = require("./../config/multer");
const { validationResult } = require("express-validator");
const { response } = require("express");
const { Librarian, Reader } = require("../models/user");
const nodemailer = require("nodemailer");

const router = require("express").Router();

// Librarian can add, modify, delete books 
// Librarian can check who is borrowing the books, who have not returned the books, who is going to come borrow the books
// Librarian can confirm, or cancel, or mark schedule pickup as finished
// Librarian can send messages to readers 
// Both user and librarian can view their dashboard

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
    // Change book detail

})

// Pickup and borrow
router.get("/customer", isLibrarian, async (req, res) => {
    // Render all people who are borrowing the book and book pickups
    try {
        const borrows = await Borrow.find({ library: req.user.library }).populate("reader").populate("book");
        const pickups = await Pickup.find({ library: req.user.library }).populate("reader").populate("books");
        res.render("librarian/customer", { borrows: borrows, pickups: pickups });
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/pickup/:id", isLibrarian, async (req, res) => {
    // Render pickup detail and change date
    try {
        const pickup = await Pickup.findById(req.params.id).populate("reader").populate("books");
        if (pickup.library !== req.user.library) return res.redirect("/librarian/customer");
        return res.render("librarian/pickup", { pickup: pickup });
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/pickup/update_status/:id", async (req, res) => {
    // Pending as default, do nothing
    try {
        const pickup = await Pickup.findById(req.params.id).populate("books");
        const newStatus = req.body.status; 

        if (newStatus === "Completed") {
            const borrow = new Borrow({
                reader: pickup.reader, 
                books: pickup.books, 
                library: pickup.library, 
                takeDate: req.body.takeDate
            });

            await borrow.save();
        } else if (newStatus === "Scheduled") {
            pickup.books.forEach(async (book) => {
                book.available -= 1;
                await book.save();
            })
        } else if (newStatus === "Canceled") {
            pickup.books.forEach(async (book) => {
                book.available += 1;
                await book.save();
            })
        }

        // Update the pickup
        await Pickup.findByIdAndUpdate(req.params.id, {
            status: newStatus
        });
        res.redirect("/librarian/customer")
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/pickup/update_date/:id", async (req, res) => {
    try {
        await Pickup.findByIdAndUpdate(req.params.id, {takeDate: req.body.takeDate});
        res.redirect("/librarian/customer");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/borrow/:id", isLibrarian, async (req, res) => {
    try {
        const borrow = await Borrow.findById(req.params.id).populate("reader").populate("books");
        if (borrow.library !== req.user.library) return res.redirect("/librarian/customer");
        return res.render("librarian/borrow", { borrow: borrow });
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/borrow/update_status/:id", async (req, res) => {
    // Mark as returned, or canceled
    // TODO: When marked as returned, add 1 to available, if canceled, remove 1 to amount
    // TODO: Think of the situation when reader return the book after the librarian canceled the borrow
    try {
        
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/borrow/update_date/:id", async (req, res) => {
    try {
        await Borrow.findByIdAndUpdate(req.params.id, {dueDate: req.body.dueDate});
        res.redirect("/librarian/customer");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
})

// Post route to send emails to readers in borrow or pickup page
router.post("/message/:gmail", isLibrarian, async (req, res) => {
    try {
        transporter.sendMail({
            to: req.params.gmail,
            subject: `${req.user.username} sent you a message`,
            html: req.body.message,
        });

        // Create a notification
        const reader = await Reader.findOne({ gmail: req.params.gmail });
        reader.notification.push({
            message: req.body.message,
            title: `Librarian ${username} sent you a message`
        })
        await reader.save();
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

// Dashboard 
router.get("/dashboard", isLibrarian, (req, res) => {
    res.render("librarian/dashboard");
})

module.exports = router;