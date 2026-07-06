import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

async function test() {
  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash-latest'),
      prompt: 'Hello',
    });
    console.log("SUCCESS:", text);
  } catch (e: any) {
    console.error("ERROR:", e.message);
  }
}
test();
