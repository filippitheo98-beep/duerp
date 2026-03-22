import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RiskLibrarySelector from "@/components/RiskLibrarySelector";
import {
  Users,
  Sparkles,
  Check,
  Loader2,
  Eye,
  Library,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Filter,
  X,
  Plus,
  PenLine,
  FileSpreadsheet
} from "lucide-react";
import type { WorkUnit, Risk, RiskFamily } from "@shared/schema";

interface HierarchicalEditorStepProps {
  companyId: number;
  companyActivity: string;
  companyDescription?: string;
  workUnits: WorkUnit[];
  onUpdateWorkUnits: (units: WorkUnit[]) => void;
  onSave: () => void;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  documentId?: string | null;
  readOnly?: boolean;
}

const RISK_ROW_COLORS: Record<string, string> = {
  'Priorité 1 (Forte)': 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500',
  'Priorité 2 (Moyenne)': 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-l-orange-500',
  'Priorité 3 (Modéré)': 'bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-500',
  'Priorité 4 (Faible)': 'bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500',
};

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  'Priorité 1 (Forte)': 'bg-red-500 text-white',
  'Priorité 2 (Moyenne)': 'bg-orange-500 text-white',
  'Priorité 3 (Modéré)': 'bg-yellow-500 text-black',
  'Priorité 4 (Faible)': 'bg-green-500 text-white',
};

const PRIORITY_ICONS: Record<string, any> = {
  'Priorité 1 (Forte)': AlertTriangle,
  'Priorité 2 (Moyenne)': AlertCircle,
  'Priorité 3 (Modéré)': Info,
  'Priorité 4 (Faible)': CheckCircle,
};

interface TableRisk {
  risk: Risk;
  unitName: string;
  unitId: string;
}

