// Import the configured email service (SendGrid API or Gmail SMTP)
const mailConfig = require("../config/mail");

/**
 * Send an email using SendGrid API or Gmail SMTP
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
        if (mailConfig.useSendGrid) {
            // Use SendGrid HTTP API (production)
            console.log('Sending email via SendGrid API to:', to);
            
            const msg = {
                to: to,
                from: process.env.SENDGRID_FROM_EMAIL || 'salmaniqbal2008@gmail.com', // Use your verified sender
                subject: subject,
                text: text,
                html: html
            };

            const response = await mailConfig.sendgrid.send(msg);
            
            console.log('✅ Email sent successfully via SendGrid to:', to);
            
            return {
                success: true,
                messageId: response[0].headers['x-message-id']
            };
        } else {
            // Use Gmail SMTP (local development)
            console.log('Sending email via Gmail SMTP to:', to);
            
            const mailOptions = {
                from: `"genZ Winners Support" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                text: text,
                html: html
            };

            const info = await mailConfig.transporter.sendMail(mailOptions);
            
            console.log('✅ Email sent successfully via Gmail to:', to);
            
            return {
                success: true,
                messageId: info.messageId
            };
        }
    } catch (error) {
        console.error("❌ Error sending email:", error);
        console.error("Error details:", error.message);
        
        // Throw the error so it can be caught by the calling function
        throw new Error(`Failed to send email: ${error.message}`);
    }
};
