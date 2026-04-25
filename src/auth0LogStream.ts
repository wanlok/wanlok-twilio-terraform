import { Context } from "@twilio-labs/serverless-runtime-types/types";

interface Auth0LogStreamContext extends Context {
  AUTH0_SECRET: string;
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
  TWILIO_VERIFY_SID: string;
}

exports.handler = async function (
  context: Auth0LogStreamContext,
  event: any,
  callback: Function,
) {
  if (event.request.headers["authorization"] !== context.AUTH0_SECRET) {
    return callback(null, { statusCode: 401, body: "Unauthorized" });
  }
  if (event.data?.type === "gd_auth_succeed") {
    const phoneNumber = event.data.details.authenticator.phone_number;
    const basicAuth = Buffer.from(
      `${context.ACCOUNT_SID}:${context.AUTH_TOKEN}`,
    ).toString("base64");
    const twilioUrl = `https://verify.twilio.com/v2/Services/${context.TWILIO_VERIFY_SID}/Verifications/${phoneNumber}`;
    const twilioBody = new URLSearchParams();
    twilioBody.append("Status", "approved");
    await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioBody.toString(),
    });
  }
  return callback(null, { success: true });
};
