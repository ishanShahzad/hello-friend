const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { Resend } = require('resend');
require('dotenv').config();

// Check which email services are available
const hasSendGrid = !!process.env.SENDGRID_API_KEY;
const hasResend = !!process.env.RESEND_API_KEY;
const hasGmail = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;

// Initialize available services
const services = {};

if (hasSendGrid) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    services.sendgrid = sgMail;
    console.log('✅ SendGrid configured');
}

if (hasResend) {
    services.resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend configured');
}

if (hasGmail) {
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
    
    transporter.verify((error, success) => {
        if (error) {
            console.log('❌ Gmail SMTP error:', error.message);
        } else {
            console.log('✅ Gmail SMTP ready');
        }
    });
    
    services.gmail = transporter;
}

// Counter for round-robin (alternates between SendGrid and Resend)
let emailCounter = 0;

module.exports = { 
    services, 
    hasSendGrid, 
    hasResend, 
    hasGmail,
    getNextService: () => {
        // Priority: Use SendGrid only (Resend requires domain verification)
        // TODO: Enable Resend after domain verification
        if (hasSendGrid) {
            return 'sendgrid';
        } else if (hasResend) {
            return 'resend';
        } else if (hasGmail) {
            return 'gmail';
        }
        return null;
    }
};