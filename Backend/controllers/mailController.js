// Import the configured Nodemailer transporter
const transporter = require("../config/mail");

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

    try {
        const mailOptions = {
            from: `"genZ Winners Support" <${process.env.EMAIL_USER}>`, // sender address
            to, // list of receivers
            subject, // Subject line
            text, // Plain text body (optional)
            html, // HTML body (optional)
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email sent successfully to:', to);
        console.log('Message ID:', info.messageId);
        
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error("❌ Error sending email:", error);
        console.error("Error details:", error.message);
        
        // Throw the error so it can be caught by the calling function
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

