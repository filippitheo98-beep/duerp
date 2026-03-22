import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, Clock, User, RotateCcw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VersionHistoryItem {
  id: string;
  version: string;
  timestamp: Date;
  author: string;
  changes: string[];
  risksCount: number;
  locationsCount: number;
  workStationsCount: number;
}

interface VersionHistoryProps {
  companyId?: number;
  onRestore?: (version: VersionHistoryItem) => void;
}

export function VersionHistory({ companyId, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      loadVersionHistory();
    }
  }, [companyId]);

  const loadVersionHistory = async () => {
    setIsLoading(true);
    try {
      // Simulation de l'historique des versions
      const mockVersions: VersionHistoryItem[] = [
        {
          id: 'v1',
          version: '1.0.0',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          author: 'Utilisateur actuel',
          changes: ['Création du document', 'Ajout de 2 lieux', 'Ajout de 1 poste de travail'],
          risksCount: 12,
          locationsCount: 2,
          workStationsCount: 1
        },
        {
          id: 'v2',
          version: '1.1.0',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          author: 'Utilisateur actuel',
          changes: ['Génération des risques automatique', 'Ajout de mesures de prévention'],
          risksCount: 18,
          locationsCount: 2,
          workStationsCount: 1
        },
        {
          id: 'v3',
          version: '1.2.0',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          author: 'Utilisateur actuel',
          changes: ['Ajout de suggestions IA', 'Analyse photo intégrée', 'Nouvelles mesures de prévention'],
          risksCount: 25,
          locationsCount: 3,
          workStationsCount: 2
        }
      ];

      setVersions(mockVersions);
    } catch (error) {
      console.error('Error loading version history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des versions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = (version: VersionHistoryItem) => {
    if (onRestore) {
      onRestore(version);
      toast({
        title: "Version restaurée",
        description: `Le document a été restauré à la version ${version.version}`,
      });
    }
  };

  const handlePreview = (version: VersionHistoryItem) => {
    toast({
      title: "Aperçu de la version",
      description: `Affichage de la version ${version.version} (fonctionnalité à venir)`,
    });
  };

  if (!companyId) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            Historique des versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Créez d'abord une entreprise pour voir l'historique des versions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-500" />
          Historique des versions
          <Badge variant="secondary">
            {versions.length} version{versions.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Chargement...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version, index) => (
              <div key={version.id} className="relative">
                {index < versions.length - 1 && (
                  <div className="absolute left-4 top-12 w-0.5 h-full bg-border"></div>
                )}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">Version {version.version}</h4>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Actuelle
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(version)}
                          className="h-7 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {index > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRestore(version)}
                            className="h-7 px-2"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{version.author}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(version.timestamp, "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {version.changes.map((change, changeIndex) => (
                        <p key={changeIndex} className="text-xs text-muted-foreground">
                          • {change}
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {version.risksCount} risques
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {version.locationsCount} lieux
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {version.workStationsCount} postes
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}