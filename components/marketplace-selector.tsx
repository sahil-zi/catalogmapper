'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Marketplace } from '@/lib/types';

interface MarketplaceSelectorProps {
  marketplaces: Marketplace[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MarketplaceSelector({
  marketplaces,
  value,
  onChange,
  disabled,
}: MarketplaceSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select a marketplace..." />
      </SelectTrigger>
      <SelectContent>
        {marketplaces.map((mp) => (
          <SelectItem key={mp.id} value={mp.id}>
            {mp.display_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
