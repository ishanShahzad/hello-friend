// Import the configured nodemailer transporter (SendGrid or Gmail SMTP)
const transporter = require("../config/mail");

/**
 * Send an email using nodemailer
 * Automatically uses SendGrid (production) or Gmail (local development)
 * 
 * Expected data:
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
        // Determine from email based on which service is being used
        const fromEmail = process.env.SENDGRID_API_KEY 
            ? `genZ Winners <salmaniqbal2008@gmail.com>` // Use your verified sender email
            : `"genZ Winners Support" <${process.env.EMAIL_USER}>`;
        
        const mailOptions = {
            from: fromEmail,
            to: to,
            subject: subject,
            text: text,
            html: html
        };

        console.log('Sending email to:', to);
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

