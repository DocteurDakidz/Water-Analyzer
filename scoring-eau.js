/**
 * =============================================================================
 * LIFE WATER v6.0 - ARCHITECTURE MODULAIRE
 * =============================================================================
 */

// ===== SECTION 1 : FONCTIONS UTILITAIRES DE BASE =====  
// Localisation : lignes ~15-50
// Fonctions : getParameterValue, cleanNumericValue, calculerEcartType

// ===== SECTION 2 : RECHERCHE HUBEAU ET DONNÉES =====
// Localisation : lignes ~51-200  
// Fonctions : fetchHubeauForCommuneComplete, fetchHubeauDataWithFallback

// ===== SECTION 3 : DÉDOUBLONNAGE ET NETTOYAGE =====
// Localisation : lignes ~450-550
// Fonctions : dedoublonnerParametres, obtenirValeurOptimaleTemporelle

// ===== SECTION 4 : ALGORITHME DE SCORING PRINCIPAL =====
// Localisation : lignes ~800-1000
// Fonctions : calculateLifeWaterScore, calculerScoreCategorieComplete

// ===== SECTION 5 : CALCULS SCIENTIFIQUES =====
// Localisation : lignes ~600-750
// Fonctions : calculerScoreSeuilMax, calculerScoreOptimalCentral

// ===== SECTION 6 : GÉNÉRATION HTML ET AFFICHAGE =====
// Localisation : lignes ~1200-2000
// Fonctions : generateLifeWaterHTML, generateAccordionSections

// ========================================================================
// CODE ORIGINAL v5.4 CONSERVÉ INTÉGRALEMENT CI-DESSOUS
// ========================================================================

/**
 * =============================================================================
 * SCORING EAU v6.0 - ARCHITECTURE MODULAIRE
 * =============================================================================
 * Analyseur de qualité de l'eau potable avec algorithme équitable
 * Utilise les données officielles Hubeau et barèmes scientifiques
 * Version 6.0 - Structure modulaire avec diagnostic enrichi
 * =============================================================================
 */

// ===== SECTION 1 : FONCTIONS UTILITAIRES DE BASE =====
// Fonctions : getParameterValue, cleanNumericValue, calculerEcartType
// Dépendances : Aucune
// Utilisé par : Section 2, 3, 4

/**
 * ✅ FONCTION DEBUG ENRICHIE v6.0
 */
function debugAnalyseComplete(parametersData, scoreResult = null) {
  console.log('=== DEBUG ANALYSE COMPLÈTE v6.0 ===');
  
  // 1. Diagnostic des barèmes
  if (typeof diagnostiquerBaremes === 'function') {
    const diagnostic = diagnostiquerBaremes();
    console.log('📊 DIAGNOSTIC BARÈMES:', diagnostic);
    
    if (diagnostic.erreurs.length > 0) {
      console.error('❌ ERREURS BARÈMES:', diagnostic.erreurs);
    }
  }
  
  // 2. Analyse données Hubeau
  console.log('📋 DONNÉES HUBEAU:');
  console.log(`- Paramètres reçus: ${Object.keys(parametersData).length}`);
  
  // Grouper par catégorie
  const parCategorie = {};
  Object.entries(parametersData).forEach(([code, param]) => {
    // Trouver la catégorie via les barèmes
    let categorieTrouvee = 'non_classifie';
    
    // Chercher dans PARAMETRES_SEUIL_MAX
    if (PARAMETRES_SEUIL_MAX[code]) {
      categorieTrouvee = PARAMETRES_SEUIL_MAX[code].categorie;
    }
    // Chercher dans PARAMETRES_OPTIMAL_CENTRAL  
    else if (PARAMETRES_OPTIMAL_CENTRAL[code]) {
      categorieTrouvee = PARAMETRES_OPTIMAL_CENTRAL[code].categorie;
    }
    
    if (!parCategorie[categorieTrouvee]) {
      parCategorie[categorieTrouvee] = [];
    }
    parCategorie[categorieTrouvee].push({
      code: code,
      nom: param.name,
      valeur: param.latestValue?.numeric || param.latestValue?.alphanumeric,
      date: param.latestDate
    });
  });
  
  console.log('📊 RÉPARTITION PAR CATÉGORIE:');
  Object.entries(parCategorie).forEach(([cat, params]) => {
    console.log(`  ${cat}: ${params.length} paramètres`);
    params.forEach(p => {
      console.log(`    ${p.code}: ${p.nom} = ${p.valeur} (${p.date})`);
    });
  });
  
  // 3. Analyse des doublons potentiels
  console.log('🔍 ANALYSE DOUBLONS:');
  Object.entries(PARAMETRES_EQUIVALENTS).forEach(([groupKey, group]) => {
    const codesPresents = group.codes.filter(code => parametersData[code]);
    if (codesPresents.length > 1) {
      console.log(`⚠️ Doublon détecté: ${group.nom} → codes ${codesPresents.join(', ')}`);
    }
  });
  
  // 4. Analyse du score (si fourni)
  if (scoreResult) {
    console.log('🎯 ANALYSE SCORE:');
    console.log(`- Score final: ${scoreResult.score}/100`);
    console.log(`- Fiabilité: ${scoreResult.fiabilite}%`);
    console.log('- Contributions par catégorie:');
    Object.entries(scoreResult.contributions || {}).forEach(([cat, contrib]) => {
      console.log(`  ${cat}: ${contrib.score}/100 (${contrib.points} pts)`);
    });
  }
  
  return {
    parametresTotal: Object.keys(parametersData).length,
    repartitionCategories: parCategorie,
    doublonsDetectes: Object.keys(PARAMETRES_EQUIVALENTS).filter(key => 
      PARAMETRES_EQUIVALENTS[key].codes.filter(code => parametersData[code]).length > 1
    ).length
  };
}

/**
 * Extrait la valeur numérique d'un paramètre Hubeau
 */
function getParameterValue(parameter) {
  if (!parameter || !parameter.latestValue) return null;
  
  const value = parameter.latestValue.numeric !== undefined ? 
    parameter.latestValue.numeric : 
    parameter.latestValue.alphanumeric;
  
  return cleanNumericValue(value);
}

