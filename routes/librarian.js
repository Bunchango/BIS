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
const Notice = require("../models/notice");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

// TODO: book detail path, add modify path to notify

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
    const data = {};
    data.books = books;
    res.render("librarian/inventory", { data: data, user: req.user });
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
  upload.fields([
    { name: "cover_1" },
    { name: "cover_2" },
    { name: "cover_3" },
  ]),
  validateBookCreation,
  async (req, res) => {
    // Confirm form

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

      if (!categories) {
        return res.render("librarian/add_book", {
          errors: [{ msg: "At least 1 category must be selected" }],
          categories: categoriesArray,
        });
      }
    
      // Ensure book is unique within a library
      const book = await Book.findOne({ title: title, library: req.user.library });
      if (book)
        return res.render("librarian/add_book", {
          errors: [{ msg: "Book already exists in this library" }],
          categories: categoriesArray,
        });

      // Create a new book
      const newBook = new Book({
        title: title,
        author: author,
        category: categories,
        description: description,
        publishDate: publishDate,
        amount: amount,
        library: req.user.library,
      });

      if (req.files["cover_1"] && req.files["cover_1"][0]) {
        newBook.cover_1 = req.files["cover_1"][0].path;
      }

      if (req.files["cover_2"] && req.files["cover_2"][0]) {
        newBook.cover_2 = req.files["cover_2"][0].path;
      }

      if (req.files["cover_3"] && req.files["cover_3"][0]) {
        newBook.cover_3 = req.files["cover_3"][0].path;
      }

      await newBook.save();
      res.redirect("/librarian/inventory");
    } catch (e) {
      res.status(400).json({ errors: e });
    }
  },
);

