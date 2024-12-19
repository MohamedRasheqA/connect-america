// app/api/chat/route.ts
import { NextResponse } from 'next/server';
export const maxDuration = 300;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  urls?: Array<{ url: string; content: string }>;
  isExpanded?: boolean;
}

export async function POST(request: Request) {
  const controller = new AbortController();

  try {
    const { message, is_expanded } = await request.json();

    if (!message) {
      return NextResponse.json({
        role: 'assistant',
        content: 'No message provided'
      } as Message, { status: 400 });
    }

    console.log('Sending request to LLM API:', { message, is_expanded });
    
    const timeoutId = setTimeout(() => controller.abort(), 290000);

    try {
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          chat_history: [], // Empty array as specified
          is_expanded: is_expanded || false 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.'
        } as Message, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json({
        role: 'assistant',
        content: data.response || data.message || 'No response received',
        urls: data.urls, // Include URLs if they exist in the response
        isExpanded: is_expanded || false
      } as Message);

    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          role: 'assistant',
          content: 'Sorry, the request timed out. Please try again.'
        } as Message, { status: 408 });
      }
      throw fetchError;
    }
    
  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json({
      role: 'assistant',
      content: 'Sorry, something went wrong. Please try again.'
    } as Message, { status: 500 });
  } finally {
    controller.abort();
  }
}