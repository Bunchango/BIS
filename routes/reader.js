const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Book, categoriesArray } = require("./../models/book");
const Cart = require("./../models/cart");
const { Borrow, Request, Pickup } = require("./../models/borrow");
const { Reader } = require("./../models/user");
const { validateUsername, validatePassword } = require("./../config/validator");
const { validationResult } = require("express-validator");
const uploads = require("../config/multer");
const Library = require("../models/library");
const { localsName } = require("ejs");
const multer = require("multer");

function isReader(req, res, next) {
  if (req.isAuthenticated && req.user && req.user.__t === "Reader") {
    return next();
  }
  res.redirect("/homepage");
}

async function notify(readerID, title, message) {
  // Function to send notification to reader
  const notification = {
    title: title,
    message: message,
    createdOn: Date.now(),
  };

  await Reader.findByIdAndUpdate(readerID, {
    $push: { notification: notification },
  });
}

// Middleware to handle advanced book search
const searchBooks = (req, res, next) => {
  req.bookQuery = Book.find();

  if (req.query.title) {
    req.bookQuery = req.bookQuery.regex(
      "title",
      new RegExp(req.query.title, "i"),
    );
  }
  if (req.query.publishedBefore) {
    req.bookQuery = req.bookQuery.lte("publishDate", req.query.publishedBefore);
  }
  if (req.query.publishedAfter) {
    req.bookQuery = req.bookQuery.gte("publishDate", req.query.publishedAfter);
  }
  if (req.query.category && req.query.category.length > 0) {
    req.bookQuery = req.bookQuery.in("category", req.query.category);
  }
  if (req.query.available === "on") {
    req.bookQuery = req.bookQuery.gt("amount", 0);
  }

  next();
};

// Middleware to handle pagination
const paginatedResults = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;

  try {
    const results = await req.bookQuery
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const countQuery = req.bookQuery.model.countDocuments(
      req.bookQuery.getFilter(),
    );
    const totalResults = await countQuery.exec();

    const totalPages = Math.ceil(totalResults / limit);

    req.paginatedResults = {
      books: results,
      categories: categoriesArray,
      searchOptions: req.query,
      limit,
      currentPage: page,
      totalResults,
      totalPages,
    };

    // Control for next and previous page
    if (page > 1) {
      req.paginatedResults.books.previous = {
        page: page - 1,
      };
    }

    if (page < totalPages) {
      req.paginatedResults.books.next = {
        page: page + 1,
      };
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: err });
  }
};

// Middleware to handle rendering search result page
const renderSearchResultPage = async (req, res) => {
  let wishlistBooks = [];

  if (req.user && req.user.__t === "Reader") {
    const wishList = req.user.wishList;
    wishlistBooks = await Book.find({ _id: { $in: wishList } });
  }

  res.render("reader/search_result", {
    user: req.user,
    ...req.paginatedResults,
    wishList: wishlistBooks || [],
  });
};

// Search route
router.get("/search", searchBooks, paginatedResults, renderSearchResultPage);

// Book Detail Route
router.get("/book_detail/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate("library");

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (req.user) {
      const wishList = req.user.wishList;
      let wishlistBooks = await Book.find({ _id: { $in: wishList } });
      res.render("book/book_detail", {
        book: book,
        user: req.user,
        wishList: wishlistBooks,
      });
    } else {
      res.render("book/book_detail", {
        book: book,
        user: req.user,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: err });
  }
});

