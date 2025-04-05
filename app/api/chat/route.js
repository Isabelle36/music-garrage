import { NextResponse } from 'next/server';

const API_URL = 'https://llm.api.cloud.nebius.ai/v1/chat/completions';

export async function POST(request) {
  try {
    const { message } = await request.json();
    const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;

    if (!NEBIUS_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEBIUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful music theory assistant. Help users understand music concepts, chord progressions, and sheet music analysis.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Nebius API error:', error);
      throw new Error('Failed to get response from Nebius');
    }

    const data = await response.json();
    return NextResponse.json({ 
      response: data.choices[0]?.message?.content || 'No response generated'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}