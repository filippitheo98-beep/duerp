import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Header } from '@/components/Header';
import { 
  Plus, 
  Trash2, 
  Edit2,
  Search,
  Library,
  Filter,
  Download,
  AlertTriangle,
  Loader2,
  Save,
  X
} from "lucide-react";

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
  inrsCode: string | null;
  keywords: string | null;
  isActive: boolean;
}

interface Family { id: number; code: string; name: string; }
interface Sector { id: number; code: string; name: string; }

const GRAVITY_OPTIONS = ['Faible', 'Moyenne', 'Grave', 'Très Grave'];
const FREQUENCY_OPTIONS = ['Annuelle', 'Mensuelle', 'Hebdomadaire', 'Journalière'];
const CONTROL_OPTIONS = ['Très élevée', 'Élevée', 'Moyenne', 'Absente'];
const HIERARCHY_OPTIONS = ['Site', 'Unité'];

const FAMILY_COLORS: Record<string, string> = {
  'Mécanique': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Chimique': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Physique': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Biologique': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Ergonomique': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Psychosocial': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'Électrique': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Incendie-Explosion': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Chutes': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Routier': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  'Organisationnel': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Environnemental': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Technologique': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
};

const emptyRisk: Omit<LibraryRisk, 'id' | 'isActive'> = {
  family: '',
  sector: 'TOUS',
  hierarchyLevel: 'Unité',
  situation: '',
  description: '',
  defaultGravity: 'Moyenne',
  defaultFrequency: 'Hebdomadaire',
  defaultControl: 'Moyenne',
  measures: '',
  source: 'Manuel',
  inrsCode: null,
  keywords: null,
};

