import { streamText, createTextStreamResponse, stepCountIs, convertToModelMessages } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { getToolsForRole } from '@/lib/ai/tools'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Helper: extract plain text from a message that might be v6 parts or flat
// ---------------------------------------------------------------------------
function getPlainText(msg: any): string {
  if (typeof msg.content === 'string') return msg.content
  if (msg.parts && Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('')
  }
  return ''
}

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, threadId, generateTitle: isTitleRequest } = body

  // --- Auth ---
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  if (!profile) return new Response('Profile not found', { status: 404 })

  // -----------------------------------------------------------------
  // TITLE GENERATION — lightweight endpoint
  // -----------------------------------------------------------------
  if (isTitleRequest && threadId) {
    const userText = getPlainText(messages[0] || {})
    const aiText = getPlainText(messages[1] || {})
    const titlePrompt = `Based on this conversation, generate a very short title (3-6 words max, no quotes, no punctuation at the end). User said: "${userText.slice(0, 200)}". Assistant replied about: "${aiText.slice(0, 200)}". Title:`

    const titleResult = await import('ai').then(m =>
      m.generateText({
        model: google('gemini-2.0-flash'),
        prompt: titlePrompt,
        maxOutputTokens: 20,
      })
    )

    const title = titleResult.text?.trim().replace(/^["']|["']$/g, '').slice(0, 50) || 'New Conversation'
    return new Response(title, { status: 200 })
  }

  // -----------------------------------------------------------------
  // MAIN CHAT — stream response
  // -----------------------------------------------------------------

  // Find or create thread
  let currentThreadId = threadId
  const isNewThread = !currentThreadId

  if (!currentThreadId) {
    const firstMsg = getPlainText(messages[0] || {})
    const title = firstMsg.substring(0, 50) || 'New Conversation'
    const { data: newThread } = await supabase
      .from('oracle_threads')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()

    if (newThread) currentThreadId = newThread.id
  } else {
    // Validate ownership
    const { data: thread } = await supabase
      .from('oracle_threads')
      .select('id')
      .eq('id', currentThreadId)
      .eq('user_id', user.id)
      .single()

    if (!thread) return new Response('Thread not found', { status: 404 })

    await supabase
      .from('oracle_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentThreadId)
  }

  // Save the latest user message
  const latestMessage = messages[messages.length - 1]
  const latestText = getPlainText(latestMessage)
  if (latestMessage?.role === 'user' && latestText) {
    await supabase.from('oracle_messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: latestText,
    })
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    full_name: profile.full_name,
    role: profile.role,
    email: profile.email,
  })

  // Convert messages to model format — handle both flat and parts-based
  // We need to normalize our flat messages to have a parts array for convertToModelMessages
  const normalizedMessages = messages.map((m: any) => {
    if (m.parts) return m // Already v6 format
    return {
      ...m,
      role: m.role,
      parts: [{ type: 'text', text: getPlainText(m) }],
    }
  })

  let modelMessages
  try {
    modelMessages = await convertToModelMessages(normalizedMessages)
  } catch {
    // Fallback: just use role+content directly
    modelMessages = messages.map((m: any) => ({
      role: m.role,
      content: getPlainText(m),
    }))
  }

  // Stream response
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: modelMessages,
    tools: getToolsForRole(profile.role),
    stopWhen: stepCountIs(5),
    onFinish: async (info) => {
      if (currentThreadId && info.text) {
        await supabase.from('oracle_messages').insert({
          thread_id: currentThreadId,
          role: 'assistant',
          content: info.text,
        })
      }
    },
  })

  return createTextStreamResponse({
    textStream: result.textStream,
    headers: {
      'x-thread-id': currentThreadId || '',
    },
  })
}
