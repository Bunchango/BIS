const {body} = require("express-validator");

const validateRegistration = [
    body("username")
    .isAlphanumeric()
    .withMessage("Username must contain only digits and letters")
    .isLength({ min: 8, max: 15 })
    .withMessage("Username must be between 8 and 15 characters"),

    body("password")
    .isLength({ min: 8, max: 20 })
    .withMessage("Password must be between 8 and 20 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
    ),

    body("gmail")
    .isEmail()
    .withMessage("Please provide a valid email address"),
]

module.exports = validateRegistration