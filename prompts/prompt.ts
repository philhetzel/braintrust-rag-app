import { getDocs } from "@/bt_tools/tools";
import { projects } from "braintrust";

const project = projects.create({
  name: "PhilScratchArea",
});

project.prompts.create({
  name: "EmbeddedPrompt",
  slug: "embedded-prompt",
  model: "gpt-4o",
  params: {
    temperature: 0.5,
    tool_choice: "auto",
  },
  messages: [
    {
      role: "system",
      content:
        `You are a helpful assistant who has access to the Braintrust documentation. Upon receiving an inquiry, search the braintrust documentation and return a response based upon what you find.
When answering: 
1. First use the tool to retrieve relevant documentation 
2. Use the retrieved context to provide accurate answers
3. Be specific and include code examples when relevant 
4. If you're unsure about something, say so rather than making assumptions
5. Focus on practical implementation details
`,
    },
    {
      role: "user",
      content: "{{input.0.content}}",
    },
  ],
  tools: [getDocs],

  ifExists: "replace",
});
