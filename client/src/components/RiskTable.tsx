import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import type { Risk } from "@shared/schema";

interface RiskTableProps {
  risks: Risk[];
  showSource?: boolean;
  documentId?: number;
  onRisksUpdated?: (risks: Risk[]) => void;
  canEdit?: boolean;
}

import { SimpleRiskActions } from './SimpleRiskActions';

export default function RiskTable({ 
  risks, 
  showSource = false, 
  documentId,
  onRisksUpdated,
  canEdit = false
}: RiskTableProps) {
  const getGravityColor = (gravity: string) => {
    switch (gravity) {
      case 'Faible': return 'bg-green-100 text-green-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Grave': return 'bg-orange-100 text-orange-800';
      case 'Très Grave': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'Annuelle': return 'bg-green-100 text-green-800';
      case 'Mensuelle': return 'bg-blue-100 text-blue-800';
      case 'Hebdomadaire': return 'bg-yellow-100 text-yellow-800';
      case 'Journalière': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getControlColor = (control: string) => {
    switch (control) {
      case 'Très élevée': return 'bg-green-100 text-green-800';
      case 'Élevée': return 'bg-blue-100 text-blue-800';
      case 'Moyenne': return 'bg-yellow-100 text-yellow-800';
      case 'Absente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Priorité 4 (Faible)': return 'bg-green-100 text-green-800';
      case 'Priorité 3 (Modéré)': return 'bg-yellow-100 text-yellow-800';
      case 'Priorité 2 (Moyenne)': return 'bg-orange-100 text-orange-800';
      case 'Priorité 1 (Forte)': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (risks.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-slate-900 mb-3">Évaluation des risques professionnels</h4>
        <p className="text-sm text-slate-600">Aucun risque généré. Cliquez sur "Générer les risques" pour analyser cette unité de travail.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4 mb-6">
      <h4 className="font-medium text-slate-900 mb-3">Évaluation des risques professionnels</h4>
      
      {/* Bouton d'ajout de risque */}
      {canEdit && (
        <div className="mb-4 flex justify-end">
          <SimpleRiskActions 
            risks={risks}
            documentId={documentId}
            onRisksUpdated={onRisksUpdated || (() => {})}
            canEdit={canEdit}
          />
        </div>
      )}
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {showSource && <TableHead className="font-medium text-slate-700">Source</TableHead>}
              <TableHead className="font-medium text-slate-700">Risque</TableHead>
              <TableHead className="font-medium text-slate-700">Danger potentiel</TableHead>
              <TableHead className="font-medium text-slate-700">Gravité</TableHead>
              <TableHead className="font-medium text-slate-700">Fréquence</TableHead>
              <TableHead className="font-medium text-slate-700">Maîtrise</TableHead>
              <TableHead className="font-medium text-slate-700">Score</TableHead>
              <TableHead className="font-medium text-slate-700">Priorité</TableHead>
              <TableHead className="font-medium text-slate-700">Mesures existantes</TableHead>
              {canEdit && <TableHead className="font-medium text-slate-700 w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((risk) => (
              <TableRow key={risk.id} className="hover:bg-slate-50">
                {showSource && (
                  <TableCell className="font-medium text-slate-900">
                    <Badge variant="outline" className={risk.sourceType === 'Lieu' ? 'border-blue-300 text-blue-700' : 'border-orange-300 text-orange-700'}>
                      {risk.sourceType}: {risk.source}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="font-medium text-slate-900">{risk.type}</TableCell>
                <TableCell className="text-slate-700">{risk.danger}</TableCell>
                <TableCell>
                  <Badge className={getGravityColor(risk.gravity)} variant="secondary">
                    {risk.gravity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getFrequencyColor(risk.frequency)} variant="secondary">
                    {risk.frequency}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getControlColor(risk.control)} variant="secondary">
                    {risk.control}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-center font-mono text-sm">
                    {risk.riskScore ? Math.round(risk.riskScore * 100) / 100 : 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getPriorityColor(risk.priority)} variant="secondary">
                    {risk.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-700">{risk.measures}</TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Déclencher l'édition du risque
                          const event = new CustomEvent('editRisk', { detail: risk });
                          window.dispatchEvent(event);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Déclencher la suppression du risque
                          const event = new CustomEvent('deleteRisk', { detail: risk.id });
                          window.dispatchEvent(event);
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
