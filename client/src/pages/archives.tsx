import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  Archive, 
  Search, 
  Calendar, 
  Building, 
  Eye,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Header } from '@/components/Header';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ArchivedDocument {
  id: number;
  companyName: string;
  createdAt: string;
  archivedAt: string;
  status: 'archived';
  riskCount: number;
}

export default function Archives() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleViewDocument = (documentId: number) => {
    setLocation(`/duerp-generator?viewDocumentId=${documentId}`);
  };

  const { data: archivedDocuments, isLoading } = useQuery({
    queryKey: ['/api/archived-documents'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const restoreMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest(`/api/duerp-documents/${documentId}/unarchive`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/archived-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document restauré",
        description: "Le document a été restauré avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de restaurer le document",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest(`/api/duerp-documents/${documentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/archived-documents'] });
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé définitivement",
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

  const filteredDocuments = archivedDocuments?.filter((doc: ArchivedDocument) =>
    doc.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Archives</h1>
            <p className="text-muted-foreground">
              Consultez et restaurez vos documents DUERP archivés
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les archives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Archived Documents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-300 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Aucun document archivé</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Aucun document archivé ne correspond à votre recherche."
                : "Vous n'avez pas encore archivé de document."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc: ArchivedDocument) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow border-muted">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {doc.companyName}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        <Archive className="h-3 w-3 mr-1" />
                        Archivé
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Créé le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Archive className="h-4 w-4" />
                      Archivé le {new Date(doc.archivedAt).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-4 w-4" />
                      {doc.riskCount} risques identifiés
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewDocument(doc.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => restoreMutation.mutate(doc.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}