import {
  companies,
  duerpDocuments,
  riskTemplates,
  actions,
  comments,
  uploadedDocuments,
} from "./schemaDialect";
import type {
  Company,
  InsertCompany,
  Location,
  WorkUnit,
  Site,
  Risk,
  PreventionMeasure,
  DuerpDocument,
  RiskTemplate,
  Action,
  Comment,
  UploadedDocument,
  InsertUploadedDocument,
} from "@shared/schema";
import { familyLabelForExport, situationLabelForExport } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, asc, ne } from "drizzle-orm";
import crypto from 'crypto';
import { generateJson } from './ai-openai';
import { DUERP_JSON_SYSTEM_PROMPT } from './ai-prompts';

type OpenAiUserConfig = {
  apiKey: string;
  model?: string | null;
};

export interface IStorage {
  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  getCompaniesByOwner(ownerId: number): Promise<Company[]>;
  createCompany(company: InsertCompany & { ownerId?: number }): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company>;
  
  // DUERP document operations
  getDuerpDocument(companyId: number): Promise<DuerpDocument | undefined>;
  getDuerpDocumentById(id: number): Promise<DuerpDocument | undefined>;
  getDuerpDocuments(companyId: number): Promise<DuerpDocument[]>;
  getRisksForExport(documentId: number): Promise<{ risks: Array<Record<string, string | number>>; documentId: number }>;
  getPlanActionForExport(documentId: number): Promise<{ risks: Array<Record<string, string | number>>; documentId: number }>;
  createDuerpDocument(data: {
    companyId: number;
    title: string;
    workUnitsData?: any[];
    sites?: any[];
    locations: Location[];
    workStations: any[];
    finalRisks: Risk[];
    preventionMeasures: PreventionMeasure[];
  }): Promise<DuerpDocument>;
  updateDuerpDocument(id: number, updates: Partial<DuerpDocument>): Promise<DuerpDocument>;
  updateDuerpDocumentPartial(id: number, updates: {
    title?: string;
    locations?: Location[];
    workStations?: any[];
    finalRisks?: Risk[];
    preventionMeasures?: PreventionMeasure[];
    addRisks?: Risk[];
    removeRisks?: string[];
    updateRisks?: Array<{ id: string; updates: Partial<Risk> }>;
  }): Promise<DuerpDocument>;
  
  // Risk operations
  generateRisks(
    workUnitName: string,
    locationName: string,
    companyActivity: string,
    companyDescription?: string,
    openAiConfig?: OpenAiUserConfig
  ): Promise<Risk[]>;
  getRiskTemplates(sector?: string): Promise<RiskTemplate[]>;
  createRiskTemplate(template: Omit<RiskTemplate, 'id' | 'createdAt'>): Promise<RiskTemplate>;
  
  // Prevention measures operations
  generatePreventionRecommendations(companyActivity: string, risks: Risk[], locations: any[], workStations: any[]): Promise<any[]>;
  
