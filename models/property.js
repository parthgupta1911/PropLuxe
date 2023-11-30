const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"], // Specify the type as Point
      required: true,
    },
    coordinates: {
      type: [Number], // Array of [longitude, latitude]
      required: true,
      index: "2dsphere", // Create a 2dsphere index for geospatial queries
    },
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
  price: {
    type: Number,
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  photos: {
    type: [
      {
        type: String,
      },
    ],
  },
  paidVerification: {
    type: Boolean,
    default: false,
  },
  minted: {
    type: Boolean,
    default: false,
  },
  ipfsLink: {
    type: String, // Assuming the link is a string
  },
  bedrooms: {
    type: Number,
    required: true,
    min: 1, // Minimum value allowed is 1
  },
  bathrooms: {
    type: Number,
    required: true,
    min: 1, // Minimum value allowed is 1
  },
  sqft: {
    type: Number,
    required: true,
    min: 1, // Minimum value allowed is 1
  },
  balcony: {
    type: Number,
    required: true,
    min: 1, // Minimum value allowed is 1
  },
  nftid: {
    type: String,
  },
  listed: {
    type: Boolean,
    default: false,
  },
  canbelisted: {
    type: Boolean,
    default: false,
  },
  nftlink: {
    type: String,
  },
});

// Add a custom validator to ensure properties are not within 10 meters of each other
propertySchema.pre("save", async function (next) {
  const Property = mongoose.model("Property");
  const nearbyProperties = await Property.find({
    _id: { $ne: this._id },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: this.location.coordinates,
        },
        $maxDistance: 10, // 10 meters
      },
    },
  });

  if (nearbyProperties.length > 0) {
    const nearbyListedProperty = nearbyProperties.find((prop) => prop.seller);
    if (nearbyListedProperty) {
      this.invalidate(
        "location.coordinates",
        `Property is already listed by ${nearbyListedProperty.seller} within 10 meters.`
      );
    } else {
      this.invalidate(
        "location.coordinates",
        "Another property is within 10 meters."
      );
    }
    return next(
      new Error(
        "A property can't be listed within 10 meters of another property."
      )
    );
  }

  next();
});

// Create a 2dsphere index on the location.coordinates field
propertySchema.index({ location: "2dsphere" });

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
