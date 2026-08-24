import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Define structured response schema for proposal generation
const proposalResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    scope_markdown: {
      type: Type.STRING,
      description: "A professional project proposal written in Markdown including Executive Summary and Milestones.",
    },
    deliverables: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of key tangible deliverables for this project.",
    },
    suggested_budget: {
      type: Type.NUMBER,
      description: "Estimated target budget derived from notes if not explicitly specified.",
    },
  },
  required: ["scope_markdown", "deliverables"],
};

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 1. Authenticate user session with Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    // 2. Parse request payload
    const { projectId, projectTitle, rawNotes } = await req.json();

    if (!projectId || !rawNotes) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Call Gemini Model to generate structured proposal
    const prompt = `You are an expert freelance consultant. Based on the following rough project notes, produce a formal project proposal and explicit deliverables.

Project Title: ${projectTitle}
Freelancer Notes: ${rawNotes}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: proposalResponseSchema,
        temperature: 0.3,
      },
    });

    const proposalData = JSON.parse(response.text!);

    // 4. Save generated proposal into Supabase Database
    const { data: insertedProposal, error: dbError } = await supabase
      .from('proposals')
      .insert({
        project_id: projectId,
        user_id: user.id,
        scope_markdown: proposalData.scope_markdown,
        deliverables: proposalData.deliverables,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    // 5. Automatically bump project status to 'proposal_sent'
    await supabase
      .from('projects')
      .update({ status: 'proposal_sent' })
      .eq('id', projectId);

    return NextResponse.json({ success: true, proposal: insertedProposal });

  } catch (error: any) {
    console.error('Proposal Generation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate proposal' },
      { status: 500 }
    );
  }
}