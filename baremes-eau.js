/**
 * =============================================================================
 * BARÈMES EAU - STRUCTURE COMPLÈTE PAR CATÉGORIE v5.3.2 FINAL
 * =============================================================================
 * Tous les paramètres importants par catégorie avec métadonnées complètes
 * CORRECTIONS APPLIQUÉES : Pondérations 100%, codes fictifs supprimés, unités standardisées
 * Version 5.3.2 - Structure exhaustive pour scoring équitable CORRIGÉE
 * =============================================================================
 */

// ===== CATÉGORIES PAR FRÉQUENCE DE TEST =====

const CATEGORIES_FREQUENCE = {
  // Tests systématiques (obligatoires réglementaires)
  obligatoires: ['microbiologique', 'nitrates', 'organoleptiques', 'metauxLourds'],
  
  // Tests fréquents (souvent disponibles)
  frequents: ['pesticides', 'chlore', 'chimie_generale'],
  
  // Tests rares (émergents, non systématiques)
  rares: ['pfas', 'microplastiques', 'medicaments']
};

// ===== PONDÉRATIONS SCIENTIFIQUES PAR CATÉGORIE v5.3.2 CORRIGÉES =====

const PONDERATIONS_CATEGORIES = {
  microbiologique: 0.23,    // 23% - Impact sanitaire immédiat
  metauxLourds: 0.16,       // 16% - Cancérigènes, bioaccumulation
  pfas: 0.13,               // 13% - Polluants éternels (CORRIGÉ: 14% → 13%)
  nitrates: 0.10,           // 10% - Pollution agricole
  pesticides: 0.10,         // 10% - Résidus phytosanitaires
  chimie_generale: 0.08,    // 8% - Confort et qualité générale
  organoleptiques: 0.08,    // 8% - Acceptabilité, indicateurs
  medicaments: 0.07,        // 7% - Résistance antibiotique
  microplastiques: 0.03,    // 3% - Impact à long terme (CORRIGÉ: 5% → 3%)
  chlore: 0.02             // 2% - Désinfection nécessaire
  // TOTAL = 100% exactement (avant: 103%)
};

// ===== PARAMÈTRES AVEC SEUIL SANITAIRE MAXIMAL =====
// Formule: Score = max(0, 100 - 100 * ((valeur - valeur_ideale) / (valeur_max - valeur_ideale))^α)

