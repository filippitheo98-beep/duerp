import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  Library,
  Sparkles,
  Check,
  Loader2,
  AlertTriangle,
  BookOpen,
  Building2,
  Layers,
  ChevronRight,
  Info
} from "lucide-react";
import type { Risk } from "@shared/schema";

interface RiskFamily {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface Sector {
  id: number;
  code: string;
  name: string;
  description: string;
}

interface LibraryRisk {
  id: number;
  family: string;
  sector: string;
  hierarchyLevel: string;
  situation: string;
  description: string;
  defaultGravity: string;
  defaultFrequency: string;
  defaultControl: string;
  measures: string;
  source: string;
  keywords: string;
}

interface RiskLibrarySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRisks: (risks: Risk[]) => void;
  hierarchyLevel: 'Site' | 'Unité';
  companySector?: string;
  elementName: string;
}

const HIERARCHY_LEVEL_MAP: Record<string, string> = {
  'Site': 'Site',
  'Unité': 'Unité',
};

type GravityType = 'Faible' | 'Moyenne' | 'Grave' | 'Très Grave';
type FrequencyType = 'Annuelle' | 'Mensuelle' | 'Hebdomadaire' | 'Journalière';
type ControlType = 'Très élevée' | 'Élevée' | 'Moyenne' | 'Absente';
type GravityValue = 1 | 4 | 20 | 100;
type FrequencyValue = 1 | 4 | 10 | 50;
type ControlValue = 0.05 | 0.2 | 0.5 | 1;
type PriorityType = 'Priorité 1 (Forte)' | 'Priorité 2 (Moyenne)' | 'Priorité 3 (Modéré)' | 'Priorité 4 (Faible)';

const GRAVITY_VALUES: Record<string, GravityValue> = {
  'Faible': 1,
  'Moyenne': 4,
  'Grave': 20,
  'Très Grave': 100
};

const FREQUENCY_VALUES: Record<string, FrequencyValue> = {
  'Annuelle': 1,
  'Mensuelle': 4,
  'Hebdomadaire': 10,
  'Journalière': 50
};

const CONTROL_VALUES: Record<string, ControlValue> = {
  'Très élevée': 0.05,
  'Élevée': 0.2,
  'Moyenne': 0.5,
  'Absente': 1
};

function calculatePriority(gravity: string, frequency: string, control: string): PriorityType {
  const g = GRAVITY_VALUES[gravity] || 4;
  const f = FREQUENCY_VALUES[frequency] || 4;
  const m = CONTROL_VALUES[control] || 0.5;
  const score = g * f * m;
  
  if (score >= 500) return 'Priorité 1 (Forte)';
  if (score >= 100) return 'Priorité 2 (Moyenne)';
  if (score >= 20) return 'Priorité 3 (Modéré)';
  return 'Priorité 4 (Faible)';
}

function mapGravity(value: string): GravityType {
  const validValues: GravityType[] = ['Faible', 'Moyenne', 'Grave', 'Très Grave'];
  return validValues.includes(value as GravityType) ? value as GravityType : 'Moyenne';
}

function mapFrequency(value: string): FrequencyType {
  const validValues: FrequencyType[] = ['Annuelle', 'Mensuelle', 'Hebdomadaire', 'Journalière'];
  return validValues.includes(value as FrequencyType) ? value as FrequencyType : 'Mensuelle';
}

function mapControl(value: string): ControlType {
  const validValues: ControlType[] = ['Très élevée', 'Élevée', 'Moyenne', 'Absente'];
  return validValues.includes(value as ControlType) ? value as ControlType : 'Moyenne';
}

function convertLibraryRiskToRisk(libRisk: LibraryRisk): Risk & { catalogId?: number } {
  const gravity = mapGravity(libRisk.defaultGravity);
  const frequency = mapFrequency(libRisk.defaultFrequency);
  const control = mapControl(libRisk.defaultControl);
  const priority = calculatePriority(gravity, frequency, control);
  const riskScore = GRAVITY_VALUES[gravity] * FREQUENCY_VALUES[frequency] * CONTROL_VALUES[control];
  
  return {
    id: crypto.randomUUID(),
    catalogId: libRisk.id, // Track catalog source for deduplication
    danger: libRisk.situation,
    type: libRisk.family,
    family: libRisk.family as any,
    source: `INRS #${libRisk.id}`,
    sourceType: 'Lieu',
    gravity,
    gravityValue: GRAVITY_VALUES[gravity],
    frequency,
    frequencyValue: FREQUENCY_VALUES[frequency],
    control,
    controlValue: CONTROL_VALUES[control],
    riskScore,
    priority,
    measures: libRisk.measures,
    existingMeasures: [],
    isValidated: false,
    isAIGenerated: false,
    isInherited: false,
    userModified: false
  };
}

