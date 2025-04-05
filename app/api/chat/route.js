import { NextResponse } from 'next/server';

const API_URL = 'https://llm.api.cloud.nebius.ai/v1/chat/completions';

export async function POST(request) {
  try {
    const body = await request.json();
    const { message } = body;
    const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;

    console.log('Received message:', message); // Debug log

    if (!NEBIUS_API_KEY) {
      console.error('API key not configured');
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

    console.log('Making API request...'); // Debug log

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
      return NextResponse.json(
        { error: 'Failed to get response from API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('API response:', data); // Debug log

    if (!data.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: 'Invalid response format from API' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      response: data.choices[0].message.content
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}