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
  // Add fields for OTP verification
  verificationCode: {
    type: String,
  },
  adminapprovedFor: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  govtapprovedFor: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  paidFor: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  verified: {
    type: Boolean,
    default: false, // Initially set to false
  },
  verificationCodeExpires: {
    type: Date,
  },
  delat: {
    type: Date,
  },
  wallet: {
    type: String,
    required: true,
    unique: true,
  },
});
//userSchema.index({ verified: 1, verificationCodeExpires: 1 });

const User = mongoose.model("propsUsers", userSchema);

module.exports = User;
