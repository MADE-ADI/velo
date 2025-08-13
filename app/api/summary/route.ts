import { NextRequest, NextResponse } from 'next/server'

type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    }

    const { messages } = (await req.json()) as { messages: ChatMessage[] }
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid payload: messages array required' }, { status: 400 })
    }

    // Cap messages to a reasonable number to keep token usage low
    const trimmed = messages.slice(-50)

    const systemPrompt: ChatMessage = {
      role: 'system',
      content:
        'You are a helpful summarizer. Given a conversation between a user and an AI assistant, produce a concise summary in the original language of the conversation. Include: 1) key points, 2) decisions or action items, 3) open questions, 4) next steps. Keep it under 180 words if possible.'
    }

    const openaiReq = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [systemPrompt, ...trimmed.map(m => ({ role: m.role, content: m.content }))],
        temperature: 0.3,
        max_tokens: 400
      })
    })

    if (!openaiReq.ok) {
      const err = await openaiReq.text()
      return NextResponse.json({ error: 'OpenAI error', detail: err }, { status: 502 })
    }

    const data = await openaiReq.json()
    const summary = data?.choices?.[0]?.message?.content?.trim() || 'No summary generated.'
    return NextResponse.json({ summary })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', detail: e?.message || String(e) }, { status: 500 })
  }
}
