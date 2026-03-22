import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Shield,
  Target,
  Activity,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  CheckSquare,
  Loader2
} from 'lucide-react';
import type { Risk } from '@shared/schema';

interface AnalyticsStepProps {
  risks: Risk[];
  companyName: string;
  onSave: () => void;
  onGenerateWord: () => void;
  onExportExcel?: () => void;
  isExportingExcel?: boolean;
  documentId?: string | null;
  onFinalize?: () => void;
  isFinalized?: boolean;
  isFinalizing?: boolean;
  locations: any[];
  workStations: any[];
  preventionMeasures: any[];
  readOnly?: boolean;
}

function getRiskLevel(risk: Risk): 'Important' | 'Moyen' | 'Faible' {
  if (risk.priority === 'Priorité 1 (Forte)') return 'Important';
  if (risk.priority === 'Priorité 2 (Moyenne)') return 'Moyen';
  if (risk.priority === 'Priorité 3 (Modéré)') return 'Moyen';
  return 'Faible';
}

const COLORS: Record<string, string> = {
  'Important': '#EF4444',
  'Moyen': '#F59E0B',
  'Faible': '#10B981'
};

const PRIORITY_COLORS: Record<string, string> = {
  'Priorité 1 (Forte)': '#EF4444',
  'Priorité 2 (Moyenne)': '#F97316',
  'Priorité 3 (Modéré)': '#F59E0B',
  'Priorité 4 (Faible)': '#10B981',
};

const RISK_TYPE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316',
  '#06B6D4', '#84CC16', '#EF4444', '#6B7280',
  '#14B8A6', '#A855F7', '#F43F5E', '#0EA5E9'
];

