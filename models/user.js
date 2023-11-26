const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    unique: [true, "email already in use"],
    lowercase: true,
    required: [true, "must have email"],
  },
  photo: {
    type: String,
    default: "default.jpg", // You had a typo here (deafult instead of default)
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin", "govt"],
    required: true,
  },
  owned: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
  ],
  listed: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
  ],
  // Add fields for OTP verification
  verificationCode: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false, // Initially set to false
  },
  verificationCodeExpires: {
    type: Date,
  },
});
//userSchema.index({ verified: 1, verificationCodeExpires: 1 });

const User = mongoose.model("propsUsers", userSchema);

module.exports = User;
