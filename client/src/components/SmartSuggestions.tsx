import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Risk, PreventionMeasure } from '@shared/schema';

interface SmartSuggestionsProps {
  risks: Risk[];
  companyActivity: string;
  onAddSuggestion: (suggestion: PreventionMeasure) => void;
}

export function SmartSuggestions({ risks, companyActivity, onAddSuggestion }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<PreventionMeasure[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    generateSuggestions();
  }, [risks, companyActivity]);

  const generateSuggestions = () => {
    const newSuggestions: PreventionMeasure[] = [];
    
    // Analyse des risques pour générer des suggestions intelligentes
    const riskTypes = risks.map(risk => risk.type.toLowerCase());
    const highRisks = risks.filter(risk => risk.finalRisk === 'Important');
    
    if (riskTypes.includes('chute') || riskTypes.includes('glissade')) {
      newSuggestions.push({
        id: 'suggestion-1',
        description: 'Installer un revêtement antidérapant dans les zones à risque'
      });
    }
    
    if (riskTypes.includes('écran') || riskTypes.includes('ordinateur')) {
      newSuggestions.push({
        id: 'suggestion-2',
        description: 'Organiser des pauses régulières toutes les 2 heures pour réduire la fatigue oculaire'
      });
    }
    
    if (riskTypes.includes('bruit') || riskTypes.includes('sonore')) {
      newSuggestions.push({
        id: 'suggestion-3',
        description: 'Fournir des protections auditives individuelles et former le personnel'
      });
    }
    
    if (highRisks.length > 0) {
      newSuggestions.push({
        id: 'suggestion-4',
        description: 'Programmer une formation sécurité pour tous les employés exposés aux risques importants'
      });
    }
    
    if (companyActivity.toLowerCase().includes('formation')) {
      newSuggestions.push({
        id: 'suggestion-5',
        description: 'Mettre en place une signalétique claire pour les issues de secours'
      });
    }
    
    // Filtrer les suggestions déjà rejetées
    const filteredSuggestions = newSuggestions.filter(
      s => !dismissedSuggestions.includes(s.id)
    );
    
    setSuggestions(filteredSuggestions);
  };

  const handleAddSuggestion = (suggestion: PreventionMeasure) => {
    onAddSuggestion(suggestion);
    setDismissedSuggestions([...dismissedSuggestions, suggestion.id]);
    toast({
      title: "Suggestion ajoutée",
      description: "La mesure de prévention a été ajoutée à votre liste",
    });
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions([...dismissedSuggestions, suggestionId]);
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Suggestions intelligentes
          <Badge variant="secondary" className="ml-2">
            {suggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id}
              className="flex items-start justify-between p-3 bg-muted/50 rounded-lg transition-all hover:bg-muted/80"
            >
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Mesure recommandée</p>
                <p className="text-sm text-muted-foreground">
                  {suggestion.description}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddSuggestion(suggestion)}
                  className="transition-all hover:scale-105"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(suggestion.id)}
                  className="transition-all hover:scale-105"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}