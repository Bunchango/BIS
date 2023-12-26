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
const { notify, transporter } = require("./librarian");
const Library = require("../models/library");
const { localsName } = require("ejs");
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
const renderSearchResultPage = (req, res) => {
  res.render("reader/search_result", {
    user: req.user,
    ...req.paginatedResults,
  });
};

// Search route
router.get("/search", searchBooks, paginatedResults, renderSearchResultPage);

// Book Detail Route
router.get("/book_detail/:id", async (req, res) => {
  try {
    const book = await Book.findById(
      new mongoose.Types.ObjectId(req.params.id),
    );

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.render("book/book_detail", { book, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ errors: err });
  }
});

// Show cart route
router.get("/cart", isReader, async (req, res) => {
  try {
    const cart = await Cart.findOne({ reader: req.user._id }).populate(
      "books.book",
    );

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    res.render("reader/cart", { cart: cart, user: req.user });
  } catch (err) {
    res.status(400).json({ errors: err });
    res.redirect("/homepage");
  }
});

// Add book to cart route
router.post("/cart/:id", isReader, async (req, res) => {
  try {
    const bookId = req.params.id;

    // Check if the book is already in the user's cart
    const existingCart = await Cart.findOne({
      reader: req.user._id,
      "books.book": bookId,
    });

    if (existingCart) {
      return res.status(400).json({ error: "Book is already in your cart" });
    }

    const date = new Date();

    const newCart = new Cart({
      reader: req.user._id,
      books: [{ book: bookId }],
      createdOn: date,
    });

    await newCart.save();

    res
      .status(201)
      .json({ message: "Book added to cart successfully", cart: newCart });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Remove book from cart route
router.post("/cart/:id", isReader, async (req, res) => {
  try {
    const bookId = req.params.id;

    // Check if the book is already in the user's cart
    const existingCart = await Cart.findOne({
      reader: req.user._id,
      "books.book": bookId,
    });

    if (!existingCart) {
      return res.status(400).json({ error: "Book is not in your cart" });
    }

    await Cart.deleteOne({ reader: req.user._id, "books.book": bookId });

    res.status(200).json({ message: "Book removed from cart successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Send book request from cart route
router.post("/cart/request", isReader, async (req, res) => {
  try {
    const cart = await Cart.findOne({ reader: req.user._id }).populate(
      "books.book",
    );
    const library = req.body.library;

    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const date = new Date();

    const newRequest = new Request({
      reader: req.user._id,
      books: cart.books.map((book) => book.book),
      library: library,
      createdOn: date,
    });

    await newRequest.save();

    await Cart.deleteMany({ reader: req.user._id });

    // Notification
    await notify(
      req.user._id,
      "Request sent",
      `Request ${request._id} has been sent.`,
    );

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
    // Find the request by ID and populate necessary fields
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

    // Send notification and email to the reader about the cancellation
    await notify(
      req.user._id,
      "Request cancelled",
      `Request ${request._id} has been cancelled.`,
    );

    transporter.sendMail({
      to: request.reader.gmail,
      subject: "VxNhe request cancelled",
      html: `<p>Your request ${request._id} has been cancelled</p>`,
    });

    res.status(200).json(updatedRequest);
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add and remove book from wishlist route
router.post("/wishlist/:id", isReader, async (req, res) => {
  try {
    const action = req.query.action; // check the action
    console.log(action)
    const reader = await Reader.findOne({ _id: req.user._id });
    if (!reader) {
        return res.status(404).json({ error: "Reader not found", success: false });
    }

    const book = await Book.findOne({ _id: req.params.id });
    if (action === 'add') {

      if (reader.wishList.includes(book)) {
        return res.status(400).json({ error: "Book already in wishlist",  success: false });
      } 
    
      reader.wishList.push(book);
      
      await reader.save();
      return res.status(200).json({ success: true })

    } else if (action === 'remove') {

      if (!reader.wishList.map(String).includes(book._id.toString())) { // compare with the string
        return res.status(200).json({ error: "Book not in wishlist", success: false });
      }

      reader.wishList.pull(book);
      await reader.save();
      return res.status(200).json({ success: true })
    }
    // Notification
    const message = action === 'add' ? "Added to wishlist" : "Removed from wishlist";
    const notificationMessage = `${book.title} has been ${message.toLowerCase()}.`;
    await notify  (
      req.user._id,
      message,
      notificationMessage,
    );

  } catch (err) {
    console.log(err)
    res.status(400).json({ errors: err });
  }
});

// Remove book from wishlist route
// router.post("/wishlist/:id", isReader, async (req, res) => {
//   try {
//     const reader = await Reader.findOne({ _id: req.user._id });

//     if (!reader) {
//       return res.status(404).json({ error: "Reader not found" });
//     }

//     const book = await Book.findOne({ _id: req.params.id });

//     if (!reader.wishList.includes(book)) {
//       return res.status(400).json({ error: "Book not in wishlist" });
//     }

//     reader.wishList.pull(book);
//     await reader.save();
//     res.render("reader/wishlist", { wishList: wishList, user: req.user });

//     // Notification
//     await notify(
//       req.user._id,
//       "Removed from wishlist",
//       `${book.title} has been removed from your wishlist.`,
//     );
//   } catch (err) {
//     res.status(400).json({ errors: err });
//     res.render("reader/wishlist", { wishList: wishList, user: req.user });
//   }
// });

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

    if (!wishlist) {
      req.wishlist = [];
    } else {
      req.wishlist = wishlist.wishList;
    }

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
      .populate("library", "name")
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
router.get(
  "/profile",
  isReader,
  fetchRequests,
  fetchLoans,
  fetchWishlist,
  async (req, res) => {
    try {
      const reader = await Reader.findOne({ _id: req.user._id });

      res.render("reader/reader-profile", {
        reader: reader,
        user: req.user,
        wishlist: req.wishlist || [],
        loans: req.readerLoans || [],
        formattedRequests: req.readerRequests || [],
        errors: [],
      });
    } catch (err) {
      res.error(400).json({ errors: err });
      res.redirect("/homepage");
    }
  },
);

// Update profile route
router.post(
  "/profile/edit-profile",
  isReader,
  validateUsername,
  uploads.fields([
    { name: "background", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ]),
  async (req, res) => {
    const errors = validationResult(req);

    console.log("req.files:", req.files);
    console.log("req.body:", req.body);

    if (!errors.isEmpty()) {
      // If there are validation errors, render the page with errors
      return res.render("reader/reader-profile", {
        user: req.user,
        errors: errors.array(),
      });
    }

    try {
      if (!req.body.confirm) {
        // Show error must confirm to change
        return res.render("reader/reader-profile", {
          user: req.user,
          errors: [{ msg: "You must confirm the changes" }],
        });
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
        return res.render("reader/reader-profile", {
          user: req.user,
          errors: [{ msg: "Reader not found or not updated" }],
        });
      }

      console.log("Document updated");
      res.redirect("/homepage");
    } catch (err) {
      console.log("Error:", err);
      return res.render("reader/reader-profile", {
        user: req.user,
        errors: [{ msg: "Internal Server Error" }],
      });
    }
  },
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.render("reader/reader-profile", {
          user: req.user,
          errors: [
            { msg: "File Too Large: Please upload an image smaller than 2MB" },
          ],
        });
      }
    } else {
      next(error);
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
    res.render("reader/library-profile", {
      library: library,
      user: req.user,
    });
  } catch (errors) {
    console.log("Error:", errors);
    res.redirect("/homepage");
  }
});

// Library list route
router.get("/library", async (req, res) => {
  try {
    const libraries = await Library.find({});
    res.render("reader/library-list", {
      libraries: libraries,
      user: req.user,
    });
  } catch (err) {
    res.status(400).json({ errors: err });
    res.redirect("/homepage");
  }
});

module.exports = router;
