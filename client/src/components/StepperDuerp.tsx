import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  MapPin, 
  FileText, 
  ListTodo,
  BarChart3, 
  Save, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle 
} from 'lucide-react';

interface StepperDuerpProps {
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  onSave: () => void;
  isSaving?: boolean;
  completedSteps: number[];
  readOnly?: boolean;
}

const steps = [
  {
    id: 1,
    title: "Informations de la société",
    description: "Nom, adresse, secteur, employés",
    icon: Building
  },
  {
    id: 2,
    title: "Unités de travail",
    description: "Unités, postes et sites",
    icon: MapPin
  },
  {
    id: 3,
    title: "Tableau des risques",
    description: "Évaluation des risques professionnels",
    icon: FileText
  },
  {
    id: 4,
    title: "Plan d'action",
    description: "Actions issues des risques et mesures",
    icon: ListTodo
  },
  {
    id: 5,
    title: "Analyse et graphiques",
    description: "Visualisation des risques",
    icon: BarChart3
  }
];

export default function StepperDuerp({ 
  currentStep, 
  totalSteps, 
  onStepChange, 
  onSave, 
  isSaving = false,
  completedSteps = [],
  readOnly = false
}: StepperDuerpProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            {readOnly ? 'Visualisation du DUERP' : 'Générateur DUERP'} - Étape {currentStep} sur {totalSteps}
          </CardTitle>
          {!readOnly && (
            <Button
              onClick={onSave}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          )}
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted = completedSteps.includes(step.id);
            const Icon = step.icon;
            
            return (
              <div
                key={step.id}
                className={`
                  relative p-4 rounded-lg border-2 transition-all cursor-pointer
                  ${isActive 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : isCompleted 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-muted hover:border-muted-foreground/50'
                  }
                `}
                onClick={() => onStepChange(step.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    p-2 rounded-full
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-muted'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{step.title}</h3>
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          Terminé
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <Button
            onClick={() => onStepChange(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          
          <div className="text-sm text-muted-foreground">
            Étape {currentStep} sur {totalSteps}
          </div>
          
          <Button
            onClick={() => onStepChange(Math.min(totalSteps, currentStep + 1))}
            disabled={currentStep === totalSteps}
            size="sm"
          >
            Suivant
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}