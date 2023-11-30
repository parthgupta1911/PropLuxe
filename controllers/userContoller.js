const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
function generateOTP() {
  return crypto.randomBytes(2).readUInt16BE(0) % 100000; // Generate a random 5-digit number
}
const catchAsync = require("../utils/catchAsync.js");
const User = require("../models/user");
const Property = require("../models/property.js");

// const AppError = require("../utils/appError.js");
function signToken(user) {
  const expiresIn = process.env.JWTEXPIRESIN;
  return jwt.sign({ userId: user._id }, process.env.JWTKEY, {
    expiresIn,
  });
}
exports.signUp = catchAsync(async (req, res, next) => {
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
  console.log(otp);
  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
    } else {
    }
  });
  const expirationTime = new Date(Date.now() + 2 * 60 * 1000);
  const delat = new Date(Date.now() + 2 * 60 * 1000);

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: "user",
    delat,
    verificationCode: otp,
  });

  const expiresIn = 600;
  const token = jwt.sign({ name: newUser.name }, process.env.JWTVKEY, {
    expiresIn,
  });
  const decoded = jwt.verify(token, process.env.JWTVKEY);

  res.status(200).json({
    name: newUser.name,
    email: newUser.email,
    token,
  });
});

exports.verifyUser = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  // Find the user by email and check if the OTP matches and is not expired
  const u = await User.findOne({ verificationCode: otp });
  if (!u) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (u.verificationCodeExpires < new Date()) {
    return res.status(400).json({ message: "OTP has expired" });
  }

  // Update the user to mark them as verified and remove verification fields
  u.verified = true;
  u.verificationCode = undefined;
  u.verificationCodeExpires = undefined;
  u.delat = undefined;
  await u.save();
  const token = signToken(u);
  const decoded = jwt.verify(token, process.env.JWTKEY);
  res.status(200).json({ message: "User verified successfully", token });
});
exports.resendOTP = catchAsync(async (req, res, next) => {
  const otp = crypto.randomBytes(2).readUInt16BE(0) % 100000; // Generate a random 5-digit number
  const expirationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
  const delat = new Date(Date.now() + 10 * 60 * 1000);

  req.user.verificationCode = otp;
  req.user.verificationCodeExpires = expirationTime;
  req.user.delat = delat;
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
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    const expiresIn = 600;
    const token = jwt.sign({ name: req.user.name }, process.env.JWTVKEY, {
      expiresIn,
    });

    const decoded = jwt.verify(token, process.env.JWTVKEY);

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
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
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
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
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
      return res
        .status(500)
        .json({ message: "An error occurred while checking the user." });
    }
  } catch (error) {
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
exports.govtbiyerunpaid = async (req, res) => {
  try {
    const { role } = req.user;

    let usersWithPaidFor;

    if (role === "govt") {
      // Send users with at least 1 element in paidFor
      usersWithPaidFor = await User.aggregate([
        {
          $match: {
            paidFor: { $exists: true, $ne: [] },
          },
        },
      ]);
    } else if (role === "admin") {
      // Send users with at least 1 element in govtapprovedFor
      usersWithPaidFor = await User.aggregate([
        {
          $match: {
            govtapprovedFor: { $exists: true, $ne: [] },
          },
        },
      ]);
    }

    res.status(200).json({
      status: "success",
      data: usersWithPaidFor,
    });
  } catch (error) {
    console.error("Error fetching users with paidFor:", error.message);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

exports.verifybuyer = async (req, res) => {
  try {
    const { userid, propertyid } = req.body;
    const { role } = req.user;

    const user = await User.findById(userid);
    const prop = await Property.findById(propertyid);

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    if (!prop) {
      return res.status(404).json({
        status: "fail",
        message: "Property not found",
      });
    }
    const approvalArray =
      role === "govt" ? "govtapprovedFor" : "adminapprovedFor";
    user[approvalArray].push(propertyid);
    if (role === "govt" && user.paidFor.includes(propertyid)) {
      user.paidFor = user.paidFor.filter((id) => id.toString() !== propertyid);
    }
    if (role == "admin" && user.govtapprovedFor.includes(propertyid)) {
      user.govtapprovedFor = user.govtapprovedFor.filter(
        (id) => id.toString() !== propertyid
      );
    }
    await user.save();
    res.status(200).json({
      status: "success",
      message: `Property approved for the user (${role} stage)`,
      data: user,
    });
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "propslux@gmail.com",
        pass: process.env.APPPASS,
      },
    });
    let text;
    if (role == "admin") {
      text = `Congratulations!\nYou have been approved to buy the property ${prop.name}.\nPlease submit the funds ASAP!`;
    } else {
      text = `Congratulations!\nYou have been goverment approved to buy the property ${prop.name}.\nPlease wait for admin aprroal`;
    }
    const mailOptions = {
      from: "propslux@gmail.com",
      to: user.email,
      subject: `${
        role === "govt" ? "Government" : "Admin"
      } Verification Successful!`,
      text,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
      }
    });
  } catch (error) {
    console.error("Error approving property for user:", error.message);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

exports.rejectbuyer = async (req, res) => {
  try {
    const { userid, propertyid, reason } = req.body;

    const user = await User.findById(userid);
    const prop = await Property.findById(propertyid);
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    if (!prop) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }
    user.paidFor = user.paidFor.filter((id) => id.toString() !== propertyid);
    await user.save();

    res.status(200).json({
      status: "success",
      message: "Property rejected  for the user",
      data: user,
    });
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "propslux@gmail.com",
        pass: process.env.APPPASS,
      },
    });

    const mailOptions = {
      from: "propslux@gmail.com",
      to: user.email,
      subject: "goverment verrifaction FAILED! ",
      text: `your Goverment approval for the purchase of property ${prop.name} has been denied\n provided reason ${reason} \n if you think this was a mistake contact govt@india.com`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: "Failed to send OTP email" });
      }
    });
  } catch (error) {
    console.error("Error denying property for user:", error.message);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
