import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Phone, Mail, Users, MapPin, Briefcase, FileText, Upload, X, File, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Company, UploadedDocument } from "@shared/schema";

const companyInfoSchema = z.object({
  name: z.string().min(1, "Le nom de la société est requis"),
  activity: z.string().min(1, "Le secteur d'activité est requis"),
  description: z.string().optional(),
  sector: z.string().optional(),
  address: z.string().optional(),
  siret: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format d'email invalide").optional().or(z.literal("")),
  employeeCount: z.number().min(0, "Le nombre d'employés ne peut pas être négatif").default(0),
});

type CompanyInfoData = z.infer<typeof companyInfoSchema>;

interface CompanyInfoStepProps {
  onSubmit: (data: CompanyInfoData) => void;
  onSave: (data: CompanyInfoData) => void;
  initialData?: Company | null;
  isLoading?: boolean;
  companyId?: number;
  readOnly?: boolean;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  extractedText?: string;
  description?: string;
  uploading?: boolean;
  error?: string;
}

export default function CompanyInfoStep({ 
  onSubmit, 
  onSave, 
  initialData, 
  isLoading = false,
  companyId,
  readOnly = false
}: CompanyInfoStepProps) {
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<CompanyInfoData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      name: "",
      activity: "",
      description: "",
      sector: "",
      address: "",
      siret: "",
      phone: "",
      email: "",
      employeeCount: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        activity: initialData.activity || "",
        description: (initialData as any).description || "",
        sector: initialData.sector || "",
        address: initialData.address || "",
        siret: initialData.siret || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        employeeCount: initialData.employeeCount || 0,
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    if (companyId) {
      fetchUploadedDocuments();
    }
  }, [companyId]);

  const fetchUploadedDocuments = async () => {
    if (!companyId) return;
    try {
      const response = await fetch(`/api/companies/${companyId}/documents`);
      if (response.ok) {
        const docs: UploadedDocument[] = await response.json();
        setUploadedFiles(docs.map(doc => ({
          id: doc.id.toString(),
          name: doc.fileName,
          size: doc.fileSize || 0,
          type: doc.fileType,
          extractedText: doc.extractedText || undefined,
          description: doc.description || undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSubmit = (data: CompanyInfoData) => {
    onSubmit(data);
  };

  const handleSave = () => {
    const data = form.getValues();
    onSave(data);
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string || '');
        };
        reader.onerror = () => resolve('');
        reader.readAsText(file);
      } else {
        resolve(`[Document: ${file.name}] - Contenu non extractible automatiquement. Veuillez ajouter une description.`);
      }
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt|xls|xlsx)$/i)) {
        toast({
          title: "Format non supporté",
          description: `Le fichier "${file.name}" n'est pas dans un format accepté (PDF, Word, Excel, TXT).`,
          variant: "destructive",
        });
        continue;
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      setUploadedFiles(prev => [...prev, {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        uploading: true,
      }]);

      try {
        const extractedText = await extractTextFromFile(file);

        if (companyId) {
          const savedDoc = await apiRequest(`/api/companies/${companyId}/documents`, {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              extractedText: extractedText,
              description: '',
            }),
          });
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === tempId 
              ? { ...f, id: savedDoc.id.toString(), uploading: false, extractedText }
              : f
          ));
        } else {
          setUploadedFiles(prev => prev.map(f => 
            f.id === tempId 
              ? { ...f, uploading: false, extractedText }
              : f
          ));
        }

        toast({
          title: "Document ajouté",
          description: `"${file.name}" a été ajouté avec succès.`,
        });
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === tempId 
            ? { ...f, uploading: false, error: 'Erreur lors de l\'upload' }
            : f
        ));
        toast({
          title: "Erreur d'upload",
          description: `Impossible d'ajouter "${file.name}".`,
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (companyId && !fileId.startsWith('temp-')) {
      try {
        await apiRequest(`/api/companies/${companyId}/documents/${fileId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDescriptionChange = async (fileId: string, description: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, description } : f
    ));

    if (companyId && !fileId.startsWith('temp-')) {
      try {
        await apiRequest(`/api/companies/${companyId}/documents/${fileId}`, {
          method: 'PATCH',
          body: JSON.stringify({ description }),
        });
      } catch (error) {
        console.error('Error updating document description:', error);
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [companyId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informations de la société
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={readOnly ? (e) => e.preventDefault() : form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Nom de la société *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Entrez le nom de la société"
                          data-testid="input-company-name"
                          disabled={readOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIRET</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 456 789 00012"
                          data-testid="input-siret"
                          disabled={readOnly}
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
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Secteur d'activité *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Commerce de détail, Services informatiques, BTP..."
                          data-testid="input-activity"
                          disabled={readOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Secteur (optionnel)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Industrie, Services, Agriculture..."
                          data-testid="input-sector"
                          disabled={readOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Adresse complète
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Rue de la Paix, 75001 Paris"
                          data-testid="input-address"
                          disabled={readOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="01 23 45 67 89"
                          data-testid="input-phone"
                          disabled={readOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="contact@entreprise.com"
                          type="email"
                          data-testid="input-email"
                          disabled={readOnly}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employeeCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Nombre d'employés
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="10"
                          type="number"
                          min="0"
                          data-testid="input-employee-count"
                          disabled={readOnly}
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => {
                            field.onChange(e.target.value ? parseInt(e.target.value) : 0);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!readOnly && (
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="min-w-32"
                    data-testid="button-continue"
                  >
                    {isLoading ? 'Sauvegarde...' : 'Continuer'}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Description détaillée pour l'IA
          </CardTitle>
          <CardDescription>
            Plus vous décrivez votre entreprise en détail, plus l'IA générera des risques précis et pertinents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea 
              disabled={readOnly}
              placeholder={`Décrivez votre entreprise en détail pour aider l'IA à identifier les risques pertinents :

• Quelles sont les principales activités de votre entreprise ?
• Quels types d'équipements ou machines utilisez-vous ?
• Quels produits chimiques ou matières dangereuses manipulez-vous ?
• Comment sont organisés les espaces de travail ?
• Quels sont les processus de fabrication ou de service ?
• Y a-t-il des travaux en hauteur, en espace confiné, ou des conditions particulières ?
• Quels sont les principaux risques que vous avez déjà identifiés ?
• Quelles mesures de prévention sont déjà en place ?

Exemple : "Notre entreprise de menuiserie emploie 15 personnes réparties sur 3 ateliers. Nous utilisons des machines-outils (scies circulaires, dégauchisseuses, toupies), manipulons des colles et vernis, et travaillons parfois en hauteur pour des installations. Nous avons des EPI de base mais souhaitons renforcer notre prévention..."`}
              className="min-h-[300px] text-base leading-relaxed"
              data-testid="textarea-description"
              value={form.watch('description') || ''}
              onChange={(e) => form.setValue('description', e.target.value)}
            />
            <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Astuce :</strong> Au lieu de remplir tous les champs un par un, vous pouvez simplement décrire votre entreprise ici. 
                L'IA utilisera cette description pour générer des risques adaptés à votre situation réelle.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents de référence (optionnel)
          </CardTitle>
          <CardDescription>
            Ajoutez des documents existants (anciens DUERP, fiches de postes, rapports d'inspection...) pour enrichir l'analyse IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={readOnly ? undefined : handleDragOver}
            onDragLeave={readOnly ? undefined : handleDragLeave}
            onDrop={readOnly ? undefined : handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${readOnly ? 'cursor-default opacity-75' : 'cursor-pointer'}
              ${isDragging && !readOnly
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
            `}
            onClick={readOnly ? undefined : () => document.getElementById('file-upload')?.click()}
            data-testid="dropzone-documents"
          >
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
              className="hidden"
              disabled={readOnly}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-medium mb-1">
              {isDragging ? 'Déposez les fichiers ici' : 'Glissez-déposez vos documents'}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              ou cliquez pour parcourir vos fichiers
            </p>
            <p className="text-xs text-muted-foreground">
              Formats acceptés : PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Texte (.txt)
            </p>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Documents ajoutés ({uploadedFiles.length})</h4>
              {uploadedFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border"
                  data-testid={`document-item-${file.id}`}
                >
                  <File className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{file.name}</p>
                      {file.uploading && (
                        <span className="text-xs text-muted-foreground animate-pulse">Upload en cours...</span>
                      )}
                      {file.error && (
                        <span className="text-xs text-destructive">{file.error}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    <Textarea
                      placeholder="Décrivez le contenu de ce document pour aider l'IA (ex: 'Ancien DUERP de 2022 avec focus sur les risques chimiques')"
                      className="mt-2 text-sm min-h-[60px]"
                      disabled={readOnly}
                      value={file.description || ''}
                      onChange={(e) => handleDescriptionChange(file.id, e.target.value)}
                      data-testid={`document-description-${file.id}`}
                    />
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(file.id)}
                      className="flex-shrink-0"
                      data-testid={`button-remove-document-${file.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>Note :</strong> Les documents uploadés sont analysés localement. Pour les PDF et Word, 
              veuillez ajouter une description du contenu pour que l'IA puisse les exploiter efficacement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}