const nodemailer = require('nodemailer');
require('dotenv').config();

// Priority: SendGrid > Gmail SMTP
// SendGrid works on Railway, Gmail SMTP only works locally
const useSendGrid = process.env.SENDGRID_API_KEY;

if (useSendGrid) {
    // Use SendGrid SMTP with nodemailer (for production - works on Railway)
    console.log('✅ Using SendGrid SMTP for email delivery');
    
    const transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
            user: 'apikey', // This is always 'apikey' for SendGrid
            pass: process.env.SENDGRID_API_KEY
        }
    });
    
    // VERIFICATION OF SMTP CONNECTION
    transporter.verify((error, success) => {
        if (error) {
            console.log('❌ SendGrid SMTP error:', error.message);
        } else {
            console.log('✅ SendGrid SMTP ready');
        }
    });
    
    module.exports = transporter;
} else {
    // Use Gmail SMTP (for local development only - doesn't work on Railway)
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
    
    module.exports = transporter;
}