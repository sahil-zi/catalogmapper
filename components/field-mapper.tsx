'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, getConfidenceColor } from '@/lib/utils';
import type { UserColumn, MarketplaceField, FieldMapping } from '@/lib/types';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

interface MappingRow {
  userColumn: UserColumn;
  selectedFieldId: string | null;
  selectedFieldName: string | null;
  aiSuggested: boolean;
  aiConfidence: number | null;
  isManualOverride: boolean;
}

interface FieldMapperProps {
  userColumns: UserColumn[];
  marketplaceFields: MarketplaceField[];
  existingMappings: FieldMapping[];
  onSave: (mappings: MappingRow[]) => Promise<void>;
  saving?: boolean;
}

const NONE_VALUE = '__none__';

export function FieldMapper({
  userColumns,
  marketplaceFields,
  existingMappings,
  onSave,
  saving,
}: FieldMapperProps) {
  const [mappings, setMappings] = useState<MappingRow[]>(() => {
    const byColumn = new Map(existingMappings.map((m) => [m.user_column, m]));
    return userColumns.map((col) => {
      const existing = byColumn.get(col.name);
      return {
        userColumn: col,
        selectedFieldId: existing?.marketplace_field_id ?? null,
        selectedFieldName: existing?.marketplace_field_name ?? null,
        aiSuggested: existing?.ai_suggested ?? false,
        aiConfidence: existing?.ai_confidence ?? null,
        isManualOverride: existing?.is_manual_override ?? false,
      };
    });
  });

  const requiredFields = marketplaceFields.filter((f) => f.is_required);
  const mappedFieldIds = new Set(mappings.map((m) => m.selectedFieldId).filter(Boolean));

  const unmappedRequired = requiredFields.filter((f) => !mappedFieldIds.has(f.id));

  function updateMapping(colName: string, fieldId: string | null) {
    const field = fieldId ? marketplaceFields.find((f) => f.id === fieldId) : null;
    setMappings((prev) =>
      prev.map((m) =>
        m.userColumn.name === colName
          ? {
              ...m,
              selectedFieldId: fieldId,
              selectedFieldName: field?.field_name ?? null,
              isManualOverride: true,
              aiSuggested: false,
            }
          : m
      )
    );
  }

  return (
    <div className="space-y-6">
      {unmappedRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">Required fields not mapped:</p>
            <p className="text-amber-700 mt-0.5">
              {unmappedRequired.map((f) => f.field_name).join(', ')}
            </p>
            <p className="text-amber-600 text-xs mt-1">
              These will be exported as empty columns.
            </p>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b">
            <tr>
              <th className="text-left py-3 px-4 font-medium w-1/3">Your Column</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Sample Values</th>
              <th className="text-left py-3 px-4 font-medium w-1/3">Marketplace Field</th>
              <th className="text-left py-3 px-4 font-medium w-20">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.map((row) => {
              const isMapped = !!row.selectedFieldId;
              const mappedField = marketplaceFields.find((f) => f.id === row.selectedFieldId);
              const isRequired = mappedField?.is_required;

              return (
                <tr key={row.userColumn.name} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{row.userColumn.name}</span>
                      {isRequired && (
                        <span className="text-xs text-red-500 font-medium">*</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    <span className="truncate block max-w-[200px]">
                      {row.userColumn.sample_values.slice(0, 2).join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Select
                      value={row.selectedFieldId ?? NONE_VALUE}
                      onValueChange={(val) =>
                        updateMapping(row.userColumn.name, val === NONE_VALUE ? null : val)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="— not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>— not mapped —</SelectItem>
                        {marketplaceFields.map((field) => (
                          <SelectItem
                            key={field.id}
                            value={field.id}
                            disabled={
                              mappedFieldIds.has(field.id) && field.id !== row.selectedFieldId
                            }
                          >
                            {field.field_name}
                            {field.is_required ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-4">
                    {isMapped && row.aiSuggested && row.aiConfidence !== null ? (
                      <div className="flex items-center gap-1">
                        <Sparkles className={cn('h-3 w-3', getConfidenceColor(row.aiConfidence))} />
                        <span className={cn('text-xs font-medium', getConfidenceColor(row.aiConfidence))}>
                          {Math.round(row.aiConfidence * 100)}%
                        </span>
                      </div>
                    ) : isMapped ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 inline mr-1" />
          AI-suggested mappings are pre-filled. Change any dropdown to override.
          <span className="ml-2 text-red-500">* required field</span>
        </p>
        <Button onClick={() => onSave(mappings)} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Generate'}
        </Button>
      </div>
    </div>
  );
}

export type { MappingRow };