/**
 * Nettoie et convertit une valeur en nombre
 */
function cleanNumericValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  if (str === '' || str.toLowerCase() === 'non détecté' || str === '<') return 0;
  
  const match = str.match(/^[<>]?\s*(\d+(?:[.,]\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? null : num;
}

/**
 * Calcule l'écart-type d'un ensemble de valeurs
 */
function calculerEcartType(valeurs) {
  if (!valeurs || valeurs.length < 2) return 0;
  
  const moyenne = valeurs.reduce((sum, val) => sum + val, 0) / valeurs.length;
  const variance = valeurs.reduce((sum, val) => sum + Math.pow(val - moyenne, 2), 0) / valeurs.length;
  
  return Math.sqrt(variance);
}

// ===== SECTION 2 : RECHERCHE HUBEAU ET DONNÉES =====  
// Fonctions : fetchHubeauForCommuneComplete, fetchHubeauDataWithFallback, etc.
// Dépendances : Section 1
// Utilisé par : Section 4 (algorithme principal)

/**
 * Recherche les données Hubeau pour une commune avec gestion complète
 */
async function fetchHubeauForCommuneComplete(codeCommune, nomCommune = '') {
  try {
    console.log(`🔍 Recherche données Hubeau pour ${nomCommune} (${codeCommune})`);
    
    const url = `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${codeCommune}&size=1000&sort=desc`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log(`❌ Aucune donnée pour ${nomCommune}`);
      return { parametersData: {}, nombreParametres: 0 };
    }
    
    console.log(`✅ ${data.data.length} analyses trouvées pour ${nomCommune}`);
    
    // Traitement des données
    const parametersData = {};
    
    data.data.forEach(result => {
      const code = result.code_parametre;
      const value = result.resultat_numerique !== null ? 
        result.resultat_numerique : 
        result.resultat_alphanumerique;
      
      if (!parametersData[code]) {
        parametersData[code] = {
          name: result.libelle_parametre,
          unit: result.unite_mesure,
          values: [],
          dates: []
        };
      }
      
      parametersData[code].values.push(value);
      parametersData[code].dates.push(result.date_prelevement);
    });
    
    // Calculer les valeurs optimales pour chaque paramètre
    Object.keys(parametersData).forEach(code => {
      const param = parametersData[code];
      const valeurOptimale = obtenirValeurOptimaleTemporelle(param.values, param.dates);
      
      param.latestValue = {
        numeric: typeof valeurOptimale === 'number' ? valeurOptimale : null,
        alphanumeric: typeof valeurOptimale === 'string' ? valeurOptimale : null
      };
      param.latestDate = param.dates[0]; // Date la plus récente
    });
    
    return { 
      parametersData, 
      nombreParametres: Object.keys(parametersData).length 
    };
    
  } catch (error) {
    console.error(`❌ Erreur recherche ${nomCommune}:`, error);
    return { parametersData: {}, nombreParametres: 0 };
  }
}

/**
 * Recherche avec fallback géographique dans les communes voisines
 */
async function fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm = 20) {
  console.log('=== RECHERCHE HUBEAU AVEC FALLBACK v6.0 ===');
  
  // 1. Recherche principale dans la commune
  const resultPrincipal = await fetchHubeauForCommuneComplete(codeCommune, 'commune principale');
  
  if (resultPrincipal.nombreParametres >= 3) {
    console.log('✅ Données suffisantes dans la commune principale');
    return {
      parametersData: resultPrincipal.parametersData,
      sourceInfo: {
        type: 'commune_principale',
        codeCommune: codeCommune,
        nomCommune: 'Commune principale',
        distance: 0.0,
        nombreParametres: resultPrincipal.nombreParametres
      }
    };
  }
  
  // 2. Recherche dans les communes voisines
  console.log('🔍 Recherche dans les communes voisines...');
  
  try {
    const urlVoisines = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&distance=${rayonKm * 1000}&fields=nom,code,centre&format=json&geometry=centre`;
    const responseVoisines = await fetch(urlVoisines);
    
    if (!responseVoisines.ok) {
      throw new Error('Erreur API Géo');
    }
    
    const communesVoisines = await responseVoisines.json();
    console.log(`📍 ${communesVoisines.length} communes dans un rayon de ${rayonKm}km`);
    
    // Trier par distance
    communesVoisines.sort((a, b) => {
      const distA = calculerDistance(lat, lon, a.centre.coordinates[1], a.centre.coordinates[0]);
      const distB = calculerDistance(lat, lon, b.centre.coordinates[1], b.centre.coordinates[0]);
      return distA - distB;
    });
    
    // Tester les communes voisines
    for (const commune of communesVoisines.slice(0, 10)) {
      if (commune.code === codeCommune) continue;
      
      const distance = calculerDistance(lat, lon, commune.centre.coordinates[1], commune.centre.coordinates[0]);
      const resultVoisine = await fetchHubeauForCommuneComplete(commune.code, commune.nom);
      
      if (resultVoisine.nombreParametres >= 3) {
        console.log(`✅ Données trouvées dans ${commune.nom} (${distance.toFixed(1)}km)`);
        return {
          parametersData: resultVoisine.parametersData,
          sourceInfo: {
            type: 'commune_voisine',
            codeCommune: commune.code,
            nomCommune: commune.nom,
            distance: distance,
            nombreParametres: resultVoisine.nombreParametres
          }
        };
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur recherche communes voisines:', error);
  }
  
  // 3. Aucune donnée trouvée
  console.log('❌ Aucune donnée suffisante trouvée');
  return {
    parametersData: {},
    sourceInfo: {
      type: 'aucune_donnee',
      codeCommune: codeCommune,
      nomCommune: 'Aucune donnée',
      distance: 0,
      nombreParametres: 0
    }
  };
}

/**
 * Calcule la distance entre deux points géographiques (formule haversine)
 */
function calculerDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ===== SECTION 3 : DÉDOUBLONNAGE ET NETTOYAGE =====
// Fonctions : dedoublonnerParametres, obtenirValeurOptimaleTemporelle
// Dépendances : baremes-eau.js (PARAMETRES_EQUIVALENTS)
// Utilisé par : Section 4

/**
 * Dédoublonne les paramètres équivalents selon les priorités définies
 */
function dedoublonnerParametres(parametersData) {
  console.log('🔄 Dédoublonnage des paramètres équivalents...');
  
  const parametresDedoubles = { ...parametersData };
  const suppressions = [];
  
  Object.entries(PARAMETRES_EQUIVALENTS).forEach(([groupKey, group]) => {
    const codesPresents = group.codes.filter(code => parametersData[code]);
    
    if (codesPresents.length > 1) {
      console.log(`🔍 Doublon détecté: ${group.nom} → ${codesPresents.join(', ')}`);
      
      // Garder le code prioritaire
      const codePrioritaire = group.priorite.find(code => codesPresents.includes(code));
      
      if (codePrioritaire) {
        // Supprimer les autres codes
        codesPresents.forEach(code => {
          if (code !== codePrioritaire) {
            delete parametresDedoubles[code];
            suppressions.push(`${code} (gardé: ${codePrioritaire})`);
          }
        });
        
        console.log(`✅ Gardé: ${codePrioritaire}, supprimé: ${codesPresents.filter(c => c !== codePrioritaire).join(', ')}`);
      }
    }
  });
  
  if (suppressions.length > 0) {
    console.log(`🗑️ Paramètres supprimés: ${suppressions.join(', ')}`);
  }
  
  return parametresDedoubles;
}

/**
 * Obtient la valeur optimale d'un paramètre selon l'historique temporel
 */
function obtenirValeurOptimaleTemporelle(values, dates) {
  if (!values || values.length === 0) return null;
  if (values.length === 1) return values[0];
  
  // Trier par date décroissante (plus récent en premier)
  const valeursAvecDates = values.map((val, idx) => ({
    valeur: val,
    date: new Date(dates[idx])
  })).sort((a, b) => b.date - a.date);
  
  // Prendre les 3 valeurs les plus récentes pour stabilité
  const valeursRecentes = valeursAvecDates.slice(0, 3).map(v => v.valeur);
  
  // Nettoyer les valeurs numériques
  const valeursNumeriques = valeursRecentes
    .map(v => cleanNumericValue(v))
    .filter(v => v !== null);
  
  if (valeursNumeriques.length === 0) {
    return valeursRecentes[0]; // Retourner la plus récente même si non numérique
  }
  
  // Si toutes les valeurs sont identiques, retourner cette valeur
  if (valeursNumeriques.every(v => v === valeursNumeriques[0])) {
    return valeursNumeriques[0];
  }
  
  // Calculer la médiane pour éviter les valeurs aberrantes
  const valeursTries = [...valeursNumeriques].sort((a, b) => a - b);
  const milieu = Math.floor(valeursTries.length / 2);
  
  if (valeursTries.length % 2 === 0) {
    return (valeursTries[milieu - 1] + valeursTries[milieu]) / 2;
  } else {
    return valeursTries[milieu];
  }
}

// ===== SECTION 4 : ALGORITHME DE SCORING PRINCIPAL =====
// Fonctions : calculateLifeWaterScore, calculerScoreCategorieComplete
// Dépendances : baremes-eau.js (PONDERATIONS_CATEGORIES), Sections 1,2,3
// Point d'entrée principal

/**
 * 🎯 FONCTION PRINCIPALE - Calcule le score Life Water avec algorithme équitable v6.0
 */
function calculateLifeWaterScore(parametersData, options = {}, sourceInfo = null) {
  console.log('=== CALCUL SCORING SCIENTIFIQUE ÉQUITABLE v6.0 ===');
  
  // Debug enrichi
  const debugInfo = debugAnalyseComplete(parametersData);
  
  // Dédoublonnage des paramètres
  const parametresDedoubles = dedoublonnerParametres(parametersData);
  
  const analyseApprofondie = options.analyseApprofondie !== false;
  
  // Initialisation
  let scoreTotal = 0;
  let fiabiliteTotal = 0;
  const contributions = {};
  const detailsParCategorie = {};
  const alertes = [];
  const recommandations = [];
  
  // Compteurs pour métadonnées
  let parametresTestes = 0;
  let parametresTotaux = 0;
  
  // Traitement par catégorie
  Object.entries(PONDERATIONS_CATEGORIES).forEach(([categorie, ponderation]) => {
    console.log(`\n📊 === CATÉGORIE: ${categorie.toUpperCase()} (${Math.round(ponderation * 100)}%) ===`);
    
    const resultCategorie = calculerScoreCategorieComplete(
      categorie, 
      parametresDedoubles, 
      analyseApprofondie
    );
    
    // Accumulation des scores
    const pointsCategorie = resultCategorie.score * ponderation;
    scoreTotal += pointsCategorie;
    fiabiliteTotal += resultCategorie.fiabilite * ponderation;
    
    // Stockage des résultats
    contributions[categorie] = {
      score: resultCategorie.score,
      fiabilite: resultCategorie.fiabilite,
      points: Math.round(pointsCategorie * 100) / 100,
      ponderation: Math.round(ponderation * 100)
    };
    
    detailsParCategorie[categorie] = resultCategorie.details;
    
    // Accumulation métadonnées
    parametresTestes += resultCategorie.parametresTestes;
    parametresTotaux += resultCategorie.parametresTotaux;
    
    // Alertes critiques
    if (resultCategorie.alertes) {
      alertes.push(...resultCategorie.alertes);
    }
    
    console.log(`✅ ${categorie}: ${resultCategorie.score}/100 (${resultCategorie.fiabilite}% fiable) → ${pointsCategorie.toFixed(2)} pts`);
  });
  
  // Finalisation des scores
  const scoreFinal = Math.round(scoreTotal);
  const fiabiliteFinal = Math.round(fiabiliteTotal);
  
  // Détermination du niveau de qualité
  const niveauQualite = determinerNiveauQualite(scoreFinal);
  
  // Génération des recommandations
  if (scoreFinal < 60) {
    recommandations.push("💧 Envisagez un système de filtration adapté");
  }
  if (fiabiliteFinal < 70) {
    recommandations.push("🔬 Analyses complémentaires recommandées pour plus de précision");
  }
  if (alertes.length > 0) {
    recommandations.push("⚠️ Consultez un professionnel pour les paramètres en alerte");
  }
  
  // Calcul fiabilité simple pour comparaison
  const fiabiliteSimple = parametresTotaux > 0 ? 
    Math.round((parametresTestes / parametresTotaux) * 100) : 0;
  
  console.log(`\n🎯 === RÉSULTAT FINAL ===`);
  console.log(`Score: ${scoreFinal}/100 - ${niveauQualite.niveau}`);
  console.log(`Fiabilité: ${fiabiliteFinal}% (pondérée) vs ${fiabiliteSimple}% (simple)`);
  console.log(`Paramètres: ${parametresTestes}/${parametresTotaux} testés`);
  
  const result = {
    score: scoreFinal,
    fiabilite: fiabiliteFinal,
    niveau: niveauQualite.niveau,
    emoji: niveauQualite.emoji,
    couleur: niveauQualite.couleur,
    message: niveauQualite.message,
    alertes: alertes,
    recommandations: recommandations,
    contributions: contributions,
    detailsParCategorie: detailsParCategorie,
    sourceInfo: sourceInfo,
    metadata: {
      version: '6.0 - Architecture modulaire avec diagnostic',
      parametres_testes_total: parametresTestes,
      parametres_totaux_total: parametresTotaux,
      fiabiliteSimple: fiabiliteSimple,
      fiabilitePonderee: fiabiliteFinal,
      debugInfo: debugInfo
    }
  };
  
  // Debug final avec résultat
  debugAnalyseComplete(parametersData, result);
  
  return result;
}

/**
 * Calcule le score complet d'une catégorie avec gestion équitable
 */
function calculerScoreCategorieComplete(categorie, parametersData, analyseApprofondie = true) {
  const categorieConfig = CATEGORIES_COMPLETES[categorie];
  
  if (!categorieConfig) {
    console.log(`❌ Catégorie inconnue: ${categorie}`);
    return {
      score: 50,
      fiabilite: 0,
      details: {},
      parametresTestes: 0,
      parametresTotaux: 0,
      alertes: []
    };
  }
  
  // Récupération de tous les paramètres de la catégorie
  const tousParametres = [
    ...(categorieConfig.parametres_critiques || []),
    ...(categorieConfig.parametres_moderes || []),
    ...(categorieConfig.parametres_mineurs || [])
  ];
  
  if (tousParametres.length === 0) {
    console.log(`⚠️ Catégorie ${categorie} sans paramètres définis`);
    return {
      score: 50,
      fiabilite: 0,
      details: {},
      parametresTestes: 0,
      parametresTotaux: tousParametres.length,
      alertes: []
    };
  }
  
  // Calcul des scores par paramètre
  let scoresPonderes = 0;
  let poidsTotaux = 0;
  let parametresTestes = 0;
  const details = {};
  const alertes = [];
  
  tousParametres.forEach(codeParametre => {
    const paramData = parametersData[codeParametre];
    const estTeste = paramData !== undefined;
    
    // Détermination du poids selon le niveau de criticité
    let poids = 1.0;
    if (categorieConfig.parametres_critiques?.includes(codeParametre)) {
      poids = 3.0; // Paramètres critiques
    } else if (categorieConfig.parametres_moderes?.includes(codeParametre)) {
      poids = 2.0; // Paramètres modérés
    }
    // Les paramètres mineurs gardent poids = 1.0
    
    let scoreParametre;
    let interpretation = '';
    
    if (estTeste) {
      // Paramètre testé : calcul scientifique
      const resultCalcul = calculerScoreParametre(codeParametre, paramData);
      scoreParametre = resultCalcul.score;
      interpretation = resultCalcul.interpretation;
      parametresTestes++;
      
      // Détection d'alertes critiques
      if (scoreParametre === 0 && categorieConfig.parametres_critiques?.includes(codeParametre)) {
        alertes.push(`🚨 CRITIQUE: ${resultCalcul.nom} - ${interpretation}`);
      }
      
      console.log(`  ✅ ${codeParametre}: ${scoreParametre}/100 (testé, poids: ${poids})`);
    } else {
      // Paramètre non testé : bénéfice du doute
      scoreParametre = 50;
      interpretation = 'Non testé - Bénéfice du doute';
      console.log(`  ⚪ ${codeParametre}: ${scoreParametre}/100 (non testé, poids: ${poids})`);
    }
    
    // Accumulation pondérée
    scoresPonderes += scoreParametre * poids;
    poidsTotaux += poids;
    
    // Stockage des détails
    if (analyseApprofondie) {
      const configParam = PARAMETRES_SEUIL_MAX[codeParametre] || PARAMETRES_OPTIMAL_CENTRAL[codeParametre];
      details[codeParametre] = {
        nom: configParam?.nom || `Paramètre ${codeParametre}`,
        score: scoreParametre,
        estTeste: estTeste,
        interpretation: interpretation,
        poids: poids,
        valeur: estTeste ? (paramData.latestValue?.numeric || paramData.latestValue?.alphanumeric) : null,
        unite: configParam?.unite || paramData?.unit || '',
        date: estTeste ? paramData.latestDate : null,
        impact: configParam?.impact || '',
        norme: configParam?.source_norme || ''
      };
    }
  });
  
  // Calcul du score final de la catégorie
  const scoreCategorie = poidsTotaux > 0 ? Math.round(scoresPonderes / poidsTotaux) : 50;
  
  // Calcul de la fiabilité pondérée par criticité
  const fiabiliteCategorie = calculerFiabilitePondereeCategorie(
    categorieConfig, 
    parametresTestes, 
    tousParametres.length
  );
  
  return {
    score: scoreCategorie,
    fiabilite: fiabiliteCategorie,
    details: details,
    parametresTestes: parametresTestes,
    parametresTotaux: tousParametres.length,
    alertes: alertes
  };
}

/**
 * Calcule la fiabilité pondérée d'une catégorie selon la criticité des paramètres
 */
function calculerFiabilitePondereeCategorie(categorieConfig, parametresTestes, parametresTotaux) {
  if (parametresTotaux === 0) return 0;
  
  // Pondération par criticité
  const critiques = categorieConfig.parametres_critiques?.length || 0;
  const moderes = categorieConfig.parametres_moderes?.length || 0;
  const mineurs = categorieConfig.parametres_mineurs?.length || 0;
  
  // Si tous les paramètres sont testés
  if (parametresTestes === parametresTotaux) return 100;
  
  // Calcul pondéré : critiques 60%, modérés 30%, mineurs 10%
  const poidsCritiques = critiques * 0.6;
  const poidsModeres = moderes * 0.3;
  const poidsMineurs = mineurs * 0.1;
  const poidsTotaux = poidsCritiques + poidsModeres + poidsMineurs;
  
  if (poidsTotaux === 0) return 0;
  
  // Estimation de la fiabilité selon les paramètres testés
  const tauxTest = parametresTestes / parametresTotaux;
  const fiabiliteBase = tauxTest * 100;
  
  // Bonus si les paramètres critiques sont couverts
  let bonus = 0;
  if (critiques > 0 && parametresTestes >= critiques) {
    bonus = 10; // Bonus si paramètres critiques couverts
  }
  
  return Math.min(100, Math.round(fiabiliteBase + bonus));
}

/**
 * Détermine le niveau de qualité selon le score
 */
function determinerNiveauQualite(score) {
  if (score >= 85) return { niveau: 'EXCELLENT', emoji: '🟢', couleur: '#28a745', message: 'Eau de qualité exceptionnelle' };
  if (score >= 75) return { niveau: 'TRÈS BON', emoji: '🟢', couleur: '#28a745', message: 'Eau de très bonne qualité' };
  if (score >= 65) return { niveau: 'BON', emoji: '🟡', couleur: '#ffc107', message: 'Eau de qualité satisfaisante' };
  if (score >= 55) return { niveau: 'CORRECT', emoji: '🟡', couleur: '#ffc107', message: 'Eau correcte, améliorations possibles' };
  if (score >= 45) return { niveau: 'AMÉLIORABLE', emoji: '🟠', couleur: '#fd7e14', message: 'Traitement recommandé' };
  if (score >= 35) return { niveau: 'PRÉOCCUPANT', emoji: '🟠', couleur: '#fd7e14', message: 'Traitement prioritaire' };
  if (score >= 20) return { niveau: 'MAUVAIS', emoji: '🔴', couleur: '#dc3545', message: 'Risques sanitaires' };
  return { niveau: 'CRITIQUE', emoji: '🔴', couleur: '#dc3545', message: 'Impropre à la consommation' };
}

// ===== SECTION 5 : CALCULS SCIENTIFIQUES =====
// Fonctions : calculerScoreSeuilMax, calculerScoreOptimalCentral, calculerScoreParametre
// Dépendances : baremes-eau.js (PARAMETRES_SEUIL_MAX, PARAMETRES_OPTIMAL_CENTRAL)
// Utilisé par : Section 4

/**
 * Calcule le score d'un paramètre selon sa configuration
 */
function calculerScoreParametre(codeParametre, paramData) {
  const valeur = getParameterValue(paramData);
  
  if (valeur === null) {
    return {
      score: 50,
      interpretation: 'Valeur non exploitable',
      nom: paramData.name || `Paramètre ${codeParametre}`
    };
  }
  
  // Vérifier dans les paramètres à seuil maximal
  if (PARAMETRES_SEUIL_MAX[codeParametre]) {
    return calculerScoreSeuilMax(codeParametre, valeur);
  }
  
  // Vérifier dans les paramètres à optimum central
  if (PARAMETRES_OPTIMAL_CENTRAL[codeParametre]) {
    return calculerScoreOptimalCentral(codeParametre, valeur);
  }
  
  // Paramètre non configuré
  return {
    score: 50,
    interpretation: 'Paramètre non configuré dans les barèmes',
    nom: paramData.name || `Paramètre ${codeParametre}`
  };
}

/**
 * Calcule le score pour un paramètre à seuil maximal
 * Formule: Score = max(0, 100 - 100 * ((valeur - valeur_ideale) / (valeur_max - valeur_ideale))^α)
 */
function calculerScoreSeuilMax(codeParametre, valeur) {
  const config = PARAMETRES_SEUIL_MAX[codeParametre];
  
  if (!config) {
    return { score: 50, interpretation: 'Configuration manquante', nom: `Paramètre ${codeParametre}` };
  }
  
  const { valeur_ideale, valeur_max, alpha, nom } = config;
  
  // Cas spécial : valeur idéale = valeur max (ex: E. coli)
  if (valeur_ideale === valeur_max) {
    if (valeur <= valeur_ideale) {
      return {
        score: 100,
        interpretation: valeur === 0 ? 'Non détecté - Excellent' : 'Conforme - Excellent',
        nom: nom
      };
    } else {
      return {
        score: 0,
        interpretation: 'Dépassement critique - Impropre',
        nom: nom
      };
    }
  }
  
  // Calcul standard
  if (valeur <= valeur_ideale) {
    return {
      score: 100,
      interpretation: 'Valeur idéale - Excellent',
      nom: nom
    };
  }
  
  if (valeur >= valeur_max) {
    return {
      score: 0,
      interpretation: 'Dépassement de seuil - Critique',
      nom: nom
    };
  }
  
  // Calcul intermédiaire
  const ratio = (valeur - valeur_ideale) / (valeur_max - valeur_ideale);
  const score = Math.max(0, 100 - 100 * Math.pow(ratio, alpha));
  
  let interpretation;
  if (score >= 80) interpretation = 'Très bon niveau';
  else if (score >= 60) interpretation = 'Niveau acceptable';
  else if (score >= 40) interpretation = 'Niveau préoccupant';
  else interpretation = 'Niveau critique';
  
  return {
    score: Math.round(score),
    interpretation: interpretation,
    nom: nom
  };
}

/**
 * Calcule le score pour un paramètre à optimum central
 * Formule: Score = max(0, 100 - β * |valeur - valeur_ideale|^γ)
 */
function calculerScoreOptimalCentral(codeParametre, valeur) {
  const config = PARAMETRES_OPTIMAL_CENTRAL[codeParametre];
  
  if (!config) {
    return { score: 50, interpretation: 'Configuration manquante', nom: `Paramètre ${codeParametre}` };
  }
  
  const { valeur_ideale, beta, gamma, nom, min_acceptable, max_acceptable } = config;
  
  // Vérification des limites acceptables
  if (min_acceptable !== undefined && valeur < min_acceptable) {
    return {
      score: 0,
      interpretation: 'Valeur trop faible - Critique',
      nom: nom
    };
  }
  
  if (max_acceptable !== undefined && valeur > max_acceptable) {
    return {
      score: 0,
      interpretation: 'Valeur trop élevée - Critique',
      nom: nom
    };
  }
  
  // Calcul du score
  const ecart = Math.abs(valeur - valeur_ideale);
  const score = Math.max(0, 100 - beta * Math.pow(ecart, gamma));
  
  let interpretation;
  if (score >= 90) interpretation = 'Valeur optimale';
  else if (score >= 75) interpretation = 'Très bon équilibre';
  else if (score >= 60) interpretation = 'Équilibre acceptable';
  else if (score >= 40) interpretation = 'Déséquilibre modéré';
  else interpretation = 'Déséquilibre important';
  
  return {
    score: Math.round(score),
    interpretation: interpretation,
    nom: nom
  };
}

// ===== SECTION 6 : GÉNÉRATION HTML ET AFFICHAGE =====
// Fonctions : generateLifeWaterHTML, generateAccordionSections, formaterValeurParametre
// Dépendances : Section 4, 5
// Interface utilisateur finale

/**
 * Génère le rapport HTML complet avec affichage amélioré v6.0
 */
function generateLifeWaterHTML(scoreResult, adresse, parametersData) {
  const { score, niveau, emoji, couleur, message, fiabilite, sourceInfo } = scoreResult;
  
  // Informations sur la source des données
  let sourceHTML = '';
  if (sourceInfo) {
    if (sourceInfo.type === 'commune_voisine') {
      sourceHTML = `
        <div class="source-info">
          <p><strong>📍 Source des données:</strong> ${sourceInfo.nomCommune} 
          (${sourceInfo.distance.toFixed(1)}km de votre adresse)</p>
          <p class="text-muted">Données de la commune la plus proche avec analyses disponibles</p>
        </div>
      `;
    } else if (sourceInfo.type === 'aucune_donnee') {
      return `
        <div class="water-analysis-result">
          <div class="alert alert-warning">
            <h4>❌ Aucune donnée disponible</h4>
            <p>Aucune analyse de qualité d'eau trouvée pour <strong>${adresse}</strong> 
            ni dans les communes environnantes (rayon 20km).</p>
            <h5>🔬 Recommandations :</h5>
            <ul>
              <li>Contactez votre mairie pour connaître les dernières analyses</li>
              <li>Consultez votre distributeur d'eau</li>
              <li>Envisagez une analyse privée</li>
            </ul>
          </div>
        </div>
      `;
    }
  }
  
  // Niveau de fiabilité
  const niveauFiabilite = getNiveauFiabilite(fiabilite);
  
  return `
    <div class="water-analysis-result">
      <style>
        .water-analysis-result {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .score-header {
          background: linear-gradient(135deg, ${couleur}15 0%, ${couleur}25 100%);
          padding: 30px;
          text-align: center;
          border-bottom: 3px solid ${couleur};
        }
        
        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: conic-gradient(${couleur} ${score * 3.6}deg, #e9ecef ${score * 3.6}deg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          position: relative;
        }
        
        .score-circle::before {
          content: '';
          width: 90px;
          height: 90px;
          background: white;
          border-radius: 50%;
          position: absolute;
        }
        
        .score-text {
          position: relative;
          z-index: 1;
          font-size: 24px;
          font-weight: bold;
          color: ${couleur};
        }
        
        .level-badge {
          display: inline-block;
          padding: 8px 16px;
          background: ${couleur};
          color: white;
          border-radius: 20px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .reliability-info {
          background: #f8f9fa;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
        
        .source-info {
          background: #e3f2fd;
          padding: 15px;
          margin: 15px 0;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        }
        
        .accordion {
          margin-top: 20px;
        }
        
        .accordion-header {
          background: #f8f9fa;
          padding: 15px 20px;
          cursor: pointer;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          margin-bottom: 10px;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .accordion-header:hover {
          background: #e9ecef;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .accordion-content {
          display: none;
          padding: 20px;
          background: white;
          border: 1px solid #dee2e6;
          border-top: none;
          border-radius: 0 0 8px 8px;
          margin-top: -10px;
        }
        
        .accordion-content.active {
          display: block;
        }
        
        .parameter-item {
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border: 1px solid #e9ecef;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        
        .parameter-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .parameter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .parameter-name {
          font-weight: bold;
          color: #2c3e50;
        }
        
        .parameter-score {
          font-size: 18px;
          font-weight: bold;
        }
        
        .parameter-value-section {
          background: #f1f3f4;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 0;
        }
        
        .parameter-interpretation {
          color: #7f8c8d;
          font-style: italic;
          margin-top: 5px;
        }
        
        .parameter-meta {
          font-size: 12px;
          color: #6c757d;
          margin-top: 8px;
        }
        
        .badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .badge-excellent { background: #d4edda; color: #155724; }
        .badge-good { background: #fff3cd; color: #856404; }
        .badge-medium { background: #f8d7da; color: #721c24; }
        .badge-poor { background: #f5c6cb; color: #721c24; }
        
        .text-muted { color: #6c757d; }
        .alert { padding: 15px; border-radius: 8px; margin: 15px 0; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        
        @media (max-width: 768px) {
          .water-analysis-result { margin: 10px; }
          .score-header { padding: 20px; }
          .parameter-header { flex-direction: column; align-items: flex-start; }
        }
      </style>
      
      <div class="score-header">
        <div class="score-circle">
          <div class="score-text">${score}</div>
        </div>
        <h2>${emoji} ${niveau}</h2>
        <div class="level-badge">${message}</div>
        <p style="margin-top: 15px; opacity: 0.9;">
          <strong>📍 ${adresse}</strong>
        </p>
      </div>
      
      ${sourceHTML}
      
      <div style="padding: 20px;">
        <div class="reliability-info">
          <h4>📊 ${niveauFiabilite.niveau}</h4>
          <p><strong>Fiabilité:</strong> ${fiabilite}%</p>
          <p>${niveauFiabilite.message}</p>
          <p><em>${niveauFiabilite.confiance}</em></p>
        </div>
        
        ${generateAccordionSections(scoreResult)}
      </div>
    </div>
  `;
}

/**
 * Génère les sections accordéon pour les détails
 */
function generateAccordionSections(scoreResult) {
  const { contributions, detailsParCategorie, alertes, recommandations } = scoreResult;
  
  let sectionsHTML = '<div class="accordion">';
  
  // Section 1: Résumé par catégorie
  sectionsHTML += `
    <div class="accordion-header" onclick="toggleCategory('summary')">
      <span><strong>📊 Résumé par catégorie</strong></span>
      <span>▼</span>
    </div>
    <div class="accordion-content" id="summary">
      ${generateCategorySummary(contributions)}
    </div>
  `;
  
  // Section 2: Détails des paramètres
  sectionsHTML += `
    <div class="accordion-header" onclick="toggleCategory('details')">
      <span><strong>🔬 Détails des paramètres analysés</strong></span>
      <span>▼</span>
    </div>
    <div class="accordion-content" id="details">
      ${generateParameterDetails(detailsParCategorie)}
    </div>
  `;
  
  // Section 3: Alertes et recommandations
  if (alertes.length > 0 || recommandations.length > 0) {
    sectionsHTML += `
      <div class="accordion-header" onclick="toggleCategory('recommendations')">
        <span><strong>💡 Alertes et recommandations</strong></span>
        <span>▼</span>
      </div>
      <div class="accordion-content" id="recommendations">
        ${generateRecommendations(alertes, recommandations)}
      </div>
    `;
  }
  
  sectionsHTML += '</div>';
  
  return sectionsHTML;
}

/**
 * Génère le résumé par catégorie
 */
function generateCategorySummary(contributions) {
  let html = '<div class="categories-summary">';
  
  Object.entries(contributions).forEach(([categorie, contrib]) => {
    const categorieInfo = CATEGORIES_COMPLETES[categorie];
    const badge = genererBadgeQualite(contrib.score);
    
    html += `
      <div class="parameter-item">
        <div class="parameter-header">
          <div>
            <div class="parameter-name">${categorieInfo?.nom || categorie}</div>
            <div class="text-muted">${categorieInfo?.description || ''}</div>
          </div>
          <div class="parameter-score" style="color: ${badge.couleur};">
            ${contrib.score}/100 ${badge.emoji}
          </div>
        </div>
        <div class="parameter-value-section">
          <strong>Contribution:</strong> ${contrib.points} points (${contrib.ponderation}%)<br>
          <strong>Fiabilité:</strong> ${contrib.fiabilite}%
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Génère les détails des paramètres
 */
function generateParameterDetails(detailsParCategorie) {
  let html = '';
  
  Object.entries(detailsParCategorie).forEach(([categorie, details]) => {
    const categorieInfo = CATEGORIES_COMPLETES[categorie];
    
    html += `<h4>${categorieInfo?.nom || categorie}</h4>`;
    
    Object.entries(details).forEach(([code, detail]) => {
      const badge = genererBadgeQualite(detail.score);
      const valeurFormatee = formaterValeurParametre(detail.valeur, detail.unite, detail.nom);
      const interpretation = getInterpretation(detail.valeur, detail.nom, detail.score);
      
      html += `
        <div class="parameter-item">
          <div class="parameter-header">
            <div class="parameter-name">${detail.nom}</div>
            <div class="parameter-score" style="color: ${badge.couleur};">
              ${detail.score}/100 ${badge.emoji}
            </div>
          </div>
          
          <div class="parameter-value-section">
            <strong>Valeur:</strong> ${valeurFormatee}
            ${detail.estTeste ? '' : '<span class="badge badge-medium">Non testé</span>'}
          </div>
          
          <div class="parameter-interpretation">
            ${interpretation}
          </div>
          
          ${detail.impact ? `<div class="parameter-meta">💡 ${detail.impact}</div>` : ''}
          ${detail.norme ? `<div class="parameter-meta">📋 ${detail.norme}</div>` : ''}
          ${detail.date ? `<div class="parameter-meta">📅 Analysé le ${new Date(detail.date).toLocaleDateString('fr-FR')}</div>` : ''}
        </div>
      `;
    });
  });
  
  return html;
}

/**
 * Génère les alertes et recommandations
 */
function generateRecommendations(alertes, recommandations) {
  let html = '';
  
  if (alertes.length > 0) {
    html += '<h4>⚠️ Alertes</h4>';
    alertes.forEach(alerte => {
      html += `<div class="alert alert-warning">${alerte}</div>`;
    });
  }
  
  if (recommandations.length > 0) {
    html += '<h4>💡 Recommandations</h4>';
    html += '<ul>';
    recommandations.forEach(rec => {
      html += `<li>${rec}</li>`;
    });
    html += '</ul>';
  }
  
  return html;
}

/**
 * Formate intelligemment l'affichage des valeurs
 */
function formaterValeurParametre(valeur, unite, nom) {
  if (valeur === null || valeur === undefined) {
    return '<span class="text-muted">Non analysé</span>';
  }
  
  // Cas spécial : paramètres microbiologiques à 0
  if (valeur === 0 && nom && (
    nom.toLowerCase().includes('coli') ||
    nom.toLowerCase().includes('entérocoque') ||
    nom.toLowerCase().includes('bactérie')
  )) {
    return '<strong style="color: #28a745;">Non détecté</strong>';
  }
  
  // Correction automatique des unités manquantes
  let uniteCorrigee = unite || '';
  if (!uniteCorrigee && nom) {
    if (nom.toLowerCase().includes('ph')) uniteCorrigee = 'unités pH';
    else if (nom.toLowerCase().includes('conductivité')) uniteCorrigee = 'µS/cm';
    else if (nom.toLowerCase().includes('turbidité')) uniteCorrigee = 'NFU';
    else if (nom.toLowerCase().includes('nitrate')) uniteCorrigee = 'mg/L';
    else if (nom.toLowerCase().includes('chlore')) uniteCorrigee = 'mg/L';
  }
  
  // Formatage numérique
  if (typeof valeur === 'number') {
    const valeurFormatee = valeur % 1 === 0 ? valeur.toString() : valeur.toFixed(2);
    return `<strong>${valeurFormatee}</strong> ${uniteCorrigee}`.trim();
  }
  
  return `<strong>${valeur}</strong> ${uniteCorrigee}`.trim();
}

/**
 * Génère des interprétations claires et contextuelles
 */
function getInterpretation(valeur, nom, score) {
  if (valeur === null || valeur === undefined) {
    return 'Paramètre non testé - Bénéfice du doute accordé';
  }
  
  // Interprétations spécifiques par paramètre
  if (nom && nom.toLowerCase().includes('coli') && valeur === 0) {
    return 'Aucune contamination - Excellent';
  }
  
  if (nom && nom.toLowerCase().includes('ph')) {
    if (valeur >= 6.5 && valeur <= 8.5) {
      return 'pH optimal pour la consommation';
    } else {
      return 'pH en dehors de la plage optimale';
    }
  }
  
  if (nom && nom.toLowerCase().includes('nitrate')) {
    if (valeur < 25) return 'Niveau faible - Très bon';
    if (valeur < 40) return 'Niveau modéré - Acceptable';
    return 'Niveau élevé - Surveillance recommandée';
  }
  
  // Interprétation générale selon le score
  if (score >= 90) return 'Excellent niveau';
  if (score >= 75) return 'Très bon niveau';
  if (score >= 60) return 'Niveau acceptable';
  if (score >= 40) return 'Niveau préoccupant';
  return 'Niveau critique';
}

/**
 * Génère des badges colorés selon le score
 */
function genererBadgeQualite(score) {
  if (score >= 90) return { emoji: '🟢', couleur: '#28a745', classe: 'excellent' };
  if (score >= 75) return { emoji: '🟢', couleur: '#28a745', classe: 'good' };
  if (score >= 60) return { emoji: '🟡', couleur: '#ffc107', classe: 'good' };
  if (score >= 40) return { emoji: '🟠', couleur: '#fd7e14', classe: 'medium' };
  return { emoji: '🔴', couleur: '#dc3545', classe: 'poor' };
}

/**
 * Fonction pour basculer l'affichage des sections accordéon
 */
function toggleCategory(categoryId) {
  const content = document.getElementById(categoryId);
  const header = content.previousElementSibling;
  const arrow = header.querySelector('span:last-child');
  
  if (content.classList.contains('active')) {
    content.classList.remove('active');
    arrow.textContent = '▼';
  } else {
    // Fermer toutes les autres sections
    document.querySelectorAll('.accordion-content.active').forEach(el => {
      el.classList.remove('active');
      el.previousElementSibling.querySelector('span:last-child').textContent = '▼';
    });
    
    // Ouvrir la section cliquée
    content.classList.add('active');
    arrow.textContent = '▲';
  }
}

// ===== EXPORTS GLOBAUX v6.0 =====

if (typeof window !== 'undefined') {
  // Section 1: Utilitaires de base
  window.getParameterValue = getParameterValue;
  window.cleanNumericValue = cleanNumericValue;
  window.calculerEcartType = calculerEcartType;
  window.debugAnalyseComplete = debugAnalyseComplete;
  
  // Section 2: Recherche Hubeau
  window.fetchHubeauForCommuneComplete = fetchHubeauForCommuneComplete;
  window.fetchHubeauDataWithFallback = fetchHubeauDataWithFallback;
  window.calculerDistance = calculerDistance;
  
  // Section 3: Dédoublonnage
  window.dedoublonnerParametres = dedoublonnerParametres;
  window.obtenirValeurOptimaleTemporelle = obtenirValeurOptimaleTemporelle;
  
  // Section 4: Algorithme principal
  window.calculateLifeWaterScore = calculateLifeWaterScore;
  window.calculerScoreCategorieComplete = calculerScoreCategorieComplete;
  window.calculerFiabilitePondereeCategorie = calculerFiabilitePondereeCategorie;
  window.determinerNiveauQualite = determinerNiveauQualite;
  
  // Section 5: Calculs scientifiques
  window.calculerScoreParametre = calculerScoreParametre;
  window.calculerScoreSeuilMax = calculerScoreSeuilMax;
  window.calculerScoreOptimalCentral = calculerScoreOptimalCentral;
  
  // Section 6: Génération HTML
  window.generateLifeWaterHTML = generateLifeWaterHTML;
  window.generateAccordionSections = generateAccordionSections;
  window.generateCategorySummary = generateCategorySummary;
  window.generateParameterDetails = generateParameterDetails;
  window.generateRecommendations = generateRecommendations;
  window.formaterValeurParametre = formaterValeurParametre;
  window.getInterpretation = getInterpretation;
  window.genererBadgeQualite = genererBadgeQualite;
  window.toggleCategory = toggleCategory;
}

console.log('✅ Scoring Eau v6.0 - Architecture modulaire chargée');
console.log('🔧 6 sections: Utilitaires, Hubeau, Dédoublonnage, Scoring, Calculs, HTML');
console.log('📊 Debug enrichi avec diagnostic des barèmes activé');