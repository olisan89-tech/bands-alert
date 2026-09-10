import nodemailer from "nodemailer";

// Sends a text via an email-to-SMS carrier gateway (e.g. AT&T's
// number@txt.att.net). Each message is kept short since carrier gateways
// often truncate or split long emails into multiple texts.
export async function sendSms({ smtpHost, smtpPort, smtpUser, smtpPass, toAddress, body }) {
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpUser,
    to: toAddress,
    subject: "", // most carrier gateways ignore/strip the subject anyway
    text: body,
  });
}
