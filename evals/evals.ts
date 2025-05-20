import { LLMClassifierFromTemplate,Faithfulness } from "autoevals";
import { Eval, projects, initDataset } from "braintrust";
import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { wrapTraced, currentSpan } from "braintrust";

// Setup Pinecone, VoyageAI, and OpenAI clients
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.Index("braintrust-rag-bot");

const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGEAI_API_KEY,
});
const MODEL = "voyage-3";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Input {
  content: string;
  parts: object[];
  role: string;
}

// Create embedding and retrieval functions
const embedQuery = wrapTraced(async function embedQuery(query: Input[]) {
  console.log("EMBEDDING QUERY", query[0].content);
  const docs = await voyage.embed({ input: query[0].content, model: MODEL });
  return docs.data?.[0]?.embedding ?? [];
});

export const getDocs = wrapTraced(
  async function getDocs(query: Input[]) {
    const embedding = await embedQuery(query);

    const results = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });

    const context =
      results.matches?.map((match) => match.metadata?.content).join("\n\n") ??
      "";
    currentSpan().log({
      metadata: {
        context: context,
      },
    });
    return context;
  },
  { type: "tool" }
);

async function getOutput(query: Input[]): Promise<Output> {
  const context = await getDocs(query);
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
      You are a helpful assistant that can answer questions about Braintrust using the Braintrust documentation.
      `,
      },
      { role: "user", content: query[0].content },
      {
        role: "assistant",
        content: `
      CONTEXT: ${context}
      `,
      },
    ],
  });

  const output: Output = {output: response.choices[0].message.content ?? "", context: context, input: query[0].content}
  return output
}

// async function getFaithfulness(args: { input: string }) {
//   const output_obj = JSON.parse(args.input);
//   const output = output_obj.output;
//   const context = output_obj.context;
//   const classifier = LLMClassifierFromTemplate({
//     name: "NoHallucination",
//     model: "gpt-4o-mini",
//     promptTemplate: `You are an LLM editor that ensures that no false information appears in a response. Given a response
//     check the response against the context. If there is information in the response that was not in the context, this is a 
//     hallucination. If there is no hallucination, return "yes". If there is a hallucination, return "no".
    
//     Response: ${output}
    
//     Context: ${context}
//     `,
//     choiceScores: {
//       "yes": 1,
//       "no": 0,
//     },
//   });
//   return classifier
// }

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

Eval("PhilScratchArea", {
  task: getOutput,
  data: initDataset({ project: "PhilScratchArea", dataset: "RAGDataset" }), // ignored
  scores: [getFaithfulness],
});
