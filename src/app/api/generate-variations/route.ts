import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { idea } = await req.json();
  if (!idea) {
    return NextResponse.json({ error: 'No idea provided' }, { status: 400 });
  }

  const prompt = `You are a social media content expert. Given the idea: "${idea}", generate 5 creative, repurposed content variations. Return ONLY a JSON array of 5 strings, no explanation.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    let variations: string[] = [];
    try {
      variations = JSON.parse(content);
    } catch (parseErr) {
      const match = content && content.match(/\[.*\]/s);
      if (match) {
        try {
          variations = JSON.parse(match[0]);
        } catch (fallbackErr) {
          console.error('Fallback JSON parse error:', fallbackErr);
        }
      }
      console.error('Primary JSON parse error:', parseErr, 'Content:', content);
    }
    if (!Array.isArray(variations) || variations.length !== 5) {
      return NextResponse.json({ error: 'Failed to generate 5 variations.', openai: data, content, variations }, { status: 500 });
    }
    return NextResponse.json({ variations });
  } catch (err) {
    console.error('API route error:', err);
    return NextResponse.json({ error: 'Failed to generate variations.', details: String(err) }, { status: 500 });
  }
} 