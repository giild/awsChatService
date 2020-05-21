// this example is based on Amazon's simple websocket chat app sample
// it has a couple of enhancements to make it easier for people to use and learn from
// it adds support for channels and zip package

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const { TABLE_NAME } = process.env;

exports.handler = async event => {
  let connectionData;
  let connections;
  
  try {
    connectionData = await ddb.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }
  
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });
  
  console.info(connectionData);
  const postData = JSON.parse(event.body);
  console.info(postData);
  if (postData.channel != '' && postData.action != '') {
  	var qparams = {
      KeyConditionExpression: '#channelId = :chId',
      ExpressionAttributeNames:{
        '#channelId': 'channelId'
      },
      ExpressionAttributeValues: {
        ':chId': postData.channel
      },
      TableName: process.env.CHANNEL_NAME
    };
    console.info(qparams);
    var result = await ddb.query(qparams).promise();
    if (postData.action == 'joinChannel') {
      try {
        if (result['Count'] > 0) {
          var channel = result['Items'][0];
          if (!channel.clients) {
          	channel.clients = [];
          }
          // check the connection isn't already in channel
          if (!channel.clients.includes(event.requestContext.connectionId)) {
            channel.clients.push(event.requestContext.connectionId);
            console.log(JSON.stringify(channel));
            const putChannel = {
              TableName: process.env.CHANNEL_NAME,
              Item: {
                channelId: channel.channelId,
                clients: channel.clients
              }
            };
            await ddb.put(putChannel).promise();
          }
        } else {
          const putChannel = {
            TableName: process.env.CHANNEL_NAME,
            Item: {
              channelId: postData.channel,
              clients: [event.requestContext.connectionId]
            }
          };
          await ddb.put(putChannel).promise();
        }
      } catch (err) {
        console.info(err);
      }
    } else if (postData.action == 'leaveChannel') {
      try {
        if (result['Count'] > 0) {
          var channel = result['Items'][0];
          // check the connection is in the channel
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
            await ddb.put(putChannel).promise();
          }
        }
      } catch (err) {
        console.info(err);
      }
    } else if (result['Count'] > 0) {
      // send message to everyone in the channel minus the sender
      var channel = result['Items'][0];
      const postMsg = channel.clients.map(async (connectionId) => {
        try {
          if (connectionId != event.requestContext.connectionId) {
            await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData.data }).promise();
          }
        } catch (e) {
          if (e.statusCode === 410) {
            console.log(`Found stale connection, deleting ${connectionId}`);
            await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
            channel.clients.splice( channel.clients.indexOf(connectionId), 1 );
            const putChannel = {
              TableName: process.env.CHANNEL_NAME,
              Item: {
                channelId: channel.channelId,
                clients: channel.clients
              }
            };
            await ddb.put(putChannel).promise();
          } else {
            throw e;
          }
        }
        
      });
      try {
        await Promise.all(postMsg);
      } catch (e) {
        return { statusCode: 500, body: e.stack };
      }
    }
  } else {
    // message is for everyone
    const postCalls = connectionData.Items.map(async ({ connectionId }) => {
      try {
        await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData.data }).promise();
      } catch (e) {
        if (e.statusCode === 410) {
          console.log(`Found stale connection, deleting ${connectionId}`);
          await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
        } else {
          throw e;
        }
      }
    });
  
    try {
      await Promise.all(postCalls);
    } catch (e) {
      return { statusCode: 500, body: e.stack };
    }
  }

  return { statusCode: 200, body: 'Data sent.' };
};