export default function AnalyticsStep({ risks, companyName, onSave, onGenerateWord, onExportExcel, isExportingExcel, documentId, onFinalize, isFinalized, isFinalizing, locations, workStations, preventionMeasures, readOnly = false }: AnalyticsStepProps) {
  const totalRisks = risks.length;

  const highRisks = risks.filter(r => getRiskLevel(r) === 'Important').length;
  const mediumRisks = risks.filter(r => getRiskLevel(r) === 'Moyen').length;
  const lowRisks = risks.filter(r => getRiskLevel(r) === 'Faible').length;

  const priorityData = [
    { name: 'P1 - Forte', count: risks.filter(r => r.priority === 'Priorité 1 (Forte)').length, fill: PRIORITY_COLORS['Priorité 1 (Forte)'] },
    { name: 'P2 - Moyenne', count: risks.filter(r => r.priority === 'Priorité 2 (Moyenne)').length, fill: PRIORITY_COLORS['Priorité 2 (Moyenne)'] },
    { name: 'P3 - Modéré', count: risks.filter(r => r.priority === 'Priorité 3 (Modéré)').length, fill: PRIORITY_COLORS['Priorité 3 (Modéré)'] },
    { name: 'P4 - Faible', count: risks.filter(r => r.priority === 'Priorité 4 (Faible)').length, fill: PRIORITY_COLORS['Priorité 4 (Faible)'] },
  ];

  const riskTypeData = risks.reduce((acc, risk) => {
    const existing = acc.find(item => item.name === risk.family);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: risk.family, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const sourceData = risks.reduce((acc, risk) => {
    const source = risk.source || 'Non spécifié';
    const existing = acc.find(item => item.name === source);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: source, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const avgScore = totalRisks > 0 ? Math.round(risks.reduce((sum, r) => sum + r.riskScore, 0) / totalRisks) : 0;
  const maxScore = totalRisks > 0 ? Math.max(...risks.map(r => r.riskScore)) : 0;

  const topRiskTypes = [...riskTypeData].sort((a, b) => b.value - a.value).slice(0, 5);

  const validatedCount = risks.filter(r => r.isValidated).length;

  if (totalRisks === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analyse des risques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground text-center py-4">
              Aucun risque à analyser. Générez d'abord les risques à l'étape précédente.
            </div>
            {(onExportExcel || onGenerateWord) && documentId && (
              <div className="flex flex-wrap gap-3 justify-center pt-4 border-t">
                {onExportExcel && (
                  <Button 
                    onClick={onExportExcel} 
                    variant="outline" 
                    size="lg"
                    disabled={isExportingExcel}
                  >
                    {isExportingExcel ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    {isExportingExcel ? 'Export...' : 'Exporter Excel'}
                  </Button>
                )}
                {onGenerateWord && (
                  <Button onClick={onGenerateWord} variant="outline" size="lg">
                    <FileText className="h-4 w-4 mr-2" />
                    Exporter Word
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{totalRisks}</div>
                <div className="text-sm text-muted-foreground">Total risques</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{highRisks}</div>
                <div className="text-sm text-muted-foreground">Priorité forte</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{avgScore}</div>
                <div className="text-sm text-muted-foreground">Score moyen</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{validatedCount}/{totalRisks}</div>
                <div className="text-sm text-muted-foreground">Validés</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition par priorité</CardTitle>
        </CardHeader>
        <CardContent>
          <div data-chart="bar">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [`${value} risque(s)`, 'Nombre']} />
                <Bar dataKey="count">
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Familles de risques</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-chart="pie">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '…' : name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskTypeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_TYPE_COLORS[index % RISK_TYPE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} risque(s)`, 'Nombre']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risques par unité de travail</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} risque(s)`, 'Nombre']} />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Familles de risques les plus fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRiskTypes.map((riskType, index) => (
                <div key={riskType.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <span className="font-medium text-sm">{riskType.name}</span>
                  </div>
                  <Badge variant="secondary">
                    {riskType.value} risque{riskType.value > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques détaillées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Score le plus élevé</span>
                <Badge variant={maxScore >= 500 ? "destructive" : "secondary"}>{maxScore}</Badge>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Score moyen</span>
                <Badge variant="secondary">{avgScore}</Badge>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Unités de travail</span>
                <Badge variant="secondary">{sourceData.length}</Badge>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Familles de risques</span>
                <Badge variant="secondary">{riskTypeData.length}</Badge>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Risques validés</span>
                <Badge variant="secondary">{validatedCount}/{totalRisks}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recommandations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {highRisks > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-400">
                    Action prioritaire
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {highRisks} risque{highRisks > 1 ? 's' : ''} de priorité forte identifié{highRisks > 1 ? 's' : ''} (score ≥ 500). 
                  Mettre en place des mesures de prévention immédiates.
                </p>
              </div>
            )}
            
            {mediumRisks > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-700 dark:text-yellow-400">
                    Surveillance recommandée
                  </span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  {mediumRisks} risque{mediumRisks > 1 ? 's' : ''} de priorité moyenne à modérée à surveiller. 
                  Planifier des mesures préventives dans les prochains mois.
                </p>
              </div>
            )}

            {validatedCount < totalRisks && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-700 dark:text-orange-400">
                    Validation en attente
                  </span>
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  {totalRisks - validatedCount} risque{(totalRisks - validatedCount) > 1 ? 's' : ''} non encore validé{(totalRisks - validatedCount) > 1 ? 's' : ''}. 
                  Retournez au tableau des risques pour les valider.
                </p>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-blue-700 dark:text-blue-400">
                  Rappel réglementaire
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Le DUERP doit être révisé au moins une fois par an et après tout changement significatif 
                dans les conditions de travail.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {!readOnly && (
                <Button onClick={onSave} variant="outline" size="lg">
                  Sauvegarder le brouillon
                </Button>
              )}

              <Button onClick={onGenerateWord} variant="outline" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Exporter Word
              </Button>

              {onExportExcel && (
                <Button 
                  onClick={onExportExcel} 
                  variant="outline" 
                  size="lg"
                  disabled={isExportingExcel || (!documentId && risks.length === 0)}
                >
                  {isExportingExcel ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  {isExportingExcel ? 'Export...' : 'Exporter Excel'}
                </Button>
              )}

              {onFinalize && !readOnly && (
                <Button 
                  onClick={onFinalize} 
                  size="lg" 
                  disabled={isFinalizing || isFinalized}
                  className={isFinalized ? 'bg-green-600 hover:bg-green-600' : ''}
                >
                  {isFinalizing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isFinalized ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  )}
                  {isFinalizing ? 'Finalisation...' : isFinalized ? 'DUERP finalisé' : 'Finaliser le DUERP'}
                </Button>
              )}
            </div>

            {isFinalized && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Ce DUERP est finalisé et enregistré. La prochaine révision est prévue dans un an. 
                  Vous pouvez le retrouver dans l'onglet "Mes DUERP".
                </p>
              </div>
            )}

            {!isFinalized && onFinalize && !readOnly && (
              <p className="text-sm text-muted-foreground">
                Finalisez le DUERP pour l'enregistrer officiellement et démarrer le suivi de révision annuelle.
                Vous pourrez toujours le modifier ou le mettre à jour ultérieurement.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}