export default function RiskLibraryManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<LibraryRisk | null>(null);
  const [riskToDelete, setRiskToDelete] = useState<LibraryRisk | null>(null);
  const [formData, setFormData] = useState<Omit<LibraryRisk, 'id' | 'isActive'>>(emptyRisk);

  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ['/api/risk-library/families'],
  });

  const { data: sectors = [] } = useQuery<Sector[]>({
    queryKey: ['/api/risk-library/sectors'],
  });

  const { data: stats } = useQuery<{ totalRisks: number; totalFamilies: number; totalSectors: number }>({
    queryKey: ['/api/risk-library/stats'],
  });

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (familyFilter !== 'all') params.append('family', familyFilter);
    if (sectorFilter !== 'all') params.append('sector', sectorFilter);
    if (levelFilter !== 'all') params.append('level', levelFilter);
    if (searchTerm) params.append('search', searchTerm);
    return params.toString();
  };

  const { data: risks = [], isLoading } = useQuery<LibraryRisk[]>({
    queryKey: ['/api/risk-library/risks', familyFilter, sectorFilter, levelFilter, searchTerm],
    queryFn: async () => {
      const queryString = buildQueryString();
      const url = queryString ? `/api/risk-library/risks?${queryString}` : '/api/risk-library/risks';
      return apiRequest(url);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<LibraryRisk, 'id' | 'isActive'>) => 
      apiRequest('/api/risk-library/risks', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk-library/risks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-library/stats'] });
      toast({ title: "Risque créé avec succès" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LibraryRisk> }) => 
      apiRequest(`/api/risk-library/risks/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk-library/risks'] });
      toast({ title: "Risque modifié avec succès" });
      closeModal();
    },
    onError: () => {
      toast({ title: "Erreur lors de la modification", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/risk-library/risks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk-library/risks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-library/stats'] });
      toast({ title: "Risque supprimé" });
      setIsDeleteModalOpen(false);
      setRiskToDelete(null);
    },
    onError: () => {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  });

  const openCreateModal = () => {
    setEditingRisk(null);
    setFormData(emptyRisk);
    setIsModalOpen(true);
  };

  const openEditModal = (risk: LibraryRisk) => {
    setEditingRisk(risk);
    setFormData({
      family: risk.family,
      sector: risk.sector,
      hierarchyLevel: risk.hierarchyLevel,
      situation: risk.situation,
      description: risk.description,
      defaultGravity: risk.defaultGravity,
      defaultFrequency: risk.defaultFrequency,
      defaultControl: risk.defaultControl,
      measures: risk.measures,
      source: risk.source,
      inrsCode: risk.inrsCode,
      keywords: risk.keywords,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRisk(null);
    setFormData(emptyRisk);
  };

  const handleSubmit = () => {
    if (!formData.family || !formData.situation || !formData.description || !formData.measures) {
      toast({ title: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    if (editingRisk) {
      updateMutation.mutate({ id: editingRisk.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const confirmDelete = (risk: LibraryRisk) => {
    setRiskToDelete(risk);
    setIsDeleteModalOpen(true);
  };

  const uniqueFamilies = useMemo(() => {
    const familySet = new Set(risks.map(r => r.family));
    return Array.from(familySet).sort();
  }, [risks]);

  return (
    <div className="min-h-screen bg-background">
    <Header />
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Library className="h-8 w-8 text-primary" />
            Gestion de la Bibliothèque de Risques
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez le catalogue des risques professionnels INRS/ARS
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2" data-testid="button-add-risk">
          <Plus className="h-4 w-4" />
          Ajouter un risque
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.totalRisks || 0}</div>
            <p className="text-xs text-muted-foreground">Risques totaux</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.totalFamilies || 0}</div>
            <p className="text-xs text-muted-foreground">Familles de risques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.totalSectors || 0}</div>
            <p className="text-xs text-muted-foreground">Secteurs d'activité</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{risks.length}</div>
            <p className="text-xs text-muted-foreground">Résultats filtrés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger data-testid="select-family">
                <SelectValue placeholder="Famille de risque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les familles</SelectItem>
                {uniqueFamilies.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger data-testid="select-sector">
                <SelectValue placeholder="Secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les secteurs</SelectItem>
                {sectors.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger data-testid="select-level">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                {HIERARCHY_OPTIONS.map(l => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Catalogue des risques ({risks.length})</CardTitle>
          <CardDescription>Cliquez sur un risque pour le modifier</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : risks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Library className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucun risque trouvé</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Famille</th>
                    <th className="text-left p-3 font-medium">Secteur</th>
                    <th className="text-left p-3 font-medium">Niveau</th>
                    <th className="text-left p-3 font-medium">Situation d'exposition</th>
                    <th className="text-center p-3 font-medium">G</th>
                    <th className="text-center p-3 font-medium">F</th>
                    <th className="text-center p-3 font-medium">M</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((risk) => (
                    <tr key={risk.id} className="border-b hover:bg-muted/30 transition-colors" data-testid={`row-risk-${risk.id}`}>
                      <td className="p-3 font-mono text-xs text-muted-foreground">#{risk.id}</td>
                      <td className="p-3">
                        <Badge className={FAMILY_COLORS[risk.family] || 'bg-gray-100 text-gray-800'}>
                          {risk.family}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{risk.sector}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className="text-xs">{risk.hierarchyLevel}</Badge>
                      </td>
                      <td className="p-3 max-w-md">
                        <div className="line-clamp-2">{risk.situation}</div>
                      </td>
                      <td className="p-3 text-center font-mono">{risk.defaultGravity.charAt(0)}</td>
                      <td className="p-3 text-center font-mono">{risk.defaultFrequency.charAt(0)}</td>
                      <td className="p-3 text-center font-mono">{risk.defaultControl.charAt(0)}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(risk)} data-testid={`button-edit-${risk.id}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => confirmDelete(risk)} data-testid={`button-delete-${risk.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Modifier le risque' : 'Ajouter un risque'}</DialogTitle>
            <DialogDescription>
              {editingRisk ? `Modification du risque #${editingRisk.id}` : 'Créer un nouveau risque dans la bibliothèque'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Famille de risque *</Label>
                <Select value={formData.family} onValueChange={(v) => setFormData({ ...formData, family: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map(f => (
                      <SelectItem key={f.code} value={f.name}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secteur d'activité *</Label>
                <Select value={formData.sector} onValueChange={(v) => setFormData({ ...formData, sector: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Niveau hiérarchique *</Label>
                <Select value={formData.hierarchyLevel} onValueChange={(v) => setFormData({ ...formData, hierarchyLevel: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HIERARCHY_OPTIONS.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Situation d'exposition *</Label>
              <Input 
                value={formData.situation} 
                onChange={(e) => setFormData({ ...formData, situation: e.target.value })}
                placeholder="Ex: Travaux en hauteur sans protection"
              />
            </div>

            <div className="space-y-2">
              <Label>Description détaillée *</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description complète du danger..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gravité par défaut</Label>
                <Select value={formData.defaultGravity} onValueChange={(v) => setFormData({ ...formData, defaultGravity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRAVITY_OPTIONS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fréquence par défaut</Label>
                <Select value={formData.defaultFrequency} onValueChange={(v) => setFormData({ ...formData, defaultFrequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Maîtrise par défaut</Label>
                <Select value={formData.defaultControl} onValueChange={(v) => setFormData({ ...formData, defaultControl: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTROL_OPTIONS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mesures de prévention *</Label>
              <Textarea 
                value={formData.measures} 
                onChange={(e) => setFormData({ ...formData, measures: e.target.value })}
                placeholder="Mesures de prévention recommandées..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Input 
                  value={formData.source} 
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="INRS, Manuel..."
                />
              </div>
              <div className="space-y-2">
                <Label>Code INRS</Label>
                <Input 
                  value={formData.inrsCode || ''} 
                  onChange={(e) => setFormData({ ...formData, inrsCode: e.target.value || null })}
                  placeholder="Ex: ED 950"
                />
              </div>
              <div className="space-y-2">
                <Label>Mots-clés</Label>
                <Input 
                  value={formData.keywords || ''} 
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value || null })}
                  placeholder="mot1, mot2, mot3..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-risk"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingRisk ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce risque ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          {riskToDelete && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={FAMILY_COLORS[riskToDelete.family] || 'bg-gray-100'}>{riskToDelete.family}</Badge>
                <Badge variant="outline">{riskToDelete.sector}</Badge>
              </div>
              <p className="font-medium">{riskToDelete.situation}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Annuler</Button>
            <Button 
              variant="destructive" 
              onClick={() => riskToDelete && deleteMutation.mutate(riskToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
