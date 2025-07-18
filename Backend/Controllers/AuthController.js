const userModel = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // ⬅️ You missed this!
require('dotenv').config();
const { sendOTP } = require('../Nodemailer/index');
const UserVerificationModel = require('../models/UserVerification');
// const {sendPhoneOTP} = require('../Twilio/index');
// REGISTER
exports.registerUser = async (req, res) => {

    const { FirstName, LastName, Email, Password } = req.body;

    if (!FirstName || !LastName || !Email || !Password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        const existingUser = await userModel.findOne({ Email });
        if (existingUser) {
            return res.status(409).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(Password, salt);

        const user = new userModel({
            FirstName,
            LastName,
            Email,
            Password: hash,
        });

        const savedUser = await user.save();

        const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        return res.status(201).json({
            msg: 'User registered successfully',
            token,
            user: {
                id: savedUser._id,
                FirstName: savedUser.FirstName,
                LastName: savedUser.LastName,
                Email: savedUser.Email,
            },
        });
    } catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
};

// LOGIN
exports.loginUser = async (req, res) => {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
        return res.status(400).json({ msg: 'Please provide all details' });
    }

    try {
        const user = await userModel.findOne({ Email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                FirstName: user.FirstName,
                LastName: user.LastName,
                Email: user.Email,
            },
        });
    } catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
};

exports.EmailAuth = async (req, res) => {
    try {
        let { Email } = req.body;
        if (!Email) return res.status(400).json({ msg: "Email is required" });
        const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        await sendOTP(Email, otp);
        res.status(200).json({ msg: "OTP sent successfully", otp });
    } catch (err) {
        res.status(500).json({ msg: "Internal server error" });
    }
}
exports.userVerify = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ msg: 'Unauthorized: User not authenticated' });
    }
    const userId =req.user._id;
    let { Email, Phone, GovernmentId } = req.body;
    if (
        typeof Email === "undefined" ||
        typeof Phone === "undefined" ||
        typeof GovernmentId === "undefined"
    ) {
        return res.status(400).json("All fields required");
    }
    else {
        try {
            const verifyresult = new UserVerificationModel({
                id: userId,
                Email: Email,
                Phone: Phone,
                GovernmentId: GovernmentId
            })
            await verifyresult.save();
            return res.status(200).json("Verification Data Updated Successfully");
        } catch (err) {
            return res.status(500).json("Internal Server Error");
        }
    }
}
// exports.PhoneAuth = async(req,res) =>{
//     try{
//         let {PhoneNumber}= req.body;
//         if (!PhoneNumber) return res.status(400).json({ msg: "PhoneNumber is required" });
//         const otp = Math.floor(100000 + Math.random() * 900000);
//          await sendPhoneOTP(PhoneNumber, otp);
//         res.status(200).json({ msg: "OTP sent successfully", otp });
//     }catch(err) {
//         console.log(err);
//         res.status(500).json({ msg: "Internal server error" });
//     }
// }