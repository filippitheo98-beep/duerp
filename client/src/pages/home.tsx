import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Shield, Calendar, AlertTriangle, Clock, CheckCircle, Library, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getQueryFn } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCards";

interface DashboardStats {
  totalCompanies: number;
  totalDocuments: number;
  pendingActions: number;
  expiringSoon: number;
  completedActions: number;
  riskScore: number;
}

interface RecentActivity {
  id: string;
  type: 'document_created' | 'document_updated' | 'action_completed' | 'comment_added';
  title: string;
  description: string;
  timestamp: string;
  priority?: 'high' | 'medium' | 'low';
}

export default function Home() {
  const { user, isLoading } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['/api/dashboard/activity'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: expiringDocuments, isLoading: expiringLoading } = useQuery({
    queryKey: ['/api/documents/expiring'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-sm">Nouveau DUERP</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="/duerp-generator">
                  <Button size="sm" className="w-full">
                    Créer un document
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-sm">Documents existants</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="/documents">
                  <Button variant="outline" size="sm" className="w-full">
                    Voir tous
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-sm">Révisions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="/revisions">
                  <Button variant="outline" size="sm" className="w-full">
                    Suivi des révisions
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <Library className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-sm">Bibliothèque</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="/risk-library">
                  <Button variant="outline" size="sm" className="w-full">
                    Voir les risques
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vue d'ensemble</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-12 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Documents DUERP</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
                        <p className="text-xs text-gray-500">Total créés</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Actions en cours</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.pendingActions || 0}</p>
                        <p className="text-xs text-gray-500">À traiter</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Actions terminées</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.completedActions || 0}</p>
                        <p className="text-xs text-gray-500">Ce mois</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Révisions à venir</p>
                        <p className="text-2xl font-bold text-gray-900">{stats?.expiringSoon || 0}</p>
                        <p className="text-xs text-gray-500">Dans 30 jours</p>
                      </div>
                      <Calendar className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Alerts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Alerts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alertes importantes</h3>
            <div className="space-y-3">
              {expiringLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : expiringDocuments?.length > 0 ? (
                expiringDocuments.map((doc: any) => (
                  <Alert key={doc.id} className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Le document DUERP de <strong>{doc.companyName}</strong> expire le{' '}
                      {new Date(doc.nextReviewDate).toLocaleDateString('fr-FR')}
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Aucune alerte importante pour le moment
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
            <Card>
              <CardContent className="p-6">
                {activityLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity?.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity: RecentActivity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {activity.type === 'document_created' && (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          {activity.type === 'action_completed' && (
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            {activity.priority && (
                              <Badge variant={activity.priority === 'high' ? 'destructive' : 'secondary'}>
                                {activity.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Aucune activité récente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}