router.get("/book_detail/:id", isLibrarian, async (req, res) => {
  // View book detail
  try {
    const book = await Book.findById(req.params.id).populate("library");

    if (book.library._id.toString() !== req.user.library.toString()) {
      return res.redirect("/librarian/inventory");
    }

    res.render("librarian/book", { user: req.user, book: book, categories: categoriesArray });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/book_detail/delete/:id", async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.redirect("/librarian/inventory");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post(
  "/book_detail/:id",
  upload.fields([
    { name: "cover_1" },
    { name: "cover_2" },
    { name: "cover_3" },
  ]),
  isLibrarian,
  async (req, res) => {
    // Change book detail (when changing amount, only allow reducing the amount at most by the available amount)
    // Change title, author, images, category, description, amount
    try {
      const updateFields = {};
      if (req.body.title) updateFields.title = req.body.title;
      if (req.body.author) updateFields.author = req.body.author;
      if (req.body.category) updateFields.category = req.body.category;
      if (req.body.description) updateFields.description = req.body.description;
      if (req.body.amount) updateFields.amount = req.body.amount;
      if (req.body.available) updateFields.available = req.body.available;

      // Update cover images
      if (req.files["cover_1"] && req.files["cover_1"][0]) {
        updateFields.cover_1 = req.files["cover_1"][0].path;
      }

      if (req.files["cover_2"] && req.files["cover_2"][0]) {
        updateFields.cover_2 = req.files["cover_2"][0].path;
      }

      if (req.files["cover_3"] && req.files["cover_3"][0]) {
        updateFields.cover_3 = req.files["cover_3"][0].path;
      }

      // Perform the update
      await Book.findByIdAndUpdate(req.params.id, updateFields);

      // Render the inventory
      res.redirect("/librarian/inventory");
    } catch (e) {
      res.status(400).json({ errors: e });
    }
  },
);

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
    const requests = await Request.find({ library: req.user.library }).populate(
      "reader",
    );
    const pickups = await Pickup.find({ library: req.user.library }).populate(
      "reader",
    );
    const borrows = await Borrow.find({ library: req.user.library }).populate(
      "reader",
    );

    const data = {};

    if (requests.length > 0) {
      data.requests = requests;
    }

    if (pickups.length > 0) {
      data.pickups = pickups;
    } else if (!pickups) {
      data.pickups = []
    }

    if (borrows.length > 0) {
      data.borrows = borrows;
    }

    res.render("librarian/customer", { data: data, user: req.user });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.get("/borrow/:id", isLibrarian, async (req, res) => {
  // Display borrow information
  try {
    const borrow = await Borrow.findById(req.params.id).populate("reader").populate("books.book");
    if (borrow.library.toString() !== req.user.library.toString()) {
      return res.redirect("/librarian/customer");
    }

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
      { dueDate: dueDate, status: "Ongoing" },
      { new: true },
    ).populate("reader");
    
    // Send notification email
    transporter.sendMail({
      to: borrow.reader.gmail,
      subject: "VxNhe Borrow due date modified",
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
  let {returned, lost} = req.body;

  const session = await mongoose.startSession();
  
  returned = returned ? returned : [];
  lost = lost ? lost : [];

  try {
    await session.withTransaction(async () => {
      const borrow = await Borrow.findById(req.params.id).populate("reader").session(session);

      // Change books states and increment/decrease
        borrow.books.forEach(book => {
          if(returned.includes(book.book._id.toString())) {
              book.status = "returned";
          }
          
          if(lost.includes(book.book._id.toString())) {
            book.status = "lost";
          }
        });
        
        const books = borrow.books.map(({ book, ...rest }) => (book));

        returned = books.filter(book => returned.includes(book.toString()));
        lost = books.filter(book => lost.includes(book.toString())); 

        // Update available and amount for returned and lost books
        await Book.updateMany(
          { _id: { $in: returned } },
          { $inc: { available: 1 } },
          { session: session }
        );
        
        await Book.updateMany(
          { _id: { $in: lost } },
          { $inc: { amount: -1 } },
          { session: session }
        );

        await borrow.save({ session });

        // Check if all books are not outstanding
        const updatedBorrow = await Borrow.findById(req.params.id).populate("reader").session(session);
        const allBooksReturnedOrLost = updatedBorrow.books.every(book => book.status !== 'outstanding');

        if (allBooksReturnedOrLost) {
            // Update the borrow record status to "Completed"
            const borrow = await Borrow.findByIdAndUpdate(
            req.params.id,
            { status: "Returned" },
            ).session(session).populate("reader");

            // Send notfications
            transporter.sendMail({
            to: borrow.reader.gmail,
            subject: "VxNhe Borrow completed",
            html: `Your borrow record has been set to completed`,
            });

            await notify(
            borrow.reader._id,
            "Borrow completed",
            `Your borrow record is completed`,
            );
        }
      });

    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  } finally {
    session.endSession();
  }
});

router.post("/borrow/overdue/:id", async (req, res) => {
  // Mark borrow as overdue and send notifications
  try {
    const borrow = await Borrow.findByIdAndUpdate(
      req.params.id,
      { status: "Overdue" },
      { new: true },
    ).populate("reader");
    // Send notification
    await notify(borrow.reader._id, "Borrow overdue", "Your borrow is overdue");

    // Send email
    transporter.sendMail({
      to: borrow.reader.gmail,
      subject: "VxNhe Borrow overdue",
      // Add link
      html: `Your borrow is overdue`,
    });

    res.redirect("/librarian/customer");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/borrow/cancel/:id", async (req, res) => {
  // Mark borrow as canceled, decrease amount of all books by 1 and send notifications
  try {
    const reason = req.body.reason || "No reason"
    const borrow = await Borrow.findByIdAndUpdate(
      req.params.id,
      { status: "Canceled" },
      { new: true },
    );

    // Decrease amount of all books by 1
    const bookIds = borrow.books.map((book) => book._id); // extract book IDs from the borrow record
    
    await Book.updateMany(
      { _id: { $in: bookIds } },
      { $inc: { amount: -1 } },
    );

    // Send notification
    transporter.sendMail({
      to: borrow.reader.gmail,
      subject: "VxNhe Borrow canceled",
      // Add reason
      html: `Your borrow is canceled for ${reason}`,
    });

    await notify(
      borrow.reader._id,
      "Borrow canceled",
      `Your borrow is canceled for ${reason}`,
    );

    res.redirect("/librarian/customer");
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
      if (pickup.library.toString() !== req.user.library.toString()) {
        return res.redirect("/librarian/customer");
      }
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
      subject: "VxNhe Pickup date modified",
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
      subject: "VxNhe Pickup canceled",
      html: `Your pickup has been canceled for ${cancelReason}`,
    });

    await notify(
      pickup.reader._id,
      "Update pickup status",
      `Your pickup has been canceled for ${cancelReason}`,
    );

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
      subject: "VxNhe Pickup completed",
      // Add more detail (reason for cancel)
      html: `Your pickup has been completed. The due date for your loan is ${dueDate}`,
    });

    // Create borrow record
    const borrow = new Borrow({
      reader: pickup.reader._id,
      books: pickup.books.map((id) => ({ book: id, status: "outstanding" })),
      library: pickup.library,
      dueDate: dueDate,
      pickup: pickup._id,
    });

    await borrow.save();

    // Send email
    transporter.sendMail({
      to: pickup.reader.gmail,
      subject: "VxNhe Borrow created",
      // Change messages, add more detail later
      html: `A borrow has been created`,
    });

    await notify(
      pickup.reader._id,
      "Created borrow",
      `A borrow has been created. The due date for your loan is ${dueDate}`,
    );

    res.redirect("/librarian/customer")
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
      if (request.library.toString() !== req.user.library.toString()) {
        return res.redirect("/librarian/customer");
      }
    res.render("librarian/request", { request: request, error: "" });
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/request/accept/:id", async (req, res) => {
  // Accept a request and create a pickup record
  try {
    const { approved, takeDate } = req.body;
    const request = await Request.findById(req.params.id)      
    .populate("reader")
    .populate("books")
    .populate("library")
    .exec();

    if (!approved) return res.render("librarian/request", { request: request, error: "At least 1 book must be approved to accept request" });
    if (!takeDate) return res.render("librarian/request", { request: request, error: "Take date is required" });

    // Change request status to accept
    await Request.findByIdAndUpdate(
      req.params.id,
      { status: "Accepted" },
      { new: true },
    )

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
      subject: "VxNhe Request accepted",
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
    const bookIds = pickup.books.map(book => book._id);

    await Book.updateMany(
      { _id: { $in: bookIds } },
      { $inc: { available: -1 } }
    );    

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
      subject: "VxNhe Request declined",
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
router.get("/dashboard", isLibrarian, async (req, res) => {
  const data = {}
  const notices = await Notice.find({library: req.user.library});

  if (notices) data.notices = notices;
  data.user = req.user;
  res.render("librarian/dashboard", {data: data, user: req.user});
});

// Add notification to the library
router.post("/notify/add_notify", async (req, res) => {
  try {
    const { description, title } = req.body;
    const notice = new Notice({
      library: req.user.library,
      author: req.user._id,
      title: title,
      description: description,
    });

    await notice.save();
    res.redirect("/librarian/dashboard");
  } catch (e) {
    res.status(400).json({ errors: e });
  }
});

router.post("/notify/delete_notify/:id", async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.redirect("/librarian/dashboard");
  } catch(e) {
    res.status(400).json({ errors: e });
  }
})

// Librarian profile
router.get("/profile", isLibrarian, async (req, res) => {
    const user = await Librarian.findById(req.user._id).populate("library");
  res.render("librarian/profile", { librarian: user, errors: [] });
});

router.post(
  "/profile",
  isLibrarian,
  upload.single("image"),
  validateUsername,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("librarian/profile", {
        librarian: req.user,
        errors: errors.array(),
      });
    }

    try {
      if (!req.body.confirm) {
        // Show error must confrim to change
        res.render("library/profile", {
          admin: req.user,
          errors: [{ msg: "You must confirm the changes" }],
        });
      }

      const updateFields = {};
      if (req.body.username) updateFields.username = req.body.username;
      if (req.file.path) update.profilePicture = req.file.path;

      await Librarian.findOneAndUpdate({ _id: req.user.__id }, updateFields);
      res.redirect("/librarian/profile");
    } catch (e) {
      res.status(400).json({ errors: e });
    }
  },
);

module.exports = { notify, transporter };
module.exports = router;