import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://api.studio.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY,
});

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const content = await file.text();
  console.log('Uploaded File Content:', content); // Log the uploaded file content

  try {
    const completion = await openai.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content: 'You are a music expert. Help analyze uploaded MusicXML or text sheet music and provide helpful insights and practice tips for beginners.',
        },
        {
          role: 'user',
          content: `Here is a music sheet file. Please analyze and explain:\n\n${content}`,
        },
      ],
    });

    console.log('LLM API Response:', completion); 
    const result = completion.choices?.[0]?.message?.content;

    if (!result) {
      console.error('No result from LLM:', completion);
      return NextResponse.json({ error: 'No result from LLM' }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error('Nebius error:', err);
    return NextResponse.json({ error: 'LLM call failed' }, { status: 500 });
  }
}