export default function RiskLibrarySelector({
  isOpen,
  onClose,
  onSelectRisks,
  hierarchyLevel,
  companySector,
  elementName
}: RiskLibrarySelectorProps) {
  const [selectedTab, setSelectedTab] = useState<'library' | 'ai'>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>(companySector || 'all');
  const [levelFilter, setLevelFilter] = useState<string>(hierarchyLevel);
  const [selectedRisks, setSelectedRisks] = useState<Set<number>>(new Set());

  const { data: families = [], isLoading: loadingFamilies } = useQuery<RiskFamily[]>({
    queryKey: ['/api/risk-library/families'],
  });

  const { data: sectors = [], isLoading: loadingSectors } = useQuery<Sector[]>({
    queryKey: ['/api/risk-library/sectors'],
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (familyFilter !== 'all') params.append('family', familyFilter);
    if (sectorFilter !== 'all') params.append('sector', sectorFilter);
    if (levelFilter !== 'all') params.append('level', levelFilter);
    if (searchTerm) params.append('search', searchTerm);
    return params.toString();
  };

  const { data: libraryRisks = [], isLoading: loadingRisks } = useQuery<LibraryRisk[]>({
    queryKey: ['/api/risk-library/risks', familyFilter, sectorFilter, levelFilter, searchTerm],
    queryFn: async () => {
      const queryString = buildQueryString();
      const url = queryString ? `/api/risk-library/risks?${queryString}` : '/api/risk-library/risks';
      return apiRequest(url);
    },
  });

  const { data: stats } = useQuery<{ totalRisks: number; totalFamilies: number; totalSectors: number }>({
    queryKey: ['/api/risk-library/stats'],
  });

  const filteredRisks = useMemo(() => {
    return libraryRisks;
  }, [libraryRisks]);

  const toggleRisk = (riskId: number) => {
    setSelectedRisks(prev => {
      const next = new Set(prev);
      if (next.has(riskId)) {
        next.delete(riskId);
      } else {
        next.add(riskId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedRisks(new Set(filteredRisks.map(r => r.id)));
  };

  const deselectAll = () => {
    setSelectedRisks(new Set());
  };

  const handleConfirm = () => {
    const risksToAdd = filteredRisks
      .filter(r => selectedRisks.has(r.id))
      .map(convertLibraryRiskToRisk);
    
    onSelectRisks(risksToAdd);
    setSelectedRisks(new Set());
    onClose();
  };

  const getPriorityColor = (risk: LibraryRisk): string => {
    const priority = calculatePriority(risk.defaultGravity, risk.defaultFrequency, risk.defaultControl);
    if (priority.includes('1')) return 'border-l-red-500';
    if (priority.includes('2')) return 'border-l-orange-500';
    if (priority.includes('3')) return 'border-l-yellow-500';
    return 'border-l-green-500';
  };

  const isLoading = loadingFamilies || loadingSectors || loadingRisks;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            Bibliothèque de Risques INRS/ARS
          </DialogTitle>
          <DialogDescription>
            Sélectionnez des risques pour « {elementName} » (niveau: {hierarchyLevel})
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'library' | 'ai')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="library" className="flex items-center gap-2" data-testid="tab-library">
              <BookOpen className="h-4 w-4" />
              Catalogue INRS ({stats?.totalRisks || 0} risques)
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2" data-testid="tab-ai">
              <Sparkles className="h-4 w-4" />
              Génération IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="grid grid-cols-4 gap-3 flex-shrink-0 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un risque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-risk"
                />
              </div>

              <Select value={familyFilter} onValueChange={setFamilyFilter}>
                <SelectTrigger data-testid="select-family">
                  <SelectValue placeholder="Famille de risque" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les familles</SelectItem>
                  {families.map(f => (
                    <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectorFilter} onValueChange={setSectorFilter}>
                <SelectTrigger data-testid="select-sector">
                  <SelectValue placeholder="Secteur d'activité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les secteurs</SelectItem>
                  {sectors.map(s => (
                    <SelectItem key={s.id} value={s.code}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger data-testid="select-level">
                  <SelectValue placeholder="Niveau hiérarchique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="Site">Site</SelectItem>
                  <SelectItem value="Unité">Unité de travail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between flex-shrink-0 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{filteredRisks.length} risque(s) trouvé(s)</Badge>
                <Badge variant="secondary">{selectedRisks.size} sélectionné(s)</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  Tout sélectionner
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                  Tout désélectionner
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredRisks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mb-2" />
                  <p>Aucun risque ne correspond aux critères</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRisks.map(risk => (
                    <div
                      key={risk.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer border-l-4 ${getPriorityColor(risk)} ${selectedRisks.has(risk.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleRisk(risk.id)}
                      data-testid={`risk-item-${risk.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedRisks.has(risk.id)}
                          onCheckedChange={() => toggleRisk(risk.id)}
                          className="mt-1"
                          data-testid={`checkbox-risk-${risk.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{risk.situation}</span>
                            <Badge variant="outline" className="text-[10px]">{risk.family}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{risk.hierarchyLevel}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>
                          <div className="flex flex-wrap gap-2 text-[10px]">
                            <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
                              G: {risk.defaultGravity}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              F: {risk.defaultFrequency}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                              M: {risk.defaultControl}
                            </Badge>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <Badge className={`text-[10px] ${calculatePriority(risk.defaultGravity, risk.defaultFrequency, risk.defaultControl).includes('1') ? 'bg-red-500' : calculatePriority(risk.defaultGravity, risk.defaultFrequency, risk.defaultControl).includes('2') ? 'bg-orange-500' : calculatePriority(risk.defaultGravity, risk.defaultFrequency, risk.defaultControl).includes('3') ? 'bg-yellow-500' : 'bg-green-500'}`}>
                              {calculatePriority(risk.defaultGravity, risk.defaultFrequency, risk.defaultControl)}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 italic">
                            Mesures: {risk.measures.length > 100 ? `${risk.measures.substring(0, 100)}...` : risk.measures}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center max-w-md">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Génération IA</h3>
              <p className="text-muted-foreground mb-4">
                Utilisez l'IA pour générer des risques spécifiques à votre situation de travail.
                Cette option complète le catalogue INRS avec des risques personnalisés.
              </p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2 text-left">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Fermez cette fenêtre et utilisez le bouton <Sparkles className="inline h-3 w-3" /> sur l'élément
                    dans l'arborescence pour générer des risques par IA.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-library">
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedRisks.size === 0}
            className="gap-2"
            data-testid="button-confirm-library"
          >
            <Check className="h-4 w-4" />
            Ajouter {selectedRisks.size} risque(s) sélectionné(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
