const express = require('express');

const app = express();

// View engine
app.set("view engine", "ejs");

// Routes
app.get("/", (req, res) => {
    res.render("index");
})

app.listen(3000, () => {
    console.log("Listening on port 3000");
})