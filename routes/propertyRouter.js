const express = require("express");
const propertyController = require("../controllers/propertyContoller.js");
const userController = require("./../controllers/userContoller.js");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage(); // Use memory storage for in-memory handling of files
const upload = multer({ storage: storage });
router.post(
  "/add",
  upload.array("photos"),
  userController.verifytoken,
  propertyController.listProperty
);

// Unlist a property
router.post(
  "/unlist",
  userController.verifytoken,
  propertyController.unlistProperty
);
router.post(
  "/test",

  propertyController.test
);
router.post(
  "/getmine",
  userController.verifytoken,
  propertyController.listmine
);
router.post(
  "/verify",
  userController.verifytoken,
  userController.restrictTo(["govt", "admin"]),
  propertyController.verify
);
router.post(
  "/reject",
  userController.verifytoken,
  userController.restrictTo(["govt", "admin"]),
  propertyController.reject
);
router.post(
  "/getunverified",
  userController.verifytoken,
  userController.restrictTo(["govt", "admin"]),
  propertyController.listunverified
);
router.post("/mint", userController.verifytoken, propertyController.mint);

// Get all listings
router.post(
  "/:page?/:perPage?",

  propertyController.getAllListings
);

module.exports = router;
