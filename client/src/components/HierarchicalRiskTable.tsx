import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileSpreadsheet, 
  FileText, 
  Filter,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Users
} from "lucide-react";
import type { WorkUnit } from "@shared/schema";
import { extractAllRisks, getRiskStatistics, type FlattenedRisk } from "@/lib/hierarchicalUtils";

interface HierarchicalRiskTableProps {
  workUnits: WorkUnit[];
  companyName: string;
  onExportExcel?: () => void;
  onExportWord?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  'Priorité 1 (Forte)': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Priorité 2 (Moyenne)': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Priorité 3 (Modéré)': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Priorité 4 (Faible)': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const PRIORITY_ICONS = {
  'Priorité 1 (Forte)': AlertTriangle,
  'Priorité 2 (Moyenne)': AlertCircle,
  'Priorité 3 (Modéré)': Info,
  'Priorité 4 (Faible)': CheckCircle,
};

export default function HierarchicalRiskTable({ 
  workUnits, 
  companyName,
  onExportExcel,
  onExportWord 
}: HierarchicalRiskTableProps) {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');

  const allRisks = useMemo(() => extractAllRisks(workUnits), [workUnits]);
  const stats = useMemo(() => getRiskStatistics(workUnits), [workUnits]);
  
  const families = useMemo(() => {
    const familySet = new Set(allRisks.map(r => r.family || 'Autre'));
    return Array.from(familySet).sort();
  }, [allRisks]);

  const filteredRisks = useMemo(() => {
    return allRisks.filter(risk => {
      if (filterPriority !== 'all' && risk.priority !== filterPriority) return false;
      if (filterFamily !== 'all' && (risk.family || 'Autre') !== filterFamily) return false;
      if (filterUnit !== 'all' && risk.workUnitName !== filterUnit) return false;
      return true;
    });
  }, [allRisks, filterPriority, filterFamily, filterUnit]);

  const groupedRisks = useMemo(() => {
    const grouped: Record<string, FlattenedRisk[]> = {};
    
    for (const risk of filteredRisks) {
      if (!grouped[risk.workUnitName]) grouped[risk.workUnitName] = [];
      grouped[risk.workUnitName].push(risk);
    }
    
    return grouped;
  }, [filteredRisks]);

  if (allRisks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Tableau DUERP
          </CardTitle>
          <CardDescription>
            Aucun risque validé. Générez et validez des risques depuis l'éditeur hiérarchique.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Utilisez l'éditeur de structure pour ajouter des unités de travail,
            puis générez les risques avec l'IA et validez-les.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Tableau DUERP - {companyName}
              </CardTitle>
              <CardDescription>
                {stats.total} risques validés
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onExportExcel && (
                <Button variant="outline" size="sm" onClick={onExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              )}
              {onExportWord && (
                <Button variant="outline" size="sm" onClick={onExportWord}>
                  <FileText className="h-4 w-4 mr-2" />
                  Word
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Priorité 1</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.byPriority['Priorité 1 (Forte)']}</p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Priorité 2</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{stats.byPriority['Priorité 2 (Moyenne)']}</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Priorité 3</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.byPriority['Priorité 3 (Modéré)']}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Priorité 4</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.byPriority['Priorité 4 (Faible)']}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-unit">
                <SelectValue placeholder="Toutes les unités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les unités</SelectItem>
                {workUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.name}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-priority">
                <SelectValue placeholder="Toutes priorités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                <SelectItem value="Priorité 1 (Forte)">Priorité 1 (Forte)</SelectItem>
                <SelectItem value="Priorité 2 (Moyenne)">Priorité 2 (Moyenne)</SelectItem>
                <SelectItem value="Priorité 3 (Modéré)">Priorité 3 (Modéré)</SelectItem>
                <SelectItem value="Priorité 4 (Faible)">Priorité 4 (Faible)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFamily} onValueChange={setFilterFamily}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-family">
                <SelectValue placeholder="Toutes familles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes familles</SelectItem>
                {families.map(family => (
                  <SelectItem key={family} value={family}>{family}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredRisks.length} risque(s) affiché(s)
            </span>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Unité de travail</TableHead>
                  <TableHead className="w-[120px]">Famille de risque</TableHead>
                  <TableHead className="w-[150px]">Danger</TableHead>
                  <TableHead className="w-[160px]">Situation dangereuse</TableHead>
                  <TableHead className="min-w-[140px]">Risque</TableHead>
                  <TableHead className="w-[80px] text-center">G</TableHead>
                  <TableHead className="w-[80px] text-center">F</TableHead>
                  <TableHead className="w-[80px] text-center">M</TableHead>
                  <TableHead className="w-[120px]">Priorité</TableHead>
                  <TableHead>Mesures de prévention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedRisks).map(([unitName, risks]) => (
                  risks.map((risk) => {
                    const PriorityIcon = PRIORITY_ICONS[risk.priority as keyof typeof PRIORITY_ICONS] || Info;
                    
                    return (
                      <TableRow key={risk.id} className="hover:bg-muted/30">
                        <TableCell className="align-top">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-purple-500" />
                              <span className="font-medium">{unitName}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {risk.family || 'Autre'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {risk.danger}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {risk.type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {risk.riskEvent || '—'}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {risk.gravityValue || risk.gravity}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {risk.frequencyValue || risk.frequency}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {risk.controlValue || risk.control}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${PRIORITY_COLORS[risk.priority || 'Priorité 4 (Faible)']}`}>
                            <PriorityIcon className="h-3 w-3 mr-1" />
                            {(risk.priority || 'P4').split(' ')[0] + ' ' + (risk.priority || '').match(/\d/)?.[0]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px]">
                          {risk.measures}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