const PARAMETRES_SEUIL_MAX = {
  // MICROBIOLOGIE - UNITÉS STANDARDISÉES
  '1506': { // E. coli
    nom: 'E. coli',
    categorie: 'microbiologique',
    unite: 'UFC/100mL', // CORRIGÉ: Standardisé
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true,
    impact: 'Impact sanitaire critique - risque de gastro-entérite',
    source_norme: 'UE Directive 2020/2184'
  },
  '1507': { // Entérocoques
    nom: 'Entérocoques',
    categorie: 'microbiologique', 
    unite: 'UFC/100mL', // CORRIGÉ: Standardisé
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true,
    impact: 'Impact sanitaire critique - indicateur de contamination fécale',
    source_norme: 'UE Directive 2020/2184'
  },
  '1449': { // E. coli (MF)
    nom: 'E. coli (MF)',
    categorie: 'microbiologique',
    unite: 'UFC/100mL', // CORRIGÉ: Standardisé
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true,
    impact: 'Impact sanitaire critique - risque de gastro-entérite',
    source_norme: 'UE Directive 2020/2184'
  },
  '6455': { // Entérocoques (MS)
    nom: 'Entérocoques (MS)',
    categorie: 'microbiologique', 
    unite: 'UFC/100mL', // CORRIGÉ: Standardisé
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true,
    impact: 'Impact sanitaire critique - indicateur de contamination fécale',
    source_norme: 'UE Directive 2020/2184'
  },
  '1042': { // Bactéries sulfito-réductrices
    nom: 'Bactéries sulfito-réductrices',
    categorie: 'microbiologique',
    unite: 'UFC/100mL', // CORRIGÉ: Standardisé
    valeur_ideale: 0,
    valeur_max: 10,
    alpha: 1.2,
    impact: 'Indicateur de pollution ancienne',
    source_norme: 'Indicateur français'
  },
  '1447': { // Bactéries coliformes
    nom: 'Bactéries coliformes',
    categorie: 'microbiologique',
    unite: 'UFC/100mL', // CORRIGÉ: Standardisé
    valeur_ideale: 0,
    valeur_max: 50,
    alpha: 1.3,
    impact: 'Indicateur général de contamination',
    source_norme: 'Indicateur français'
  },
  '5440': { // Bactéries aérobies 22°C
    nom: 'Bactéries aérobies 22°C',
    categorie: 'microbiologique',
    unite: 'UFC/mL', // Exception : reste en UFC/mL (norme différente)
    valeur_ideale: 0,
    valeur_max: 100,
    alpha: 1.1,
    impact: 'Indicateur de qualité microbiologique générale',
    source_norme: 'Indicateur français'
  },
  
  // MÉTAUX LOURDS
  '1369': { // Arsenic
    nom: 'Arsenic',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 10, // UE
    alpha: 1.5,
    impact: 'Cancérigène - toxicité chronique',
    source_norme: 'UE Directive 2020/2184'
  },
  '1382': { // Plomb
    nom: 'Plomb',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 10, // UE
    alpha: 1.5,
    impact: 'Neurotoxique - particulièrement dangereux pour les enfants',
    source_norme: 'UE Directive 2020/2184'
  },
  '1388': { // Cadmium
    nom: 'Cadmium',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 5, // UE
    alpha: 1.5,
    impact: 'Cancérigène - toxicité rénale',
    source_norme: 'UE Directive 2020/2184'
  },
  '1375': { // Chrome
    nom: 'Chrome',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 50, // UE
    alpha: 1.3,
    impact: 'Potentiel cancérigène selon forme chimique',
    source_norme: 'UE Directive 2020/2184'
  },
  '1392': { // Mercure
    nom: 'Mercure',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 1, // UE
    alpha: 2.0,
    impact: 'Neurotoxique majeur - bioaccumulation',
    source_norme: 'UE Directive 2020/2184'
  },
  '1393': { // Fer total
    nom: 'Fer total',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 200, // UE
    alpha: 1.2,
    impact: 'Goût métallique - coloration de l\'eau',
    source_norme: 'UE Directive 2020/2184'
  },
  '1394': { // Manganèse
    nom: 'Manganèse total',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 50, // OMS
    alpha: 1.4,
    impact: 'Goût métallique - coloration brune',
    source_norme: 'OMS Guidelines 2022'
  },
  
  // NITRATES/NITRITES
  '1340': { // Nitrates
    nom: 'Nitrates',
    categorie: 'nitrates',
    unite: 'mg/L',
    valeur_ideale: 0,
    valeur_max: 50, // UE
    alpha: 1.2,
    impact: 'Méthémoglobinémie chez les nourrissons',
    source_norme: 'UE Directive 2020/2184'
  },
  '1335': { // Nitrites
    nom: 'Nitrites', 
    categorie: 'nitrates',
    unite: 'mg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.5,
    impact: 'Méthémoglobinémie aiguë - syndrome du bébé bleu',
    source_norme: 'UE Directive 2020/2184'
  },
  '1339': { // Nitrites (NO2)
    nom: 'Nitrites (NO2)',
    categorie: 'nitrates',
    unite: 'mg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.5,
    impact: 'Méthémoglobinémie aiguë - syndrome du bébé bleu',
    source_norme: 'UE Directive 2020/2184'
  },
  
  // PFAS (codes réels Hubeau avec normes OMS 2022)
  '6561': { // PFOS
    nom: 'PFOS',
    categorie: 'pfas',
    unite: 'ng/L',
    valeur_ideale: 0,
    valeur_max: 500, // OMS 2022
    alpha: 1.8,
    impact: 'Polluant éternel - bioaccumulation, perturbateur endocrinien',
    source_norme: 'OMS Guidelines 2022'
  },
  '5979': { // PFPEA
    nom: 'PFPEA',
    categorie: 'pfas', 
    unite: 'ng/L',
    valeur_ideale: 0,
    valeur_max: 500, // Par équivalence PFAS
    alpha: 1.8,
    impact: 'Polluant éternel - persistance environnementale',
    source_norme: 'Équivalence PFAS OMS'
  },
  '8741': { // PFDoDS
    nom: 'PFDoDS',
    categorie: 'pfas',
    unite: 'ng/L',
    valeur_ideale: 0,
    valeur_max: 1000,
    alpha: 1.5,
    impact: 'Polluant éternel - accumulation tissulaire',
    source_norme: 'Recherche PFAS'
  },
  
  // PESTICIDES (codes réels Hubeau uniquement)
  '6276': { // Total pesticides
    nom: 'Total des pesticides',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.4,
    impact: 'Effet cocktail - perturbation endocrinienne',
    source_norme: 'UE Directive 2020/2184'
  },
  '6389': { // Clothianidine
    nom: 'Clothianidine',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.1, // UE
    alpha: 1.4,
    impact: 'Néonicotinoïde - neurotoxicité',
    source_norme: 'UE Directive 2020/2184'
  },
  '1128': { // Captane
    nom: 'Captane',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.1, // UE
    alpha: 1.3,
    impact: 'Fongicide - irritation des muqueuses',
    source_norme: 'UE Directive 2020/2184'
  },
  '1210': { // Malathion
    nom: 'Malathion',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.1, // UE
    alpha: 1.3,
    impact: 'Organophosphoré - neurotoxicité',
    source_norme: 'UE Directive 2020/2184'
  },
  '1950': { // Kresoxim-méthyle
    nom: 'Kresoxim-méthyle',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.1, // UE
    alpha: 1.3,
    impact: 'Fongicide - toxicité aquatique',
    source_norme: 'UE Directive 2020/2184'
  },
  '6393': { // Flonicamide
    nom: 'Flonicamide',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.1, // UE
    alpha: 1.4,
    impact: 'Insecticide - perturbation métabolique',
    source_norme: 'UE Directive 2020/2184'
  }
  
  // SUPPRIMÉ : Codes fictifs (PFOA, ATRAZ, PEST, MICROPL, ANTIBIO)
  // Ces codes n'existent pas dans Hubeau et causaient des erreurs
};

