interface Context {
  twilio_function_name: string;
}

interface Event {}

export const handler = async (context: Context, event: Event, callback: Function) => {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.setBody({
    twilio_function_name: context.twilio_function_name,
  });
  return callback(null, response);
};
