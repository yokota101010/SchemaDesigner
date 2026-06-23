export interface ValueObjectPropertyPreset {
  name: string;
  type: string;
  description: string;
}

export interface ValueObjectPreset {
  name: string;
  description?: string;
  properties: ValueObjectPropertyPreset[];
}
