/**
 * ragagent.ts - Retrieval Augmented Generation (RAG) Example with LangGraph
 *
 * Overview:
 * This script demonstrates a simple Retrieval Augmented Generation (RAG) workflow using LangGraph and OpenAI APIs.
 *
 * RAG Flow Implementation:
 *
 *   ┌──────────────────────────────┐
 *   │  Fetch & Chunk Book Content  │
 *   │ (download, split, embed)     │
 *   └───────────────┬──────────────┘
 *                   │
 *                   ▼
 *           ┌───────────────┐
 *           │ Vector Store  │
 *           │ (store chunks)│
 *           └───────┬───────┘
 *                   │
 *                   ▼
 *           ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
 *           │  User Query   │ ───▶ │  Retrieve     │ ───▶ │   Generate    │
 *           │ (question)    │      │ (similar docs)│      │ (LLM+prompt)  │
 *           └───────────────┘      └───────────────┘      └───────────────┘
 *                                                                 │
 *                                                                 ▼
 *                                                           ┌───────────────┐
 *                                                           │   Answer      │
 *                                                           │ (response)    │
 *                                                           └───────────────┘
 *
 * 1. Fetches and loads a text file (Harry Potter book) if not present locally
 * 2. Chunks the text and stores the chunks in an in-memory vector store
 * 3. On user query, retrieves relevant chunks from the vector store via similarity search
 * 4. Generates an answer using a prompt template and a language model, based on the retrieved context
 *
 * References:
 * - LangChain RAG Tutorial: https://js.langchain.com/docs/tutorials/rag/
 *
 * Author: Vikrama Aditya Bharatula
 * Date: 2025-06-24
 */

/* eslint-disable no-console */

// =========================
// Imports
// =========================
import { readFile, writeFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// =========================
// LLM and Embeddings Setup
// =========================
// Initialize the OpenAI language model for answer generation.
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});

// Initialize OpenAI embeddings for vector storage and retrieval.
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large"
});

// Create an in-memory vector store for document chunks.
const vectorStore = new MemoryVectorStore(embeddings);

// =========================
// Data Preparation
// =========================
// Ensure the agentfsexamples directory exists for storing the text file.
const dirpath = join(process.cwd(), "agentfsexamples");
if (!existsSync(dirpath)) {
  mkdirSync(dirpath, { recursive: true });
}

// Define the path for the Harry Potter text file.
const filePath = join(dirpath, "harrypotter.txt");

// Download the file if it does not exist locally.
if (!existsSync(filePath)) {
  const response = await fetch("https://dgoldberg.sdsu.edu/515/harrypotter.txt");
  const text = await response.text();
  await writeFile(filePath, text);
}

// Load the file content and wrap it as a LangChain Document.
const fileContent = await readFile(filePath, "utf-8");
const docs: Document[] = [
  new Document({ pageContent: fileContent, metadata: { title: "Harry Potter" } })
];

// =========================
// Document Chunking
// =========================
// Split the document into manageable chunks for embedding and retrieval.
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});
const allSplits = await splitter.splitDocuments(docs);

// =========================
// Vector Store Indexing
// =========================
// Add the document chunks to the vector store for similarity search.
await vectorStore.addDocuments(allSplits);

// =========================
// Prompt Template Setup
// =========================
// Pull a RAG prompt template from LangChain Hub for question-answering.
const promptTemplate = await pull<ChatPromptTemplate>("rlm/rag-prompt");

// =========================
// State Annotations
// =========================
// Define the input and full state for the RAG workflow.
const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  context: Annotation<Document[]>,
  answer: Annotation<string>,
});

// =========================
// RAG Workflow Steps
// =========================
// Step 1: Retrieve relevant document chunks for the input question.
const retrieve = async (state: typeof InputStateAnnotation.State) => {
  const retrievedDocs = await vectorStore.similaritySearch(state.question);
  return { context: retrievedDocs };
};

// Step 2: Generate an answer using the question and retrieved context.
const generate = async (state: typeof StateAnnotation.State) => {
  const docsContent = state.context.map(doc => doc.pageContent).join("\n");
  const messages = await promptTemplate.invoke({ question: state.question, context: docsContent });
  const response = await llm.invoke(messages);
  return { answer: response.content };
};

// =========================
// State Graph Compilation
// =========================
// Build the RAG workflow as a state graph.
const graph = new StateGraph(StateAnnotation)
  .addNode("retrieve", retrieve)
  .addNode("generate", generate)
  .addEdge("__start__", "retrieve")
  .addEdge("retrieve", "generate")
  .addEdge("generate", "__end__")
  .compile();

// =========================
// Example Usage
// =========================
// Provide a sample question and run the RAG workflow.
const inputs = { question: "Who is Harry Potter?" };
const result = await graph.invoke(inputs);
console.log(result.answer);