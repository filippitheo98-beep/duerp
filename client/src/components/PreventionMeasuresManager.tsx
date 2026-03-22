import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Building, 
  Users, 
  AlertTriangle,
  Target,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PreventionMeasure, Risk, Location, WorkStation } from '@shared/schema';

interface PreventionMeasuresManagerProps {
  measures: PreventionMeasure[];
  risks: Risk[];
  locations: Location[];
  workStations: WorkStation[];
  onAddMeasure: (measure: PreventionMeasure) => void;
  onUpdateMeasure: (measureId: string, updates: Partial<PreventionMeasure>) => void;
  onRemoveMeasure: (measureId: string) => void;
}

export function PreventionMeasuresManager({
  measures,
  risks,
  locations,
  workStations,
  onAddMeasure,
  onUpdateMeasure,
  onRemoveMeasure
}: PreventionMeasuresManagerProps) {
  const [isAddingMeasure, setIsAddingMeasure] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<PreventionMeasure | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'Général' | 'Lieu' | 'Poste'>('Général');
  const [newMeasure, setNewMeasure] = useState<Partial<PreventionMeasure>>({
    level: 'Général',
    category: 'Technique',
    priority: 'Moyenne',
    cost: 'Moyenne',
    effectiveness: 'Moyenne',
    targetRiskIds: []
  });

  const { toast } = useToast();

  const handleAddMeasure = () => {
    if (!newMeasure.description) {
      toast({
        title: "Champ requis",
        description: "Veuillez saisir une description pour la mesure",
        variant: "destructive",
      });
      return;
    }

    const measure: PreventionMeasure = {
      id: crypto.randomUUID(),
      description: newMeasure.description!,
      level: newMeasure.level!,
      category: newMeasure.category!,
      priority: newMeasure.priority!,
      responsible: newMeasure.responsible,
      deadline: newMeasure.deadline,
      cost: newMeasure.cost,
      effectiveness: newMeasure.effectiveness,
      targetRiskIds: newMeasure.targetRiskIds,
      locationId: newMeasure.locationId,
      workStationId: newMeasure.workStationId
    };

    onAddMeasure(measure);
    setIsAddingMeasure(false);
    setNewMeasure({
      level: 'Général',
      category: 'Technique',
      priority: 'Moyenne',
      cost: 'Moyenne',
      effectiveness: 'Moyenne',
      targetRiskIds: []
    });

    toast({
      title: "Mesure ajoutée",
      description: "La mesure de prévention a été ajoutée avec succès",
    });
  };

  const handleUpdateMeasure = () => {
    if (editingMeasure) {
      onUpdateMeasure(editingMeasure.id, editingMeasure);
      setEditingMeasure(null);
      toast({
        title: "Mesure modifiée",
        description: "La mesure de prévention a été modifiée avec succès",
      });
    }
  };

  const handleRemoveMeasure = (measureId: string) => {
    onRemoveMeasure(measureId);
    toast({
      title: "Mesure supprimée",
      description: "La mesure de prévention a été supprimée",
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Technique': return <Shield className="h-4 w-4" />;
      case 'Organisationnel': return <Building className="h-4 w-4" />;
      case 'Humain': return <Users className="h-4 w-4" />;
      case 'EPI': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Élevée': return 'bg-red-100 text-red-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Faible': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Général': return 'bg-blue-100 text-blue-800';
      case 'Lieu': return 'bg-purple-100 text-purple-800';
      case 'Poste': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterMeasuresByLevel = (level: string) => {
    return measures.filter(m => m.level === level);
  };

  const getTargetedRisks = (targetRiskIds: string[] = []) => {
    return risks.filter(r => targetRiskIds.includes(r.id));
  };

  const getLocationName = (locationId?: string) => {
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Non spécifié';
  };

  const getWorkStationName = (workStationId?: string) => {
    const workStation = workStations.find(w => w.id === workStationId);
    return workStation?.name || 'Non spécifié';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mesures de prévention</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les mesures de prévention par niveau (Général, Lieu, Poste)
          </p>
        </div>
        <Dialog open={isAddingMeasure} onOpenChange={setIsAddingMeasure}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle mesure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Ajouter une mesure de prévention</DialogTitle>
              <DialogDescription>
                Définissez une nouvelle mesure de prévention pour améliorer la sécurité
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="description">Description de la mesure *</Label>
                <Textarea
                  id="description"
                  value={newMeasure.description || ''}
                  onChange={(e) => setNewMeasure(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez la mesure de prévention..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="level">Niveau d'application</Label>
                <Select value={newMeasure.level} onValueChange={(value) => setNewMeasure(prev => ({ ...prev, level: value as PreventionMeasure['level'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Général">Général (toute l'entreprise)</SelectItem>
                    <SelectItem value="Lieu">Lieu spécifique</SelectItem>
                    <SelectItem value="Poste">Poste de travail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Catégorie</Label>
                <Select value={newMeasure.category} onValueChange={(value) => setNewMeasure(prev => ({ ...prev, category: value as PreventionMeasure['category'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technique">Technique</SelectItem>
                    <SelectItem value="Organisationnel">Organisationnel</SelectItem>
                    <SelectItem value="Humain">Humain (formation)</SelectItem>
                    <SelectItem value="EPI">EPI (équipements)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priorité</Label>
                <Select value={newMeasure.priority} onValueChange={(value) => setNewMeasure(prev => ({ ...prev, priority: value as PreventionMeasure['priority'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Élevée">Élevée</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Faible">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cost">Coût estimé</Label>
                <Select value={newMeasure.cost} onValueChange={(value) => setNewMeasure(prev => ({ ...prev, cost: value as PreventionMeasure['cost'] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Faible">Faible</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Élevée">Élevée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newMeasure.level === 'Lieu' && (
                <div>
                  <Label htmlFor="location">Lieu concerné</Label>
                  <Select value={newMeasure.locationId || ''} onValueChange={(value) => setNewMeasure(prev => ({ ...prev, locationId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un lieu" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(location => (
                        <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newMeasure.level === 'Poste' && (
                <div>
                  <Label htmlFor="workstation">Poste concerné</Label>
                  <Select value={newMeasure.workStationId || ''} onValueChange={(value) => setNewMeasure(prev => ({ ...prev, workStationId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un poste" />
                    </SelectTrigger>
                    <SelectContent>
                      {workStations.map(workStation => (
                        <SelectItem key={workStation.id} value={workStation.id}>{workStation.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="responsible">Responsable</Label>
                <Input
                  id="responsible"
                  value={newMeasure.responsible || ''}
                  onChange={(e) => setNewMeasure(prev => ({ ...prev, responsible: e.target.value }))}
                  placeholder="Nom du responsable"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Date limite</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newMeasure.deadline || ''}
                  onChange={(e) => setNewMeasure(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingMeasure(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddMeasure}>
                Ajouter la mesure
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Général ({filterMeasuresByLevel('Général').length})
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Lieux ({filterMeasuresByLevel('Lieu').length})
          </TabsTrigger>
          <TabsTrigger value="workstation" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Postes ({filterMeasuresByLevel('Poste').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Alert>
            <Building className="h-4 w-4" />
            <AlertDescription>
              Les mesures générales s'appliquent à l'ensemble de l'entreprise et concernent tous les employés.
            </AlertDescription>
          </Alert>
          {filterMeasuresByLevel('Général').map(measure => (
            <MeasureCard
              key={measure.id}
              measure={measure}
              risks={getTargetedRisks(measure.targetRiskIds)}
              onEdit={() => setEditingMeasure(measure)}
              onDelete={() => handleRemoveMeasure(measure.id)}
              getCategoryIcon={getCategoryIcon}
              getPriorityColor={getPriorityColor}
              getLevelColor={getLevelColor}
              getLocationName={getLocationName}
              getWorkStationName={getWorkStationName}
            />
          ))}
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Les mesures de lieu s'appliquent à des zones spécifiques de l'entreprise.
            </AlertDescription>
          </Alert>
          {filterMeasuresByLevel('Lieu').map(measure => (
            <MeasureCard
              key={measure.id}
              measure={measure}
              risks={getTargetedRisks(measure.targetRiskIds)}
              onEdit={() => setEditingMeasure(measure)}
              onDelete={() => handleRemoveMeasure(measure.id)}
              getCategoryIcon={getCategoryIcon}
              getPriorityColor={getPriorityColor}
              getLevelColor={getLevelColor}
              getLocationName={getLocationName}
              getWorkStationName={getWorkStationName}
            />
          ))}
        </TabsContent>

        <TabsContent value="workstation" className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Les mesures de poste s'appliquent à des postes de travail spécifiques.
            </AlertDescription>
          </Alert>
          {filterMeasuresByLevel('Poste').map(measure => (
            <MeasureCard
              key={measure.id}
              measure={measure}
              risks={getTargetedRisks(measure.targetRiskIds)}
              onEdit={() => setEditingMeasure(measure)}
              onDelete={() => handleRemoveMeasure(measure.id)}
              getCategoryIcon={getCategoryIcon}
              getPriorityColor={getPriorityColor}
              getLevelColor={getLevelColor}
              getLocationName={getLocationName}
              getWorkStationName={getWorkStationName}
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialog de modification */}
      {editingMeasure && (
        <Dialog open={!!editingMeasure} onOpenChange={() => setEditingMeasure(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Modifier la mesure de prévention</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMeasure.description}
                  onChange={(e) => setEditingMeasure(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priorité</Label>
                <Select 
                  value={editingMeasure.priority} 
                  onValueChange={(value) => setEditingMeasure(prev => prev ? { ...prev, priority: value as PreventionMeasure['priority'] } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Élevée">Élevée</SelectItem>
                    <SelectItem value="Moyenne">Moyenne</SelectItem>
                    <SelectItem value="Faible">Faible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-responsible">Responsable</Label>
                <Input
                  id="edit-responsible"
                  value={editingMeasure.responsible || ''}
                  onChange={(e) => setEditingMeasure(prev => prev ? { ...prev, responsible: e.target.value } : null)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingMeasure(null)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateMeasure}>
                Modifier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface MeasureCardProps {
  measure: PreventionMeasure;
  risks: Risk[];
  onEdit: () => void;
  onDelete: () => void;
  getCategoryIcon: (category: string) => React.ReactNode;
  getPriorityColor: (priority: string) => string;
  getLevelColor: (level: string) => string;
  getLocationName: (locationId?: string) => string;
  getWorkStationName: (workStationId?: string) => string;
}

function MeasureCard({ 
  measure, 
  risks, 
  onEdit, 
  onDelete, 
  getCategoryIcon,
  getPriorityColor,
  getLevelColor,
  getLocationName,
  getWorkStationName
}: MeasureCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(measure.category)}
            <div>
              <CardTitle className="text-sm">{measure.description}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getLevelColor(measure.level)} variant="secondary">
                  {measure.level}
                </Badge>
                <Badge className={getPriorityColor(measure.priority)} variant="secondary">
                  {measure.priority}
                </Badge>
                <Badge variant="outline">{measure.category}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {measure.responsible && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{measure.responsible}</span>
            </div>
          )}
          {measure.deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(measure.deadline).toLocaleDateString()}</span>
            </div>
          )}
          {measure.cost && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Coût: {measure.cost}</span>
            </div>
          )}
        </div>
        
        {measure.locationId && (
          <div className="mt-2 text-sm text-muted-foreground">
            <strong>Lieu:</strong> {getLocationName(measure.locationId)}
          </div>
        )}
        
        {measure.workStationId && (
          <div className="mt-2 text-sm text-muted-foreground">
            <strong>Poste:</strong> {getWorkStationName(measure.workStationId)}
          </div>
        )}
        
        {risks.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">Risques ciblés:</p>
            <div className="flex flex-wrap gap-1">
              {risks.map(risk => (
                <Badge key={risk.id} variant="outline" className="text-xs">
                  {risk.type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}