import { Context as TwilioContext } from '@twilio-labs/serverless-runtime-types/types';

interface Context extends TwilioContext {
  AUTH0_SECRET: string;
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
  try {
    const client = context.getTwilioClient();
    const verification = await client.verify.v2
      .services(context.TWILIO_VERIFY_SID)
      .verifications(phoneNumber)
      .update({ status: 'approved' });
    return verification.status === 'approved';
  } catch (error) {
    return false;
  }
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
    message = approved ? 'Approved' : 'Invalid phone number or request already approved';
  } else {
    message = 'Ignored';
  }
  const response = new Twilio.Response();
  response.setStatusCode(200);
  response.setBody(JSON.stringify({ message }));
  return callback(null, response);
};
