import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  BarChart3, 
  PieChart, 
  LineChart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { Header } from '@/components/Header';
import { getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReportData {
  totalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  completedActions: number;
  pendingActions: number;
  companiesAnalyzed: number;
  riskTrends: Array<{
    month: string;
    risks: number;
    actions: number;
  }>;
  risksByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  performanceMetrics: {
    averageResolutionTime: number;
    complianceRate: number;
    preventionEffectiveness: number;
  };
}

export default function Reports() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedReport, setSelectedReport] = useState('overview');

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports', selectedPeriod],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/reports/export?format=${format}&period=${selectedPeriod}`, {
        method: 'GET',
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const data = reportData || {
    totalRisks: 0,
    highRisks: 0,
    mediumRisks: 0,
    lowRisks: 0,
    completedActions: 0,
    pendingActions: 0,
    companiesAnalyzed: 0,
    riskTrends: [],
    risksByCategory: [],
    performanceMetrics: {
      averageResolutionTime: 0,
      complianceRate: 0,
      preventionEffectiveness: 0,
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Rapports et Statistiques</h1>
            <p className="text-muted-foreground">
              Analysez les performances de votre programme de sécurité
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportReport('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => exportReport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type de rapport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Vue d'ensemble</SelectItem>
              <SelectItem value="risks">Analyse des risques</SelectItem>
              <SelectItem value="actions">Actions préventives</SelectItem>
              <SelectItem value="compliance">Conformité</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total des risques</p>
                  <p className="text-2xl font-bold">{data.totalRisks}</p>
                  <p className="text-xs text-green-600">+12% vs mois dernier</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risques élevés</p>
                  <p className="text-2xl font-bold">{data.highRisks}</p>
                  <p className="text-xs text-red-600">-8% vs mois dernier</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Actions terminées</p>
                  <p className="text-2xl font-bold">{data.completedActions}</p>
                  <p className="text-xs text-green-600">+15% vs mois dernier</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taux de conformité</p>
                  <p className="text-2xl font-bold">{data.performanceMetrics.complianceRate}%</p>
                  <p className="text-xs text-green-600">+2% vs mois dernier</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Évolution des risques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Graphique des tendances</p>
                  <p className="text-xs text-gray-500">Données des 6 derniers mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Répartition par catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.risksByCategory.map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{category.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{category.count}</span>
                      <Badge variant="outline" className="text-xs">
                        {category.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Temps de résolution moyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {data.performanceMetrics.averageResolutionTime}
                </div>
                <div className="text-sm text-muted-foreground">jours</div>
                <div className="mt-4 text-xs text-green-600">
                  -2.3 jours vs mois dernier
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Efficacité de la prévention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {data.performanceMetrics.preventionEffectiveness}%
                </div>
                <div className="text-sm text-muted-foreground">taux de réussite</div>
                <div className="mt-4 text-xs text-green-600">
                  +5.2% vs mois dernier
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entreprises analysées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {data.companiesAnalyzed}
                </div>
                <div className="text-sm text-muted-foreground">ce mois</div>
                <div className="mt-4 text-xs text-green-600">
                  +3 nouvelles entreprises
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}