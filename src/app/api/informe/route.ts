import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

import { VerbaTool } from "@/tools/verbatims";
// import { KeyWords } from "@/tools/keywords";
import supabase from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const verbaTool = new VerbaTool("");
    // const brainstorm = new KeyWords("");

    const getData = async () => {
        const information = await supabase
            .from('proyectos')
            .select('tableData')
            .eq('id', 'eb27f3dc-5722-4f4a-8883-be06cafe7299')
            .single();

        const keys = Object.keys(information.data?.tableData);

        const keysArray = Object.values(information.data?.tableData);

        const respuestas: Array<{ [key: string]: Array<Record<string, string>> }> = [];
        for (let i = 0; i < keysArray.length; i++) {
            const key = keysArray[i];
            if (Array.isArray(key)) {
                const results: Array<Record<string, string>> = [];
                for (const obj of key) {
                    const result = await verbaTool.call(obj.respuesta);
                    results.push({ [obj.name]: result });
                }
                respuestas.push({ [keys[i]]: results });
            } else {
                console.log(`${key} no es un array`);
            }
        }
        return respuestas;
    }

    const phrase = await getData();

    try {
        // const result = await verbaTool.call(phrase);

        // console.log(`el verbatim es: ${result}`);

        // const brainstormResult = await brainstorm.call(result);

        // console.log(`el brainstorm es: ${brainstormResult}`);

        return NextResponse.json(phrase);
    } catch (error) {
        console.log(error);
    }
}