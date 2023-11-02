const userRouter = require("./routes/userRouter");
const express = require("express");
const app = express();
const globalErrorHandler = require("./controllers/errorConroller");
// app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "10kb" }));
app.use("/api/users", userRouter);
app.all("*", (req, resp, next) => {
  next(new AppError(`cant find ${req.originalUrl}`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
