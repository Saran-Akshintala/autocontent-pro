import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AIProvider {
  generateContent(prompt: string, systemPrompt?: string): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private logger = new Logger(OpenAIProvider.name);

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw new Error(`OpenAI generation failed: ${error.message}`);
    }
  }
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private logger = new Logger(AnthropicProvider.name);

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      
      throw new Error('Unexpected response format from Anthropic');
    } catch (error) {
      this.logger.error('Anthropic API error:', error);
      throw new Error(`Anthropic generation failed: ${error.message}`);
    }
  }
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private provider: AIProvider;

  constructor() {
    const aiProvider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    
    switch (aiProvider) {
      case 'anthropic':
        this.provider = new AnthropicProvider();
        this.logger.log('🤖 AI Service initialized with Anthropic provider');
        break;
      case 'openai':
      default:
        this.provider = new OpenAIProvider();
        this.logger.log('🤖 AI Service initialized with OpenAI provider');
        break;
    }
  }

  async generateMonthlyContentPlan(params: {
    brandId: string;
    niche: string;
    persona: string;
    tone: string;
    ctaGoals: string[];
    platforms: string[];
    startDate: Date;
  }): Promise<string> {
    const systemPrompt = `You are an expert social media content strategist. Generate a comprehensive 30-day content plan that follows this EXACT JSON schema:

{
  "days": [
    {
      "dayIndex": number (1-30),
      "platforms": {
        "INSTAGRAM": {
          "hook": "string (attention-grabbing first line)",
          "body": "string (main content, 2-3 sentences)",
          "hashtags": ["string"] (5-10 relevant hashtags),
          "visualIdea": "string (specific visual description)"
        },
        "LINKEDIN": {
          "hook": "string (professional opening)",
          "body": "string (professional content, 3-4 sentences)",
          "hashtags": ["string"] (3-5 professional hashtags),
          "visualIdea": "string (professional visual description)"
        },
        "FACEBOOK": {
          "hook": "string (engaging opening)",
          "body": "string (conversational content, 2-3 sentences)",
          "hashtags": ["string"] (3-7 hashtags),
          "visualIdea": "string (visual description)"
        },
        "TWITTER": {
          "hook": "string (concise opening)",
          "body": "string (tweet content, under 280 chars total)",
          "hashtags": ["string"] (2-4 hashtags),
          "visualIdea": "string (visual description)"
        }
      }
    }
  ]
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no markdown formatting or explanations
- Include ALL requested platforms in each day
- Ensure content variety across the 30 days
- Match the specified tone and persona
- Include relevant CTAs based on goals
- Make hashtags specific to the niche
- Visual ideas should be specific and actionable`;

    const userPrompt = `Generate a 30-day content plan for:

Brand Niche: ${params.niche}
Target Persona: ${params.persona}
Content Tone: ${params.tone}
CTA Goals: ${params.ctaGoals.join(', ')}
Platforms: ${params.platforms.join(', ')}
Start Date: ${params.startDate.toISOString().split('T')[0]}

Create engaging, diverse content that builds audience engagement and drives the specified CTA goals. Ensure each day has unique content across all platforms while maintaining brand consistency.`;

    return this.provider.generateContent(userPrompt, systemPrompt);
  }

  async generateContentVariants(params: {
    originalContent: {
      hook: string;
      body: string;
      hashtags: string[];
    };
    platform: string;
    variantCount: number;
    tone: string;
    niche: string;
  }): Promise<string> {
    const systemPrompt = `You are a social media content expert. Generate ${params.variantCount} alternative versions of the provided content for ${params.platform}.

Return ONLY valid JSON in this format:
{
  "variants": [
    {
      "hook": "string",
      "body": "string", 
      "hashtags": ["string"],
      "visualIdea": "string"
    }
  ]
}

Requirements:
- Maintain the same core message and value
- Use different wording and structure
- Keep the ${params.tone} tone
- Stay relevant to ${params.niche}
- Each variant should feel fresh and unique`;

    const userPrompt = `Original content:
Hook: ${params.originalContent.hook}
Body: ${params.originalContent.body}
Hashtags: ${params.originalContent.hashtags.join(' ')}

Generate ${params.variantCount} creative variants that maintain the same message but with different approaches, wording, and structure.`;

    return this.provider.generateContent(userPrompt, systemPrompt);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.provider.generateContent('Test connection. Respond with "OK".');
      return true;
    } catch (error) {
      this.logger.error('AI provider connection test failed:', error);
      return false;
    }
  }
}
