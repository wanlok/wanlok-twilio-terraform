interface Context {
  name: string;
}

interface Event {}

export const handler = async (context: Context, event: Event, callback: Function) => {
  const response = new Twilio.Response();

  response.appendHeader('Content-Type', 'application/json');
  response.setBody({
    status: 'success',
    message: 'Hello ' + context.name,
    timestamp: new Date().toISOString(),
  });

  return callback(null, response);
};
