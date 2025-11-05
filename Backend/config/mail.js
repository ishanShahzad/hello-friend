const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Priority: SendGrid API > Gmail SMTP
// SendGrid API uses HTTP (works on Railway), Gmail SMTP only works locally
const useSendGrid = process.env.SENDGRID_API_KEY;

if (useSendGrid) {
    // Use SendGrid HTTP API (works on Railway - no SMTP blocking)
    console.log('✅ Using SendGrid HTTP API for email delivery');
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    module.exports = { sendgrid: sgMail, useSendGrid: true };
} else {
    // Use Gmail SMTP (for local development only)
    console.log('⚠️  Using Gmail SMTP (local development only)');
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
    });
    
    // VERIFICATION OF SMTP CONNECTION
    transporter.verify((error, success) => {
        if (error) {
            console.log('❌ Gmail SMTP error:', error.message);
        } else {
            console.log('✅ Gmail SMTP ready');
        }
    });
    
    module.exports = { transporter, useSendGrid: false };
}