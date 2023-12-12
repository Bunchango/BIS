const express = require('express');
const router = express.Router();
const { Book, categoriesArray } = require('./../models/book');
const { validateUsername, validatePassword } = require('./../config/validator');
const { validationResult } = require('express-validator');
const { Borrow } = require('./../models/borrow');
const { Reader } = require('./../models/user');

// TODO: Add model and routes for cart, add routes for changing username, password and profile pic      

// GET Books Route for search

router.get('/search', async (req, res) => {
  let query = Book.find();
  query = searchBooks(req, query);

  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 12

  try {
    let books = await query.exec();
    books = paginatedResults(books, page, limit);
    res.render('reader/search_result', {
      user: req.user,
      books: books,
      categories: categoriesArray,
      searchOptions: req.query,
      limit: limit,
      currentPage: page,
      totalResults: books.length,
      totalPages: Math.ceil(books.length / limit)
    });
  } catch (err) {
    res.status(400).json({ errors: err });
    res.redirect('/reader/search');
  }
});

// Book Detail Route
router.get('/book_detail/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
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

    // get current date
    const date = new Date();

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
router.post('/profile/change_username', isReader, validateUsername, async (req, res) => {

});

// Change password route
router.post('/profile/change_password', isReader, validatePassword, async (req, res) => {

});

// Change profile picture route
router.post('/profile/change_profile_picture', isReader, async (req, res) => {

});



function isReader(req, res, next) {
  if (req.isAuthenticated && req.user && req.user.__t === "Reader") {
    return next();
  }
  res.redirect("/homepage");
}

// Advanced search function
function searchBooks(req, query) {
  if (req.query.title != null && req.query.title != '') {
    query = query.regex('title', new RegExp(req.query.title, 'i'));
  }
  if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
    query = query.lte('publishDate', req.query.publishedBefore);
  }
  if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
    query = query.gte('publishDate', req.query.publishedAfter);
  }
  if (req.query.category != null && req.query.category.length > 0) {
    query = query.in('category', req.query.category);
  }
  if (req.query.available === 'on') {
    query = query.gt('amount', 0);
  }

  return query;
}

// Pagination middleware for search result
// TODO: test with real data in database
function paginatedResults(model, page, limit) {
  const startIndex = (page - 1) * limit
  const endIndex = page * limit
  const results = {}

  if (endIndex < model.length) {
    results.next = {
      page: page + 1,
      limit: limit
    }
  }

  if (startIndex > 0) {
    results.previous = {
      page: page - 1,
      limit: limit
    }
  }
  results.results = model.slice(startIndex, endIndex)
  return results
}

module.exports = router;