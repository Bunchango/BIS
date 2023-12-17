const router = require("express").Router();
const passport = require("passport");
const bcrypt = require("bcrypt");
const { Reader, User, Librarian } = require("./../models/user");
const Library = require("./../models/library");
const { ReaderVerification, UserVerification } = require("./../models/verification");
const RecoverAccount = require("./../models/recover");
const {validateRegistration} = require("./../config/validator");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require('dotenv').config({ path: "./../config/config.env" });

// Set up nodemailer
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
})

function checkAuthenticated(req, res, next) {
    if (!req.isAuthenticated()) {
        return next(); // If not authenticated then move to the next task
    }
    // Redirect to home page if already authenticated
    res.redirect("/");
}

// Login
router.get('/login', checkAuthenticated, (req, res) => {
    res.render("checkin/login")
})

// Local login
router.post('/login', checkAuthenticated, passport.authenticate('local', {
    successRedirect: "/homepage",
    failureRedirect: '/checkin/login',
    failureFlash: true,
}))

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        console.log(err);
    })
    res.redirect('/');
})

// Signin with google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// Callback route google
router.get('/google/redirect', passport.authenticate('google', { failureRedirect: '/checkin/login' }), (req, res) => {
    res.redirect('/homepage');
})

// Sign in with facebok
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }))

// Facebook callback route
router.get('/facebook/redirect', passport.authenticate('facebook', { failureRedirect: '/checkin/login' }), (req, res) => {
    res.redirect('/homepage');
})

// Register
router.get('/register', checkAuthenticated, (req, res) => {
    res.render('checkin/register', { errors: null });
})

// Flow: Check if account already exists => create temporary account => Send verify email => User verify account then add account to database
router.post('/register', validateRegistration, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('checkin/register', { errors: errors.array() })
    }

    let { username, gmail, password, confirmPassword, acceptTerms } = req.body;
    username = username.trim();
    gmail = gmail.trim();
    password = password.trim();

    if (password !== confirmPassword) {
        return res.render('checkin/register', { errors: [{ msg: "Password different from confirm password" }] });
    }

    if (!acceptTerms) {
        return res.render('checkin/register', { errors: [{ msg: "You must accept terms and conditions" }] });
    }

    // Check if account exist
    const account = await User.findOne({ gmail: gmail });
    if (account) {
        return res.render('checkin/register', { errors: [{ msg: "Account already exists" }] });
    }

    // Generate verification token for email verification
    const token = crypto.randomBytes(20).toString("hex");

    // If not exist then create temporary account and send verifcation email
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let reader = new ReaderVerification({
            username: username,
            gmail: gmail,
            password: hashedPassword,
            verificationCode: token,
        })
        await reader.save();

        // Send verification email
        const url = `http://localhost:5000/checkin/verify?token=${token}&email=${gmail}`;
        transporter.sendMail({
            to: gmail,
            subject: "VxNhe email verification",
            html: `Please click <a href="${url}">here</a> to verify your email. This link will expire after 1 day, if you don't verify in 1 day your account will be deleted`
        })

        // Redirect to login page
        res.redirect('/checkin/login');
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

