import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RevisionNotifications } from '@/components/RevisionNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, AlertTriangle, Eye, Edit } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getQueryFn } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export default function Revisions() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: revisionData, isLoading } = useQuery({
    queryKey: ['/api/revisions/needed'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const stats = revisionData?.stats || {
    overdue: 0,
    dueSoon: 0,
    upToDate: 0,
    total: 0
  };

  const nextReviewDate = revisionData?.dueSoon?.[0]?.nextReviewDate;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Révisions DUERP</h1>
            <p className="text-muted-foreground mt-2">
              Gérez le suivi des révisions annuelles de vos documents d'évaluation des risques
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Révisions en retard
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                Documents dépassant la date limite
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                À réviser sous 30 jours
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dueSoon}</div>
              <p className="text-xs text-muted-foreground">
                Notifications à envoyer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Révisions à jour
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upToDate}</div>
              <p className="text-xs text-muted-foreground">
                Documents conformes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prochaine révision
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {nextReviewDate ? new Date(nextReviewDate).toLocaleDateString('fr-FR') : '--'}
              </div>
              <p className="text-xs text-muted-foreground">
                Plus proche échéance
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations légales</CardTitle>
            <CardDescription>
              Cadre réglementaire des révisions DUERP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Obligation légale</h4>
                <p className="text-sm text-muted-foreground">
                  Selon l'article R4121-2 du Code du travail, le DUERP doit être mis à jour au moins une fois par an.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Déclencheurs de révision</h4>
                <p className="text-sm text-muted-foreground">
                  La révision est obligatoire en cas de modification des conditions de travail ou d'accident du travail.
                </p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Rappel :</strong> Ce système vous notifie automatiquement 30 jours avant l'échéance annuelle 
                pour vous laisser le temps de réviser et mettre à jour vos documents.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Documents nécessitant une révision */}
        {!isLoading && revisionData && (
          <>
            {/* Documents en retard */}
            {revisionData.overdue?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Documents en retard de révision
                  </CardTitle>
                  <CardDescription>
                    Ces documents dépassent leur date de révision obligatoire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revisionData.overdue.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 border-red-200">
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.companyName}</p>
                          <p className="text-xs text-red-600">
                            Révision prévue le {doc.nextReviewDate ? new Date(doc.nextReviewDate).toLocaleDateString('fr-FR') : 'Non définie'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setLocation(`/duerp-generator?viewDocumentId=${doc.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                          <Button size="sm" onClick={() => setLocation(`/duerp-generator?editDocumentId=${doc.id}`)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Réviser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents à réviser bientôt */}
            {revisionData.dueSoon?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Documents à réviser sous 30 jours
                  </CardTitle>
                  <CardDescription>
                    Ces documents arrivent à échéance prochainement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revisionData.dueSoon.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.companyName}</p>
                          <p className="text-xs text-yellow-600">
                            Révision prévue le {new Date(doc.nextReviewDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setLocation(`/duerp-generator?viewDocumentId=${doc.id}`)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                          <Button size="sm" onClick={() => setLocation(`/duerp-generator?editDocumentId=${doc.id}`)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Réviser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <RevisionNotifications />
      </div>
      </div>
    </div>
  );
}