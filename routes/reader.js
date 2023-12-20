const express = require('express');
const router = express.Router();
const { Book, categoriesArray } = require('./../models/book');
const Cart = require('./../models/cart');
const { Request } = require('./../models/borrow');
const { validateUsername, validatePassword } = require('./../config/validator');
const { validationResult } = require('express-validator');
const { Borrow } = require('./../models/borrow');
const { Reader } = require('./../models/user');
const uploads = require('../config/multer')
const multer = require('multer');
// TODO: Add model and routes for cart, add routes for changing username, password and profile pic      

function isReader(req, res, next) {
    if (req.isAuthenticated && req.user && req.user.__t === "Reader") {
        return next();
    }
    res.redirect("/homepage");
}

// Middleware to handle advanced book search
const searchBooks = (req, res, next) => {
    req.bookQuery = Book.find();

    if (req.query.title) {
        req.bookQuery = req.bookQuery.regex('title', new RegExp(req.query.title, 'i'));
    }
    if (req.query.publishedBefore) {
        req.bookQuery = req.bookQuery.lte('publishDate', req.query.publishedBefore);
    }
    if (req.query.publishedAfter) {
        req.bookQuery = req.bookQuery.gte('publishDate', req.query.publishedAfter);
    }
    if (req.query.category && req.query.category.length > 0) {
        req.bookQuery = req.bookQuery.in('category', req.query.category);
    }
    if (req.query.available === 'on') {
        req.bookQuery = req.bookQuery.gt('amount', 0);
    }

    next();
};

// Middleware to handle pagination
const paginatedResults = async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    try {
        const results = await req.bookQuery.skip((page - 1) * limit).limit(limit).exec();
        const countQuery = req.bookQuery.model.countDocuments(req.bookQuery.getFilter());
        const totalResults = await countQuery.exec();

        req.paginatedResults = {
            books: results,
            categories: categoriesArray,
            searchOptions: req.query,
            limit,
            currentPage: page,
            totalResults,
            totalPages: Math.ceil(totalResults / limit),
        };

        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ errors: err });
    }
};

// Middleware to handle rendering search result page
const renderSearchResultPage = (req, res) => {
    res.render('reader/search_result', {
        user: req.user,
        ...req.paginatedResults,
    });
};

// Search route
router.get('/search', searchBooks, paginatedResults, renderSearchResultPage);

// Book Detail Route
router.get('/book_detail/:id', async (req, res) => {
    try {
        const book = await Book.findById(mongoose.Types.ObjectId(req.params.id));

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.render('book/book_detail', { book: book, user: req.user });
    } catch (err) {
        res.status(400).json({ errors: err });
        res.redirect('/homepage');
    }
});

// Show cart route
router.get('/cart', isReader, async (req, res) => {
    try {
        const cart = await Cart.findOne({ reader: req.user._id }).populate('books.book');

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        res.render('reader/cart', { cart: cart, user: req.user });
    } catch (err) {
        res.status(400).json({ errors: err });
        res.redirect('/homepage');
    }
});

