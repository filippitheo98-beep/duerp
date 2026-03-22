import { useState, useEffect } from 'react';
import { Bell, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DuerpDocument {
  id: number;
  title: string;
  companyId: number;
  nextReviewDate: string;
  lastRevisionDate: string;
  revisionNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RevisionNotificationsProps {
  showInHeader?: boolean;
}

export function RevisionNotifications({ showInHeader = false }: RevisionNotificationsProps) {
  const queryClient = useQueryClient();

  const { data: notificationsData = [] } = useQuery({
    queryKey: ['/api/revisions/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: neededRevisionsData = [] } = useQuery({
    queryKey: ['/api/revisions/needed'],
    refetchInterval: 30000,
  });

  const markNotifiedMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(`/api/revisions/${documentId}/notify`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/revisions/notifications'] });
    },
  });

  const updateRevisionMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest(`/api/revisions/${documentId}/update`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/revisions/needed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/revisions/notifications'] });
    },
  });

  const handleMarkAsNotified = async (documentId: number) => {
    await markNotifiedMutation.mutateAsync(documentId);
  };

  const handleUpdateRevision = async (documentId: number) => {
    await updateRevisionMutation.mutateAsync(documentId);
  };

  const getDaysUntilRevision = (dateString: string) => {
    const revisionDate = new Date(dateString);
    const today = new Date();
    return differenceInDays(revisionDate, today);
  };

  const getUrgencyLevel = (daysUntil: number) => {
    if (daysUntil <= 0) return 'overdue';
    if (daysUntil <= 7) return 'urgent';
    if (daysUntil <= 30) return 'warning';
    return 'normal';
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'overdue': return 'destructive';
      case 'urgent': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'urgent': return <Clock className="w-4 h-4" />;
      case 'warning': return <Bell className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (showInHeader) {
    const totalNotifications = notificationsData.length + neededRevisionsData.length;
    
    return (
      <div className="relative">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {totalNotifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {totalNotifications}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Révisions à venir
        </h2>
        <Badge variant="outline">
          {notificationsData.length + neededRevisionsData.length} notification(s)
        </Badge>
      </div>

      {/* Documents nécessitant une révision (dépassés) */}
      {neededRevisionsData.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Révisions en retard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {neededRevisionsData.map((doc: DuerpDocument) => {
              const daysOverdue = Math.abs(getDaysUntilRevision(doc.nextReviewDate));
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <p className="text-sm text-red-600">
                      En retard de {daysOverdue} jour(s)
                    </p>
                    <p className="text-xs text-gray-500">
                      Révision prévue : {format(new Date(doc.nextReviewDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUpdateRevision(doc.id)}
                    disabled={updateRevisionMutation.isPending}
                    className="ml-3"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marquer comme révisé
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Documents nécessitant une notification (30 jours avant) */}
      {notificationsData.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Révisions à prévoir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notificationsData.map((doc: DuerpDocument) => {
              const daysUntil = getDaysUntilRevision(doc.nextReviewDate);
              const urgencyLevel = getUrgencyLevel(daysUntil);
              
              return (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getUrgencyColor(urgencyLevel) as any} className="text-xs">
                        {getUrgencyIcon(urgencyLevel)}
                        <span className="ml-1">
                          {daysUntil > 0 ? `${daysUntil} jour(s)` : 'Aujourd\'hui'}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      Révision prévue : {format(new Date(doc.nextReviewDate), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsNotified(doc.id)}
                      disabled={markNotifiedMutation.isPending}
                    >
                      Reporter
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateRevision(doc.id)}
                      disabled={updateRevisionMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Réviser maintenant
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {notificationsData.length === 0 && neededRevisionsData.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">Aucune révision en attente</p>
            <p className="text-sm text-gray-500 mt-1">
              Tous vos documents DUERP sont à jour
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}