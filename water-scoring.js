/**
 * =============================================================================
 * WATER SCORING - VERSION RECHERCHE GÉOGRAPHIQUE ÉTENDUE - CORRECTIFS
 * =============================================================================
 * Recherche automatique dans les communes voisines si pas de données
 * Version 4.4 - Fallback Géographique - SCORING ÉQUILIBRÉ
 * =============================================================================
 */

// ===== FONCTIONS UTILITAIRES (identiques) =====

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

function checkParametersExist(parametersData, codes) {
  return codes.some(code => parametersData[code] && parametersData[code].latestValue);
}

// ===== NOUVELLES FONCTIONS GÉOGRAPHIQUES =====

/**
 * Recherche étendue de données dans les communes voisines
 * @param {string} codeCommune - Code INSEE de la commune principale
 * @param {number} lat - Latitude de l'adresse
 * @param {number} lon - Longitude de l'adresse
 * @param {number} rayonKm - Rayon de recherche en kilomètres
 * @returns {Object} Données trouvées avec informations sur la source
 */
async function fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm = 20) {
  console.log('=== RECHERCHE HUBEAU AVEC FALLBACK GÉOGRAPHIQUE ===');
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
    // Recherche des communes dans un rayon donné
    const communesVoisines = await findNearbyCommunes(lat, lon, rayonKm);
    console.log(`Communes voisines trouvées: ${communesVoisines.length}`);
    
    // Test de chaque commune voisine
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
  
  // 3. Aucune donnée trouvée même avec fallback
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

/**
 * Récupère les données Hubeau pour une commune spécifique
 */
async function fetchHubeauForCommune(codeCommune) {
  const url = `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${codeCommune}&size=100&sort=desc`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const parametersData = {};
    let nomCommune = null;
    
    if (data.data && data.data.length > 0) {
      // Récupérer le nom de la commune depuis les données
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

/**
 * Trouve les communes voisines dans un rayon donné
 */
async function findNearbyCommunes(lat, lon, rayonKm) {
  try {
    // Utilisation de l'API Géo pour trouver les communes voisines
    const url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&distance=${rayonKm * 1000}&fields=nom,code,centre&format=json&geometry=centre`;
    
    const response = await fetch(url);
    const communes = await response.json();
    
    if (!Array.isArray(communes)) {
      return [];
    }
    
    // Calculer les distances et trier par proximité
    const communesAvecDistance = communes
      .filter(commune => commune.code) // Exclure les communes sans code
      .map(commune => {
        const distance = calculateDistance(
          lat, lon,
          commune.centre.coordinates[1], // latitude
          commune.centre.coordinates[0]  // longitude
        );
        
        return {
          code: commune.code,
          nom: commune.nom,
          distance: distance,
          coordonnees: commune.centre.coordinates
        };
      })
      .filter(commune => commune.distance > 0.1) // Exclure la commune elle-même
      .sort((a, b) => a.distance - b.distance) // Trier par distance croissante
      .slice(0, 10); // Limiter à 10 communes pour éviter trop d'appels API
    
    return communesAvecDistance;
    
  } catch (error) {
    console.error('Erreur lors de la recherche de communes voisines:', error);
    return [];
  }
}

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en kilomètres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ===== ALGORITHME DE SCORING ÉQUILIBRÉ =====

function calculateWaterQualityScore(parametersData, options = {}, sourceInfo = null) {
  console.log('=== CALCUL SCORING ÉQUILIBRÉ AVEC INFO SOURCE ===');
  console.log('Paramètres reçus:', Object.keys(parametersData));
  console.log('Source info:', sourceInfo);
  
  const nombreParametres = Object.keys(parametersData).length;
  
  // ===== CAS SPÉCIAUX SANS DONNÉES =====
  if (nombreParametres === 0) {
    console.log('❌ AUCUNE DONNÉE HUBEAU DISPONIBLE');
    return {
      score: 0,
      scorePrecis: 0,
      niveau: 'DONNÉES MANQUANTES',
      emoji: '❌',
      couleur: '#dc3545',
      message: 'Aucune donnée de qualité disponible',
      alertes: [
        '❌ Aucune analyse de qualité d\'eau trouvée dans la base Hubeau',
        '⚠️ Recherche étendue dans les communes voisines sans succès',
        'ℹ️ Contacter votre mairie pour connaître la qualité de l\'eau'
      ],
      recommandations: [
        '📞 Contacter votre mairie pour obtenir des analyses récentes',
        '🔬 Faire réaliser une analyse complète par un laboratoire agréé',
        '🚰 En cas de doute, utiliser une eau en bouteille temporairement'
      ],
      parametresManquants: [
        'Toutes les analyses de qualité d\'eau',
        'Analyses microbiologiques',
        'Métaux lourds',
        'Nitrates/Nitrites',
        'PFAS (polluants éternels)',
        'Microplastiques',
        'Pesticides',
        'Résidus médicamenteux'
      ],
      details: {
        scores: {
          microbiologique: 0, organoleptiques: 0, metauxLourds: 0,
          pfas: 0, nitrates: 0, microplastiques: 0,
          pesticides: 0, medicaments: 0, autres: 0
        },
        ponderation: {
          microbiologique: 0.20, metauxLourds: 0.15, nitrates: 0.12,
          organoleptiques: 0.12, pfas: 0.12, pesticides: 0.10,
          microplastiques: 0.10, medicaments: 0.09, autres: 0.05
        },
        scorePondere: 0, penalites: 0, declassements: true,
        scoreMaxFinal: 0, aucuneDonnee: true
      },
      sourceInfo: sourceInfo,
      metadata: {
        dateCalcul: new Date().toISOString(),
        version: '4.4 - Scoring Équilibré',
        analyseApprofondie: options.analyseApprofondie || false,
        nombreParametres: 0
      }
    };
  }
  
  // ===== DONNÉES INSUFFISANTES (SEUIL RÉDUIT) =====
  if (nombreParametres < 3) {
    console.log('⚠️ DONNÉES INSUFFISANTES POUR UNE ANALYSE FIABLE');
    
    // Score plus généreux pour données insuffisantes
    let scorePartiel = 40; // Base plus haute
    
    // Bonus si au moins quelques paramètres de base
    const ph = getParameterValue(parametersData, ['1302', 'PH']);
    const conductivite = getParameterValue(parametersData, ['1303', 'CDT25']);
    const nitrates = getParameterValue(parametersData, ['1340', 'NO3']);
    
    if (ph && ph.value >= 6.5 && ph.value <= 9.0) scorePartiel += 10;
    if (conductivite && conductivite.value <= 1200) scorePartiel += 10;
    if (nitrates && nitrates.value <= 50) scorePartiel += 10;
    
    return {
      score: Math.min(scorePartiel, 70), // Plafond à 70 pour données insuffisantes
      scorePrecis: scorePartiel,
      niveau: 'DONNÉES INSUFFISANTES',
      emoji: '⚠️',
      couleur: '#fd7e14',
      message: 'Données insuffisantes pour une analyse fiable',
      alertes: [
        `⚠️ Seulement ${nombreParametres} paramètres trouvés`,
        '📊 Une analyse fiable nécessite au minimum 5-10 paramètres',
        sourceInfo && sourceInfo.type === 'commune_voisine' ? 
          `ℹ️ Données provenant de ${sourceInfo.nomCommune} à ${sourceInfo.distance.toFixed(1)}km` :
          'ℹ️ Les résultats sont donc très approximatifs'
      ],
      recommandations: [
        '📞 Contacter votre mairie pour obtenir des analyses plus complètes',
        '🔬 Faire réaliser une analyse par un laboratoire agréé',
        '⚠️ Ne pas se fier uniquement à ce score partiel'
      ],
      parametresManquants: [
        'Analyses microbiologiques (probablement)',
        'Métaux lourds (probablement)',
        'PFAS (polluants éternels)',
        'Microplastiques', 'Pesticides', 'Résidus médicamenteux'
      ],
      details: {
        scores: {
          microbiologique: 0, organoleptiques: 0, metauxLourds: 0,
          pfas: 0, nitrates: 0, microplastiques: 0,
          pesticides: 0, medicaments: 0, autres: 0
        },
        ponderation: {
          microbiologique: 0.20, metauxLourds: 0.15, nitrates: 0.12,
          organoleptiques: 0.12, pfas: 0.12, pesticides: 0.10,
          microplastiques: 0.10, medicaments: 0.09, autres: 0.05
        },
        scorePondere: scorePartiel, penalites: 0, declassements: true,
        scoreMaxFinal: Math.min(scorePartiel, 70), donneesInsuffisantes: true
      },
      sourceInfo: sourceInfo,
      metadata: {
        dateCalcul: new Date().toISOString(),
        version: '4.4 - Scoring Équilibré',
        analyseApprofondie: options.analyseApprofondie || false,
        nombreParametres: nombreParametres
      }
    };
  }
  
  // ===== CALCUL NORMAL AVEC SCORING ÉQUILIBRÉ =====
  console.log(`✅ Données suffisantes (${nombreParametres} paramètres) - Calcul équilibré`);
  
  let scores = {
    microbiologique: 80, // Valeur par défaut plus optimiste
    organoleptiques: 80, 
    metauxLourds: 80,
    pfas: 70, // Pénalité modérée pour absence
    nitrates: 80, 
    microplastiques: 70,
    pesticides: 70, 
    medicaments: 70, 
    autres: 80
  };
  
  let declassements = false;
  let scoreMaxFinal = 100;
  let alertes = [];
  let recommandations = [];
  let parametresManquants = [];
  
  // Ajout info source dans les alertes si données d'une commune voisine
  if (sourceInfo && sourceInfo.type === 'commune_voisine') {
    alertes.push(`ℹ️ Analyse basée sur les données de ${sourceInfo.nomCommune} (${sourceInfo.distance.toFixed(1)}km)`);
  }
  
  // ===== 1. MICROBIOLOGIE (CRITIQUE) =====
  let microbiologieTestee = false;
  
  const ecoli = getParameterValue(parametersData, ['1506', 'ECOLI']);
  if (ecoli !== null) {
    microbiologieTestee = true;
    if (ecoli.value > 0) {
      scores.microbiologique = 0; // Zéro absolu
      declassements = true;
      scoreMaxFinal = 30; // Très sévère
      alertes.push(`❌ CRITIQUE: E. coli détecté: ${ecoli.value} ${ecoli.unit || 'n/100mL'}`);
      recommandations.push('🚨 URGENT: Ne pas consommer l\'eau - Contacter immédiatement votre mairie');
    } else {
      scores.microbiologique = 100;
      alertes.push(`✅ E. coli: Non détecté`);
    }
  }
  
  const entero = getParameterValue(parametersData, ['1507', 'STRF']);
  if (entero !== null) {
    microbiologieTestee = true;
    if (entero.value > 0) {
      scores.microbiologique = Math.min(scores.microbiologique, 20);
      declassements = true;
      scoreMaxFinal = Math.min(scoreMaxFinal, 40);
      alertes.push(`❌ ATTENTION: Entérocoques détectés: ${entero.value} ${entero.unit || 'n/100mL'}`);
    } else {
      alertes.push(`✅ Entérocoques: Non détectés`);
    }
  }
  
  if (!microbiologieTestee) {
    scores.microbiologique = 60; // Pénalité modérée pour absence
    parametresManquants.push('Analyses microbiologiques');
    alertes.push('⚠️ Analyses microbiologiques manquantes');
  }
  
  // ===== 2. ORGANOLEPTIQUE =====
  let organoleptiqueTeste = false;
  let scoreOrganoMoyen = 0;
  let compteOrgano = 0;
  
  const ph = getParameterValue(parametersData, ['1302', 'PH']);
  if (ph !== null) {
    organoleptiqueTeste = true;
    let scorePh = 100;
    if (ph.value >= 7.0 && ph.value <= 7.5) {
      scorePh = 100;
      alertes.push(`✅ pH: ${ph.value} (optimal)`);
    } else if (ph.value >= 6.5 && ph.value <= 9.0) {
      scorePh = 90; // Plus généreux
      alertes.push(`🟡 pH: ${ph.value} (acceptable)`);
    } else {
      scorePh = 60; // Moins sévère
      alertes.push(`🟠 pH: ${ph.value} (hors limites recommandées)`);
    }
    scoreOrganoMoyen += scorePh;
    compteOrgano++;
  }
  
  const conductivite = getParameterValue(parametersData, ['1303', 'CDT25']);
  if (conductivite !== null) {
    organoleptiqueTeste = true;
    let scoreConductivite = 100;
    if (conductivite.value >= 200 && conductivite.value <= 800) {
      scoreConductivite = 100;
      alertes.push(`✅ Conductivité: ${conductivite.value} ${conductivite.unit || 'µS/cm'} (excellente)`);
    } else if (conductivite.value >= 100 && conductivite.value <= 1200) {
      scoreConductivite = 85; // Plus tolérant
      alertes.push(`🟡 Conductivité: ${conductivite.value} ${conductivite.unit || 'µS/cm'} (acceptable)`);
    } else {
      scoreConductivite = 65; // Moins pénalisant
      alertes.push(`🟠 Conductivité: ${conductivite.value} ${conductivite.unit || 'µS/cm'} (élevée)`);
    }
    scoreOrganoMoyen += scoreConductivite;
    compteOrgano++;
  }
  
  const turbidite = getParameterValue(parametersData, ['1304', 'TURBNFU']);
  if (turbidite !== null) {
    organoleptiqueTeste = true;
    let scoreTurbidite = 100;
    if (turbidite.value < 0.5) {
      scoreTurbidite = 100;
    } else if (turbidite.value <= 2) {
      scoreTurbidite = 85; // Plus généreux
    } else {
      scoreTurbidite = 65; // Moins sévère
    }
    alertes.push(`${scoreTurbidite >= 85 ? '✅' : '🟡'} Turbidité: ${turbidite.value} ${turbidite.unit || 'NFU'}`);
    scoreOrganoMoyen += scoreTurbidite;
    compteOrgano++;
  }
  
  if (organoleptiqueTeste && compteOrgano > 0) {
    scores.organoleptiques = scoreOrganoMoyen / compteOrgano;
  } else {
    scores.organoleptiques = 75; // Valeur par défaut optimiste
    parametresManquants.push('Paramètres organoleptiques');
  }
  
  // ===== 3. MÉTAUX LOURDS =====
  let metauxTestes = false;
  let scoreMetauxMoyen = 0;
  let compteMetaux = 0;
  
  const arsenic = getParameterValue(parametersData, ['1369', 'AS']);
  if (arsenic !== null) {
    metauxTestes = true;
    let scoreArsenic = Math.max(30, 100 - (arsenic.value / 10) * 80); // Moins pénalisant
    alertes.push(`${scoreArsenic >= 80 ? '✅' : '🟡'} Arsenic: ${arsenic.value} ${arsenic.unit || 'µg/L'}`);
    scoreMetauxMoyen += scoreArsenic;
    compteMetaux++;
  }
  
  const plomb = getParameterValue(parametersData, ['1382', 'PB']);
  if (plomb !== null) {
    metauxTestes = true;
    let scorePlomb = Math.max(30, 100 - (plomb.value / 10) * 80); // Moins pénalisant
    alertes.push(`${scorePlomb >= 80 ? '✅' : '🟡'} Plomb: ${plomb.value} ${plomb.unit || 'µg/L'}`);
    scoreMetauxMoyen += scorePlomb;
    compteMetaux++;
  }
  
  const cadmium = getParameterValue(parametersData, ['1388', 'CD']);
  if (cadmium !== null) {
    metauxTestes = true;
    let scoreCadmium = Math.max(40, 100 - (cadmium.value / 5) * 80); // Moins pénalisant
    alertes.push(`${scoreCadmium >= 80 ? '✅' : '🟡'} Cadmium: ${cadmium.value} ${cadmium.unit || 'µg/L'}`);
    scoreMetauxMoyen += scoreCadmium;
    compteMetaux++;
  }
  
  if (metauxTestes && compteMetaux > 0) {
    scores.metauxLourds = scoreMetauxMoyen / compteMetaux;
  } else {
    scores.metauxLourds = 75; // Valeur par défaut optimiste
    parametresManquants.push('Métaux lourds cancérigènes');
  }
  
  // ===== 4. NITRATES =====
  const nitrates = getParameterValue(parametersData, ['1340', 'NO3']);
  if (nitrates !== null) {
    scores.nitrates = Math.max(40, 100 - (nitrates.value / 50) * 70); // Moins sévère
    alertes.push(`${scores.nitrates >= 80 ? '✅' : '🟡'} Nitrates: ${nitrates.value} ${nitrates.unit || 'mg/L'}`);
  } else {
    scores.nitrates = 75; // Par défaut optimiste
    parametresManquants.push('Nitrates/Nitrites');
  }
  
  // ===== 5. PARAMÈTRES NON TESTÉS (MOINS PÉNALISANTS) =====
  if (!checkParametersExist(parametersData, ['PFAS20', 'PFOA', 'PFOS'])) {
    scores.pfas = 70; // Plus généreux pour absence
    parametresManquants.push('PFAS (polluants éternels)');
  }
  
  if (!checkParametersExist(parametersData, ['MICROPL'])) {
    scores.microplastiques = 70; // Plus généreux
    parametresManquants.push('Microplastiques');
  }
  
  if (!checkParametersExist(parametersData, ['PEST', 'GPST', 'ATRAZ'])) {
    scores.pesticides = 70; // Plus généreux
    parametresManquants.push('Pesticides');
  }
  
  if (!checkParametersExist(parametersData, ['MED', 'ANTIBIO'])) {
    scores.medicaments = 70; // Plus généreux
    parametresManquants.push('Résidus médicamenteux');
  }
  
  // ===== 6. AUTRES PARAMÈTRES =====
  const chloreLibre = getParameterValue(parametersData, ['1959', 'CL2LIB']);
  if (chloreLibre !== null) {
    if (chloreLibre.value >= 0.1 && chloreLibre.value <= 0.5) {
      scores.autres = 100;
    } else if (chloreLibre.value >= 0.05 && chloreLibre.value <= 1.0) {
      scores.autres = 90; // Plus généreux
    } else {
      scores.autres = 75; // Moins pénalisant
    }
    alertes.push(`${scores.autres >= 85 ? '✅' : '🟡'} Chlore libre: ${chloreLibre.value} ${chloreLibre.unit || 'mg/L'}`);
  } else {
    scores.autres = 75; // Par défaut optimiste
    parametresManquants.push('Désinfection (chlore)');
  }
  
  // ===== 7. CALCUL SCORE FINAL ÉQUILIBRÉ =====
  const ponderation = {
    microbiologique: 0.20, // Réduit de 0.25
    metauxLourds: 0.15,    // Identique
    nitrates: 0.12,        // Augmenté de 0.10
    organoleptiques: 0.12, // Augmenté de 0.05
    pfas: 0.12,           // Réduit de 0.18
    pesticides: 0.10,     // Augmenté de 0.08
    microplastiques: 0.10, // Réduit de 0.12
    medicaments: 0.09,    // Augmenté de 0.07
    autres: 0.05          // Identique
  };
  
  let scorePondere = 0;
  for (const [categorie, score] of Object.entries(scores)) {
    scorePondere += score * ponderation[categorie];
  }
  
  // Application des déclassements de façon moins sévère
  let scoreFinal = Math.min(scorePondere, scoreMaxFinal);
  scoreFinal = Math.max(0, scoreFinal);
  
  // ===== 8. DÉTERMINATION DU NIVEAU (SEUILS ÉQUILIBRÉS) =====
  let niveau, emoji, couleur, message;
  
  if (scoreFinal >= 80) {
    niveau = 'EXCELLENT'; emoji = '🟢'; couleur = '#28a745'; message = 'Eau de qualité exceptionnelle';
  } else if (scoreFinal >= 70) {
    niveau = 'TRÈS BON'; emoji = '🟢'; couleur = '#28a745'; message = 'Eau de très bonne qualité';
  } else if (scoreFinal >= 60) {
    niveau = 'BON'; emoji = '🟡'; couleur = '#ffc107'; message = 'Eau de qualité satisfaisante';
  } else if (scoreFinal >= 50) {
    niveau = 'CORRECT'; emoji = '🟡'; couleur = '#ffc107'; message = 'Eau correcte, améliorations possibles';
  } else if (scoreFinal >= 40) {
    niveau = 'AMÉLIORABLE'; emoji = '🟠'; couleur = '#fd7e14'; message = 'Eau améliorable, traitement recommandé';
  } else if (scoreFinal >= 25) {
    niveau = 'PRÉOCCUPANT'; emoji = '🟠'; couleur = '#fd7e14'; message = 'Eau nécessitant un traitement prioritaire';
  } else if (scoreFinal >= 15) {
    niveau = 'MAUVAIS'; emoji = '🔴'; couleur = '#dc3545'; message = 'Eau présentant des risques sanitaires';
  } else {
    niveau = 'CRITIQUE'; emoji = '🔴'; couleur = '#dc3545'; message = 'Eau impropre à la consommation';
  }
  
  // ===== 9. RECOMMANDATIONS ADAPTÉES =====
  if (scoreFinal >= 70) {
    recommandations.push('✅ Eau de bonne qualité selon les données disponibles');
    if (parametresManquants.length > 0) {
      recommandations.push('🔬 Compléter l\'analyse avec les paramètres manquants pour une évaluation complète');
    }
  } else if (scoreFinal >= 50) {
    recommandations.push('🌟 Installer un système de filtration adapté pourrait améliorer la qualité');
    recommandations.push('📞 Demander des analyses complémentaires à votre mairie');
  } else {
    recommandations.push('🚨 Traitement de l\'eau fortement recommandé');
    recommandations.push('📞 Contacter votre mairie pour signaler les problèmes détectés');
    recommandations.push('🔬 Faire réaliser une analyse complète par un laboratoire agréé');
  }
  
  return {
    score: Math.round(scoreFinal),
    scorePrecis: scoreFinal,
    niveau: niveau,
    emoji: emoji,
    couleur: couleur,
    message: message,
    alertes: alertes,
    recommandations: [...new Set(recommandations)],
    parametresManquants: parametresManquants,
    details: {
      scores: scores,
      ponderation: ponderation,
      scorePondere: scorePondere,
      penalites: 0,
      declassements: declassements,
      scoreMaxFinal: scoreMaxFinal
    },
    sourceInfo: sourceInfo,
    metadata: {
      dateCalcul: new Date().toISOString(),
      version: '4.4 - Scoring Équilibré',
      analyseApprofondie: options.analyseApprofondie || false,
      nombreParametres: nombreParametres
    }
  };
}

// ===== GÉNÉRATION HTML AVEC INFO SOURCE =====

function generateLifeWaterHTML(scoreResult, adresse, parametersData) {
  const categoriesNoms = {
    microbiologique: '🦠 Microbiologique',
    organoleptiques: '🌡️ Organoleptiques',
    metauxLourds: '🔗 Métaux lourds',
    pfas: '🧪 PFAS',
    nitrates: '⚗️ Nitrates',
    microplastiques: '🔬 Microplastiques',
    pesticides: '🌿 Pesticides',
    medicaments: '🧬 Médicaments',
    autres: '💧 Autres'
  };

  // ===== CAS SPÉCIAUX =====
  if (scoreResult.details.aucuneDonnee) {
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
          <div class="points-attention">
            <p><strong>❌ Problème détecté :</strong></p>
            <ul>
              ${scoreResult.alertes.map(alerte => `<li>${alerte}</li>`).join('')}
            </ul>
          </div>

          <div class="recommandations">
            <p><strong>🔍 Que faire maintenant ?</strong></p>
            <ul>
              ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
            </ul>
          </div>

          <div class="footer-life-water">
            <p><strong>🔍 Recherche effectuée :</strong></p>
            <ul>
              <li>✅ Commune principale recherchée</li>
              <li>✅ Communes voisines dans un rayon de 20km recherchées</li>
              <li>❌ Aucune donnée suffisante trouvée</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  if (scoreResult.details.donneesInsuffisantes) {
    return `
      <div class="life-water-report">
        <div class="life-water-header" style="background: linear-gradient(135deg, #fd7e14 0%, #e8590c 100%);">
          <h2>⚠️ <strong>Données partielles disponibles</strong></h2>
          <p>Nous avons trouvé quelques données, mais l'analyse reste limitée.</p>
          ${scoreResult.sourceInfo && scoreResult.sourceInfo.type === 'commune_voisine' ? 
            `<p>📍 Données provenant de <strong>${scoreResult.sourceInfo.nomCommune}</strong> (${scoreResult.sourceInfo.distance.toFixed(1)}km)</p>` : ''}
        </div>

        <div class="resultat-principal" style="background: linear-gradient(135deg, #fd7e14 0%, #e8590c 100%);">
          <h3>📊 <strong>Résultat partiel</strong></h3>
          <p><strong>Adresse analysée :</strong> ${adresse}</p>
          
          <div class="score-display">
            <div class="score-circle" style="border-color: #fd7e14; color: #fd7e14;">
              <div class="score-number">${scoreResult.score}</div>
              <div class="score-label">/ 100</div>
            </div>
            <div class="score-info">
              <h4 style="color: #fd7e14;">⚠️ ${scoreResult.niveau}</h4>
              <p class="score-message">${scoreResult.message}</p>
            </div>
          </div>
        </div>

        <div class="content-section">
          <div class="points-attention">
            <p><strong>⚠️ Informations disponibles :</strong></p>
            <ul>
              ${scoreResult.alertes.map(alerte => `<li>${alerte}</li>`).join('')}
            </ul>
          </div>

          <div class="recommandations">
            <p><strong>🔍 Recommandations :</strong></p>
            <ul>
              ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
            </ul>
          </div>

          ${scoreResult.sourceInfo ? `
          <div class="footer-life-water">
            <h4>📍 <strong>Source des données</strong></h4>
            ${scoreResult.sourceInfo.type === 'commune_voisine' ? `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>ℹ️ Important :</strong> Les données proviennent de <strong>${scoreResult.sourceInfo.nomCommune}</strong>, située à <strong>${scoreResult.sourceInfo.distance.toFixed(1)}km</strong> de votre adresse. La qualité de l'eau peut varier entre les communes.</p>
            </div>
            ` : ''}
            <p><strong>📊 Données analysées :</strong> ${scoreResult.metadata.nombreParametres} paramètres (minimum recommandé : 10)</p>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ===== AFFICHAGE NORMAL AVEC INFO SOURCE =====
  
  let pointsHTML = [];
  
  const ph = getParameterValue(parametersData, ['1302', 'PH']);
  if (ph) pointsHTML.push(`${ph.value >= 6.5 && ph.value <= 9.0 ? '✅' : '🟡'} <strong>pH : ${ph.value}</strong>`);
  
  const conductivite = getParameterValue(parametersData, ['1303', 'CDT25']);
  if (conductivite) pointsHTML.push(`${conductivite.value <= 1200 ? '✅' : '🟡'} <strong>Conductivité : ${conductivite.value} µS/cm</strong>`);
  
  const ecoli = getParameterValue(parametersData, ['1506', 'ECOLI']);
  if (ecoli) pointsHTML.push(`${ecoli.value === 0 ? '✅' : '❌'} <strong>E. coli : ${ecoli.value === 0 ? 'Non détecté' : ecoli.value + ' n/100mL'}</strong>`);

  let tableauHTML = '';
  for (const [categorie, score] of Object.entries(scoreResult.details.scores)) {
    const poids = Math.round(scoreResult.details.ponderation[categorie] * 100);
    const nom = categoriesNoms[categorie] || categorie;
    let couleurScore = score >= 75 ? '#28a745' : score >= 60 ? '#ffc107' : score >= 40 ? '#fd7e14' : '#dc3545';
    let statut = score >= 75 ? '✅ Excellent' : score >= 60 ? '🟡 Bon' : score >= 40 ? '🟠 Moyen' : '❌ Critique';
    
    if (score <= 0) {
      statut = '❌ Non analysé';
      couleurScore = '#6c757d';
    }
    
    tableauHTML += `
      <tr>
        <td>${nom}</td>
        <td style="text-align: center; font-weight: bold; color: ${couleurScore};">${score.toFixed(1)}/100</td>
        <td style="text-align: center;">${poids}%</td>
        <td style="text-align: center; color: ${couleurScore};">${statut}</td>
      </tr>
    `;
  }

  return `
    <div class="life-water-report">
      <!-- En-tête Life Water -->
      <div class="life-water-header">
        <h2>🔬 <strong>Analyse de la qualité de votre eau du robinet</strong></h2>
        <p>Cette analyse vous est offerte par <strong>Life Water</strong>.</p>
        <p>Découvrez la qualité réelle de votre eau potable, grâce à notre traitement scientifique des données issues du Service Public d'Information sur l'Eau (Hubeau).</p>
        <p><strong>Life Water est un groupe privé de recherche appliquée</strong>, engagé dans l'étude et l'amélioration de la qualité de l'eau destinée à la consommation humaine.</p>
        <p>Notre ambition : <strong>rendre à la terre une eau digne de confiance, bénéfique pour la santé, et respectueuse du vivant.</strong></p>
        <hr>
        <p>💡 <strong>Analyse basée sur les dernières données disponibles.</strong></p>
      </div>

      <!-- Résultat Principal -->
      <div class="resultat-principal">
        <h3>📊 <strong>Résultat de votre analyse</strong></h3>
        <p><strong>Adresse analysée :</strong> ${adresse}</p>
        
        ${scoreResult.sourceInfo && scoreResult.sourceInfo.type === 'commune_voisine' ? `
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0; font-size: 1.1em;"><strong>📍 Point de collecte :</strong> ${scoreResult.sourceInfo.nomCommune} (${scoreResult.sourceInfo.distance.toFixed(1)}km)</p>
          <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.9;">Aucune donnée disponible pour votre commune - Données de la commune la plus proche utilisées</p>
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
          </div>
        </div>
      </div>

      <div class="content-section">
        <!-- Info Source si données d'une commune voisine -->
        ${scoreResult.sourceInfo && scoreResult.sourceInfo.type === 'commune_voisine' ? `
        <div style="background: #e3f2fd; border-left: 5px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 0 10px 10px 0;">
          <h4 style="margin: 0 0 15px 0; color: #1976d2;">📍 <strong>Source des données</strong></h4>
          <p><strong>Point de collecte :</strong> ${scoreResult.sourceInfo.nomCommune}</p>
          <p><strong>Distance :</strong> ${scoreResult.sourceInfo.distance.toFixed(1)} kilomètres de votre adresse</p>
          <p><strong>Raison :</strong> Aucune donnée récente disponible pour votre commune dans la base Hubeau</p>
          <p style="margin: 15px 0 0 0;"><strong>⚠️ Important :</strong> La qualité de l'eau peut varier d'une commune à l'autre. Ces données donnent une indication de la qualité de l'eau dans votre région, mais ne garantissent pas que votre eau soit identique.</p>
        </div>
        ` : ''}

        <!-- Points d'attention -->
        <div class="points-attention">
          <p><strong>📊 Paramètres analysés :</strong></p>
          ${pointsHTML.length > 0 ? `
          <ul>
            ${pointsHTML.map(point => `<li>${point}</li>`).join('')}
          </ul>
          ` : '<p>Paramètres de base analysés selon les données disponibles.</p>'}
          
          ${scoreResult.alertes.length > 0 ? `
          <p><strong>ℹ️ Informations détectées :</strong></p>
          <ul>
            ${scoreResult.alertes.slice(0, 10).map(alerte => `<li>${alerte}</li>`).join('')}
          </ul>
          ` : ''}
          
          ${scoreResult.parametresManquants.length > 0 ? `
          <p><strong>❌ Paramètres non analysés :</strong></p>
          <ul>
            ${scoreResult.parametresManquants.map(param => `<li>${param}</li>`).join('')}
          </ul>
          ` : ''}
        </div>

        <!-- Recommandations -->
        <div class="recommandations">
          <p><strong>💡 Recommandations personnalisées</strong></p>
          
          ${scoreResult.sourceInfo && scoreResult.sourceInfo.type === 'commune_voisine' ? `
          <p><strong>🎯 Spécifique à votre situation :</strong></p>
          <ul>
            <li>📞 <strong>Contactez votre mairie</strong> pour obtenir les analyses spécifiques à votre commune</li>
            <li>🔬 <strong>Faites réaliser une analyse personnalisée</strong> par un laboratoire agréé pour votre adresse précise</li>
            <li>ℹ️ <strong>Vérifiez les affichages publics</strong> en mairie qui contiennent les analyses officielles locales</li>
          </ul>
          ` : ''}
          
          <ul>
            ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
          </ul>
          
          ${scoreResult.score >= 70 ? 
            '<p><strong>✅ Votre eau présente une qualité satisfaisante selon les données disponibles.</strong></p>' : 
            scoreResult.score >= 50 ?
              '<p><strong>🟡 Votre eau présente quelques défauts qui pourraient être améliorés.</strong></p>' :
              '<p><strong>🟠 Votre eau nécessite une attention particulière.</strong></p>'
          }
          
          <p><strong>🌍 Protéger votre eau, c'est protéger votre santé et celle de vos proches.</strong></p>
        </div>

        <!-- Détails techniques -->
        <div class="details-techniques">
          <h4>🔬 <strong>Détails techniques par critère</strong></h4>
          
          <table>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th style="text-align: center;">Score</th>
                <th style="text-align: center;">Poids</th>
                <th style="text-align: center;">État</th>
              </tr>
            </thead>
            <tbody>
              ${tableauHTML}
            </tbody>
          </table>
          
          <p><strong>Score final pondéré :</strong> ${scoreResult.details.scorePondere.toFixed(1)} / 100</p>
          ${scoreResult.details.declassements ? '<p><strong>⚠️ Déclassements appliqués</strong> en raison de contaminations critiques</p>' : ''}
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>🔬 Méthodologie :</strong> Cette analyse utilise un algorithme équilibré qui pondère les différents paramètres selon leur importance pour la santé. Les paramètres manquants reçoivent un score neutre pour éviter une pénalisation excessive.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-life-water">
          <h4>📅 <strong>Informations sur cette analyse</strong></h4>
          
          <p><strong>📊 Données analysées :</strong> ${scoreResult.metadata.nombreParametres} paramètres trouvés dans la base Hubeau</p>
          ${scoreResult.sourceInfo ? `
          <p><strong>📍 Source :</strong> ${scoreResult.sourceInfo.type === 'commune_voisine' ? 
            `${scoreResult.sourceInfo.nomCommune} (${scoreResult.sourceInfo.distance.toFixed(1)}km)` : 
            scoreResult.sourceInfo.nomCommune}</p>
          ` : ''}
          <p><strong>🔬 Méthodologie :</strong> Algorithme Équilibré 2025 - Version ${scoreResult.metadata.version}</p>
          
          <h4>📃 <strong>Source des données</strong></h4>
          <p>Analyse fondée sur les données ouvertes du <strong>Ministère de la Transition Écologique</strong> via la plateforme <strong>Hubeau</strong>.</p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Important :</strong> Cette analyse est indicative et ne remplace pas une analyse officielle. ${scoreResult.sourceInfo && scoreResult.sourceInfo.type === 'commune_voisine' ? 'Les données proviennent d\'une commune voisine et peuvent ne pas refléter exactement la qualité de votre eau locale. ' : ''}En cas de doute, consultez votre mairie ou faites réaliser une analyse par un laboratoire agréé.</p>
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
  `;
}

// ===== EXPORT GLOBAL =====
if (typeof window !== 'undefined') {
  window.calculateWaterQualityScore = calculateWaterQualityScore;
  window.generateLifeWaterHTML = generateLifeWaterHTML;
  window.fetchHubeauDataWithFallback = fetchHubeauDataWithFallback;
  window.getParameterValue = getParameterValue;
  window.cleanNumericValue = cleanNumericValue;
  window.checkParametersExist = checkParametersExist;
}

console.log('✅ Water Scoring Équilibré avec Fallback Géographique chargé - Version 4.4');
