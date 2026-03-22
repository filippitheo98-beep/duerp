import type { WorkUnit, Risk } from '@shared/schema';

export interface FlattenedRisk extends Risk {
  workUnitName: string;
  hierarchyPath: string;
}

export function extractAllRisks(workUnits: WorkUnit[]): FlattenedRisk[] {
  const allRisks: FlattenedRisk[] = [];

  for (const unit of workUnits) {
    for (const risk of (unit.risks || []).filter(r => r.isValidated)) {
      allRisks.push({
        ...risk,
        workUnitName: unit.name,
        hierarchyPath: unit.name,
      });
    }
  }

  return allRisks.sort((a, b) => a.workUnitName.localeCompare(b.workUnitName));
}

export function countTotalRisks(workUnits: WorkUnit[]): number {
  return extractAllRisks(workUnits).length;
}

export function getRisksByFamily(workUnits: WorkUnit[]): Record<string, FlattenedRisk[]> {
  const risks = extractAllRisks(workUnits);
  return risks.reduce((acc, risk) => {
    const family = risk.family || 'Autre';
    if (!acc[family]) acc[family] = [];
    acc[family].push(risk);
    return acc;
  }, {} as Record<string, FlattenedRisk[]>);
}

export function getRisksByPriority(workUnits: WorkUnit[]): Record<string, FlattenedRisk[]> {
  const risks = extractAllRisks(workUnits);
  return risks.reduce((acc, risk) => {
    const priority = risk.priority || 'Priorité 4 (Faible)';
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(risk);
    return acc;
  }, {} as Record<string, FlattenedRisk[]>);
}

export function getRiskStatistics(workUnits: WorkUnit[]) {
  const risks = extractAllRisks(workUnits);
  const byPriority = getRisksByPriority(workUnits);
  const byFamily = getRisksByFamily(workUnits);

  return {
    total: risks.length,
    byPriority: {
      'Priorité 1 (Forte)': byPriority['Priorité 1 (Forte)']?.length || 0,
      'Priorité 2 (Moyenne)': byPriority['Priorité 2 (Moyenne)']?.length || 0,
      'Priorité 3 (Modéré)': byPriority['Priorité 3 (Modéré)']?.length || 0,
      'Priorité 4 (Faible)': byPriority['Priorité 4 (Faible)']?.length || 0,
    },
    byFamily: Object.entries(byFamily).map(([family, risks]) => ({
      family,
      count: risks.length
    })).sort((a, b) => b.count - a.count),
    byUnit: workUnits.map(unit => ({
      unit: unit.name,
      count: extractAllRisks([unit]).length
    }))
  };
}