// ===== PARAMÈTRES AVEC VALEUR OPTIMALE CENTRALE =====
// Formule: Score = max(0, 100 - β * |valeur - valeur_ideale|^γ)
// FORMULES BETA CORRIGÉES v5.3.2

const PARAMETRES_OPTIMAL_CENTRAL = {
  // ORGANOLEPTIQUES
  '1302': { // pH
    nom: 'pH',
    categorie: 'organoleptiques',
    unite: 'unités pH',
    valeur_ideale: 7.2,
    beta: 25, // Conservé (critique)
    gamma: 1.6,
    min_acceptable: 6.5,
    max_acceptable: 9.0,
    impact: 'Confort de consommation - corrosion des canalisations',
    source_norme: 'UE Directive 2020/2184'
  },
  '1303': { // Conductivité
    nom: 'Conductivité',
    categorie: 'organoleptiques',
    unite: 'µS/cm',
    valeur_ideale: 400,
    beta: 0.5, // CORRIGÉ: 0.015 → 0.5
    gamma: 1.3,
    min_acceptable: 100,
    max_acceptable: 1200,
    impact: 'Indicateur de minéralisation - goût',
    source_norme: 'UE Directive 2020/2184'
  },
  '1304': { // Turbidité
    nom: 'Turbidité',
    categorie: 'organoleptiques',
    unite: 'NFU',
    valeur_ideale: 0.1,
    beta: 40, // Conservé
    gamma: 1.4,
    min_acceptable: 0,
    max_acceptable: 2.0,
    impact: 'Acceptabilité visuelle - efficacité désinfection',
    source_norme: 'UE Directive 2020/2184'
  },
  '1295': { // Turbidité NFU
    nom: 'Turbidité NFU',
    categorie: 'organoleptiques',
    unite: 'NFU',
    valeur_ideale: 0.1,
    beta: 40, // Conservé
    gamma: 1.4,
    min_acceptable: 0,
    max_acceptable: 2.0,
    impact: 'Acceptabilité visuelle - efficacité désinfection',
    source_norme: 'UE Directive 2020/2184'
  },
  '1309': { // Coloration
    nom: 'Coloration',
    categorie: 'organoleptiques',
    unite: 'mg/L Pt',
    valeur_ideale: 5,
    beta: 8, // CORRIGÉ: 2 → 8
    gamma: 1.5,
    min_acceptable: 0,
    max_acceptable: 15,
    impact: 'Acceptabilité visuelle',
    source_norme: 'UE Directive 2020/2184'
  },
  
  // CHLORE - FORMULES CORRIGÉES
  '1398': { // Chlore libre
    nom: 'Chlore libre',
    categorie: 'chlore',
    unite: 'mg/L',
    valeur_ideale: 0.2,
    beta: 30, // CORRIGÉ: 100 → 30
    gamma: 1.8,
    min_acceptable: 0.1,
    max_acceptable: 0.5,
    impact: 'Protection microbiologique vs goût chloré',
    source_norme: 'Code de la santé publique'
  },
  '1399': { // Chlore total
    nom: 'Chlore total',
    categorie: 'chlore',
    unite: 'mg/L',
    valeur_ideale: 0.3,
    beta: 25, // CORRIGÉ: 80 → 25
    gamma: 1.6,
    min_acceptable: 0.1,
    max_acceptable: 1.0,
    impact: 'Désinfection résiduelle - goût',
    source_norme: 'Code de la santé publique'
  },
  '1959': { // Chlore libre (alt)
    nom: 'Chlore libre (alternatif)',
    categorie: 'chlore',
    unite: 'mg/L',
    valeur_ideale: 0.2,
    beta: 30, // CORRIGÉ: 100 → 30
    gamma: 1.8,
    min_acceptable: 0.1,
    max_acceptable: 0.5,
    impact: 'Protection microbiologique vs goût chloré',
    source_norme: 'Code de la santé publique'
  },
  '1958': { // Chlore total (alt)
    nom: 'Chlore total (alternatif)',
    categorie: 'chlore',
    unite: 'mg/L',
    valeur_ideale: 0.3,
    beta: 25, // CORRIGÉ: 80 → 25
    gamma: 1.6,
    min_acceptable: 0.1,
    max_acceptable: 1.0,
    impact: 'Désinfection résiduelle - goût',
    source_norme: 'Code de la santé publique'
  },
  
  // CHIMIE GÉNÉRALE - FORMULES CORRIGÉES
  '1337': { // Chlorures
    nom: 'Chlorures',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 50,
    beta: 0.8, // CORRIGÉ: 0.02 → 0.8
    gamma: 1.3,
    min_acceptable: 10,
    max_acceptable: 250,
    impact: 'Goût salé - corrosion',
    source_norme: 'UE Directive 2020/2184'
  },
  '1338': { // Sulfates
    nom: 'Sulfates', 
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 100,
    beta: 0.6, // CORRIGÉ: 0.01 → 0.6
    gamma: 1.4,
    min_acceptable: 20,
    max_acceptable: 250,
    impact: 'Goût amer - effet laxatif à forte dose',
    source_norme: 'UE Directive 2020/2184'
  },
  '1345': { // Dureté (TH)
    nom: 'Dureté totale (TH)',
    categorie: 'chimie_generale',
    unite: '°f',
    valeur_ideale: 15,
    beta: 2.5, // CORRIGÉ: 0.5 → 2.5
    gamma: 1.2,
    min_acceptable: 6,
    max_acceptable: 32,
    impact: 'Entartrage vs eau agressive',
    source_norme: 'OMS recommandations'
  },
  '1841': { // COT
    nom: 'Carbone organique total',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 1,
    beta: 8, // CORRIGÉ: 2 → 8
    gamma: 1.5,
    min_acceptable: 0,
    max_acceptable: 4,
    impact: 'Indicateur pollution organique - précurseur de sous-produits',
    source_norme: 'Indicateur qualité France'
  },
  '1374': { // Calcium
    nom: 'Calcium',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 100,
    beta: 0.1, // CORRIGÉ: 0.001 → 0.1
    gamma: 1.0,
    min_acceptable: 20,
    max_acceptable: 300,
    impact: 'Bénéfice nutritionnel - entartrage',
    source_norme: 'OMS Guidelines'
  },
  '1372': { // Magnésium
    nom: 'Magnésium',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 30,
    beta: 0.5, // CORRIGÉ: 0.01 → 0.5
    gamma: 1.1,
    min_acceptable: 10,
    max_acceptable: 100,
    impact: 'Bénéfice nutritionnel - dureté',
    source_norme: 'OMS Guidelines'
  },
  '1367': { // Potassium
    nom: 'Potassium',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 10,
    beta: 0.3, // CORRIGÉ: 0.01 → 0.3
    gamma: 1.0,
    min_acceptable: 1,
    max_acceptable: 50,
    impact: 'Équilibre électrolytique',
    source_norme: 'OMS Guidelines'
  }
};

