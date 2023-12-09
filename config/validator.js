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

const validateBookCreation = [
  body("title")
  .isAlphanumeric()
  .withMessage("Title must contain only letters and numbers")
  .isLength({min: 5, max: 24})
  .withMessage("Title must be between 5 and 24 characters"),

  body("author")
  .isAlpha()
  .withMessage("Author's name must contain only letters")
  .isLength({min: 5, max: 24})
  .withMessage("Author's name must be between 5 and 24 characters"),

  body("description")
  .isAlphanumeric()
  .withMessage("Description must contain only letters and numbers")
  .isLength({min: 5})
  .withMessage("Description must be at least 5 characters"),
]

module.exports = {validateRegistration, validateBookCreation}