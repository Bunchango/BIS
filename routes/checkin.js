const router = require("express").Router();

// Auth login
router.get("/login", (req, res) => {
    res.render("login");
})

// Auth logout, the routing will be used in profile
router.post("/logout", (req, res) => {
    res.send("Logging out")
})

// Register
router.get("/register", (req, res) => {
    res.send("Rendering registration");
})

// Create account
router.post("/register", (req, res) => {
    res.send("Creating an account");
})

// Auth with google
router.get("/google", (req, res) => {
    // Handle with passport
    res.send("Logging in with google");
})


module.exports = router;