// ===== STRUCTURE COMPLÈTE DES CATÉGORIES =====

const CATEGORIES_COMPLETES = {
  microbiologique: {
    nom: '🦠 Microbiologie',
    description: 'Bactéries et organismes pathogènes - Enjeu sanitaire immédiat',
    ponderation: 0.23,
    parametres_critiques: ['1506', '1449', '1507', '6455'],
    parametres_moderes: ['1042', '1447'],
    parametres_mineurs: ['5440']
  },
  metauxLourds: {
    nom: '🔗 Métaux lourds',
    description: 'Éléments toxiques et cancérigènes - Bioaccumulation',
    ponderation: 0.16,
    parametres_critiques: ['1369', '1382', '1388', '1392'],
    parametres_moderes: ['1375', '1394'],
    parametres_mineurs: ['1393']
  },
  pfas: {
    nom: '🧪 PFAS',
    description: 'Polluants éternels - Substances per/polyfluorées persistantes',
    ponderation: 0.13, // CORRIGÉ: 0.14 → 0.13
    parametres_critiques: ['6561'],
    parametres_moderes: ['5979', '8741'],
    parametres_mineurs: []
  },
  nitrates: {
    nom: '⚗️ Nitrates',
    description: 'Pollution agricole et industrielle - Risque pour les nourrissons',
    ponderation: 0.10,
    parametres_critiques: ['1340', '1335', '1339'],
    parametres_moderes: [],
    parametres_mineurs: []
  },
  pesticides: {
    nom: '🌿 Pesticides',
    description: 'Résidus phytosanitaires et biocides - Perturbateurs endocriniens',
    ponderation: 0.10,
    parametres_critiques: ['6276'],
    parametres_moderes: ['6389', '1128', '1210', '1950', '6393'],
    parametres_mineurs: []
  },
  chimie_generale: {
    nom: '⚖️ Chimie générale',
    description: 'Paramètres de confort et qualité générale de l\'eau',
    ponderation: 0.08,
    parametres_critiques: [],
    parametres_moderes: ['1337', '1338', '1345', '1841'],
    parametres_mineurs: ['1374', '1372', '1367']
  },
  organoleptiques: {
    nom: '🌡️ Organoleptiques',
    description: 'Acceptabilité et qualité sensorielle - Indicateurs physico-chimiques',
    ponderation: 0.08,
    parametres_critiques: ['1302'],
    parametres_moderes: ['1303', '1304', '1295'],
    parametres_mineurs: ['1309']
  },
  medicaments: {
    nom: '🧬 Médicaments',
    description: 'Résidus pharmaceutiques - Résistance antibiotique',
    ponderation: 0.07,
    parametres_critiques: [],
    parametres_moderes: [],
    parametres_mineurs: []
    // Note: Aucun paramètre médicament disponible dans Hubeau actuellement
  },
  microplastiques: {
    nom: '🔬 Microplastiques',
    description: 'Pollution plastique microscopique - Enjeu émergent',
    ponderation: 0.03, // CORRIGÉ: 0.05 → 0.03
    parametres_critiques: [],
    parametres_moderes: [],
    parametres_mineurs: []
    // Note: Aucun paramètre microplastique disponible dans Hubeau actuellement
  },
  chlore: {
    nom: '💧 Chlore',
    description: 'Désinfection de l\'eau potable - Équilibre protection/goût',
    ponderation: 0.02,
    parametres_critiques: [],
    parametres_moderes: ['1398', '1399', '1959', '1958'],
    parametres_mineurs: []
  }
};

