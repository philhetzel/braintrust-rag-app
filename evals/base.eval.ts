import { Faithfulness, ContextRelevancy, ContextRecall, ContextPrecision, Factuality, LLMClassifierFromTemplate, Scorer, Score } from "autoevals";
import { Eval, BaseExperiment, initFunction, initDataset } from "braintrust";
import {  generateResponse } from "@/app/(preview)/api/chat/route";
import { CoreMessage, ToolResultPart } from "ai";

async function getOutput(query: CoreMessage[]): Promise<Output> {
  const response = await generateResponse(query, "default_session_id");
  response.consumeStream();
  
  const responseData = await response.response;
  const context = responseData.messages
    .filter(msg => msg.role === 'tool' && Array.isArray(msg.content))
    .map(msg => {
      if (Array.isArray(msg.content)) {
        const toolResult = msg.content.find(
          (content): content is ToolResultPart =>
            content.type === 'tool-result' && content.toolName === 'getContext'
        );
        return toolResult?.result || '';
      }
      return '';
    })
    .join('\n');

  const output: Output = {
    output: await response.text,
    context: context,
    input: query[0].content as string
  };
  return output;
}

interface Output {
  output: string;
  context: string;
  input: string;
}
 
const getFaithfulness = (args: {
  output: Output
}) => {
  return Faithfulness({
    output: args.output.output,
    context: args.output.context,
    input: args.output.input
  });
};

const getContextRelevancy = (args: {
  output: Output
}) => {
  return ContextRelevancy({
    output: args.output.output,
    context: args.output.context,
    input: args.output.input,
    model: "gpt-4o-mini",
  });
};

const getContextPrecision = (args: {
  output: Output,
}) => {
  return ContextPrecision({
    output: args.output.output,
    context: args.output.context,
    input: args.output.input,
    expected: "{{expected}}",
    model: "gpt-4o-mini",
  });
};

const getContextRecall = (args: {
  output: Output,
}) => {
  return ContextRecall({
    output: args.output.output,
    context: args.output.context,
    input: args.output.input,
    expected: "{{expected}}",
    model: "gpt-4o-mini",

  });
};

const getFactuality = (args: {
  output: Output,
}) => {
  return Factuality({
    output: args.output.output,
    input: args.output.input,
  });
};

const evaluateEscalation: Scorer<any, {input: string, output: string}> = LLMClassifierFromTemplate<{input: string, output: string}>({
    name: "Escalation Check",
    choiceScores: { "correct_decision": 1, "incorrect_decision": 0 },
    model: "gpt-4o-mini",
    useCoT: true,
    promptTemplate: `
You are evaluating a conversation between a customer and a chatbot to determine if the escalation to a human agent was handled correctly.

EVALUATION CRITERIA:
1. User Request for Human:
   - Explicit requests (e.g., "I want to speak to a human", "Can I talk to a real person?")
   - Implicit requests (e.g., "This is too complicated", "I need more help")
   - Frustration indicators (e.g., "This isn't working", "I've tried everything")

2. Chatbot Response:
   - Correct escalation: Acknowledges request and initiates human handoff
   - Incorrect escalation: Either fails to escalate when needed or escalates unnecessarily

SCORING RULES:
- "correct_decision" (score: 1) if:
  * User requests human AND chatbot properly initiates escalation
  * User doesn't request human AND chatbot continues normal conversation
- "incorrect_decision" (score: 0) if:
  * User requests human BUT chatbot fails to escalate
  * User doesn't request human BUT chatbot unnecessarily escalates

EXAMPLES:
Correct Decisions:
- User: "I need to speak to a human about my account"
  Bot: "I'll connect you with a human agent right away."
- User: "What are your business hours?"
  Bot: "Our business hours are 9 AM to 5 PM EST."

Incorrect Decisions:
- User: "This is too complicated, I need a person"
  Bot: "I can help you with that. Let me explain..."
- User: "What's your return policy?"
  Bot: "Let me transfer you to a human agent."

<CONVERSATION> 
{{input}}
</CONVERSATION>

<RESPONSE>
{{output}}
</RESPONSE>

Evaluate the conversation based on the above criteria and provide your reasoning before giving the final score.
` 
  });

async function getEscalation(args: {
  output: Output
}): Promise<Score> {
  return await evaluateEscalation({ input: args.output.input, output: args.output.output });
};

const evaluateForgetfulness: Scorer<any, {input: string, output: string}> = LLMClassifierFromTemplate<{input: string, output: string}>({
  name: "Forgetfulness Check",
  choiceScores: { "remembers_all": 1, "remembers_partial": 0.5, "remembers_none": 0 },
  model: "gpt-4o-mini",
  useCoT: true,
  promptTemplate: `
You will be provided with a conversation between a customer and a chatbot assistant. Your task is to evaluate how well the chatbot maintains context and remembers information from previous turns in the conversation.

Evaluate the chatbot's response based on these criteria:

1. Key Information Retention:
   - Does the chatbot remember and reference important details mentioned earlier in the conversation?
   - Does it maintain consistency with previously established facts or preferences?
   - Does it acknowledge and build upon previous context?

2. Context Continuity:
   - Does the response flow naturally from previous exchanges?
   - Does it maintain the same topic or properly transition between related topics?
   - Does it avoid contradicting previous statements?

3. User Preference Memory:
   - Does it remember user preferences or requirements stated earlier?
   - Does it maintain consistent recommendations based on previous interactions?

Score the response as:
- "remembers_all": The chatbot demonstrates complete memory of previous context, maintains perfect continuity, and shows no signs of forgetfulness
- "remembers_partial": The chatbot remembers some aspects of the conversation but misses or contradicts some previous information
- "remembers_none": The chatbot shows significant forgetfulness, contradicts previous information, or fails to maintain context

<CONVERSATION> 
{{input}}
</CONVERSATION>

<RESPONSE>
{{output}}
</RESPONSE>

Provide your evaluation and reasoning before giving the final score.
` 
});

const getForgetfulness = (args: {
  output: Output,
}) => {
  return evaluateForgetfulness({ input: args.output.input, output: args.output.output });
};


Eval("PhilScratchArea", {
  task: getOutput,
  data: BaseExperiment<CoreMessage[], unknown, void>({name: 'main-1748522243'}), // ignored
  scores: [getEscalation, getForgetfulness],
});