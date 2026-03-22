import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Users,
  MapPin,
  FolderOpen
} from "lucide-react";
import type { WorkUnit, Workstation, UnitSite } from "@shared/schema";

interface WorkstationSetupStepProps {
  companyId: number;
  companyActivity: string;
  companyDescription?: string;
  workUnits: WorkUnit[];
  onUpdateWorkUnits: (units: WorkUnit[]) => void;
  onSave: () => void;
  readOnly?: boolean;
}

export default function WorkstationSetupStep({
  companyId,
  companyActivity,
  companyDescription,
  workUnits,
  onUpdateWorkUnits,
  onSave,
  readOnly = false
}: WorkstationSetupStepProps) {
  const { toast } = useToast();
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(workUnits.map(u => u.id)));
  const [newUnitName, setNewUnitName] = useState('');
  const [newWorkstationInputs, setNewWorkstationInputs] = useState<Record<string, string>>({});
  const [newSiteInputs, setNewSiteInputs] = useState<Record<string, string>>({});

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addUnit = () => {
    const name = newUnitName.trim();
    if (!name) return;
    const id = crypto.randomUUID();
    onUpdateWorkUnits([...workUnits, {
      id,
      name,
      companyId,
      workstations: [],
      unitSites: [],
      risks: [],
      preventionMeasures: [],
      order: workUnits.length
    }]);
    setExpandedUnits(prev => new Set(prev).add(id));
    setNewUnitName('');
  };

  const removeUnit = (id: string) => {
    onUpdateWorkUnits(workUnits.filter(u => u.id !== id));
  };

  const updateUnit = (unitId: string, updates: Partial<WorkUnit>) => {
    onUpdateWorkUnits(workUnits.map(u => u.id === unitId ? { ...u, ...updates } : u));
  };

  const addWorkstation = (unitId: string) => {
    const name = newWorkstationInputs[unitId]?.trim();
    if (!name) return;
    const unit = workUnits.find(u => u.id === unitId);
    if (!unit) return;

    const newWs: Workstation = {
      id: crypto.randomUUID(),
      name,
      order: unit.workstations.length
    };

    updateUnit(unitId, { workstations: [...unit.workstations, newWs] });
    setNewWorkstationInputs(prev => ({ ...prev, [unitId]: '' }));
  };

  const removeWorkstation = (unitId: string, wsId: string) => {
    const unit = workUnits.find(u => u.id === unitId);
    if (!unit) return;
    updateUnit(unitId, { workstations: unit.workstations.filter(w => w.id !== wsId) });
  };

  const addSite = (unitId: string) => {
    const name = newSiteInputs[unitId]?.trim();
    if (!name) return;
    const unit = workUnits.find(u => u.id === unitId);
    if (!unit) return;

    const newSite: UnitSite = {
      id: crypto.randomUUID(),
      name,
      order: (unit.unitSites || []).length
    };

    updateUnit(unitId, { unitSites: [...(unit.unitSites || []), newSite] });
    setNewSiteInputs(prev => ({ ...prev, [unitId]: '' }));
  };

  const removeSite = (unitId: string, siteId: string) => {
    const unit = workUnits.find(u => u.id === unitId);
    if (!unit) return;
    updateUnit(unitId, { unitSites: (unit.unitSites || []).filter(s => s.id !== siteId) });
  };

  const totalWorkstations = workUnits.reduce((sum, u) => sum + u.workstations.length, 0);
  const totalSites = workUnits.reduce((sum, u) => sum + (u.unitSites || []).length, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold">Configuration des unités de travail</h2>
        <p className="text-indigo-100 text-sm mt-1">
          Créez vos unités de travail, puis ajoutez-y des postes de travail et/ou des sites.
        </p>
        <div className="flex gap-4 mt-3">
          <Badge variant="secondary" className="bg-white/20 text-white">
            <Users className="h-3 w-3 mr-1" />{workUnits.length} unité(s)
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white">
            <Briefcase className="h-3 w-3 mr-1" />{totalWorkstations} poste(s)
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white">
            <MapPin className="h-3 w-3 mr-1" />{totalSites} site(s)
          </Badge>
        </div>
      </div>

      {!readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ajouter une unité de travail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de l'unité (ex: Bureau administratif, Atelier mécanique, Zone de stockage...)"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUnit()}
                className="flex-1"
              />
              <Button onClick={addUnit} disabled={!newUnitName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {workUnits.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Commencez par ajouter au moins une unité de travail ci-dessus
            </p>
          </CardContent>
        </Card>
      )}

      {workUnits.map(unit => (
        <Card key={unit.id} className="overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 cursor-pointer" onClick={() => toggleUnit(unit.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expandedUnits.has(unit.id) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-base">{unit.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {unit.workstations.length} poste(s) • {(unit.unitSites || []).length} site(s)
                  </CardDescription>
                </div>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); removeUnit(unit.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardHeader>

          {expandedUnits.has(unit.id) && (
            <CardContent className="pt-4 space-y-5">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  <Briefcase className="h-4 w-4 inline mr-1" />
                  Postes de travail
                </Label>
                {!readOnly && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Nom du poste (ex: Soudeur, Cariste, Secrétaire...)"
                      value={newWorkstationInputs[unit.id] || ''}
                      onChange={(e) => setNewWorkstationInputs(prev => ({ ...prev, [unit.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addWorkstation(unit.id)}
                    />
                    <Button variant="outline" onClick={() => addWorkstation(unit.id)} disabled={!newWorkstationInputs[unit.id]?.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {unit.workstations.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Aucun poste ajouté</p>
                  ) : (
                    unit.workstations.map(ws => (
                      <Badge key={ws.id} variant="secondary" className="py-1.5 px-3 text-sm flex items-center gap-2">
                        <Briefcase className="h-3 w-3" />
                        {ws.name}
                        {!readOnly && (
                          <button
                            onClick={() => removeWorkstation(unit.id, ws.id)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium mb-2 block">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Sites / Lieux
                </Label>
                {!readOnly && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Nom du site (ex: Entrepôt Nord, Bureau 2ème étage, Chantier A...)"
                      value={newSiteInputs[unit.id] || ''}
                      onChange={(e) => setNewSiteInputs(prev => ({ ...prev, [unit.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addSite(unit.id)}
                    />
                    <Button variant="outline" onClick={() => addSite(unit.id)} disabled={!newSiteInputs[unit.id]?.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(unit.unitSites || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Aucun site ajouté</p>
                  ) : (
                    (unit.unitSites || []).map(site => (
                      <Badge key={site.id} variant="outline" className="py-1.5 px-3 text-sm flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        {site.name}
                        {!readOnly && (
                          <button
                            onClick={() => removeSite(unit.id, site.id)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
