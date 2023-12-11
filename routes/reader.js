const express = require('express');
const router = express.Router();
const { Book, categoriesArray } = require('./../models/book');

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
  } catch (error) {
    console.error(error);
    res.redirect('/reader/search');
  }
});

// Book Detail Route
router.get('/book_detail/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    res.render('book/book_detail', { book: book, user: req.user });
  } catch (error) {
    console.error(error);
    res.redirect('/homepage');
  }
});

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