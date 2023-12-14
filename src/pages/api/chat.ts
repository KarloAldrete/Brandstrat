'use server';
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import supabaseClient from '@/lib/supabase'
import { OpenAI } from "langchain/llms/openai";
import { RetrievalQAChain } from "langchain/chains";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Document } from 'langchain/document';
import { BufferWindowMemory } from "langchain/memory";
import pdf from 'pdf-parse/lib/pdf-parse'
import { encode } from 'gpt-tokenizer';
import { PromptTemplate } from 'langchain/prompts'
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'

export default async function handler(req: NextRequest, res: NextResponse) {
    if (req.method === 'POST') {

        const { messages } = await req.json();

        const projectId = messages[0].content[0].projectId.id;

        let archivoDescargado: Blob | null = null;

        const { data, error } = await supabaseClient
        .from('proyectos')
        .select('*')
        .eq('id', projectId)
        .single();

        const documentos: Document[] = [];

        for (const fila of data.tableData) {
            for (const elemento of fila) {
                let texto;
                if (typeof elemento === 'object') {
                    texto = JSON.stringify(elemento);
                } else {
                    texto = elemento;
                }
                documentos.push(new Document({ pageContent: texto }));
            }
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 2000,
            chunkOverlap: 400,
        })

        const chunks = await splitter.splitDocuments(documentos);

        const model = new OpenAI({
            modelName: "gpt-3.5-turbo-1106",
            temperature: 0.1,
            timeout: 300000
        });
        

        const memory = new BufferWindowMemory({ k: 12 })

        const vectorStore = await MemoryVectorStore.fromDocuments(
            chunks,
            new OpenAIEmbeddings(),
        );

        const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), memory)

        const response = await chain.call({
            query: messages[0].content[0].value,
        });

        console.log(response.text);

        return NextResponse.json(response.text)
    } else {
        const statusCode = res.status
        console.log(statusCode);
    }
}