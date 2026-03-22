import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';

interface SelectiveUpdateButtonProps {
  existingRisksCount: number;
  hasExistingDocument: boolean;
  onSelectiveUpdate: () => void;
  onFullRegenerate: () => void;
  isGenerating: boolean;
}

export function SelectiveUpdateButton({
  existingRisksCount,
  hasExistingDocument,
  onSelectiveUpdate,
  onFullRegenerate,
  isGenerating
}: SelectiveUpdateButtonProps) {
  if (!hasExistingDocument) {
    return (
      <Button
        onClick={onFullRegenerate}
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Générer le tableau des risques
          </>
        )}
      </Button>
    );
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <AlertTriangle className="h-5 w-5" />
          Document existant détecté
        </CardTitle>
        <CardDescription className="text-blue-700">
          Vous avez déjà un document avec {existingRisksCount} risques. 
          Choisissez comment procéder avec la nouvelle génération.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={onSelectiveUpdate}
            disabled={isGenerating}
            variant="outline"
            className="h-auto p-4 text-left flex-col items-start bg-white hover:bg-blue-50 border-blue-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Mise à jour sélective</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Ajouter ou modifier des risques spécifiques sans tout régénérer
            </p>
            <Badge variant="secondary" className="mt-2">
              Recommandé
            </Badge>
          </Button>
          
          <Button
            onClick={onFullRegenerate}
            disabled={isGenerating}
            variant="outline"
            className="h-auto p-4 text-left flex-col items-start bg-white hover:bg-orange-50 border-orange-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4" />
              <span className="font-medium">Régénération complète</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Remplacer tous les risques existants par une nouvelle génération
            </p>
            <Badge variant="outline" className="mt-2">
              Écrasera les données
            </Badge>
          </Button>
        </div>
        
        {isGenerating && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              Génération en cours...
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}