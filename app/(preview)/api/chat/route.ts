import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { streamText, ToolInvocation, CoreMessage, ToolResultPart, createDataStreamResponse } from "ai";
import { getWeather, getFahrenheit } from "@/components/tools";
import { getContext } from "@/components/retrieval";
import { cookies } from 'next/headers'
// Uncomment below to use Braintrust's tracing features
import { wrapAISDKModel, traced, currentSpan, loadPrompt } from "braintrust";
import { logger as logger_component } from "@/components/logger";

const logger = logger_component;

async function getPrompt() {
  const prompt = await loadPrompt({
    projectName: "PhilScratchArea",
    slug: "embedded-prompt",
    version: "8a72e85f111fb97a"
  });
  
  const prompt_obj = prompt.build('')
  const prompt_message: string = prompt_obj.messages[0].content as string;
  const model_name: string = prompt_obj.model;
  return {prompt_message, model_name}
}


type Message = CoreMessage;

const ANTHROPIC_MODELS = ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3-7-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-5-sonnet-latest"]
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-3.5-turbo"]
const GOOGLE_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash-preview-05-20"]

// Initialize Braintrust as the logging backend. Uncomment below
// Any time this model is called, the input and output will be logged to Braintrust. Uncomment below


export async function generateResponse(messages: Message[], sessionId: string) {
  const {prompt_message, model_name} = await getPrompt()
  let model: any;
  if (ANTHROPIC_MODELS.includes(model_name)) {
    model = wrapAISDKModel(anthropic(model_name));
  } else if (OPENAI_MODELS.includes(model_name)) {
    model = wrapAISDKModel(openai(model_name));
  } else if (GOOGLE_MODELS.includes(model_name)) {
    model = wrapAISDKModel(google(model_name));
  }
  const stream = await streamText({
    // Our wrapped OpenAI model
    model: model,
    system: prompt_message,
    messages: messages,
    // Important: maxSteps prevents infinite tool call loops but will stop your LLM's logic prematurely if set too low
    maxSteps: 5,
    // Register the exported tools to the LLM from @/components/tools
    tools: {
      getWeather: getWeather,
      getFahrenheit: getFahrenheit,
      getContext: getContext,
    },
    // Enable experimental telemetry
    experimental_telemetry: {
      isEnabled: true,
    },
  // When streamText is finished, log the input and output of the stream for the "root" span. Uncomment below
  onFinish: (result) => {
    // Filter messages for getContext tool responses
    const contextMessages = result.response.messages
      .filter(msg => msg.role === 'tool' && Array.isArray(msg.content))
      .map(msg => {
        if (Array.isArray(msg.content)) {
          const toolResult = msg.content.find(
            (content): content is ToolResultPart =>
              content.type === 'tool-result' && content.toolName === 'getContext'
          );
          return typeof toolResult?.result === 'string' ? toolResult.result : undefined;
        }
        return undefined;
      })
      .filter((result): result is string => result !== undefined);

    currentSpan().log({
      input: messages,
      output: result.text,
      metadata: {
        user: "phetzel1",
        session: sessionId,
        context: contextMessages,
        model: model_name,
      },
    });
    

    // Add span ID to the response data

  },
    });

  return stream
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const sessionId = cookieStore.get("session_id_PhilCookie")?.value || "default_session_id"
  
  return traced(async (span) => {
    const { messages }: { messages: Message[] } = await request.json();
    
    return createDataStreamResponse({
      execute: async (dataStream) => {
        const stream = await generateResponse(messages, sessionId);
        
        // Annotate the stream with the span ID
        dataStream.writeMessageAnnotation({
          spanId: span.id
        });

        // Forward the stream
        await stream.mergeIntoDataStream(dataStream);
      }
    });
  }, { type: "function", name: "POST /api/chat" });
}
