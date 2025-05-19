import { LLMClassifierFromTemplate } from "autoevals";
import { Eval, projects } from "braintrust";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// Create a project
const project = await projects.create({
  name: "PhilScratchArea"
});

const noHallucination = LLMClassifierFromTemplate({
    name: "No Hallucination",
    promptTemplate: `Observe the response and determine if it contains any hallucinations when compared to the context.
    RESPONSE: {{output}}
    CONTEXT: {{metadata.}}
    (Y/N)\n\n{{output}}`,
    choiceScores: {
      Y: 0,
      N: 1,
    },
    useCoT: true,
  });
  
