interface Context {
  AUTH0_SECRET: string;
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
  TWILIO_VERIFY_SID: string;
}

interface Event {
  request: {
    headers: {
      authorization: string;
    };
  };
  data?: {
    type: string;
    details: {
      authenticator: {
        phone_number: string;
      };
    };
  };
}

exports.handler = async (context: Context, event: Event, callback: Function) => {
  if (event.request.headers.authorization !== context.AUTH0_SECRET) {
    const response = new Twilio.Response();
    response.setStatusCode(401);
    response.setBody({ message: 'Unauthorized' });
    return callback(null, response);
  }
  if (event.data?.type === 'gd_auth_succeed') {
    const phoneNumber = event.data.details.authenticator.phone_number;
    const basicAuth = Buffer.from(`${context.ACCOUNT_SID}:${context.AUTH_TOKEN}`).toString('base64');
    const twilioUrl = `https://verify.twilio.com/v2/Services/${context.TWILIO_VERIFY_SID}/Verifications/${phoneNumber}`;
    const twilioBody = new URLSearchParams();
    twilioBody.append('Status', 'approved');
    await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioBody.toString(),
    });
  }
  return callback(null, { statusCode: 200, success: true });
};
