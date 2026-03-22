import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import StepperDuerp from '@/components/StepperDuerp';
import CompanyInfoStep from '@/components/steps/CompanyInfoStep';
import LocationsWorkstationsStep from '@/components/steps/LocationsWorkstationsStep';
import WorkstationSetupStep from '@/components/steps/WorkstationSetupStep';
import HierarchicalEditorStep from '@/components/steps/HierarchicalEditorStep';
import RiskGenerationStep from '@/components/steps/RiskGenerationStep';
import HierarchicalRiskSummaryStep from '@/components/steps/HierarchicalRiskSummaryStep';
import PreventionMeasuresStep from '@/components/steps/PreventionMeasuresStep';
import AnalyticsStep from '@/components/steps/AnalyticsStep';
import PlanActionStep from '@/components/steps/PlanActionStep';
import type { 
  Company, 
  Location, 
  WorkStation, 
  Risk,
  PreventionMeasure,
  Site,
  WorkUnit
} from '@shared/schema';
import { SelectiveUpdateModal } from '@/components/SelectiveUpdateModal';

export default function NewDuerpGenerator() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  
  // États principaux
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [duerpWorkUnits, setDuerpWorkUnits] = useState<WorkUnit[]>([]);
  const [preventionMeasures, setPreventionMeasures] = useState<PreventionMeasure[]>([]);
  const [finalRisks, setFinalRisks] = useState<Risk[]>([]);
  const [isGeneratingRisks, setIsGeneratingRisks] = useState(false);
  const [showSelectiveUpdateModal, setShowSelectiveUpdateModal] = useState(false);
  const [newGeneratedRisks, setNewGeneratedRisks] = useState<Risk[]>([]);
  const [savedDocumentId, setSavedDocumentId] = useState<number | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPlanExcel, setIsExportingPlanExcel] = useState(false);
  const initialLoadDone = useRef<string | null>(null);
  
  // Gestion du document (création/modification)
  const urlParams = new URLSearchParams(window.location.search);
  const editDocumentId = urlParams.get('edit') || urlParams.get('editDocumentId');
  const viewDocumentId = urlParams.get('view') || urlParams.get('viewDocumentId');
  const documentId = editDocumentId || viewDocumentId || (savedDocumentId ? String(savedDocumentId) : null);
  const isViewMode = !!viewDocumentId;
  const stepFromUrl = urlParams.get('step');
  const initialStep = stepFromUrl ? Math.min(5, Math.max(1, parseInt(stepFromUrl, 10))) : null;

  // Types pour les résultats de requêtes
  interface DuerpDocument {
    id: number;
    companyId: number;
    title: string;
    version?: string;
    status?: string;
    workUnitsData?: WorkUnit[];
    sites?: Site[];
    locations?: Location[];
    workStations?: WorkStation[];
    finalRisks?: Risk[];
    preventionMeasures?: PreventionMeasure[];
  }

  // Chargement du document existant
  const { data: existingDocument, isLoading: isLoadingDocument } = useQuery<DuerpDocument | null>({
    queryKey: ['/api/duerp/document', documentId],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!documentId,
  });

  const { data: existingCompany, isLoading: isLoadingCompany } = useQuery<Company | null>({
    queryKey: ['/api/companies', existingDocument?.companyId],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!existingDocument?.companyId,
  });

  useEffect(() => {
    const docKey = editDocumentId || viewDocumentId;
    if (existingDocument && existingCompany && initialLoadDone.current !== docKey) {
      initialLoadDone.current = docKey;
      setCompany(existingCompany);
      setLocations(existingDocument.locations || []);
      setWorkStations(existingDocument.workStations || []);
      setPreventionMeasures(existingDocument.preventionMeasures || []);
      setFinalRisks(existingDocument.finalRisks || []);
      setDuerpWorkUnits(existingDocument.workUnitsData || []);
      setIsFinalized(existingDocument.status === 'active');
      setSites(existingDocument.sites || []);
      
      const completed = [1];
      if ((existingDocument.workUnitsData?.length ?? 0) > 0 || (existingDocument.locations?.length ?? 0) > 0) {
        completed.push(2);
      }
      const hasUnitRisks = existingDocument.workUnitsData?.some(u => (u.risks?.length ?? 0) > 0);
      if (hasUnitRisks || (existingDocument.finalRisks?.length ?? 0) > 0) {
        completed.push(3, 4, 5); // 4 = plan d'action, 5 = analyse
      }
      setCompletedSteps(completed);
    }
  }, [existingDocument, existingCompany]);

  // Ouvrir directement sur l'étape demandée par l'URL (?step=4)
  const stepFromUrlRef = useRef<number | null>(null);
  if (stepFromUrlRef.current === null && initialStep != null && initialStep >= 1 && initialStep <= 5) {
    stepFromUrlRef.current = initialStep;
  }
  useEffect(() => {
    if (stepFromUrlRef.current != null) {
      setCurrentStep(stepFromUrlRef.current);
    }
  }, []);

  // Synchroniser finalRisks depuis les unités de travail
  useEffect(() => {
    const allRisksFromUnits = duerpWorkUnits.flatMap(u =>
      (u.risks || []).map(r => ({
        ...r,
        source: u.name,
        sourceType: r.sourceType || ('Lieu' as const),
      }))
    );
    if (allRisksFromUnits.length > 0) {
      setFinalRisks(allRisksFromUnits);
    }
  }, [duerpWorkUnits]);

  // Écouter les mises à jour de risques depuis le tableau
  useEffect(() => {
    const handleRisksUpdated = (event: CustomEvent) => {
      setFinalRisks(event.detail);
    };

    window.addEventListener('risksUpdated', handleRisksUpdated as EventListener);
    return () => {
      window.removeEventListener('risksUpdated', handleRisksUpdated as EventListener);
    };
  }, []);

  // Mutations pour sauvegarder
  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: any) => {
      const response = await apiRequest('/api/companies', {
        method: 'POST',
        body: JSON.stringify(companyData),
      });
      return response;
    },
    onSuccess: (newCompany) => {
      setCompany(newCompany);
      if (!completedSteps.includes(1)) {
        setCompletedSteps(prev => [...prev, 1]);
      }
      toast({
        title: "Société créée",
        description: "Les informations de la société ont été sauvegardées",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la société",
        variant: "destructive",
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (companyData: any) => {
      const response = await apiRequest(`/api/companies/${company?.id}`, {
        method: 'PUT',
        body: JSON.stringify(companyData),
      });
      return response;
    },
    onSuccess: (updatedCompany) => {
      setCompany(updatedCompany);
      toast({
        title: "Société mise à jour",
        description: "Les informations ont été sauvegardées",
      });
    },
  });

  // Mutation pour ajouter de nouveaux risques (en gardant les existants)
  const addNewRisksMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingRisks(true);
      const newRisks: Risk[] = [];
      
      // Générer les risques pour chaque lieu
      for (const location of locations) {
        const response = await apiRequest('/api/generate-risks', {
          method: 'POST',
          body: JSON.stringify({
            workUnitName: location.name,
            locationName: location.name,
            companyActivity: company?.activity || '',
            companyDescription: (company as any)?.description || '',
          }),
        });
        
        const locationRisks = response.risks.map((risk: Risk) => ({
          ...risk,
          id: crypto.randomUUID(), // Assurer des IDs uniques
          source: location.name,
          sourceType: 'Lieu' as const,
        }));
        
        newRisks.push(...locationRisks);
      }
      
      // Générer les risques pour chaque poste
      for (const workStation of workStations) {
        const response = await apiRequest('/api/generate-risks', {
          method: 'POST',
          body: JSON.stringify({
            workUnitName: workStation.name,
            locationName: workStation.description || workStation.name,
            companyActivity: company?.activity || '',
            companyDescription: (company as any)?.description || '',
          }),
        });
        
        const workStationRisks = response.risks.map((risk: Risk) => ({
          ...risk,
          id: crypto.randomUUID(), // Assurer des IDs uniques
          source: workStation.name,
          sourceType: 'Poste' as const,
        }));
        
        newRisks.push(...workStationRisks);
      }
      
      // Ajouter les nouveaux risques aux existants
      const updatedRisks = [...finalRisks, ...newRisks];
      setFinalRisks(updatedRisks);
      setIsGeneratingRisks(false);
      
      toast({
        title: "Nouveaux risques ajoutés",
        description: `${newRisks.length} nouveaux risques ajoutés. Total: ${updatedRisks.length} risques.`,
      });
      
      return newRisks;
    },
    onError: () => {
      setIsGeneratingRisks(false);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les nouveaux risques",
        variant: "destructive",
      });
    },
  });

  // Mutation pour ajouter des risques sélectifs (lieux/postes choisis)
  const addSelectiveRisksMutation = useMutation({
    mutationFn: async ({ selectedLocations, selectedWorkStations }: { 
      selectedLocations: Location[], 
      selectedWorkStations: WorkStation[] 
    }) => {
      setIsGeneratingRisks(true);
      const newRisks: Risk[] = [];
      
      // Générer les risques pour les lieux sélectionnés
      for (const location of selectedLocations) {
        const response = await apiRequest('/api/generate-risks', {
          method: 'POST',
          body: JSON.stringify({
            workUnitName: location.name,
            locationName: location.name,
            companyActivity: company?.activity || '',
            companyDescription: (company as any)?.description || '',
          }),
        });
        
        const locationRisks = response.risks.map((risk: Risk) => ({
          ...risk,
          id: crypto.randomUUID(), // Assurer des IDs uniques
          source: location.name,
          sourceType: 'Lieu' as const,
        }));
        
        newRisks.push(...locationRisks);
      }
      
      // Générer les risques pour les postes sélectionnés
      for (const workStation of selectedWorkStations) {
        const response = await apiRequest('/api/generate-risks', {
          method: 'POST',
          body: JSON.stringify({
            workUnitName: workStation.name,
            locationName: workStation.description || workStation.name,
            companyActivity: company?.activity || '',
            companyDescription: (company as any)?.description || '',
          }),
        });
        
        const workStationRisks = response.risks.map((risk: Risk) => ({
          ...risk,
          id: crypto.randomUUID(), // Assurer des IDs uniques
          source: workStation.name,
          sourceType: 'Poste' as const,
        }));
        
        newRisks.push(...workStationRisks);
      }
      
      // Ajouter les nouveaux risques aux existants
      const updatedRisks = [...finalRisks, ...newRisks];
      setFinalRisks(updatedRisks);
      setIsGeneratingRisks(false);
      
      const sourceNames = [
        ...selectedLocations.map(l => l.name),
        ...selectedWorkStations.map(w => w.name)
      ];
      
      toast({
        title: "Nouveaux risques ajoutés",
        description: `${newRisks.length} nouveaux risques ajoutés pour: ${sourceNames.join(', ')}. Total: ${updatedRisks.length} risques.`,
      });
      
      return newRisks;
    },
    onError: () => {
      setIsGeneratingRisks(false);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les nouveaux risques",
        variant: "destructive",
      });
    },
  });

  const saveDuerpMutation = useMutation({
    mutationFn: async (data: any) => {
      const docId = editDocumentId || viewDocumentId || (savedDocumentId ? String(savedDocumentId) : null);
      if (docId) {
        const response = await apiRequest(`/api/duerp/document/${docId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return response;
      } else {
        const response = await apiRequest('/api/duerp/save', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return response;
      }
    },
    onSuccess: (data: any) => {
      if (data?.id && !savedDocumentId) {
        setSavedDocumentId(data.id);
      }
      toast({
        title: "Document sauvegardé",
        description: "Votre DUERP a été sauvegardé avec succès",
      });
    },
    onError: (error: any) => {
      console.error('[SAVE ERROR]', error);
      toast({
        title: "Erreur de sauvegarde",
        description: error?.message || "Impossible de sauvegarder le document",
        variant: "destructive",
      });
    },
  });

  const generateRisksMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingRisks(true);
      const allRisks: Risk[] = [];
      
      // Générer les risques pour chaque lieu
      for (const location of locations) {
        const response = await apiRequest('/api/generate-risks', {
          method: 'POST',
          body: JSON.stringify({
            workUnitName: location.name,
            locationName: location.name,
            companyActivity: company?.activity || '',
            companyDescription: (company as any)?.description || '',
          }),
        });
        
        const locationRisks = response.risks.map((risk: Risk) => ({
          ...risk,
          source: location.name,
          sourceType: 'Lieu' as const,
        }));
        
        allRisks.push(...locationRisks);
      }
      
      // Générer les risques pour chaque poste
      for (const workStation of workStations) {
        const response = await apiRequest('/api/generate-risks', {
          method: 'POST',
          body: JSON.stringify({
            workUnitName: workStation.name,
            locationName: workStation.description || workStation.name,
            companyActivity: company?.activity || '',
            companyDescription: (company as any)?.description || '',
          }),
        });
        
        const workStationRisks = response.risks.map((risk: Risk) => ({
          ...risk,
          source: workStation.name,
          sourceType: 'Poste' as const,
        }));
        
        allRisks.push(...workStationRisks);
      }
      
      setFinalRisks(allRisks);
      setIsGeneratingRisks(false);
      
      if (!completedSteps.includes(3)) {
        setCompletedSteps(prev => [...prev, 3, 4]);
      }
      
      return allRisks;
    },
    onError: () => {
      setIsGeneratingRisks(false);
      toast({
        title: "Erreur",
        description: "Impossible de générer les risques",
        variant: "destructive",
      });
    },
  });

  // Handlers pour les étapes
  const handleCompanyInfoSubmit = (data: any) => {
    if (company) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
    setCurrentStep(2);
  };

  const handleSaveCompanyInfo = (data: any) => {
    if (company) {
      updateCompanyMutation.mutate(data);
    } else {
      createCompanyMutation.mutate(data);
    }
  };

  const handleLocationsUpdate = (newLocations: Location[]) => {
    setLocations(newLocations);
    if (!completedSteps.includes(2) && (newLocations.length > 0 || workStations.length > 0)) {
      setCompletedSteps(prev => [...prev, 2]);
    }
  };

  const handleWorkStationsUpdate = (newWorkStations: WorkStation[]) => {
    setWorkStations(newWorkStations);
    if (!completedSteps.includes(2) && (locations.length > 0 || newWorkStations.length > 0)) {
      setCompletedSteps(prev => [...prev, 2]);
    }
  };

  const handlePreventionMeasuresUpdate = (newMeasures: PreventionMeasure[]) => {
    setPreventionMeasures(newMeasures);
  };

  // Gestionnaires des mesures de prévention
  const handleAddPreventionMeasure = (measure: PreventionMeasure) => {
    setPreventionMeasures(prev => [...prev, measure]);
  };

  const handleUpdatePreventionMeasure = (measureId: string, updates: Partial<PreventionMeasure>) => {
    setPreventionMeasures(prev => 
      prev.map(m => m.id === measureId ? { ...m, ...updates } : m)
    );
  };

  const handleRemovePreventionMeasure = (measureId: string) => {
    setPreventionMeasures(prev => prev.filter(m => m.id !== measureId));
  };

  const handleGeneratePreventionRecommendations = async () => {
    if (!company || finalRisks.length === 0) return;

    try {
      const response = await apiRequest('/api/generate-prevention-recommendations', {
        method: 'POST',
        body: JSON.stringify({
          companyActivity: company.activity,
          risks: finalRisks,
          locations: locations,
          workStations: workStations
        }),
      });

      if (response.recommendations) {
        const newMeasures = response.recommendations.map((rec: any) => ({
          id: crypto.randomUUID(),
          description: rec.description,
          level: rec.level || 'Général',
          category: rec.category || 'Technique',
          priority: rec.priority || 'Moyenne',
          cost: rec.cost || 'Moyenne',
          effectiveness: rec.effectiveness || 'Moyenne',
          targetRiskIds: rec.targetRiskIds || [],
          locationId: rec.locationId,
          workStationId: rec.workStationId
        }));

        setPreventionMeasures(prev => [...prev, ...newMeasures]);
        
        toast({
          title: "Recommandations générées",
          description: `${newMeasures.length} mesures de prévention ont été générées automatiquement`,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la génération des recommandations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les recommandations automatiques",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzePhotos = async (photos: any[], locationOrWorkstation: string) => {
    // Ici on pourrait analyser les photos avec l'IA
    toast({
      title: "Analyse des photos",
      description: `Analyse des photos pour ${locationOrWorkstation} en cours...`,
    });
  };

  const doSave = async (): Promise<any> => {
    if (!company) throw new Error('Société manquante');
    const allRisksFromUnits = duerpWorkUnits.flatMap(u => (u.risks || []).map(r => ({ ...r, source: u.name, sourceType: 'Lieu' as const })));
    const risksToSave = allRisksFromUnits.length > 0 ? allRisksFromUnits : finalRisks;
    const data = {
      companyId: company.id,
      title: `${company.name} - DUERP`,
      workUnitsData: duerpWorkUnits,
      sites,
      locations,
      workStations,
      finalRisks: risksToSave,
      preventionMeasures,
    };
    const docId = editDocumentId || viewDocumentId || (savedDocumentId ? String(savedDocumentId) : null);
    if (docId) {
      return await apiRequest(`/api/duerp/document/${docId}`, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      return await apiRequest('/api/duerp/save', { method: 'POST', body: JSON.stringify(data) });
    }
  };

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const saveResult = await doSave();
      const docId = saveResult?.id || savedDocumentId || (editDocumentId ? parseInt(editDocumentId) : null);
      if (saveResult?.id && !savedDocumentId) {
        setSavedDocumentId(saveResult.id);
      }
      if (!docId) {
        throw new Error('Document non sauvegardé');
      }
      const response = await apiRequest(`/api/duerp-documents/${docId}/finalize`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: () => {
      setIsFinalized(true);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revisions/needed'] });
      toast({
        title: "DUERP finalisé",
        description: "Le document est enregistré et la prochaine révision est programmée dans un an.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de finalisation",
        description: error?.message || "Impossible de finaliser le document. Vérifiez que toutes les données sont remplies.",
        variant: "destructive",
      });
    },
  });

  const handleFinalize = () => {
    if (!company) {
      toast({
        title: "Impossible de finaliser",
        description: "Veuillez d'abord remplir les informations de la société",
        variant: "destructive",
      });
      return;
    }
    finalizeMutation.mutate();
  };

  const handleSaveProgress = () => {
    if (!company) {
      toast({
        title: "Impossible de sauvegarder",
        description: "Veuillez d'abord remplir les informations de la société (étape 1)",
        variant: "destructive",
      });
      return;
    }
    const allRisksFromUnits = duerpWorkUnits.flatMap(u => (u.risks || []).map(r => ({ ...r, source: u.name, sourceType: 'Lieu' as const })));
    const risksToSave = allRisksFromUnits.length > 0 ? allRisksFromUnits : finalRisks;
    saveDuerpMutation.mutate({
      companyId: company.id,
      title: `${company.name} - DUERP`,
      workUnitsData: duerpWorkUnits,
      sites,
      locations,
      workStations,
      finalRisks: risksToSave,
      preventionMeasures,
    });
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const id = documentId ? parseInt(documentId, 10) : null;
      let response: Response;
      let filename: string;
      const dateStr = new Date().toISOString().split('T')[0];

      if (id && !isNaN(id)) {
        response = await fetch(`/api/duerp/document/${id}/risks/export.xlsx`, {
          method: 'GET',
          credentials: 'include',
        });
        filename = `duerp_risques_${id}_${dateStr}.xlsx`;
      } else {
        response = await fetch('/api/export/excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            risks: finalRisks,
            companyName: company?.name || 'Entreprise',
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
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier Excel a été téléchargé avec succès",
      });
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

  const handleExportPlanExcel = async () => {
    const id = documentId ? parseInt(documentId, 10) : null;
    if (!id || isNaN(id)) {
      toast({
        title: "Export impossible",
        description: "Sauvegardez le DUERP pour exporter le plan d'action.",
        variant: "destructive",
      });
      return;
    }
    setIsExportingPlanExcel(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/duerp-documents/${id}/actions/export.xlsx`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plan_action_${id}_${dateStr}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export réussi",
        description: "Le plan d'action a été téléchargé.",
      });
    } catch {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le plan d'action en Excel",
        variant: "destructive",
      });
    } finally {
      setIsExportingPlanExcel(false);
    }
  };

  const handleExportWord = async () => {
    try {
      toast({
        title: "Génération en cours",
        description: "Création du document Word...",
      });

      const response = await fetch('/api/export/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risks: finalRisks,
          companyName: company?.name || 'Entreprise',
          companyActivity: company?.activity || '',
          companyData: {
            address: company?.address,
            siret: company?.siret,
            phone: company?.phone,
            email: company?.email,
            employeeCount: company?.employeeCount,
          },
          locations: locations,
          workStations: workStations,
          preventionMeasures: preventionMeasures
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DUERP_${company?.name || 'Export'}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export réussi",
          description: "Le document Word a été téléchargé avec succès",
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'export Word:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le fichier Word. Vérifiez que les risques sont générés.",
        variant: "destructive",
      });
    }
  };

  const isLoading = isLoadingDocument || isLoadingCompany;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StepperDuerp
          currentStep={currentStep}
          totalSteps={5}
          onStepChange={setCurrentStep}
          onSave={handleSaveProgress}
          isSaving={saveDuerpMutation.isPending}
          completedSteps={completedSteps}
          readOnly={isViewMode}
        />

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <>
            {currentStep === 1 && (
              <CompanyInfoStep
                onSubmit={handleCompanyInfoSubmit}
                onSave={handleSaveCompanyInfo}
                initialData={company}
                isLoading={createCompanyMutation.isPending || updateCompanyMutation.isPending}
                readOnly={isViewMode}
              />
            )}

            {currentStep === 2 && (
              <WorkstationSetupStep
                companyId={company?.id || 0}
                companyActivity={company?.activity || ''}
                companyDescription={company?.description || ''}
                workUnits={duerpWorkUnits}
                onUpdateWorkUnits={setDuerpWorkUnits}
                onSave={handleSaveProgress}
                readOnly={isViewMode}
              />
            )}

            {currentStep === 3 && (
              <HierarchicalEditorStep
                companyId={company?.id || 0}
                companyActivity={company?.activity || ''}
                companyDescription={company?.description || ''}
                workUnits={duerpWorkUnits}
                onUpdateWorkUnits={setDuerpWorkUnits}
                onSave={handleSaveProgress}
                onExportExcel={handleExportExcel}
                isExportingExcel={isExportingExcel}
                documentId={documentId}
                readOnly={isViewMode}
              />
            )}

            {currentStep === 4 && (
              <PlanActionStep
                documentId={documentId}
                workUnits={duerpWorkUnits}
                onSave={handleSaveProgress}
                onExportExcel={handleExportPlanExcel}
                isExportingExcel={isExportingPlanExcel}
                readOnly={isViewMode}
              />
            )}

            {currentStep === 5 && (
              <AnalyticsStep
                risks={finalRisks}
                companyName={company?.name || 'Entreprise'}
                onSave={handleSaveProgress}
                onGenerateWord={handleExportWord}
                onExportExcel={handleExportExcel}
                isExportingExcel={isExportingExcel}
                documentId={documentId}
                onFinalize={handleFinalize}
                isFinalized={isFinalized}
                isFinalizing={finalizeMutation.isPending}
                locations={locations}
                workStations={workStations}
                preventionMeasures={preventionMeasures}
                readOnly={isViewMode}
              />
            )}
          </>
        )}
      </div>

      {/* Modal de mise à jour sélective */}
      <SelectiveUpdateModal
        isOpen={showSelectiveUpdateModal}
        onClose={() => setShowSelectiveUpdateModal(false)}
        documentId={documentId ? parseInt(documentId) : 0}
        documentTitle={existingDocument?.title || `${company?.name} - DUERP`}
        existingRisks={finalRisks}
        newRisks={newGeneratedRisks}
        onUpdateComplete={() => {
          // Recharger le document après la mise à jour
          queryClient.invalidateQueries({ queryKey: ['/api/duerp/document', documentId] });
          toast({
            title: "Document mis à jour",
            description: "Les modifications ont été appliquées avec succès",
          });
        }}
      />
    </div>
  );
}