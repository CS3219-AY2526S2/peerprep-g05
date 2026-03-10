import nodemailer from "nodemailer";
import config from "../../config/index.js";

/**
 * Nodemailer transporter using Gmail SMTP.
 */
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL on port 465
    auth: {
        user: config.email.user,
        pass: config.email.appPassword,
    },
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000,
});

/**
 * Send an OTP verification email for new registrations.
 */
export async function sendOtpEmail({ to, otp }) {
    await transporter.sendMail({
        from: config.email.from,
        to,
        subject: "Your PeerPrep verification code",
        text: [
            `Welcome to PeerPrep!`,
            ``,
            `Your verification code is: ${otp}`,
            ``,
            `This code expires in ${config.otp.expiryMinutes} minutes.`,
            `If you did not create an account, you can safely ignore this email.`,
        ].join("\n"),
        html: `
            <p>Welcome to <strong>PeerPrep</strong>!</p>
            <p>Your verification code is:</p>
            <h2 style="letter-spacing: 4px;">${otp}</h2>
            <p>This code expires in <strong>${config.otp.expiryMinutes} minutes</strong>.</p>
            <p style="color: #888; font-size: 12px;">
                If you did not create an account, you can safely ignore this email.
            </p>
        `,
    });
}

export { transporter };
