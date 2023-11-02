const jwt = require("jsonwebtoken");
const catchAsync = require("../utils/catchAsync.js");
const User = require("../models/user");
const AppError = require("../utils/appError.js");
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
exports.signUp = catchAsync(async (req, res, next) => {
  if (req.body.password != req.body.passwordConfirm) {
    return next(new Error("password not same"));
  }
  if (!(req.body.role == "buyer" || req.body.role == "seller")) {
    return next(new Error("invalid role"));
  }
  res.status(200).json({ message: "ruko" });
  //   const newUser = await User.create({
  //     name: req.body.name,
  //     email: req.body.email,
  //     password: req.body.password,
  //   });
});