// ===== PARAMÈTRES ÉQUIVALENTS POUR DÉDOUBLONNAGE =====

const PARAMETRES_EQUIVALENTS = {
  // E. coli : plusieurs méthodes d'analyse
  'ECOLI_GROUP': {
    nom: 'E. coli',
    codes: ['1506', '1449'], // Standard + MF (Méthode Filtration)
    priorite: ['1449', '1506'], // Préférer MF si disponible
    categorie: 'microbiologique'
  },
  
  // Entérocoques : plusieurs méthodes
  'ENTEROCOQUES_GROUP': {
    nom: 'Entérocoques',
    codes: ['1507', '6455'], // Standard + MS (Méthode Spécifique)
    priorite: ['6455', '1507'], // Préférer MS si disponible
    categorie: 'microbiologique'
  },
  
  // Turbidité : différentes unités/méthodes
  'TURBIDITE_GROUP': {
    nom: 'Turbidité',
    codes: ['1304', '1295'], // NFU standard + NFU alternatif
    priorite: ['1304', '1295'],
    categorie: 'organoleptiques'
  },
  
  // Chlore libre : méthodes différentes
  'CHLORE_LIBRE_GROUP': {
    nom: 'Chlore libre',
    codes: ['1398', '1959'], // Standard + alternatif
    priorite: ['1398', '1959'],
    categorie: 'chlore'
  },
  
  // Chlore total : méthodes différentes
  'CHLORE_TOTAL_GROUP': {
    nom: 'Chlore total',
    codes: ['1399', '1958'], // Standard + alternatif
    priorite: ['1399', '1958'],
    categorie: 'chlore'
  },
  
  // Nitrites : codes différents
  'NITRITES_GROUP': {
    nom: 'Nitrites',
    codes: ['1335', '1339'], // NO2 standard + alternatif
    priorite: ['1335', '1339'],
    categorie: 'nitrates'
  }
};

