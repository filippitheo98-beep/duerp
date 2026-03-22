import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DocumentTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidation?: (isValid: boolean) => void;
  companyName?: string;
  companyId?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function DocumentTitleInput({
  value,
  onChange,
  onValidation,
  companyName = '',
  companyId,
  disabled = false,
  placeholder = 'Nom du document DUERP'
}: DocumentTitleInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const { toast } = useToast();

  // Validation automatique quand le titre change
  useEffect(() => {
    if (value.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        validateTitle(value);
      }, 500); // Délai pour éviter trop de requêtes

      return () => clearTimeout(timeoutId);
    } else {
      setIsValid(true);
      setValidationMessage('');
      onValidation?.(false);
    }
  }, [value]);

  const validateTitle = async (title: string) => {
    if (!title.trim()) {
      setIsValid(false);
      setValidationMessage('Le titre ne peut pas être vide');
      onValidation?.(false);
      return;
    }

    setIsValidating(true);
    try {
      // Simuler une vérification d'unicité
      const response = await apiRequest('/api/duerp/generate-title', {
        method: 'POST',
        body: JSON.stringify({ baseTitle: title, ...(companyId != null && { companyId }) }),
      });

      if (response.title === title) {
        setIsValid(true);
        setValidationMessage('✓ Titre disponible');
        onValidation?.(true);
      } else {
        setIsValid(false);
        setValidationMessage(`Ce titre existe déjà. Suggestion: "${response.title}"`);
        onValidation?.(false);
      }
    } catch (error) {
      setIsValid(false);
      setValidationMessage('Erreur lors de la validation');
      onValidation?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleGenerateUnique = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom de l'entreprise est requis pour générer un titre unique",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    try {
      const baseTitle = `${companyName} - DUERP`;
      const response = await apiRequest('/api/duerp/generate-title', {
        method: 'POST',
        body: JSON.stringify({ baseTitle, ...(companyId != null && { companyId }) }),
      });

      onChange(response.title);
      toast({
        title: "Titre généré",
        description: `Titre unique généré: "${response.title}"`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer un titre unique",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="document-title">Titre du document</Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id="document-title"
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`pr-8 ${
              !isValid ? 'border-red-500' : isValid && value?.trim() ? 'border-green-500' : ''
            }`}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            {isValidating ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : value.trim() ? (
              isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateUnique}
          disabled={isValidating || disabled || !companyName.trim()}
          className="shrink-0"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Générer titre unique"
          )}
        </Button>
      </div>
      {validationMessage && (
        <p className={`text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
          {validationMessage}
        </p>
      )}
    </div>
  );
}