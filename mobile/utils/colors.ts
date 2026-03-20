// mobile/utils/colors.ts
// Category colors for charts
export const categoryColors: Record<string, string> = {
  alimentari: '#3fb950',
  trasporti: '#58a6ff',
  abbigliamento: '#d2a8ff',
  casa: '#f0883e',
  salute: '#f85149',
  svago: '#db61a2',
  tecnologia: '#79c0ff',
  bancomat: '#8b949e',
  trasferimento: '#56d364',
  altro: '#484f58',
};

export function getCategoryColor(categoryId: string): string {
  return categoryColors[categoryId] || categoryColors.altro;
}
