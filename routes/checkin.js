const router = require("express").Router();
const passport = require("passport");
const bcrypt = require("bcrypt"); 
const {Reader, User, Librarian} = require("./../models/user");
const Library = require("./../models/library");
const {ReaderVerification, UserVerification} = require("./../models/verification");
const validateRegistration = require("./../config/validator");
const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require('dotenv').config({path: "./../config/config.env"});

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
    successRedirect: "/", 
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
router.get('/google', passport.authenticate('google', {scope: ['profile', 'email']}))

// Callback route google
router.get('/google/redirect', passport.authenticate('google', {failureRedirect: '/checkin/login'}), (req, res) => {
    res.redirect('/');
})

// Sign in with facebok
router.get('/facebook', passport.authenticate('facebook', {scope: ['email']}))

// Facebook callback route
router.get('/facebook/redirect', passport.authenticate('facebook', {failureRedirect: '/checkin/login'}), (req, res) => {
    res.redirect('/');
})

// Register
router.get('/register-test', checkAuthenticated, (req, res) => {
    res.render('checkin/register-test', {});
})

// Flow: Check if account already exists => create temporary account => Send verify email => User verify account then add account to database
router.post('/register-test', validateRegistration, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('checkin/register-test', {errors: errors.array()})
    }

    let {username, gmail, password} = req.body;
    username = username.trim();
    gmail = gmail.trim(); 
    password = password.trim();

    // Check if account exist
    const account = await User.findOne({gmail: gmail});
    if (account) {
        return res.render('checkin/register-test', {errors: [{msg: "Account already exists"}]});
    }

    // Generate verification token for email verification
    const token =  crypto.randomBytes(20).toString("hex");

    // If not exist then create temporary account and send verifcation email
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let reader =  new ReaderVerification({
            username: username, 
            gmail: gmail, 
            password: hashedPassword,
            verificationCode: token,
        })
        await reader.save();

        // Send verification email
        const url = `http://localhost:5000/checkin/verify?token=${token}?email=${gmail}`;
        transporter.sendMail({
            to: gmail, 
            subject: "VxNhe email verification",
            html: `Click <a href="${url}">here</a> to verify your email.`
        })

        // Redirect to login page
        res.redirect('/checkin/login');
    } catch(e) {
        res.status(400).json({ errors: e });
    }
})

router.get('/verify', checkAuthenticated, async (req, res) => {
    const email = req.query.email;
    const token = req.query.token;
    
    try {
        const verifyAccount = await UserVerification.findOne({email: email});
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
                        location: verifyAccount.location,
                    });
                }
                // Delete the record after verification
                await verifyAccount.remove();
                // Create a new record
                await user.save();
                res.render('/checkin/verify', {verified: true});
            } else {
                res.render('/checkin/verify', {verified: false});
            }
        } else {
            // If not render the page showing no account
            res.render('checkin/verify', {verified: false});
        }
    } catch(e) {
        // Show error
        res.status(400).json({ errors: e });
    }
})

module.exports = router;