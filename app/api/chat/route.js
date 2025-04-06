import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Check for the API key *before* attempting to instantiate the client
if (!process.env.NEBIUS_API_KEY) {
  console.error("CRITICAL: NEBIUS_API_KEY environment variable is not set!");
  // You might want to throw an error here during server startup in a real app,
  // but for now, we'll let requests fail with a clear message.
}

const openai = new OpenAI({
  baseURL: 'https://api.studio.nebius.com/v1/',
  apiKey: process.env.NEBIUS_API_KEY, // This MUST be defined in your environment
});

export async function POST(req) {
  let message, musicXML, chord;
  try {
    const body = await req.json();
    message = body.message;
    musicXML = body.musicXML;
    chord = body.chord;
  } catch (jsonError) {
    console.error("Failed to parse request JSON:", jsonError);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  // Re-check here just in case, before making the actual call
  if (!process.env.NEBIUS_API_KEY) {
     console.error("NEBIUS_API_KEY environment variable is not set at time of request!");
     return NextResponse.json({ error: 'Server configuration error: API key missing' }, { status: 500 });
  }

  console.log("Attempting API call to Nebius...");

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

    console.log("Nebius API call successful.");
    const result = completion.choices?.[0]?.message?.content;

    if (!result) {
      console.error("No result content found in Nebius API response:", completion);
      return NextResponse.json({ error: 'No result from LLM' }, { status: 500 });
    }

    return NextResponse.json({ response: result });
  } catch (err) {
    console.error('Nebius API call failed. Error details:', err);
    if (err instanceof OpenAI.APIError) {
      console.error('Status:', err.status);
      console.error('Message:', err.message);
      console.error('Code:', err.code);
      console.error('Type:', err.type);
      // More specific error based on status code
       if (err.status === 401) {
         return NextResponse.json({ error: 'Authentication error. Check your Nebius API Key.' }, { status: 401 });
       } else if (err.status === 404) {
          return NextResponse.json({ error: 'API endpoint or model not found. Check baseURL and model name.' }, { status: 404 });
       }
    }
    // Generic error for other cases
    return NextResponse.json({ error: 'Failed to process the request with the AI model' }, { status: 500 });
  }
}