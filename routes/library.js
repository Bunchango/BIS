const router = require("express").Router();
const Library = require("./../models/library");
const {Librarian} = require("./../models/user");
const {LibrarianVerification} = require("./../models/verification");
const upload = require("./../config/multer");

// Only library admin can access this page
function isLibraryAdmin(req, res, next) {
    // If is library admin then move to the next task
    if (req.isAuthenticated && req.user && req.user.__t === "Library") {
        return next();
    }
    res.redirect("/homepage");
}

router.get("/manage", isLibraryAdmin, async (req, res) => {
    // Get all current librarians under the library, and get librarian who hasn't verify (creating)
    try {
        const librarians = await Librarian.find({library: req.user.id}); 
        const verifyingLibrarians = await LibrarianVerification.find({library: req.user.id});

        res.render("library/manage", {librarians: librarians, verifyingLibrarians: verifyingLibrarians});
    } catch(e) {
        res.status(400).json({ errors: e });
    }
}) 

router.post("/manage", isLibraryAdmin, async (req, res) => {
    // Create a new librarian, send an email to verify
    let {username, gmail, password, confirmPassword, acceptTerms} = req.body;
    username = username.trim();
    gmail = gmail.trim(); 
    password = password.trim();

    if (password !== confirmPassword) {
        return res.render('library/manage', {errors: [{msg: "Password different from confirm password"}]});
    }

    if (!acceptTerms) {
        return res.render('library/manage', {errors: [{msg: "You must accept terms and conditions"}]});
    }

    const account = await User.findOne({gmail: gmail});
    if (account) {
        return res.render('checkin/register', {errors: [{msg: "Account already exists"}]});
    }

    const token =  crypto.randomBytes(20).toString("hex"); 

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const librarian = new LibrarianVerification({
            username: username, 
            password: hashedPassword, 
            gmail: gmail, 
            verificationCode: token,
            library: req.user.__t,
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
        res.redirect("library/manage");

    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get("/profile", isLibraryAdmin, (req, res) => {
    // Show library information
    res.render("library/profile", {admin: req.user});
})

router.post("/profile", upload.fields([{ name: "logo" }, { name: "banner" }]), async (req, res) => {
    // Pre render the fields with original values
    // TODO: Make location changable
    // Change library information: username, profile picture, location, banner
    try {
        if (!req.body.confirm) {
            // Show error must confrim to change 
            res.render("library/profile", {admin: req.user, msg: "You must confirm the changes"})
        }

        const updateFields = {};
        if (req.body.username) updateFields.username = req.body.username; 
        if (req.body.logo) updateFields.profilePicture = req.body.logo;
        if (req.body.banner) updateFields.banner = req.body.banner;

        await Library.findOneAndUpdate({id: req.user.__id}, updateFields); 
        res.redirect("library/manage");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

// Need to check if from same library
router.get("/librarian/:id", isLibraryAdmin, async (req, res) => {
    // Show librarian information
    try {
        const librarian = await Librarian.findById(req.params.id);
        if (librarian) {
            // Check if from the same library
            if (librarian.library !== req.user.__id) {
                res.redirect("library/manage");
            }
            else {
                res.render("library/librarian-detail");
            }
        } else {
            // If does not exist then redirect to manage page
            res.redirect("library/manage");
        }
    } catch(e) {
        res.status(400).json({ errors: e });
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

module.exports = router;