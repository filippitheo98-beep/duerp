import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  Settings,
  Save,
  FolderOpen,
  Plus,
  RotateCcw
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
import { DocumentTitleInput } from '@/components/DocumentTitleInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [location] = useLocation();
  
  // Get document ID from URL query
  const urlParams = new URLSearchParams(window.location.search);
  const editDocumentId = urlParams.get('edit') || urlParams.get('editDocumentId');
  const viewDocumentId = urlParams.get('view') || urlParams.get('viewDocumentId');
  const documentId = editDocumentId || viewDocumentId;
  const isViewMode = !!viewDocumentId;
  
  console.log("URL params:", { 
    location, 
    windowLocation: window.location.href,
    search: window.location.search,
    editDocumentId, 
    viewDocumentId, 
    documentId, 
    isViewMode 
  });
  
  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [finalRisks, setFinalRisks] = useState<Risk[]>([]);
  const [isGeneratingFinalRisks, setIsGeneratingFinalRisks] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [preventionMeasures, setPreventionMeasures] = useState<PreventionMeasure[]>([]);
  const [duerpTitle, setDuerpTitle] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isTitleValid, setIsTitleValid] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  
  // Load existing document query
  const { data: existingDocument, isLoading: isLoadingDocument } = useQuery({
    queryKey: ['/api/duerp/document', documentId],
    queryFn: async () => {
      console.log("Fetching document with ID:", documentId);
      const response = await apiRequest(`/api/duerp/document/${documentId}`, {
        method: 'GET',
      });
      console.log("API response:", response);
      return response;
    },
    enabled: !!documentId,
  });

  // Load company data when we have a document with companyId
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['/api/companies', existingDocument?.companyId],
    queryFn: async () => {
      console.log("Fetching company with ID:", existingDocument?.companyId);
      const response = await apiRequest(`/api/companies/${existingDocument.companyId}`, {
        method: 'GET',
      });
      console.log("Company API response:", response);
      return response;
    },
    enabled: !!existingDocument?.companyId,
  });

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
      setLastSaved(new Date());
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

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/duerp/document/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (updatedDocument) => {
      setLastSaved(new Date());
      toast({
        title: "Document modifié",
        description: "Le document DUERP a été modifié avec succès.",
      });
    },
    onError: (error) => {
      console.error("Error updating document:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le document DUERP.",
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
      setLastSaved(new Date());
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
              companyDescription: company.description
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
              companyDescription: company.description
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

  // Generate additional risks (keeping existing ones)
  const generateAdditionalRisks = async () => {
    if (!company) return;
    
    setIsGeneratingFinalRisks(true);
    const newRisks: Risk[] = [];
    
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
              companyDescription: company.description
            }),
          });
          
          response.risks.forEach((risk: Risk) => {
            newRisks.push({
              ...risk,
              id: crypto.randomUUID(), // Ensure unique IDs
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
              companyDescription: company.description
            }),
          });
          
          response.risks.forEach((risk: Risk) => {
            newRisks.push({
              ...risk,
              id: crypto.randomUUID(), // Ensure unique IDs
              source: workStation.name,
              sourceType: 'Poste'
            });
          });
        }
      }
      
      // Add new risks to existing ones
      const updatedRisks = [...finalRisks, ...newRisks];
      setFinalRisks(updatedRisks);
      
      // If document exists, update it
      if (documentId) {
        await apiRequest(`/api/duerp/document/${documentId}/risks`, {
          method: 'POST',
          body: JSON.stringify({ risks: newRisks }),
        });
      }
      
      toast({
        title: "Nouveaux risques ajoutés",
        description: `${newRisks.length} nouveaux risques ajoutés. Total: ${updatedRisks.length} risques.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les nouveaux risques.",
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
    setIsExportingExcel(true);
    try {
      const id = documentId ? parseInt(documentId, 10) : null;
      let response: Response;
      let filename: string;
      const dateStr = new Date().toISOString().split('T')[0];

      if (id && !isNaN(id)) {
        // Document sauvegardé : GET direct (fichier duerp_risques_<id>_<date>.xlsx)
        response = await fetch(`/api/duerp/document/${id}/risks/export.xlsx`, {
          method: 'GET',
          credentials: 'include',
        });
        filename = `duerp_risques_${id}_${dateStr}.xlsx`;
      } else {
        // Document non sauvegardé : POST avec risques en mémoire
        response = await fetch('/api/export/excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risks: finalRisks,
            companyName: company?.name || 'Export'
          }),
          credentials: 'include',
        });
        filename = `DUERP_${company?.name || 'Export'}_${dateStr}.xlsx`;
      }

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Save DUERP document mutation
  const saveDuerpMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!company) {
        throw new Error("Aucune entreprise sélectionnée");
      }
      
      const response = await apiRequest('/api/duerp/save', {
        method: 'POST',
        body: JSON.stringify({
          companyId: company.id,
          title,
          locations,
          workStations,
          finalRisks,
          preventionMeasures
        }),
      });
      return response;
    },
    onSuccess: (savedDocument) => {
      setShowSaveDialog(false);
      setDuerpTitle("");
      toast({
        title: "Document sauvegardé",
        description: "Le document DUERP a été sauvegardé avec succès.",
      });
      // Refresh saved documents list
      loadSavedDocuments();
    },
    onError: (error) => {
      let errorMessage = "Une erreur s'est produite lors de la sauvegarde du document.";
      
      // Vérifier si c'est une erreur d'unicité du nom
      if (error.message.includes("existe déjà")) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur de sauvegarde",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Load saved documents function
  const loadSavedDocuments = async () => {
    if (!company) return;
    
    try {
      const documents = await apiRequest(`/api/duerp/${company.id}`);
      setSavedDocuments(documents);
    } catch (error) {
      console.error('Error loading saved documents:', error);
    }
  };

  // Handle save DUERP
  const handleSaveDuerp = () => {
    if (!company) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord créer une entreprise.",
        variant: "destructive",
      });
      return;
    }
    
    if (finalRisks.length === 0) {
      toast({
        title: "Erreur",
        description: "Générez d'abord le tableau des risques avant de sauvegarder.",
        variant: "destructive",
      });
      return;
    }
    
    if (isEditing && editingDocumentId) {
      // Auto-save for editing mode
      updateDocumentMutation.mutate({
        id: editingDocumentId,
        title: duerpTitle || existingDocument?.title || "Document DUERP",
        companyId: company.id,
        locations,
        workStations,
        finalRisks,
        preventionMeasures,
        nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    } else {
      setShowSaveDialog(true);
    }
  };

  // Handle load saved document
  const handleLoadDocument = async (documentId: number) => {
    try {
      const document = await apiRequest(`/api/duerp/document/${documentId}`);
      
      // Load document data into current state
      setLocations(document.locations || []);
      setWorkStations(document.workStations || []);
      setFinalRisks(document.finalRisks || []);
      setPreventionMeasures(document.preventionMeasures || []);
      
      toast({
        title: "Document chargé",
        description: `Le document "${document.title}" a été chargé avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le document.",
        variant: "destructive",
      });
    }
  };

  // Load saved documents when company changes
  useEffect(() => {
    if (company) {
      loadSavedDocuments();
    }
  }, [company]);

  // Effect to load existing document for editing/viewing
  useEffect(() => {
    if (existingDocument && !isLoadingDocument) {
      console.log("Loading document:", existingDocument);
      setLocations(existingDocument.locations || []);
      setWorkStations(existingDocument.workStations || []);
      setFinalRisks(existingDocument.finalRisks || []);
      setPreventionMeasures(existingDocument.preventionMeasures || []);
      setDuerpTitle(existingDocument.title || "");
      setIsEditing(!!editDocumentId);
      setEditingDocumentId(existingDocument.id);
      
      console.log("Loaded data:", {
        locations: existingDocument.locations,
        workStations: existingDocument.workStations,
        finalRisks: existingDocument.finalRisks,
        company: existingDocument.company
      });
    }
  }, [existingDocument, isLoadingDocument, editDocumentId]);

  // Effect to load company data when available
  useEffect(() => {
    if (companyData && !isLoadingCompany) {
      console.log("Loading company data:", companyData);
      setCompany(companyData);
    }
  }, [companyData, isLoadingCompany]);

  if (isLoading || isLoadingDocument || isLoadingCompany) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/30">
      <Header />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg animate-bounce-soft">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {isViewMode ? "Visualisation du DUERP" : isEditing ? "Modifier le DUERP" : "Générateur de DUERP"}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {isViewMode 
                    ? `Consultez votre Document Unique d'Évaluation des Risques "${duerpTitle}"` 
                    : isEditing 
                    ? `Modifiez votre Document Unique d'Évaluation des Risques "${duerpTitle}"` 
                    : "Créez votre Document Unique d'Évaluation des Risques avec l'aide de l'IA"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-card p-4 rounded-xl">
              <AutoSaveIndicator 
                lastSaved={lastSaved || undefined} 
                hasUnsavedChanges={hasUnsavedChanges}
                isAutoSaving={createCompanyMutation.isPending}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="creation" className="w-full">
          <TabsList className={`grid w-full ${isViewMode ? 'grid-cols-2' : 'grid-cols-4'} bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border shadow-lg rounded-xl p-1`}>
            <TabsTrigger value="creation" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all hover-lift">
              <Shield className="h-4 w-4" />
              {isViewMode ? 'Document' : 'Création'}
            </TabsTrigger>
            {!isViewMode && (
              <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all hover-lift">
                <Camera className="h-4 w-4" />
                Analyse IA
              </TabsTrigger>
            )}
            <TabsTrigger value="suggestions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white transition-all hover-lift">
              <Lightbulb className="h-4 w-4" />
              {isViewMode ? 'Infos' : 'Suggestions'}
            </TabsTrigger>
            {!isViewMode && (
              <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all hover-lift">
                <History className="h-4 w-4" />
                Historique
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="creation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Company Form */}
              <div className="lg:col-span-2">
                {!isViewMode && (
                  <CompanyForm
                    onSubmit={handleCompanySubmit}
                    isLoading={createCompanyMutation.isPending || isGeneratingFinalRisks || updateDocumentMutation.isPending}
                    initialData={company}
                    locations={locations}
                    workStations={workStations}
                  />
                )}
                
                {/* Company Info Display for View Mode */}
                {isViewMode && company && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Informations de l'entreprise</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="font-semibold">Nom:</span> {company.name}
                        </div>
                        <div>
                          <span className="font-semibold">Secteur d'activité:</span> {company.activity}
                        </div>
                        <div>
                          <span className="font-semibold">Adresse:</span> {company.address || "Non renseigné"}
                        </div>
                        <div>
                          <span className="font-semibold">Nombre d'employés:</span> {company.employeeCount || "Non renseigné"}
                        </div>
                        <div>
                          <span className="font-semibold">Email:</span> {company.email || "Non renseigné"}
                        </div>
                        <div>
                          <span className="font-semibold">Téléphone:</span> {company.phone || "Non renseigné"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isViewMode ? (
                      <div className="space-y-2">
                        <Button
                          onClick={exportToExcel}
                          disabled={isExportingExcel}
                          variant="outline"
                          className="w-full transition-all hover:scale-105"
                        >
                          {isExportingExcel ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                              Export...
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Exporter Excel
                            </>
                          )}
                        </Button>
                        
                        <Button
                          onClick={() => window.location.href = `/duerp-generator?edit=${documentId}`}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Modifier ce document
                        </Button>
                      </div>
                    ) : (
                      <>
                        {finalRisks.length === 0 ? (
                          <Button
                            onClick={generateFinalTable}
                            disabled={!canGenerateFinalTable() || isGeneratingFinalRisks}
                            className="w-full btn-gradient transition-all hover-lift py-6 relative overflow-hidden"
                          >
                            {isGeneratingFinalRisks ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                <span className="font-medium">Génération en cours...</span>
                                <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                              </>
                            ) : (
                              <>
                                <Shield className="h-5 w-5 mr-2" />
                                <span className="font-medium">Générer le tableau des risques</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <Button
                              onClick={generateAdditionalRisks}
                              disabled={!canGenerateFinalTable() || isGeneratingFinalRisks}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all hover-lift py-4"
                            >
                              {isGeneratingFinalRisks ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  <span className="font-medium">Ajout en cours...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  <span className="font-medium">Ajouter de nouveaux risques</span>
                                </>
                              )}
                            </Button>
                            
                            <Button
                              onClick={generateFinalTable}
                              disabled={!canGenerateFinalTable() || isGeneratingFinalRisks}
                              variant="outline"
                              className="w-full border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all hover-lift py-4"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              <span className="font-medium">Régénérer tout le tableau</span>
                            </Button>
                          </div>
                        )}
                        
                        {finalRisks.length > 0 && (
                          <div className="space-y-2">
                            <Button
                              onClick={exportToExcel}
                              disabled={isExportingExcel}
                              variant="outline"
                              className="w-full border-2 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all hover-lift py-4"
                            >
                              {isExportingExcel ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2" />
                                  <span className="font-medium">Export...</span>
                                </>
                              ) : (
                                <>
                                  <FileSpreadsheet className="h-5 w-5 mr-2" />
                                  <span className="font-medium">Exporter Excel</span>
                                </>
                              )}
                            </Button>
                            
                            <Button
                              onClick={handleSaveDuerp}
                              disabled={saveDuerpMutation.isPending}
                              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all hover-lift py-4"
                            >
                              <Save className="h-5 w-5 mr-2" />
                              <span className="font-medium">{saveDuerpMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder DUERP'}</span>
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Saved Documents */}
                {savedDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Documents sauvegardés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {savedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium text-sm">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadDocument(doc.id)}
                            >
                              Charger
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

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
      
      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder le document DUERP</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre document DUERP pour le sauvegarder et pouvoir le consulter plus tard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <DocumentTitleInput
              value={duerpTitle}
              onChange={setDuerpTitle}
              onValidation={setIsTitleValid}
              companyName={company?.name}
              companyId={company?.id}
              placeholder="Ex: DUERP Mars 2024"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (duerpTitle.trim() && isTitleValid) {
                  saveDuerpMutation.mutate(duerpTitle.trim());
                }
              }}
              disabled={!duerpTitle.trim() || !isTitleValid || saveDuerpMutation.isPending}
            >
              {saveDuerpMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}