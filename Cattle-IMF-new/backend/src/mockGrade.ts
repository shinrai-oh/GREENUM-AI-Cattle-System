export function calculateMockGrade(imf?: number | null): string {
  if (imf == null) return 'N/A';
  if (imf >= 6.0) return 'Prime+ (A5)';
  if (imf >= 4.5) return 'Prime (A4)';
  if (imf >= 3.0) return 'Choice+ (A3)';
  if (imf >= 2.0) return 'Choice (A2)';
  return 'Standard';
}

