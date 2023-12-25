const Library = require("../models/library");
const { Book, categoriesArray } = require("../models/book");
const { Borrow, Pickup, Request } = require("../models/borrow");
const {
  validateBookCreation,
  validateUsername,
} = require("../config/validator");
const upload = require("./../config/multer");
const { validationResult } = require("express-validator");
const { Librarian, Reader } = require("../models/user");
const nodemailer = require("nodemailer");

// Flow: Librarian accept the pickup request created by the user or decline it.
// If Accept, redirect librarian to page to create a pickup and change request status to accept
// If Decline, change request status to decline (Reader can reopen the request)
// Librarian decides on the pickup date, determine which book to let the reader borrow
// User go to the library and pickup the books then librarian create a borrow record
// If Reader doesn't pickup the book, librarian can set the pickup as canceled
// When change pickup status to canceled, decrease amount books of the pickup by 1, if change from canceled to scheduled, also increase pickup by 1
// If Reader picks up the book, create a borrow record
// Notify the reader if it is turned into overdued
// If borrow is set as canceled, books are considered lost
// When set book as returned, librarian has to determine which book is returned.Automatically increment available of books returned by 1, and decrease amount by 1 of books that are not returned.
// After some time the reader return the book
// The librarian determine if the books are returned and confirm the return

// TODO: Create a schema for pickup request, modify borrow schemas, send email when changing information of the record
// TODO: Real time chat between librarians and readers

const router = require("express").Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

function isLibrarian(req, res, next) {
  // If is librarian then move to the next task
  if (req.isAuthenticated && req.user && req.user.__t === "Librarian") {
    return next();
  }
  res.redirect("/homepage");
}

