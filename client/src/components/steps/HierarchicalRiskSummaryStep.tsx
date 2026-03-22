import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileSpreadsheet, 
  FileText, 
  Download,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Save
} from "lucide-react";
import type { WorkUnit, PreventionMeasure } from "@shared/schema";
import HierarchicalRiskTable from "@/components/HierarchicalRiskTable";
import { extractAllRisks, getRiskStatistics } from "@/lib/hierarchicalUtils";

interface HierarchicalRiskSummaryStepProps {
  workUnits: WorkUnit[];
  companyName: string;
  companyActivity: string;
  preventionMeasures: PreventionMeasure[];
  onSave: () => void;
  isSaving?: boolean;
}

export default function HierarchicalRiskSummaryStep({
  workUnits,
  companyName,
  companyActivity,
  preventionMeasures,
  onSave,
  isSaving
}: HierarchicalRiskSummaryStepProps) {
  const { toast } = useToast();
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  const allRisks = extractAllRisks(workUnits);
  const stats = getRiskStatistics(workUnits);
  
  const completionPercentage = workUnits.length > 0 
    ? Math.round((allRisks.length / Math.max(workUnits.length * 5, 1)) * 100)
    : 0;

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const response = await fetch('/api/export/excel-hierarchical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workUnits,
          companyName,
          companyActivity,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DUERP_${companyName}_Hierarchique.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Excel réussi",
          description: "Le fichier Excel a été téléchargé",
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le fichier Excel",
        variant: "destructive",
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportWord = async () => {
    setIsExportingWord(true);
    try {
      const response = await fetch('/api/export/word-hierarchical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workUnits,
          companyName,
          companyActivity,
          preventionMeasures,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DUERP_${companyName}_Hierarchique.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Word réussi",
          description: "Le document Word a été téléchargé",
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le document Word",
        variant: "destructive",
      });
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Synthèse du DUERP - {companyName}
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de votre Document Unique d'Évaluation des Risques Professionnels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unités analysées</p>
                    <p className="text-2xl font-bold">{workUnits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risques identifiés</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taux de couverture</p>
                    <p className="text-2xl font-bold">{Math.min(completionPercentage, 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-3">Répartition par famille de risques</h4>
            <div className="flex flex-wrap gap-2">
              {stats.byFamily.slice(0, 8).map(({ family, count }) => (
                <Badge key={family} variant="outline" className="text-sm py-1 px-3">
                  {family}: {count}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onSave} disabled={isSaving} data-testid="button-save-duerp">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder le DUERP'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              disabled={isExportingExcel || allRisks.length === 0}
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isExportingExcel ? 'Export...' : 'Exporter Excel'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportWord}
              disabled={isExportingWord || allRisks.length === 0}
              data-testid="button-export-word"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isExportingWord ? 'Export...' : 'Exporter Word'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <HierarchicalRiskTable 
        workUnits={workUnits}
        companyName={companyName}
        onExportExcel={handleExportExcel}
        onExportWord={handleExportWord}
      />
    </div>
  );
}
