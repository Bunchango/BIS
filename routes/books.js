const express = require('express');
const router = express.Router();
const Book = require('./../models/book');

// function to get an array of all tags in books collection
// TODO: Merge book routes with reader routes

async function getTags() {
  try {
    const tags = await Book.distinct("tags");
    return tags;
  } catch (err) {
    console.log(err);
  }
};

// GET books for search function

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) - 1 || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    let sort = req.query.sort || "name";
    let tag = req.query.tag || "All";

    tag === "All"
      ? (tag = [...getTags()])
      : (tag = req.query.tag.split(","));

    req.query.sort
      ? (sort = req.query.sort.split(","))
      : (sort = [sort]);

    let sortBy = {};
    if (sort[1]) {
      sortBy[sort[0]] = sort[1];;
    } else {
      sortBy[sort[0]] = "asc"
    };

    const books = await Book.find({ name: { $regex: search, $options: "i" } })
      .where("tags")
      .in([...tag])
      .sort(sortBy)
      .skip(page * limit)
      .limit(limit);

    const count = await Book.countDocuments({
      tag: { $in: [...tag] },
      name: { $regex: search, $options: "i" },
    });

    // Pagination for search result

    const result = {
      error: false,
      total,
      page: page + 1,
      limit,
      tag: tags,
      books,
    };

    // return a json result
    // TODO: create frontend and hook up to this route
    res.status(200).json(result);

  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
});


module.exports = router;