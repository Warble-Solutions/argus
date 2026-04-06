import { streamText, createUIMessageStreamResponse, stepCountIs, convertToModelMessages } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { getToolsForRole } from '@/lib/ai/tools'

export async function POST(req: Request) {
  const { messages } = await req.json()

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

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    full_name: profile.full_name,
    role: profile.role,
    email: profile.email,
  })

  // Get role-appropriate tools
  const tools = getToolsForRole(profile.role)

  // Convert UI messages to model messages (async in v6)
  const modelMessages = await convertToModelMessages(messages)

  // Stream response from Gemini
  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  })

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  })
}
