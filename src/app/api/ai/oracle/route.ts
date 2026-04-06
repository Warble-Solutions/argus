import { streamText, createUIMessageStreamResponse, stepCountIs, convertToModelMessages } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { getToolsForRole } from '@/lib/ai/tools'

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { messages, threadId, id } = await req.json()
  // Fall back to 'id' only if it's not our local caching static string.
  const activeThreadId = threadId || (id === 'oracle-chat' ? null : id)

  // Get the current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return new Response('Profile not found', { status: 404 })
  }

  // Find or create thread
  let currentThreadId = activeThreadId
  if (!currentThreadId) {
    // Generate new thread title based on first message
    const title = messages[0]?.content?.substring(0, 50) || 'New Conversation'
    const { data: newThread } = await supabase
      .from('oracle_threads')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()
      
    if (newThread) {
      currentThreadId = newThread.id
    }
  } else {
    // Validate thread ownership
    const { data: thread } = await supabase
      .from('oracle_threads')
      .select('id')
      .eq('id', currentThreadId)
      .eq('user_id', user.id)
      .single()
      
    if (!thread) {
      return new Response('Thread not found or unauthorized', { status: 404 })
    }
    
    // Update thread timestamp
    await supabase.from('oracle_threads').update({ updated_at: new Date().toISOString() }).eq('id', currentThreadId)
  }

  // Save the incoming new user messages (we only save the very last one, since previous ones are already saved)
  // Or handle saving all incoming messages that lack an ID / are "new"
  const newMessages = messages.filter((m: any) => !m.isSaved)
  
  // Actually, a simpler pattern: Just save the latest user message.
  const latestMessage = messages[messages.length - 1]
  if (latestMessage.role === 'user') {
    await supabase.from('oracle_messages').insert({
      thread_id: currentThreadId,
      role: 'user',
      content: latestMessage.content
    })
  } else if (latestMessage.role === 'tool') {
    // Save tool responses that the user confirmed and passed back
    await supabase.from('oracle_messages').insert({
      thread_id: currentThreadId,
      role: 'tool',
      content: JSON.stringify(latestMessage.content),
    })
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    full_name: profile.full_name,
    role: profile.role,
    email: profile.email,
  })

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(messages)

  // Stream response from Gemini
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: modelMessages,
    tools: getToolsForRole(profile.role),
    stopWhen: stepCountIs(5), // allow up to 5 steps of tool execution
    onFinish: async (info) => {
      // Save AI's response to the database after streaming finishes
      // We need to save the text response, and potentially any tool invocations generated
      if (currentThreadId) {
        
        // Save the assistant's text content if it exists
        if (info.text) {
          await supabase.from('oracle_messages').insert({
            thread_id: currentThreadId,
            role: 'assistant',
            content: info.text,
          })
        }
        
        // Optional: you can save tool_invocations if you want history to show them
        // But Next.js AI SDK auto-hydrates them if we pass them back. 
        // For Oracle MVP, saving the text is heavily prioritized.
      }
    }
  })

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
    headers: {
      'x-thread-id': currentThreadId || ''
    }
  })
}
