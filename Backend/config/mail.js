const nodemailer = require('nodemailer');
require('dotenv').config();

// CREATING TRANSPORTER FOR GMAIL SMTP 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Add timeout settings for production
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// VERIFICATION OF SMTP CONNECTION
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ SMTP connection error:', error);
        console.log('Email user:', process.env.EMAIL_USER ? 'Set' : 'Not set');
        console.log('Email pass:', process.env.EMAIL_PASS ? 'Set' : 'Not set');
    } else {
        console.log('✅ SMTP server is ready to send emails');
    }
});

module.exports = transporter;