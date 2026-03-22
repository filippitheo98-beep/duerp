import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, 
  Upload, 
  Loader2, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  Plus,
  X,
  MapPin,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Risk } from '@shared/schema';

interface PhotoData {
  id: string;
  file: File;
  dataUrl: string;
  caption: string;
  location: string;
  analysisResults: Risk[];
  isAnalyzing: boolean;
}

interface PhotoAnalysisProps {
  onRisksDetected: (risks: Risk[]) => void;
  companyActivity: string;
}

export function PhotoAnalysis({ onRisksDetected, companyActivity }: PhotoAnalysisProps) {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhotoForEdit, setSelectedPhotoForEdit] = useState<PhotoData | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleMultipleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Fichier trop volumineux",
          description: `${file.name} dépasse la limite de 5MB`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto: PhotoData = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          dataUrl: e.target?.result as string,
          caption: '',
          location: '',
          analysisResults: [],
          isAnalyzing: false
        };
        setPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const analyzePhoto = async (photoId: string) => {
    // Trouver la photo pour obtenir ses informations
    const currentPhoto = photos.find(p => p.id === photoId);
    const photoLocation = currentPhoto?.location || currentPhoto?.caption || "Photo sans nom";
    
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, isAnalyzing: true } : photo
    ));

    try {
      // Simulation d'analyse IA d'image
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Génération de risques simulés basés sur l'analyse d'image
      const simulatedRisks: Risk[] = [
        {
          id: `${photoId}-risk-1`,
          type: "Risque de chute",
          danger: "Obstacles au sol détectés sur la photo",
          gravity: "Moyenne",
          frequency: "Occasionnel",
          control: "Faible",
          finalRisk: "Moyen",
          measures: "Dégager les passages, signaler les obstacles",
          source: photoLocation,
          sourceType: "Lieu"
        },
        {
          id: `${photoId}-risk-2`,
          type: "Risque électrique",
          danger: "Câbles électriques visibles et accessibles",
          gravity: "Élevée",
          frequency: "Quotidien",
          control: "Moyenne",
          finalRisk: "Important",
          measures: "Protéger les câbles, installer des gaines de protection",
          source: photoLocation,
          sourceType: "Lieu"
        },
        {
          id: `${photoId}-risk-3`,
          type: "Risque ergonomique",
          danger: "Posture de travail inadéquate observée",
          gravity: "Moyenne",
          frequency: "Quotidien",
          control: "Faible",
          finalRisk: "Moyen",
          measures: "Ajuster la hauteur du poste, formation aux bonnes postures",
          source: photoLocation,
          sourceType: "Poste"
        }
      ];

      setPhotos(prev => prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, analysisResults: simulatedRisks, isAnalyzing: false }
          : photo
      ));

      // Add risks to global list
      onRisksDetected(simulatedRisks);
      
      toast({
        title: "Analyse terminée",
        description: `${simulatedRisks.length} risques détectés dans l'image`,
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId ? { ...photo, isAnalyzing: false } : photo
      ));
      
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser l'image. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    toast({
      title: "Photo supprimée",
      description: "La photo a été supprimée de l'analyse",
    });
  };

  const openEditDialog = (photo: PhotoData) => {
    setSelectedPhotoForEdit(photo);
    setEditCaption(photo.caption);
    setEditLocation(photo.location);
    setIsEditDialogOpen(true);
  };

  const savePhotoEdit = () => {
    if (!selectedPhotoForEdit) return;

    setPhotos(prev => prev.map(photo => 
      photo.id === selectedPhotoForEdit.id 
        ? { ...photo, caption: editCaption, location: editLocation }
        : photo
    ));

    setIsEditDialogOpen(false);
    setSelectedPhotoForEdit(null);
    setEditCaption('');
    setEditLocation('');

    toast({
      title: "Photo mise à jour",
      description: "La légende et la localisation ont été sauvegardées",
    });
  };

  const analyzeAllPhotos = async () => {
    const unanalyzedPhotos = photos.filter(photo => 
      photo.analysisResults.length === 0 && !photo.isAnalyzing
    );
    
    if (unanalyzedPhotos.length === 0) {
      toast({
        title: "Aucune photo à analyser",
        description: "Toutes les photos ont déjà été analysées",
      });
      return;
    }

    for (const photo of unanalyzedPhotos) {
      await analyzePhoto(photo.id);
      // Small delay between analyses
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  return (
    <div className="space-y-6">
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
                multiple
                onChange={handleMultipleImageUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="transition-all hover:scale-105"
              >
                <Upload className="h-4 w-4 mr-2" />
                Ajouter des photos
              </Button>
            </div>

            {photos.length > 0 && (
              <div className="flex justify-center gap-2">
                <Button
                  onClick={analyzeAllPhotos}
                  variant="outline"
                  className="transition-all hover:scale-105"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Analyser tout ({photos.filter(p => p.analysisResults.length === 0).length})
                </Button>
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              <p>L'IA analyse les photos pour détecter automatiquement les risques potentiels</p>
              <p>Vous pouvez ajouter des légendes et localiser chaque photo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || "Photo analysée"}
                  className="w-full h-48 object-cover"
                />
                {photo.isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Analyse en cours...</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditDialog(photo)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removePhoto(photo.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  {photo.caption ? (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{photo.caption}</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4 mt-0.5" />
                      <p className="text-sm italic">Cliquez sur modifier pour ajouter une légende</p>
                    </div>
                  )}
                  {photo.location ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">{photo.location}</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <p className="text-sm italic">Localisation non définie</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    {photo.analysisResults.length === 0 && !photo.isAnalyzing && (
                      <Button
                        size="sm"
                        onClick={() => analyzePhoto(photo.id)}
                        className="flex-1"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Analyser
                      </Button>
                    )}
                    {photo.analysisResults.length > 0 && (
                      <Badge variant="secondary" className="flex-1 justify-center">
                        {photo.analysisResults.length} risques détectés
                      </Badge>
                    )}
                  </div>

                  {photo.analysisResults.length > 0 && (
                    <div className="space-y-1 mt-3">
                      {photo.analysisResults.slice(0, 2).map((risk) => (
                        <div key={risk.id} className="flex items-center gap-2 text-xs">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          <span className="flex-1 truncate">{risk.type}</span>
                          <Badge 
                            variant={risk.finalRisk === 'Important' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {risk.finalRisk}
                          </Badge>
                        </div>
                      ))}
                      {photo.analysisResults.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{photo.analysisResults.length - 2} autres risques
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="caption">Légende / Description</Label>
              <Textarea
                id="caption"
                placeholder="Décrivez ce que montre cette photo..."
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="location">Localisation</Label>
              <Input
                id="location"
                placeholder="Ex: Atelier principal, Bureau 2e étage..."
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={savePhotoEdit}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}