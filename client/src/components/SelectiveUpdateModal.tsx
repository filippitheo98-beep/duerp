import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Edit, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Risk, Location, WorkStation, PreventionMeasure } from '@shared/schema';

interface SelectiveUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentTitle: string;
  existingRisks: Risk[];
  newRisks: Risk[];
  onUpdateComplete: () => void;
}

export function SelectiveUpdateModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  existingRisks,
  newRisks,
  onUpdateComplete
}: SelectiveUpdateModalProps) {
  const [selectedNewRisks, setSelectedNewRisks] = useState<string[]>([]);
  const [selectedRemoveRisks, setSelectedRemoveRisks] = useState<string[]>([]);
  const [selectedUpdateRisks, setSelectedUpdateRisks] = useState<string[]>([]);
  const [updateAction, setUpdateAction] = useState<'add' | 'remove' | 'update'>('add');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation pour mise à jour sélective
  const updateDocumentMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await apiRequest(`/api/duerp/document/${documentId}/partial`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Document mis à jour",
        description: "Les modifications ont été appliquées avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/duerp/document'] });
      onUpdateComplete();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erreur de mise à jour",
        description: error.message || "Impossible d'appliquer les modifications",
        variant: "destructive",
      });
    },
  });

  // Mutation pour ajouter des risques uniquement
  const addRisksMutation = useMutation({
    mutationFn: async (risks: Risk[]) => {
      const response = await apiRequest(`/api/duerp/document/${documentId}/risks`, {
        method: 'POST',
        body: JSON.stringify({ risks }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Risques ajoutés",
        description: `${selectedNewRisks.length} nouveaux risques ont été ajoutés`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/duerp/document'] });
      onUpdateComplete();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erreur d'ajout",
        description: error.message || "Impossible d'ajouter les risques",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer des risques
  const removeRisksMutation = useMutation({
    mutationFn: async (riskIds: string[]) => {
      const response = await apiRequest(`/api/duerp/document/${documentId}/risks`, {
        method: 'DELETE',
        body: JSON.stringify({ riskIds }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Risques supprimés",
        description: `${selectedRemoveRisks.length} risques ont été supprimés`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/duerp/document'] });
      onUpdateComplete();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer les risques",
        variant: "destructive",
      });
    },
  });

  const handleApplyUpdates = () => {
    if (updateAction === 'add' && selectedNewRisks.length > 0) {
      const risksToAdd = newRisks.filter(risk => selectedNewRisks.includes(risk.id));
      addRisksMutation.mutate(risksToAdd);
    } else if (updateAction === 'remove' && selectedRemoveRisks.length > 0) {
      removeRisksMutation.mutate(selectedRemoveRisks);
    } else if (updateAction === 'update' && selectedUpdateRisks.length > 0) {
      // Pour l'instant, on gère uniquement l'ajout et la suppression
      // L'update nécessiterait une interface plus complexe
      toast({
        title: "Fonction en développement",
        description: "La modification de risques existants sera disponible prochainement",
      });
    }
  };

  const isLoading = updateDocumentMutation.isPending || addRisksMutation.isPending || removeRisksMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Mise à jour sélective - {documentTitle}</DialogTitle>
          <DialogDescription>
            Choisissez les modifications à apporter au document existant sans régénérer tout le tableau
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Button
            variant={updateAction === 'add' ? 'default' : 'outline'}
            onClick={() => setUpdateAction('add')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter des risques
          </Button>
          <Button
            variant={updateAction === 'remove' ? 'default' : 'outline'}
            onClick={() => setUpdateAction('remove')}
            className="flex items-center gap-2"
          >
            <Minus className="h-4 w-4" />
            Supprimer des risques
          </Button>
          <Button
            variant={updateAction === 'update' ? 'default' : 'outline'}
            onClick={() => setUpdateAction('update')}
            className="flex items-center gap-2"
            disabled
          >
            <Edit className="h-4 w-4" />
            Modifier des risques
          </Button>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          {updateAction === 'add' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Nouveaux risques disponibles</h3>
                <Badge variant="outline">{newRisks.length} risques</Badge>
              </div>
              
              {newRisks.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucun nouveau risque à ajouter</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {newRisks.map((risk) => (
                    <Card key={risk.id} className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={risk.id}
                          checked={selectedNewRisks.includes(risk.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedNewRisks(prev => [...prev, risk.id]);
                            } else {
                              setSelectedNewRisks(prev => prev.filter(id => id !== risk.id));
                            }
                          }}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{risk.type}</Badge>
                            <Badge variant={risk.finalRisk === 'Important' ? 'destructive' : 
                              risk.finalRisk === 'Moyen' ? 'default' : 'secondary'}>
                              {risk.finalRisk}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{risk.danger}</p>
                          <p className="text-sm text-muted-foreground">{risk.measures}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {updateAction === 'remove' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Risques existants</h3>
                <Badge variant="outline">{existingRisks.length} risques</Badge>
              </div>
              
              <div className="space-y-2">
                {existingRisks.map((risk) => (
                  <Card key={risk.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={risk.id}
                        checked={selectedRemoveRisks.includes(risk.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRemoveRisks(prev => [...prev, risk.id]);
                          } else {
                            setSelectedRemoveRisks(prev => prev.filter(id => id !== risk.id));
                          }
                        }}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{risk.type}</Badge>
                          <Badge variant={risk.finalRisk === 'Important' ? 'destructive' : 
                            risk.finalRisk === 'Moyen' ? 'default' : 'secondary'}>
                            {risk.finalRisk}
                          </Badge>
                          {risk.source && (
                            <Badge variant="secondary">{risk.source}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{risk.danger}</p>
                        <p className="text-sm text-muted-foreground">{risk.measures}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {updateAction === 'update' && (
            <div className="space-y-4">
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      La modification de risques existants sera disponible prochainement
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleApplyUpdates}
            disabled={isLoading || 
              (updateAction === 'add' && selectedNewRisks.length === 0) ||
              (updateAction === 'remove' && selectedRemoveRisks.length === 0) ||
              (updateAction === 'update' && selectedUpdateRisks.length === 0)
            }
          >
            {isLoading ? 'Application...' : 'Appliquer les modifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}