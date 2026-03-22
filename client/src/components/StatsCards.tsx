import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Building, 
  CheckCircle, 
  FileText, 
  TrendingUp, 
  Users 
} from 'lucide-react';

interface StatsCardsProps {
  stats: {
    totalCompanies: number;
    totalDocuments: number;
    pendingActions: number;
    completedActions: number;
    riskScore: number;
    expiringSoon: number;
  };
  risks?: any[];
}

export function StatsCards({ stats, risks = [] }: StatsCardsProps) {
  const riskSeverityCount = risks.reduce((acc, risk) => {
    const severity = risk.finalRisk?.toLowerCase() || 'unknown';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completionRate = stats.totalDocuments > 0 
    ? Math.round((stats.completedActions / (stats.completedActions + stats.pendingActions)) * 100)
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
      <Card className="card-enhanced group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Entreprises</CardTitle>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
            <Building className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stats.totalCompanies}</div>
          <p className="text-sm text-muted-foreground">
            Documents créés
          </p>
        </CardContent>
      </Card>

      <Card className="card-enhanced group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Documents DUERP</CardTitle>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
            <FileText className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{stats.totalDocuments}</div>
          <p className="text-sm text-muted-foreground">
            Total générés
          </p>
        </CardContent>
      </Card>

      <Card className="card-enhanced group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Actions en cours</CardTitle>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{stats.pendingActions}</div>
          <p className="text-sm text-muted-foreground">
            <span className="text-orange-600 font-medium">{stats.expiringSoon} expire(nt) bientôt</span>
          </p>
        </CardContent>
      </Card>

      <Card className="card-enhanced group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Taux de completion</CardTitle>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">{completionRate}%</div>
          <Progress value={completionRate} className="mt-3 h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium">{stats.completedActions}</span> actions terminées
          </p>
        </CardContent>
      </Card>

      {risks.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-4 transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Répartition des risques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {riskSeverityCount.faible && (
                <Badge variant="secondary" className="risk-low">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Faible: {riskSeverityCount.faible}
                </Badge>
              )}
              {riskSeverityCount.moyen && (
                <Badge variant="secondary" className="risk-medium">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Moyen: {riskSeverityCount.moyen}
                </Badge>
              )}
              {riskSeverityCount.important && (
                <Badge variant="secondary" className="risk-high">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Important: {riskSeverityCount.important}
                </Badge>
              )}
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                Total: {risks.length} risques
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}