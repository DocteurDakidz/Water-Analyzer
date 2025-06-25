/**
 * =============================================================================
 * BARÈMES EAU - VALEURS DE RÉFÉRENCE SCIENTIFIQUES
 * =============================================================================
 * Normes OMS, UE et valeurs optimales pour le calcul scientifique
 * Version 5.0 - Algorithme Scientifique Life Water
 * =============================================================================
 */

// ===== CATÉGORIES PAR FRÉQUENCE DE TEST =====

const CATEGORIES_FREQUENCE = {
  // Tests systématiques (obligatoires réglementaires)
  obligatoires: ['microbiologique', 'nitrates', 'organoleptiques', 'metauxLourds'],
  
  // Tests fréquents (souvent disponibles)
  frequents: ['pesticides', 'chlore'],
  
  // Tests rares (émergents, non systématiques)
  rares: ['pfas', 'microplastiques', 'medicaments']
};

// ===== PONDÉRATIONS SCIENTIFIQUES PAR CATÉGORIE v5.1 =====

const PONDERATIONS_CATEGORIES = {
  microbiologique: 0.23,    // 23% - Impact sanitaire immédiat (réduit de 2%)
  metauxLourds: 0.16,       // 16% - Cancérigènes, bioaccumulation (réduit de 2%)
  pfas: 0.14,               // 14% - Polluants éternels (réduit de 1%, maintenant testable)
  nitrates: 0.10,           // 10% - Pollution agricole (identique)
  pesticides: 0.10,         // 10% - Résidus phytosanitaires (identique)
  chimie_generale: 0.08,    // 8% - NOUVEAU - Confort et qualité générale
  organoleptiques: 0.08,    // 8% - Acceptabilité, indicateurs (réduit de 4%)
  medicaments: 0.07,        // 7% - Résistance antibiotique (identique)
  microplastiques: 0.05,    // 5% - Impact à long terme (identique)
  chlore: 0.02             // 2% - Désinfection nécessaire (réduit car inclus ailleurs)
};

// ===== PARAMÈTRES AVEC SEUIL SANITAIRE MAXIMAL =====
// Formule: Score = max(0, 100 - 100 * ((valeur - valeur_ideale) / (valeur_max - valeur_ideale))^α)

const PARAMETRES_SEUIL_MAX = {
  // MICROBIOLOGIE
  '1506': { // E. coli
    nom: 'E. coli',
    categorie: 'microbiologique',
    unite: 'n/100mL',
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true
  },
  '1507': { // Entérocoques
    nom: 'Entérocoques',
    categorie: 'microbiologique', 
    unite: 'n/100mL',
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true
  },
  
  // MÉTAUX LOURDS
  '1369': { // Arsenic
    nom: 'Arsenic',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 10, // UE
    alpha: 1.5
  },
  '1382': { // Plomb
    nom: 'Plomb',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 10, // UE
    alpha: 1.5
  },
  '1388': { // Cadmium
    nom: 'Cadmium',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 5, // UE
    alpha: 1.5
  },
  '1375': { // Chrome
    nom: 'Chrome',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 50, // UE
    alpha: 1.3
  },
  '1392': { // Mercure
    nom: 'Mercure',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 1, // UE
    alpha: 2.0
  },
  
  // NITRATES/NITRITES
  '1340': { // Nitrates
    nom: 'Nitrates',
    categorie: 'nitrates',
    unite: 'mg/L',
    valeur_ideale: 0,
    valeur_max: 50, // UE
    alpha: 1.2
  },
  '1335': { // Nitrites
    nom: 'Nitrites', 
    categorie: 'nitrates',
    unite: 'mg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.5
  },
  
  // PFAS (codes réels Hubeau avec normes OMS 2022)
  '6561': { // PFOS (trouvé dans Hubeau)
    nom: 'PFOS',
    categorie: 'pfas',
    unite: 'ng/L',
    valeur_ideale: 0,
    valeur_max: 500, // OMS 2022
    alpha: 1.8,
    source_norme: 'OMS 2022'
  },
  
  '5979': { // PFPEA (trouvé dans Hubeau)
    nom: 'PFPEA',
    categorie: 'pfas', 
    unite: 'ng/L',
    valeur_ideale: 0,
    valeur_max: 500, // Par équivalence PFAS
    alpha: 1.8,
    source_norme: 'Équivalence PFAS OMS'
  },
  
  // PESTICIDES
  'ATRAZ': { // Atrazine
    nom: 'Atrazine',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.1, // UE
    alpha: 1.6
  },
  'PEST': { // Pesticides totaux
    nom: 'Pesticides totaux',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.4
  },
  
  // MICROPLASTIQUES (codes hypothétiques)
  'MICROPL': {
    nom: 'Microplastiques',
    categorie: 'microplastiques',
    unite: 'particules/L',
    valeur_ideale: 0,
    valeur_max: 1000, // Valeur de recherche
    alpha: 1.2
  },
  
  // FER TOTAL
  '1393': { // Fer total
    nom: 'Fer total',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 200, // UE
    alpha: 1.2
  },
  
  // PESTICIDES (code trouvé)
  '6276': { // Total pesticides
    nom: 'Total des pesticides',
    categorie: 'pesticides',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.4
  },
  
  // NITRITES (code alternatif)
  '1339': { // Nitrites (code alternatif)
    nom: 'Nitrites (NO2)',
    categorie: 'nitrates',
    unite: 'mg/L',
    valeur_ideale: 0,
    valeur_max: 0.5, // UE
    alpha: 1.5
  },
  
  // ENTÉROCOQUES (code alternatif)
  '6455': { // Entérocoques
    nom: 'Entérocoques',
    categorie: 'microbiologique', 
    unite: 'n/100mL',
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true
  },
  
  // E.COLI (code alternatif)
  '1449': { // E. coli
    nom: 'E. coli (MF)',
    categorie: 'microbiologique',
    unite: 'n/100mL',
    valeur_ideale: 0,
    valeur_max: 0,
    alpha: 1.0,
    critique: true
  }
};

