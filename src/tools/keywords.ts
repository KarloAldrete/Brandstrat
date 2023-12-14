// import { OpenAI } from "langchain/llms/openai";
// import { initializeAgentExecutorWithOptions } from "langchain/agents";
// import { DynamicTool } from "langchain/tools";

// interface Tool {
//     call(arg: string): Promise<string>;
//     name: string;
//     description: string;
// }

// export class KeyWords implements Tool {
//     name: string = "KeyWords";
//     description: string = "This is a KeyWordsTool";

//     private phrase: string;

//     async call(phrase: string): Promise<string> {
//         this.phrase = phrase;
//         return this.initialize();
//     }

//     constructor(phrase: string) {
//         this.phrase = phrase;
//         this.initialize();
//     }

//     async initialize() {

//         const model = new OpenAI({
//             modelName: 'gpt-3.5-turbo-1106',
//             temperature: 0.0
//         });

//         const tools = [
//             new DynamicTool({
//                 name: "KeyWords",
//                 description: "This tool returns key words and ideas of the input string using the David Aaker's Brand Vision Model. Must respond in Spanish. Only mention the key words and the ideas.",
//                 func: this.call,
//             }),
//         ];

//         const executor = await initializeAgentExecutorWithOptions(tools, model, {
//             agentType: "zero-shot-react-description",
//         });

//         const result = await executor.invoke({ input: this.phrase });

//         return result.output;
//     }
// }