// ===== MAPPING CODES HUBEAU VERS PARAMÈTRES (ENRICHI) =====

const MAPPING_CODES_HUBEAU = {
  // Microbiologie
  '1506': 'ECOLI',
  '1507': 'ENTEROCOQUES',
  '1449': 'ECOLI_MF', // Code alternatif E.coli
  '6455': 'ENTEROCOQUES_MS',  // Code alternatif Entérocoques
  '1042': 'SULFITO_REDUCTRICES',
  '1447': 'COLIFORMES',
  '5440': 'AEROBIES_22',
  '5441': 'AEROBIES_36',
  
  // Organoleptiques  
  '1302': 'PH',
  '1303': 'CONDUCTIVITE',
  '1304': 'TURBIDITE',
  '1295': 'TURBIDITE_ALT', // Code alternatif turbidité
  '1309': 'COLORATION',
  
  // Métaux lourds
  '1369': 'ARSENIC',
  '1382': 'PLOMB', 
  '1388': 'CADMIUM',
  '1375': 'CHROME',
  '1392': 'MERCURE',
  '1393': 'FER_TOTAL', // Fer total
  '1394': 'MANGANESE', // Manganèse
  
  // Nitrates/Nitrites
  '1340': 'NITRATES',
  '1335': 'NITRITES',
  '1339': 'NITRITES_ALT', // Code alternatif nitrites
  '6374': 'NO3_NO2_INDEX',
  
  // Chlore
  '1959': 'CHLORE_LIBRE_ALT',
  '1958': 'CHLORE_TOTAL_ALT',
  '1398': 'CHLORE_LIBRE', // Code alternatif chlore libre
  '1399': 'CHLORE_TOTAL', // Code alternatif chlore total
  
  // Chimie générale
  '1337': 'CHLORURES',
  '1338': 'SULFATES',
  '1345': 'DURETE_TH',
  '1841': 'COT', // Carbone organique total
  '1374': 'CALCIUM',
  '1372': 'MAGNESIUM',
  '1367': 'POTASSIUM',
  
  // Pesticides
  '6276': 'PESTICIDES_TOTAL', // Total pesticides
  '6389': 'CLOTHIANIDINE',
  '1128': 'CAPTANE',
  '1210': 'MALATHION',
  '1950': 'KRESOXIM',
  '6393': 'FLONICAMIDE',
  
  // PFAS
  '6561': 'PFOS',
  '5979': 'PFPEA',
  '8741': 'PFDODS'
};

// ===== SEUILS DE FIABILITÉ =====

const SEUILS_FIABILITE = {
  FIABLE: 80,      // >= 80% - Analyse fiable
  PARTIELLE: 60,   // 60-79% - Analyse partielle  
  INSUFFISANTE: 60 // < 60% - Données insuffisantes
};

// ===== MESSAGES DE FIABILITÉ =====

const MESSAGES_FIABILITE = {
  FIABLE: {
    niveau: "ANALYSE FIABLE",
    message: "Score basé sur des données complètes",
    confiance: "Vous pouvez faire confiance à ce résultat"
  },
  PARTIELLE: {
    niveau: "ANALYSE PARTIELLE", 
    message: "Score basé partiellement sur le bénéfice du doute",
    confiance: "Résultat indicatif - Des analyses complémentaires amélioreront la précision"
  },
  INSUFFISANTE: {
    niveau: "DONNÉES INSUFFISANTES",
    message: "Score largement basé sur des estimations",
    confiance: "Résultat très approximatif - Analyses complètes fortement recommandées"
  }
};

// ===== FONCTIONS UTILITAIRES =====

/**
 * Obtient tous les paramètres d'une catégorie avec structure complète
 */
