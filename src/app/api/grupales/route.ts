import { NextRequest, NextResponse } from 'next/server';
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
import { PromptTemplate } from "langchain/prompts";

interface RequestBody {
    projectName: string;
    fileName: string;
    question: string;
}

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export const POST = async function (req: NextRequest, res: NextResponse) {
    if (req.method !== 'POST') {
        return
    }

    const { projectName, fileName, question } = await req.json() as RequestBody;

    const project = (projectName).toString();
    let respuestas: { [key: string]: { name: string, respuesta: string }[] } = {};
    let totalTokens = 0;
    console.log(totalTokens);

    async function procesarArchivo(nombreArchivo: string) {
        try {
            console.log(nombreArchivo);

            console.log(`Trabajando con el archivo: ${nombreArchivo}`);
            let intentos = 0;
            const maxIntentos = 3;
            let archivoDescargado = null;

            while (intentos < maxIntentos && archivoDescargado === null) {
                const { data: archivo, error } = await supabaseClient
                    .storage
                    .from(project)
                    .download(nombreArchivo);

                if (error !== null) {
                    console.error(`Error al descargar el archivo ${nombreArchivo}:`, error);
                    intentos++;
                } else {
                    archivoDescargado = archivo;
                }
            }

            if (archivoDescargado === null) {
                console.error(`No se pudo descargar el archivo ${nombreArchivo} después de ${maxIntentos} intentos.`);
                return null;
            }

            const arrayBuffer = await archivoDescargado.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const data = await pdf(buffer);
            const texto = data.text;

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 2000,
                chunkOverlap: 400,
            })

            const chunks = await splitter.splitDocuments([
                new Document({ pageContent: texto })
            ])

            const model = new OpenAI({
                // modelName: "gpt-4-1106-preview",
                modelName: "gpt-3.5-turbo-16k",
                temperature: 0.0,
            });

            const memory = new BufferWindowMemory({ k: 12 })

            const vectorStore = await MemoryVectorStore.fromDocuments(
                chunks,
                new OpenAIEmbeddings(),
            );

            const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), memory)

            try {

                console.log(`------ Procesando pregunta: ${question} ------`);
                const template = "{question}. Please provide a detailed summary based on the document content. The summary should include key points and relevant details. Always respond in Spanish. The response should not exceed 500 characters.";
                const prompt = new PromptTemplate({
                    template: template,
                    inputVariables: ["question"],
                });

                const preguntaFormateada = await prompt.format({ question: question });

                const response = await chain.call({ query: preguntaFormateada });

                if (!respuestas[question]) {
                    respuestas[question] = [];
                }

                respuestas[question].push({ name: nombreArchivo, respuesta: response.text });

                const tokens = encode(response.text);
                totalTokens += tokens.length;

                console.log(`------ Terminado con el archivo: ${nombreArchivo}. Comenzando con el siguiente archivo ------`);

                return nombreArchivo;

            } catch (error) {
                console.log(error)
                return null;
            }

        } catch (error) {
            console.log(error)
            return null;
        }
    }

    await procesarArchivo(fileName);

    console.log(`Total de tokens utilizados: ${totalTokens}`);

    return NextResponse.json(respuestas);
}