const Property = require("./../models/property");
const { create } = require("ipfs-http-client");
const { Readable } = require("stream");
const nodemailer = require("nodemailer");
const User = require("./../models/user");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "propslux@gmail.com",
    pass: process.env.APPPASS,
  },
});

const sia = require("sia.js"); // Make sure to install the sia.js library
const fs = require("fs");
const multer = require("multer");
const upload = multer(); // Configure Multer for in-memory storage

const pina = process.env.PINATA;
// const pin = "e638937671cb5a4260f4";
// const siaClient = sia();
const pinataSDK = require("@pinata/sdk");
const pinata = new pinataSDK({ pinataJWTKey: pina });
// pinata
//   .testAuthentication()
//   .then((result) => {
//     //handle successful authentication here
//   })
//   .catch((err) => {
//     //handle error here
//   });
async function ipfsClient() {
  const ipfs = await create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https",
    projectId: "YOUR_PROJECT_ID",
  });
  return ipfs;
}
async function uploadImagesToPinata(photos) {
  // Assuming 'pina' is your Pinata API key

  const uploadedImageUrls = [];

  for (const photo of photos) {
    try {
      // Convert the buffer to a readable stream
      const photoStream = Readable.from(photo.buffer);

      // Use pinataSDK to upload the file
      const response = await pinata.pinFileToIPFS(photoStream, {
        pinataMetadata: { name: photo.originalname },
        pinataOptions: { cidVersion: 0 },
      });

      const ipfsHash = response.IpfsHash;
      const pinataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      uploadedImageUrls.push(pinataUrl);
    } catch (error) {
      throw new Error("Error uploading image to Pinata.");
    }
  }

  return uploadedImageUrls;
}
// List a property

exports.test = async (req, res) => {
  try {
    // Middleware to handle file uploads in-memory
    upload.array("photos")(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: "Error uploading images." });
      }

      // Access the uploaded files via req.files
      const photos = req.files;
      let uploadedImageUrls;

      if (photos) {
        // Upload images to Pinata using the provided function
        uploadedImageUrls = await uploadImagesToPinata(photos);
      } else {
        uploadedImageUrls = [];
      }

      // Respond with the array of Pinata URLs
      res.status(200).json({ links: uploadedImageUrls });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

