import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Replace this with your actual questions fetching logic
    const questions = [
      { question_text: "What are the common troubleshooting steps?" },
      { question_text: "How do I set up a new device?" },
      { question_text: "What are the system requirements?" }
    ];

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}



