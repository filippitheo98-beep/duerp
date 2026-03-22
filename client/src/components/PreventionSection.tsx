import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, X, CheckCircle } from "lucide-react";
import type { PreventionMeasure } from "@shared/schema";

interface PreventionSectionProps {
  measures: PreventionMeasure[];
  onAddMeasure: () => void;
  onUpdateMeasure: (measureId: string, description: string) => void;
  onRemoveMeasure: (measureId: string) => void;
}

export default function PreventionSection({
  measures,
  onAddMeasure,
  onUpdateMeasure,
  onRemoveMeasure
}: PreventionSectionProps) {
  return (
    <div className="bg-green-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-green-900 flex items-center">
          <Shield className="h-4 w-4 mr-2" />
          Mesures de prévention additionnelles
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddMeasure}
          className="text-green-600 hover:text-green-700 hover:bg-green-100"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {measures.map((measure) => (
          <div key={measure.id} className="flex items-center space-x-2 bg-white rounded-lg p-3">
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            <Input
              value={measure.description}
              onChange={(e) => onUpdateMeasure(measure.id, e.target.value)}
              placeholder="Décrivez la mesure de prévention..."
              className="flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:bg-green-50"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveMeasure(measure.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {measures.length === 0 && (
          <p className="text-sm text-green-700 text-center py-4">
            Aucune mesure de prévention ajoutée. Cliquez sur + pour en ajouter une.
          </p>
        )}
      </div>
    </div>
  );
}
