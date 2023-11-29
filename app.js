const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 1120;

const uri = process.env.DB.replace("<password>", process.env.DBPASSWORD);
if (process.env.NODE_ENV === "teach") {
  console.log(
    `we got the uri for connect => ${uri} here git-db(i.e the text after mongodb.net/) is the name of database to which it's connected`
  );
}
mongoose.connect(uri).then(() => {
  console.log(`connected to the database`);
});
const app = require("./appp");
const server = app.listen(port, () => {
  console.log(`started the server simple otp`);
});
