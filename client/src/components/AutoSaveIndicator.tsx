import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Save, Check, Clock } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSaved?: Date;
  isAutoSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

export function AutoSaveIndicator({ 
  lastSaved, 
  isAutoSaving = false, 
  hasUnsavedChanges = false 
}: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeAgo(`il y a ${minutes} min`);
      } else if (seconds > 0) {
        setTimeAgo(`il y a ${seconds} sec`);
      } else {
        setTimeAgo('à l\'instant');
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [lastSaved]);

  if (isAutoSaving) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <Save className="h-3 w-3 mr-1 animate-spin" />
        Sauvegarde...
      </Badge>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <Badge variant="secondary" className="animate-pulse-slow">
        <Clock className="h-3 w-3 mr-1" />
        Modifications non sauvegardées
      </Badge>
    );
  }

  if (lastSaved) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200">
        <Check className="h-3 w-3 mr-1" />
        Sauvegardé {timeAgo}
      </Badge>
    );
  }

  return null;
}