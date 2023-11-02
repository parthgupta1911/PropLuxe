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
    deafult: "default.jpg",
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["buyer", "seller", "admin", "govt"],
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
});

const User = mongoose.model("User", userSchema);

module.exports = User;