// Add book to cart route
router.post("/add-cart/:id", isReader, async (req, res) => {
  try {
    const bookId = req.params.id;

    const book = await Book.findById(bookId).populate("library");

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const existingCart = await Cart.findOne({
      reader: req.user._id,
      library: book.library._id,
    });

    if (existingCart) {
      const isBookInCart = existingCart.books.some(
        (item) => item.book.toString() === bookId,
      );

      if (isBookInCart) {
        return res.status(400).json({ error: "Book is already in your cart" });
      }

      // If the book is not in the cart, add it
      await Cart.findOneAndUpdate(
        { reader: req.user._id, library: book.library._id },
        { $addToSet: { books: { book: bookId } } },
      );

      return res.status(200).json({
        message: "Book added to cart successfully",
        cart: existingCart,
      });
    }

    // If the user doesn't have an existing cart for the library, create a new cart and add the book
    const date = new Date();
    const newCart = new Cart({
      reader: req.user._id,
      library: book.library._id,
      books: [{ book: bookId }],
      createdOn: date,
    });

    await newCart.save();

    res
      .status(201)
      .json({ message: "Book added to cart successfully", cart: newCart });

    notify(
      req.user._id,
      "Book added to cart",
      "Book added to cart successfully",
    );
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove book from cart route
router.post("/remove-cart/:cartId/:bookId", isReader, async (req, res) => {
  try {
    const { cartId, bookId } = req.params;

    // Check if the book is already in the user's cart
    const existingCart = await Cart.findOne({
      reader: req.user._id,
      _id: cartId,
      "books.book": bookId,
    });

    if (!existingCart) {
      console.log("Book not found in cart");
      return res.status(400).json({ error: "Book not found in cart" });
    }

    if (existingCart.books.length > 1) {
      // If the cart has more than one book, remove the specified book
      await Cart.findOneAndUpdate(
        { reader: req.user._id, _id: cartId },
        { $pull: { books: { book: bookId } } },
      );
    } else if (existingCart.books.length === 1) {
      // If the cart has only one book, delete the entire cart
      await Cart.deleteOne({ reader: req.user._id, _id: cartId });
    }

    notify(
      req.user._id,
      "Book removed from cart",
      "Book removed from cart successfully",
    );

    res.status(200).json({ message: "Book removed from cart successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Send book request from cart route
router.post("/cart/request/:cartId", isReader, async (req, res) => {
  try {
    const cartId = req.params.cartId;

    const cart = await Cart.findOne({
      _id: cartId,
      reader: req.user._id,
    }).populate("books.book");

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const library = cart.books.length > 0 ? cart.books[0].book.library : null;

    if (!library) {
      return res.status(400).json({ error: "Library not found in the cart" });
    }

    const date = new Date();

    const newRequest = new Request({
      reader: req.user._id,
      books: cart.books.map((book) => book.book),
      library: library,
      createdOn: date,
    });

    await newRequest.save();

    await Cart.deleteOne({ _id: cartId, reader: req.user._id });

    notify(req.user._id, "Request sent", "Request sent successfully");

    res
      .status(201)
      .json({ message: "Request sent successfully", request: newRequest });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Cancel request route
router.post("/request/cancel/:id", isReader, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate("reader")
      .populate("books")
      .populate("library")
      .exec();

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    if (request.status === "Accepted" || request.status === "Declined") {
      return res
        .status(400)
        .json({ error: "Cannot cancel an accepted or declined request" });
    }
    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "Canceled" } },
      { new: true },
    );

    const pickup = await Pickup.findOne({ request: req.params.id });
    if (pickup) {
      await Pickup.findByIdAndUpdate(pickup._id, {
        $set: { status: "Canceled" },
      });
    }

    // Increase book availability
    for (const book of request.books) {
      await Book.findByIdAndUpdate(book._id, { $inc: { amount: 1 } });
    }

    notify(req.user._id, "Request canceled", "Request canceled successfully");

    res.status(200).json(updatedRequest);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all wishlist Data
router.get("/wishlist", isReader, async (req, res) => {
  try {
    const wishList = req.user.wishList;
    let wishlistBooks = await Book.find({ _id: { $in: wishList } });
    res.json(wishlistBooks);
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
});

// Add and remove book from wishlist route
router.post("/wishlist/:id", isReader, async (req, res) => {
  try {
    const action = req.query.action; // check the action
    console.log(action);
    const reader = await Reader.findOne({ _id: req.user._id });
    if (!reader) {
      return res
        .status(404)
        .json({ error: "Reader not found", success: false });
    }

    if (!req.params.id) {
      return res
        .status(400)
        .json({ error: "Book ID is required", success: false });
    }
    const book = await Book.findOne({ _id: req.params.id });
    if (action === "add") {
      if (reader.wishList.includes(book)) {
        return res
          .status(400)
          .json({ error: "Book already in wishlist", success: false });
      }

      reader.wishList.push(book);

      await reader.save();
      return res.status(200).json({ success: true });
    } else if (action === "remove") {
      if (!reader.wishList.map(String).includes(book._id.toString())) {
        // compare with the string
        return res
          .status(200)
          .json({ error: "Book not in wishlist", success: false });
      }

      reader.wishList.pull(book);
      await reader.save();
      return res.status(200).json({ success: true });
    }
    // Notification
    const message =
      action === "add" ? "Added to wishlist" : "Removed from wishlist";
    const notificationMessage = `${
      book.title
    } has been ${message.toLowerCase()}.`;
    await notify(req.user._id, message, notificationMessage);
  } catch (err) {
    console.log(err);
    res.status(400).json({ errors: err });
  }
});

// Show cart route
const fetchCarts = async (req, res, next) => {
  try {
    // Fetch all carts associated with the user
    const carts = await Cart.find({ reader: req.user._id }).populate(
      "books.book",
    );

    req.carts = carts;
    next();
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Middleware to fetch loans
const fetchLoans = async (req, res, next) => {
  try {
    const loans = await Borrow.find({ reader: req.user._id })
      .populate("books")
      .populate("library");

    req.readerLoans = loans;
    next();
  } catch (err) {
    res.status(400).json({ errors: err });
  }
};

// Middleware to fetch wishlist
const fetchWishlist = async (req, res, next) => {
  try {
    const wishlist = await Reader.findOne({ _id: req.user._id }).populate(
      "wishList",
    );

    req.wishlist = wishlist.wishList;

    next();
  } catch (err) {
    res.status(400).json({ errors: err });
  }
};

// Middleware to fetch requests
const fetchRequests = async (req, res, next) => {
  try {
    const readerRequests = await Request.find({ reader: req.user._id })
      .populate("books", "title")
      .populate("library", "username")
      .exec();

    const formattedRequests = await Promise.all(
      readerRequests.map(async (request) => {
        const pickup = await Pickup.findOne({ request: request._id });

        return {
          _id: request._id,
          books: request.books,
          library: request.library,
          createdOn: request.createdOn,
          status: request.status,
          pickupDate: pickup ? pickup.pickupDate : null,
        };
      }),
    );

    req.readerRequests = formattedRequests;
    next();
  } catch (err) {
    res.status(400).json({ errors: err });
  }
};

// Reader profile route
// Update the wishlist to the user profile
router.get(
  "/profile",
  isReader,
  fetchCarts,
  fetchRequests,
  fetchLoans,
  fetchWishlist,
  async (req, res) => {
    try {
      const reader = await Reader.findOne({ _id: req.user._id });
      const wishList = req.user.wishList;
      let wishlistBooks = await Book.find({ _id: { $in: wishList } });
      res.render("reader/reader-profile", {
        reader: reader,
        user: req.user,
        wishList: wishlistBooks || [],
        carts: req.carts || [],
        loans: req.readerLoans || [],
        formattedRequests: req.readerRequests || [],
        errors: [],
      });
    } catch (err) {
      res.status(400).json({ errors: err });
    }
  },
);

// Update profile route
// router.post(
//   "/profile/edit-profile",
//   uploads.fields([
//     { name: "background", maxCount: 1 },
//     { name: "avatar", maxCount: 1 },
//   ]),
//   isReader,
//   validateUsername,
//   async (req, res) => {
//     const errors = validationResult(req);

//     console.log("req.files:", req.files);
//     console.log("req.body:", req.body);
//     const wishList = req.user.wishList
//     let wishlistBooks = await Book.find({_id: {$in: wishList}});
//     if (!errors.isEmpty()) {
//       // If there are validation errors, render the page with errors
//       return res.render("reader/reader-profile", {
//         user: req.user,
//         errors: errors.array(),
//         wishList: wishlistBooks,
//       });
//     }
//     try {
//       if (!req.body.confirm) {
//         // Show error must confirm to change
//         return res.render("reader/reader-profile", {
//           user: req.user,
//           errors: [{ msg: "You must confirm the changes" }],
//           wishList: wishlistBooks,
//         });
//       }

//       const updateProfile = {};

//       // Update username if it's changed
//       if (req.body.username && req.body.username !== req.user.username) {
//         updateProfile.username = req.body.username;
//       }

//       // Update background image if it's changed
//       if (req.files.background) {
//         updateProfile.background = req.files.background[0].path;
//       }

//       // Update avatar if it's changed
//       if (req.files.avatar) {
//         updateProfile.profilePicture = req.files.avatar[0].path;
//       }

//       // Save the changes to the database
//       const updatedReader = await Reader.findOneAndUpdate(
//         { _id: req.user._id }, // Query condition
//         { $set: updateProfile }, // Use $set to only update specified fields
//         { new: true }, // Options: Return the modified document
//       );

//       if (!updatedReader) {
//         console.log("Reader not found or not updated");
//         return res.render("reader/reader-profile", {
//           user: req.user,
//           errors: [{ msg: "Reader not found or not updated" }],
//           wishList: wishlistBooks,
//         });
//       }

//       console.log("Document updated");

//       notify(req.user._id, "Profile updated", "Profile updated successfully");

//       res.redirect("/homepage");
//     } catch (err) {
//       console.log("Error:", err);
//       return res.render("reader/reader-profile", {
//         user: req.user,
//         errors: [{ msg: "Internal Server Error" }],
//         wishList: wishlistBooks,
//       });
//     }
//   },
//   (error, req, res, next) => {
//     if (error instanceof multer.MulterError) {
//       if (error.code === "LIMIT_FILE_SIZE") {
//         res.render("reader/reader-profile", {
//           user: req.user,
//           errors: [
//             { msg: "File Too Large: Please upload an image smaller than 2MB" },
//           ],
//           wishList: wishlistBooks
//         });
//       }
//     }
//   },
// );

// Error Handler for the file upload (only for upload background and avatar picture)
function handleMulterErrors(req, res, next) {
  uploads.fields([
    { name: "background", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ])(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        console.log("Cannot upload file");
        console.log(err.code);
        return res.status(400).json({
          errors: ["File Too Large: Please upload an image smaller than 2MB"],
          success: false,
        });
      }
    }
    return next(err);
  });
}

// Update profile for Reader
router.post(
  "/profile/edit-profile",
  handleMulterErrors,
  isReader,
  validateUsername,
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // If there are validation errors, send a JSON response with the errors
      return res.status(400).json({ errors: errors.array(), success: false });
    }

    try {
      if (!req.body.confirm) {
        // Show error must confirm to change
        return res
          .status(400)
          .json({ errors: ["You must confirm the changes"], success: false });
      }

      const updateProfile = {};

      // Update username if it's changed
      if (req.body.username && req.body.username !== req.user.username) {
        updateProfile.username = req.body.username;
      }

      // Update background image if it's changed
      if (req.files.background) {
        updateProfile.background = req.files.background[0].path;
      }

      // Update avatar if it's changed
      if (req.files.avatar) {
        updateProfile.profilePicture = req.files.avatar[0].path;
      }

      // Save the changes to the database
      const updatedReader = await Reader.findOneAndUpdate(
        { _id: req.user._id }, // Query condition
        { $set: updateProfile }, // Use $set to only update specified fields
        { new: true }, // Options: Return the modified document
      );

      if (!updatedReader) {
        console.log("Reader not found or not updated");
        return res.status(400).json({
          errors: ["Reader not found or not updated"],
          success: false,
        });
      }

      console.log("Document updated");

      notify(req.user._id, "Profile updated", "Profile updated successfully");

      // Send a JSON response with the updated reader
      return res.json({ updatedReader, success: true });
    } catch (err) {
      console.log("Error:", err);
      return res
        .status(500)
        .json({ errors: ["Internal Server Error"], success: false });
    }
  },
);

// Set default for user profile
router.post("/profile/set-default", isReader, async (req, res) => {
  try {
    let defaultSetting = {};
    console.log(req.user);

    defaultSetting.username = "Bibliophile";
    defaultSetting.profilePicture = "uploads/default_ava.png";
    defaultSetting.background = "uploads/default_bg.jpeg";

    // Update the user's profile with the default settings
    const updatedReader = await Reader.findOneAndUpdate(
      { _id: req.user._id }, // Query condition
      defaultSetting, // Update object
      { new: true }, // Options: Return the modified document
    );

    if (!updatedReader) {
      console.log("Reader not found or not updated");
      return res.render("reader/reader-profile", {
        user: req.user,
        errors: [{ msg: "Reader not found or not updated" }],
      });
    }
    console.log("Default profile set");
    res.redirect("/homepage");
  } catch (error) {
    console.log("Error:", error);
    return res.render("reader/reader-profile", {
      user: req.user,
      errors: [{ msg: "Internal Server Error" }],
    });
  }
});

// Get Library Profile
// Dont need to login
router.get("/library-profile/:id", async (req, res) => {
  try {
    const library = await Library.findById(req.params.id);
    if (!library) {
      return res.status(404).render("404", { message: "Library not found" });
    }

    const books = await Book.find({ library: { $in: req.params.id } });
    if (req.user) {
      const wishList = req.user.wishList;
      let wishlistBooks = await Book.find({ _id: { $in: wishList } });
      res.render("reader/library-profile", {
        library: library,
        user: req.user,
        wishList: wishlistBooks,
        books: books,
      });
    } else {
      res.render("reader/library-profile", {
        library: library,
        user: req.user,
        books: books,
      });
    }
  } catch (errors) {
    console.log("Error:", errors);
    res.redirect("/homepage");
  }
});

// Library list route
router.get("/library", async (req, res) => {
  try {
    const libraries = await Library.find({});
    const wishList = req.user.wishList;
    let wishlistBooks = await Book.find({ _id: { $in: wishList } });
    res.render("reader/library-list", {
      libraries: libraries,
      user: req.user,
      wishList: wishlistBooks,
    });
  } catch (err) {
    res.status(400).json({ errors: err });
    res.redirect("/homepage");
  }
});

module.exports = router;
