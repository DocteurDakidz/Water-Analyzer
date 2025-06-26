/**
 * =============================================================================
 * SCORING EAU - ALGORITHME SCIENTIFIQUE ÉQUITABLE
 * =============================================================================
 * Calcul scientifique avec tous les paramètres importants
 * Version 5.3 - Scoring équitable avec affichage amélioré
 * =============================================================================
 */

// ===== FONCTIONS UTILITAIRES (héritées v4.4) =====

function getParameterValue(parametersData, codes) {
  for (const code of codes) {
    if (parametersData[code] && parametersData[code].latestValue) {
      const param = parametersData[code];
      let value = param.latestValue.numeric;
      
      if (value === null || value === undefined) {
        const alphaValue = param.latestValue.alphanumeric;
        if (alphaValue) {
          value = cleanNumericValue(alphaValue);
        }
      }
      
      if (value !== null && value !== undefined) {
        return {
          value: value,
          unit: param.unit,
          date: param.latestDate,
          code: code,
          name: param.name,
          raw: param.latestValue
        };
      }
    }
  }
  return null;
}

function cleanNumericValue(inputValue) {
  if (!inputValue) return null;
  
  let cleanValue = inputValue.toString().trim();
  
  if (cleanValue.includes('<')) {
    cleanValue = cleanValue.replace('<', '').trim();
  } else if (cleanValue.includes('>')) {
    cleanValue = cleanValue.replace('>', '').trim();
  }
  
  cleanValue = cleanValue.replace(',', '.');
  const numValue = parseFloat(cleanValue);
  
  return isNaN(numValue) ? null : numValue;
}

// ===== FONCTIONS GÉOGRAPHIQUES (héritées v4.4) =====

async function fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm = 20) {
  console.log('=== RECHERCHE HUBEAU AVEC FALLBACK GÉOGRAPHIQUE v5.3 ===');
  console.log(`Commune principale: ${codeCommune}, Coordonnées: ${lat}, ${lon}`);
  
  // 1. Tentative sur la commune principale
  console.log('🎯 Tentative commune principale...');
  let result = await fetchHubeauForCommune(codeCommune);
  
  if (result.data && Object.keys(result.data).length >= 3) {
    console.log(`✅ Données trouvées dans la commune principale: ${Object.keys(result.data).length} paramètres`);
    return {
      parametersData: result.data,
      sourceInfo: {
        type: 'commune_principale',
        codeCommune: codeCommune,
        nomCommune: result.nomCommune || `Commune ${codeCommune}`,
        distance: 0,
        nombreParametres: Object.keys(result.data).length
      }
    };
  }
  
  console.log(`⚠️ Données insuffisantes dans la commune principale (${Object.keys(result.data).length} paramètres)`);
  
  // 2. Recherche dans les communes voisines
  console.log('🔍 Recherche dans les communes voisines...');
  
  try {
    const communesVoisines = await findNearbyCommunes(lat, lon, rayonKm);
    console.log(`Communes voisines trouvées: ${communesVoisines.length}`);
    
    for (const commune of communesVoisines) {
      console.log(`🔍 Test commune: ${commune.nom} (${commune.code}) à ${commune.distance.toFixed(1)}km`);
      
      const resultVoisine = await fetchHubeauForCommune(commune.code);
      
      if (resultVoisine.data && Object.keys(resultVoisine.data).length >= 3) {
        console.log(`✅ Données trouvées dans ${commune.nom}: ${Object.keys(resultVoisine.data).length} paramètres`);
        return {
          parametersData: resultVoisine.data,
          sourceInfo: {
            type: 'commune_voisine',
            codeCommune: commune.code,
            nomCommune: commune.nom,
            distance: commune.distance,
            nombreParametres: Object.keys(resultVoisine.data).length,
            communePrincipale: codeCommune
          }
        };
      }
    }
    
    console.log('❌ Aucune commune voisine avec des données suffisantes');
    
  } catch (error) {
    console.error('Erreur lors de la recherche géographique:', error);
  }
  
  // 3. Aucune donnée trouvée
  return {
    parametersData: result.data,
    sourceInfo: {
      type: 'aucune_donnee',
      codeCommune: codeCommune,
      nomCommune: result.nomCommune || `Commune ${codeCommune}`,
      distance: 0,
      nombreParametres: Object.keys(result.data).length,
      tentatives: 'Recherche étendue effectuée sans succès'
    }
  };
}

async function fetchHubeauForCommune(codeCommune) {
  const url = `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${codeCommune}&size=100&sort=desc`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const parametersData = {};
    let nomCommune = null;
    
    if (data.data && data.data.length > 0) {
      nomCommune = data.data[0].nom_commune || `Commune ${codeCommune}`;
      
      data.data.forEach(result => {
        const paramCode = result.code_parametre;
        if (!parametersData[paramCode]) {
          parametersData[paramCode] = {
            name: result.libelle_parametre,
            unit: result.unite,
            values: [],
            latestValue: null,
            latestDate: null
          };
        }
        
        parametersData[paramCode].values.push({
          numeric: result.resultat_numerique,
          alphanumeric: result.resultat_alphanumerique,
          date: result.date_prelevement
        });
        
        if (!parametersData[paramCode].latestDate || 
            new Date(result.date_prelevement) > new Date(parametersData[paramCode].latestDate)) {
          parametersData[paramCode].latestValue = {
            numeric: result.resultat_numerique,
            alphanumeric: result.resultat_alphanumerique
          };
          parametersData[paramCode].latestDate = result.date_prelevement;
        }
      });
    }
    
    return {
      data: parametersData,
      nomCommune: nomCommune
    };
    
  } catch (error) {
    console.error(`Erreur API Hubeau pour ${codeCommune}:`, error);
    return { data: {}, nomCommune: null };
  }
}

