import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { UserColumn, MarketplaceField, AIMappingSuggestion } from '@/lib/types';

const client = new Anthropic();

const MappingSchema = z.object({
  mappings: z.array(
    z.object({
      user_column: z.string(),
      marketplace_field: z.string().nullable(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export async function suggestMappings(
  userColumns: UserColumn[],
  marketplaceFields: MarketplaceField[],
  marketplaceName: string
): Promise<AIMappingSuggestion[]> {
  const requiredFields = marketplaceFields
    .filter((f) => f.is_required)
    .map((f) => f.field_name);
  const optionalFields = marketplaceFields
    .filter((f) => !f.is_required)
    .map((f) => f.field_name);

  const userColumnsText = userColumns
    .map(
      (col) =>
        `- "${col.name}": [${col.sample_values.slice(0, 3).map((v) => `"${v}"`).join(', ')}]`
    )
    .join('\n');

  const prompt = `You are a data mapping assistant for an e-commerce catalog tool.

User file columns (with sample values):
${userColumnsText}

Target marketplace: ${marketplaceName}
Required fields: ${requiredFields.join(', ')}
Optional fields: ${optionalFields.join(', ')}

Map each user column to the most appropriate marketplace field.
Rules:
- Each user column should map to at most one marketplace field
- Each marketplace field should be used at most once
- If no good match exists, set marketplace_field to null
- Confidence: 1.0 = perfect match, 0.0 = no match

Return ONLY a JSON object with this exact structure:
{
  "mappings": [
    { "user_column": "<column name>", "marketplace_field": "<field name or null>", "confidence": <0.0-1.0> }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    // Extract JSON from response (handles markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    const parsed = MappingSchema.parse(JSON.parse(jsonMatch[0]));
    return parsed.mappings;
  } catch (err) {
    console.error('AI mapping error:', err);
    // Fallback: return empty mappings
    return userColumns.map((col) => ({
      user_column: col.name,
      marketplace_field: null,
      confidence: 0,
    }));
  }
}
