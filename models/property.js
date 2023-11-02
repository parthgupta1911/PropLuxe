const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: String,
    required: true,
  },
  approved: {
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  govtApproved: {
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  sold: {
    type: Boolean,
    default: false,
  },
  purchasePrice: {
    type: Number,
    required: true,
  },
  earnestAmount: {
    type: Number,
    required: true,
    validate: {
      validator: function (value) {
        return value < this.purchasePrice;
      },
      message: "Earnest amount must be less than the purchase price.",
    },
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    validate: {
      validator: function () {
        return this.sold || !this.buyer;
      },
      message: "Buyer field is required when the property is sold.",
    },
  },
});

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
