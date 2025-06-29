import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { tool } from "ai";
import { z } from "zod";

const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
const index = pinecone.Index("braintrust-rag-bot");

const voyage = new VoyageAIClient({
    apiKey: process.env.VOYAGEAI_API_KEY,
});
const MODEL = "voyage-3"

const embedQuery = async function embedQuery(query: string) {
    const docs = await voyage.embed({input: query, model: MODEL})
    return docs.data?.[0]?.embedding ?? []
};

export const getDocs = async function getDocs(query: string) {
    const embedding = await embedQuery(query);
    
    const results = await index.query({
        vector: embedding,
        topK: 3,
        includeMetadata: true,
    });
    
    const context = results.matches?.map(match => match.metadata?.content).join("\n\n") ?? "";
    return context;
}

export const getContext = tool({
    description: "Get context from the vector database",
    parameters: z.object({
        query: z.string(),
    }),
    execute: async ({ query }) => {
        const context = await getDocs(query);
        return context;
    },
}); 

