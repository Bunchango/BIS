const Library = require("../models/library");
const {Book, categoriesArray} = require("../models/book");
const {Borrow, Pickup} = require("../models/borrow");
const {validateBookCreation} = require("../config/validator");
const upload = require("./../config/multer");

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

        res.render("librarian/profile", {user: req.user, library: library});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/profile", async (req, res) => {
    // Change account info
})

// Inventory
router.get("/inventory", isLibrarian, async (req, res) => {
    // Display all the books
    try {
        const books = await Book.find({library: req.user.library});
        res.render("librarian/inventory", {books: books});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/add_book", isLibrarian, (req, res) => {
    // Render form
    res.render("librarian/add_book", {categories: categoriesArray});
})

router.post("/add_book", upload.array("images", 3), validateBookCreation, async (req, res) => {
    // Confirm form
    if (req.files.length !== 3) {
        return res.render("librarian/add_book", {errors: [{msg: "Book require exactly 3 images"}], categories: categoriesArray});
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('librarian/add_book', {errors: errors.array(), categories: categoriesArray  });
    }

    try {
        // Category will be a checklist to add multiple tags
        const {title, author, categories, description, publishDate, amount} = req.body;

        // Ensure book is unique within a library
        const book = await Book.findOne({title: title});
        if (book) return res.render("librarian/add_book", {errors: [{msg: "Book already exists in this library"}], categories: categoriesArray})

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
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/book_detail/:id", isLibrarian, async (req, res) => {
    // View book detail
    try {
        const book = await Book.findById(req.params.id);
        // Check if book is from same library
        if (book.library !== req.user.library) return res.redirect("/librarian/inventory");

        res.render("librarian/book_detail", {book: book});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/book_detail/:id", (req, res) => {
    // Change book detail
})

// Pickup and borrow
router.get("/customer", isLibrarian, async (req, res) => {
    // Render all people who are borrowing the book and book pickups
    try {
        const borrows = await Borrow.find({library: req.user.library}).populate("reader").populate("book");

    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/pickup_detail/:id", isLibrarian, (req, res) => {
    // Render pickup detail
})

router.post("/pickup_detail/:id", (req, res) => {
    // confirm, or cancel, or mark as finished
})

router.get("/borrow/:id", (req, res) =>{

})

router.post("/borrow/:id", (req, res) => {

})

// Post route to send emails to readers
router.post("", (req, res) => {
    
})

// Dashboard 
router.get("/dashboard", isLibrarian, (req, res) => {

})

module.exports = router;