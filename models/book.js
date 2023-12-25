const mongoose = require("mongoose");

const categoriesArray = [
    "Mystery", "Thriller", " Romance", "Biography", "Memoir", "Self-Help", "History",
    "Science", "Fantasy", "Sci-fi", "Horror", "Action", "Adventure", "Children's",
    "Comedy", "Poetry", "Philosophy", "Science", "Religion", "Text-book", "Journal", "Other"
]

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: [5, "Book name must be at least 5 characters"],
        maxlength: [24, "Book name must be at most 24 characters"]
    },
    coverImages: [{
        type: String,
        default: "uploads/default_book_cover.jpg"
    }],
    author: {
        type: String,
        required: true,
        minlength: [5, "Author name must be at least 5 characters"],
        maxlength: [24, "Author name must be at most 24 characters"]
    },
    category: [{
        type: String,
        enum: categoriesArray,
    }],
    description: {
        type: String,
        minlength: [10, "Description must be at least 10 characters"],
    },
    publishDate: {
        type: Date,
        required: true,
    },
    library: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Library",
        required: true,
    },
    dateImported: {
        type: Date,
        default: Date.now,
        required: true,
    },
    amount: { // Available books field will have the same initial value as amount
        type: Number,
        required: true,
        default: 1,
    },
})

// When user borrow book ( or schedule borrow ) reduce available books by 1
// When user return book, increment available books by 1
// When librarian add more book (import more book) increment both availableBooks and amount
bookSchema.pre("save", function (next) {
    if (this.isNew) {
        this.available = this.amount;
    }
    next();
})


const Book = mongoose.model("Book", bookSchema);

module.exports = { Book, categoriesArray };