// ===== PARAMÈTRES AVEC VALEUR OPTIMALE CENTRALE =====
// Formule: Score = max(0, 100 - β * |valeur - valeur_ideale|^γ)

const PARAMETRES_OPTIMAL_CENTRAL = {
  // ORGANOLEPTIQUES
  '1302': { // pH
    nom: 'pH',
    categorie: 'organoleptiques',
    unite: '',
    valeur_ideale: 7.2,
    beta: 25,
    gamma: 1.6,
    min_acceptable: 6.5,
    max_acceptable: 9.0
  },
  '1303': { // Conductivité
    nom: 'Conductivité',
    categorie: 'organoleptiques',
    unite: 'µS/cm',
    valeur_ideale: 400,
    beta: 0.015,
    gamma: 1.3,
    min_acceptable: 100,
    max_acceptable: 1200
  },
  '1304': { // Turbidité
    nom: 'Turbidité',
    categorie: 'organoleptiques',
    unite: 'NFU',
    valeur_ideale: 0.1,
    beta: 40,
    gamma: 1.4,
    min_acceptable: 0,
    max_acceptable: 2.0
  },
  
  // CHLORE (codes réels Hubeau)
  '1398': { // Chlore libre (code réel)
    nom: 'Chlore libre',
    categorie: 'chlore',
    unite: 'mg/L',
    valeur_ideale: 0.2,
    beta: 100,
    gamma: 1.8,
    min_acceptable: 0.1,
    max_acceptable: 0.5
  },
  '1399': { // Chlore total (code réel)
    nom: 'Chlore total',
    categorie: 'chlore',
    unite: 'mg/L',
    valeur_ideale: 0.3,
    beta: 80,
    gamma: 1.6,
    min_acceptable: 0.1,
    max_acceptable: 1.0
  },
  
  // AUTRES PARAMÈTRES UTILES TROUVÉS
  '1295': { // Turbidité (code alternatif)
    nom: 'Turbidité NFU',
    categorie: 'organoleptiques',
    unite: 'NFU',
    valeur_ideale: 0.1,
    beta: 40,
    gamma: 1.4,
    min_acceptable: 0,
    max_acceptable: 2.0
  },
  
  // CHIMIE GÉNÉRALE (nouveaux paramètres avec normes UE/OMS)
  '1337': { // Chlorures
    nom: 'Chlorures',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 50, // Optimal pour le goût
    beta: 0.02,
    gamma: 1.3,
    min_acceptable: 10,
    max_acceptable: 250, // UE/OMS
    source_norme: 'UE Directive 2020/2184'
  },
  
  '1338': { // Sulfates
    nom: 'Sulfates', 
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 100, // Optimal
    beta: 0.01,
    gamma: 1.4,
    min_acceptable: 20,
    max_acceptable: 250, // UE
    source_norme: 'UE Directive 2020/2184'
  },
  
  '1345': { // Dureté (TH)
    nom: 'Dureté totale (TH)',
    categorie: 'chimie_generale',
    unite: '°f', // degrés français
    valeur_ideale: 15, // 150 mg/L CaCO3 = eau moyennement dure
    beta: 0.5,
    gamma: 1.2,
    min_acceptable: 6, // 60 mg/L CaCO3
    max_acceptable: 32, // 320 mg/L CaCO3
    source_norme: 'OMS recommandations'
  },
  
  '1841': { // COT - Indicateur qualité
    nom: 'Carbone organique total',
    categorie: 'chimie_generale',
    unite: 'mg/L',
    valeur_ideale: 1,
    beta: 2,
    gamma: 1.5,
    min_acceptable: 0,
    max_acceptable: 4, // Valeur indicative française
    source_norme: 'Indicateur qualité France',
    note: 'Indicateur de pollution organique'
  },
  
  '1393': { // Fer total
    nom: 'Fer total',
    categorie: 'metauxLourds',
    unite: 'µg/L',
    valeur_ideale: 0,
    valeur_max: 200, // UE
    alpha: 1.2
  }
};

