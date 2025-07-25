import { Faithfulness, ContextRelevancy, ContextRecall, ContextPrecision, Factuality, LLMClassifierFromTemplate } from "autoevals";
import { Eval, initDataset, initFunction } from "braintrust";
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
    input: args.output.input
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

Eval("PhilScratchArea", {
  task: getOutput,
  data: initDataset({ project: "PhilScratchArea", dataset: "SmallRAGDataset" }), // ignored
  scores: [getFaithfulness, getContextRelevancy, getFactuality, initFunction({projectName: "PhilScratchArea", slug: "brand-check-6ba8"})],
});
