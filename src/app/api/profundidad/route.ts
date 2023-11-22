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
                const { data, error } = await supabaseClient
                    .from('proyectos')
                    .select('questions')
                    .eq('id', projectName)
                    .single()

                if (error !== null) {
                    console.error(`Error al obtener las preguntas:`, error);
                    return;
                }

                console.log(`------ Obteniendo el nombre del entrevistado ------`);
                const nombreQuery = `¿Cuál es el nombre del entrevistado? Solo dame el primer nombre sin texto extra. Responde siempre en español.`;
                const nombreRespuesta = await chain.call({ query: nombreQuery })
                console.log('Nombre obtenido:', nombreRespuesta);
                const eName = nombreRespuesta.text;


                console.log(`------ Procesando pregunta: ${question} ------`);
                const preguntaPersonalizada = `${question}. Si no tienes una respuesta inmediata, por favor re-analiza los documentos y proporciona una respuesta basada en bases similares a la pregunta. Las respuestas deben estar en primera persona, como si el entrevistado estuviera respondiendo a la pregunta de la entrevista. Siempre responde en español.`;
                const response = await chain.call({ query: preguntaPersonalizada })
                
                if (!respuestas[question]) {
                    respuestas[question] = [];
                }
                
                respuestas[question].push({ name: eName, respuesta: response.text });
                
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