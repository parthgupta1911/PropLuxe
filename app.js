const userRouter = require("./routes/userRouter");
const propertyRouter = require("./routes/propertyRouter");
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const Property = require("./models/property");
const cors = require("cors");
const app = express();
const ethers = require("ethers");
const globalErrorHandler = require("./controllers/errorConroller");
const { ObjectId } = require("mongoose").Types;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const contractAddress = "0x0421Cb1742E6f27570710B3B74dCfe0D23b551FE";

const abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "FundsWithdrawn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "string",
        name: "propertyId",
        type: "string",
      },
      {
        indexed: true,
        internalType: "address",
        name: "payer",
        type: "address",
      },
    ],
    name: "VerificationFeePaid",
    type: "event",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "minimumPayment",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "propertyId",
        type: "string",
      },
    ],
    name: "payVerificationFee",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const infuraUrl = process.env.INFURA;
provider = new ethers.JsonRpcProvider(infuraUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
// console.log(contract);
contract.on("VerificationFeePaid", async (propertyId, payer, event) => {
  try {
    const property = await Property.findById(propertyId);

    if (!property) {
      console.log(`Property with ID ${propertyId} not found.`);
      return;
    }

    property.paidVerification = true;

    // // Save the updated property to the database
    await property.save();

    // console.log(`Property with ID ${propertyId} updated successfully.`);
  } catch (error) {
    console.error("Error updating property:", error);
  }
  // You can add additional logic here to handle the event as needed
});

app.use("/api/users", userRouter);
app.use("/api/properties", propertyRouter);

app.all("*", (req, resp, next) => {
  next(new Error(`can't find ${req.method} ${req.originalUrl}`));
});

app.use(globalErrorHandler);

module.exports = app;
