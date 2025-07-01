/**
 * =============================================================================
 * SCORING EAU - ALGORITHME SCIENTIFIQUE ÉQUITABLE v5.3.2 FINAL
 * =============================================================================
 * TOUTES CORRECTIONS APPLIQUÉES + INTERFACE ACCORDÉON
 * - Recherche Hubeau étendue (24 mois)
 * - Correction doublons automatique
 * - Pondérations corrigées (100%)
 * - Unités standardisées
 * - Interface accordéon avec sections dépliantes
 * Version 5.3.2 FINAL - Scoring équitable avec toutes corrections
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

// ===== RECHERCHE HUBEAU ÉTENDUE v5.3.2 =====

/**
 * Nouvelle fonction fetchHubeauForCommune améliorée
 * Collecte TOUS les paramètres disponibles en remontant dans l'historique
 */
async function fetchHubeauForCommuneComplete(codeCommune, moisRecherche = 24) {
  console.log(`🔍 Recherche complète pour commune ${codeCommune} sur ${moisRecherche} mois`);
  
  // Calculer les dates
  const dateFinISO = new Date().toISOString().split('T')[0];
  const dateDebut = new Date();
  dateDebut.setMonth(dateDebut.getMonth() - moisRecherche);
  const dateDebutISO = dateDebut.toISOString().split('T')[0];
  
  const url = `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${codeCommune}&date_min_prelevement=${dateDebutISO}&date_max_prelevement=${dateFinISO}&size=1000&sort=desc`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Résultats bruts trouvés: ${data.data?.length || 0}`);
    
    const parametersData = {};
    let nomCommune = null;
    let compteurParametres = {};
    
    if (data.data && data.data.length > 0) {
      nomCommune = data.data[0].nom_commune || `Commune ${codeCommune}`;
      
      // Grouper par paramètre et garder le plus récent pour chaque
      data.data.forEach(result => {
        const paramCode = result.code_parametre;
        const datePrelevement = result.date_prelevement;
        
        // Compter les analyses par paramètre
        compteurParametres[paramCode] = (compteurParametres[paramCode] || 0) + 1;
        
        if (!parametersData[paramCode]) {
          // Premier résultat pour ce paramètre
          parametersData[paramCode] = {
            name: result.libelle_parametre,
            unit: result.unite,
            values: [],
            latestValue: null,
            latestDate: null,
            totalAnalyses: 0
          };
        }
        
        // Ajouter cette valeur
        parametersData[paramCode].values.push({
          numeric: result.resultat_numerique,
          alphanumeric: result.resultat_alphanumerique,
          date: datePrelevement,
          limite_qualite: result.limite_qualite,
          conclusion_conformite: result.conclusion_conformite
        });
        
        // Mettre à jour si c'est plus récent
        if (!parametersData[paramCode].latestDate || 
            new Date(datePrelevement) > new Date(parametersData[paramCode].latestDate)) {
          parametersData[paramCode].latestValue = {
            numeric: result.resultat_numerique,
            alphanumeric: result.resultat_alphanumerique
          };
          parametersData[paramCode].latestDate = datePrelevement;
        }
        
        parametersData[paramCode].totalAnalyses++;
      });
      
      console.log(`✅ Paramètres collectés:`, Object.keys(parametersData).length);
      
      // Log des paramètres avec leur fréquence
      Object.entries(compteurParametres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([code, count]) => {
          const param = parametersData[code];
          console.log(`${code}: ${param?.name} - ${count} analyses (dernière: ${param?.latestDate})`);
        });
    }
    
    return {
      data: parametersData,
      nomCommune: nomCommune,
      metadata: {
        totalResultats: data.data?.length || 0,
        parametresUniques: Object.keys(parametersData).length,
        periodeRecherche: `${dateDebutISO} à ${dateFinISO}`,
        compteurParametres: compteurParametres
      }
    };
    
  } catch (error) {
    console.error(`❌ Erreur API Hubeau pour ${codeCommune}:`, error);
    return { 
      data: {}, 
      nomCommune: null,
      metadata: { error: error.message }
    };
  }
}

/**
 * Version améliorée du fallback géographique avec recherche complète
 */
async function fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm = 20, moisRecherche = 24) {
  console.log('=== RECHERCHE HUBEAU COMPLÈTE v5.3.2 ===');
  console.log(`Commune: ${codeCommune}, Période: ${moisRecherche} mois, Rayon: ${rayonKm}km`);
  
  // 1. Tentative sur la commune principale avec recherche étendue
  console.log('🎯 Recherche complète commune principale...');
  let result = await fetchHubeauForCommuneComplete(codeCommune, moisRecherche);
  
  // Critère d'acceptation plus souple : au moins 5 paramètres différents
  if (result.data && Object.keys(result.data).length >= 5) {
    console.log(`✅ Données suffisantes trouvées: ${Object.keys(result.data).length} paramètres sur ${moisRecherche} mois`);
    return {
      parametersData: result.data,
      sourceInfo: {
        type: 'commune_principale_complete',
        codeCommune: codeCommune,
        nomCommune: result.nomCommune || `Commune ${codeCommune}`,
        distance: 0,
        nombreParametres: Object.keys(result.data).length,
        metadata: result.metadata
      }
    };
  }
  
  console.log(`⚠️ Données insuffisantes (${Object.keys(result.data).length} paramètres), recherche étendue...`);
  
  // 2. Si toujours insuffisant, recherche dans les communes voisines
  try {
    const communesVoisines = await findNearbyCommunes(lat, lon, rayonKm);
    console.log(`Communes voisines trouvées: ${communesVoisines.length}`);
    
    for (const commune of communesVoisines.slice(0, 5)) { // Limiter à 5 communes
      console.log(`🔍 Test commune: ${commune.nom} (${commune.code}) à ${commune.distance.toFixed(1)}km`);
      
      const resultVoisine = await fetchHubeauForCommuneComplete(commune.code, moisRecherche);
      
      if (resultVoisine.data && Object.keys(resultVoisine.data).length >= 5) {
        console.log(`✅ Données suffisantes trouvées: ${Object.keys(resultVoisine.data).length} paramètres`);
        return {
          parametersData: resultVoisine.data,
          sourceInfo: {
            type: 'commune_voisine_complete',
            codeCommune: commune.code,
            nomCommune: commune.nom,
            distance: commune.distance,
            nombreParametres: Object.keys(resultVoisine.data).length,
            communePrincipale: codeCommune,
            metadata: resultVoisine.metadata
          }
        };
      }
    }
    
    console.log('❌ Aucune commune voisine avec des données suffisantes');
    
  } catch (error) {
    console.error('Erreur lors de la recherche géographique:', error);
  }
  
  // 3. Retourner ce qu'on a trouvé même si insuffisant
  return {
    parametersData: result.data,
    sourceInfo: {
      type: 'donnees_limitees',
      codeCommune: codeCommune,
      nomCommune: result.nomCommune || `Commune ${codeCommune}`,
      distance: 0,
      nombreParametres: Object.keys(result.data).length,
      message: `Seulement ${Object.keys(result.data).length} paramètres trouvés sur ${moisRecherche} mois`,
      metadata: result.metadata
    }
  };
}

// ===== FONCTIONS GÉOGRAPHIQUES (héritées v4.4) =====

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

// ===== CORRECTION DES DOUBLONS v5.3.2 =====

/**
 * Dédoublonne les paramètres équivalents
 * Garde la meilleure valeur disponible selon la priorité
 */
function dedoublonnerParametres(parametersData) {
  console.log('=== DÉDOUBLONNAGE DES PARAMÈTRES v5.3.2 ===');
  
  const parametersClean = { ...parametersData };
  const codesSupprimes = [];
  const substitutions = [];
  
  Object.entries(PARAMETRES_EQUIVALENTS).forEach(([groupKey, group]) => {
    console.log(`🔍 Vérification groupe: ${group.nom}`);
    
    // Chercher quels codes de ce groupe sont disponibles
    const codesDisponibles = group.codes.filter(code => parametersData[code]);
    
    if (codesDisponibles.length > 1) {
      console.log(`❌ Doublon détecté: ${group.nom} - Codes: ${codesDisponibles.join(', ')}`);
      
      // Garder selon la priorité
      let codeAGarder = null;
      for (const codePrioritaire of group.priorite) {
        if (codesDisponibles.includes(codePrioritaire)) {
          codeAGarder = codePrioritaire;
          break;
        }
      }
      
      if (codeAGarder) {
        // Supprimer les autres codes
        codesDisponibles.forEach(code => {
          if (code !== codeAGarder) {
            delete parametersClean[code];
            codesSupprimes.push(code);
            substitutions.push({
              supprime: code,
              garde: codeAGarder,
              nom: group.nom,
              raisonSuppression: 'Doublon - code alternatif'
            });
          }
        });
        
        console.log(`✅ Gardé: ${codeAGarder} (${group.nom}), supprimé: ${codesDisponibles.filter(c => c !== codeAGarder).join(', ')}`);
      }
    } else if (codesDisponibles.length === 1) {
      console.log(`✅ Pas de doublon: ${group.nom} - Code: ${codesDisponibles[0]}`);
    } else {
      console.log(`⚪ Groupe absent: ${group.nom}`);
    }
  });
  
  console.log(`📊 Dédoublonnage terminé:`);
  console.log(`- Codes supprimés: ${codesSupprimes.length}`);
  console.log(`- Paramètres avant: ${Object.keys(parametersData).length}`);
  console.log(`- Paramètres après: ${Object.keys(parametersClean).length}`);
  
  return {
    parametersData: parametersClean,
    codesSupprimes,
    substitutions,
    stats: {
      avant: Object.keys(parametersData).length,
      apres: Object.keys(parametersClean).length,
      supprimes: codesSupprimes.length
    }
  };
}
// ===== FONCTIONS AFFICHAGE AMÉLIORÉES v5.3.2 =====

/**
 * Formate l'affichage d'une valeur avec son unité (version corrigée)
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
  
  // Gestion des unités manquantes - CORRECTION v5.3.2
  let uniteAffichee = unite;
  if (!unite || unite === 'undefined' || unite === 'null') {
    // Deviner l'unité selon le paramètre avec unités corrigées
    if (nom.includes('pH')) {
      uniteAffichee = 'unités pH';
    } else if (nom.includes('Conductivité')) {
      uniteAffichee = 'µS/cm';
    } else if (nom.includes('Température')) {
      uniteAffichee = '°C';
    } else if (parametresMicrobiologiques.some(p => nom.includes(p))) {
      // CORRECTION: Unités microbiologie standardisées
      if (nom.includes('aérobies 22°C')) {
        uniteAffichee = 'UFC/mL';
      } else {
        uniteAffichee = 'UFC/100mL';
      }
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

// ===== FONCTIONS SCIENTIFIQUES CORRIGÉES v5.3.2 =====

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

// ===== FONCTION DE DEBUG =====

function debugHubeauData(parametersData) {
  console.log('=== DEBUG DONNÉES HUBEAU v5.3.2 ===');
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
/**
 * ALGORITHME PRINCIPAL v5.3.2 - Calcul équitable avec TOUTES les corrections
 */
function calculateLifeWaterScore(parametersData, options = {}, sourceInfo = null) {
  console.log('=== CALCUL SCORING SCIENTIFIQUE ÉQUITABLE v5.3.2 FINAL ===');
  console.log('Paramètres reçus:', Object.keys(parametersData));
  
  // 1. DÉDOUBLONNAGE AUTOMATIQUE
  const dedouble = dedoublonnerParametres(parametersData);
  const parametersClean = dedouble.parametersData;
  
  console.log(`🔧 Dédoublonnage: ${Object.keys(parametersData).length} → ${Object.keys(parametersClean).length} paramètres`);
  
  const nombreParametres = Object.keys(parametersClean).length;
  
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
        version: '5.3.2 FINAL - Toutes corrections appliquées',
        analyseApprofondie: options.analyseApprofondie || false,
        nombreParametres: 0,
        corrections_appliquees: dedouble.substitutions
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
    const resultCategorie = calculerScoreCategorieComplete(categorie, parametersClean);
    
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
    Object.keys(parametersClean), 
    Object.keys(parametersClean)
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
  if (sourceInfo && sourceInfo.type === 'commune_voisine_complete') {
    alertes.unshift(`ℹ️ Analyse basée sur les données de ${sourceInfo.nomCommune} (${sourceInfo.distance.toFixed(1)}km)`);
  }
  
  // Ajout info dédoublonnage
  if (dedouble.substitutions.length > 0) {
    alertes.unshift(`🔧 ${dedouble.substitutions.length} doublons corrigés automatiquement (codes alternatifs Hubeau)`);
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
      version: '5.3.2 FINAL - Toutes corrections appliquées',
      analyseApprofondie: options.analyseApprofondie || false,
      nombreParametres: nombreParametres,
      parametres_testes_total: parametres_testes_total,
      parametres_totaux_total: parametres_totaux_total,
      fiabiliteSimple: Math.round(fiabiliteSimple),
      fiabilitePonderee: fiabilite,
      corrections_appliquees: dedouble.substitutions,
      ponderations_corrigees: true,
      unites_standardisees: true
    }
  };
}
// ===== INTERFACE ACCORDÉON v5.3.2 =====

/**
 * Génère l'HTML avec sections accordéon dépliantes
 */
function generateLifeWaterHTML(scoreResult, adresse, parametersData) {
  // ===== CAS SPÉCIAUX =====
  if (scoreResult.score === 0 && scoreResult.fiabilite === 0) {
    return generateNoDataHTML(scoreResult, adresse);
  }

  // ===== AFFICHAGE NORMAL v5.3.2 =====
  
  // Sections accordéon principales
  const accordionSections = generateAccordionSections(scoreResult);

  return `
    <div class="life-water-report">
      <!-- En-tête Life Water -->
      <div class="life-water-header">
        <h2>🔬 <strong>Analyse scientifique équitable de la qualité de votre eau</strong></h2>
        <p>Cette analyse vous est offerte par <strong>Life Water</strong>.</p>
        <p>Algorithme scientifique v${scoreResult.metadata.version} avec scoring équitable - TOUS les paramètres importants pris en compte.</p>
        <p><strong>Life Water est un groupe privé de recherche appliquée</strong>, engagé dans l'étude et l'amélioration de la qualité de l'eau destinée à la consommation humaine.</p>
        <hr>
        <p>💡 <strong>Nouveauté v5.3.2 :</strong> Toutes corrections appliquées + Interface accordéon interactive.</p>
      </div>

      <!-- Résultat Principal -->
      <div class="resultat-principal">
        <h3>📊 <strong>Résultat de votre analyse équitable</strong></h3>
        <p><strong>Adresse analysée :</strong> ${adresse}</p>
        
        ${scoreResult.sourceInfo && scoreResult.sourceInfo.type.includes('commune_voisine') ? `
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
        <!-- SECTIONS ACCORDÉON DÉPLIANTES -->
        ${accordionSections}

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
          
          ${scoreResult.metadata.corrections_appliquees && scoreResult.metadata.corrections_appliquees.length > 0 ? `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>🔧 Corrections appliquées :</strong> ${scoreResult.metadata.corrections_appliquees.length} doublons supprimés, pondérations corrigées (100%), unités standardisées.</p>
          </div>
          ` : ''}
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>📋 Normes utilisées :</strong> UE Directive 2020/2184, OMS Guidelines 2022, Code de la santé publique français. Principe : aucun paramètre ajouté sans norme officielle reconnue.</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>🧮 Scoring équitable v5.3.2 :</strong> TOUS les paramètres importants sont pris en compte. Les paramètres non testés reçoivent un score neutre de 50/100 (bénéfice du doute), garantissant une évaluation juste qui ne masque pas les analyses manquantes importantes.</p>
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

    ${generateAccordionCSS()}
  `;
}

/**
 * Génère les sections accordéon dépliantes
 */
function generateAccordionSections(scoreResult) {
  return `
    <!-- SECTIONS ACCORDÉON DÉPLIANTES -->
    <div class="accordion-sections">
      
      <!-- 1. DÉTAIL DES CONTRIBUTIONS -->
      <div class="accordion-section">
        <div class="accordion-header" onclick="toggleAccordion('contributions')">
          <span class="accordion-title">🎯 <strong>Détail des contributions au score</strong></span>
          <span class="accordion-score">${scoreResult.score}/100</span>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-content" id="accordion-contributions" style="display: none;">
          ${generateContributionsDetailHTML(scoreResult)}
        </div>
      </div>

      <!-- 2. ANALYSE DÉTAILLÉE PAR CATÉGORIE -->
      <div class="accordion-section">
        <div class="accordion-header" onclick="toggleAccordion('categories')">
          <span class="accordion-title">🔍 <strong>Analyse détaillée par catégorie</strong></span>
          <span class="accordion-coverage">${scoreResult.metadata.parametres_testes_total}/${scoreResult.metadata.parametres_totaux_total} paramètres</span>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-content" id="accordion-categories" style="display: none;">
          ${generateCategoriesDetailHTML(scoreResult)}
        </div>
      </div>

      <!-- 3. MÉTADONNÉES ET FIABILITÉ -->
      <div class="accordion-section">
        <div class="accordion-header" onclick="toggleAccordion('metadata')">
          <span class="accordion-title">📊 <strong>Métadonnées et fiabilité</strong></span>
          <span class="accordion-reliability">${scoreResult.fiabilite}% fiable</span>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-content" id="accordion-metadata" style="display: none;">
          ${generateMetadataDetailHTML(scoreResult)}
        </div>
      </div>

    </div>
  `;
}

/**
 * Génère le détail des contributions avec graphiques
 */
function generateContributionsDetailHTML(scoreResult) {
  let html = `
    <div class="contributions-detail">
      <h5>📈 Répartition des points par catégorie</h5>
      <div class="contributions-chart">
  `;
  
  Object.entries(scoreResult.contributions).forEach(([categorie, contrib]) => {
    const details = scoreResult.detailsParCategorie[categorie];
    const couleur = contrib.score >= 75 ? '#28a745' : contrib.score >= 50 ? '#ffc107' : '#dc3545';
    
    html += `
      <div class="contribution-bar-detail">
        <div class="contribution-info">
          <span class="contrib-name">${details.nom}</span>
          <span class="contrib-weight">${(details.ponderation).toFixed(0)}%</span>
          <span class="contrib-score">${contrib.score.toFixed(0)}/100</span>
          <span class="contrib-points">${contrib.points.toFixed(1)} pts</span>
        </div>
        <div class="contribution-bar-container">
          <div class="contribution-bar-bg">
            <div class="contribution-bar-fill" style="width: ${contrib.score}%; background: ${couleur};"></div>
          </div>
          <div class="contribution-coverage">${contrib.parametres_testes}/${contrib.parametres_totaux} testés</div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
      <div class="contributions-summary">
        <h6>💡 Interprétation des contributions</h6>
        <ul>
          <li><strong>Points</strong> : Contribution réelle au score final (pondérée)</li>
          <li><strong>Score catégorie</strong> : Performance dans cette catégorie (0-100)</li>
          <li><strong>Poids</strong> : Importance relative dans l'algorithme scientifique</li>
          <li><strong>Couverture</strong> : Nombre de paramètres testés vs total possible</li>
        </ul>
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Génère l'analyse détaillée par catégorie
 */
function generateCategoriesDetailHTML(scoreResult) {
  let html = `
    <div class="categories-detail">
      <h5>🔬 Analyse scientifique par catégorie</h5>
  `;
  
  Object.entries(scoreResult.detailsParCategorie).forEach(([categorie, details]) => {
    const contribution = scoreResult.contributions[categorie];
    const couleurCategorie = contribution.score >= 75 ? '#28a745' : contribution.score >= 50 ? '#ffc107' : '#dc3545';
    
    html += `
      <div class="category-detail-card" style="border-left: 4px solid ${couleurCategorie};">
        <div class="category-detail-header">
          <h6>${details.nom}</h6>
          <span class="category-score-badge" style="background: ${couleurCategorie};">${contribution.score.toFixed(0)}/100</span>
        </div>
        <p class="category-description">${details.description}</p>
        
        <div class="category-stats">
          <div class="stat-item">
            <span class="stat-label">Pondération</span>
            <span class="stat-value">${details.ponderation.toFixed(0)}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Contribution</span>
            <span class="stat-value">${contribution.points.toFixed(1)} pts</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Couverture</span>
            <span class="stat-value">${contribution.parametres_testes}/${contribution.parametres_totaux}</span>
          </div>
        </div>

        <div class="category-parameters">
          <h7>Paramètres de cette catégorie :</h7>
          ${details.details.map(param => `
            <div class="param-mini ${param.teste ? 'tested' : 'untested'}">
              <span class="param-name">${param.nom}</span>
              <span class="param-score">${param.score}/100</span>
              ${param.teste ? 
                `<span class="param-status">✅ Testé</span>` : 
                `<span class="param-status">⚪ Bénéfice du doute</span>`
              }
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  return html;
}

/**
 * Génère les métadonnées détaillées
 */
function generateMetadataDetailHTML(scoreResult) {
  return `
    <div class="metadata-detail">
      <div class="metadata-grid">
        <div class="metadata-card">
          <h6>🔬 Algorithme</h6>
          <p><strong>Version</strong> : ${scoreResult.metadata.version}</p>
          <p><strong>Date calcul</strong> : ${new Date(scoreResult.metadata.dateCalcul).toLocaleString('fr-FR')}</p>
          <p><strong>Analyse approfondie</strong> : ${scoreResult.metadata.analyseApprofondie ? 'Oui' : 'Non'}</p>
          <p><strong>Corrections</strong> : ${scoreResult.metadata.corrections_appliquees ? scoreResult.metadata.corrections_appliquees.length : 0} appliquées</p>
        </div>
        
        <div class="metadata-card">
          <h6>📊 Données analysées</h6>
          <p><strong>Paramètres testés</strong> : ${scoreResult.metadata.parametres_testes_total}</p>
          <p><strong>Paramètres totaux</strong> : ${scoreResult.metadata.parametres_totaux_total}</p>
          <p><strong>Fiabilité simple</strong> : ${scoreResult.metadata.fiabiliteSimple || 'N/A'}%</p>
          <p><strong>Fiabilité pondérée</strong> : ${scoreResult.metadata.fiabilitePonderee || scoreResult.fiabilite}%</p>
        </div>
        
        <div class="metadata-card">
          <h6>📍 Source des données</h6>
          <p><strong>Type</strong> : ${scoreResult.sourceInfo?.type || 'Non spécifié'}</p>
          <p><strong>Commune</strong> : ${scoreResult.sourceInfo?.nomCommune || 'Non spécifiée'}</p>
          ${scoreResult.sourceInfo?.distance ? 
            `<p><strong>Distance</strong> : ${scoreResult.sourceInfo.distance.toFixed(1)} km</p>` : 
            ''
          }
          <p><strong>Paramètres trouvés</strong> : ${scoreResult.sourceInfo?.nombreParametres || 0}</p>
        </div>
        
        ${scoreResult.metadata.corrections_appliquees && scoreResult.metadata.corrections_appliquees.length > 0 ? `
        <div class="metadata-card">
          <h6>🔧 Corrections appliquées</h6>
          <p><strong>Doublons supprimés</strong> : ${scoreResult.metadata.corrections_appliquees.length}</p>
          <p><strong>Pondérations</strong> : Corrigées (100%)</p>
          <p><strong>Unités</strong> : Standardisées</p>
          <p><strong>Formules beta</strong> : Normalisées</p>
        </div>
        ` : ''}
      </div>
      
      <div class="algorithm-info">
        <h6>🧮 Principe de l'algorithme équitable v5.3.2</h6>
        <ul>
          <li><strong>Bénéfice du doute</strong> : Paramètres non testés = 50/100 (neutre)</li>
          <li><strong>Transparence totale</strong> : Tous les paramètres importants affichés</li>
          <li><strong>Pondération scientifique</strong> : Basée sur l'impact sanitaire réel</li>
          <li><strong>Fiabilité pondérée</strong> : Calcul selon la criticité des paramètres testés</li>
          <li><strong>Normes officielles</strong> : UE, OMS, Code de la santé publique français</li>
          <li><strong>Corrections automatiques</strong> : Doublons, pondérations, unités</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Génère l'HTML pour le cas "aucune donnée"
 */
function generateNoDataHTML(scoreResult, adresse) {
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

/**
 * Fonction toggle pour les accordéons
 */
function toggleAccordion(sectionId) {
  const content = document.getElementById(`accordion-${sectionId}`);
  const header = content.previousElementSibling;
  const arrow = header.querySelector('.accordion-arrow');
  
  if (content.style.display === 'none' || content.style.display === '') {
    content.style.display = 'block';
    arrow.textContent = '▲';
    header.classList.add('expanded');
    
    // Animation d'apparition
    content.style.opacity = '0';
    content.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      content.style.transition = 'all 0.3s ease';
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    }, 10);
  } else {
    content.style.display = 'none';
    arrow.textContent = '▼';
    header.classList.remove('expanded');
  }
}

/**
 * Fonction toggle pour les catégories (accordéon legacy)
 */
function toggleCategory(categoryId) {
  const details = document.getElementById('details-' + categoryId);
  if (!details) return;
  
  const header = details.previousElementSibling;
  
  if (details.style.display === 'none' || details.style.display === '') {
    details.style.display = 'block';
    if (header) header.classList.add('expanded');
  } else {
    details.style.display = 'none';
    if (header) header.classList.remove('expanded');
  }
}

/**
 * Génère le CSS pour les accordéons
 */
function generateAccordionCSS() {
  return `<style>
    /* ===== STYLES ACCORDÉON v5.3.2 ===== */
    .accordion-sections {
      margin: 30px 0;
    }
    
    .accordion-section {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 10px;
      margin: 15px 0;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .accordion-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      padding: 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background-color 0.3s ease;
      border-bottom: 1px solid transparent;
    }
    
    .accordion-header:hover {
      background: linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%);
    }
    
    .accordion-header.expanded {
      border-bottom-color: #e9ecef;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .accordion-title {
      font-size: 1.1em;
      font-weight: 600;
      flex: 1;
    }
    
    .accordion-score, .accordion-coverage, .accordion-reliability {
      background: rgba(255,255,255,0.9);
      color: #333;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9em;
      margin: 0 10px;
    }
    
    .accordion-header.expanded .accordion-score,
    .accordion-header.expanded .accordion-coverage,
    .accordion-header.expanded .accordion-reliability {
      background: rgba(255,255,255,0.2);
      color: white;
    }
    
    .accordion-arrow {
      font-size: 1.2em;
      transition: transform 0.3s ease;
    }
    
    .accordion-content {
      padding: 25px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
    }
    
    /* Détail des contributions */
    .contributions-detail h5 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 1.2em;
    }
    
    .contribution-bar-detail {
      background: white;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .contribution-info {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 15px;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .contrib-name {
      font-weight: 600;
      color: #333;
    }
    
    .contrib-weight, .contrib-score, .contrib-points {
      text-align: center;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 12px;
      background: #f1f3f4;
      font-size: 0.9em;
    }
    
    .contribution-bar-container {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .contribution-bar-bg {
      flex: 1;
      height: 12px;
      background: #e9ecef;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .contribution-bar-fill {
      height: 100%;
      transition: width 1s ease;
      border-radius: 6px;
    }
    
    .contribution-coverage {
      font-size: 0.8em;
      color: #666;
      white-space: nowrap;
    }
    
    .contributions-summary {
      background: rgba(102, 126, 234, 0.05);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
    }
    
    .contributions-summary h6 {
      margin: 0 0 10px 0;
      color: #667eea;
      font-size: 1em;
    }
    
    .contributions-summary ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .contributions-summary li {
      margin: 5px 0;
      font-size: 0.9em;
      color: #555;
    }
    
    /* Détail des catégories */
    .categories-detail h5 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 1.2em;
    }
    
    .category-detail-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 15px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    
    .category-detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .category-detail-header h6 {
      margin: 0;
      font-size: 1.1em;
      color: #333;
    }
    
    .category-score-badge {
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9em;
    }
    
    .category-description {
      color: #666;
      font-style: italic;
      margin: 10px 0 15px 0;
      font-size: 0.95em;
    }
    
    .category-stats {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin: 15px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-label {
      display: block;
      font-size: 0.8em;
      color: #666;
      margin-bottom: 5px;
    }
    
    .stat-value {
      display: block;
      font-weight: 600;
      color: #333;
      font-size: 1.1em;
    }
    
    .category-parameters {
      margin-top: 15px;
    }
    
    .category-parameters h7 {
      display: block;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
      font-size: 0.95em;
    }
    
    .param-mini {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      margin: 5px 0;
      border-radius: 6px;
      font-size: 0.9em;
    }
    
    .param-mini.tested {
      background: rgba(40, 167, 69, 0.1);
      border-left: 3px solid #28a745;
    }
    
    .param-mini.untested {
      background: rgba(108, 117, 125, 0.1);
      border-left: 3px solid #6c757d;
    }
    
    .param-name {
      flex: 1;
      font-weight: 500;
    }
    
    .param-score {
      margin: 0 10px;
      font-weight: 600;
    }
    
    .param-status {
      font-size: 0.8em;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(255,255,255,0.7);
    }
    
    /* Métadonnées */
    .metadata-detail {
      color: #333;
    }
    
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 25px;
    }
    
    .metadata-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
    }
    
    .metadata-card h6 {
      margin: 0 0 15px 0;
      color: #667eea;
      font-size: 1em;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 8px;
    }
    
    .metadata-card p {
      margin: 8px 0;
      font-size: 0.9em;
      display: flex;
      justify-content: space-between;
    }
    
    .metadata-card strong {
      color: #333;
    }
    
    .algorithm-info {
      background: linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(40, 167, 69, 0.02) 100%);
      border: 1px solid rgba(40, 167, 69, 0.2);
      border-radius: 8px;
      padding: 20px;
    }
    
    .algorithm-info h6 {
      margin: 0 0 15px 0;
      color: #28a745;
      font-size: 1.1em;
    }
    
    .algorithm-info ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .algorithm-info li {
      margin: 8px 0;
      font-size: 0.9em;
      color: #555;
    }
    
    /* ===== STYLES LIFE WATER EXISTANTS ===== */
    .life-water-report {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      background: white;
      margin: 20px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .life-water-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .life-water-header h2 {
      margin: 0 0 15px 0;
      font-size: 1.8em;
      font-weight: 600;
    }
    
    .life-water-header p {
      margin: 10px 0;
      font-size: 1em;
      opacity: 0.95;
      line-height: 1.5;
    }
    
    .life-water-header hr {
      border: none;
      height: 1px;
      background: rgba(255,255,255,0.3);
      margin: 20px 0;
    }
    
    .resultat-principal {
      background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .resultat-principal h3 {
      margin: 0 0 20px 0;
      font-size: 1.5em;
      font-weight: 600;
    }
    
    .score-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
      margin: 30px 0;
      flex-wrap: wrap;
    }
    
    .score-circle {
      width: 150px;
      height: 150px;
      border: 8px solid;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: white;
      font-weight: bold;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    
    .score-number {
      font-size: 2.5em;
      line-height: 1;
      font-weight: 700;
    }
    
    .score-label {
      font-size: 1em;
      opacity: 0.7;
      font-weight: 500;
    }
    
    .score-info {
      text-align: left;
      max-width: 300px;
    }
    
    .score-info h4 {
      font-size: 2em;
      margin: 0 0 10px 0;
      font-weight: 600;
    }
    
    .score-message {
      font-size: 1.2em;
      margin: 0 0 10px 0;
      font-weight: 500;
    }
    
    .score-details {
      font-size: 0.9em;
      opacity: 0.9;
      margin: 5px 0 0 0;
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
    
    .content-section {
      padding: 30px;
    }
    
    .points-attention {
      background: #fff3cd;
      border-left: 5px solid #ffc107;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .recommandations {
      background: #d1ecf1;
      border-left: 5px solid #17a2b8;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
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
    
    .footer-life-water {
      background: #e9ecef;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #dee2e6;
    }
    
    .life-water-report ul {
      padding-left: 20px;
      line-height: 1.6;
    }
    
    .life-water-report li {
      margin: 8px 0;
    }
    
    /* Responsive */
    @media screen and (max-width: 768px) {
      .accordion-header {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }
      
      .contribution-info {
        grid-template-columns: 1fr;
        gap: 8px;
        text-align: center;
      }
      
      .category-stats {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      
      .metadata-grid {
        grid-template-columns: 1fr;
      }
      
      .score-display {
        flex-direction: column;
        gap: 20px;
      }
      
      .score-circle {
        width: 120px;
        height: 120px;
      }
      
      .score-number {
        font-size: 2em;
      }
      
      .score-info {
        text-align: center;
      }
    }
  </style>`;
}

// ===== EXPORT GLOBAL =====
if (typeof window !== 'undefined') {
  // Fonctions principales corrigées
  window.fetchHubeauDataWithFallback = fetchHubeauDataWithFallback;
  window.fetchHubeauForCommuneComplete = fetchHubeauForCommuneComplete;
  window.calculateLifeWaterScore = calculateLifeWaterScore;
  window.generateLifeWaterHTML = generateLifeWaterHTML;
  
  // Fonctions de correction des doublons
  window.dedoublonnerParametres = dedoublonnerParametres;
  window.PARAMETRES_EQUIVALENTS = PARAMETRES_EQUIVALENTS;
  
  // Fonctions d'affichage améliorées
  window.formaterValeurParametre = formaterValeurParametre;
  window.getInterpretation = getInterpretation;
  window.genererBadgeQualite = genererBadgeQualite;
  
  // Fonctions accordéon
  window.generateAccordionSections = generateAccordionSections;
  window.generateContributionsDetailHTML = generateContributionsDetailHTML;
  window.generateCategoriesDetailHTML = generateCategoriesDetailHTML;
  window.generateMetadataDetailHTML = generateMetadataDetailHTML;
  window.generateNoDataHTML = generateNoDataHTML;
  window.generateAccordionCSS = generateAccordionCSS;
  window.toggleAccordion = toggleAccordion;
  window.toggleCategory = toggleCategory;
  
  // Fonctions scientifiques
  window.calculerScoreSeuilMax = calculerScoreSeuilMax;
  window.calculerScoreOptimalCentral = calculerScoreOptimalCentral;
  window.calculerScoreParametre = calculerScoreParametre;
  window.calculerScoreCategorieComplete = calculerScoreCategorieComplete;
  window.getNomCategorie = getNomCategorie;
  
  // Fonctions utilitaires
  window.debugHubeauData = debugHubeauData;
  window.findNearbyCommunes = findNearbyCommunes;
  window.calculateDistance = calculateDistance;
  window.getParameterValue = getParameterValue;
  window.cleanNumericValue = cleanNumericValue;
}

console.log('✅ Scoring Eau v5.3.2 FINAL COMPLET - Algorithme Scientifique Équitable avec toutes corrections chargé');
console.log('🔧 Corrections appliquées: Recherche étendue, dédoublonnage, pondérations, unités, accordéons');
console.log('📊 Interface: Sections accordéon dépliantes, affichage amélioré, responsive design');
console.log('🎯 Fonctionnalités: 3 accordéons interactifs, CSS complet, animations fluides');
