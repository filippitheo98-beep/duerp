import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Loader2, 
  RefreshCw, 
  List,
  Save,
  Download,
  Plus,
  RotateCcw
} from 'lucide-react';

import RiskTable from '@/components/RiskTable';
import SelectLocationModal from '@/components/SelectLocationModal';
import type { Location, WorkStation, Risk, PreventionMeasure } from '@shared/schema';

interface RiskGenerationStepProps {
  locations: Location[];
  workStations: WorkStation[];
  finalRisks: Risk[];
  preventionMeasures: PreventionMeasure[];
  companyActivity: string;
  companyName?: string;
  onGenerateRisks: () => void;
  onRegenerateRisks: () => void;
  onAddNewRisks?: () => void;
  onAddSelectiveRisks?: (selectedLocations: Location[], selectedWorkStations: WorkStation[]) => void;
  isGenerating: boolean;
  onSave: () => void;
}

export default function RiskGenerationStep({
  locations,
  workStations,
  finalRisks,
  preventionMeasures,
  companyActivity,
  companyName,
  onGenerateRisks,
  onRegenerateRisks,
  onAddNewRisks,
  onAddSelectiveRisks,
  isGenerating,
  onSave
}: RiskGenerationStepProps) {
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showSelectLocationModal, setShowSelectLocationModal] = useState(false);
  
  const totalItems = locations.length + workStations.length;
  const hasRisks = finalRisks.length > 0;
  
  const risksByPriority = {
    'Priorité 1 (Forte)': finalRisks.filter(r => r.priority === 'Priorité 1 (Forte)').length,
    'Priorité 2 (Moyenne)': finalRisks.filter(r => r.priority === 'Priorité 2 (Moyenne)').length,
    'Priorité 3 (Modéré)': finalRisks.filter(r => r.priority === 'Priorité 3 (Modéré)').length,
    'Priorité 4 (Faible)': finalRisks.filter(r => r.priority === 'Priorité 4 (Faible)').length,
  };

  const handleGenerate = () => {
    setGenerationProgress(0);
    onGenerateRisks();
    
    // Simuler la progression
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 500);
  };

  const handleRegenerate = () => {
    setGenerationProgress(0);
    onRegenerateRisks();
    
    // Simuler la progression
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 500);
  };

  const handleAddNewRisks = () => {
    if (onAddNewRisks) {
      setGenerationProgress(0);
      onAddNewRisks();
      
      // Simuler la progression
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 20;
        });
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé avant génération */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Génération du tableau des risques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {locations.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-300">
                Lieux de travail
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {workStations.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-300">
                Postes de travail
              </div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {preventionMeasures.length}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-300">
                Mesures de prévention
              </div>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {finalRisks.length}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-300">
                Risques identifiés
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <strong>Secteur d'activité :</strong> {companyActivity}
          </div>

          {/* Progress bar pour la génération */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Génération des risques en cours...</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!hasRisks ? (
              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || totalItems === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Générer les risques
              </Button>
            ) : (
              <>
                {onAddSelectiveRisks && (
                  <Button 
                    onClick={() => setShowSelectLocationModal(true)}
                    disabled={isGenerating || totalItems === 0}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter de nouveaux risques
                  </Button>
                )}
                <Button 
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  variant="outline"
                  className="flex items-center gap-2 border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  Régénérer tout le tableau
                </Button>
              </>
            )}
            
            {hasRisks && (
              <>
                <Button 
                  onClick={onSave}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder les données
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/export/excel', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          risks: finalRisks,
                          companyName: companyName || 'Entreprise'
                        })
                      });
                      
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `DUERP_${companyName || 'Entreprise'}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                      } else {
                        console.error('Erreur lors de l\'export Excel');
                      }
                    } catch (error) {
                      console.error('Erreur lors de l\'export Excel:', error);
                    }
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter en Excel
                </Button>
              </>
            )}
          </div>

          {totalItems === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vous devez ajouter au moins un lieu ou un poste de travail pour générer des risques.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Statistiques des risques */}
      {hasRisks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Répartition des risques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {risksByPriority['Priorité 4 (Faible)']}
                </div>
                <div className="text-sm text-green-600 dark:text-green-300">
                  Priorité 4 (Faible)
                </div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {risksByPriority['Priorité 3 (Modéré)']}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-300">
                  Priorité 3 (Modéré)
                </div>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {risksByPriority['Priorité 2 (Moyenne)']}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-300">
                  Priorité 2 (Moyenne)
                </div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {risksByPriority['Priorité 1 (Forte)']}
                </div>
                <div className="text-sm text-red-600 dark:text-red-300">
                  Priorité 1 (Forte)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau des risques */}
      {hasRisks && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Risques identifiés ({finalRisks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RiskTable 
              risks={finalRisks} 
              showSource={true} 
              canEdit={true}
              onRisksUpdated={(updatedRisks) => {
                // Mettre à jour les risques dans le composant parent
                window.dispatchEvent(new CustomEvent('risksUpdated', { detail: updatedRisks }));
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Modal de sélection des lieux et postes */}
      <SelectLocationModal
        isOpen={showSelectLocationModal}
        onClose={() => setShowSelectLocationModal(false)}
        locations={locations}
        workStations={workStations}
        onGenerate={(selectedLocations, selectedWorkStations) => {
          if (onAddSelectiveRisks) {
            onAddSelectiveRisks(selectedLocations, selectedWorkStations);
          }
        }}
        isGenerating={isGenerating}
      />
    </div>
  );
}