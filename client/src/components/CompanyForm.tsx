import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, X, MapPin, Settings } from "lucide-react";
import type { Company, PreventionMeasure, Location, WorkStation } from "@shared/schema";

const companyFormSchema = z.object({
  name: z.string().min(1, "Le nom de la société est requis"),
  activity: z.string().min(1, "Le secteur d'activité est requis"),
  existingPreventionMeasures: z.array(z.object({
    id: z.string(),
    description: z.string(),
  })).default([]),
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    risks: z.array(z.any()).default([]),
    preventionMeasures: z.array(z.any()).default([]),
  })).default([]),
  workStations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    risks: z.array(z.any()).default([]),
    preventionMeasures: z.array(z.any()).default([]),
  })).default([]),
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  onSubmit: (data: CompanyFormData) => void;
  isLoading: boolean;
  initialData?: Company | null;
  locations?: Location[];
  workStations?: WorkStation[];
}

export default function CompanyForm({ onSubmit, isLoading, initialData, locations = [], workStations = [] }: CompanyFormProps) {
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      activity: initialData?.activity || "",
      existingPreventionMeasures: initialData?.existingPreventionMeasures || [],
      locations: locations,
      workStations: workStations,
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log("Updating CompanyForm with new initialData:", initialData);
      form.setValue("name", initialData.name || "");
      form.setValue("activity", initialData.activity || "");
      form.setValue("existingPreventionMeasures", initialData.existingPreventionMeasures || []);
    }
  }, [initialData, form]);

  // Update form when locations/workStations change
  useEffect(() => {
    form.setValue("locations", locations);
    form.setValue("workStations", workStations);
  }, [locations, workStations, form]);

  const addPreventionMeasure = () => {
    const currentMeasures = form.getValues("existingPreventionMeasures");
    const newMeasure = {
      id: Date.now().toString(),
      description: "",
    };
    form.setValue("existingPreventionMeasures", [...currentMeasures, newMeasure]);
  };

  const removePreventionMeasure = (id: string) => {
    const currentMeasures = form.getValues("existingPreventionMeasures");
    const filteredMeasures = currentMeasures.filter(measure => measure.id !== id);
    form.setValue("existingPreventionMeasures", filteredMeasures);
  };

  const updatePreventionMeasure = (id: string, description: string) => {
    const currentMeasures = form.getValues("existingPreventionMeasures");
    const updatedMeasures = currentMeasures.map(measure => 
      measure.id === id ? { ...measure, description } : measure
    );
    form.setValue("existingPreventionMeasures", updatedMeasures);
  };

  // Locations management
  const addLocation = () => {
    const currentLocations = form.getValues("locations");
    const newLocation: Location = {
      id: Date.now().toString(),
      name: "",
      risks: [],
      preventionMeasures: [],
    };
    form.setValue("locations", [...currentLocations, newLocation]);
  };

  const removeLocation = (id: string) => {
    const currentLocations = form.getValues("locations");
    const filteredLocations = currentLocations.filter(location => location.id !== id);
    form.setValue("locations", filteredLocations);
  };

  const updateLocation = (id: string, name: string) => {
    const currentLocations = form.getValues("locations");
    const updatedLocations = currentLocations.map(location => 
      location.id === id ? { ...location, name } : location
    );
    form.setValue("locations", updatedLocations);
  };

  // WorkStations management
  const addWorkStation = () => {
    const currentWorkStations = form.getValues("workStations");
    const newWorkStation: WorkStation = {
      id: Date.now().toString(),
      name: "",
      description: "",
      risks: [],
      preventionMeasures: [],
    };
    form.setValue("workStations", [...currentWorkStations, newWorkStation]);
  };

  const removeWorkStation = (id: string) => {
    const currentWorkStations = form.getValues("workStations");
    const filteredWorkStations = currentWorkStations.filter(ws => ws.id !== id);
    form.setValue("workStations", filteredWorkStations);
  };

  const updateWorkStation = (id: string, field: string, value: string) => {
    const currentWorkStations = form.getValues("workStations");
    const updatedWorkStations = currentWorkStations.map(ws => 
      ws.id === id ? { ...ws, [field]: value } : ws
    );
    form.setValue("workStations", updatedWorkStations);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la société *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: ACME Industries"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="activity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secteur d'activité *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: Industrie manufacturière"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mesures de prévention existantes */}
        <Card className="card-enhanced animate-slide-up">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Mesures de prévention existantes</h3>
                <p className="text-sm text-muted-foreground">Dans votre société</p>
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border-l-4 border-blue-500">
              💡 Listez les équipements de protection, formations, procédures et autres mesures de sécurité déjà en place dans votre entreprise.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.watch("existingPreventionMeasures")?.map((measure, index) => (
                <div key={measure.id} className="group relative">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-xl border border-blue-200 dark:border-blue-800 hover-lift transition-all">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-1">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <Textarea
                        placeholder="Ex: Casques de protection fournis à tous les employés, Formation annuelle aux premiers secours, Procédure d'évacuation affichée..."
                        value={measure.description}
                        onChange={(e) => updatePreventionMeasure(measure.id, e.target.value)}
                        className="min-h-[70px] resize-none border-0 bg-white/80 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePreventionMeasure(measure.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addPreventionMeasure}
                className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover-lift py-6"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span className="font-medium">Ajouter une mesure de prévention</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lieux de travail */}
        <Card className="card-enhanced animate-slide-up">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Lieux de travail</h3>
                <p className="text-sm text-muted-foreground">Zones d'activité</p>
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border-l-4 border-green-500">
              🏢 Définissez les différents lieux où s'exerce l'activité de votre entreprise.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.watch("locations")?.map((location, index) => (
                <div key={location.id} className="group relative">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10 rounded-xl border border-green-200 dark:border-green-800 hover-lift transition-all">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <Input
                      placeholder="Ex: Atelier principal, Bureau, Entrepôt, Zone de stockage..."
                      value={location.name}
                      onChange={(e) => updateLocation(location.id, e.target.value)}
                      className="flex-1 border-0 bg-white/80 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 transition-all focus:ring-2 focus:ring-green-500 focus:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(location.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addLocation}
                className="w-full border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-400 dark:hover:border-green-600 transition-all hover-lift py-6"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span className="font-medium">Ajouter un lieu de travail</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Postes de travail */}
        <Card className="card-enhanced animate-slide-up">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Postes de travail</h3>
                <p className="text-sm text-muted-foreground">Équipements spécifiques</p>
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border-l-4 border-orange-500">
              ⚙️ Définissez les postes de travail spécifiques avec leurs équipements et activités.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {form.watch("workStations")?.map((workStation, index) => (
                <div key={workStation.id} className="group relative">
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/10 dark:to-red-950/10 rounded-xl border border-orange-200 dark:border-orange-800 hover-lift transition-all">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mt-1">
                        <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="Ex: Poste de soudage, Bureau comptable, Zone de stockage..."
                          value={workStation.name}
                          onChange={(e) => updateWorkStation(workStation.id, "name", e.target.value)}
                          className="border-0 bg-white/80 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
                        />
                        <Input
                          placeholder="Description détaillée (optionnel): machines, outils, produits utilisés..."
                          value={workStation.description || ""}
                          onChange={(e) => updateWorkStation(workStation.id, "description", e.target.value)}
                          className="border-0 bg-white/80 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-900 transition-all focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWorkStation(workStation.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addWorkStation}
                className="w-full border-2 border-dashed border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-400 dark:hover:border-orange-600 transition-all hover-lift py-6"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span className="font-medium">Ajouter un poste de travail</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {!initialData && (
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
