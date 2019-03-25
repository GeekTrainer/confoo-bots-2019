import { TurnContext, ActivityTypes, MessageFactory, CardFactory, ActionTypes, ConversationState, StatePropertyAccessor } from 'botbuilder';
import sleep = require('sleep');
import { bands } from './bands';
import request = require('request-promise-native');

const imageBaseUrl = 'http://localhost:3978/images/';
const textAnalyticsUrl = 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment';

type SentimentAnalysisResponse = {
    documents: [{
        id: string,
        score: number
    }]
};

export const demoLogic = {
    'pointer': async (context: TurnContext) => {
        if(context.activity.text.startsWith('#')) {
            return Promise.resolve();
        }
        switch (context.activity.text.toLowerCase()) {
            case 'help':
                await context.sendActivity({ type: ActivityTypes.Typing });
                sleep.sleep(5);
                return await context.sendActivity(MessageFactory.suggestedActions(['Buy tickets', 'Explore schedule', 'Book lodging'], `Hi there! I'm the festival bot! How can I help you?`));
            case 'hello':
                sleep.sleep(5);
                return await context.sendActivity(`Hi there! I'm the festival bot! How can I help you?`);
            case 'book lodging':
                return await context.sendActivity({
                    attachments: [
                        CardFactory.heroCard(
                            'What type of lodging would you like?',
                            CardFactory.images([
                                imageBaseUrl + 'lodging.jpg'
                            ]),
                            CardFactory.actions([
                                {
                                    type: 'imBack',
                                    title: 'Suite',
                                    value: 'Suite'
                                },
                                {
                                    type: 'imBack',
                                    title: 'Double room',
                                    value: 'Double room'
                                },
                                {
                                    type: 'imBack',
                                    title: 'Single room',
                                    value: 'Single room'
                                },

                            ])
                        )
                    ]
                })
            case 'explore':
            case 'explore schedule':
            case 'schedule':
                await context.sendActivity('Next time, you can just say "schedule" to see the schedule');
                const attachments = bands.map((band) => {
                    return CardFactory.heroCard(
                        band.name,
                        band.description,
                        [imageBaseUrl + band.imageUrl.replace(' ', '_')],
                        [{ 
                            type: ActionTypes.ImBack,
                            title: 'Learn about ' + band.name,
                            value: band.name 
                        }]);
                });
                return await context.sendActivity(MessageFactory.carousel(attachments));
            default:
                const band =
                    bands.find(b => b.name.toLowerCase() === context.activity.text.toLowerCase());
                if(band) {
                    await context.sendActivity(`Here's what I know about ${band.name}`);
                    await context.sendActivity({type: ActivityTypes.Typing});
                    sleep.sleep(2);
                    return await context.sendActivity(`${band.name} will be playing on ${band.day}`);
                } else {
                    return await context.sendActivity(`I'm sorry. I don't know that answer. You can always ask for help.`);
                }
        }
    },
    'joke': async (context: TurnContext) => {
        switch (context.activity.text.toLowerCase()) {
            case '#joke':
                return await context.sendActivity('Knock knock');
            case `who's there`:
                await context.sendActivity('Impatient cow');
                sleep.sleep(3);
                return await context.sendActivity('**MOO!**');
        }
    },
    'proactive': async (context: TurnContext) => {
        const activity = context.activity;
        const adapter = context.adapter;
        const reference = TurnContext.getConversationReference(activity);
        if (activity.text.toLowerCase() === '#proactive') {
            setTimeout(() => {
                adapter.continueConversation(reference, async (proactiveContext) => {
                    await proactiveContext.sendActivity('Your tickets just became available!');
                });
            }, 15000);
            context.activity.text = 'help';
        }
        return await demoLogic['pointer'](context);
    },
    'feedback': async (context: TurnContext, state: ConversationState) => {
        if (context.activity.text.toLowerCase() === '#feedback') {
            return context.sendActivity('Did you enjoy your experience?');
        }

        let feedbackState: StatePropertyAccessor<boolean> = state.properties.get('feedback');
        if(!feedbackState) feedbackState = state.createProperty('feedback');

        if (await feedbackState.get(context)) {
            feedbackState.set(context, false);
            switch (context.activity.text.toLowerCase()) {
                case 'agent':
                    await context.sendActivity('Finding an agent for you');
                    return await context.sendActivity('If you change your mind, say "disconnect"');
                default:
                    return await context.sendActivity('Thank you! Have a great day!');
            }
        }
        const response = await getSentiment(context);
        if(response.documents[0].score > .5) {
            return await context.sendActivity('Glad you enjoyed it!');
        } else {
            feedbackState.set(context, true);
            await context.sendActivity(`I'm sorry you had a bad experience.`)
            return await context.sendActivity(
                MessageFactory.suggestedActions(['Agent', 'No thank you'], 'Do you want to speak with a representative?')
            );
        }
    }
};

const getSentiment = async (context: TurnContext): Promise<SentimentAnalysisResponse> => {
    return await request({
        uri: textAnalyticsUrl,
        headers: {
            'Ocp-Apim-Subscription-Key': process.env.TEXT_ANALYTICS,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: {
            'documents': [{
                'language': 'en',
                'id': '1',
                'text': context.activity.text
            }]
        },
        method: 'POST',
        json: true
    });
}