// Verify page, when open automatically verify user
router.get('/verify', checkAuthenticated, async (req, res) => {
    const email = req.query.email;
    const token = req.query.token;

    try {
        const verifyAccount = await UserVerification.findOne({ gmail: email });

        if (verifyAccount) {
            // If verify on time then check if correct and create a new account based on account type and delete the verifying account
            if (token === verifyAccount.verificationCode) {
                let user;
                if (verifyAccount.__t === "Reader Verification") {
                    user = new Reader({
                        username: verifyAccount.username,
                        password: verifyAccount.password,
                        gmail: verifyAccount.gmail,
                    });
                } else if (verifyAccount.__t === "Librarian Verification") {
                    user = new Librarian({
                        username: verifyAccount.username,
                        password: verifyAccount.password,
                        gmail: verifyAccount.gmail,
                        library: verifyAccount.library,
                    });
                } else if (verifyAccount.__t === "Library Verification") {
                    user = new Library({
                        username: verifyAccount.username,
                        password: verifyAccount.password,
                        gmail: verifyAccount.gmail,
                        address: verifyAccount.address,
                    });
                }
                // Create a new record
                await user.save();
                // Delete the record after verification
                await UserVerification.deleteOne({ gmail: email });
                res.render('checkin/verify', {verified: true, msg: "Successful", user: req.user});
            } else {
                res.render('checkin/verify', {verified: false, msg: "Invalid code", user: req.user});
            }
        } else {
            // If not render the page showing no account
            res.render('checkin/verify', {verified: false, msg: "Link expired", user: req.user});
        }
    } catch (e) {
        // Show error
        res.status(400).json({ errors: e });
    }
})

// Forgot password route
router.get('/forgot-password', (req, res) => {
    res.render('checkin/forgot-password', {error: null, user: req.user});
})

router.post('/forgot-password', async (req, res) => {
    // Change password
    let email = req.body.email;

    try {
        const account = await User.findOne({ gmail: email, password: { $exists: true } });

        if (!account) {
            // If account does not exist, show error account does not exist
            return res.render('checkin/forgot-password', {error: true, msg: "Account does not exist", user: req.user})
        } else {
            // Only send to accounts that have password
            if (!account.password) return res.render('checkin/forgot-password', {error: true, msg: "Account does not have a password", user: req.user})
            // Send recover email to user's email if exist
            const token = crypto.randomBytes(20).toString("hex");

            const recoverAccount = new RecoverAccount({
                gmail: email,
                recoverCode: token,
            })
            await recoverAccount.save();

            // Send email to user
            const url = `http://localhost:5000/checkin/reset-password?token=${token}&email=${email}`;
            transporter.sendMail({
                to: email,
                subject: "VxNhe change password",
                html: `Please click <a href="${url}">here</a> to change your account's password. If you did not make this request, don't click this link. This link will expire after 1 hour`
            })
            res.redirect('/checkin/login');
        }
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.get('/reset-password', async (req, res) => {
    // Verify if the link has expired
    const email = req.query.email;
    const token = req.query.token;

    try {
        const account = await RecoverAccount.findOne({
            gmail: email,
        })
        if (!account) {
            res.render('checkin/reset-password', {error: true, msg: ["Reset password link expired"], user: req.user});
        } else {
            if (account.recoverCode === token) {
                // If correct shows no error and show the email and allow reset password form
                // Delete the record
                await RecoverAccount.deleteOne({ gmail: email });
                res.render('checkin/reset-password', {error: false, email: email, msg: undefined, user: req.user});
            } else {
                res.render('checkin/reset-password', {error: true, msg: ["Invalid recover code"], user: req.user});
            }
        }
    } catch (e) {
        res.status(400).json({ errors: e });
    }
})

router.post('/reset-password/:email',
    body("password")
        .isLength({ min: 8, max: 20 })
        .withMessage("Password must be between 8 and 20 characters")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character")
    , async (req, res) => {

        const email = req.params.email;
        const password = req.body.password;
        const confirmPassword = req.body.confirmPassword;

        if (password !== confirmPassword) {
            return res.render('checkin/reset-password', { error: false, msg: ["Confirm password and password are different"], email: email, user: req.user })
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('checkin/reset-password', { error: false, msg: errors.array(), email: email, user: req.user })
        }

        // Check if password suit condition
        try {
            const newPassword = await bcrypt.hash(password, 10);
            // Change password  
            await User.findOneAndUpdate({ gmail: email }, { password: newPassword }, { new: true, runValidators: true });

            res.redirect("/checkin/login");
        } catch (e) {
            res.status(400).json({ errors: e });
        }
    })

module.exports = router;