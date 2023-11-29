const express = require("express");
const userContoller = require("../controllers/userContoller");

const router = express.Router();
router.route("/signup").post(userContoller.signUp);
router.route("/verify").post(userContoller.verifyUser);
router
  .route("/resendotp")
  .post(userContoller.verifyVtoken, userContoller.resendOTP);
router.post("/profile", userContoller.verifytoken, userContoller.getProfile);
router.post("/vprofile", userContoller.verifyVtoken, userContoller.getProfile);
router.post("/checkV", userContoller.checkVtoken);
router.post("/check", userContoller.checktoken);
router.post("/me", userContoller.verifytoken, userContoller.me);
router.post("/login", userContoller.login);
router.delete(
  "/",
  userContoller.verifytoken,
  userContoller.restrictTo(["admin"]),
  userContoller.deleteAll
);
router.delete("/deleteMe", userContoller.verifyVtoken, userContoller.deleteME);
router.post(
  "/paidbuyers",
  userContoller.verifytoken,
  userContoller.restrictTo(["govt"]),
  userContoller.govtbiyerunpaid
);
router.post(
  "/approvebuyer",
  userContoller.verifytoken,
  userContoller.restrictTo(["govt"]),
  userContoller.verifybuyer
);
router.post(
  "/rejectbuyer",
  userContoller.verifytoken,
  userContoller.restrictTo(["govt"]),
  userContoller.rejectbuyer
);
// router.route("/login").post(userContoller.login);
// router.get("/logout", userContoller.logout);
// router.use(userController.restrictTo("admin"));
// router.route("/").get(userContoller.getusers);
// router
//   .route("/:id")
//   .get(userContoller.getuser)
//   .patch(userContoller.updateuser)
//   .delete(userContoller.deleteuser);

module.exports = router;
