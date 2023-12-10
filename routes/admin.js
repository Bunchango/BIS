const router = require("express").Router();
const { libraryVerification } = require("../models/verification");
const nodemailer = require("nodemailer");

function isWebsiteAdmin(req, res, next) {
    // If is library admin then move to the next task
    if (req.isAuthenticated && req.user && req.user.__t === "Admin") {
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

router.get("/create_library", isWebsiteAdmin, (req, res) => {
    res.render("admin/create_library");
})

router.post("/create_library", async (req, res) => {
    let {username, gmail, password, confirmPassword, acceptTerms, address} = req.body;
    username = username.trim();
    gmail = gmail.trim(); 
    password = password.trim();
    address = address.trim();

    if (password !== confirmPassword) {
        return res.render('admin/create_library', {errors: [{msg: "Password different from confirm password"}]});
    }

    if (!acceptTerms) {
        return res.render('admin/create_library', {errors: [{msg: "You must accept terms and conditions"}]});
    }

    const account = await User.findOne({gmail: gmail});
    if (account) {
        return res.render('checkin/register', {errors: [{msg: "Account already exists"}]});
    }

    const token =  crypto.randomBytes(20).toString("hex"); 

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const library = new libraryVerification({
            username: username, 
            password: hashedPassword, 
            gmail: gmail, 
            verificationCode: token,
            address: address,
        })

        await library.save();

        // Send verification email
        const url = `http://localhost:5000/checkin/verify?token=${token}&email=${gmail}`;
        transporter.sendMail({
            to: gmail, 
            subject: "VxNhe library email verification",
            html: `Please click <a href="${url}">here</a> to verify your email. This link will expire after 1 day, if you don't verify in 1 day your account will be deleted`
        })

        // Redirect to create page
        res.redirect("admin/create_library");
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

module.exports = router; 