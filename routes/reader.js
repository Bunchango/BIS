const express = require('express');
const router = express.Router();
const { Book, categoriesArray } = require('./../models/book');
const { Borrow } = require('./../models/borrow');
const { Reader } = require('./../models/user');

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

// My wishlist route
router.get('/my_wishlist', isReader, async (req, res) => {
  try {
    const reader = await Reader.findOne({ _id: req.user._id }).populate('wishList');

    if (!reader) {
      return res.status(404).json({ error: 'Reader not found' });
    }
    const wishList = reader.wishList;

    res.render('reader/my_wishlist', { wishList: wishList, user: req.user });
  } catch (err) {
    res.status(400).json({ errors: err });
  }
});


function isReader(req, res, next) {
  // If is librarian then move to the next task
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
    // If the "available" checkbox is checked, filter by books with amount > 0
    query = query.gt('amount', 0);
  }

  return query;
}

// Pagination middleware for search result
// Not sure if this works, need to test with actual data in database
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