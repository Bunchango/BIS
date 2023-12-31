const { body } = require("express-validator");

const validateRegistration = [
  body("username")
    .matches(/^[A-Za-z0-9 ]+$/)
    .withMessage("Username must contain only letters, numbers")
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
    .matches(/^[A-Za-z0-9 ]+$/)
    .withMessage("Title must contain only letters, numbers")
    .isLength({ min: 5, max: 24 })
    .withMessage("Title must be between 5 and 24 characters"),

  body("author")
    .matches(/^[A-Za-z ]+$/)
    .withMessage("Author's name must contain only letters")
    .isLength({ min: 5, max: 24 })
    .withMessage("Author's name must be between 5 and 24 characters"),

  body("description")
    .isLength({ min: 5 })
    .withMessage("Description must be at least 5 characters"),
]

const validateUsername = [
  body("username")
    .matches(/^[A-Za-z0-9 ]+$/)
    .withMessage("Username must contain only letters, numbers")
    .isLength({ min: 8, max: 15 })
    .withMessage("Username must be between 8 and 15 characters")
    .optional({ checkFalsy: true })
]

const validatePassword = [
  body("password")
    .isLength({ min: 8, max: 20 })
    .withMessage("Password must be between 8 and 20 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character",
    ),
]

const validateDescription = [
  body("description")
    .isLength({ min: 10 })
    .withMessage("Description must be greater than 10 characters")
    .optional({ checkFalsy: true })
]

module.exports = { validateRegistration, validateBookCreation, validateUsername, validatePassword, validateDescription }