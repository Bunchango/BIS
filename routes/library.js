const router = require("express").Router();
const Library = require("./../models/library");
const {Librarian, User} = require("./../models/user");
const {LibrarianVerification} = require("./../models/verification");
const { Book } = require("./../models/book");
const upload = require("./../config/multer");
const nodemailer = require("nodemailer");
const {validateRegistration, validateUsername, validateDescription} = require("./../config/validator");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const multer = require('multer');
// Only library admin can access this page
function isLibraryAdmin(req, res, next) {
    // If is library admin then move to the next task
    if (req.isAuthenticated && req.user && req.user.__t === "Library") {
        return next();
    }
    res.redirect("/homepage");
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
})

router.get("/manage", isLibraryAdmin, async (req, res) => {
    // Get all current librarians under the library, and get librarian who hasn't verify (creating)
    try {
        const librarians = await Librarian.find({library: req.user.id}); 
        const verifyingLibrarians = await LibrarianVerification.find({library: req.user.id});

        res.render("library/manage", {librarians: librarians, verifyingLibrarians: verifyingLibrarians, errors_lib: [], admin: req.user});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
}) 

router.get("/create_librarian", isLibraryAdmin, (req, res) => {
    res.render("library/create_librarian", {errors: []})
})
// The new upadated code is suitable with the design of the fontend
router.post("/create_librarian", isLibraryAdmin, validateRegistration, async (req, res) => {
    const librarians = await Librarian.find({library: req.user.id}); 
    const verifyingLibrarians = await LibrarianVerification.find({library: req.user.id});
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('library/manage', { errors_lib: errors.array(), admin: req.user, librarians: librarians, verifyingLibrarians: verifyingLibrarians})
    }

    // Create a new librarian, send an email to verify
    let {username, gmail, password, confirmPassword, acceptTerms} = req.body;
    username = username.trim();
    gmail = gmail.trim(); 
    password = password.trim();

    if (password !== confirmPassword) {
        return res.render('library/manage', {errors_lib: [{msg: "Password different from confirm password"}], admin: req.user, librarians: librarians, verifyingLibrarians: verifyingLibrarians});
    }

    if (!acceptTerms) {
        return res.render('library/manage', {errors_lib: [{msg: "You must accept terms and conditions"}], admin: req.user, librarians: librarians, verifyingLibrarians: verifyingLibrarians});
    }

    const account = await User.findOne({gmail: gmail});
    if (account) {
        return res.render('library/manage', {errors_lib: [{msg: "Account already exists"}], admin: req.user, librarians: librarians, verifyingLibrarians: verifyingLibrarians});
    }

    const token =  crypto.randomBytes(20).toString("hex"); 

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const librarian = new LibrarianVerification({
            username: username, 
            password: hashedPassword, 
            gmail: gmail, 
            verificationCode: token,
            library: req.user._id,
        })

        await librarian.save();

        // Send verification email
        const url = `http://localhost:5000/checkin/verify?token=${token}&email=${gmail}`;
        transporter.sendMail({
            to: gmail, 
            subject: "VxNhe librarian email verification",
            html: `Please click <a href="${url}">here</a> to verify your email. This link will expire after 1 day, if you don't verify in 1 day your account will be deleted`
        })

        // Redirect to create page
        res.redirect("/library/manage");

    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/profile", isLibraryAdmin, async (req, res) => {
    // Show library information
    let librarians = []
    librarians = await Librarian.find({ library: req.user._id })

    const books = await Book.find({ library: {$in: req.user._id} });
    res.render("library/profile", { admin: req.user, errors_lib: [], librarians: librarians, errors: [], books: books});
})

// Book Detail Route
router.get("/book_detail/:id", async (req, res) => {
    try {
      const book = await Book.findById(req.params.id).populate("library");
  
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      res.render("library/book_detail", {
            admin: req.user, 
            errors_lib: [], 
            book:book,
            user: req.user
        });
    } catch (err) {
      console.error(err);
      res.status(500).json({ errors: err });
    }
});

// Upadte the Libray Profile
router.post("/profile", upload.fields([{ name: "logo" }, { name: "banner" }]), validateUsername, validateDescription,  async (req, res) => {
    // TODO: Make location changable
    // Change library information: username, profile picture, location, banner
    const errors = validationResult(req);
    let librarians = []
    librarians = await Librarian.find({ library: req.user._id })
    
    if (!errors.isEmpty()) {
        return res.render('library/profile', { admin: req.user, errors: errors.array(), librarians : librarians, errors_lib: [] })
    }
    
    try {
        if (!req.body.confirm) {
            // Show error must confrim to change 
            return res.render("library/profile", {admin: req.user, errors: [{msg: "You must confirm the changes"}], librarians : librarians, errors_lib: []})
        }
 
        const updateFields = {};
        if (req.body.username) updateFields.username = req.body.username; 
        if (req.body.description) updateFields.description = req.body.description;

        if (req.files.logo) {
            updateFields.profilePicture = req.files.logo[0].path;
            updateFields.profilePicture = updateFields.profilePicture.replace(/\\/g, "/")
        } 
        
        if (req.files.banner) {
            updateFields.banner = req.files.banner[0].path;
            updateFields.banner = updateFields.banner.replace(/\\/g, "/"); // This replace will help the frontend display the img (only for this part)
        }
 
        await Library.findOneAndUpdate({_id: req.user._id}, updateFields); 
        
        res.redirect("/library/manage");
    } catch(e) {
        if (e instanceof multer.MulterError && e.code === 'LIMIT_FILE_SIZE') {
            let librarians = []
            librarians = await Librarian.find({ library: req.user._id })
            
            res.render("library/profile", {
              admin: req.user,
              errors: [
                { msg: "File Too Large: Please upload an image smaller than 2MB" },
              ],
              errors_lib: [],
              librarians :librarians
            });
        } 
        
    }
})

router.post("/librarian/:id", async (req, res) => {
    // Delete an existing librarian
    try {
        await Librarian.findByIdAndDelete(req.params.id);
        res.redirect("library/manage");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.post("/verifying_librarian/:id", async (req, res) => {
    // Delete a verifying librarian
    try {
        await LibrarianVerification.findByIdAndDelete(req.params.id);
        res.redirect("/library/manage");
    } catch(e) {
        res.status(400).json({errors: e});
    }
})



module.exports = router;