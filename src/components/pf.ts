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


export default async function Profundidad(projectName: string, fileName: string) {
    const hey = PromptTemplate;

    const project = (projectName).toString();
    let respuestas: { [key: string]: { name: string, respuesta: string }[] } = {};
    let totalTokens = 0;
    console.log(totalTokens);

    async function procesarArchivo(nombreArchivo: string) {
        try {

            console.log(`Trabajando con el archivo: ${nombreArchivo}`);
            let intentos = 0;
            const maxIntentos = 3;
            let archivoDescargado: Blob | null = null;

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
                modelName: "gpt-3.5-turbo-1106",
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

                const preguntas = data.questions;

                for (const pregunta of preguntas) {
                    console.log(`------ Procesando pregunta: ${pregunta} ------`);
                    const preguntaPersonalizada = `${pregunta}. If you don't have an immediate answer, please re-analyze the documents and provide an answer based on similar bases to the question. The answers should be in the first person, as if the interviewee were answering the interview question. Always respond in Spanish.`;
                    const response = await chain.call({ query: preguntaPersonalizada })

                    if (!respuestas[pregunta]) {
                        respuestas[pregunta] = [];
                    }

                    respuestas[pregunta].push({ name: eName, respuesta: response.text });

                    const tokens = encode(response.text);
                    totalTokens += tokens.length;
                }

                console.log(`------ Terminado con el archivo: ${nombreArchivo}. Comenzando con el siguiente archivo ------`);

                await vectorStore.delete()

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

    return respuestas;
}