async function findNearbyCommunes(lat, lon, rayonKm) {
  try {
    const url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&distance=${rayonKm * 1000}&fields=nom,code,centre&format=json&geometry=centre`;
    
    const response = await fetch(url);
    const communes = await response.json();
    
    if (!Array.isArray(communes)) {
      return [];
    }
    
    const communesAvecDistance = communes
      .filter(commune => commune.code)
      .map(commune => {
        const distance = calculateDistance(
          lat, lon,
          commune.centre.coordinates[1],
          commune.centre.coordinates[0]
        );
        
        return {
          code: commune.code,
          nom: commune.nom,
          distance: distance,
          coordonnees: commune.centre.coordinates
        };
      })
      .filter(commune => commune.distance > 0.1)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
    
    return communesAvecDistance;
    
  } catch (error) {
    console.error('Erreur lors de la recherche de communes voisines:', error);
    return [];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ===== FONCTION DE DEBUG =====

function debugHubeauData(parametersData) {
  console.log('=== DEBUG DONNÉES HUBEAU v5.3 ===');
  console.log('Nombre total de paramètres:', Object.keys(parametersData).length);
  
  // Afficher tous les codes reçus
  console.log('Codes paramètres reçus:', Object.keys(parametersData));
  
  // Détailler chaque paramètre
  Object.entries(parametersData).forEach(([code, param]) => {
    console.log(`Code ${code}:`, {
      nom: param.name,
      unite: param.unit,
      valeur: param.latestValue,
      date: param.latestDate
    });
  });
  
  // Vérifier le mapping avec PARAMETRES_SEUIL_MAX
  console.log('=== MAPPING AVEC PARAMETRES_SEUIL_MAX ===');
  Object.keys(PARAMETRES_SEUIL_MAX).forEach(code => {
    if (parametersData[code]) {
      console.log(`✅ ${code} (${PARAMETRES_SEUIL_MAX[code].nom}) - TROUVÉ`);
    } else {
      console.log(`❌ ${code} (${PARAMETRES_SEUIL_MAX[code].nom}) - MANQUANT`);
    }
  });
  
  // Vérifier le mapping avec PARAMETRES_OPTIMAL_CENTRAL
  console.log('=== MAPPING AVEC PARAMETRES_OPTIMAL_CENTRAL ===');
  Object.keys(PARAMETRES_OPTIMAL_CENTRAL).forEach(code => {
    if (parametersData[code]) {
      console.log(`✅ ${code} (${PARAMETRES_OPTIMAL_CENTRAL[code].nom}) - TROUVÉ`);
    } else {
      console.log(`❌ ${code} (${PARAMETRES_OPTIMAL_CENTRAL[code].nom}) - MANQUANT`);
    }
  });
  
  // Paramètres dans Hubeau mais pas dans nos barèmes
  console.log('=== PARAMÈTRES HUBEAU NON MAPPÉS ===');
  Object.keys(parametersData).forEach(code => {
    if (!PARAMETRES_SEUIL_MAX[code] && !PARAMETRES_OPTIMAL_CENTRAL[code]) {
      console.log(`🆕 ${code}: ${parametersData[code].name} (${parametersData[code].unit})`);
    }
  });
  
  return parametersData;
}

// ===== NOUVELLES FONCTIONS AFFICHAGE v5.3 =====

/**
 * Formate l'affichage d'une valeur avec son unité
 */
function formaterValeurParametre(valeur, unite, nom) {
  // Cas spéciaux pour les paramètres microbiologiques
  const parametresMicrobiologiques = [
    'E. coli', 'E. coli (MF)', 'Entérocoques', 'Entérocoques (MS)',
    'Bactéries coliformes', 'Bactéries sulfito-réductrices', 'Bactéries aérobies 22°C'
  ];
  
  // Si c'est un paramètre microbiologique et valeur = 0
  if (parametresMicrobiologiques.some(p => nom.includes(p)) && valeur === 0) {
    return {
      valeur: 'Non détecté',
      unite: '',
      interpretation: 'Aucune contamination détectée'
    };
  }
  
  // Gestion des unités manquantes
  let uniteAffichee = unite;
  if (!unite || unite === 'undefined' || unite === 'null') {
    // Deviner l'unité selon le paramètre
    if (nom.includes('pH')) {
      uniteAffichee = 'unités pH';
    } else if (nom.includes('Conductivité')) {
      uniteAffichee = 'µS/cm';
    } else if (nom.includes('Température')) {
      uniteAffichee = '°C';
    } else if (parametresMicrobiologiques.some(p => nom.includes(p))) {
      uniteAffichee = 'bactéries/100mL';
    } else {
      uniteAffichee = '';
    }
  }
  
  // Formatage de la valeur
  let valeurAffichee = valeur;
  if (typeof valeur === 'number') {
    if (valeur === 0 && parametresMicrobiologiques.some(p => nom.includes(p))) {
      valeurAffichee = 'Non détecté';
      uniteAffichee = '';
    } else if (valeur < 0.01 && valeur > 0) {
      valeurAffichee = '< 0.01';
    } else if (valeur >= 1000) {
      valeurAffichee = (valeur / 1000).toFixed(1) + 'k';
    } else if (valeur >= 1) {
      valeurAffichee = valeur.toFixed(2);
    } else {
      valeurAffichee = valeur.toFixed(3);
    }
  }
  
  return {
    valeur: valeurAffichee,
    unite: uniteAffichee,
    interpretation: getInterpretation(valeur, nom)
  };
}

/**
 * Donne une interprétation simple de la valeur
 */
function getInterpretation(valeur, nom) {
  const parametresMicrobiologiques = [
    'E. coli', 'E. coli (MF)', 'Entérocoques', 'Entérocoques (MS)',
    'Bactéries coliformes', 'Bactéries sulfito-réductrices'
  ];
  
  if (parametresMicrobiologiques.some(p => nom.includes(p))) {
    if (valeur === 0) {
      return 'Aucune contamination - Excellent';
    } else if (valeur <= 1) {
      return 'Contamination très faible';
    } else if (valeur <= 10) {
      return 'Contamination modérée - Surveillance recommandée';
    } else {
      return 'Contamination importante - Action requise';
    }
  }
  
  if (nom.includes('pH')) {
    if (valeur >= 6.5 && valeur <= 8.5) {
      return 'pH optimal pour la consommation';
    } else if (valeur < 6.5) {
      return 'Eau légèrement acide';
    } else {
      return 'Eau légèrement basique';
    }
  }
  
  if (nom.includes('Nitrates')) {
    if (valeur <= 25) {
      return 'Niveau acceptable';
    } else if (valeur <= 40) {
      return 'Niveau élevé - surveillance';
    } else {
      return 'Niveau préoccupant';
    }
  }
  
  return 'Valeur dans les normes';
}

/**
 * Génère un badge de qualité coloré
 */
function genererBadgeQualite(score) {
  let couleur, texte, emoji;
  
  if (score >= 90) {
    couleur = '#28a745'; texte = 'Excellent'; emoji = '🟢';
  } else if (score >= 75) {
    couleur = '#28a745'; texte = 'Très bon'; emoji = '🟢';
  } else if (score >= 60) {
    couleur = '#ffc107'; texte = 'Bon'; emoji = '🟡';
  } else if (score >= 40) {
    couleur = '#fd7e14'; texte = 'Moyen'; emoji = '🟠';
  } else {
    couleur = '#dc3545'; texte = 'Faible'; emoji = '🔴';
  }
  
  return {
    couleur,
    texte,
    emoji,
    html: `<span style="background: ${couleur}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600;">${emoji} ${texte}</span>`
  };
}

// ===== NOUVELLES FONCTIONS SCIENTIFIQUES v5.3 =====

/**
 * Calcule le score d'un paramètre avec seuil maximal
 */
function calculerScoreSeuilMax(valeur, config) {
  if (valeur <= config.valeur_ideale) {
    return 100;
  }
  
  if (valeur >= config.valeur_max) {
    return 0;
  }
  
  const ratio = (valeur - config.valeur_ideale) / (config.valeur_max - config.valeur_ideale);
  const score = 100 - 100 * Math.pow(ratio, config.alpha);
  
  return Math.max(0, score);
}

/**
 * Calcule le score d'un paramètre avec valeur optimale centrale
 */
function calculerScoreOptimalCentral(valeur, config) {
  const ecart = Math.abs(valeur - config.valeur_ideale);
  const score = 100 - config.beta * Math.pow(ecart, config.gamma);
  
  return Math.max(0, score);
}

/**
 * Calcule le score d'un paramètre individuel
 */
function calculerScoreParametre(parametre, parametersData) {
  // Chercher la valeur dans les données Hubeau
  const valeurParam = getParameterValue(parametersData, parametre.codes);
  
  if (valeurParam === null) {
    // Paramètre non testé = bénéfice du doute 50%
    return {
      score: 50,
      teste: false,
      valeur: null,
      unite: null,
      date: null,
      source: 'bénéfice du doute'
    };
  }
  
  // Paramètre testé = calcul selon le type
  let score = 50; // Valeur par défaut
  
  if (parametre.type === 'seuil_max') {
    score = calculerScoreSeuilMax(valeurParam.value, parametre.config);
  } else if (parametre.type === 'optimal_central') {
    score = calculerScoreOptimalCentral(valeurParam.value, parametre.config);
  } else if (parametre.type === 'qualitatif') {
    // Pour les paramètres qualitatifs (couleur, odeur, etc.)
    score = 80; // Score par défaut pour "acceptable"
  }
  
  return {
    score: Math.round(score),
    teste: true,
    valeur: valeurParam.value,
    unite: valeurParam.unit,
    date: valeurParam.date,
    source: 'testé'
  };
}

/**
 * Calcule le score d'une catégorie COMPLÈTE (tous les paramètres)
 */
function calculerScoreCategorieComplete(categorie, parametersData) {
  console.log(`=== CALCUL COMPLET CATÉGORIE: ${categorie} ===`);
  
  const parametres = getParametresParCategorie(categorie);
  
  if (parametres.length === 0) {
    return {
      score: 50,
      teste: false,
      details: [],
      parametres_testes: 0,
      parametres_totaux: 0
    };
  }
  
  let scores = [];
  let details = [];
  let parametres_testes = 0;
  
  parametres.forEach(parametre => {
    const resultat = calculerScoreParametre(parametre, parametersData);
    
    scores.push(resultat.score);
    details.push({
      nom: parametre.nom,
      score: resultat.score,
      teste: resultat.teste,
      valeur: resultat.valeur,
      unite: resultat.unite,
      date: resultat.date,
      impact: parametre.impact,
      gravite: parametre.gravite,
      norme: parametre.norme,
      source: resultat.source
    });
    
    if (resultat.teste) {
      parametres_testes++;
    }
    
    console.log(`${parametre.nom}: ${resultat.score}/100 (${resultat.source})`);
  });
  
  // Moyenne de TOUS les paramètres (testés + non testés à 50%)
  const scoreMoyen = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  console.log(`Score final ${categorie}: ${scoreMoyen.toFixed(1)}/100 (${parametres_testes}/${parametres.length} testés)`);
  
  return {
    score: scoreMoyen,
    teste: parametres_testes > 0,
    details: details,
    parametres_testes: parametres_testes,
    parametres_totaux: parametres.length
  };
}

/**
 * ALGORITHME PRINCIPAL v5.3 - Calcul équitable avec TOUS les paramètres
 */
function calculateLifeWaterScore(parametersData, options = {}, sourceInfo = null) {
  console.log('=== CALCUL SCORING SCIENTIFIQUE ÉQUITABLE v5.3 ===');
  console.log('Paramètres reçus:', Object.keys(parametersData));
  
  // DEBUG: Ajouter le debug des données
  debugHubeauData(parametersData);
  
  const nombreParametres = Object.keys(parametersData).length;
  
  // ===== CAS CRITIQUE: AUCUNE DONNÉE =====
  if (nombreParametres === 0) {
    console.log('❌ AUCUNE DONNÉE HUBEAU DISPONIBLE');
    return {
      score: 0,
      scorePrecis: 0,
      fiabilite: 0,
      niveauFiabilite: "DONNÉES INSUFFISANTES",
      niveau: 'DONNÉES MANQUANTES',
      emoji: '❌',
      couleur: '#dc3545',
      message: 'Aucune donnée de qualité disponible',
      alertes: [
        '❌ Aucune analyse de qualité d\'eau trouvée',
        '⚠️ Recherche étendue dans les communes voisines sans succès'
      ],
      recommandations: [
        '📞 Contacter votre mairie pour obtenir des analyses récentes',
        '🔬 Faire réaliser une analyse complète par un laboratoire agréé'
      ],
      analyseComplete: {
        disponible: true,
        message: "Pour un score fiable, Life Water peut effectuer des tests complémentaires de votre eau du robinet",
        parametresManquants: Object.keys(PONDERATIONS_CATEGORIES)
      },
      contributions: {},
      detailsParCategorie: {},
      sourceInfo: sourceInfo,
      metadata: {
        dateCalcul: new Date().toISOString(),
        version: '5.3 - Scoring équitable avec affichage amélioré',
        analyseApprofondie: options.analyseApprofondie || false,
        nombreParametres: 0
      }
    };
  }
  
  // ===== CALCUL DES SCORES PAR CATÉGORIE (COMPLET) =====
  let contributions = {};
  let detailsParCategorie = {};
  let scoreFinalPondere = 0;
  let alertes = [];
  let recommandations = [];
  let parametres_testes_total = 0;
  let parametres_totaux_total = 0;
  
  // Pour chaque catégorie
  Object.keys(PONDERATIONS_CATEGORIES).forEach(categorie => {
    const poids = PONDERATIONS_CATEGORIES[categorie];
    const resultCategorie = calculerScoreCategorieComplete(categorie, parametersData);
    
    // Contribution au score final
    const contribution = (poids * resultCategorie.score) / 100;
    scoreFinalPondere += contribution;
    
    contributions[categorie] = {
      points: contribution * 100, // Reconvertir en points sur 100
      score: resultCategorie.score,
      teste: resultCategorie.teste,
      parametres_testes: resultCategorie.parametres_testes,
      parametres_totaux: resultCategorie.parametres_totaux
    };
    
    detailsParCategorie[categorie] = {
      nom: CATEGORIES_COMPLETES[categorie] ? CATEGORIES_COMPLETES[categorie].nom : getNomCategorie(categorie),
      description: CATEGORIES_COMPLETES[categorie] ? CATEGORIES_COMPLETES[categorie].description : 'Description non disponible',
      score: resultCategorie.score,
      ponderation: poids * 100,
      details: resultCategorie.details,
      parametres_testes: resultCategorie.parametres_testes,
      parametres_totaux: resultCategorie.parametres_totaux
    };
    
    // Compteurs globaux pour fiabilité
    parametres_testes_total += resultCategorie.parametres_testes;
    parametres_totaux_total += resultCategorie.parametres_totaux;
    
    // Générer alertes selon le score
    const nom = getNomCategorie(categorie);
    if (resultCategorie.score >= 80) {
      alertes.push(`✅ ${nom}: Excellent (${resultCategorie.score.toFixed(0)}/100) - ${resultCategorie.parametres_testes}/${resultCategorie.parametres_totaux} testés`);
    } else if (resultCategorie.score >= 60) {
      alertes.push(`🟡 ${nom}: Bon (${resultCategorie.score.toFixed(0)}/100) - ${resultCategorie.parametres_testes}/${resultCategorie.parametres_totaux} testés`);
    } else {
      alertes.push(`🟠 ${nom}: Améliorable (${resultCategorie.score.toFixed(0)}/100) - ${resultCategorie.parametres_testes}/${resultCategorie.parametres_totaux} testés`);
    }
  });
  
  // ===== CALCUL DE LA FIABILITÉ PONDÉRÉE =====
  const fiabiliteSimple = (parametres_testes_total / parametres_totaux_total) * 100;
  const fiabilitePonderee = calculerFiabilitePonderee(
    Object.keys(parametersData), 
    Object.keys(parametersData)
  );
  const fiabilite = Math.round(fiabilitePonderee);
  const infoFiabilite = getNiveauFiabilite(fiabilite);
  
  // ===== SCORE FINAL =====
  const scoreFinal = Math.round(scoreFinalPondere * 100);
  
  console.log(`Score final: ${scoreFinal}, Fiabilité: ${fiabilite}% (${parametres_testes_total}/${parametres_totaux_total} paramètres)`);
  
  // ===== DÉTERMINATION DU NIVEAU =====
  let niveau, emoji, couleur, message;
  
  if (scoreFinal >= 85) {
    niveau = 'EXCELLENT'; emoji = '🟢'; couleur = '#28a745'; 
    message = 'Eau de qualité exceptionnelle';
  } else if (scoreFinal >= 75) {
    niveau = 'TRÈS BON'; emoji = '🟢'; couleur = '#28a745'; 
    message = 'Eau de très bonne qualité';
  } else if (scoreFinal >= 65) {
    niveau = 'BON'; emoji = '🟡'; couleur = '#ffc107'; 
    message = 'Eau de qualité satisfaisante';
  } else if (scoreFinal >= 55) {
    niveau = 'CORRECT'; emoji = '🟡'; couleur = '#ffc107'; 
    message = 'Eau correcte, améliorations possibles';
  } else if (scoreFinal >= 45) {
    niveau = 'AMÉLIORABLE'; emoji = '🟠'; couleur = '#fd7e14'; 
    message = 'Eau améliorable, traitement recommandé';
  } else if (scoreFinal >= 35) {
    niveau = 'PRÉOCCUPANT'; emoji = '🟠'; couleur = '#fd7e14'; 
    message = 'Eau nécessitant un traitement prioritaire';
  } else if (scoreFinal >= 20) {
    niveau = 'MAUVAIS'; emoji = '🔴'; couleur = '#dc3545'; 
    message = 'Eau présentant des risques sanitaires';
  } else {
    niveau = 'CRITIQUE'; emoji = '🔴'; couleur = '#dc3545'; 
    message = 'Eau impropre à la consommation';
  }
  
  // ===== RECOMMANDATIONS ADAPTÉES =====
  if (fiabilite >= 80) {
    if (scoreFinal >= 75) {
      recommandations.push('✅ Eau de bonne qualité selon une analyse fiable');
    } else {
      recommandations.push('🌟 Installer un système de filtration adapté pourrait améliorer la qualité');
    }
  } else {
    recommandations.push(`⚠️ Analyse basée à seulement ${fiabilite}% sur des données complètes`);
    recommandations.push('🔬 Des analyses complémentaires amélioreront significativement la précision du score');
  }
  
  if (scoreFinal < 60) {
    recommandations.push('📞 Contacter votre mairie pour signaler les problèmes détectés');
  }
  
  // Ajout info source si commune voisine
  if (sourceInfo && sourceInfo.type === 'commune_voisine') {
    alertes.unshift(`ℹ️ Analyse basée sur les données de ${sourceInfo.nomCommune} (${sourceInfo.distance.toFixed(1)}km)`);
  }
  
  // ===== ANALYSE COMPLÈTE LIFE WATER =====
  const categoriesIncompletes = Object.keys(PONDERATIONS_CATEGORIES).filter(cat => 
    contributions[cat].parametres_testes < contributions[cat].parametres_totaux
  );
  
  const analyseComplete = {
    disponible: true,
    message: `Pour un score ${fiabilite < 80 ? '100% fiable' : 'encore plus précis'}, Life Water peut effectuer des tests complémentaires de votre eau du robinet`,
    parametresManquants: categoriesIncompletes,
    messageConfiance: `Ce score est basé sur ${parametres_testes_total}/${parametres_totaux_total} paramètres testés (${fiabilite}% de fiabilité). ${parametres_totaux_total - parametres_testes_total} paramètres reçoivent le bénéfice du doute à 50/100.`
  };
  
  return {
    score: scoreFinal,
    scorePrecis: scoreFinalPondere * 100,
    fiabilite: fiabilite,
    niveauFiabilite: infoFiabilite.niveau,
    niveau: niveau,
    emoji: emoji,
    couleur: couleur,
    message: message,
    alertes: alertes,
    recommandations: [...new Set(recommandations)],
    contributions: contributions,
    detailsParCategorie: detailsParCategorie,
    analyseComplete: analyseComplete,
    sourceInfo: sourceInfo,
    metadata: {
      dateCalcul: new Date().toISOString(),
      version: '5.3 - Scoring équitable avec affichage amélioré',
      analyseApprofondie: options.analyseApprofondie || false,
      nombreParametres: nombreParametres,
      parametres_testes_total: parametres_testes_total,
      parametres_totaux_total: parametres_totaux_total,
      fiabiliteSimple: Math.round(fiabiliteSimple),
      fiabilitePonderee: fiabilite
    }
  };
}

/**
 * Obtient le nom lisible d'une catégorie
 */
function getNomCategorie(categorie) {
  if (CATEGORIES_COMPLETES[categorie]) {
    return CATEGORIES_COMPLETES[categorie].nom;
  }
  
  // Fallback pour compatibilité
  const noms = {
    microbiologique: '🦠 Microbiologie',
    metauxLourds: '🔗 Métaux lourds', 
    pfas: '🧪 PFAS',
    nitrates: '⚗️ Nitrates',
    pesticides: '🌿 Pesticides',
    organoleptiques: '🌡️ Organoleptiques',
    chimie_generale: '⚖️ Chimie générale',
    medicaments: '🧬 Médicaments',
    microplastiques: '🔬 Microplastiques',
    chlore: '💧 Chlore'
  };
  return noms[categorie] || categorie;
}

// ===== FONCTION TOGGLE POUR ACCORDÉON =====

/**
 * Fonction toggle pour les catégories (accessible globalement)
 */
function toggleCategory(categoryId) {
  const details = document.getElementById('details-' + categoryId);
  const header = details.previousElementSibling;
  
  if (details.style.display === 'none' || details.style.display === '') {
    details.style.display = 'block';
    header.classList.add('expanded');
  } else {
    details.style.display = 'none';
    header.classList.remove('expanded');
  }
}

// ===== GÉNÉRATION HTML MISE À JOUR v5.3 =====

function generateLifeWaterHTML(scoreResult, adresse, parametersData) {
  // ===== CAS SPÉCIAUX =====
  if (scoreResult.score === 0 && scoreResult.fiabilite === 0) {
    return `
      <div class="life-water-report">
        <div class="life-water-header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h2>❌ <strong>Aucune donnée disponible</strong></h2>
          <p>Désolé, nous n'avons trouvé aucune analyse de qualité d'eau pour cette adresse dans la base Hubeau.</p>
          <p>Recherche étendue effectuée dans un rayon de 20km sans succès.</p>
        </div>

        <div class="resultat-principal" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
          <h3>📊 <strong>Résultat de votre recherche</strong></h3>
          <p><strong>Adresse analysée :</strong> ${adresse}</p>
          
          <div class="score-display">
            <div class="score-circle" style="border-color: #dc3545; color: #dc3545;">
              <div class="score-number">❌</div>
              <div class="score-label">Aucune donnée</div>
            </div>
            <div class="score-info">
              <h4 style="color: #dc3545;">❌ DONNÉES MANQUANTES</h4>
              <p class="score-message">Aucune donnée de qualité disponible</p>
            </div>
          </div>
        </div>

        <div class="content-section">
          <div class="recommandations">
            <p><strong>🔍 Que faire maintenant ?</strong></p>
            <ul>
              ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
            </ul>
          </div>

          <div class="complete-analysis-cta">
            <h4>🔬 <strong>Analyse complète Life Water</strong></h4>
            <p>${scoreResult.analyseComplete.message}</p>
            <button onclick="alert('Contactez Life Water pour une analyse personnalisée')" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: 600;">
              🧪 Demander une analyse complète
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== AFFICHAGE NORMAL v5.3 =====
  
  // Barres de contribution par catégorie
  let contributionsHTML = '';
  Object.entries(scoreResult.contributions).forEach(([categorie, contrib]) => {
    const couleurBarre = contrib.score >= 75 ? '#28a745' : contrib.score >= 50 ? '#ffc107' : '#dc3545';
    const details = scoreResult.detailsParCategorie[categorie];
    
    contributionsHTML += `
      <div class="contribution-item">
        <div class="contribution-header">
          <span class="contribution-name">${details.nom}</span>
          <span class="contribution-coverage">${contrib.parametres_testes}/${contrib.parametres_totaux} testés</span>
          <span class="contribution-points">${contrib.points.toFixed(1)} pts</span>
        </div>
        <div class="contribution-bar">
          <div class="contribution-fill" style="width: ${contrib.score}%; background-color: ${couleurBarre};"></div>
        </div>
        <div class="contribution-score">${contrib.score.toFixed(0)}/100</div>
      </div>
    `;
  });

  // Détails par catégorie (accordéon) avec affichage amélioré
  let detailsHTML = '';
  Object.entries(scoreResult.detailsParCategorie).forEach(([categorie, details]) => {
    const parametresTestes = details.details.filter(p => p.teste);
    const parametresNonTestes = details.details.filter(p => !p.teste);
    
    detailsHTML += `
      <div class="category-accordion">
        <div class="category-header" onclick="toggleCategory('${categorie}')">
          <span class="category-title">${details.nom} (${details.score.toFixed(0)}/100)</span>
          <span class="category-coverage">${details.parametres_testes}/${details.parametres_totaux} paramètres</span>
          <span class="expand-icon">▼</span>
        </div>
        <div class="category-details" id="details-${categorie}" style="display: none;">
          <p class="category-description">${details.description}</p>
          
          ${parametresTestes.length > 0 ? `
          <div class="parameters-section">
            <h5>✅ Paramètres testés :</h5>
            ${parametresTestes.map(param => {
              const format = formaterValeurParametre(param.valeur, param.unite, param.nom);
              const badge = genererBadgeQualite(param.score);
              
              return `
                <div class="parameter-item tested improved">
                  <div class="parameter-header">
                    <div class="parameter-title">
                      <strong>${param.nom}</strong>
                      ${badge.html}
                    </div>
                    <span class="parameter-score ${param.score >= 75 ? 'good' : param.score >= 50 ? 'medium' : 'bad'}">${param.score}/100</span>
                  </div>
                  <div class="parameter-details">
                    <div class="parameter-value-section">
                      <span class="parameter-value">${format.valeur} ${format.unite}</span>
                      <span class="parameter-interpretation">${format.interpretation}</span>
                    </div>
                    <div class="parameter-meta">
                      <span class="parameter-impact">💡 ${param.impact}</span>
                      <span class="parameter-norm">📋 ${param.norme}</span>
                      ${param.date ? `<span class="parameter-date">📅 Analysé le ${new Date(param.date).toLocaleDateString('fr-FR')}</span>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          ` : ''}
          
          ${parametresNonTestes.length > 0 ? `
          <div class="parameters-section">
            <h5>⚪ Paramètres non testés (bénéfice du doute 50/100) :</h5>
            ${parametresNonTestes.map(param => `
              <div class="parameter-item untested">
                <div class="parameter-header">
                  <strong>${param.nom}</strong>
                  <span class="parameter-score neutral">50/100</span>
                </div>
                <div class="parameter-details">
                  <span class="parameter-impact">⚠️ Impact: ${param.impact}</span>
                  <span class="parameter-norm">Norme: ${param.norme}</span>
                </div>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  return `
    <div class="life-water-report">
      <!-- En-tête Life Water -->
      <div class="life-water-header">
        <h2>🔬 <strong>Analyse scientifique équitable de la qualité de votre eau</strong></h2>
        <p>Cette analyse vous est offerte par <strong>Life Water</strong>.</p>
        <p>Algorithme scientifique v5.3 avec scoring équitable - TOUS les paramètres importants pris en compte.</p>
        <p><strong>Life Water est un groupe privé de recherche appliquée</strong>, engagé dans l'étude et l'amélioration de la qualité de l'eau destinée à la consommation humaine.</p>
        <hr>
        <p>💡 <strong>Nouveauté v5.3 :</strong> Affichage amélioré avec interprétations claires et badges de qualité.</p>
      </div>

      <!-- Résultat Principal -->
      <div class="resultat-principal">
        <h3>📊 <strong>Résultat de votre analyse équitable</strong></h3>
        <p><strong>Adresse analysée :</strong> ${adresse}</p>
        
        ${scoreResult.sourceInfo && scoreResult.sourceInfo.type === 'commune_voisine' ? `
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0; font-size: 1.1em;"><strong>📍 Point de collecte :</strong> ${scoreResult.sourceInfo.nomCommune} (${scoreResult.sourceInfo.distance.toFixed(1)}km)</p>
          <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.9;">Données de la commune la plus proche utilisées</p>
        </div>
        ` : ''}
        
        <div class="score-display">
          <div class="score-circle" style="border-color: ${scoreResult.couleur}; color: ${scoreResult.couleur};">
            <div class="score-number">${scoreResult.score}</div>
            <div class="score-label">/ 100</div>
          </div>
          <div class="score-info">
            <h4 style="color: ${scoreResult.couleur};">${scoreResult.emoji} ${scoreResult.niveau}</h4>
            <p class="score-message">${scoreResult.message}</p>
            <p class="score-details">${scoreResult.metadata.parametres_testes_total}/${scoreResult.metadata.parametres_totaux_total} paramètres testés</p>
          </div>
        </div>

        <!-- Barre de fiabilité -->
        <div class="fiabilite-section">
          <h4>📊 <strong>Fiabilité de l'analyse (pondérée par criticité)</strong></h4>
          <div class="fiabilite-bar">
            <div class="fiabilite-fill" style="width: ${scoreResult.fiabilite}%; background-color: ${scoreResult.fiabilite >= 80 ? '#28a745' : scoreResult.fiabilite >= 60 ? '#ffc107' : '#dc3545'};"></div>
          </div>
          <div class="fiabilite-info">
            <span class="fiabilite-percentage">${scoreResult.fiabilite}%</span>
            <span class="fiabilite-level">${scoreResult.niveauFiabilite}</span>
          </div>
          <p class="fiabilite-message">${scoreResult.analyseComplete.messageConfiance}</p>
        </div>
      </div>

      <div class="content-section">
        <!-- Contributions détaillées -->
        <div class="contributions-section">
          <h4>🎯 <strong>Détail des contributions au score</strong></h4>
          <div class="contributions-grid">
            ${contributionsHTML}
          </div>
        </div>

        <!-- Détails par catégorie (accordéon) -->
        <div class="details-section">
          <h4>🔍 <strong>Analyse détaillée par catégorie</strong></h4>
          <p>Cliquez sur une catégorie pour voir le détail des paramètres testés et non testés :</p>
          <div class="categories-accordion">
            ${detailsHTML}
          </div>
        </div>

        <!-- Informations détectées -->
        <div class="points-attention">
          <p><strong>📊 Synthèse de l'analyse :</strong></p>
          <ul>
            ${scoreResult.alertes.map(alerte => `<li>${alerte}</li>`).join('')}
          </ul>
        </div>

        <!-- Recommandations -->
        <div class="recommandations">
          <p><strong>💡 Recommandations personnalisées</strong></p>
          <ul>
            ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
          </ul>
        </div>

        <!-- CTA Analyse complète -->
        <div class="complete-analysis-cta">
          <h4>🔬 <strong>Analyse complète Life Water</strong></h4>
          <p>${scoreResult.analyseComplete.message}</p>
          ${scoreResult.analyseComplete.parametresManquants.length > 0 ? `
          <p><strong>Catégories nécessitant des tests complémentaires :</strong> ${scoreResult.analyseComplete.parametresManquants.map(p => getNomCategorie(p)).join(', ')}</p>
          ` : ''}
          <button onclick="alert('Contactez Life Water pour une analyse 100% complète')" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 1.1em;">
            🧪 Demander une analyse 100% fiable
          </button>
        </div>

        <!-- Footer -->
        <div class="footer-life-water">
          <h4>📅 <strong>Informations sur cette analyse</strong></h4>
          
          <p><strong>📊 Méthodologie :</strong> Algorithme scientifique v${scoreResult.metadata.version}</p>
          <p><strong>🎯 Paramètres analysés :</strong> ${scoreResult.metadata.parametres_testes_total}/${scoreResult.metadata.parametres_totaux_total}</p>
          <p><strong>📍 Source :</strong> ${scoreResult.sourceInfo ? scoreResult.sourceInfo.nomCommune : 'Données Hubeau'}</p>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>📋 Normes utilisées :</strong> UE Directive 2020/2184, OMS Guidelines 2022, Code de la santé publique français. Principe : aucun paramètre ajouté sans norme officielle reconnue.</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>🧮 Scoring équitable v5.3 :</strong> TOUS les paramètres importants sont pris en compte. Les paramètres non testés reçoivent un score neutre de 50/100 (bénéfice du doute), garantissant une évaluation juste qui ne masque pas les analyses manquantes importantes.</p>
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 20px 0;">
            <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 500;">🔄 Nouvelle analyse</button>
            <button onclick="window.print()" style="background: #ffc107; color: #333; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 500;">🖨️ Imprimer</button>
          </div>
          
          <p style="font-size: 0.9em; color: #666; margin: 10px 0;">
            <strong>Life Water</strong> - Analyse générée le ${new Date().toLocaleDateString('fr-FR')}<br>
            Version ${scoreResult.metadata.version}
          </p>
        </div>
      </div>
    </div>

    <style>
      /* Styles spécifiques v5.3 */
      .score-details {
        font-size: 0.9em;
        opacity: 0.9;
        margin: 5px 0 0 0;
      }
      
      .contribution-coverage {
        font-size: 0.8em;
        color: #666;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 10px;
      }
      
      .fiabilite-section {
        background: rgba(255,255,255,0.1);
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
      }
      
      .fiabilite-bar {
        width: 100%;
        height: 20px;
        background: rgba(255,255,255,0.3);
        border-radius: 10px;
        overflow: hidden;
        margin: 10px 0;
      }
      
      .fiabilite-fill {
        height: 100%;
        transition: width 1s ease;
      }
      
      .fiabilite-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 10px 0;
      }
      
      .fiabilite-percentage {
        font-size: 1.2em;
        font-weight: 600;
      }
      
      .fiabilite-message {
        font-size: 0.9em;
        opacity: 0.9;
        margin: 5px 0 0 0;
      }
      
      .contributions-grid {
        display: grid;
        gap: 15px;
        margin: 20px 0;
      }
      
      .contribution-item {
        background: white;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
      }
      
      .contribution-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .contribution-name {
        font-weight: 600;
        flex: 1;
      }
      
      .contribution-points {
        font-weight: 600;
        color: #667eea;
      }
      
      .contribution-bar {
        width: 100%;
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin: 5px 0;
      }
      
      .contribution-fill {
        height: 100%;
        transition: width 1s ease;
      }
      
      .contribution-score {
        text-align: center;
        font-size: 0.9em;
        color: #666;
      }
      
      /* Accordéon par catégorie */
      .category-accordion {
        border: 1px solid #ddd;
        border-radius: 8px;
        margin: 10px 0;
        overflow: hidden;
      }
      
      .category-header {
        background: #f8f9fa;
        padding: 15px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background-color 0.2s ease;
      }
      
      .category-header:hover {
        background: #e9ecef;
      }
      
      .category-title {
        font-weight: 600;
        font-size: 1.1em;
      }
      
      .category-coverage {
        font-size: 0.9em;
        color: #666;
        background: white;
        padding: 4px 8px;
        border-radius: 12px;
      }
      
      .expand-icon {
        transition: transform 0.2s ease;
      }
      
      .category-header.expanded .expand-icon {
        transform: rotate(180deg);
      }
      
      .category-details {
        padding: 20px;
        background: white;
        border-top: 1px solid #eee;
      }
      
      .category-description {
        font-style: italic;
        color: #666;
        margin-bottom: 15px;
      }
      
      .parameters-section {
        margin: 20px 0;
      }
      
      .parameters-section h5 {
        margin: 0 0 10px 0;
        font-size: 1em;
        color: #333;
      }
      
      .parameter-item {
        background: #f8f9fa;
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        border-left: 4px solid #ddd;
      }
      
      .parameter-item.tested {
        border-left-color: #28a745;
      }
      
      .parameter-item.untested {
        border-left-color: #6c757d;
      }
      
      .parameter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .parameter-score {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9em;
        font-weight: 600;
      }
      
      .parameter-score.good {
        background: #d4edda;
        color: #155724;
      }
      
      .parameter-score.medium {
        background: #fff3cd;
        color: #856404;
      }
      
      .parameter-score.bad {
        background: #f8d7da;
        color: #721c24;
      }
      
      .parameter-score.neutral {
        background: #e2e3e5;
        color: #495057;
      }
      
      .parameter-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.9em;
      }
      
      .parameter-value {
        font-weight: 600;
        color: #495057;
      }
      
      .parameter-impact {
        color: #666;
      }
      
      .parameter-norm {
        color: #007bff;
        font-size: 0.8em;
      }
      
      /* ===== STYLES AMÉLIORÉS v5.3 ===== */
      .parameter-item.improved {
        background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
        border: 1px solid #e9ecef;
        border-radius: 10px;
        padding: 16px;
        margin: 12px 0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        transition: all 0.2s ease;
      }

      .parameter-item.improved:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        transform: translateY(-1px);
      }

      .parameter-title {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      }

      .parameter-value-section {
        background: #f1f3f4;
        padding: 10px;
        border-radius: 6px;
        margin: 8px 0;
      }

      .parameter-value {
        font-weight: 700;
        color: #2c3e50;
        font-size: 1.1em;
        display: block;
      }

      .parameter-interpretation {
        color: #7f8c8d;
        font-size: 0.9em;
        font-style: italic;
        display: block;
        margin-top: 4px;
      }

      .parameter-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.85em;
      }

      .parameter-impact {
        color: #e74c3c;
      }

      .parameter-norm {
        color: #3498db;
      }

      .parameter-date {
        color: #95a5a6;
      }
      
      .complete-analysis-cta {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        margin: 30px 0;
      }
      
      .complete-analysis-cta h4 {
        margin: 0 0 15px 0;
        font-size: 1.5em;
      }
      
      .complete-analysis-cta p {
        margin: 10px 0;
        opacity: 0.95;
      }
      
      .complete-analysis-cta button:hover {
        background: #5a67d8 !important;
        transform: translateY(-2px);
        transition: all 0.3s ease;
      }
      
      /* Responsive */
      @media screen and (max-width: 749px) {
        .category-header {
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }
        
        .parameter-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        
        .parameter-details {
          font-size: 0.8em;
        }
        
        .parameter-title {
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }
        
        .parameter-meta {
          font-size: 0.8em;
        }
      }
    </style>
  `;
}

// ===== EXPORT GLOBAL =====
if (typeof window !== 'undefined') {
  window.formaterValeurParametre = formaterValeurParametre;
  window.getInterpretation = getInterpretation;
  window.genererBadgeQualite = genererBadgeQualite;
  window.calculateLifeWaterScore = calculateLifeWaterScore;
  window.generateLifeWaterHTML = generateLifeWaterHTML;
  window.fetchHubeauDataWithFallback = fetchHubeauDataWithFallback;
  window.calculerScoreSeuilMax = calculerScoreSeuilMax;
  window.calculerScoreOptimalCentral = calculerScoreOptimalCentral;
  window.calculerScoreParametre = calculerScoreParametre;
  window.calculerScoreCategorieComplete = calculerScoreCategorieComplete;
  window.getNomCategorie = getNomCategorie;
  window.debugHubeauData = debugHubeauData;
  window.toggleCategory = toggleCategory;
}

console.log('✅ Scoring Eau v5.3 - Algorithme Scientifique Équitable avec affichage amélioré chargé');
