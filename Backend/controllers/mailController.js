// Import the configured email services (SendGrid, Resend, Gmail)
const mailConfig = require("../config/mail");

/**
 * Send an email using available services (SendGrid, Resend, or Gmail)
 * Automatically alternates between SendGrid and Resend for maximum free quota
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

    // Get the next service to use (round-robin between SendGrid and Resend)
    const serviceToUse = mailConfig.getNextService();

    if (!serviceToUse) {
        throw new Error('No email service configured. Please set up SendGrid, Resend, or Gmail.');
    }

    try {
        if (serviceToUse === 'sendgrid') {
            // Use SendGrid HTTP API
            console.log('📧 Sending email via SendGrid to:', to);
            
            const msg = {
                to: to,
                from: {
                    email: process.env.SENDGRID_FROM_EMAIL,
                    name: 'Tortrose'
                },
                subject: subject,
                text: text,
                html: html,
                // Add categories for tracking
                categories: ['email-verification', 'otp'],
                // Disable click tracking to avoid spam filters
                trackingSettings: {
                    clickTracking: { enable: false },
                    openTracking: { enable: false }
                }
            };

            const response = await mailConfig.services.sendgrid.send(msg);
            
            console.log('✅ Email sent successfully via SendGrid');
            
            return {
                success: true,
                service: 'sendgrid',
                messageId: response[0].headers['x-message-id']
            };
        } 
        else if (serviceToUse === 'resend') {
            // Use Resend HTTP API
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
            console.log('📧 Sending email via Resend to:', to);
            console.log('📧 Resend from email:', fromEmail);
            
            try {
                const response = await mailConfig.services.resend.emails.send({
                    from: `Tortrose <${fromEmail}>`,
                    to: to,
                    subject: subject,
                    html: html
                });
                
                console.log('✅ Email sent successfully via Resend');
                console.log('📧 Resend response:', JSON.stringify(response));
                
                return {
                    success: true,
                    service: 'resend',
                    messageId: response.data?.id || response.id
                };
            } catch (resendError) {
                console.error('❌ Resend API error:', resendError);
                console.error('❌ Resend error details:', JSON.stringify(resendError.response?.data || resendError.message));
                throw resendError;
            }
        } 
        else if (serviceToUse === 'gmail') {
            // Use Gmail SMTP (local development)
            console.log('📧 Sending email via Gmail SMTP to:', to);
            
            const mailOptions = {
                from: `"Tortrose Support" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: subject,
                text: text,
                html: html
            };

            const info = await mailConfig.services.gmail.sendMail(mailOptions);
            
            console.log('✅ Email sent successfully via Gmail');
            
            return {
                success: true,
                service: 'gmail',
                messageId: info.messageId
            };
        }
    } catch (error) {
        console.error(`❌ Error sending email via ${serviceToUse}:`, error);
        console.error("Error details:", error.message);
        
        // If one service fails, try the next available service
        if (serviceToUse === 'sendgrid' && mailConfig.hasResend) {
            console.log('⚠️  SendGrid failed, trying Resend...');
            try {
                const response = await mailConfig.services.resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                    to: to,
                    subject: subject,
                    html: html
                });
                console.log('✅ Email sent successfully via Resend (fallback)');
                return { success: true, service: 'resend', messageId: response.id };
            } catch (fallbackError) {
                console.error('❌ Resend fallback also failed:', fallbackError.message);
            }
        } else if (serviceToUse === 'resend' && mailConfig.hasSendGrid) {
            console.log('⚠️  Resend failed, trying SendGrid...');
            try {
                const msg = {
                    to: to,
                    from: process.env.SENDGRID_FROM_EMAIL || 'salmaniqbal2008@gmail.com',
                    subject: subject,
                    text: text,
                    html: html
                };
                const response = await mailConfig.services.sendgrid.send(msg);
                console.log('✅ Email sent successfully via SendGrid (fallback)');
                return { success: true, service: 'sendgrid', messageId: response[0].headers['x-message-id'] };
            } catch (fallbackError) {
                console.error('❌ SendGrid fallback also failed:', fallbackError.message);
            }
        }
        
        // If all services fail, throw error
        throw new Error(`Failed to send email: ${error.message}`);
    }
};