export default function HierarchicalEditorStep({
  companyId,
  companyActivity,
  companyDescription,
  workUnits,
  onUpdateWorkUnits,
  onSave,
  onExportExcel,
  isExportingExcel,
  documentId,
  readOnly = false
}: HierarchicalEditorStepProps) {
  const { toast } = useToast();

  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [selectedAddUnit, setSelectedAddUnit] = useState<string>('');

  const [pendingRisks, setPendingRisks] = useState<{
    risks: Risk[];
    unitId: string;
    elementName: string;
  } | null>(null);
  const [selectedPendingRisks, setSelectedPendingRisks] = useState<Set<string>>(new Set());
  const [reviewingRisk, setReviewingRisk] = useState<TableRisk | null>(null);

  const [librarySelector, setLibrarySelector] = useState<{
    isOpen: boolean;
    unitId: string;
    elementName: string;
  } | null>(null);

  const [showCreateRisk, setShowCreateRisk] = useState(false);

  const updateUnit = (unitId: string, updates: Partial<WorkUnit>) => {
    onUpdateWorkUnits(workUnits.map(u => u.id === unitId ? { ...u, ...updates } : u));
  };

  const allRisks = useMemo((): TableRisk[] => {
    const risks: TableRisk[] = [];
    for (const unit of workUnits) {
      for (const risk of (unit.risks || [])) {
        risks.push({ risk, unitName: unit.name, unitId: unit.id });
      }
    }
    return risks;
  }, [workUnits]);

  const filteredRisks = useMemo(() => {
    return allRisks.filter(r => {
      if (filterUnit !== 'all' && r.unitId !== filterUnit) return false;
      if (filterPriority !== 'all' && r.risk.priority !== filterPriority) return false;
      return true;
    });
  }, [allRisks, filterUnit, filterPriority]);

  const generateRisks = async (unitId: string) => {
    const unit = workUnits.find(u => u.id === unitId);
    if (!unit) return;

    const workstationNames = unit.workstations?.map(w => w.name) || [];
    const siteNames = (unit.unitSites || []).map(s => s.name);

    setGeneratingFor(unitId);
    try {
      const response = await apiRequest('/api/generate-hierarchical-risks', {
        method: 'POST',
        body: JSON.stringify({
          level: 'Unité',
          elementName: unit.name,
          elementDescription: unit.description || '',
          companyActivity,
          companyDescription: companyDescription || '',
          companyId,
          workstationNames,
          siteNames,
          count: 8,
        }),
      });

      if (response.risks?.length > 0) {
        setPendingRisks({ risks: response.risks, unitId, elementName: unit.name });
        setSelectedPendingRisks(new Set(response.risks.map((r: Risk) => r.id)));
      } else {
        toast({ title: "Aucun risque identifié", description: "L'IA n'a pas généré de risques pour cette unité." });
      }
    } catch (error: any) {
      console.error('Erreur génération IA:', error);
      toast({
        title: "Erreur de génération",
        description: error?.message || "Impossible de générer les risques. Vérifiez votre connexion.",
        variant: "destructive"
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const generateMoreRisks = async () => {
    if (!pendingRisks) return;
    const unit = workUnits.find(u => u.id === pendingRisks.unitId);
    if (!unit) return;
    const workstationNames = unit.workstations?.map(w => w.name) || [];
    const siteNames = (unit.unitSites || []).map(s => s.name);

    setGeneratingMore(true);
    try {
      const response = await apiRequest('/api/generate-hierarchical-risks', {
        method: 'POST',
        body: JSON.stringify({
          level: 'Unité',
          elementName: unit.name,
          elementDescription: unit.description || '',
          companyActivity,
          companyDescription: companyDescription || '',
          companyId,
          workstationNames,
          siteNames,
          count: 8,
          existingRisks: [...(unit.risks || []), ...(pendingRisks.risks || [])].map(r => ({
            family: (r as any).family,
            situation: (r as any).situation,
            type: (r as any).type,
            danger: (r as any).danger,
          })),
        }),
      });

      const newRisks: Risk[] = Array.isArray(response?.risks) ? response.risks : [];
      if (newRisks.length > 0) {
        const merged = [...pendingRisks.risks, ...newRisks];
        setPendingRisks({ ...pendingRisks, risks: merged });
        setSelectedPendingRisks(prev => {
          const next = new Set(prev);
          newRisks.forEach(r => next.add(r.id));
          return next;
        });
      } else {
        toast({ title: "Aucun risque supplémentaire", description: "L'IA n'a pas généré de nouveaux risques." });
      }
    } catch (error: any) {
      console.error('Erreur génération IA (more):', error);
      toast({
        title: "Erreur de génération",
        description: error?.message || "Impossible de générer les risques. Vérifiez votre connexion.",
        variant: "destructive"
      });
    } finally {
      setGeneratingMore(false);
    }
  };

  const validateSelectedRisks = () => {
    if (!pendingRisks) return;
    const { unitId } = pendingRisks;
    const validatedRisks = pendingRisks.risks
      .filter(r => selectedPendingRisks.has(r.id))
      .map(r => ({ ...r, isValidated: true }));

    const unit = workUnits.find(u => u.id === unitId);
    const existingRisks = unit?.risks || [];
    updateUnit(unitId, { risks: [...existingRisks, ...validatedRisks] });

    toast({ title: `${validatedRisks.length} risque(s) ajouté(s)` });
    setPendingRisks(null);
    setSelectedPendingRisks(new Set());
  };

  const removeRisk = (tableRisk: TableRisk) => {
    const { risk, unitId } = tableRisk;
    const unit = workUnits.find(u => u.id === unitId);
    if (unit) updateUnit(unitId, { risks: (unit.risks || []).filter(r => r.id !== risk.id) });
  };

  const openLibrary = (unitId: string) => {
    const unit = workUnits.find(u => u.id === unitId);
    if (!unit) return;
    setLibrarySelector({ isOpen: true, unitId, elementName: unit.name });
  };

  const handleLibraryRisksSelected = (risks: Risk[]) => {
    if (!librarySelector) return;
    const { unitId } = librarySelector;
    const unit = workUnits.find(u => u.id === unitId);
    const existingRisks = unit?.risks || [];
    const existingDangers = new Set(existingRisks.map(r => r.danger.toLowerCase().trim()));
    const newRisks = risks.filter(r => !existingDangers.has(r.danger.toLowerCase().trim()));
    updateUnit(unitId, { risks: [...existingRisks, ...newRisks] });

    const duplicates = risks.length - newRisks.length;
    toast({
      title: duplicates > 0
        ? `${newRisks.length} ajouté(s), ${duplicates} doublon(s) ignoré(s)`
        : `${newRisks.length} risque(s) ajouté(s)`
    });
    setLibrarySelector(null);
  };

  const validatedCount = allRisks.filter(r => r.risk.isValidated).length;
  const totalCount = allRisks.length;

  const getRiskCountForUnit = (unitId: string) => {
    return allRisks.filter(r => r.unitId === unitId).length;
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Tableau des Risques Professionnels</h2>
            <p className="text-blue-100 text-sm mt-1">Ajoutez des risques pour vos unités de travail</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onExportExcel && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 hover:bg-white text-blue-800 h-9"
                onClick={onExportExcel}
                disabled={isExportingExcel || (totalCount === 0 && !documentId)}
              >
                {isExportingExcel ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                )}
                {isExportingExcel ? 'Export...' : 'Exporter Excel'}
              </Button>
            )}
            <Badge variant="secondary" className="bg-white/20 text-white">
              {totalCount} risque(s)
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white">
              <CheckCircle className="h-3 w-3 mr-1" />{validatedCount} validé(s)
            </Badge>
          </div>
        </div>
      </div>

      {workUnits.length > 0 && !readOnly && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300 whitespace-nowrap">Ajouter des risques à :</span>
              <Select value={selectedAddUnit} onValueChange={setSelectedAddUnit}>
                <SelectTrigger className="w-[220px] h-9 bg-white dark:bg-background">
                  <SelectValue placeholder="Choisir une unité..." />
                </SelectTrigger>
                <SelectContent>
                  {workUnits.map(u => {
                    const count = getRiskCountForUnit(u.id);
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-purple-600" />
                          {u.name}
                          {count > 0 && <Badge variant="secondary" className="text-[10px] ml-1 py-0 px-1.5">{count}</Badge>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => selectedAddUnit && generateRisks(selectedAddUnit)}
                disabled={!selectedAddUnit || generatingFor !== null}
              >
                {generatingFor ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generatingFor ? 'Génération...' : 'Générer IA'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 bg-white dark:bg-background"
                onClick={() => selectedAddUnit && openLibrary(selectedAddUnit)}
                disabled={!selectedAddUnit || generatingFor !== null}
              >
                <Library className="h-4 w-4" />
                Bibliothèque
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 bg-white dark:bg-background"
                onClick={() => selectedAddUnit && setShowCreateRisk(true)}
                disabled={!selectedAddUnit || generatingFor !== null}
              >
                <PenLine className="h-4 w-4" />
                Créer un risque
              </Button>
              {selectedAddUnit && (() => {
                const unit = workUnits.find(u => u.id === selectedAddUnit);
                if (!unit) return null;
                const wsCount = unit.workstations?.length || 0;
                const siteCount = (unit.unitSites || []).length;
                return (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {wsCount} poste(s), {siteCount} site(s)
                  </span>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Toutes les unités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les unités</SelectItem>
                {workUnits.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[170px] h-8 text-xs">
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
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredRisks.length} risque(s)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRisks.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                {workUnits.length === 0
                  ? "Ajoutez des unités de travail à l'étape précédente pour commencer."
                  : "Aucun risque. Sélectionnez une unité ci-dessus puis cliquez sur « Générer IA » ou « Bibliothèque »."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px] text-center text-xs">Statut</TableHead>
                    <TableHead className="w-[160px] text-xs">Unité de travail</TableHead>
                    <TableHead className="w-[100px] text-xs">Famille</TableHead>
                    <TableHead className="w-[140px] text-xs">Situation</TableHead>
                    <TableHead className="text-xs">Danger identifié</TableHead>
                    <TableHead className="w-[50px] text-center text-xs">G</TableHead>
                    <TableHead className="w-[50px] text-center text-xs">F</TableHead>
                    <TableHead className="w-[50px] text-center text-xs">M</TableHead>
                    <TableHead className="w-[110px] text-xs">Priorité</TableHead>
                    <TableHead className="text-xs max-w-[200px]">Mesures existantes</TableHead>
                    <TableHead className="w-[80px] text-center text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map((tr) => {
                    const PIcon = PRIORITY_ICONS[tr.risk.priority] || Info;
                    return (
                      <TableRow key={tr.risk.id} className={`${RISK_ROW_COLORS[tr.risk.priority] || ''} hover:bg-muted/40`}>
                        <TableCell className="text-center">
                          {tr.risk.isValidated ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <Badge variant="outline" className="text-[9px]">En attente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-purple-500 flex-shrink-0" />
                            <span className="font-medium truncate">{tr.unitName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{tr.risk.family || 'Autre'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{tr.risk.type}</TableCell>
                        <TableCell className="text-xs">{tr.risk.danger}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{tr.risk.gravityValue}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{tr.risk.frequencyValue}</TableCell>
                        <TableCell className="text-center text-xs font-mono">{tr.risk.controlValue}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${PRIORITY_BADGE_COLORS[tr.risk.priority] || ''}`}>
                            <PIcon className="h-3 w-3 mr-1" />
                            P{tr.risk.priority?.match(/\d/)?.[0] || '?'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[300px]">
                          {(tr.risk.existingMeasures?.length || 0) > 0 ? (
                            <ul className="list-none space-y-0.5">
                              {tr.risk.existingMeasures.map((m: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-green-700 dark:text-green-400 leading-tight">{m}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground italic">Aucune</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-center">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReviewingRisk(tr)} title="Voir détails">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {!readOnly && (
                              <>
                                {!tr.risk.isValidated && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                                    const unit = workUnits.find(u => u.id === tr.unitId);
                                    if (unit) updateUnit(tr.unitId, { risks: (unit.risks || []).map(r => r.id === tr.risk.id ? { ...r, isValidated: true } : r) });
                                  }} title="Valider">
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeRisk(tr)} title="Supprimer">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {pendingRisks && (
        <Dialog open={true} onOpenChange={() => { setPendingRisks(null); setSelectedPendingRisks(new Set()); }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {pendingRisks.risks.length} risques générés pour « {pendingRisks.elementName} »
              </DialogTitle>
              <DialogDescription>
                Sélectionnez les risques que vous souhaitez conserver puis validez.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={selectedPendingRisks.size === pendingRisks.risks.length}
                  onCheckedChange={(checked) => {
                    setSelectedPendingRisks(checked ? new Set(pendingRisks.risks.map(r => r.id)) : new Set());
                  }}
                />
                <span className="text-sm font-medium">Tout sélectionner ({selectedPendingRisks.size}/{pendingRisks.risks.length})</span>
              </div>
              {pendingRisks.risks.map(risk => (
                <div key={risk.id} className={`flex items-start gap-3 p-3 rounded-lg border ${selectedPendingRisks.has(risk.id) ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}`}>
                  <Checkbox
                    checked={selectedPendingRisks.has(risk.id)}
                    onCheckedChange={(checked) => {
                      setSelectedPendingRisks(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(risk.id); else next.delete(risk.id);
                        return next;
                      });
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{risk.family}</Badge>
                      <span className="text-sm font-medium">{risk.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{risk.danger}</p>
                    <p className="text-xs text-muted-foreground mt-1">Mesures recommandées: {risk.measures}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-[9px] ${PRIORITY_BADGE_COLORS[risk.priority] || ''}`}>
                        {risk.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        G={risk.gravityValue} x F={risk.frequencyValue} x M={risk.controlValue} = {risk.riskScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPendingRisks(null); setSelectedPendingRisks(new Set()); }}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button variant="secondary" onClick={generateMoreRisks} disabled={generatingMore}>
                {generatingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Générer +3
              </Button>
              <Button onClick={validateSelectedRisks} disabled={selectedPendingRisks.size === 0}>
                <Check className="h-4 w-4 mr-2" />
                Valider {selectedPendingRisks.size} risque(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {reviewingRisk && (
        <RiskEditDialog
          tableRisk={reviewingRisk}
          readOnly={readOnly}
          onClose={() => setReviewingRisk(null)}
          onSave={(updated) => {
            const unit = workUnits.find(u => u.id === reviewingRisk.unitId);
            if (unit) {
              updateUnit(reviewingRisk.unitId, {
                risks: (unit.risks || []).map(r => r.id === updated.id ? { ...updated, userModified: true } : r)
              });
            }
            setReviewingRisk(null);
          }}
        />
      )}

      {librarySelector?.isOpen && (
        <RiskLibrarySelector
          isOpen={true}
          onClose={() => setLibrarySelector(null)}
          onSelectRisks={handleLibraryRisksSelected}
          hierarchyLevel="Unité"
          elementName={librarySelector.elementName}
        />
      )}

      {showCreateRisk && selectedAddUnit && (
        <CreateCustomRiskDialog
          unitName={workUnits.find(u => u.id === selectedAddUnit)?.name || ''}
          onClose={() => setShowCreateRisk(false)}
          onRiskCreated={(risk) => {
            const unit = workUnits.find(u => u.id === selectedAddUnit);
            const existingRisks = unit?.risks || [];
            updateUnit(selectedAddUnit, { risks: [...existingRisks, risk] });
            toast({ title: "Risque créé et ajouté" });
            setShowCreateRisk(false);
          }}
        />
      )}
    </div>
  );
}

const GRAVITY_OPTIONS = [
  { label: 'Faible', value: 1 },
  { label: 'Moyenne', value: 4 },
  { label: 'Grave', value: 20 },
  { label: 'Très Grave', value: 100 },
] as const;

const FREQUENCY_OPTIONS = [
  { label: 'Annuelle', value: 1 },
  { label: 'Mensuelle', value: 4 },
  { label: 'Hebdomadaire', value: 10 },
  { label: 'Journalière', value: 50 },
] as const;

const CONTROL_OPTIONS = [
  { label: 'Très élevée', value: 0.05 },
  { label: 'Élevée', value: 0.2 },
  { label: 'Moyenne', value: 0.5 },
  { label: 'Absente', value: 1 },
] as const;

const SUGGESTED_MEASURES: Record<string, string[]> = {
  'Mécanique': [
    'Port des EPI adaptés (gants, lunettes, casque)',
    'Vérification périodique des équipements de travail',
    'Mise en place de protecteurs sur les machines',
    'Formation à l\'utilisation des machines',
    'Consignation des équipements avant intervention',
    'Balisage des zones dangereuses',
    'Maintenance préventive des outils et machines',
    'Affichage des consignes de sécurité',
  ],
  'Physique': [
    'Mise à disposition de protections auditives',
    'Isolation phonique des équipements bruyants',
    'Éclairage adapté aux postes de travail',
    'Mesures de protection contre les vibrations',
    'Contrôle régulier des niveaux de bruit',
    'Aménagement des postes pour réduire l\'exposition',
    'Rotation des postes exposés',
    'Suivi médical renforcé des travailleurs exposés',
  ],
  'Chimique': [
    'Stockage des produits chimiques dans des armoires ventilées',
    'Port des EPI chimiques (gants, masque, lunettes)',
    'Fiches de données de sécurité (FDS) accessibles',
    'Ventilation et aspiration à la source',
    'Substitution des produits dangereux',
    'Étiquetage conforme des produits',
    'Formation au risque chimique',
    'Douche de sécurité et rince-œil',
  ],
  'Biologique': [
    'Mise à disposition de gel hydroalcoolique',
    'Port de gants et masques adaptés',
    'Protocole de nettoyage et désinfection',
    'Vaccination du personnel exposé',
    'Gestion des déchets biologiques (DASRI)',
    'Procédure en cas d\'accident d\'exposition au sang',
  ],
  'Radiologique': [
    'Contrôle dosimétrique individuel',
    'Balisage des zones contrôlées',
    'Formation à la radioprotection',
    'Suivi médical spécifique',
    'Écrans de protection plombés',
  ],
  'Incendie-Explosion': [
    'Extincteurs vérifiés et accessibles',
    'Plan d\'évacuation affiché et exercices réguliers',
    'Détecteurs de fumée et alarme incendie',
    'Stockage séparé des produits inflammables',
    'Formation des équipiers de première intervention',
    'Issues de secours dégagées et signalées',
    'Permis de feu pour les travaux par points chauds',
    'Installation électrique conforme et vérifiée',
  ],
  'Électrique': [
    'Habilitation électrique du personnel',
    'Vérification périodique des installations électriques',
    'Consignation avant intervention',
    'Utilisation d\'outillage isolé',
    'Mise à la terre des équipements',
    'Protection différentielle des circuits',
    'Signalisation des armoires électriques',
  ],
  'Ergonomique': [
    'Formation aux gestes et postures',
    'Mise à disposition d\'aides à la manutention',
    'Aménagement ergonomique des postes de travail',
    'Alternance des tâches et pauses régulières',
    'Mobilier réglable (bureau, siège, écran)',
    'Limitation du port de charges lourdes',
    'Évaluation ergonomique des postes',
  ],
  'Psychosocial': [
    'Mise en place d\'un dispositif d\'écoute',
    'Organisation du travail équilibrée',
    'Prévention du harcèlement et des violences',
    'Formation des managers à la prévention des RPS',
    'Entretiens individuels réguliers',
    'Aménagement des horaires de travail',
    'Plan de prévention du stress au travail',
  ],
  'Routier': [
    'Formation à la conduite préventive',
    'Entretien régulier des véhicules',
    'Protocole de déplacement professionnel',
    'Limitation des déplacements (visioconférence)',
    'Interdiction du téléphone au volant',
    'Kit de sécurité dans les véhicules',
  ],
  'Environnemental': [
    'Tri et gestion des déchets',
    'Bacs de rétention pour les produits polluants',
    'Plan de prévention des pollutions',
    'Surveillance des rejets atmosphériques',
    'Formation au risque environnemental',
  ],
  'Organisationnel': [
    'Mise à jour du document unique',
    'Plan de prévention pour les entreprises extérieures',
    'Accueil sécurité des nouveaux arrivants',
    'Procédures de travail formalisées',
    'Réunions sécurité périodiques (quart d\'heure sécurité)',
    'Registre des accidents et presqu\'accidents',
    'Désignation d\'un référent sécurité',
  ],
  'Chutes': [
    'Revêtements de sol antidérapants',
    'Signalisation des sols mouillés ou glissants',
    'Éclairage suffisant des zones de circulation',
    'Nez de marche antidérapants dans les escaliers',
    'Rampes et garde-corps conformes',
    'Rangement et dégagement des passages',
    'Chaussures de sécurité antidérapantes',
    'Protection collective contre les chutes de hauteur (garde-corps, filets)',
    'Harnais et lignes de vie pour le travail en hauteur',
    'Formation au travail en hauteur',
    'Vérification régulière des escabeaux et échelles',
  ],
};

function calcPriority(score: number): Risk['priority'] {
  if (score >= 200) return 'Priorité 1 (Forte)';
  if (score >= 50) return 'Priorité 2 (Moyenne)';
  if (score >= 10) return 'Priorité 3 (Modéré)';
  return 'Priorité 4 (Faible)';
}

function RiskEditDialog({ tableRisk, onClose, onSave, readOnly = false }: {
  tableRisk: TableRisk;
  onClose: () => void;
  onSave: (risk: Risk) => void;
  readOnly?: boolean;
}) {
  const r = tableRisk.risk;
  const [gravity, setGravity] = useState(String(r.gravityValue));
  const [frequency, setFrequency] = useState(String(r.frequencyValue));
  const [control, setControl] = useState(String(r.controlValue));
  const [existingMeasures, setExistingMeasures] = useState<string[]>(r.existingMeasures || []);
  const [newMeasure, setNewMeasure] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const gVal = Number(gravity) as Risk['gravityValue'];
  const fVal = Number(frequency) as Risk['frequencyValue'];
  const mVal = Number(control) as Risk['controlValue'];
  const score = Math.round(gVal * fVal * mVal * 100) / 100;
  const priority = calcPriority(score);

  const gLabel = GRAVITY_OPTIONS.find(o => o.value === gVal)?.label || r.gravity;
  const fLabel = FREQUENCY_OPTIONS.find(o => o.value === fVal)?.label || r.frequency;
  const mLabel = CONTROL_OPTIONS.find(o => o.value === mVal)?.label || r.control;

  const addMeasure = (measure: string) => {
    if (measure.trim() && !existingMeasures.includes(measure.trim())) {
      setExistingMeasures(prev => [...prev, measure.trim()]);
    }
  };

  const removeMeasure = (index: number) => {
    setExistingMeasures(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddManual = () => {
    if (newMeasure.trim()) {
      addMeasure(newMeasure);
      apiRequest('/api/custom-measures', {
        method: 'POST',
        body: JSON.stringify({ family: r.family, measure: newMeasure.trim() }),
      }).catch(() => {});
      setNewMeasure('');
    }
  };

  const { data: customDbMeasures = [] } = useQuery<{id: number; family: string; measure: string}[]>({
    queryKey: ['/api/custom-measures', r.family],
    queryFn: async () => apiRequest(`/api/custom-measures?family=${encodeURIComponent(r.family)}`),
  });

  const allSuggestedMeasures = useMemo(() => {
    const familyMeasures = SUGGESTED_MEASURES[r.family] || [];
    const customOnes = customDbMeasures.map(m => m.measure);
    const merged = [...familyMeasures, ...customOnes.filter(c => !familyMeasures.includes(c))];
    return merged.filter(m => !existingMeasures.includes(m));
  }, [r.family, existingMeasures, customDbMeasures]);

  const handleSave = () => {
    onSave({
      ...r,
      gravity: gLabel as Risk['gravity'],
      gravityValue: gVal,
      frequency: fLabel as Risk['frequency'],
      frequencyValue: fVal,
      control: mLabel as Risk['control'],
      controlValue: mVal,
      riskScore: score,
      priority,
      existingMeasures,
    });
  };

  const PIcon = PRIORITY_ICONS[priority] || Info;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{readOnly ? "Détails du risque" : "Modifier le risque"}</DialogTitle>
          <DialogDescription>{tableRisk.unitName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <LabelText className="text-xs text-muted-foreground">Famille</LabelText>
              <p className="text-sm">{r.family}</p>
            </div>
            <div>
              <LabelText className="text-xs text-muted-foreground">Situation d'exposition</LabelText>
              <p className="text-sm">{r.type}</p>
            </div>
          </div>
          <div>
            <LabelText className="text-xs text-muted-foreground">Danger identifié</LabelText>
            <p className="text-sm">{r.danger}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <LabelText className="text-xs text-muted-foreground mb-1.5 block">Gravité</LabelText>
              <Select value={gravity} onValueChange={setGravity} disabled={readOnly}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRAVITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelText className="text-xs text-muted-foreground mb-1.5 block">Fréquence</LabelText>
              <Select value={frequency} onValueChange={setFrequency} disabled={readOnly}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelText className="text-xs text-muted-foreground mb-1.5 block">Maîtrise</LabelText>
              <Select value={control} onValueChange={setControl} disabled={readOnly}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTROL_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Score :</span>
              <span className="text-sm font-mono font-bold">{score}</span>
            </div>
            <Badge className={`${PRIORITY_BADGE_COLORS[priority] || ''}`}>
              <PIcon className="h-3 w-3 mr-1" />
              {priority}
            </Badge>
          </div>

          <div>
            <LabelText className="text-xs text-muted-foreground">Mesures de prévention recommandées</LabelText>
            <p className="text-sm text-muted-foreground italic mt-1">{r.measures}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <LabelText className="text-sm font-medium">Mesures de prévention existantes</LabelText>
              <Badge variant="outline" className="text-xs">{existingMeasures.length} mesure(s)</Badge>
            </div>

            {existingMeasures.length > 0 && (
              <div className="space-y-1.5">
                {existingMeasures.map((measure, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-sm flex-1">{measure}</span>
                    {!readOnly && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => removeMeasure(idx)}>
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une mesure manuellement..."
                  value={newMeasure}
                  onChange={(e) => setNewMeasure(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManual(); } }}
                  className="h-9 text-sm"
                />
                <Button variant="outline" size="sm" className="h-9 px-3 flex-shrink-0" onClick={handleAddManual} disabled={!newMeasure.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!readOnly && allSuggestedMeasures.length > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 dark:text-blue-400 h-7 px-2 mb-2"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                >
                  {showSuggestions ? 'Masquer les suggestions' : `Voir ${allSuggestedMeasures.length} suggestion(s) pour "${r.family}"`}
                </Button>
                {showSuggestions && (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto border rounded-md p-2 bg-blue-50/50 dark:bg-blue-950/10">
                    {allSuggestedMeasures.map((measure, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left text-sm p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2"
                        onClick={() => addMeasure(measure)}
                      >
                        <Plus className="h-3 w-3 text-blue-600 flex-shrink-0" />
                        <span>{measure}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          {readOnly ? (
            <Button onClick={onClose}>Fermer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSave}>
                <Check className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LabelText({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}

const RISK_FAMILIES: RiskFamily[] = [
  'Mécanique', 'Physique', 'Chimique', 'Biologique', 'Radiologique',
  'Incendie-Explosion', 'Électrique', 'Ergonomique', 'Psychosocial',
  'Routier', 'Environnemental', 'Organisationnel', 'Chutes'
];

function CreateCustomRiskDialog({ unitName, onClose, onRiskCreated }: {
  unitName: string;
  onClose: () => void;
  onRiskCreated: (risk: Risk) => void;
}) {
  const { toast } = useToast();
  const [family, setFamily] = useState<string>('Mécanique');
  const [situation, setSituation] = useState('');
  const [description, setDescription] = useState('');
  const [measures, setMeasures] = useState('');
  const [gravity, setGravity] = useState('4');
  const [frequency, setFrequency] = useState('4');
  const [control, setControl] = useState('0.5');
  const [isSaving, setIsSaving] = useState(false);

  const gVal = Number(gravity) as Risk['gravityValue'];
  const fVal = Number(frequency) as Risk['frequencyValue'];
  const mVal = Number(control) as Risk['controlValue'];
  const score = Math.round(gVal * fVal * mVal * 100) / 100;
  const priority = calcPriority(score);

  const gLabel = GRAVITY_OPTIONS.find(o => o.value === gVal)?.label || 'Moyenne';
  const fLabel = FREQUENCY_OPTIONS.find(o => o.value === fVal)?.label || 'Mensuelle';
  const mLabel = CONTROL_OPTIONS.find(o => o.value === mVal)?.label || 'Moyenne';

  const handleCreate = async () => {
    if (!situation.trim() || !description.trim()) {
      toast({ title: "Champs requis", description: "La situation et la description sont obligatoires", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest('/api/risk-library/custom', {
        method: 'POST',
        body: JSON.stringify({
          family,
          sector: 'TOUS',
          hierarchyLevel: 'Unité',
          situation: situation.trim(),
          description: description.trim(),
          defaultGravity: gLabel,
          defaultFrequency: fLabel,
          defaultControl: mLabel,
          measures: measures.trim(),
          keywords: situation.toLowerCase(),
        }),
      });

      const risk: Risk = {
        id: crypto.randomUUID(),
        type: situation.trim(),
        family: family as RiskFamily,
        danger: description.trim(),
        source: unitName,
        sourceType: 'Lieu',
        gravity: gLabel as Risk['gravity'],
        gravityValue: gVal,
        frequency: fLabel as Risk['frequency'],
        frequencyValue: fVal,
        control: mLabel as Risk['control'],
        controlValue: mVal,
        riskScore: score,
        priority,
        measures: measures.trim(),
        existingMeasures: [],
        isValidated: true,
        isAIGenerated: false,
        isInherited: false,
        userModified: false,
      };

      onRiskCreated(risk);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le risque", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const PIcon = PRIORITY_ICONS[priority] || Info;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un risque personnalisé</DialogTitle>
          <DialogDescription>Ce risque sera ajouté à "{unitName}" et enregistré dans la bibliothèque pour une utilisation future.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <LabelText className="text-xs text-muted-foreground mb-1.5 block">Famille de risque *</LabelText>
            <Select value={family} onValueChange={setFamily}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_FAMILIES.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <LabelText className="text-xs text-muted-foreground mb-1.5 block">Situation d'exposition *</LabelText>
            <Input
              placeholder="Ex: Travail en hauteur sur nacelle"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <LabelText className="text-xs text-muted-foreground mb-1.5 block">Description du danger *</LabelText>
            <Textarea
              placeholder="Ex: Chute de hauteur lors d'intervention sur nacelle élévatrice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <LabelText className="text-xs text-muted-foreground mb-1.5 block">Mesures de prévention recommandées</LabelText>
            <Textarea
              placeholder="Ex: Harnais, formation, vérification quotidienne..."
              value={measures}
              onChange={(e) => setMeasures(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <LabelText className="text-xs text-muted-foreground mb-1.5 block">Gravité</LabelText>
              <Select value={gravity} onValueChange={setGravity}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRAVITY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelText className="text-xs text-muted-foreground mb-1.5 block">Fréquence</LabelText>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelText className="text-xs text-muted-foreground mb-1.5 block">Maîtrise</LabelText>
              <Select value={control} onValueChange={setControl}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTROL_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label} ({o.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Score :</span>
              <span className="text-sm font-mono font-bold">{score}</span>
            </div>
            <Badge className={`${PRIORITY_BADGE_COLORS[priority] || ''}`}>
              <PIcon className="h-3 w-3 mr-1" />
              {priority}
            </Badge>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate} disabled={isSaving || !situation.trim() || !description.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
            Créer et ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
