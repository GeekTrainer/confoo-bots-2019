import { TurnContext, ActivityTypes, MemoryStorage, ConversationState } from 'botbuilder';
import { demoLogic } from './logic';

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const conversationDemo = conversationState.createProperty('current-demo');

export const botLogic = async (context: TurnContext) => {
    if (context.activity.type !== ActivityTypes.Message)
        return Promise.resolve();
    try {
        if (context.activity.text.startsWith('#')) {
            await conversationDemo.set(context, context.activity.text.substring(1));
        }
        const currentDemo = await demoLogic[await conversationDemo.get(context)];
        if (!currentDemo || currentDemo === '') {
            return await context.sendActivity('No demo is active');
        }
        if (context.activity.text.toLowerCase() === 'cancel') {
            await conversationDemo.set(context, '');
            return await context.sendActivity('Cancelled!');
        }
        await currentDemo(context, conversationState);
    }
    finally {
        await conversationState.saveChanges(context);
    }
};
