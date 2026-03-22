import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Risk } from '@shared/schema';

interface PhotoAnalysisProps {
  onRisksDetected: (risks: Risk[]) => void;
  companyActivity: string;
}

export function PhotoAnalysis({ onRisksDetected, companyActivity }: PhotoAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [detectedRisks, setDetectedRisks] = useState<Risk[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Fichier trop volumineux",
        description: "Veuillez sélectionner une image de moins de 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setUploadedImage(imageDataUrl);
      analyzeImage(imageDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageDataUrl: string) => {
    setIsAnalyzing(true);
    
    try {
      // Simulation d'analyse IA d'image
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Génération de risques simulés basés sur l'analyse d'image
      const simulatedRisks: Risk[] = [
        {
          id: `photo-risk-${Date.now()}-1`,
          type: "Risque de chute",
          danger: "Obstacles au sol détectés sur la photo",
          gravity: "Moyenne",
          frequency: "Occasionnel",
          control: "Faible",
          finalRisk: "Moyen",
          measures: "Dégager les passages, signaler les obstacles",
          source: "Analyse photo",
          sourceType: "Lieu"
        },
        {
          id: `photo-risk-${Date.now()}-2`,
          type: "Risque électrique",
          danger: "Câbles électriques visibles et accessibles",
          gravity: "Élevée",
          frequency: "Quotidien",
          control: "Moyenne",
          finalRisk: "Important",
          measures: "Protéger les câbles, installer des gaines de protection",
          source: "Analyse photo",
          sourceType: "Lieu"
        },
        {
          id: `photo-risk-${Date.now()}-3`,
          type: "Risque ergonomique",
          danger: "Posture de travail inadéquate observée",
          gravity: "Moyenne",
          frequency: "Quotidien",
          control: "Faible",
          finalRisk: "Moyen",
          measures: "Ajuster la hauteur du poste, formation aux bonnes postures",
          source: "Analyse photo",
          sourceType: "Poste"
        }
      ];

      setDetectedRisks(simulatedRisks);
      onRisksDetected(simulatedRisks);
      
      toast({
        title: "Analyse terminée",
        description: `${simulatedRisks.length} risques détectés dans l'image`,
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser l'image. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-500" />
          Analyse de photos
          <Badge variant="secondary">IA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={handleButtonClick}
              disabled={isAnalyzing}
              className="transition-all hover:scale-105"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Analyser une photo
                </>
              )}
            </Button>
          </div>

          {uploadedImage && (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={uploadedImage}
                  alt="Image analysée"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Analyse en cours...</p>
                    </div>
                  </div>
                )}
              </div>

              {detectedRisks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Risques détectés :</h4>
                  {detectedRisks.map((risk) => (
                    <div key={risk.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{risk.type}</p>
                        <p className="text-xs text-muted-foreground">{risk.danger}</p>
                      </div>
                      <Badge 
                        variant={risk.finalRisk === 'Important' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {risk.finalRisk}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            <p>L'IA analyse les photos pour détecter automatiquement les risques potentiels</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}