// Add book to cart route
router.post('/cart/:id', isReader, async (req, res) => {
    try {
        const bookId = req.params.id;

        // Check if the book is already in the user's cart
        const existingCart = await Cart.findOne({ reader: req.user._id, 'books.book': bookId });

        if (existingCart) {
            return res.status(400).json({ error: 'Book is already in your cart' });
        }

        const date = new Date();

        const newCart = new Cart({
            reader: req.user._id,
            books: [{ book: bookId }],
            library: req.user.library,
            createdOn: date,
        });

        await newCart.save();

        res.status(201).json({ message: 'Book added to cart successfully', cart: newCart });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Remove book from cart route
router.delete('/cart/:id', isReader, async (req, res) => {
    try {
        const bookId = req.params.id;

        // Check if the book is already in the user's cart
        const existingCart = await Cart.findOne({ reader: req.user._id, 'books.book': bookId });

        if (!existingCart) {
            return res.status(400).json({ error: 'Book is not in your cart' });
        }

        await Cart.deleteOne({ reader: req.user._id, 'books.book': bookId });

        res.status(200).json({ message: 'Book removed from cart successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Send book request from cart route
router.post('/cart/request', isReader, async (req, res) => {
    try {
        const cart = await Cart.findOne({ reader: req.user._id }).populate('books.book');

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const date = new Date();

        const newRequest = new Request({
            reader: req.user._id,
            books: cart.books.map(book => book.book),
            library: req.user.library,
            createdOn: date,
        });

        await newRequest.save();

        await Cart.deleteOne({ reader: req.user._id });

        res.status(201).json({ message: 'Request sent successfully', request: newRequest });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//My loan route
router.get('/my_loan/', isReader, async (req, res) => {
    try {
        const borrows = await Borrow.find({ reader: req.user._id })
            .populate('books')
            .populate('library');
        res.render('reader/my_loan', { borrows: borrows, user: req.user });
    } catch (err) {
        res.status(400).json({ errors: err });
        res.redirect('/homepage');
    }
});

// Add book to loan list route
router.post('/my_loan/:bookId', isReader, async (req, res) => {
    try {
        const bookId = req.params.bookId;

        // Check if the book is already in the user's loan list
        const existingBorrow = await Borrow.findOne({ reader: req.user._id, books: bookId });

        if (existingBorrow) {
            return res.status(400).json({ error: 'Book is already in your loan list' });
        }

        const date = new Date();

        // Fix this after adding cart model
        const newBorrow = new Borrow({
            reader: req.user._id,
            books: [bookId],
            // library: ,
            createdOn: date,
            dueDate: new Date().setDate(date.getDate() + 7), // reader to pick up books within 7 days
            status: 'Ongoing',
        });

        await newBorrow.save();

        res.status(201).json({ message: 'Book added to loan list successfully', borrow: newBorrow });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Remove book from loan list route
router.delete('/my_loan/:bookId', isReader, async (req, res) => {
    try {
        const bookId = req.params.bookId;

        // Check if the book is already in the user's loan list
        const existingBorrow = await Borrow.findOne({ reader: req.user._id, books: bookId });

        if (!existingBorrow) {
            return res.status(400).json({ error: 'Book is not in your loan list' });
        }

        await Borrow.deleteOne({ reader: req.user._id, books: bookId });

        res.status(200).json({ message: 'Book removed from loan list successfully' });
        res.render('reader/my_loan', { borrows: borrows, user: req.user });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        res.render('reader/my_loan', { borrows: borrows, user: req.user });
    }
});


// My wishlist route
router.get('/wishlist', isReader, async (req, res) => {
    try {
        const reader = await Reader.findOne({ _id: req.user._id }).populate('wishList');

        if (!reader) {
            return res.status(404).json({ error: 'Reader not found' });
        }
        const wishList = reader.wishList;

        res.render('reader/wishlist', { wishList: wishList, user: req.user });
    } catch (err) {
        res.status(400).json({ errors: err });
    }
});

// Add book to wishlist route
router.post('/wishlist/:id', isReader, async (req, res) => {
    try {
        const reader = await Reader.findOne({ _id: req.user._id });

        if (!reader) {
            return res.status(404).json({ error: 'Reader not found' });
        }

        if (reader.wishList.includes(req.params.id)) {
            return res.status(400).json({ error: 'Book already in wishlist' });
        }

        reader.wishList.push(req.params.id);
        await reader.save();
    } catch (err) {
        res.status(400).json({ errors: err });
    }
});

// Remove book from wishlist route
router.delete('/wishlist/:id', isReader, async (req, res) => {
    try {
        const reader = await Reader.findOne({ _id: req.user._id });

        if (!reader) {
            return res.status(404).json({ error: 'Reader not found' });
        }

        if (!reader.wishList.includes(req.params.id)) {
            return res.status(400).json({ error: 'Book not in wishlist' });
        }

        reader.wishList.pull(req.params.id);
        await reader.save();
        res.render('reader/wishlist', { wishList: wishList, user: req.user });
    } catch (err) {
        res.status(400).json({ errors: err });
        res.render('reader/wishlist', { wishList: wishList, user: req.user });
    }
});

// Reader profile route
router.get('/profile', isReader, async (req, res) => {
    try {
        const loanCount = await Borrow.countDocuments({ reader: req.user._id });
        const wishlistCount = await Reader.findOne({ _id: req.user._id })
            .select('wishList')
            .then(reader => reader.wishList.length);

        const reader = await Reader.findOne({ _id: req.user._id });

        res.render('reader/reader-profile', {
            reader: reader,
            user: req.user,
            loanCount: loanCount,
            wishlistCount: wishlistCount,
            errors: [],
        });
    } catch (err) {
        res.status(400).json({ errors: err });
        res.redirect('/homepage');
    }
});

// Change username, BackGround picture and Avatar picture route
router.post('/profile/edit-profile', isReader, uploads.fields([{ name: 'background', maxCount: 1 }, { name: 'avatar', maxCount: 1 }]), validateUsername, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // If it's a regular form submission, render the page with errors
        return res.render('reader/reader-profile', { user: req.user, errors: errors.array() });
    }

    try {
        if (!req.body.confirm) {
            // Show error must confrim to change 
            res.render("reader/reader-profile", { user: req.user, errors: [{ msg: "You must confirm the changes" }] })
        }

        const UpdateProfile = {}
        // Update username if it's changed
        if (req.body.username && req.body.username !== req.user.username) {
            UpdateProfile.username = req.body.username;
        }
        
        // Update background image if it's changed
        if (req.files.background) {
            UpdateProfile.background = req.files.background[0].path;
        } 
        // Update avatar if it's changed
        if (req.files.avatar) {
            UpdateProfile.profilePicture = req.files.avatar[0].path;
        }

        // Save the changes to the database
        const updatedReader = await Reader.findOneAndUpdate(
            { _id: req.user._id }, // Query condition
            UpdateProfile,          // Update object
            { new: true }           // Options: Return the modified document
        )
        

        if (!updatedReader) {
            console.log('Reader not found or not updated');
            return res.render('reader/reader-profile', {
                user: req.user,
                errors: [{msg: 'Reader not found or not updated' }]
            });
        }

        console.log('Document updated');
        res.redirect('/homepage');
    } catch (err) {
        console.log('Error:', err);
        return res.render('reader/reader-profile', {
            user: req.user,
            errors: [{ msg: 'Internal Server Error' }]
        });
    }
},  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.render('reader/reader-profile', { user: req.user, errors: [{ msg: 'File Too Large: Please upload an image smaller than 2MB' }] });
      }
    } else {
      next(error);
    }
})


// Set default for user profile
router.post('/profile/set-default', isReader, async (req, res) => {
    try {
        let defaultSetting = {};
        console.log(req.user)
        
        defaultSetting.username = 'Bibliophile';
        defaultSetting.profilePicture = "uploads/default_ava.png";
        defaultSetting.background = "uploads/default_bg.jpeg";

         // Update the user's profile with the default settings
         const updatedReader = await Reader.findOneAndUpdate(
            { _id: req.user._id }, // Query condition
            defaultSetting, // Update object
            { new: true }  // Options: Return the modified document
        );

        if (!updatedReader) {
            console.log('Reader not found or not updated');
            return res.render('reader/reader-profile', {
                user: req.user,
                errors: [{msg: 'Reader not found or not updated' }]
            });
        }
        console.log('Default profile set');
        res.redirect('/homepage');

    } catch (error) {
        console.log('Error:', error);
        return res.render('reader/reader-profile', {
            user: req.user,
            errors: [{ msg: 'Internal Server Error' }]
        });
    }
})



module.exports = router;