import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ListTodo,
  Plus,
  Sparkles,
  Library,
  Pencil,
  Trash2,
  CheckCircle,
  Loader2,
  Save,
  Users,
  AlertTriangle,
  AlertCircle,
  Info,
  Eye,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkUnit, Risk } from "@shared/schema";

export interface ActionRow {
  id: number;
  duerpId: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedTo: number | null;
  dueDate: string | null;
  completedAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
  critical: "Critique",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const RISK_ROW_COLORS: Record<string, string> = {
  "Priorité 1 (Forte)": "bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500",
  "Priorité 2 (Moyenne)": "bg-orange-50 dark:bg-orange-950/30 border-l-4 border-l-orange-500",
  "Priorité 3 (Modéré)": "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-500",
  "Priorité 4 (Faible)": "bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-500",
};
const PRIORITY_BADGE_COLORS: Record<string, string> = {
  "Priorité 1 (Forte)": "bg-red-500 text-white",
  "Priorité 2 (Moyenne)": "bg-orange-500 text-white",
  "Priorité 3 (Modéré)": "bg-yellow-500 text-black",
  "Priorité 4 (Faible)": "bg-green-500 text-white",
};
const PRIORITY_ICONS: Record<string, typeof AlertTriangle> = {
  "Priorité 1 (Forte)": AlertTriangle,
  "Priorité 2 (Moyenne)": AlertCircle,
  "Priorité 3 (Modéré)": Info,
  "Priorité 4 (Faible)": CheckCircle,
};

const SUGGESTED_MEASURES: Record<string, string[]> = {
  Ergonomique: [
    "Formation aux gestes et postures",
    "Mise à disposition d'aides à la manutention",
    "Aménagement ergonomique des postes de travail",
    "Alternance des tâches et pauses régulières",
    "Mobilier réglable (bureau, siège, écran)",
    "Limitation du port de charges lourdes",
    "Évaluation ergonomique des postes",
  ],
  Psychosocial: [
    "Mise en place d'un dispositif d'écoute",
    "Organisation du travail équilibrée",
    "Prévention du harcèlement et des violences",
    "Formation des managers à la prévention des RPS",
    "Entretiens individuels réguliers",
    "Aménagement des horaires de travail",
    "Plan de prévention du stress au travail",
  ],
  Mécanique: [
    "Port des EPI adaptés (gants, lunettes, casque)",
    "Vérification périodique des équipements de travail",
    "Mise en place de protecteurs sur les machines",
    "Formation à l'utilisation des machines",
    "Consignation des équipements avant intervention",
  ],
  Organisationnel: [
    "Mise à jour du document unique",
    "Plan de prévention pour les entreprises extérieures",
    "Accueil sécurité des nouveaux arrivants",
    "Procédures de travail formalisées",
    "Réunions sécurité périodiques (quart d'heure sécurité)",
    "Registre des accidents et presqu'accidents",
  ],
  Chimique: [
    "Stockage des produits chimiques dans des armoires ventilées",
    "Port des EPI chimiques (gants, masque, lunettes)",
    "Fiches de données de sécurité (FDS) accessibles",
    "Ventilation et aspiration à la source",
  ],
};

interface TableRisk {
  risk: Risk;
  unitName: string;
  unitId: string;
}

interface PlanActionStepProps {
  documentId: string | null;
  workUnits?: WorkUnit[];
  onSave: () => void;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  readOnly?: boolean;
}

export default function PlanActionStep({
  documentId,
  workUnits = [],
  onSave,
  onExportExcel,
  isExportingExcel = false,
  readOnly = false,
}: PlanActionStepProps) {
  const docIdNum = documentId ? parseInt(documentId, 10) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editAction, setEditAction] = useState<ActionRow | null>(null);
  const [aiSuggestionsOpen, setAiSuggestionsOpen] = useState(false);
  const [librarySuggestionsOpen, setLibrarySuggestionsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [selectedAi, setSelectedAi] = useState<Set<number>>(new Set());
  const [selectedLibrary, setSelectedLibrary] = useState<Set<number>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{ title: string; description?: string; priority: string }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [librarySuggestions, setLibrarySuggestions] = useState<
    Array<{ id: number; measures: string; family?: string }>
  >([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [measuresDialogRow, setMeasuresDialogRow] = useState<(TableRisk & { action?: ActionRow }) | null>(null);
  const [editingMeasuresList, setEditingMeasuresList] = useState<string[]>([]);
  const [newMeasureInDialog, setNewMeasureInDialog] = useState("");
  const [showSuggestionsInDialog, setShowSuggestionsInDialog] = useState(false);

  const allRisks = useMemo((): TableRisk[] => {
    const list: TableRisk[] = [];
    for (const unit of workUnits) {
      for (const risk of unit.risks || []) {
        list.push({ risk, unitName: unit.name, unitId: unit.id });
      }
    }
    return list;
  }, [workUnits]);

  const {
    data: actionsData,
    isLoading: actionsLoading,
    isError: actionsError,
  } = useQuery<ActionRow[]>({
    queryKey: docIdNum ? [`/api/duerp-documents/${docIdNum}/actions`] : [],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!docIdNum,
    retry: false,
  });
  const actions = Array.isArray(actionsData) ? actionsData : [];

  const planRows = useMemo(() => {
    return allRisks.map((tr) => ({
      ...tr,
      action: actions.find(
        (a) => a.sourceType === "risk" && String(a.sourceId) === tr.risk.id
      ),
    }));
  }, [allRisks, actions]);

  const invalidateActions = () =>
    queryClient.invalidateQueries({
      queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
    });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions/generate-from-duerp`, {
        method: "POST",
      }),
    onSuccess: () => {
      invalidateActions();
      toast({ title: "Plan généré", description: "Actions créées à partir du DUERP." });
    },
    onError: (e: Error) => {
      toast({
        title: "Erreur",
        description: e.message || "Impossible de générer le plan",
        variant: "destructive",
      });
    },
  });

  const updateMeasuresMutation = useMutation({
    mutationFn: ({
      actionId,
      title,
    }: { actionId: number; title: string }) =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions/${actionId}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => invalidateActions(),
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const createActionForRiskMutation = useMutation({
    mutationFn: ({
      riskId,
      title,
      riskDanger,
      priority,
    }: {
      riskId: string;
      title: string;
      riskDanger?: string;
      priority?: string;
    }) =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions`, {
        method: "POST",
        body: JSON.stringify({
          title,
          description: riskDanger ? `Risque: ${riskDanger}` : undefined,
          priority: priority?.includes("Priorité 1") ? "critical" : priority?.includes("Priorité 2") ? "high" : "medium",
          sourceType: "risk",
          sourceId: riskId,
        }),
      }),
    onSuccess: () => invalidateActions(),
    onError: (e: Error) =>
      toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const saveMeasuresToImplement = (
    row: TableRisk & { action?: ActionRow },
    value: string
  ) => {
    const trimmed = value.trim();
    if (row.action) {
      const newTitle = trimmed || "—";
      if (newTitle !== (row.action.title || ""))
        updateMeasuresMutation.mutate({ actionId: row.action.id, title: newTitle });
    } else if (trimmed && docIdNum) {
      createActionForRiskMutation.mutate({
        riskId: row.risk.id,
        title: trimmed,
        riskDanger: row.risk.danger,
        priority: row.risk.priority,
      });
    }
  };

  const fetchAiSuggestions = async () => {
    setAiLoading(true);
    setAiSuggestionsOpen(true);
    try {
      const list = await apiRequest(
        `/api/duerp-documents/${docIdNum}/actions/suggest-by-ai`,
        { method: "POST" }
      );
      setAiSuggestions(Array.isArray(list) ? list : []);
      setSelectedAi(new Set());
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Suggestions IA indisponibles",
        variant: "destructive",
      });
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchLibrarySuggestions = async () => {
    setLibraryLoading(true);
    setLibrarySuggestionsOpen(true);
    try {
      const list = await apiRequest(
        `/api/duerp-documents/${docIdNum}/actions/suggest-from-library`,
        { method: "POST" }
      );
      setLibrarySuggestions(Array.isArray(list) ? list : []);
      setSelectedLibrary(new Set());
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Suggestions bibliothèque indisponibles",
        variant: "destructive",
      });
      setLibrarySuggestions([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const addFromAi = useMutation({
    mutationFn: async (indices: number[]) => {
      for (const i of indices) {
        const s = aiSuggestions[i];
        if (!s?.title) continue;
        await apiRequest(`/api/duerp-documents/${docIdNum}/actions`, {
          method: "POST",
          body: JSON.stringify({
            title: s.title,
            description: s.description || undefined,
            priority: s.priority || "medium",
            sourceType: "ai",
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
      });
      setAiSuggestionsOpen(false);
      toast({ title: "Actions ajoutées" });
    },
  });

  const addFromLibrary = useMutation({
    mutationFn: async (indices: number[]) => {
      for (const i of indices) {
        const s = librarySuggestions[i];
        if (!s?.measures) continue;
        await apiRequest(`/api/duerp-documents/${docIdNum}/actions`, {
          method: "POST",
          body: JSON.stringify({
            title: s.measures.slice(0, 200),
            priority: "medium",
            sourceType: "library",
            sourceId: String(s.id),
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
      });
      setLibrarySuggestionsOpen(false);
      toast({ title: "Actions ajoutées" });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: (body: { title: string; description?: string; priority: string }) =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions`, {
        method: "POST",
        body: JSON.stringify({ ...body, sourceType: "manual" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
      });
      setAddOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      toast({ title: "Action créée" });
    },
    onError: (e: Error) => {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({
      actionId,
      updates,
    }: { actionId: number; updates: Partial<ActionRow> }) =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions/${actionId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
      });
      setEditAction(null);
      toast({ title: "Action mise à jour" });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: (actionId: number) =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions/${actionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
      });
      toast({ title: "Action supprimée" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ actionId, status }: { actionId: number; status: string }) =>
      apiRequest(`/api/duerp-documents/${docIdNum}/actions/${actionId}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          ...(status === "completed" ? { completedAt: new Date().toISOString() } : {}),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/duerp-documents/${docIdNum}/actions`],
      });
    },
  });

  if (!docIdNum) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Plan d&apos;action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Sauvegardez le DUERP pour accéder au plan d&apos;action et générer les actions à partir des risques et mesures.
          </p>
          <Button onClick={onSave} className="gap-2">
            <Save className="h-4 w-4" />
            Sauvegarder le DUERP
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Plan d&apos;action
          </CardTitle>
          {onExportExcel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportExcel}
              disabled={isExportingExcel || planRows.length === 0}
            >
              {isExportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              )}
              {isExportingExcel ? "Export…" : "Exporter Excel"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-hidden">
            {actionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : actionsError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                <p>Impossible de charger les actions.</p>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: docIdNum ? [`/api/duerp-documents/${docIdNum}/actions`] : [] })}>
                  Réessayer
                </Button>
              </div>
            ) : planRows.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 px-4">
                <p className="mb-2">Aucun risque dans les unités de travail.</p>
                <p className="text-sm">Complétez l’étape « Risques et mesures » pour afficher le plan d’action.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px] text-center text-xs">Statut</TableHead>
                      <TableHead className="w-[160px] text-xs">Unité de travail</TableHead>
                      <TableHead className="w-[100px] text-xs">Famille</TableHead>
                      <TableHead className="w-[140px] text-xs">Situation</TableHead>
                      <TableHead className="text-xs">Danger identifié</TableHead>
                      <TableHead className="w-[110px] text-xs">Priorité</TableHead>
                      <TableHead className="text-xs max-w-[200px]">Complété (mesures existantes)</TableHead>
                      <TableHead className="min-w-[180px] text-xs">Mesures à mettre en place</TableHead>
                      {!readOnly && (
                        <TableHead className="w-[90px] text-center text-xs">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planRows.map((row) => {
                      const PIcon = PRIORITY_ICONS[row.risk.priority || ""] || Info;
                      const priority = row.risk.priority || "Priorité 4 (Faible)";
                      const rowClass = RISK_ROW_COLORS[priority] || "";
                      const rawTitle = (row.action?.title ?? "").trim();
                      const hasContent = rawTitle && rawTitle !== "—";
                      const oneLine = hasContent ? rawTitle.replace(/\n/g, " · ") : "";
                      const previewText = oneLine ? (oneLine.length > 55 ? oneLine.slice(0, 55) + "…" : oneLine) : "—";
                      return (
                        <TableRow key={row.risk.id} className={`${rowClass} hover:bg-muted/40`}>
                          <TableCell className="text-center">
                            {(row.risk as Risk & { isValidated?: boolean }).isValidated ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <Badge variant="outline" className="text-[9px]">En attente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-purple-500 flex-shrink-0" />
                              <span className="font-medium truncate">{row.unitName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{row.risk.family || "Autre"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{row.risk.type || "—"}</TableCell>
                          <TableCell className="text-xs">{row.risk.danger || "—"}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${PRIORITY_BADGE_COLORS[priority] || ""}`}>
                              <PIcon className="h-3 w-3 mr-1 inline" />
                              P{priority?.match(/\d/)?.[0] || "?"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[300px]">
                            {(row.risk.existingMeasures?.length || 0) > 0 ? (
                              <ul className="list-none space-y-0.5">
                                {row.risk.existingMeasures?.map((m: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-green-700 dark:text-green-400 leading-tight">{m}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-muted-foreground italic">Aucune</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs py-2 max-w-[200px]">
                            <span className="text-muted-foreground block truncate" title={hasContent ? rawTitle : undefined}>
                              {previewText}
                            </span>
                          </TableCell>
                          {!readOnly && (
                            <TableCell className="text-center py-2">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setMeasuresDialogRow(row);
                                    const raw = (row.action?.title ?? "").trim();
                                    const list = raw && raw !== "—" ? raw.split("\n").filter((s) => s.trim()) : [];
                                    setEditingMeasuresList(list);
                                    setNewMeasureInDialog("");
                                    setShowSuggestionsInDialog(false);
                                  }}
                                  title="Voir / Éditer les mesures"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (row.action) {
                                      deleteActionMutation.mutate(row.action.id);
                                    }
                                  }}
                                  disabled={!row.action}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Mesures à mettre en place (menu comme image 3) */}
      {measuresDialogRow && (
        <Dialog
          open={!!measuresDialogRow}
          onOpenChange={(open) => {
            if (!open) setMeasuresDialogRow(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mesures à mettre en place</DialogTitle>
              <p className="text-sm text-muted-foreground">{measuresDialogRow.unitName} — {measuresDialogRow.risk.danger}</p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Mesures de prévention recommandées</Label>
                <p className="text-sm text-muted-foreground italic mt-1 bg-muted/50 p-2 rounded">
                  {measuresDialogRow.risk.measures || "—"}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Mesures à mettre en place</Label>
                  <Badge variant="outline" className="text-xs">{editingMeasuresList.length} mesure(s)</Badge>
                </div>
                {editingMeasuresList.length > 0 && (
                  <div className="space-y-1.5">
                    {editingMeasuresList.map((measure, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                      >
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        <span className="text-sm flex-1">{measure}</span>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => setEditingMeasuresList((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!readOnly && (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ajouter une mesure manuellement..."
                        value={newMeasureInDialog}
                        onChange={(e) => setNewMeasureInDialog(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newMeasureInDialog.trim()) {
                              setEditingMeasuresList((prev) => [...prev, newMeasureInDialog.trim()]);
                              setNewMeasureInDialog("");
                            }
                          }
                        }}
                        className="h-9 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 flex-shrink-0"
                        onClick={() => {
                          if (newMeasureInDialog.trim()) {
                            setEditingMeasuresList((prev) => [...prev, newMeasureInDialog.trim()]);
                            setNewMeasureInDialog("");
                          }
                        }}
                        disabled={!newMeasureInDialog.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(() => {
                      const family = measuresDialogRow.risk.family || "Ergonomique";
                      const suggestions = SUGGESTED_MEASURES[family] || [];
                      return suggestions.length > 0 ? (
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600 dark:text-blue-400 h-7 px-2"
                            onClick={() => setShowSuggestionsInDialog(!showSuggestionsInDialog)}
                          >
                            {showSuggestionsInDialog ? "Masquer les suggestions" : `Voir ${suggestions.length} suggestion(s) pour « ${family} »`}
                          </Button>
                          {showSuggestionsInDialog && (
                            <div className="space-y-1 mt-2 max-h-[200px] overflow-y-auto border rounded-md p-2 bg-blue-50/50 dark:bg-blue-950/10">
                              {suggestions.map((measure, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left text-sm p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center gap-2"
                                  onClick={() => {
                                    setEditingMeasuresList((prev) => [...prev, measure]);
                                  }}
                                >
                                  <Plus className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                  <span>{measure}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMeasuresDialogRow(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  const value = editingMeasuresList.join("\n");
                  saveMeasuresToImplement(measuresDialogRow, value);
                  setMeasuresDialogRow(null);
                }}
                disabled={updateMeasuresMutation.isPending || createActionForRiskMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Ajouter */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titre de l'action"
              />
            </div>
            <div>
              <Label>Description (optionnel)</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description"
              />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() =>
                createActionMutation.mutate({
                  title: newTitle.trim(),
                  description: newDescription.trim() || undefined,
                  priority: newPriority,
                })
              }
              disabled={!newTitle.trim() || createActionMutation.isPending}
            >
              {createActionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Éditer */}
      <Dialog
        open={!!editAction}
        onOpenChange={(open) => !open && setEditAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;action</DialogTitle>
          </DialogHeader>
          {editAction && (
            <EditActionForm
              action={editAction}
              onSave={(updates) =>
                updateActionMutation.mutate({
                  actionId: editAction.id,
                  updates,
                })
              }
              onCancel={() => setEditAction(null)}
              isPending={updateActionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Suggestions IA */}
      <Dialog open={aiSuggestionsOpen} onOpenChange={setAiSuggestionsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggestions par IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {aiSuggestions.length === 0 && !aiLoading && (
              <p className="text-muted-foreground">Aucune suggestion.</p>
            )}
            {aiSuggestions.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <Checkbox
                  checked={selectedAi.has(i)}
                  onCheckedChange={(checked) => {
                    setSelectedAi((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(i);
                      else next.delete(i);
                      return next;
                    });
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{s.title}</p>
                  {s.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {s.description}
                    </p>
                  )}
                  <Badge variant="secondary" className="mt-1">
                    {PRIORITY_LABELS[s.priority] ?? s.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiSuggestionsOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => addFromAi.mutate(Array.from(selectedAi))}
              disabled={selectedAi.size === 0 || addFromAi.isPending}
            >
              Ajouter les {selectedAi.size} sélectionnée(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suggestions Bibliothèque */}
      <Dialog
        open={librarySuggestionsOpen}
        onOpenChange={setLibrarySuggestionsOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggestions depuis la bibliothèque</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {librarySuggestions.length === 0 && !libraryLoading && (
              <p className="text-muted-foreground">Aucune mesure trouvée.</p>
            )}
            {librarySuggestions.map((s, i) => (
              <div
                key={s.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <Checkbox
                  checked={selectedLibrary.has(i)}
                  onCheckedChange={(checked) => {
                    setSelectedLibrary((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(i);
                      else next.delete(i);
                      return next;
                    });
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{s.measures}</p>
                  {s.family && (
                    <Badge variant="outline" className="mt-1">
                      {s.family}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLibrarySuggestionsOpen(false)}
            >
              Fermer
            </Button>
            <Button
              onClick={() => addFromLibrary.mutate(Array.from(selectedLibrary))}
              disabled={
                selectedLibrary.size === 0 || addFromLibrary.isPending
              }
            >
              Ajouter les {selectedLibrary.size} sélectionnée(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditActionForm({
  action,
  onSave,
  onCancel,
  isPending,
}: {
  action: ActionRow;
  onSave: (updates: Partial<ActionRow>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(action.title);
  const [description, setDescription] = useState(action.description ?? "");
  const [priority, setPriority] = useState(action.priority);
  const [status, setStatus] = useState(action.status);

  return (
    <>
      <div className="space-y-4 py-4">
        <div>
          <Label>Titre</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
        </div>
        <div>
          <Label>Priorité</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Faible</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="completed">Terminée</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.trim() || null,
              priority,
              status,
            })
          }
          disabled={!title.trim() || isPending}
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </>
  );
}
