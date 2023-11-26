function globalErrorHandler(err, req, res, next) {
  // console.error(err.stack); // Log the error to the console for debugging
  console.log(err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
}

module.exports = globalErrorHandler;