exports.listProperty = async (req, res) => {
  try {
    const { name, bedrooms, bathrooms, sqft, balcony, latitude, longitude } =
      req.body;

    // Get the seller ID from req.user
    const seller = req.user._id;

    // Check if both latitude and longitude are provided
    if (latitude && longitude) {
      const coordinates = [parseFloat(longitude), parseFloat(latitude)];
      // Add location data as a GeoJSON object
      location = {
        type: "Point",
        coordinates: coordinates,
      };
    } else {
      return res.status(400).json({
        error: "Latitude and longitude are required for location data.",
      });
    }
    const photos = req.files;
    if (photos.length < 3) {
      return res.status(400).json({
        error: "Property validation failed: photos: there must be 3 photos.",
      });
    }
    const uploadedImageUrls = await uploadImagesToPinata(photos);
    const property = new Property({
      name,
      location,
      seller,

      photos: uploadedImageUrls,
      bedrooms,
      bathrooms,
      sqft,
      balcony,
    });

    await property.save();

    res.status(201).json({
      status: `Property "${property.name}" has been added. please pay verification fee.`,
      property,
    });
    const mailOptions = {
      from: "propslux@gmail.com", // replace with your email
      to: req.user.email, // replace with the recipient's email
      subject: "New Property Added",
      text: `Property "${property.name}" has been added. please pay verification fee.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
      } else {
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.unlistProperty = async (req, res) => {
  try {
    const propertyId = req.body.propertyId; // Assuming you're passing the property ID in req.body

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    if (property.seller.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to unlist this property" });
    }
    if (property.sold) {
      return res
        .status(400)
        .json({ error: "Property is already sold and cannot be unlisted." });
    }
    property.sold = true;
    property.buyer = null; // Assuming you want to clear the buyer when unlisting

    await property.remove();

    res.json({
      message:
        "Property has been successfully unlisted and removed from the database.",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// exports.getAllListings = async (req, res) => {
//   try {
//     const listings = await Property.find({});

//     res.json(listings);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
exports.getAllListings = async (req, res) => {
  try {
    const { location, verified, maxDistance } = req.body;

    // Define the filter object based on the provided conditions
    const filter = {
      listed: true, // Include only properties where the 'listed' field is true
    };

    // Check if location and coordinates are provided
    if (location && location.longitude && location.latitude) {
      if (maxDistance) {
        // Filter based on the haversine formula for distance (in kilometers)
        filter["location.coordinates"] = {
          $geoWithin: {
            $centerSphere: [
              [parseFloat(location.longitude), parseFloat(location.latitude)],
              maxDistance / 6371, // Earth's radius in kilometers
            ],
          },
        };
      }
    }

    // Find properties matching the filter
    const properties = await Property.find(filter);

    // Calculate distances and sort properties
    const updatedProperties = properties.map((property) => {
      if (location && location.longitude && location.latitude) {
        const propertyCoordinates = property.location.coordinates;
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          parseFloat(propertyCoordinates[1]),
          parseFloat(propertyCoordinates[0])
        );
        return {
          ...property._doc,
          distance, // Add distance to each property
        };
      }
      return property;
    });

    // Sort the properties by distance (if distances are available)
    updatedProperties.sort((a, b) => {
      return (a.distance || Infinity) - (b.distance || Infinity);
    });

    const total = updatedProperties.length;

    res.json({
      total,
      listings: updatedProperties,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Function to calculate the distance between two coordinates using the haversine formula (in kilometers)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  dist = dist * 1.609344; // Convert to kilometers

  return dist;
}
exports.verify = async (req, res, next) => {
  try {
    const { user } = req;
    const { propertyId } = req.body;

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Update the property verification status based on the user's role
    let text;
    if (user.role === "admin") {
      property.approved.isApproved = true;
      property.approved.approvedBy = user._id;
      text = `Property "${property.name}" has been goverment verified. Now pending admin verification.`;
    } else if (user.role === "govt") {
      property.govtApproved.isApproved = true;
      property.govtApproved.approvedBy = user._id;
      text = `Property "${property.name}" has been both admin and govt verified. and is ready to be minted`;
    }

    // Save the updated property
    await property.save();
    const updatedproperty = await Property.findById(propertyId);

    res
      .status(200)
      .json({ message: "Property verified successfully", updatedproperty });
    const to = await User.findById(updatedproperty.seller);
    const m = to.email;
    const mailOptions = {
      from: "propslux@gmail.com", // replace with your email
      to: m, // replace with the recipient's email
      subject: "Propery veification status",
      text,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
      } else {
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
exports.listmine = async (req, res) => {
  try {
    // Get the user ID from the authenticated user (assuming it's stored in req.user)
    const userId = req.user._id;

    // Find all properties listed by the user
    const userProperties = await Property.find({ seller: userId });

    res.status(200).json({ properties: userProperties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
exports.listunverified = async (req, res) => {
  try {
    let unverifiedProperties;
    if (req.user.role === "admin") {
      unverifiedProperties = await Property.find({
        "approved.isApproved": false,
        "govtApproved.isApproved": true,
        paidVerification: true,
        ipfsLink: { $exists: true },
      });
    } else if (req.user.role === "govt") {
      unverifiedProperties = await Property.find({
        "govtApproved.isApproved": false,
        paidVerification: true,
        ipfsLink: { $exists: true },
      });
    }

    res.status(200).json({ properties: unverifiedProperties });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
async function uploadToPinata(data) {
  try {
    const jsonString = JSON.stringify(data);

    // Convert string to readable stream
    const stream = require("stream");
    const readableStream = new stream.Readable();
    readableStream._read = () => {};
    readableStream.push(jsonString);
    readableStream.push(null);

    // Define the filename
    const filename = "metadata.json"; // You can customize the filename as needed

    // Pinata options
    const options = {
      pinataMetadata: {
        name: filename,
      },
    };
    const response = await pinata.pinFileToIPFS(readableStream, options);

    const pinataHash = response.IpfsHash;

    const pinataUrl = `https://gateway.pinata.cloud/ipfs/${pinataHash}`;

    return pinataUrl;
  } catch (error) {
    console.error("Error uploading to Pinata:", error.message);
    throw error;
  }
}

exports.upload = async (req, res) => {
  try {
    // Get property ID from req.body
    const { propertyId } = req.body;

    // Find the property in the database
    const prop = await Property.findById(propertyId);

    // Check if the property exists
    if (!prop) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Check if the authenticated user is the seller of the property
    if (prop.seller.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to mint this property" });
    }

    const { name, _id, photos, bedrooms, bathrooms, sqft, balcony } = prop;
    const p = { name, _id, photos, bedrooms, bathrooms, sqft, balcony };

    const propertyDataString = JSON.stringify(p);

    // Upload property data to Pinata
    const pinataUrl = await uploadToPinata(propertyDataString);
    prop.ipfsLink = pinataUrl;
    await prop.save();
    // Include the Pinata URL in the response
    res.status(200).json({
      message: "Property successfully minted to Pinata",
      pinataUrl: pinataUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
exports.reject = async (req, res) => {
  try {
    const { user } = req;
    const { propertyId } = req.body;
    const reason = req.body.reason;
    const property = await Property.findById(propertyId);
    const to = await User.findById(property.seller);
    const m = to.email;
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Update the property verification status based on the user's role
    let text;
    if (user.role === "admin") {
      text = `Property "${property.name}" has been rejected by administration\n REASON: ${reason} \n plesae fix it and add your property again`;
    } else {
      text = `Property "${property.name}" has been rejected by goverment \n REASON: ${reason} \n plesae fix it and add your property again`;
    }

    // Save the updated property
    await property.deleteOne({ _id: propertyId });

    res
      .status(200)
      .json({ message: "Property rejected succesfully successfully" });

    const mailOptions = {
      from: "propslux@gmail.com", // replace with your email
      to: m, // replace with the recipient's email
      subject: "Propery REJECTED",
      text,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
      } else {
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
