import * as nodemailer from 'nodemailer';
import { logger } from 'firebase-functions/v2';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (!transporter) {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            logger.warn('[Alerting] Parola sau Userul SMTP nu sunt setate (SMTP_USER / SMTP_PASS). Email-urile sunt dezactivate.');
            return null;
        }

        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass,
            },
        });
    }
    return transporter;
}

export async function sendEmailAlert(subject: string, body: string) {
    const mailer = getTransporter();
    if (!mailer) return; // Silent skip if not configured

    try {
        await mailer.sendMail({
            from: `"InspectEV Alerts" <${process.env.SMTP_USER}>`,
            to: 'danielzamsaa@gmail.com',
            subject: `🚨 [InspectEV] ${subject}`,
            text: body,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border-radius: 8px; border: 1px solid #ff4d4f; max-width: 600px;">
                    <h2 style="color: #d9363e; margin-top: 0;">Raport Eroare InspectEV</h2>
                    <div style="background-color: #fff1f0; padding: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; font-size: 14px; border-left: 4px solid #ff4d4f;">
${body}
                    </div>
                </div>
            `,
        });
        logger.info('[Alerting] Alarmă trimisă cu succes către danielzamsaa@gmail.com');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        logger.error('[Alerting] Eroare fatală la expedierea email-ului:', error.message);
    }
}
