import { getContextTool } from './components/retrieval';

// Mock the external dependencies
jest.mock('@pinecone-database/pinecone');
jest.mock('voyageai');

async function test() {
    console.log('Starting simple test...');
    try {
        // This will fail because of the mocks, but we'll see the logs
        const result = await getContextTool.execute({ query: "test query" });
        console.log('Test result:', result);
    } catch (error) {
        console.error('Test failed (expected):', error);
    }
}

test(); 