  // Action operations
  getActionsByDuerp(duerpId: number): Promise<Action[]>;
  createAction(action: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action>;
  updateAction(id: number, updates: Partial<Action>): Promise<Action>;
  deleteAction(id: number): Promise<void>;
  extractRisksAndMeasuresFromDuerp(doc: DuerpDocument): { risks: Array<{ id: string; type?: string; danger: string; measures: string; priority?: string; family?: string }>; measures: Array<{ id: string; description: string; priority?: string; responsible?: string; deadline?: string }> };
  
  // Comment operations
  getCommentsByDuerp(duerpId: number): Promise<Comment[]>;
  createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment>;
  
  // Revision tracking operations
  getDocumentsNeedingRevision(): Promise<DuerpDocument[]>;
  getDocumentsNeedingNotification(): Promise<DuerpDocument[]>;
  markRevisionNotified(documentId: number): Promise<void>;
  updateRevisionDate(documentId: number): Promise<DuerpDocument>;
  
  // Utility operations
  generateUniqueDocumentTitle(baseTitle: string, companyId?: number): Promise<string>;
  
  // Uploaded document operations
  getUploadedDocuments(companyId: number): Promise<UploadedDocument[]>;
  createUploadedDocument(data: InsertUploadedDocument): Promise<UploadedDocument>;
  updateUploadedDocument(id: number, updates: Partial<UploadedDocument>): Promise<UploadedDocument>;
  deleteUploadedDocument(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompaniesByOwner(ownerId: number): Promise<Company[]> {
    return db.select().from(companies).where(eq(companies.ownerId, ownerId));
  }

  async createCompany(insertCompany: InsertCompany & { ownerId?: number }): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        ownerId: insertCompany.ownerId ?? null,
        name: insertCompany.name,
        activity: insertCompany.activity,
        description: insertCompany.description,
        sector: insertCompany.sector,
        address: insertCompany.address,
        siret: insertCompany.siret,
        phone: insertCompany.phone,
        email: insertCompany.email,
        employeeCount: insertCompany.employeeCount,
        logo: insertCompany.logo,
        existingPreventionMeasures: insertCompany.existingPreventionMeasures,
      })
      .returning();
    if (!company) throw new Error("Insert company failed");
    return company;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(companies.id, id))
      .returning();
    
    if (!company) {
      throw new Error(`Company with id ${id} not found`);
    }
    return company;
  }

  // DUERP document operations
  async getDuerpDocument(companyId: number): Promise<DuerpDocument | undefined> {
    const [document] = await db
      .select()
      .from(duerpDocuments)
      .where(eq(duerpDocuments.companyId, companyId))
      .orderBy(desc(duerpDocuments.createdAt))
      .limit(1);
    
    if (document && document.finalRisks) {
      // Recalculer les valeurs numériques et la priorité pour tous les risques
      document.finalRisks = (document.finalRisks as Risk[]).map(risk => this.recalculateRiskValues(risk));
    }
    
    return document;
  }

  async getDuerpDocumentById(id: number): Promise<DuerpDocument | undefined> {
    const [document] = await db
      .select()
      .from(duerpDocuments)
      .where(eq(duerpDocuments.id, id))
      .limit(1);
    
    if (document && document.finalRisks) {
      document.finalRisks = (document.finalRisks as Risk[]).map(risk => this.recalculateRiskValues(risk));
    }
    
    return document;
  }

  async getRisksForExport(documentId: number): Promise<{ risks: Array<Record<string, string | number>>; documentId: number }> {
    const doc = await this.getDuerpDocumentById(documentId);
    if (!doc) throw new Error(`Document ${documentId} non trouvé`);
    
    const flatRisks: Array<Record<string, string | number>> = [];
    
    const toRow = (risk: Risk, lieuUnite: string) => ({
      'Lieu / Unité de travail': lieuUnite,
      'Famille de risque': familyLabelForExport(risk),
      'Danger': risk.danger || '',
      'Situation dangereuse': situationLabelForExport(risk),
      'Gravité': risk.gravity || '',
      'Fréquence/Probabilité': risk.frequency || '',
      'Maîtrise': risk.control || '',
      'Score': risk.riskScore ?? 0,
      'Mesures existantes': Array.isArray(risk.existingMeasures) ? risk.existingMeasures.join(' ; ') : '',
      'Mesures à mettre en place': risk.measures || '',
    });
    
    // 1. Risks from work_units_data
    const workUnits = (doc.workUnitsData as WorkUnit[]) || [];
    for (const unit of workUnits) {
      for (const risk of (unit.risks || [])) {
        flatRisks.push(toRow(this.recalculateRiskValues(risk), unit.name));
      }
    }
    
    // 2. Risks from sites (legacy)
    const sites = (doc.sites as Site[]) || [];
    for (const site of sites) {
      for (const risk of (site.risks || [])) {
        flatRisks.push(toRow(this.recalculateRiskValues(risk), site.name));
      }
      for (const unit of site.workUnits || []) {
        for (const risk of (unit.risks || [])) {
          flatRisks.push(toRow(this.recalculateRiskValues(risk), `${site.name} > ${unit.name}`));
        }
      }
    }
    
    // 3. If no risks from hierarchy, use final_risks
    if (flatRisks.length === 0) {
      const finalRisks = (doc.finalRisks as Risk[]) || [];
      for (const risk of finalRisks) {
        flatRisks.push(toRow(risk, risk.source || '-'));
      }
    }
    
    return { risks: flatRisks, documentId };
  }

  async getPlanActionForExport(documentId: number): Promise<{ risks: Array<Record<string, string | number>>; documentId: number }> {
    const doc = await this.getDuerpDocumentById(documentId);
    if (!doc) throw new Error(`Document ${documentId} non trouvé`);
    const actionsList = await this.getActionsByDuerp(documentId);
    const actionByRiskId = new Map<string, string>();
    for (const a of actionsList) {
      if (a.sourceType === 'risk' && a.sourceId != null) {
        actionByRiskId.set(String(a.sourceId), a.title || '');
      }
    }
    const flatRisks: Array<Record<string, string | number>> = [];
    const toRow = (risk: Risk, lieuUnite: string) => ({
      'Lieu / Unité de travail': lieuUnite,
      'Famille de risque': familyLabelForExport(risk),
      'Danger': risk.danger || '',
      'Situation dangereuse': situationLabelForExport(risk),
      'Gravité': risk.gravity || '',
      'Fréquence/Probabilité': risk.frequency || '',
      'Maîtrise': risk.control || '',
      'Score': risk.riskScore ?? 0,
      'Mesures existantes': Array.isArray(risk.existingMeasures) ? risk.existingMeasures.join(' ; ') : '',
      'Mesures à mettre en place': actionByRiskId.get(risk.id) ?? risk.measures ?? '',
    });
    const workUnits = (doc.workUnitsData as WorkUnit[]) || [];
    for (const unit of workUnits) {
      for (const risk of (unit.risks || [])) {
        flatRisks.push(toRow(this.recalculateRiskValues(risk), unit.name));
      }
    }
    const sites = (doc.sites as Site[]) || [];
    for (const site of sites) {
      for (const risk of (site.risks || [])) {
        flatRisks.push(toRow(this.recalculateRiskValues(risk), site.name));
      }
      for (const unit of site.workUnits || []) {
        for (const risk of (unit.risks || [])) {
          flatRisks.push(toRow(this.recalculateRiskValues(risk), `${site.name} > ${unit.name}`));
        }
      }
    }
    if (flatRisks.length === 0) {
      const finalRisks = (doc.finalRisks as Risk[]) || [];
      for (const risk of finalRisks) {
        flatRisks.push(toRow(risk, risk.source || '-'));
      }
    }
    return { risks: flatRisks, documentId };
  }

  async getDuerpDocuments(companyId: number): Promise<DuerpDocument[]> {
    const documents = await db
      .select()
      .from(duerpDocuments)
      .where(eq(duerpDocuments.companyId, companyId))
      .orderBy(desc(duerpDocuments.createdAt));
    
    // Recalculer les valeurs numériques et la priorité pour tous les risques de tous les documents
    return documents.map(doc => {
      if (doc.finalRisks) {
        doc.finalRisks = (doc.finalRisks as Risk[]).map(risk => this.recalculateRiskValues(risk));
      }
      return doc;
    });
  }

  async createDuerpDocument(data: {
    companyId: number;
    title: string;
    workUnitsData?: any[];
    sites?: any[];
    locations: Location[];
    workStations: any[];
    finalRisks: Risk[];
    preventionMeasures: PreventionMeasure[];
  }): Promise<DuerpDocument> {
    const existingDocument = await db
      .select()
      .from(duerpDocuments)
      .where(
        and(
          eq(duerpDocuments.companyId, data.companyId),
          eq(duerpDocuments.title, data.title),
          ne(duerpDocuments.status, 'archived')
        )
      )
      .limit(1);

    if (existingDocument.length > 0) {
      throw new Error(`Un document avec ce titre existe déjà pour cette société. Veuillez choisir un autre nom.`);
    }

    const [document] = await db
      .insert(duerpDocuments)
      .values({
        companyId: data.companyId,
        title: data.title,
        version: "1.0",
        workUnitsData: data.workUnitsData || [],
        sites: data.sites || [],
        locations: data.locations,
        workStations: data.workStations,
        finalRisks: data.finalRisks,
        preventionMeasures: data.preventionMeasures,
        status: "draft",
        nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lastRevisionDate: new Date(),
        revisionNotified: false,
        updatedAt: new Date()
      })
      .returning();
    return document;
  }

  async updateDuerpDocument(id: number, updates: Partial<DuerpDocument>): Promise<DuerpDocument> {
    const [document] = await db
      .update(duerpDocuments)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(duerpDocuments.id, id))
      .returning();
    
    if (!document) {
      throw new Error(`DUERP document with id ${id} not found`);
    }
    return document;
  }

  // Risk operations
  async getRiskTemplates(sector?: string): Promise<RiskTemplate[]> {
    if (sector) {
      return await db.select().from(riskTemplates)
        .where(and(eq(riskTemplates.isActive, true), eq(riskTemplates.sector, sector)));
    }
    
    return await db.select().from(riskTemplates)
      .where(eq(riskTemplates.isActive, true));
  }

  async createRiskTemplate(template: Omit<RiskTemplate, 'id' | 'createdAt'>): Promise<RiskTemplate> {
    const [riskTemplate] = await db
      .insert(riskTemplates)
      .values(template)
      .returning();
    return riskTemplate;
  }

  async generateRisks(
    workUnitName: string,
    locationName: string,
    companyActivity: string,
    companyDescription?: string,
    openAiConfig?: OpenAiUserConfig
  ): Promise<Risk[]> {
    // Utilise Ollama (local) pour générer des risques contextuels
    try {
      const aiRisks = await this.generateAIRisks(workUnitName, locationName, companyActivity, companyDescription, openAiConfig);
      if (aiRisks.length > 0) {
        return aiRisks;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Service IA indisponible')) throw error;
      console.error('Error generating AI risks:', error);
    }

    // Fallback to template-based system if AI fails
    const templates = await this.getRiskTemplates();
    const workUnitLower = workUnitName.toLowerCase();
    const activityLower = companyActivity.toLowerCase();
    
    let applicableTemplates = templates.filter(template => {
      const categoryMatch = workUnitLower.includes(template.category.toLowerCase());
      const sectorMatch = template.sector && activityLower.includes(template.sector.toLowerCase());
      return categoryMatch || sectorMatch;
    });

    // If no templates found, use fallback risk generation
    if (applicableTemplates.length === 0) {
      return this.generateFallbackRisks(workUnitName, locationName, companyActivity);
    }

    // Convert templates to risks
    const risks: Risk[] = applicableTemplates.slice(0, 8).map(template => ({
      id: crypto.randomUUID(),
      type: template.type,
      danger: template.danger,
      gravity: template.gravity as 'Faible' | 'Moyenne' | 'Élevée',
      frequency: template.frequency as 'Rare' | 'Occasionnel' | 'Hebdomadaire' | 'Quotidien',
      control: template.control as 'Faible' | 'Moyenne' | 'Élevée',
      finalRisk: template.finalRisk as 'Faible' | 'Moyen' | 'Important',
      measures: template.measures,
    }));

    return risks;
  }

  private async generateAIRisks(
    workUnitName: string,
    locationName: string,
    companyActivity: string,
    companyDescription?: string,
    openAiConfig?: OpenAiUserConfig
  ): Promise<Risk[]> {
    const desiredMax = 8;

    const prompt = [
      `Tâche: générer 7 à 8 risques DUERP (viser 8), pertinents et sans doublons.`,
      ``,
      `Contexte:`,
      `- unité_de_travail=${workUnitName}`,
      `- lieu=${locationName}`,
      `- activité=${companyActivity}`,
      companyDescription ? `- description_entreprise=${companyDescription}` : ``,
      ``,
      `Contraintes:`,
      `- textes courts (1 phrase max) pour danger et measures`,
      `- enums:`,
      `  - gravity: Faible|Moyenne|Grave|Très Grave`,
      `  - frequency: Annuelle|Mensuelle|Hebdomadaire|Journalière`,
      `  - control: Très élevée|Élevée|Moyenne|Absente`,
      ``,
      `JSON attendu: {"risks":[{"type":"...","danger":"...","gravity":"Moyenne","frequency":"Mensuelle","control":"Moyenne","measures":"..."}]}`,
    ].filter(Boolean).join('\n');

    try {
      const content = await generateJson(prompt, {
        systemPrompt: DUERP_JSON_SYSTEM_PROMPT,
        maxOutputTokens: 900,
        apiKeyOverride: openAiConfig?.apiKey,
        modelOverride: openAiConfig?.model || undefined,
      });
      const result = content ? JSON.parse(content) : { risks: [] };
      const risksArrayRaw = Array.isArray(result?.risks) ? result.risks : [];
      const risksArray = risksArrayRaw.slice(0, desiredMax);
      
      // Si l'IA renvoie plus de risques, on tronque. Si elle en renvoie moins, on accepte quand même.
      // Le prompt vise 7-8 risques, mais on garde une tolérance pour ne pas casser le flux.
      return risksArray.map((risk: any) => {
        const gravity = risk.gravity || 'Moyenne';
        const frequency = risk.frequency || 'Mensuelle';
        const control = risk.control || 'Moyenne';
        
        // Calcul du score de risque selon votre méthode
        const gravityValue = gravity === 'Faible' ? 1 : gravity === 'Moyenne' ? 4 : gravity === 'Grave' ? 20 : 100;
        const frequencyValue = frequency === 'Annuelle' ? 1 : frequency === 'Mensuelle' ? 4 : frequency === 'Hebdomadaire' ? 10 : 50;
        const controlValue = control === 'Très élevée' ? 0.05 : control === 'Élevée' ? 0.2 : control === 'Moyenne' ? 0.5 : 1;
        
        const riskScore = gravityValue * frequencyValue * controlValue;
        const priority = riskScore >= 500 ? 'Priorité 1 (Forte)' : riskScore >= 100 ? 'Priorité 2 (Moyenne)' : riskScore >= 10 ? 'Priorité 3 (Modéré)' : 'Priorité 4 (Faible)';
        
        return {
          id: crypto.randomUUID(),
          type: risk.type || 'Risque général',
          danger: risk.danger || 'Danger non spécifié',
          gravity: gravity as 'Faible' | 'Moyenne' | 'Grave' | 'Très Grave',
          gravityValue: gravityValue as 1 | 4 | 20 | 100,
          frequency: frequency as 'Annuelle' | 'Mensuelle' | 'Hebdomadaire' | 'Journalière',
          frequencyValue: frequencyValue as 1 | 4 | 10 | 50,
          control: control as 'Très élevée' | 'Élevée' | 'Moyenne' | 'Absente',
          controlValue: controlValue as 0.05 | 0.2 | 0.5 | 1,
          riskScore: riskScore,
          priority: priority as 'Priorité 1 (Forte)' | 'Priorité 2 (Moyenne)' | 'Priorité 3 (Modéré)' | 'Priorité 4 (Faible)',
          measures: risk.measures || 'Mesures de prévention à définir'
        };
      });
    } catch (error) {
      console.error('Error calling Ollama:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Service IA indisponible')) throw error;
      return [];
    }
  }

  async generateHierarchicalRisks(
    level: 'Site' | 'Unité',
    elementName: string,
    elementDescription: string,
    companyActivity: string,
    context: string,
    count?: number,
    openAiConfig?: OpenAiUserConfig
  ): Promise<Risk[]> {
    
    const levelRules: Record<string, { allowed: string; forbidden: string }> = {
      'Site': {
        allowed: 'Incendie/Explosion, Circulation interne/externe, Environnement de travail général, Organisation globale, Sécurité des locaux',
        forbidden: 'Gestes individuels, Postures, Utilisation d\'outils spécifiques'
      },
      'Unité': {
        allowed: 'Manutentions, Postures de travail, Utilisation d\'équipements, Produits et substances, Organisation du travail, Gestes répétitifs, Ergonomie, Ambiance de travail, Risques spécifiques aux postes de travail inclus',
        forbidden: 'Aucune restriction spécifique'
      }
    };

    const familyList = [
      'Mécanique', 'Physique', 'Chimique', 'Biologique', 'Radiologique',
      'Incendie-Explosion', 'Électrique', 'Ergonomique', 'Psychosocial',
      'Routier', 'Environnemental', 'Organisationnel'
    ];
    
    const desiredCount = Math.max(1, Math.min(8, count ?? 8));
    const tokenBudget = Math.max(450, Math.min(2200, 280 * desiredCount));
    const extraContext = typeof context === 'string' ? context.trim() : '';
    const prompt = [
      `Tâche: générer EXACTEMENT ${desiredCount} risques DUERP (niveau ${level}), sans doublons.`,
      ``,
      `Contexte:`,
      `- nom=${elementName}`,
      `- activité=${companyActivity}`,
      `- environnement=${elementDescription || 'N/A'}`,
      ``,
      extraContext ? `Contexte additionnel (inclut éventuellement "NE PAS RÉPÉTER"):\n${extraContext}` : ``,
      ``,
      `Filtrage (à respecter):`,
      `- allowed=${levelRules[level].allowed}`,
      `- forbidden=${levelRules[level].forbidden}`,
      ``,
      `Contraintes:`,
      `- family ∈ {${familyList.join(', ')}}`,
      `- champs courts`,
      `- enums: gravity=Faible|Moyenne|Grave|Très Grave ; frequency=Annuelle|Mensuelle|Hebdomadaire|Journalière ; control=Très élevée|Élevée|Moyenne|Absente`,
      ``,
      `Sémantique des champs texte:`,
      `- family: famille de risque (enum).`,
      `- danger: sources / situations matérielles présentes (ex. escaliers, installations électriques).`,
      `- situation: situation dangereuse ou contexte d'exposition (ex. changement d'ampoule sous tension).`,
      `- riskEvent: événement redouté / dommage (ex. électrocution, chute).`,
      `JSON attendu: {"risks":[{"family":"Ergonomique","danger":"...","situation":"...","riskEvent":"...","gravity":"Moyenne","frequency":"Mensuelle","control":"Moyenne","measures":"...","existingMeasures":[]}]}`,
    ].filter(Boolean).join('\n');

    try {
      const schema = {
        type: 'object',
        properties: {
          risks: {
            type: 'array',
            minItems: desiredCount,
            maxItems: desiredCount,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                family: { type: 'string', enum: familyList },
                situation: { type: 'string' },
                danger: { type: 'string' },
                riskEvent: { type: 'string' },
                gravity: { type: 'string', enum: ['Faible', 'Moyenne', 'Grave', 'Très Grave'] },
                frequency: { type: 'string', enum: ['Annuelle', 'Mensuelle', 'Hebdomadaire', 'Journalière'] },
                control: { type: 'string', enum: ['Très élevée', 'Élevée', 'Moyenne', 'Absente'] },
                measures: { type: 'string' },
                existingMeasures: { type: 'array', items: { type: 'string' } },
              },
              required: ['family', 'situation', 'danger', 'riskEvent', 'gravity', 'frequency', 'control', 'measures', 'existingMeasures'],
            },
          },
        },
        required: ['risks'],
        additionalProperties: false,
      };

      const content = await generateJson(prompt, {
        systemPrompt: DUERP_JSON_SYSTEM_PROMPT,
        // 8 risques => plus de tokens pour éviter un JSON tronqué
        maxOutputTokens: tokenBudget,
        responseJsonSchema: schema,
        apiKeyOverride: openAiConfig?.apiKey,
        modelOverride: openAiConfig?.model || undefined,
      });
      let result: { risks?: unknown };
      try {
        const trimmed = typeof content === 'string' ? content.trim() : '';
        // Tolérance: certains modèles renvoient parfois `"risks":[...]` sans l'objet racine.
        const normalized = trimmed.startsWith('"risks"') ? `{${trimmed}}` : trimmed;
        try {
          result = normalized ? JSON.parse(normalized) : { risks: [] };
        } catch (firstErr) {
          // Tolérance: réponse tronquée (souvent lorsque la limite de tokens est trop basse).
          // On tente de couper au dernier caractère '}' et de fermer l'objet.
          const lastBrace = normalized.lastIndexOf('}');
          const lastBracket = normalized.lastIndexOf(']');
          const cutAt = Math.max(lastBrace, lastBracket);
          if (cutAt > 0) {
            const repaired = normalized.slice(0, cutAt + 1);
            result = JSON.parse(repaired);
          } else {
            throw firstErr;
          }
        }
      } catch (parseErr) {
        const preview = typeof content === 'string' ? content.slice(0, 400) : '';
        console.error('Ollama JSON parse failed. Preview:', preview);
        throw new Error('Réponse IA invalide (JSON attendu). Vérifiez Ollama (modèle, accès réseau).');
      }
      const risksArray = Array.isArray(result?.risks) ? result.risks : [];
      
      return risksArray.map((risk: any) => {
        const gravity = risk.gravity || 'Moyenne';
        const frequency = risk.frequency || 'Mensuelle';
        const control = risk.control || 'Moyenne';
        
        const gravityValue = gravity === 'Faible' ? 1 : gravity === 'Moyenne' ? 4 : gravity === 'Grave' ? 20 : 100;
        const frequencyValue = frequency === 'Annuelle' ? 1 : frequency === 'Mensuelle' ? 4 : frequency === 'Hebdomadaire' ? 10 : 50;
        const controlValue = control === 'Très élevée' ? 0.05 : control === 'Élevée' ? 0.2 : control === 'Moyenne' ? 0.5 : 1;
        
        const riskScore = gravityValue * frequencyValue * controlValue;
        const priority = riskScore >= 500 ? 'Priorité 1 (Forte)' : riskScore >= 100 ? 'Priorité 2 (Moyenne)' : riskScore >= 10 ? 'Priorité 3 (Modéré)' : 'Priorité 4 (Faible)';
        
        const situationText = risk.situation || risk.type || 'Situation non spécifiée';
        const dangerText = risk.danger || '';
        const riskEventText =
          typeof risk.riskEvent === 'string' && risk.riskEvent.trim()
            ? risk.riskEvent.trim()
            : typeof (risk as { risk?: string }).risk === 'string'
              ? String((risk as { risk?: string }).risk).trim()
              : '';

        return {
          id: crypto.randomUUID(),
          type: situationText,
          family: risk.family || 'Autre',
          danger: dangerText.trim() || 'Non spécifié',
          riskEvent: riskEventText,
          gravity: gravity as 'Faible' | 'Moyenne' | 'Grave' | 'Très Grave',
          gravityValue: gravityValue as 1 | 4 | 20 | 100,
          frequency: frequency as 'Annuelle' | 'Mensuelle' | 'Hebdomadaire' | 'Journalière',
          frequencyValue: frequencyValue as 1 | 4 | 10 | 50,
          control: control as 'Très élevée' | 'Élevée' | 'Moyenne' | 'Absente',
          controlValue: controlValue as 0.05 | 0.2 | 0.5 | 1,
          riskScore,
          priority: priority as 'Priorité 1 (Forte)' | 'Priorité 2 (Moyenne)' | 'Priorité 3 (Modéré)' | 'Priorité 4 (Faible)',
          measures: risk.measures || 'Mesures de prévention à définir',
          existingMeasures: Array.isArray(risk.existingMeasures) ? risk.existingMeasures : [],
          originLevel: level,
          isValidated: false,
          isAIGenerated: true,
          isInherited: false,
          userModified: false
        };
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Service IA indisponible')) throw error;
      console.error('Error generating hierarchical risks:', error);
      throw new Error(msg || 'Erreur lors de l\'appel à l\'IA pour la génération des risques.');
    }
  }

  private generateFallbackRisks(workUnitName: string, locationName: string, companyActivity: string): Risk[] {
    // Professional risk generation based on work unit type and activity
    const riskDatabase = this.getRiskDatabase();
    const workUnitLower = workUnitName.toLowerCase();
    const activityLower = companyActivity.toLowerCase();
    
    let applicableRisks: Risk[] = [];
    
    // Match risks based on work unit type
    for (const [category, risks] of Object.entries(riskDatabase)) {
      if (workUnitLower.includes(category) || activityLower.includes(category)) {
        applicableRisks = [...applicableRisks, ...risks];
      }
    }
    
    // If no specific matches, use general office/industrial risks
    if (applicableRisks.length === 0) {
      applicableRisks = [
        ...riskDatabase.general,
        ...riskDatabase.office
      ];
    }
    
    // Return 5-10 most relevant risks
    const shuffled = applicableRisks.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(10, shuffled.length));
  }

  async generatePreventionRecommendations(companyActivity: string, risks: Risk[], locations: any[], workStations: any[]): Promise<any[]> {
    // Analyse des risques pour générer des recommandations
    const recommendations = [];
    
    // Recommandations générales basées sur l'activité de l'entreprise
    const generalRecommendations = this.getGeneralRecommendations(companyActivity);
    recommendations.push(...generalRecommendations);
    
    // Recommandations spécifiques aux risques identifiés
    for (const risk of risks) {
      const riskSpecificRecommendations = this.getRiskSpecificRecommendations(risk);
      recommendations.push(...riskSpecificRecommendations);
    }
    
    // Recommandations par lieu
    for (const location of locations) {
      const locationRecommendations = this.getLocationRecommendations(location);
      recommendations.push(...locationRecommendations);
    }
    
    // Recommandations par poste de travail
    for (const workStation of workStations) {
      const workStationRecommendations = this.getWorkStationRecommendations(workStation);
      recommendations.push(...workStationRecommendations);
    }
    
    // Déduplication et priorisation
    return this.deduplicateAndPrioritize(recommendations);
  }

  private getGeneralRecommendations(companyActivity: string): any[] {
    const recommendations = [
      {
        description: "Mettre en place un système de management de la sécurité et santé au travail",
        level: "Général",
        category: "Organisationnel",
        priority: "Élevée",
        cost: "Moyenne",
        effectiveness: "Élevée"
      },
      {
        description: "Organiser des formations régulières sur les risques professionnels",
        level: "Général",
        category: "Humain",
        priority: "Élevée",
        cost: "Moyenne",
        effectiveness: "Élevée"
      },
      {
        description: "Établir des procédures d'urgence et d'évacuation",
        level: "Général",
        category: "Organisationnel",
        priority: "Élevée",
        cost: "Faible",
        effectiveness: "Élevée"
      }
    ];

    // Recommandations spécifiques selon l'activité
    if (companyActivity.toLowerCase().includes('bureau')) {
      recommendations.push({
        description: "Aménager les postes de travail informatiques selon les normes ergonomiques",
        level: "Général",
        category: "Technique",
        priority: "Moyenne",
        cost: "Moyenne",
        effectiveness: "Élevée"
      });
    }

    if (companyActivity.toLowerCase().includes('industrie') || companyActivity.toLowerCase().includes('production')) {
      recommendations.push({
        description: "Mettre en place une maintenance préventive des équipements",
        level: "Général",
        category: "Technique",
        priority: "Élevée",
        cost: "Élevée",
        effectiveness: "Élevée"
      });
    }

    return recommendations;
  }

  private getRiskSpecificRecommendations(risk: Risk): any[] {
    const recommendations = [];
    
    if (risk.type.toLowerCase().includes('tms') || risk.type.toLowerCase().includes('musculo')) {
      recommendations.push({
        description: "Formation aux gestes et postures pour prévenir les TMS",
        level: "Général",
        category: "Humain",
        priority: "Élevée",
        cost: "Faible",
        effectiveness: "Élevée",
        targetRiskIds: [risk.id]
      });
    }

    if (risk.type.toLowerCase().includes('chute')) {
      recommendations.push({
        description: "Installer des revêtements antidérapants et améliorer l'éclairage",
        level: "Lieu",
        category: "Technique",
        priority: "Élevée",
        cost: "Moyenne",
        effectiveness: "Élevée",
        targetRiskIds: [risk.id]
      });
    }

    if (risk.type.toLowerCase().includes('chimique')) {
      recommendations.push({
        description: "Fournir des équipements de protection individuelle adaptés",
        level: "Poste",
        category: "EPI",
        priority: "Élevée",
        cost: "Moyenne",
        effectiveness: "Élevée",
        targetRiskIds: [risk.id]
      });
    }

    if (risk.type.toLowerCase().includes('bruit')) {
      recommendations.push({
        description: "Mettre en place des protections auditives et réduire le bruit à la source",
        level: "Lieu",
        category: "Technique",
        priority: "Élevée",
        cost: "Élevée",
        effectiveness: "Élevée",
        targetRiskIds: [risk.id]
      });
    }

    return recommendations;
  }

  private getLocationRecommendations(location: any): any[] {
    return [
      {
        description: `Améliorer la signalisation de sécurité dans ${location.name}`,
        level: "Lieu",
        category: "Technique",
        priority: "Moyenne",
        cost: "Faible",
        effectiveness: "Moyenne",
        locationId: location.id
      },
      {
        description: `Maintenir l'ordre et la propreté dans ${location.name}`,
        level: "Lieu",
        category: "Organisationnel",
        priority: "Moyenne",
        cost: "Faible",
        effectiveness: "Moyenne",
        locationId: location.id
      }
    ];
  }

  private getWorkStationRecommendations(workStation: any): any[] {
    return [
      {
        description: `Adapter le poste de travail ${workStation.name} aux spécificités des tâches`,
        level: "Poste",
        category: "Technique",
        priority: "Moyenne",
        cost: "Moyenne",
        effectiveness: "Élevée",
        workStationId: workStation.id
      },
      {
        description: `Former spécifiquement les opérateurs du poste ${workStation.name}`,
        level: "Poste",
        category: "Humain",
        priority: "Élevée",
        cost: "Faible",
        effectiveness: "Élevée",
        workStationId: workStation.id
      }
    ];
  }

  private deduplicateAndPrioritize(recommendations: any[]): any[] {
    // Supprimer les doublons basés sur la description
    const uniqueRecommendations = recommendations.filter((rec, index, arr) => 
      index === arr.findIndex(r => r.description === rec.description)
    );

    // Trier par priorité (Élevée > Moyenne > Faible)
    const priorityOrder = { 'Élevée': 3, 'Moyenne': 2, 'Faible': 1 };
    return uniqueRecommendations.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  // Action operations
  async getActionsByDuerp(duerpId: number): Promise<Action[]> {
    return await db
      .select()
      .from(actions)
      .where(eq(actions.duerpId, duerpId))
      .orderBy(desc(actions.createdAt));
  }

  async createAction(action: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action> {
    const [newAction] = await db
      .insert(actions)
      .values({
        ...action,
        updatedAt: new Date()
      })
      .returning();
    return newAction;
  }

  async updateAction(id: number, updates: Partial<Action>): Promise<Action> {
    const [action] = await db
      .update(actions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(actions.id, id))
      .returning();
    
    if (!action) {
      throw new Error(`Action with id ${id} not found`);
    }
    return action;
  }

  async deleteAction(id: number): Promise<void> {
    await db.delete(actions).where(eq(actions.id, id));
  }

  extractRisksAndMeasuresFromDuerp(doc: DuerpDocument): { risks: Array<{ id: string; type?: string; danger: string; measures: string; priority?: string; family?: string }>; measures: Array<{ id: string; description: string; priority?: string; responsible?: string; deadline?: string }> } {
    const risks: Array<{ id: string; type?: string; danger: string; measures: string; priority?: string; family?: string }> = [];
    const measures: Array<{ id: string; description: string; priority?: string; responsible?: string; deadline?: string }> = [];
    const workUnits = Array.isArray(doc.workUnitsData) ? (doc.workUnitsData as WorkUnit[]) : [];
    for (const unit of workUnits) {
      const unitRisks = Array.isArray(unit.risks) ? unit.risks : [];
      for (const risk of unitRisks) {
        const measuresStr = typeof risk.measures === 'string' ? risk.measures : String(risk.measures ?? '').trim();
        if (measuresStr) {
          risks.push({
            id: risk.id != null ? String(risk.id) : '',
            type: risk.type,
            danger: typeof risk.danger === 'string' ? risk.danger : '',
            measures: measuresStr,
            priority: risk.priority,
            family: typeof risk.family === 'string' ? risk.family : undefined,
          });
        }
      }
      const unitMeasures = Array.isArray(unit.preventionMeasures) ? unit.preventionMeasures : [];
      for (const measure of unitMeasures) {
        const desc = typeof measure.description === 'string' ? measure.description : String(measure.description ?? '').trim();
        if (desc) {
          measures.push({
            id: measure.id != null ? String(measure.id) : '',
            description: desc,
            priority: measure.priority,
            responsible: measure.responsible,
            deadline: measure.deadline,
          });
        }
      }
    }
    const finalRisks = Array.isArray(doc.finalRisks) ? (doc.finalRisks as Risk[]) : [];
    for (const risk of finalRisks) {
      const measuresStr = typeof risk.measures === 'string' ? risk.measures : String(risk.measures ?? '').trim();
      const riskId = risk.id != null ? String(risk.id) : '';
      if (measuresStr && !risks.some(r => r.id === riskId)) {
        risks.push({
          id: riskId,
          type: risk.type,
          danger: typeof risk.danger === 'string' ? risk.danger : '',
          measures: measuresStr,
          priority: risk.priority,
          family: typeof risk.family === 'string' ? risk.family : undefined,
        });
      }
    }
    const globalMeasures = Array.isArray(doc.globalPreventionMeasures) ? (doc.globalPreventionMeasures as PreventionMeasure[]) : [];
    const legacyMeasures = Array.isArray(doc.preventionMeasures) ? (doc.preventionMeasures as PreventionMeasure[]) : [];
    for (const measure of [...globalMeasures, ...legacyMeasures]) {
      const desc = typeof measure.description === 'string' ? measure.description : String(measure.description ?? '').trim();
      const measureId = measure.id != null ? String(measure.id) : '';
      if (desc && !measures.some(m => m.id === measureId)) {
        measures.push({
          id: measureId,
          description: desc,
          priority: measure.priority,
          responsible: measure.responsible,
          deadline: measure.deadline,
        });
      }
    }
    return { risks, measures };
  }

  // Comment operations
  async getCommentsByDuerp(duerpId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.duerpId, duerpId))
      .orderBy(desc(comments.createdAt));
  }

  async createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    return newComment;
  }

  // Revision tracking operations
  async getDocumentsNeedingRevision(): Promise<DuerpDocument[]> {
    const now = new Date();
    const documents = await db
      .select()
      .from(duerpDocuments)
      .where(
        and(
          eq(duerpDocuments.status, 'approved'),
          lt(duerpDocuments.nextReviewDate, now)
        )
      )
      .orderBy(asc(duerpDocuments.nextReviewDate));
    return documents;
  }

  async getDocumentsNeedingNotification(): Promise<DuerpDocument[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const documents = await db
      .select()
      .from(duerpDocuments)
      .where(
        and(
          eq(duerpDocuments.status, 'approved'),
          eq(duerpDocuments.revisionNotified, false),
          lt(duerpDocuments.nextReviewDate, thirtyDaysFromNow)
        )
      )
      .orderBy(asc(duerpDocuments.nextReviewDate));
    return documents;
  }

  async markRevisionNotified(documentId: number): Promise<void> {
    await db
      .update(duerpDocuments)
      .set({ revisionNotified: true })
      .where(eq(duerpDocuments.id, documentId));
  }

  async updateRevisionDate(documentId: number): Promise<DuerpDocument> {
    const now = new Date();
    const nextReviewDate = new Date(now);
    nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);
    
    const [document] = await db
      .update(duerpDocuments)
      .set({
        lastRevisionDate: now,
        nextReviewDate: nextReviewDate,
        revisionNotified: false,
        updatedAt: now
      })
      .where(eq(duerpDocuments.id, documentId))
      .returning();
    
    if (!document) {
      throw new Error(`DUERP document with id ${documentId} not found`);
    }
    return document;
  }

  // Fonction utilitaire pour recalculer les valeurs numériques et la priorité
  private recalculateRiskValues(risk: Risk): Risk {
    const gravityValue = risk.gravity === 'Faible' ? 1 : risk.gravity === 'Moyenne' ? 4 : risk.gravity === 'Grave' ? 20 : 100;
    const frequencyValue = risk.frequency === 'Annuelle' ? 1 : risk.frequency === 'Mensuelle' ? 4 : risk.frequency === 'Hebdomadaire' ? 10 : 50;
    const controlValue = risk.control === 'Très élevée' ? 0.05 : risk.control === 'Élevée' ? 0.2 : risk.control === 'Moyenne' ? 0.5 : 1;
    
    const riskScore = gravityValue * frequencyValue * controlValue;
    const priority = riskScore >= 500 ? 'Priorité 1 (Forte)' : riskScore >= 100 ? 'Priorité 2 (Moyenne)' : riskScore >= 10 ? 'Priorité 3 (Modéré)' : 'Priorité 4 (Faible)';
    
    return {
      ...risk,
      gravityValue: gravityValue as 1 | 4 | 20 | 100,
      frequencyValue: frequencyValue as 1 | 4 | 10 | 50,
      controlValue: controlValue as 0.05 | 0.2 | 0.5 | 1,
      riskScore: riskScore,
      priority: priority as 'Priorité 1 (Forte)' | 'Priorité 2 (Moyenne)' | 'Priorité 3 (Modéré)' | 'Priorité 4 (Faible)'
    };
  }

  async updateDuerpDocumentPartial(id: number, updates: {
    title?: string;
    locations?: Location[];
    workStations?: any[];
    finalRisks?: Risk[];
    preventionMeasures?: PreventionMeasure[];
    addRisks?: Risk[];
    removeRisks?: string[];
    updateRisks?: Array<{ id: string; updates: Partial<Risk> }>;
  }): Promise<DuerpDocument> {
    // Récupérer le document existant
    const [existingDoc] = await db
      .select()
      .from(duerpDocuments)
      .where(eq(duerpDocuments.id, id))
      .limit(1);

    if (!existingDoc) {
      throw new Error(`Document DUERP avec l'ID ${id} non trouvé`);
    }

    let finalRisks = (existingDoc.finalRisks as Risk[]).map(risk => this.recalculateRiskValues(risk));

    // Gérer les modifications de risques
    if (updates.addRisks) {
      finalRisks = [...finalRisks, ...updates.addRisks.map(risk => this.recalculateRiskValues(risk))];
    }

    if (updates.removeRisks) {
      finalRisks = finalRisks.filter(risk => !updates.removeRisks!.includes(risk.id));
    }

    if (updates.updateRisks) {
      finalRisks = finalRisks.map(risk => {
        const update = updates.updateRisks!.find(u => u.id === risk.id);
        return update ? this.recalculateRiskValues({ ...risk, ...update.updates }) : risk;
      });
    }

    // Remplacer complètement les risques si spécifié
    if (updates.finalRisks) {
      finalRisks = updates.finalRisks.map(risk => this.recalculateRiskValues(risk));
    }

    // Si le titre est modifié, vérifier l'unicité (companyId, title) pour cette société
    if (updates.title) {
      const [duplicate] = await db
        .select()
        .from(duerpDocuments)
        .where(
          and(
            eq(duerpDocuments.companyId, existingDoc.companyId),
            eq(duerpDocuments.title, updates.title),
            ne(duerpDocuments.id, id),
            ne(duerpDocuments.status, 'archived')
          )
        )
        .limit(1);
      if (duplicate) {
        throw new Error('Un autre document de cette société porte déjà ce titre.');
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      updatedAt: new Date()
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.locations) updateData.locations = updates.locations;
    if (updates.workStations) updateData.workStations = updates.workStations;
    if (updates.preventionMeasures) updateData.preventionMeasures = updates.preventionMeasures;
    
    updateData.finalRisks = finalRisks;

    // Effectuer la mise à jour
    const [document] = await db
      .update(duerpDocuments)
      .set(updateData)
      .where(eq(duerpDocuments.id, id))
      .returning();

    if (!document) {
      throw new Error(`Impossible de mettre à jour le document DUERP avec l'ID ${id}`);
    }

    return document;
  }

  // Utility operations
  async generateUniqueDocumentTitle(baseTitle: string, companyId?: number): Promise<string> {
    let counter = 1;
    let uniqueTitle = baseTitle;

    while (true) {
      const titleConflictCondition = companyId !== undefined
        ? and(
            eq(duerpDocuments.companyId, companyId),
            eq(duerpDocuments.title, uniqueTitle),
            ne(duerpDocuments.status, 'archived')
          )
        : and(
            eq(duerpDocuments.title, uniqueTitle),
            ne(duerpDocuments.status, 'archived')
          );

      const existingDocument = await db
        .select()
        .from(duerpDocuments)
        .where(titleConflictCondition)
        .limit(1);

      if (existingDocument.length === 0) {
        return uniqueTitle;
      }

      counter++;
      uniqueTitle = `${baseTitle} (${counter})`;
    }
  }

  private getRiskDatabase() {
    return {
      soudure: [
        {
          id: crypto.randomUUID(),
          type: "TMS",
          danger: "Posture debout prolongée",
          gravity: "Moyenne" as const,
          frequency: "Quotidien" as const,
          control: "Faible" as const,
          finalRisk: "Moyen" as const,
          measures: "Chaise réglable, pauses régulières"
        },
        {
          id: crypto.randomUUID(),
          type: "Incendie",
          danger: "Équipement inflammable",
          gravity: "Élevée" as const,
          frequency: "Occasionnel" as const,
          control: "Moyenne" as const,
          finalRisk: "Important" as const,
          measures: "Extincteurs, détecteurs de fumée"
        },
        {
          id: crypto.randomUUID(),
          type: "Brûlures",
          danger: "Contact avec surfaces chaudes",
          gravity: "Élevée" as const,
          frequency: "Hebdomadaire" as const,
          control: "Élevée" as const,
          finalRisk: "Moyen" as const,
          measures: "Gants de protection, formation"
        },
        {
          id: crypto.randomUUID(),
          type: "Intoxication",
          danger: "Inhalation de fumées",
          gravity: "Élevée" as const,
          frequency: "Quotidien" as const,
          control: "Élevée" as const,
          finalRisk: "Important" as const,
          measures: "Masque respiratoire, ventilation"
        },
        {
          id: crypto.randomUUID(),
          type: "Coupures",
          danger: "Manipulation d'outils tranchants",
          gravity: "Moyenne" as const,
          frequency: "Hebdomadaire" as const,
          control: "Élevée" as const,
          finalRisk: "Faible" as const,
          measures: "Gants anti-coupures, formation"
        }
      ],
      usinage: [
        {
          id: crypto.randomUUID(),
          type: "Bruit",
          danger: "Exposition prolongée aux machines",
          gravity: "Moyenne" as const,
          frequency: "Quotidien" as const,
          control: "Élevée" as const,
          finalRisk: "Moyen" as const,
          measures: "Protections auditives, cabines isolées"
        },
        {
          id: crypto.randomUUID(),
          type: "Projection de copeaux",
          danger: "Particules métalliques volantes",
          gravity: "Moyenne" as const,
          frequency: "Quotidien" as const,
          control: "Élevée" as const,
          finalRisk: "Faible" as const,
          measures: "Lunettes de protection, écrans"
        },
        {
          id: crypto.randomUUID(),
          type: "Coincement",
          danger: "Pièces mobiles des machines",
          gravity: "Élevée" as const,
          frequency: "Rare" as const,
          control: "Élevée" as const,
          finalRisk: "Faible" as const,
          measures: "Protections machines, arrêts d'urgence"
        }
      ],
      office: [
        {
          id: crypto.randomUUID(),
          type: "Fatigue visuelle",
          danger: "Exposition prolongée aux écrans",
          gravity: "Faible" as const,
          frequency: "Quotidien" as const,
          control: "Moyenne" as const,
          finalRisk: "Faible" as const,
          measures: "Pauses régulières, éclairage adapté"
        },
        {
          id: crypto.randomUUID(),
          type: "TMS",
          danger: "Posture assise prolongée",
          gravity: "Moyenne" as const,
          frequency: "Quotidien" as const,
          control: "Élevée" as const,
          finalRisk: "Faible" as const,
          measures: "Sièges ergonomiques, bureaux réglables"
        }
      ],
      general: [
        {
          id: crypto.randomUUID(),
          type: "Chutes de plain-pied",
          danger: "Sols glissants ou encombrés",
          gravity: "Moyenne" as const,
          frequency: "Occasionnel" as const,
          control: "Moyenne" as const,
          finalRisk: "Moyen" as const,
          measures: "Signalisation, nettoyage régulier"
        },
        {
          id: crypto.randomUUID(),
          type: "Stress",
          danger: "Charge de travail excessive",
          gravity: "Moyenne" as const,
          frequency: "Hebdomadaire" as const,
          control: "Faible" as const,
          finalRisk: "Moyen" as const,
          measures: "Gestion du temps, soutien psychologique"
        }
      ]
    };
  }

  // Uploaded document operations
  async getUploadedDocuments(companyId: number): Promise<UploadedDocument[]> {
    const documents = await db
      .select()
      .from(uploadedDocuments)
      .where(eq(uploadedDocuments.companyId, companyId))
      .orderBy(desc(uploadedDocuments.uploadedAt));
    return documents;
  }

  async createUploadedDocument(data: InsertUploadedDocument): Promise<UploadedDocument> {
    const [document] = await db
      .insert(uploadedDocuments)
      .values(data)
      .returning();
    return document;
  }

  async updateUploadedDocument(id: number, updates: Partial<UploadedDocument>): Promise<UploadedDocument> {
    const [document] = await db
      .update(uploadedDocuments)
      .set(updates)
      .where(eq(uploadedDocuments.id, id))
      .returning();
    
    if (!document) {
      throw new Error(`Uploaded document with id ${id} not found`);
    }
    return document;
  }

  async deleteUploadedDocument(id: number): Promise<void> {
    await db.delete(uploadedDocuments).where(eq(uploadedDocuments.id, id));
  }
}

export const storage = new DatabaseStorage();
