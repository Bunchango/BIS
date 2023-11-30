const router = require("express").Router();
const passport = require("passport");

// TODO: Modify login redirect for different types of users

function checkAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next(); // If authenticated then move to the next task
  }
  // Redirect to home page if already authenticated
  res.redirect("/");
}

// Login
router.get('/login', checkAuthenticated, (req, res) => {
    res.render("checkin/login")
})

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
router.get('/facebook', passport.authenticate('facebook', {scope: ["email"]}))

// Facebook callback route
router.get('/facebook/redirect', passport.authenticate('facebook', {failureRedirect: '/checkin/login'}), (req, res) => {
    res.redirect('/');
})

module.exports = router;