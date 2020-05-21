const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

exports.handler = async event => {
  const deleteParams = {
    TableName: process.env.TABLE_NAME,
    Key: {
      connectionId: event.requestContext.connectionId
    }
  };

  try {
    await ddb.delete(deleteParams).promise();
    // we need to iterate over the channels and remove the connection and clean things up
    // if we don't do this, it will leave things in a dirty state
    let channels = await ddb.scan({ TableName: process.env.CHANNEL_NAME}).promise();
    channels.Items.map(async (channel) => {
    	if (channel.clients.includes(event.requestContext.connectionId)) {
        channel.clients.splice( channel.clients.indexOf(event.requestContext.connectionId), 1 );
        console.log(JSON.stringify(channel));
        const putChannel = {
          TableName: process.env.CHANNEL_NAME,
          Item: {
            channelId: channel.channelId,
            clients: channel.clients
          }
        };
        try {
          await ddb.put(putChannel).promise();
        } catch (err) {
          console.info(err);
        }
      }
    });
  } catch (err) {
    console.info(err);
    return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(err) };
  }

  return { statusCode: 200, body: 'Disconnected.' };
};