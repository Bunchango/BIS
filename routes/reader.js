const express = require('express');
const router = express.Router();
const { Book, categoriesArray } = require('./../models/book');

// GET Books Route for search

router.get('/search', async (req, res) => {
  let query = Book.find();
  query = searchBooks(req, query);

  try {
    const books = await query.exec();
    res.render('reader/search_result', {
      user: req.user,
      books: books,
      categories: categoriesArray,
      searchOptions: req.query
    });
  } catch (error) {
    console.error(error);
    res.redirect('reader/search');
  }
});


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


module.exports = router;