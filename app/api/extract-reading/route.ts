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
              text: 'You are an expert at reading utility meters (like the Electronic Watthour Meter shown). Look strictly at the digital LCD screen. You will typically see a smaller code on the left (such as 1.8.0, 1.8.1, or 96.1.0) and a large number on the right. Extract ONLY the large number on the right side of the LCD screen. Ignore printed barcodes, serial numbers, labels, and the small OBIS code on the left. Respond ONLY with the raw numeric value of the large digits (including any decimal point if visible). Do not include units or any other words.' 
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
