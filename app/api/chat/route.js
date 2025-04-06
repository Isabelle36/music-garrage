import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.studio.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY,
});

export async function POST(req) {
  const { message, musicXML, chord } = await req.json();

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: `You are a friendly and encouraging music teacher. Respond to questions in a concise and helpful way, avoiding unnecessary explanations.`,
        },
        {
          role: 'user',
          content: `User message: ${message}\n\nMusicXML (if provided):\n${musicXML || 'No MusicXML provided.'}\n\nChord: ${chord || 'No chord provided.'}`,
        },
      ],
    });

    const result = completion.choices?.[0]?.message?.content;

    if (!result) {
      return NextResponse.json({ error: 'No result from LLM' }, { status: 500 });
    }

    return NextResponse.json({ response: result });
  } catch (err) {
    console.error('Nebius API error:', err);
    return NextResponse.json({ error: 'Failed to process the request' }, { status: 500 });
  }
}