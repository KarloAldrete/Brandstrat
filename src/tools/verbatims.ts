import { OpenAI } from "langchain/llms/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { DynamicTool } from "langchain/tools";

interface Tool {
    call(arg: string): Promise<string>;
    name: string;
    description: string;
}

export class VerbaTool implements Tool {
    name: string = "VerbaTool";
    description: string = "This is a VerbaTool";

    private phrase: string;

    async call(phrase: string): Promise<string> {
        this.phrase = phrase;
        return this.initialize();
    }

    constructor(phrase: string) {
        this.phrase = phrase;
        this.initialize();
    }

    async initialize() {
        try {
            const model = new OpenAI({
                modelName: 'gpt-3.5-turbo-1106',
                temperature: 0.0
            });

            const verbTool = [
                new DynamicTool({
                    name: "VerbaTool",
                    description: "This tool selects and returns a small fragment of the string with the most important thing but you can't change the words of the user, you can remove a few words but not change it. Must respond in Spanish. Must be in single person.",
                    func: this.call,
                }),
            ];

            const verbatims = await initializeAgentExecutorWithOptions(verbTool, model, {
                agentType: "zero-shot-react-description",
            }); 

            const result = await verbatims.invoke({ input: this.phrase });

            return result.output;
        } catch (error) {
            console.log(error);
            return error;
        }
    }
};