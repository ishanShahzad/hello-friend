// Import the configured Nodemailer transporter
const { default: transporter } = require("../config/mail");
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * Send an email using Nodemailer
 * 
 * Expected request body:
 * {
 *   "to": "recipient@example.com",
 *   "subject": "Subject here",
 *   "text": "Plain text version",
 *   "html": "<b>HTML version</b>"
 * }
 */
exports.sendEmail = async (data) => {
    const { to, subject, text, html } = data;

    // Basic validation
    // if (!to || !subject || (!text && !html)) {
    //     return res.status(400).json({
    //         msg: "Missing required email fields: to, subject, and text or html",
    //     });
    // } 

    try {
        const mailOptions = {
            from: `"MyApp Support" <${process.env.EMAIL_USER}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // Plain text body (optional)
            html, // HTML body (optional)
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);

        // return ({
        //     msg: "Email sent successfully",
        //     messageId: info.messageId,
        //     response: info.response,
        // });
    } catch (error) {
        console.error("❌ Error sending email:", error);

        // return res.status(500).json({
        //     msg: "Failed to send email",
        //     error: error.message || "Unknown error",
        // });
    }
};

