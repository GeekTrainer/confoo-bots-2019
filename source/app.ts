import restify = require('restify');
import { BotFrameworkAdapter, ActivityTypes } from 'botbuilder';
import dotenv = require('dotenv');
import { botLogic } from './bot';
import { HandoffMiddleware, MemoryHandoffProvider } from './middleware';
import { sleep } from 'sleep';

dotenv.config();

const adapter = new BotFrameworkAdapter({
    appId: process.env.appId,
    appPassword: process.env.appPassword
});

adapter.use(HandoffMiddleware(new MemoryHandoffProvider()));

// adapter.use({
//     onTurn: async (context, next) => {
//         await context.sendActivity({type: ActivityTypes.Typing});
//         sleep(1);
//         await next();
//     }
// });

const server = restify.createServer();
server.listen(3978, () => console.log('server up!!'));

server.post('/api/messages', async (req, res) => {
    await adapter.processActivity(req, res, botLogic);
});

server.get(
    '/*',
    restify.plugins.serveStatic({
        directory: './public'
    })
);
