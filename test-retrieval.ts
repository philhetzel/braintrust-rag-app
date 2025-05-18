import { getContextTool } from './components/retrieval';

async function test() {
    console.log('Starting test...');
    try {
        const result = await getContextTool.execute({ query: "What is the weather?" });
        console.log('Test result:', result);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test(); 