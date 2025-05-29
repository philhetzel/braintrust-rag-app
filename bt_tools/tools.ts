import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";
import { z } from "zod";
import { currentSpan, projects} from "braintrust";

// const getDocs = async function getDocs(query: string) {
//     const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
//     const index = pinecone.Index("braintrust-rag-bot");

//     const voyage = new VoyageAIClient({
//         apiKey: process.env.VOYAGEAI_API_KEY,
//     });
//     const MODEL = "voyage-3"
//     const embedQuery = async function embedQuery(query: string) {
//         try {
//             const docs = await voyage.embed({input: query, model: MODEL})
//             return docs.data?.[0]?.embedding ?? []
//         } catch (error) {
//             console.error("Error embedding query:", error);
//             throw error;
//         }
//     }
//     try {
//         const embedding = await embedQuery(query);
        
//         const results = await index.query({
//             vector: embedding,
//             topK: 3,
//             includeMetadata: true,
//         });
        
//         const context = results.matches?.map(match => match.metadata?.content).join("\n\n") ?? "";
//         currentSpan().log({
//             metadata: {
//                 context: context,
//                 query: query
//             }
//         });
//         return context;
//     } catch (error) {
//         console.error("Error getting docs:", error);
//         currentSpan().log({
//             metadata: {
//                 error: error instanceof Error ? error.message : String(error),
//                 query: query
//             }
//         });
//         throw error;
//     }
// }

const project = projects.create({name: "PhilScratchArea"})

// Register the tool with both names for backward compatibility
export const getDocs = project.tools.create({
    handler:  async ({ query }) => {
        const pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
        const index = pinecone.Index("braintrust-rag-bot");
    
        const voyage = new VoyageAIClient({
            apiKey: process.env.VOYAGEAI_API_KEY,
        });
        const MODEL = "voyage-3"

        const docs = await voyage.embed({input: query, model: MODEL})
        const embedding =  docs.data?.[0]?.embedding ?? []

            
        const results = await index.query({
            vector: embedding,
            topK: 3,
            includeMetadata: true,
            });
            
            const context = results.matches?.map(match => match.metadata?.content).join("\n\n") ?? "";
            currentSpan().log({
                metadata: {
                    context: context,
                    query: query
                }
            });
            return context;
    },
    name: "getDocs",
    slug: "getDocs",
    description: "Get context from the vector database",
    parameters: z.object({
        query: z.string(),
    }),
    returns: z.string(),
    ifExists: "replace"
})
