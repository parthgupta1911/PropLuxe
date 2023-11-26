const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
function generateOTP() {
  return crypto.randomBytes(2).readUInt16BE(0) % 100000; // Generate a random 5-digit number
}
const catchAsync = require("../utils/catchAsync.js");
const User = require("../models/user");
const { log } = require("console");

// const AppError = require("../utils/appError.js");
function signToken(user) {
  const expiresIn = process.env.JWTEXPIRESIN;
  return jwt.sign({ userId: user._id }, process.env.JWTKEY, {
    expiresIn,
  });
}
exports.signUp = catchAsync(async (req, res, next) => {
  //console.log("hey");
  if (!(req.body.role == "user")) {
    return next(new Error("invalid role"));
  }
  // console.log(process.env.APPPASS);
  const otp = generateOTP();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "propslux@gmail.com",
      pass: process.env.APPPASS,
    },
  });

  // Compose the email
  const mailOptions = {
    from: "propslux@gmail.com",
    to: req.body.email, // User's email address
    subject: "Your OTP Verification Code",
    text: `Your OTP is: ${otp} valid for 2 mins`,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      // console.log("Email sent:", info.response);
    }
  });
  const expirationTime = new Date(Date.now() + 2 * 60 * 1000);

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    verificationCode: otp,
    verificationCodeExpires: expirationTime,
  });
  console.log(newUser.verificationCode);
  const expiresIn = 600;
  const token = jwt.sign({ name: newUser.name }, process.env.JWTVKEY, {
    expiresIn,
  });
  const decoded = jwt.verify(token, process.env.JWTVKEY);
  console.log(decoded);

  res.status(200).json({
    name: newUser.name,
    email: newUser.email,
    token,
  });
});

exports.verifyUser = catchAsync(async (req, res, next) => {
  const { otp } = req.body;

  // Find the user by email and check if the OTP matches and is not expired

  if (req.user.verificationCode !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (req.user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  // Update the user to mark them as verified and remove verification fields
  req.user.verified = true;
  req.user.verificationCode = undefined;
  req.user.verificationCodeExpires = undefined;

  await req.user.save();
  const token = signToken(req.user);
  const decoded = jwt.verify(token, process.env.JWTKEY);
  console.log(decoded);
  res.status(200).json({ message: "User verified successfully", token });
});
exports.resendOTP = catchAsync(async (req, res, next) => {
  const otp = crypto.randomBytes(2).readUInt16BE(0) % 100000; // Generate a random 5-digit number
  const expirationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

  req.user.verificationCode = otp;
  req.user.verificationCodeExpires = expirationTime;

  await req.user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "propslux@gmail.com",
      pass: process.env.APPPASS,
    },
  });

  const mailOptions = {
    from: "propslux@gmail.com",
    to: req.user.email,
    subject: "Your New OTP Verification Code",
    text: `Your new resend OTP is: ${otp} valid for 2 minutes`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    const expiresIn = 600;
    const token = jwt.sign({ name: req.user.name }, process.env.JWTVKEY, {
      expiresIn,
    });

    const decoded = jwt.verify(token, process.env.JWTVKEY);
    console.log(decoded);

    console.log("Email sent:", info.response);
    res.status(200).json({ message: "New OTP sent successfully", token });
  });
});

exports.getProfile = async (req, res) => {
  res.status(200).json({ name: req.user.name, email: req.user.email });
};
exports.login = async (req, res) => {
  const { name, password } = req.body;
  // Check if the provided credentials are valid (replace with your database query)
  const user = await User.findOne({ name, password });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (user.verified == false) {
    return res
      .status(401)
      .json({ message: "please enter otp for verification" });
  }

  // If valid, generate a JWT token and send it in the response
  const token = signToken(user);
  const decoded = jwt.verify(token, process.env.JWTKEY);
  console.log(decoded);
  res.status(200).json({ token });
};
exports.deleteAll = async (req, res, next) => {
  try {
    await User.deleteMany({ role: "user" });
    res
      .status(200)
      .json({ message: "All 'buyer' and 'seller' users have been deleted." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while deleting records." });
  }
};
exports.verifyVtoken = async (req, res, next) => {
  const token = req.body.token;
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token is missing in the request body." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWTVKEY);

    const name = decoded.name;

    try {
      const user = await User.findOne({ name });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      if (user.verified) {
        return res.status(404).json({ message: "User is verified." });
      }
      // User exists, attach the user object to the request for later use
      req.user = user;

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      // console.log(error);
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
    // console.log(error);
    return res.status(401).json({ message: "Invalid token or expired." });
  }
};
exports.checkVtoken = async (req, res, next) => {
  const token = req.body.token;
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token is missing in the request body." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWTVKEY);

    const name = decoded.name;

    try {
      const user = await User.findOne({ name });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      if (user.verified) {
        return res.status(404).json({ message: "User is verified." });
      }
      // User exists, attach the user object to the request for later use
      req.user = user;
      req.user.pass = undefined;
      // Proceed to the next middleware or route handler
      res.status(200).json({ message: "token is valid", user: req.user });
    } catch (error) {
      // console.log(error);
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
    // console.log(error);
    return res.status(401).json({ message: "Invalid token or expired." });
  }
};
exports.verifytoken = async (req, res, next) => {
  const token = req.body.token;
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token is missing in the request body." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWTKEY);

    const { userId } = decoded;

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      if (user.verified == false) {
        return res
          .status(404)
          .json({ message: "unauthorized verify email", email: user.email });
      }
      // User exists, attach the user object to the request for later use
      req.user = user;

      // Proceed to the next middleware or route handler
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
    // console.log(error);
    return res.status(401).json({ message: "Invalid token or expired." });
  }
};
exports.checktoken = async (req, res, next) => {
  const token = req.body.token;
  if (!token) {
    return res
      .status(401)
      .json({ message: "Token is missing in the request body." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWTKEY);

    try {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      // User exists, attach the user object to the request for later use
      req.user = user;
      req.user.pass = undefined;
      // Proceed to the next middleware or route handler
      res.status(200).json({ message: "token is valid", user: req.user });
    } catch (error) {
      // console.log(error);
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
    // console.log(error);
    return res.status(401).json({ message: "Invalid token or expired." });
  }
};
exports.restrictTo = (roles) => {
  return (req, res, next) => {
    //roles is an array(this id done as we want to pass parameters to middleware fn)
    if (req.user.role === "admin") {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. You do not have the required role." });
    }
    next();
  };
};
exports.deleteME = async (req, res, next) => {
  try {
    // Access the authenticated user from the request object
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Perform the deletion of the current user
    await User.deleteOne({ _id: currentUser._id });

    res.status(200).json({ message: "User has been deleted." });
  } catch (error) {
    // Handle any errors that occur during the deletion process
    res
      .status(500)
      .json({ message: "An error occurred while deleting the user." });
  }
};
exports.me = async (req, res) => {
  req.user.password = undefined;
  req.user.__v = undefined;
  res.status(200).json(req.user);
};
