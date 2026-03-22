import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Search, 
  Calendar, 
  Building, 
  Plus,
  Eye,
  Edit,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/Header';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: number;
  title: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'expired' | 'draft';
  nextReviewDate: string;
  riskCount: number;
}

export default function Documents() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'draft'>('all');
  const [exportingPlanId, setExportingPlanId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const exportRisquesEtPlanExcel = async (documentId: number) => {
    setExportingPlanId(documentId);
    try {
      const response = await fetch(`/api/duerp-documents/${documentId}/export-risques-plan.xlsx`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Export échoué');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `duerp_risques_plan_${documentId}_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast({ title: 'Export réussi', description: 'Tableau des risques et plan d\'action ont été téléchargés.' });
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e?.message || 'Impossible d\'exporter.',
        variant: 'destructive',
      });
    } finally {
      setExportingPlanId(null);
    }
  };

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest(`/api/duerp-documents/${documentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revisions/needed'] });
      setDeleteConfirmId(null);
      toast({
        title: "Document supprimé",
        description: "Le DUERP a été supprimé définitivement.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive",
      });
    },
  });

  const annualUpdateMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await apiRequest(`/api/duerp-documents/${documentId}/annual-update`, {
        method: 'POST',
      });
      return response;
    },
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revisions/needed'] });
      toast({
        title: "Mise à jour annuelle effectuée",
        description: "La date de révision a été mise à jour. Vous pouvez maintenant modifier le document.",
      });
      navigate(`/duerp-generator?edit=${documentId}`);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la mise à jour annuelle",
        variant: "destructive",
      });
    },
  });

  const filteredDocuments = documents?.filter((doc: Document) => {
    const matchesSearch = 
      doc.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string, nextReviewDate: string) => {
    const isOverdue = nextReviewDate && new Date(nextReviewDate) < new Date();
    
    if (status === 'draft') {
      return <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Brouillon</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Révision requise</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Actif</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getDaysUntilReview = (nextReviewDate: string) => {
    if (!nextReviewDate) return null;
    const diff = Math.ceil((new Date(nextReviewDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activeCount = documents?.filter((d: Document) => d.status === 'active').length || 0;
  const draftCount = documents?.filter((d: Document) => d.status === 'draft').length || 0;
  const overdueCount = documents?.filter((d: Document) => d.nextReviewDate && new Date(d.nextReviewDate) < new Date()).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mes DUERP</h1>
            <p className="text-muted-foreground">
              Retrouvez et gérez vos Documents Uniques d'Évaluation des Risques
            </p>
          </div>
          <Button asChild>
            <Link href="/duerp-generator">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau DUERP
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{activeCount}</div>
                <div className="text-sm text-muted-foreground">Actifs</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{draftCount}</div>
                <div className="text-sm text-muted-foreground">Brouillons</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{overdueCount}</div>
                <div className="text-sm text-muted-foreground">Révision requise</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'draft', 'expired'] as const).map(filter => (
              <Button
                key={filter}
                variant={statusFilter === filter ? 'default' : 'outline'}
                onClick={() => setStatusFilter(filter)}
                size="sm"
              >
                {filter === 'all' ? 'Tous' : filter === 'active' ? 'Actifs' : filter === 'draft' ? 'Brouillons' : 'Expirés'}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun DUERP trouvé</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? "Aucun document ne correspond à vos critères."
                : "Vous n'avez pas encore créé de DUERP."}
            </p>
            <Button asChild>
              <Link href="/duerp-generator">
                <Plus className="h-4 w-4 mr-2" />
                Créer votre premier DUERP
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc: Document) => {
              const daysUntilReview = getDaysUntilReview(doc.nextReviewDate);
              const isOverdue = daysUntilReview !== null && daysUntilReview < 0;
              const isDueSoon = daysUntilReview !== null && daysUntilReview >= 0 && daysUntilReview <= 30;
              
              return (
                <Card key={doc.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200' : isDueSoon ? 'border-yellow-200' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold text-lg">{doc.title}</h3>
                          {getStatusBadge(doc.status, doc.nextReviewDate)}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Créé le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            {doc.riskCount} risques
                          </span>
                          {doc.nextReviewDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : isDueSoon ? 'text-yellow-600' : ''}`}>
                              <RefreshCw className="h-3.5 w-3.5" />
                              {isOverdue 
                                ? `Révision en retard de ${Math.abs(daysUntilReview!)} jours`
                                : `Prochaine révision dans ${daysUntilReview} jours`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/duerp-generator?view=${doc.id}`}>
                            <Eye className="h-4 w-4 mr-1.5" />
                            Visualiser
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/duerp-generator?edit=${doc.id}`}>
                            <Edit className="h-4 w-4 mr-1.5" />
                            Modifier
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportRisquesEtPlanExcel(doc.id)}
                          disabled={exportingPlanId === doc.id}
                        >
                          {exportingPlanId === doc.id ? (
                            <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                          )}
                          Export Excel (risques et plan d&apos;action)
                        </Button>
                        {doc.status === 'active' && (
                          <Button 
                            size="sm"
                            variant={isOverdue ? 'destructive' : 'default'}
                            onClick={() => annualUpdateMutation.mutate(doc.id)}
                            disabled={annualUpdateMutation.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1.5 ${annualUpdateMutation.isPending ? 'animate-spin' : ''}`} />
                            Mise à jour annuelle
                          </Button>
                        )}
                        <AlertDialog open={deleteConfirmId === doc.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteConfirmId(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Supprimer
                          </Button>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer définitivement le document « {doc.title} » ? 
                                  Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.preventDefault();
                                    deleteDocumentMutation.mutate(doc.id);
                                  }}
                                  disabled={deleteDocumentMutation.isPending}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deleteDocumentMutation.isPending ? 'Suppression...' : 'Supprimer définitivement'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}