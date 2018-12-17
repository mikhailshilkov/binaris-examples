const rp = require('request-promise-native');

const execute = async (command, field, value) => {
  const key = 'TODOApp';
  const options = {
    url: `https://run-sandbox.binaris.com/v2/run/${process.env.BINARIS_ACCOUNT_NUMBER}/redis_todobackend`,
    headers: {
      'X-Binaris-Api-Key': `${process.env.BINARIS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: {
      command: command,
      key: key,
      field: field,
      value: JSON.stringify(value)
    },
    json: true
  };
  const response = await rp.post(options);
  return response 
    ? (Array.isArray(response) ? response.map(json => JSON.parse(json)) : JSON.parse(response)) 
    : undefined;
}

const handler = async (body, context) => {
  let id = context.request.path.substring(1);

  switch (context.request.method) {
    case 'GET': {
      if (id) {     
        return await execute('hget', id);
      } else {
        const items = await execute('hvals');
        return items.sort(i => i.order);
      }
    }

    case 'POST': {
      const todo = { 
        completed: false,
        id: Math.random().toString(36).substring(2),
        ...body 
      };
      todo.url = `https://run-sandbox.binaris.com/v2/run/${process.env.BINARIS_ACCOUNT_NUMBER}/${process.env.BN_FUNCTION}/${todo.id}`;
      return await execute('hset', todo.id, todo);
    }
 
    case 'PATCH': {
      const existing = await execute('hget', id);

      const todo = { ...existing, ...body };
      return await execute('hset', todo.id, todo);
    }

    case 'DELETE': {
      if (id) {
        await execute('hdel', id);
      } else {
        await execute('del');
      }
      return;
    }
  }
};

const cors = f => async (body, context) => {
  const response = await f(body, context);

  return new context.HTTPResponse({
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PATCH',
    },
    body: JSON.stringify(response)
  });
};

exports.handler = cors(handler);