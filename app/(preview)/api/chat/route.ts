import { openai } from "@ai-sdk/openai";
import { streamText, ToolInvocation, CoreMessage, ToolResultPart } from "ai";
import { getWeather, getFahrenheit } from "@/components/tools";
import { getContext } from "@/components/retrieval";
import { cookies } from 'next/headers'
// Uncomment below to use Braintrust's tracing features
import { initLogger, wrapAISDKModel, traced, currentSpan } from "braintrust";

type Message = CoreMessage;

export const logger = initLogger({
  apiKey: process.env.BRAINTRUST_API_KEY,
  projectName: "PhilScratchArea",
});

// Initialize Braintrust as the logging backend. Uncomment below
// Any time this model is called, the input and output will be logged to Braintrust. Uncomment below
const model = wrapAISDKModel(
  openai("gpt-4o")
// Uncomment below
);

export async function POST(request: Request) {
  const cookieStore = cookies();
  const spanIdCookie = cookieStore.get("span_id")?.value;
  console.log("spanIdCookie", spanIdCookie);
  
  // traced starts a trace span when the POST endpoint is used
  return traced(async (span) => {
      const { messages }: { messages: Message[] } = await request.json();
      const stream = await streamText({
        // Our wrapped OpenAI model
        model: model,
        system: `\
        - You are a helpful assistant that can answer questions about Braintrust using the Braintrust documentation.
        - you also are an AI assistant who gives the weather. If the user gives you a location, give them the current weather in that location in Fahrenheit.
      `,
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
        // Debug logging
        console.log("Raw result:", JSON.stringify(result, null, 2));
        console.log("Response messages:", JSON.stringify(result.response.messages, null, 2));
        
        // Filter messages for getContext tool responses
        const contextMessages = result.response.messages
          .filter(msg => msg.role === 'tool' && Array.isArray(msg.content))
          .map(msg => {
            console.log("Found tool message:", JSON.stringify(msg, null, 2));
            if (Array.isArray(msg.content)) {
              const toolResult = msg.content.find(
                (content): content is ToolResultPart =>
                  content.type === 'tool-result' && content.toolName === 'getContext'
              );
              console.log("Found tool result:", JSON.stringify(toolResult, null, 2));
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
            session: cookieStore.get("session_id_PhilCookie")?.value,
            context: contextMessages
          },
        });
      },
        });

      return stream.toDataStreamResponse();
    }
    // Show the this span as a function and name the span POST /api/chat. Uncomment below
    ,{ type: "function", name: "POST /api/chat" });
}
