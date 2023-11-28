const userRouter = require("./routes/userRouter");
const propertyRouter = require("./routes/propertyRouter");
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const Property = require("./models/property");
const User = require("./models/user");
const cors = require("cors");
const app = express();
const globalErrorHandler = require("./controllers/errorConroller");
const { ObjectId } = require("mongoose").Types;
const ethers = require("ethers");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const contractAddress = "0x0421Cb1742E6f27570710B3B74dCfe0D23b551FE";
const bcontractAddress = "0x4346dACFBad57ef5a327c9E6e87dBF980b7e7F75";
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
const babi = [
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
        indexed: false,
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        indexed: false,
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
      {
        internalType: "string",
        name: "id",
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
const provider = new ethers.JsonRpcProvider(infuraUrl);
const contract = new ethers.Contract(contractAddress, abi, provider);
contract.on("VerificationFeePaid", async (propertyId, payer, event) => {
  try {
    const property = await Property.findById(propertyId);

    if (!property) {
      return;
    }

    property.paidVerification = true;

    // // Save the updated property to the database
    await property.save();
  } catch (error) {}
  // You can add additional logic here to handle the event as needed
});
const bcontract = new ethers.Contract(bcontractAddress, babi, provider);
bcontract.on("VerificationFeePaid", async (propertyId, id, payer, event) => {
  try {
    const property = await Property.findById(propertyId);

    if (!property) {
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $push: { paidFor: property._id } },
      { new: true } // Return the modified document
    ); // console.log(user);

    if (!user) {
      return;
    }
    // console.log(user);
  } catch (error) {}
  // You can add additional logic here to handle the event as needed
});

app.use("/api/users", userRouter);
app.use("/api/properties", propertyRouter);

app.all("*", (req, resp, next) => {
  next(new Error(`can't find ${req.method} ${req.originalUrl}`));
});

app.use(globalErrorHandler);

module.exports = app;
