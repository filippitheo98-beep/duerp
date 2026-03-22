import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Briefcase, Plus } from 'lucide-react';
import type { Location, WorkStation } from '@shared/schema';

interface SelectLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  workStations: WorkStation[];
  onGenerate: (selectedLocations: Location[], selectedWorkStations: WorkStation[]) => void;
  isGenerating: boolean;
}

export default function SelectLocationModal({
  isOpen,
  onClose,
  locations,
  workStations,
  onGenerate,
  isGenerating
}: SelectLocationModalProps) {
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedWorkStationIds, setSelectedWorkStationIds] = useState<string[]>([]);

  const handleLocationToggle = (locationId: string) => {
    setSelectedLocationIds(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleWorkStationToggle = (workStationId: string) => {
    setSelectedWorkStationIds(prev => 
      prev.includes(workStationId) 
        ? prev.filter(id => id !== workStationId)
        : [...prev, workStationId]
    );
  };

  const handleSelectAllLocations = () => {
    if (selectedLocationIds.length === locations.length) {
      setSelectedLocationIds([]);
    } else {
      setSelectedLocationIds(locations.map(l => l.id));
    }
  };

  const handleSelectAllWorkStations = () => {
    if (selectedWorkStationIds.length === workStations.length) {
      setSelectedWorkStationIds([]);
    } else {
      setSelectedWorkStationIds(workStations.map(w => w.id));
    }
  };

  const handleGenerate = () => {
    const selectedLocations = locations.filter(l => selectedLocationIds.includes(l.id));
    const selectedWorkStations = workStations.filter(w => selectedWorkStationIds.includes(w.id));
    onGenerate(selectedLocations, selectedWorkStations);
    onClose();
    // Reset selections for next time
    setSelectedLocationIds([]);
    setSelectedWorkStationIds([]);
  };

  const totalSelected = selectedLocationIds.length + selectedWorkStationIds.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Sélectionner les lieux et postes pour générer de nouveaux risques
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lieux de travail */}
          {locations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Lieux de travail ({selectedLocationIds.length}/{locations.length})
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllLocations}
                  >
                    {selectedLocationIds.length === locations.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedLocationIds.includes(location.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleLocationToggle(location.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedLocationIds.includes(location.id)}
                          onChange={() => handleLocationToggle(location.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{location.name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Postes de travail */}
          {workStations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-green-600" />
                    Postes de travail ({selectedWorkStationIds.length}/{workStations.length})
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllWorkStations}
                  >
                    {selectedWorkStationIds.length === workStations.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workStations.map((workStation) => (
                    <div
                      key={workStation.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedWorkStationIds.includes(workStation.id)
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => handleWorkStationToggle(workStation.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedWorkStationIds.includes(workStation.id)}
                          onChange={() => handleWorkStationToggle(workStation.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{workStation.name}</div>
                          {workStation.description && (
                            <div className="text-sm text-muted-foreground">{workStation.description}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message si rien n'est disponible */}
          {locations.length === 0 && workStations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun lieu ou poste de travail disponible pour la génération de risques.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={totalSelected === 0 || isGenerating}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Génération...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Générer pour {totalSelected} élément{totalSelected > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}