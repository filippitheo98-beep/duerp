import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PreventionMeasuresManager } from '@/components/PreventionMeasuresManager';
import { 
  FileText, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react';
import type { PreventionMeasure, Risk, Location, WorkStation } from '@shared/schema';

interface PreventionMeasuresStepProps {
  measures: PreventionMeasure[];
  risks: Risk[];
  locations: Location[];
  workStations: WorkStation[];
  onAddMeasure: (measure: PreventionMeasure) => void;
  onUpdateMeasure: (measureId: string, updates: Partial<PreventionMeasure>) => void;
  onRemoveMeasure: (measureId: string) => void;
  onSave: () => void;
  onGenerateRecommendations: () => void;
}

export default function PreventionMeasuresStep({
  measures,
  risks,
  locations,
  workStations,
  onAddMeasure,
  onUpdateMeasure,
  onRemoveMeasure,
  onSave,
  onGenerateRecommendations
}: PreventionMeasuresStepProps) {
  const hasMeasures = measures.length > 0;
  const hasRisks = risks.length > 0;
  
  // Statistiques des mesures
  const measuresByLevel = {
    'Général': measures.filter(m => m.level === 'Général').length,
    'Lieu': measures.filter(m => m.level === 'Lieu').length,
    'Poste': measures.filter(m => m.level === 'Poste').length
  };

  const measuresByPriority = {
    'Élevée': measures.filter(m => m.priority === 'Élevée').length,
    'Moyenne': measures.filter(m => m.priority === 'Moyenne').length,
    'Faible': measures.filter(m => m.priority === 'Faible').length
  };

  const measuresByCategory = {
    'Technique': measures.filter(m => m.category === 'Technique').length,
    'Organisationnel': measures.filter(m => m.category === 'Organisationnel').length,
    'Humain': measures.filter(m => m.category === 'Humain').length,
    'EPI': measures.filter(m => m.category === 'EPI').length
  };

  const getRisksCoverage = () => {
    const coveredRiskIds = new Set<string>();
    measures.forEach(measure => {
      if (measure.targetRiskIds) {
        measure.targetRiskIds.forEach(riskId => coveredRiskIds.add(riskId));
      }
    });
    return {
      covered: coveredRiskIds.size,
      total: risks.length,
      percentage: risks.length > 0 ? Math.round((coveredRiskIds.size / risks.length) * 100) : 0
    };
  };

  const coverage = getRisksCoverage();

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Mesures de prévention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {measures.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-300">
                Mesures totales
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {coverage.percentage}%
              </div>
              <div className="text-sm text-green-600 dark:text-green-300">
                Couverture des risques
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {measuresByPriority['Élevée']}
              </div>
              <div className="text-sm text-red-600 dark:text-red-300">
                Priorité élevée
              </div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {measuresByPriority['Moyenne']}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-300">
                Priorité moyenne
              </div>
            </div>
          </div>

          {/* Répartition par niveau */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Répartition par niveau</h4>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50">
                Général: {measuresByLevel['Général']}
              </Badge>
              <Badge variant="outline" className="bg-purple-50">
                Lieu: {measuresByLevel['Lieu']}
              </Badge>
              <Badge variant="outline" className="bg-orange-50">
                Poste: {measuresByLevel['Poste']}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            {hasRisks && (
              <Button 
                onClick={onGenerateRecommendations}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Générer des recommandations
              </Button>
            )}
            <Button 
              onClick={onSave}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Sauvegarder les mesures
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerte de couverture des risques */}
      {hasRisks && coverage.percentage < 100 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention:</strong> {risks.length - coverage.covered} risques ne sont pas encore couverts par des mesures de prévention.
            Nous recommandons d'ajouter des mesures pour améliorer la couverture.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerte si aucun risque */}
      {!hasRisks && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucun risque détecté. Veuillez d'abord générer les risques à l'étape précédente pour pouvoir créer des mesures de prévention ciblées.
          </AlertDescription>
        </Alert>
      )}

      {/* Gestionnaire de mesures */}
      <PreventionMeasuresManager
        measures={measures}
        risks={risks}
        locations={locations}
        workStations={workStations}
        onAddMeasure={onAddMeasure}
        onUpdateMeasure={onUpdateMeasure}
        onRemoveMeasure={onRemoveMeasure}
      />

      {/* Recommandations automatiques */}
      {hasRisks && !hasMeasures && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recommandations automatiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Nous pouvons générer automatiquement des mesures de prévention basées sur vos risques identifiés.
            </p>
            <Button 
              onClick={onGenerateRecommendations}
              className="w-full"
            >
              Générer les recommandations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}