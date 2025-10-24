import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

// CREATING TRANSPORTER FOR GMAIL SMTP 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// VERIFICATION OF SMTP CONNECTION
transporter.verify((error, success) => {
    if (error) {
        console.log('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails ✅');
    }
})

export default transporter