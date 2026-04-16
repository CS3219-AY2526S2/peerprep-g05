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
            `Do NOT share this OTP code with anyone.`,
            ``,
            `This code expires in ${config.otp.expiryMinutes} minutes.`,
            `If you did not create an account, you can safely ignore this email.`,
        ].join("\n"),
        html: `
            <p>Welcome to <strong>PeerPrep</strong>!</p>
            <p>Your verification code is:</p>
            <h2 style="letter-spacing: 4px;">${otp}</h2>
            <p style="color:#b91c1c;font-weight:600;">Do NOT share this OTP code with anyone.</p>
            <p>This code expires in <strong>${config.otp.expiryMinutes} minutes</strong>.</p>
            <p style="color: #888; font-size: 12px;">
                If you did not create an account, you can safely ignore this email.
            </p>
        `,
    });
}

export { transporter };

/**
 * Send a password reset link email.
 */
export async function sendPasswordResetEmail({ to, resetLink, expiryMinutes }) {
    await transporter.sendMail({
        from: config.email.from,
        to,
        subject: "Reset your PeerPrep password",
        text: [
            `You requested a password reset for your PeerPrep account.`,
            ``,
            `Click the link below to reset your password:`,
            `${resetLink}`,
            ``,
            `Do NOT share this link with anyone.`,
            ``,
            `This link expires in ${expiryMinutes} minutes.`,
            `If you did not request this, you can safely ignore this email.`,
        ].join("\n"),
        html: `
            <p>You requested a password reset for your <strong>PeerPrep</strong> account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="margin: 24px 0;">
                <a href="${resetLink}"
                   style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    Reset Password
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break:break-all;color:#4f46e5;">${resetLink}</p>
            <p style="color:#b91c1c;font-weight:600;">Do NOT share this link with anyone.</p>
            <p>This link expires in <strong>${expiryMinutes} minutes</strong>.</p>
            <p style="color:#888;font-size:12px;">
                If you did not request a password reset, you can safely ignore this email.
            </p>
        `,
    });
}
