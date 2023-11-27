const router = require("express").Router();

// Auth login
router.get("/login", (req, res) => {
    res.render("login");
})

// Register
router.get("/register", (req, res) => {
    res.render("register");
})

// Create account
router.post("/register", (req, res) => {
    return
})

// Auth with google
router.get("/google", (req, res) => {
    // Handle with passport
})

module.exports = router;