const router = require("express").Router();
const passport = require("passport");
const bcrypt = require("bcrypt"); 
const {Reader} = require("./../models/user");
const validateRegistration = require("./../config/validator");
const { validationResult } = require("express-validator");

// TODO: Modify login redirect for different types of users

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
router.get('/register', checkAuthenticated, (req, res) => {
    res.render('checkin/register', {});
})

router.post('/register', validateRegistration, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('checkin/register', {errors: errors.array()})
    }

    let {username, gmail, password} = req.body;
    username = username.trim();
    gmail = gmail.trim(); 
    password = password.trim();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let reader =  new Reader({
            username: username, 
            gmail: gmail, 
            password: hashedPassword,
        })
        await reader.save();
        res.redirect('/checkin/login');
    } catch(e) {
        if (e.code === 11000 || e.code === 11001) {
            res.render('checkin/register', {errors: [{msg: "Account already exists"}]});
        } else {
            res.status(400).json({ errors: e });
        }
    }
})

module.exports = router;