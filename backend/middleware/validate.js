const { body, validationResult } = require("express-validator");

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Validation failed",
            errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
}

const signupValidation = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").trim().isEmail().withMessage("A valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("college").trim().notEmpty().withMessage("College is required"),
    body("role").optional().isIn(["student", "host"]).withMessage("Role must be student or host")
];

const loginValidation = [
    body("email").trim().isEmail().withMessage("A valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
];

const eventValidation = [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("venue").trim().notEmpty().withMessage("Venue is required"),
    body("date").isISO8601().withMessage("A valid date is required"),
    body("capacity").optional().isInt({ min: 1 }).withMessage("Capacity must be a positive number")
];

module.exports = { handleValidation, signupValidation, loginValidation, eventValidation };