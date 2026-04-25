import { Context } from "@twilio-labs/serverless-runtime-types/types";

interface MyContext extends Context {
  name: string;
}

export const handler = async (
  context: MyContext,
  event: {},
  callback: Function,
) => {
  const response = new Twilio.Response();

  response.appendHeader("Content-Type", "application/json");
  response.setBody({
    status: "success",
    message: "Hello " + context.name,
    timestamp: new Date().toISOString(),
  });

  return callback(null, response);
};
