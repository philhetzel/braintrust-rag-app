import braintrust
from pinecone.grpc import PineconeGRPC as Pinecone
from pydantic import BaseModel
import voyageai
import os
from typing import List
from openai import OpenAI
from dotenv import load_dotenv
import json
from autoevals import Faithfulness
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv( '../.env.local'  )

logger.info("Initializing project and clients")
project = braintrust.projects.create("PhilScratchArea")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Args(BaseModel):
    query: str

class Document(BaseModel):
    content: str


class DocumentOutput(BaseModel):
    text: List[Document]

def handler(query: str):
    logger.info(f"Processing query: {query}")
    query = query[0]['content']
    logger.debug(f"Parsed query content: {query}")
    
    logger.info("Initializing VoyageAI and Pinecone clients")
    vo = voyageai.Client(api_key=os.getenv("VOYAGEAI_API_KEY"))
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index("braintrust-rag-bot")
    MODEL = 'voyage-3'

    logger.info("Generating embeddings and querying Pinecone")
    xq = vo.embed(query, model=MODEL, input_type='query').embeddings[0]
    response = index.query(xq, top_k=3, include_metadata=True)
    matches = [{'content': match['metadata']['content']} for match in response['matches']]
    logger.info(f"Found {len(matches)} matching documents")

    return matches

def prompt(query, context: list[dict]): 
    logger.info("Generating response with context")
    logger.info(f"Query: {query}")
    query = query[0]['content']
    all_content = '\n\n'.join([match['content'] for match in context])
    logger.debug(f"Combined context length: {len(all_content)} characters")
    
    logger.info("Calling OpenAI API")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that can answer questions about the Braintrust documentation. You will receive a question and context about that question. Use the context to answer the question. If the context does not contain the answer, say so."},
            {"role": "user", "content": query},
            {"role": "user", "content": f"Context: {all_content}"}
        ]
    )
    logger.info("Received response from OpenAI")

    return {"answer": response.choices[0].message.content, "context": all_content}

example_prompt = """
[
  {
    "content": "What are the different types of scorers I can use?",
    "parts": [
      {
        "text": "What are the different types of scorers I can use?",
        "type": "text"
      }
    ],
    "role": "user"
  }
]
"""

def get_output(query):
    logger.info("Starting get_output function")
    logger.info(f"Query: {query}")
    context = handler(query)
    result = prompt(query, context)
    logger.info("Completed get_output function")
    return result


def get_faithfulness(output, **kwargs):
    logger.info("Calculating faithfulness score")
    score = Faithfulness().eval(output=output['answer'], context=output['context'], **kwargs)
    logger.info(f"Faithfulness score calculated: {score}")
    return score

logger.info("Starting evaluation")
braintrust.Eval("PhilScratchArea",
                task=get_output,
                scores=[get_faithfulness],
                data= braintrust.init_dataset(project='PhilScratchArea', name='RAGDataset')
                )
logger.info("Evaluation completed")
