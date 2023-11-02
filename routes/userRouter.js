const express = require("express");
const userContoller = require("../controllers/userContoller");

const router = express.Router();
router.route("/signup").post(userContoller.signUp);
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
