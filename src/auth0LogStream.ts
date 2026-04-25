interface Context {
  AUTH0_SECRET: string;
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
  TWILIO_VERIFY_SID: string;
}

interface Event {
  request: {
    headers: {
      authorization?: string;
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

const approve = async (context: Context, event: Event) => {
  const phoneNumber = event.data?.details.authenticator.phone_number;
  if (!phoneNumber) {
    return false;
  }
  const basicAuth = Buffer.from(`${context.ACCOUNT_SID}:${context.AUTH_TOKEN}`).toString('base64');
  const url = `https://verify.twilio.com/v2/Services/${context.TWILIO_VERIFY_SID}/Verifications/${phoneNumber}`;
  const params = new URLSearchParams();
  params.append('Status', 'approved');
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  return true;
};

exports.handler = async (context: Context, event: Event, callback: Function) => {
  if (event.request.headers.authorization !== context.AUTH0_SECRET) {
    const response = new Twilio.Response();
    response.setStatusCode(401);
    response.setBody(JSON.stringify({ message: 'Unauthorized' }));
    return callback(null, response);
  }
  let message: string;
  if (event.data?.type === 'gd_auth_succeed') {
    const approved = await approve(context, event);
    message = approved ? 'Approved' : 'Invalid phone number';
  } else {
    message = 'Ignored';
  }
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.setBody(JSON.stringify({ message }));
  return callback(null, response);
};
