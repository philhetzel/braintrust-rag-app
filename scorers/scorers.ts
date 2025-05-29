import { Faithfulness } from "autoevals";
import { z } from "zod";
import { projects } from "braintrust";

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
  
  const project = projects.create({name: "PhilScratchArea"})
  
  project.scorers.create({
    name: "getFaithfulness",
    slug: "get-faithfulness",
    handler: getFaithfulness,
    parameters: z.object({
      output: z.object({
        output: z.string(),
        context: z.string(),
        input: z.string(),
      }),
    }),
    ifExists: "replace",
  });