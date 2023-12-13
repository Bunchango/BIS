const express = require('express');
const router = express.Router();
const { Book, categoriesArray } = require('./../models/book');
const { validateUsername, validatePassword } = require('./../config/validator');
const { validationResult } = require('express-validator');
const { Borrow } = require('./../models/borrow');
const { Reader } = require('./../models/user');

// TODO: Add model and routes for cart, add routes for changing username, password and profile pic      

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

    res.render('reader/profile', {
      reader: reader,
      user: req.user,
      loanCount: loanCount,
      wishlistCount: wishlistCount
    });
  } catch (err) {
    res.status(400).json({ errors: err });
    res.redirect('/homepage');
  }
});

// Change username route
router.put('/profile/change_username', isReader, validateUsername, async (req, res) => {

});

// Change password route
router.put('/profile/change_password', isReader, validatePassword, async (req, res) => {

});

// Change profile picture route
router.put('/profile/change_profile_picture', isReader, async (req, res) => {

});



function isReader(req, res, next) {
  if (req.isAuthenticated && req.user && req.user.__t === "Reader") {
    return next();
  }
  res.redirect("/homepage");
}


module.exports = router;