// Profile
router.get("/profile", isLibrarian, async (req, res) => {
  // View both account info and library info
  try {
    const library = await Library.findById(req.user.library);

    res.render("librarian/profile", {
      user: req.user,
      library: library,
      errors: [],
    });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/profile", validateUsername, async (req, res) => {
  // Change account info (only allow changing username)
  try {
    const library = await Library.findById(req.user.library);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("librarian/profile", {
        user: req.user,
        library: library,
        errors: errors.array(),
      });
    }

    await Librarian.findByIdAndUpdate(req.user._id, {
      username: req.body.username,
    });

    res.render("librarian/profile", {
      user: req.user,
      library: library,
      errors: [],
    });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

// Inventory
router.get("/inventory", isLibrarian, async (req, res) => {
  // Display all the books
  try {
    const books = await Book.find({ library: req.user.library });
    res.render("librarian/inventory", { books: books });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.get("/add_book", isLibrarian, (req, res) => {
  // Render form
  res.render("librarian/add_book", { categories: categoriesArray });
});

router.post(
  "/add_book",
  upload.array("images", 3),
  validateBookCreation,
  async (req, res) => {
    // Confirm form
    if (req.files.length !== 3) {
      return res.render("librarian/add_book", {
        errors: [{ msg: "Book require exactly 3 images" }],
        categories: categoriesArray,
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("librarian/add_book", {
        errors: errors.array(),
        categories: categoriesArray,
      });
    }

    try {
      // Category will be a checklist to add multiple tags
      const { title, author, categories, description, publishDate, amount } =
        req.body;

      // Ensure book is unique within a library
      const book = await Book.findOne({ title: title });
      if (book)
        return res.render("librarian/add_book", {
          errors: [{ msg: "Book already exists in this library" }],
          categories: categoriesArray,
        });

      // Create a new book
      const newBook = new Book({
        title: title,
        coverImages: req.files.map((file) => file.path),
        author: author,
        category: categories,
        description: description,
        publishDate: publishDate,
        amount: amount,
        library: req.user.library,
      });

      await newBook.save();
      res.redirect("/librarian/inventory");
    } catch (e) {
      res.status(400).json({ errors: e });
    }
  },
);

// Route shared by librarian and reader
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

router.post("/book_detail/:id", isLibrarian, (req, res) => {
  // Change book detail (when changing amount, only allow reducing the amount at most by the available amount)
});

// Request, Pickup and Borrow management
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

router.get("/customer", isLibrarian, async (req, res) => {
  // Show all pickups, borrows, and requests of a library
  try {
    const requests = await Request.find({ library: req.user.library });
    const pickups = await Pickup.find({ library: req.user.library });
    const borrows = await Borrow.find({ library: req.user.library });

    res.render("librarian/customer", {
      requests: requests,
      pickups: pickups,
      borrows: borrows,
    });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.get("/borrow/:id", isLibrarian, async (req, res) => {
  // Display borrow information
  try {
    const borrow = await Borrow.findById(req.params.id);
    if (borrow.library !== req.user.library)
      return res.redirect("/librarian/customer");
    res.render("librarian/borrow", { borrow: borrow });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/borrow/update_date/:id", async (req, res) => {
  // Update return date of pickup, only able to set date that are after or is today
  try {
    const { dueDate } = req.body;
    const borrow = await Borrow.findByIdAndUpdate(
      req.params.id,
      { dueDate: dueDate },
      { new: true },
    ).populate("reader");

    // Send notification email
    transporter.sendMail({
      to: borrow.reader.gmail,
      subject: "VxNhe Pickup borrow due date modified",
      // Modify the content of emails later (Maybe add library's name, list of accepted books)
      html: `Your borrow's due date has been pushed to ${dueDate}`,
    });

    await notify(
      borrow.reader._id,
      "Update borrow date",
      `Your borrow's due date has been pushed to ${dueDate}`,
    );

    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/borrow/return/:id", async (req, res) => {
  // Librarian determines which book is returned or lost
  // If a book is set as lost, automatically decrease the amount by 1
  // If a book is set as returned, automatically increase availability by 1
  // If all books are not outstanding, set the borrow as completed
  let session; // Declare the session variable outside the try block

  try {
    const { returned, lost } = req.body;

    // Use a transaction for atomicity
    session = await mongoose.startSession();
    session.startTransaction();

    // Change books states and increment/decrease
    await Borrow.updateOne(
      { _id: req.params.id, books: { $in: returned } },
      { $set: { "books.$[].status": "returned" } },
      { session },
    );

    await Borrow.updateOne(
      { _id: req.params.id, books: { $in: lost } },
      { $set: { "books.$[].status": "lost" } },
      { session },
    );

    // Update available and amount for returned and lost books
    await Book.updateMany(
      { _id: { $in: [...returned, ...lost] } },
      {
        $inc: {
          available: returned ? 1 : 0,
          amount: lost ? -1 : 0,
        },
      },
      { session },
    );

    // Check if all books are not outstanding
    const allBooksReturnedOrLost = await Borrow.findOne({
      _id: req.params.id,
      "books.status": { $ne: "outstanding" },
    }).session(session);

    if (allBooksReturnedOrLost) {
      // Update the borrow record status to "Completed"
      const borrow = await Borrow.findByIdAndUpdate(
        req.params.id,
        { status: "Completed" },
        { session },
      );
      // Send notfications
      transporter.sendMail({
        to: borrow.reader.gmail,
        subject: "VxNhe Borrow completed",
        // Add library of the borrow, add links, etc
        html: `Your borrow record has been set to completed`,
      });

      await notify(
        borrow.reader._id,
        "Borrow completed",
        `Your borrow record is completed`,
      );
    }

    // TODO: Send notifications to all users who are book marking the returned books

    await session.commitTransaction();

    res.redirect("/librarian/customer");
  } catch (e) {
    // Check if session is defined before using it
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(400).json({ errors: e });
  }
});

router.post("/borrow/overdue/:id", async (req, res) => {
  // Mark borrow as overdue and send notifications
  try {
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/borrow/cancel/:id", async (req, res) => {
  // Mark borrow as canceled, decrease amount by 1 and send notifications
  try {
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.get("/pickup/:id", isLibrarian, async (req, res) => {
  // Display pickup information
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate("reader")
      .populate("books");
    if (pickup.library !== req.user.library)
      return res.redirect("/librarian/customer");
    res.render("librarian/pickup", { pickup: pickup });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/pickup/update_date/:id", async (req, res) => {
  // Update date of pickup, only able to set date that are after or is today.
  // Only able to change date of scheduled pickups
  try {
    const { takeDate } = req.body;
    // Preventing changing scheduled pickups directly in the frontend
    const pickup = await Pickup.findByIdAndUpdate(req.params.id, {
      takeDate: takeDate,
    }).populate("reader");

    // Send notification email
    transporter.sendMail({
      to: pickup.reader.gmail,
      subject: "VxNhe Pickup pickup date modified",
      // Modify the content of emails later (Maybe add library's name, list of accepted books)
      html: `Your pickup's take date has been pushed to ${takeDate}`,
    });

    await notify(
      pickup.reader._id,
      "Update pickup date",
      `Your pickup's take date has been pushed to ${takeDate}`,
    );

    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/pickup/cancel/:id", async (req, res) => {
  // Change status to canceled, increment available of all books by 1. Can't change status from canceled to anything else
  try {
    const { cancelReason } = req.body;
    const pickup = await Pickup.findByIdAndUpdate(
      req.params.id,
      { status: "Canceled" },
      { new: true },
    ).populate("reader");

    // Send notification email
    transporter.sendMail({
      to: pickup.reader.gmail,
      subject: "VxNhe Pickup pickup modified",
      // Add more detail (reason for cancel)
      html: `Your pickup has been canceled for ${cancelReason}`,
    });

    await notify(
      pickup.reader._id,
      "Update pickup status",
      `Your pickup has been canceled for ${cancelReason}`,
    );

    // Increment available of books by 1. If the previous available is 0, then notify user's who wishlisted the books
    for (let book of pickup.books) {
      const bookRecord = await Book.findById(book._id);

      if (bookRecord.available === 0) {
        // Notify readers
        const readers = await Reader.find({ wishlist: bookRecord._id });

        for (let reader of readers) {
          await notify(
            reader._id,
            `${bookRecord.title} available`,
            `The ${bookRecord.title} is now available to borrow`,
          );
        }
      }

      await Book.findByIdAndUpdate(book._id, { $inc: { available: 1 } });
    }

    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/pickup/complete/:id", async (req, res) => {
  // Change status to completed, create a borrow record
  try {
    const { dueDate } = req.body;
    const pickup = await Pickup.findByIdAndUpdate(
      req.params.id,
      { status: "Completed" },
      { new: true },
    ).populate("reader");

    // Send notification email
    transporter.sendMail({
      to: pickup.reader.gmail,
      subject: "VxNhe Pickup pickup modified",
      // Add more detail (reason for cancel)
      html: `Your pickup has been completed. The due date for your loan is ${dueDate}`,
    });

    // Create borrow record
    const borrow = new Borrow({
      reader: pickup.reader._id,
      books: pickup.books.map((id) => ({ _id: id, status: "outstanding" })),
      library: pickup.library,
      dueDate: dueDate,
    });

    await borrow.save();

    // Send email
    transporter.sendMail({
      to: pickup.reader.gmail,
      subject: "VxNhe Pickup borrow created",
      // Change messages, add more detail later
      html: `A borrow has been created`,
    });

    await notify(
      pickup.reader._id,
      "Created borrow",
      `A borrow has been created. The due date for your loan is ${dueDate}`,
    );
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.get("/request/:id", isLibrarian, async (req, res) => {
  // Display pickup request information
  // Librarian chooses books to approve, choose a pickup date which pops up, then confirm the pickup creation by clicking on a button
  // Librarian can click on a book to redirect to that book's detail
  try {
    const request = await Request.findById(req.params.id)
      .populate("reader")
      .populate("books");
    if (request.library !== req.user.library)
      return res.redirect("/librarian/customer");
    res.render("librarian/request", { request: request });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/request/accept/:id", async (req, res) => {
  // Accept a request and create a pickup record
  try {
    const { approved, takeDate } = req.body;

    // Change request status to accept
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status: "Accepted" },
      { new: true },
    )
      .populate("reader")
      .populate("books")
      .populate("library")
      .exec();

    // Create pickup
    const pickup = new Pickup({
      reader: request.reader,
      books: approved,
      library: request.library,
      takeDate: takeDate,
      request: request._id,
    });

    await pickup.save();

    // Send notification email
    const bookListHTML = request.books
      .map((book) => `<li>${book.title}</li>`)
      .join("");
    transporter.sendMail({
      to: request.reader.gmail,
      subject: "VxNhe Pickup request accepted",
      // Modify the content of emails later (Maybe add library's name, list of accepted books)
      html: `<p>Your request has been accepted. Come and pickup your books on ${takeDate}</p>
                    <p>Here is the list of accepted books:</p>
                    <ul>${bookListHTML}</ul>`,
    });

    await notify(
      request.reader._id,
      "Request accepted",
      `Your borrow request has been accepted. See the details of the pickup in your email`,
    );

    // Decrease by 1 for all books
    for (let book of pickup.books) {
      await Book.findByIdAndUpdate(book._id, { $inc: { available: 1 } });
    }

    // Redirect to customer page
    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/request/decline/:id", async (req, res) => {
  // Decline a request
  try {
    const { declineReason } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status: "Declined" },
      { new: true },
    ).populate("reader");

    // Send notification email
    transporter.sendMail({
      to: request.reader.gmail,
      subject: "VxNhe Pickup request declined",
      // Add more content (reason for the decline)
      html: `Your request has been declined for ${declineReason}`,
    });

    await notify(
      request.reader._id,
      "Request declined",
      `Your borrow request has been declined for ${declineReason}`,
    );

    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

// Dashboard
router.get("/dashboard", isLibrarian, (req, res) => {
  res.render("librarian/dashboard");
});

module.exports = { notify, transporter };
module.exports = router;

