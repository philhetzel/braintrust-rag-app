import { Faithfulness, LLMClassifierFromTemplate, Scorer } from "autoevals";
import { z } from "zod";
import { projects } from "braintrust";

interface Output {
    output: string;
    context: string;
    input: string;
  }
   
  // const getFaithfulness = (args: {
  //   output: string,
  //   input: string
  // }) => {
  //   return Faithfulness({
  //     output: args.output,
  //     input: args.input
  //   });
  // };
  
  const evaluateForgetfulness = LLMClassifierFromTemplate({
    name: "Forgetfulness Check",
    choiceScores: { "remembers_all": 1, "remembers_partial": 0.5, "remembers_none": 0 },
    model: "gpt-4o",
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
  - "remembers_all": The chatbot demonstrates complete memory of previous messages, maintains perfect continuity, and shows no signs of forgetfulness within a conversation
  - "remembers_partial": The chatbot remembers some aspects of the conversation but misses or contradicts some previous information
  - "remembers_none": The chatbot shows significant forgetfulness, contradicts previous information, or fails to maintain context

  Respond with only "remembers_all", "remembers_partial", or "remembers_none" and nothing else.
  
  <CONVERSATION> 
  {{input}}
  </CONVERSATION>
  
  <RESPONSE>
  {{output}}
  </RESPONSE>
  
  Provide your evaluation and reasoning before giving the final score.
  ` 
  });


  const project = projects.create({name: "PhilScratchArea"})
  
  // project.scorers.create({
  //   name: "getFaithfulness",
  //   slug: "get-faithfulness",
  //   handler: getFaithfulness,
  //   parameters: z.object({
  //     output: z.string(),
  //     input: z.string(),
  //   }),
  //   ifExists: "replace",
  // });

  project.scorers.create({
    name: "getForgetfulness",
    slug: "get-forgetfulness",
    handler: evaluateForgetfulness,
    ifExists: "replace",
  });
