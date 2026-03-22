import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Plus, Edit, Trash2, Eye, HelpCircle } from "lucide-react";

export function RiskModificationGuide() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Info className="h-5 w-5" />
          Comment modifier vos risques
        </CardTitle>
        <CardDescription className="text-blue-700">
          Vous pouvez maintenant modifier individuellement chaque risque de votre tableau
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Ajouter un risque</span>
            </div>
            <p className="text-sm text-gray-600">
              Cliquez sur "Ajouter un risque" pour créer un nouveau risque personnalisé
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Modifier un risque</span>
            </div>
            <p className="text-sm text-gray-600">
              Utilisez le bouton d'édition sur chaque risque pour le modifier
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Supprimer un risque</span>
            </div>
            <p className="text-sm text-gray-600">
              Cliquez sur le bouton de suppression pour retirer un risque
            </p>
          </div>
        </div>
        
        <Alert>
          <HelpCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Astuce :</strong> Toutes les modifications sont automatiquement sauvegardées. 
            Vous pouvez aussi régénérer complètement les risques si nécessaire.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}