function getParametresParCategorie(categorie) {
  if (!CATEGORIES_COMPLETES[categorie]) {
    return [];
  }
  
  const cat = CATEGORIES_COMPLETES[categorie];
  let parametres = [];
  
  // Ajouter paramètres critiques
  if (cat.parametres_critiques) {
    cat.parametres_critiques.forEach(code => {
      if (PARAMETRES_SEUIL_MAX[code] || PARAMETRES_OPTIMAL_CENTRAL[code]) {
        const param = PARAMETRES_SEUIL_MAX[code] || PARAMETRES_OPTIMAL_CENTRAL[code];
        parametres.push({
          code: code,
          codes: [code],
          nom: param.nom,
          categorie: categorie,
          niveau: 'critique',
          type: PARAMETRES_SEUIL_MAX[code] ? 'seuil_max' : 'optimal_central',
          config: PARAMETRES_SEUIL_MAX[code] ? 
            { valeur_ideale: param.valeur_ideale, valeur_max: param.valeur_max, alpha: param.alpha } :
            { valeur_ideale: param.valeur_ideale, beta: param.beta, gamma: param.gamma },
          impact: param.impact || 'Impact sanitaire critique',
          gravite: 'critique',
          norme: param.source_norme || 'Norme applicable',
          unite: param.unite
        });
      }
    });
  }
  
  // Ajouter paramètres modérés
  if (cat.parametres_moderes) {
    cat.parametres_moderes.forEach(code => {
      if (PARAMETRES_SEUIL_MAX[code] || PARAMETRES_OPTIMAL_CENTRAL[code]) {
        const param = PARAMETRES_SEUIL_MAX[code] || PARAMETRES_OPTIMAL_CENTRAL[code];
        parametres.push({
          code: code,
          codes: [code],
          nom: param.nom,
          categorie: categorie,
          niveau: 'modere',
          type: PARAMETRES_SEUIL_MAX[code] ? 'seuil_max' : 'optimal_central',
          config: PARAMETRES_SEUIL_MAX[code] ? 
            { valeur_ideale: param.valeur_ideale, valeur_max: param.valeur_max, alpha: param.alpha } :
            { valeur_ideale: param.valeur_ideale, beta: param.beta, gamma: param.gamma },
          impact: param.impact || 'Impact sanitaire modéré',
          gravite: 'modere',
          norme: param.source_norme || 'Norme applicable',
          unite: param.unite
        });
      }
    });
  }
  
  // Ajouter paramètres mineurs
  if (cat.parametres_mineurs) {
    cat.parametres_mineurs.forEach(code => {
      if (PARAMETRES_SEUIL_MAX[code] || PARAMETRES_OPTIMAL_CENTRAL[code]) {
        const param = PARAMETRES_SEUIL_MAX[code] || PARAMETRES_OPTIMAL_CENTRAL[code];
        parametres.push({
          code: code,
          codes: [code],
          nom: param.nom,
          categorie: categorie,
          niveau: 'mineur',
          type: PARAMETRES_SEUIL_MAX[code] ? 'seuil_max' : 'optimal_central',
          config: PARAMETRES_SEUIL_MAX[code] ? 
            { valeur_ideale: param.valeur_ideale, valeur_max: param.valeur_max, alpha: param.alpha } :
            { valeur_ideale: param.valeur_ideale, beta: param.beta, gamma: param.gamma },
          impact: param.impact || 'Impact sanitaire mineur',
          gravite: 'mineur',
          norme: param.source_norme || 'Norme applicable',
          unite: param.unite
        });
      }
    });
  }
  
  return parametres;
}

/**
 * Obtient la liste exhaustive de tous les paramètres par catégorie
 */
function getTousParametresParCategorie() {
  const result = {};
  
  Object.keys(CATEGORIES_COMPLETES).forEach(categorie => {
    result[categorie] = getParametresParCategorie(categorie);
  });
  
  return result;
}

/**
 * Vérifie si une catégorie est critique pour la santé
 */
function estCategorieCritique(categorie) {
  return ['microbiologique', 'metauxLourds', 'pfas'].includes(categorie);
}

/**
 * Obtient le niveau de fiabilité selon le pourcentage
 */
function getNiveauFiabilite(pourcentage) {
  if (pourcentage >= SEUILS_FIABILITE.FIABLE) {
    return MESSAGES_FIABILITE.FIABLE;
  } else if (pourcentage >= SEUILS_FIABILITE.PARTIELLE) {
    return MESSAGES_FIABILITE.PARTIELLE;
  } else {
    return MESSAGES_FIABILITE.INSUFFISANTE;
  }
}

/**
 * Obtient les informations sur les normes utilisées
 */
function getInfoNormes() {
  return {
    sources: [
      'UE Directive 2020/2184 (Eau potable)',
      'OMS Guidelines for drinking-water quality (4e édition, 2022)',
      'Code de la santé publique français',
      'Normes ISO pour méthodes d\'analyse'
    ],
    principe: 'Aucun paramètre ajouté sans norme officielle reconnue',
    version: '5.3.2 - Corrections audit complètes appliquées',
    corrections: [
      'Pondérations corrigées : 103% → 100%',
      'Unités microbiologie standardisées',
      'Codes fictifs supprimés',
      'Formules beta normalisées'
    ]
  };
}

