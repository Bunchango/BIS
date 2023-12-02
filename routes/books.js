const router = require('express').Router();
const Book = require('./../models/book');

async function getTags() {
  try {
    const tags = await Book.distinct("tags");
    return tags;
  } catch (err) {
    console.log(err);
  }
};

router.get('/books', async (req, res) => {
  try {
    const page = parseInt(req.query.page) - 1 || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    let sort = req.query.sort || "name";
    let tag = req.query.tag || "All";

    if (tag === "All") {
      tag = [...getTags()]
    } else {
      tag = req.query.tag.split(",");
    }

    let sortBy = {};
    if (sort[1]) {
      sortBy[sort[0]] = sort[1];;
    } else {
      sortBy[sort[0]] = "asc"
    };

    const books = await Book.find({ name: { $regex: search, $options: "i" } });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});


module.exports = router;