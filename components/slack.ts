import { WebClient } from '@slack/web-api'
import { tool } from 'ai';
import { z } from 'zod';
import { wrapTraced } from 'braintrust';

const client = new WebClient(process.env.SLACK_TOKEN)
const CHANNEL_ID = "C08UVGG5D9R"

export const sendMessage = wrapTraced(async function sendMessage({message}: {message: string}) {

   await client.chat.postMessage({
        channel: CHANNEL_ID,
        text: `message: ${message}`
    });
});

export const slackTool = tool({
    description: "If a user asks to escalate a problem, use this tool to send a message to the slack channel",
    parameters: z.object({
        message: z.string()
    }),
    execute: sendMessage,
})