// ===== MAPPING CODES HUBEAU VERS PARAMÈTRES (ENRICHI) =====

const MAPPING_CODES_HUBEAU = {
  // Microbiologie
  '1506': 'ECOLI',
  '1507': 'STRF',
  '1449': 'ECOLI', // Code alternatif E.coli
  '6455': 'STRF',  // Code alternatif Entérocoques
  
  // Organoleptiques  
  '1302': 'PH',
  '1303': 'CDT25',
  '1304': 'TURBNFU',
  '1295': 'TURBNFU', // Code alternatif turbidité
  
  // Métaux lourds
  '1369': 'AS',
  '1382': 'PB', 
  '1388': 'CD',
  '1375': 'CR',
  '1392': 'HG',
  '1393': 'FE', // Fer total
  
  // Nitrates/Nitrites
  '1340': 'NO3',
  '1335': 'NO2',
  '1339': 'NO2', // Code alternatif nitrites
  
  // Chlore
  '1959': 'CL2LIB',
  '1958': 'CL2TOT',
  '1398': 'CL2LIB', // Code alternatif chlore libre
  '1399': 'CL2TOT', // Code alternatif chlore total
  
  // Autres paramètres utiles
  '1337': 'CHLORURES',
  '1338': 'SULFATES',
  '1841': 'COT', // Carbone organique total
  '6276': 'PEST_TOTAL' // Total pesticides
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
 * Obtient tous les paramètres d'une catégorie
 */
function getParametresParCategorie(categorie) {
  const seuilMax = Object.entries(PARAMETRES_SEUIL_MAX)
    .filter(([code, param]) => param.categorie === categorie)
    .map(([code, param]) => ({ code, ...param }));
    
  const centralOptimal = Object.entries(PARAMETRES_OPTIMAL_CENTRAL)
    .filter(([code, param]) => param.categorie === categorie)
    .map(([code, param]) => ({ code, ...param }));
    
  return [...seuilMax, ...centralOptimal];
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
    version: '5.1 - Intégration normes officielles'
  };
}

// ===== EXPORT GLOBAL =====

if (typeof window !== 'undefined') {
  window.CATEGORIES_FREQUENCE = CATEGORIES_FREQUENCE;
  window.PONDERATIONS_CATEGORIES = PONDERATIONS_CATEGORIES;
  window.PARAMETRES_SEUIL_MAX = PARAMETRES_SEUIL_MAX;
  window.PARAMETRES_OPTIMAL_CENTRAL = PARAMETRES_OPTIMAL_CENTRAL;
  window.MAPPING_CODES_HUBEAU = MAPPING_CODES_HUBEAU;
  window.SEUILS_FIABILITE = SEUILS_FIABILITE;
  window.MESSAGES_FIABILITE = MESSAGES_FIABILITE;
  window.getParametresParCategorie = getParametresParCategorie;
  window.estCategorieCritique = estCategorieCritique;
  window.getNiveauFiabilite = getNiveauFiabilite;
  window.getInfoNormes = getInfoNormes;
}

console.log('✅ Barèmes Eau v5.1 - Valeurs de référence scientifiques enrichies avec normes officielles chargées');
