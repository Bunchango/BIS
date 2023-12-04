const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: [5, "Book name must be at least 5 characters"],
        maxlength: [24, "Book name must be at most 24 characters"]
    },
    images: {
        type: [{
            data: Buffer,
            contentType: String,
        }],
        required: true,
        validate: [imageLimit, "Images exceeds the limit of 3"],
    },
    author: {
        type: String,
        required: true,
        minlength: [5, "Author name must be at least 5 characters"],
        maxlength: [24, "Author name must be at most 24 characters"]
    },
    tags: {
        type: [{
            type: String,
            enum: [
                "Mystery", "Thriller", " Romance", "Biography", "Memoir", "Self-Help", "History", "Science", "Fantasy", "Sci-fi",
                "Horror", "Action", "Adventure", "Children's", "Comedy", "Poetry", "Philosophy", "Religion"
            ]
        }],
        required: true,
    },
    library: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Library",
        required: true,
    },
    dateImported: { // When add more books ( import more books ) update date imported field 
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
bookSchema.pre("save", function(next) {
    if (this.isNew) {
        this.available = this.amount;
    }
    next();
})

function imageLimit(val) {
    return val.length <= 3;
}

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;