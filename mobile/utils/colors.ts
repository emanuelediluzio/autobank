// mobile/utils/colors.ts
export const categoryColors: Record<string, string> = {
  alimentari: '#51cf66',
  trasporti: '#339af0',
  abbigliamento: '#cc5de8',
  casa: '#ff922b',
  salute: '#ff6b6b',
  svago: '#f06595',
  tecnologia: '#4dabf7',
  bancomat: '#868e96',
  trasferimento: '#38d9a9',
  stipendio: '#69db7c',
  investimenti: '#ffd43b',
  istruzione: '#748ffc',
  viaggi: '#20c997',
  animali: '#e599f7',
  regali: '#ffa8a8',
  altro: '#495057',
};

export function getCategoryColor(categoryId: string): string {
  return categoryColors[categoryId] || categoryColors.altro;
}
