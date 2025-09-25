# AI Content Generation System

AutoContent Pro now includes a comprehensive AI-powered content generation system that can create 30-day content plans and generate content variants.

## Features

### 🤖 AI Provider Support
- **OpenAI Integration**: GPT-4 and other OpenAI models
- **Anthropic Integration**: Claude-3-Sonnet and other Anthropic models
- **Provider-Agnostic**: Switch between providers via environment variables

### 📅 30-Day Content Planning
- Generate complete monthly content calendars
- Support for multiple platforms: Instagram, LinkedIn, Facebook, Twitter
- Each day includes: hook, body, hashtags, and visual ideas
- Customizable tone, persona, and CTA goals

### 🔄 Content Variants
- Generate 1-3 alternative versions of existing posts
- Maintain core message while varying approach and wording
- Platform-specific optimization

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# AI Provider Configuration
AI_PROVIDER=openai  # or 'anthropic'

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4  # optional, defaults to gpt-4

# Anthropic Configuration (if using Anthropic)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-sonnet-20240229  # optional

# Queue Configuration (optional)
ENABLE_REDIS=true  # Set to false to disable queue processing
```

### 2. Install Dependencies

The required dependencies should already be installed:
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic API client
- `zod` - Schema validation

## API Endpoints

### Generate 30-Day Content Plan

```http
POST /api/content/generate
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-id>
Content-Type: application/json

{
  "brandId": "uuid-of-brand",
  "niche": "fitness and wellness",
  "persona": "health-conscious millennials",
  "tone": "inspirational",
  "ctaGoals": ["sign up for newsletter", "book consultation"],
  "platforms": ["INSTAGRAM", "LINKEDIN"],
  "startDate": "2024-01-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monthly content generation started",
  "jobId": "job-uuid",
  "estimatedCompletion": "2-5 minutes"
}
```

### Generate Content Variants

```http
POST /api/content/variants/:postId
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-id>
Content-Type: application/json

{
  "variantCount": 2,
  "tone": "professional"
}
```

**Response:**
```json
{
  "success": true,
  "originalPost": {
    "id": "post-uuid",
    "title": "Original Post Title",
    "content": { ... }
  },
  "variants": [
    {
      "hook": "Alternative hook text",
      "body": "Alternative body content",
      "hashtags": ["#alternative", "#hashtags"],
      "visualIdea": "Alternative visual description"
    }
  ]
}
```

### Test AI Connection

```http
GET /api/content/ai/test-connection
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-id>
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "message": "AI service is connected and working",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Check Generation Status

```http
GET /api/content/generation-status/:jobId
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-id>
```

## Content Schema

### Generated Content Structure

Each day in the 30-day plan follows this structure:

```json
{
  "dayIndex": 1,
  "platforms": {
    "INSTAGRAM": {
      "hook": "Attention-grabbing first line",
      "body": "Main content (2-3 sentences)",
      "hashtags": ["#fitness", "#wellness", "#motivation"],
      "visualIdea": "Specific visual description for Instagram"
    },
    "LINKEDIN": {
      "hook": "Professional opening",
      "body": "Professional content (3-4 sentences)",
      "hashtags": ["#leadership", "#business"],
      "visualIdea": "Professional visual description"
    }
  }
}
```

## Queue Processing

When Redis is enabled (`ENABLE_REDIS=true`), content generation runs asynchronously:

1. Request submitted → Job enqueued
2. ContentWorker processes the job
3. AI generates content plan
4. JSON validated with Zod schemas
5. Posts and schedules created in database
6. Job marked as completed

When Redis is disabled, processing happens synchronously (not recommended for production).

## Error Handling

The system includes comprehensive error handling:

- **AI Provider Errors**: Graceful fallback and detailed error messages
- **Validation Errors**: Zod schema validation with specific field errors
- **Database Errors**: Transaction rollback and partial success handling
- **Queue Errors**: Fallback to direct processing when queue unavailable

## Role-Based Access

Content generation endpoints require appropriate roles:
- `OWNER`: Full access to all features
- `ADMIN`: Full access to all features  
- `STAFF`: Can generate content for assigned brands
- `CLIENT`: Limited access based on brand permissions

## Monitoring

Monitor AI content generation through:
- Application logs for detailed processing information
- Queue statistics (when Redis enabled)
- AI connection test endpoint for health checks
- Database audit logs for content creation tracking

## Best Practices

1. **API Keys**: Store AI provider API keys securely in environment variables
2. **Rate Limits**: Be aware of AI provider rate limits and plan accordingly
3. **Content Review**: Always review AI-generated content before publishing
4. **Brand Guidelines**: Provide specific brand guidelines in the niche and persona fields
5. **Queue Monitoring**: Monitor queue health when using Redis for async processing

## Troubleshooting

### Common Issues

1. **AI Connection Failed**
   - Check API key validity
   - Verify provider selection (AI_PROVIDER)
   - Test with `/api/content/ai/test-connection`

2. **Queue Not Processing**
   - Verify Redis connection
   - Check ENABLE_REDIS setting
   - Monitor queue statistics

3. **Content Generation Errors**
   - Review AI provider quotas
   - Check input validation errors
   - Verify brand access permissions

4. **Database Creation Failures**
   - Check database connectivity
   - Verify tenant and brand IDs
   - Review Prisma schema compatibility
