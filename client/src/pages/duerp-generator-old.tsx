import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Download,
  FileText,
  FileSpreadsheet,
  History,
  Camera,
  Lightbulb,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import CompanyForm from '@/components/CompanyForm';
import RiskTable from '@/components/RiskTable';
import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCards';
import { SmartSuggestions } from '@/components/SmartSuggestions';
import { AutoSaveIndicator } from '@/components/AutoSaveIndicator';
import { PhotoAnalysis } from '@/components/PhotoAnalysis';
import { VersionHistory } from '@/components/VersionHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { 
  Company, 
  Location, 
  WorkStation, 
  Risk,
  PreventionMeasure
} from '@shared/schema';

export default function DuerpGenerator() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [finalRisks, setFinalRisks] = useState<Risk[]>([]);
  const [isGeneratingFinalRisks, setIsGeneratingFinalRisks] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [preventionMeasures, setPreventionMeasures] = useState<PreventionMeasure[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending company data:", data);
      const response = await apiRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (newCompany: Company, variables: any) => {
      setCompany(newCompany);
      setLocations(variables.locations || []);
      setWorkStations(variables.workStations || []);
      toast({
        title: "Entreprise créée",
        description: "Les informations de l'entreprise ont été enregistrées avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error creating company:", error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non connecté",
          description: "Vous n'êtes pas connecté. Redirection vers la page de connexion...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erreur",
        description: `Impossible de créer l'entreprise: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle company form submission
  const handleCompanySubmit = (data: any) => {
    if (company) {
      setCompany({ ...company, ...data });
      setLocations(data.locations || []);
      setWorkStations(data.workStations || []);
      toast({
        title: "Entreprise mise à jour",
        description: "Les informations ont été mises à jour avec succès.",
      });
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  // Generate final risks table
  const generateFinalTable = async () => {
    if (!company) return;
    
    setIsGeneratingFinalRisks(true);
    const allRisks: Risk[] = [];
    
    try {
      // Generate risks for each location
      for (const location of locations) {
        if (location.name.trim()) {
          const response = await apiRequest('/api/generate-risks', {
            method: 'POST',
            body: JSON.stringify({
              workUnitName: location.name,
              locationName: location.name,
              companyActivity: company.activity,
            }),
          });
          
          response.risks.forEach((risk: Risk) => {
            allRisks.push({
              ...risk,
              source: location.name,
              sourceType: 'Lieu'
            });
          });
        }
      }
      
      // Generate risks for each work station
      for (const workStation of workStations) {
        if (workStation.name.trim()) {
          const response = await apiRequest('/api/generate-risks', {
            method: 'POST',
            body: JSON.stringify({
              workUnitName: workStation.name,
              locationName: workStation.description || workStation.name,
              companyActivity: company.activity,
            }),
          });
          
          response.risks.forEach((risk: Risk) => {
            allRisks.push({
              ...risk,
              source: workStation.name,
              sourceType: 'Poste'
            });
          });
        }
      }
      
      setFinalRisks(allRisks);
      toast({
        title: "Tableau final généré",
        description: `${allRisks.length} risques consolidés dans le tableau final.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le tableau final des risques.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFinalRisks(false);
    }
  };

  // Check if final table can be generated
  const canGenerateFinalTable = () => {
    return (
      locations.some(loc => loc.name.trim()) || 
      workStations.some(ws => ws.name.trim())
    );
  };

  // Export functions
  const exportToExcel = async () => {
    try {
      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risks: finalRisks,
          companyName: company?.name || 'Export'
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DUERP_${company?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier Excel a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter en Excel.",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risks: finalRisks,
          companyName: company?.name || 'Export',
          companyActivity: company?.activity || 'Non renseigné'
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DUERP_${company?.name || 'Export'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier PDF a été téléchargé avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter en PDF.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold">Générateur de DUERP</h1>
            <p className="text-muted-foreground">
              Créez votre Document Unique d'Évaluation des Risques avec l'aide de l'IA
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AutoSaveIndicator 
              lastSaved={lastSaved} 
              hasUnsavedChanges={hasUnsavedChanges}
              isAutoSaving={createCompanyMutation.isPending}
            />
          </div>
        </div>

        <Tabs defaultValue="creation" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="creation" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Création
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Analyse IA
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Company Form */}
              <div className="lg:col-span-2">
                <CompanyForm
                  onSubmit={handleCompanySubmit}
                  isLoading={createCompanyMutation.isPending || isGeneratingFinalRisks}
                  initialData={company}
                  locations={locations}
                  workStations={workStations}
                />
              </div>

              {/* Actions Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={generateFinalTable}
                      disabled={!canGenerateFinalTable() || isGeneratingFinalRisks}
                      className="w-full transition-all hover:scale-105"
                    >
                      {isGeneratingFinalRisks ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Générer le tableau des risques
                        </>
                      )}
                    </Button>
                    
                    {finalRisks.length > 0 && (
                      <div className="space-y-2">
                        <Button
                          onClick={exportToExcel}
                          variant="outline"
                          className="w-full transition-all hover:scale-105"
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Exporter Excel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Stats */}
                {finalRisks.length > 0 && (
                  <StatsCards 
                    stats={{
                      totalCompanies: company ? 1 : 0,
                      totalDocuments: company ? 1 : 0,
                      pendingActions: 0,
                      expiringSoon: 0,
                      completedActions: 0,
                      riskScore: 85
                    }}
                    risks={finalRisks}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PhotoAnalysis
                onRisksDetected={(risks) => setFinalRisks(prev => [...prev, ...risks])}
                companyActivity={company?.activity || ''}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Analyse automatique</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    L'IA analyse vos photos pour détecter automatiquement les risques et suggérer des mesures de prévention adaptées.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">✓ Détection d'obstacles</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">✓ Risques électriques</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">✓ Postures de travail</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">✓ Équipements de protection</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <SmartSuggestions
              risks={finalRisks}
              companyActivity={company?.activity || ''}
              onAddSuggestion={(suggestion) => {
                setPreventionMeasures(prev => [...prev, suggestion]);
                setHasUnsavedChanges(true);
              }}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <VersionHistory
              companyId={company?.id}
              onRestore={(version) => {
                toast({
                  title: "Version restaurée",
                  description: `Document restauré à la version ${version.version}`,
                });
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Risk Table */}
        {finalRisks.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tableau des risques consolidé
                  <Badge variant="secondary">{finalRisks.length} risques</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskTable risks={finalRisks} showSource={true} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      </div>
    );
}