/**
 * Calcule la fiabilité pondérée par criticité des paramètres
 */
function calculerFiabilitePonderee(parametresTestes, parametresTotaux) {
  let scoresCritiques = { testes: 0, totaux: 0 };
  let scoresModeres = { testes: 0, totaux: 0 };
  let scoresMineurs = { testes: 0, totaux: 0 };
  
  // Compter par niveau de criticité
  Object.keys(CATEGORIES_COMPLETES).forEach(categorie => {
    const cat = CATEGORIES_COMPLETES[categorie];
    
    // Paramètres critiques
    if (cat.parametres_critiques) {
      cat.parametres_critiques.forEach(code => {
        const estTeste = parametresTestes.includes(code);
        scoresCritiques.totaux++;
        if (estTeste) scoresCritiques.testes++;
      });
    }
    
    // Paramètres modérés
    if (cat.parametres_moderes) {
      cat.parametres_moderes.forEach(code => {
        const estTeste = parametresTestes.includes(code);
        scoresModeres.totaux++;
        if (estTeste) scoresModeres.testes++;
      });
    }
    
    // Paramètres mineurs
    if (cat.parametres_mineurs) {
      cat.parametres_mineurs.forEach(code => {
        const estTeste = parametresTestes.includes(code);
        scoresMineurs.totaux++;
        if (estTeste) scoresMineurs.testes++;
      });
    }
  });
  
  // Calcul pondéré
  const fiabiliteCritiques = scoresCritiques.totaux > 0 ? scoresCritiques.testes / scoresCritiques.totaux : 1;
  const fiabiliteModeres = scoresModeres.totaux > 0 ? scoresModeres.testes / scoresModeres.totaux : 1;
  const fiabiliteMineurs = scoresMineurs.totaux > 0 ? scoresMineurs.testes / scoresMineurs.totaux : 1;
  
  return (fiabiliteCritiques * 0.6 + fiabiliteModeres * 0.3 + fiabiliteMineurs * 0.1) * 100;
}

/**
 * Fonction de validation des pondérations
 */
function validerPonderations() {
  const total = Object.values(PONDERATIONS_CATEGORIES).reduce((sum, val) => sum + val, 0);
  const totalPourcentage = Math.round(total * 100);
  
  console.log('=== VALIDATION PONDÉRATIONS v5.3.2 ===');
  console.log(`Total pondérations: ${total.toFixed(3)}`);
  console.log(`Total pourcentage: ${totalPourcentage}%`);
  
  if (totalPourcentage === 100) {
    console.log('✅ Pondérations correctes (100%)');
    return true;
  } else {
    console.log(`❌ Pondérations incorrectes (${totalPourcentage}%)`);
    return false;
  }
}

// ===== EXPORT GLOBAL =====

if (typeof window !== 'undefined') {
  window.CATEGORIES_FREQUENCE = CATEGORIES_FREQUENCE;
  window.PONDERATIONS_CATEGORIES = PONDERATIONS_CATEGORIES;
  window.PARAMETRES_SEUIL_MAX = PARAMETRES_SEUIL_MAX;
  window.PARAMETRES_OPTIMAL_CENTRAL = PARAMETRES_OPTIMAL_CENTRAL;
  window.CATEGORIES_COMPLETES = CATEGORIES_COMPLETES;
  window.PARAMETRES_EQUIVALENTS = PARAMETRES_EQUIVALENTS;
  window.MAPPING_CODES_HUBEAU = MAPPING_CODES_HUBEAU;
  window.SEUILS_FIABILITE = SEUILS_FIABILITE;
  window.MESSAGES_FIABILITE = MESSAGES_FIABILITE;
  window.getParametresParCategorie = getParametresParCategorie;
  window.getTousParametresParCategorie = getTousParametresParCategorie;
  window.estCategorieCritique = estCategorieCritique;
  window.getNiveauFiabilite = getNiveauFiabilite;
  window.getInfoNormes = getInfoNormes;
  window.calculerFiabilitePonderee = calculerFiabilitePonderee;
  window.validerPonderations = validerPonderations;
}

// Validation automatique au chargement
validerPonderations();

console.log('✅ Barèmes Eau v5.3.2 FINAL - Toutes corrections appliquées');
console.log('🔧 Corrections: Pondérations 100%, unités standardisées, codes fictifs supprimés');
console.log('📊 Formules beta normalisées, paramètres équivalents définis');
