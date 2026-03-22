import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Plus, 
  X, 
  Camera, 
  Settings, 
  Shield,
  Upload,
  Trash2
} from 'lucide-react';
import type { Location, WorkStation, PreventionMeasure } from '@shared/schema';
import { PreventionMeasuresManager } from '@/components/PreventionMeasuresManager';

interface LocationPhoto {
  id: string;
  file: File;
  dataUrl: string;
  caption: string;
}

interface LocationsWorkstationsStepProps {
  locations: Location[];
  workStations: WorkStation[];
  preventionMeasures: PreventionMeasure[];
  onUpdateLocations: (locations: Location[]) => void;
  onUpdateWorkStations: (workStations: WorkStation[]) => void;
  onUpdatePreventionMeasures: (measures: PreventionMeasure[]) => void;
  onAddPreventionMeasure: (measure: PreventionMeasure) => void;
  onUpdatePreventionMeasure: (measureId: string, updates: Partial<PreventionMeasure>) => void;
  onRemovePreventionMeasure: (measureId: string) => void;
  onGeneratePreventionRecommendations: () => void;
  onAnalyzePhotos: (photos: LocationPhoto[], locationOrWorkstation: string) => void;
  onSave: () => void;
  companyActivity: string;
}

export default function LocationsWorkstationsStep({
  locations,
  workStations,
  preventionMeasures,
  onUpdateLocations,
  onUpdateWorkStations,
  onUpdatePreventionMeasures,
  onAddPreventionMeasure,
  onUpdatePreventionMeasure,
  onRemovePreventionMeasure,
  onGeneratePreventionRecommendations,
  onAnalyzePhotos,
  onSave,
  companyActivity
}: LocationsWorkstationsStepProps) {
  const [newLocationName, setNewLocationName] = useState('');
  const [newWorkStationName, setNewWorkStationName] = useState('');
  const [newWorkStationDescription, setNewWorkStationDescription] = useState('');
  const [selectedLocationPhotos, setSelectedLocationPhotos] = useState<LocationPhoto[]>([]);
  const [selectedWorkstationPhotos, setSelectedWorkstationPhotos] = useState<LocationPhoto[]>([]);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [currentPhotoContext, setCurrentPhotoContext] = useState<{type: 'location' | 'workstation', name: string} | null>(null);

  const addLocation = () => {
    if (!newLocationName.trim()) return;
    
    const newLocation: Location = {
      id: Date.now().toString(),
      name: newLocationName.trim(),
      risks: [],
      preventionMeasures: [],
    };
    
    onUpdateLocations([...locations, newLocation]);
    setNewLocationName('');
    onSave();
  };

  const removeLocation = (locationId: string) => {
    const updatedLocations = locations.filter(location => location.id !== locationId);
    onUpdateLocations(updatedLocations);
    onSave();
  };

  const addWorkStation = () => {
    if (!newWorkStationName.trim()) return;
    
    const newWorkStation: WorkStation = {
      id: Date.now().toString(),
      name: newWorkStationName.trim(),
      description: newWorkStationDescription.trim(),
      risks: [],
      preventionMeasures: [],
    };
    
    onUpdateWorkStations([...workStations, newWorkStation]);
    setNewWorkStationName('');
    setNewWorkStationDescription('');
    onSave();
  };

  const removeWorkStation = (workStationId: string) => {
    const updatedWorkStations = workStations.filter(ws => ws.id !== workStationId);
    onUpdateWorkStations(updatedWorkStations);
    onSave();
  };

  const openPhotoDialog = (type: 'location' | 'workstation', name: string) => {
    setCurrentPhotoContext({ type, name });
    setPhotoDialogOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhoto: LocationPhoto = {
            id: Date.now().toString() + Math.random(),
            file,
            dataUrl: e.target?.result as string,
            caption: ''
          };

          if (currentPhotoContext?.type === 'location') {
            setSelectedLocationPhotos(prev => [...prev, newPhoto]);
          } else {
            setSelectedWorkstationPhotos(prev => [...prev, newPhoto]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removePhoto = (photoId: string) => {
    if (currentPhotoContext?.type === 'location') {
      setSelectedLocationPhotos(prev => prev.filter(photo => photo.id !== photoId));
    } else {
      setSelectedWorkstationPhotos(prev => prev.filter(photo => photo.id !== photoId));
    }
  };

  const updatePhotoCaption = (photoId: string, caption: string) => {
    if (currentPhotoContext?.type === 'location') {
      setSelectedLocationPhotos(prev => 
        prev.map(photo => photo.id === photoId ? { ...photo, caption } : photo)
      );
    } else {
      setSelectedWorkstationPhotos(prev => 
        prev.map(photo => photo.id === photoId ? { ...photo, caption } : photo)
      );
    }
  };

  const analyzePhotos = () => {
    const photos = currentPhotoContext?.type === 'location' ? selectedLocationPhotos : selectedWorkstationPhotos;
    if (photos.length > 0 && currentPhotoContext) {
      onAnalyzePhotos(photos, currentPhotoContext.name);
      setPhotoDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">Lieux de travail</TabsTrigger>
          <TabsTrigger value="workstations">Postes de travail</TabsTrigger>
          <TabsTrigger value="prevention">Mesures de prévention</TabsTrigger>
        </TabsList>
        
        <TabsContent value="locations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Lieux de travail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nom du lieu (ex: Bureau, Atelier, Entrepôt...)"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                  className="flex-1"
                />
                <Button onClick={addLocation} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {locations.map((location) => (
                  <div key={location.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{location.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPhotoDialog('location', location.name)}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeLocation(location.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {location.risks.length} risques
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="workstations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Postes de travail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workstation-name">Nom du poste</Label>
                  <Input
                    id="workstation-name"
                    placeholder="ex: Secrétaire, Opérateur, Manutentionnaire..."
                    value={newWorkStationName}
                    onChange={(e) => setNewWorkStationName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="workstation-description">Description</Label>
                  <Textarea
                    id="workstation-description"
                    placeholder="Décrivez les tâches et responsabilités..."
                    value={newWorkStationDescription}
                    onChange={(e) => setNewWorkStationDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              
              <Button onClick={addWorkStation} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le poste
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workStations.map((workStation) => (
                  <div key={workStation.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{workStation.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPhotoDialog('workstation', workStation.name)}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeWorkStation(workStation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {workStation.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {workStation.description}
                      </p>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {workStation.risks.length} risques
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="prevention" className="mt-6">
          <PreventionMeasuresManager
            measures={preventionMeasures}
            risks={[]}
            locations={locations}
            workStations={workStations}
            onAddMeasure={onAddPreventionMeasure}
            onUpdateMeasure={onUpdatePreventionMeasure}
            onRemoveMeasure={onRemovePreventionMeasure}
          />
          <div className="mt-4 flex justify-center">
            <Button onClick={onGeneratePreventionRecommendations} variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Générer des recommandations
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog pour les photos */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Photos pour {currentPhotoContext?.type === 'location' ? 'le lieu' : 'le poste'} : {currentPhotoContext?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 p-3 border-2 border-dashed border-muted-foreground/50 rounded-lg hover:border-primary">
                  <Upload className="h-4 w-4" />
                  Ajouter des photos
                </div>
              </Label>
              <input
                id="photo-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentPhotoContext?.type === 'location' ? selectedLocationPhotos : selectedWorkstationPhotos).map((photo) => (
                <div key={photo.id} className="border rounded-lg p-3">
                  <div className="relative mb-3">
                    <img
                      src={photo.dataUrl}
                      alt="Photo à analyser"
                      className="w-full h-48 object-cover rounded"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removePhoto(photo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Label htmlFor={`caption-${photo.id}`}>Description</Label>
                  <Textarea
                    id={`caption-${photo.id}`}
                    placeholder="Décrivez ce que montre cette photo..."
                    value={photo.caption}
                    onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={analyzePhotos}>
                Analyser les photos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}