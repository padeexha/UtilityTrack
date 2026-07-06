import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Verify if OPENAI_API_KEY is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY environment variable. Cannot process image.' }, { status: 500 });
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'You are an expert at reading utility meters (water, electricity, gas). Extract the primary meter reading from this image. It is usually the largest number, often on an LCD screen or a set of analog rolling digits. Ignore any serial numbers, barcodes, or small labels. Include any decimals if present. Respond ONLY with the raw numeric reading. Do not include units or any other words.' 
            },
            { type: 'image', image: image }
          ]
        }
      ]
    });

    // Clean up any stray non-numeric characters just in case the AI hallucinates them
    const cleanReading = text.trim().replace(/[^\d.]/g, '');

    return NextResponse.json({ reading: cleanReading });
  } catch (error: any) {
    console.error('AI Extraction Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to extract reading' }, { status: 500 });
  }
}
