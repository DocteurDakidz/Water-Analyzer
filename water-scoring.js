/**
 * =============================================================================
 * SCORING EAU - ALGORITHME SCIENTIFIQUE
 * =============================================================================
 * Calcul scientifique avec bénéfice du doute et fiabilité transparente
 * Version 5.0 - Algorithme Scientifique Life Water
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

/**
 * Recherche étendue de données dans les communes voisines
 */
async function fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm = 20) {
  console.log('=== RECHERCHE HUBEAU AVEC FALLBACK GÉOGRAPHIQUE v5.0 ===');
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
  console.log('=== DEBUG DONNÉES HUBEAU ===');
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
  
  // Vérifier le mapping avec nos barèmes
  console.log('=== MAPPING AVEC NOS BARÈMES ===');
  
  // Paramètres trouvés dans PARAMETRES_SEUIL_MAX
  console.log('Dans PARAMETRES_SEUIL_MAX:');
  Object.keys(PARAMETRES_SEUIL_MAX).forEach(code => {
    if (parametersData[code]) {
      console.log(`✅ ${code} (${PARAMETRES_SEUIL_MAX[code].nom}) - TROUVÉ`);
    } else {
      console.log(`❌ ${code} (${PARAMETRES_SEUIL_MAX[code].nom}) - MANQUANT`);
    }
  });
  
  // Paramètres trouvés dans PARAMETRES_OPTIMAL_CENTRAL
  console.log('Dans PARAMETRES_OPTIMAL_CENTRAL:');
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

// ===== NOUVELLES FONCTIONS SCIENTIFIQUES v5.0 =====

/**
 * Calcule le score d'un paramètre avec seuil maximal
 * Formule: Score = max(0, 100 - 100 * ((valeur - valeur_ideale) / (valeur_max - valeur_ideale))^α)
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
 * Formule: Score = max(0, 100 - β * |valeur - valeur_ideale|^γ)
 */
function calculerScoreOptimalCentral(valeur, config) {
  const ecart = Math.abs(valeur - config.valeur_ideale);
  const score = 100 - config.beta * Math.pow(ecart, config.gamma);
  
  return Math.max(0, score);
}

/**
 * Identifie les catégories testées dans les données Hubeau
 */
function identifierCategoriesTestees(parametersData) {
  const categoriesTestees = new Set();
  
  // Vérifier chaque paramètre dans les données
  Object.keys(parametersData).forEach(codeHubeau => {
    // Chercher dans les paramètres à seuil max
    Object.entries(PARAMETRES_SEUIL_MAX).forEach(([code, config]) => {
      if (code === codeHubeau || (MAPPING_CODES_HUBEAU[code] && 
          MAPPING_CODES_HUBEAU[code] === MAPPING_CODES_HUBEAU[codeHubeau])) {
        categoriesTestees.add(config.categorie);
      }
    });
    
    // Chercher dans les paramètres optimal central
    Object.entries(PARAMETRES_OPTIMAL_CENTRAL).forEach(([code, config]) => {
      if (code === codeHubeau || (MAPPING_CODES_HUBEAU[code] && 
          MAPPING_CODES_HUBEAU[code] === MAPPING_CODES_HUBEAU[codeHubeau])) {
        categoriesTestees.add(config.categorie);
      }
    });
  });
  
  return Array.from(categoriesTestees);
}

/**
 * Calcule le score d'une catégorie
 */
function calculerScoreCategorie(categorie, parametersData) {
  const parametresCategorie = getParametresParCategorie(categorie);
  let scores = [];
  let details = [];
  
  parametresCategorie.forEach(param => {
    const codes = [param.code];
    if (MAPPING_CODES_HUBEAU[param.code]) {
      codes.push(MAPPING_CODES_HUBEAU[param.code]);
    }
    
    const valeurParam = getParameterValue(parametersData, codes);
    
    if (valeurParam !== null) {
      let score;
      
      if (PARAMETRES_SEUIL_MAX[param.code]) {
        score = calculerScoreSeuilMax(valeurParam.value, PARAMETRES_SEUIL_MAX[param.code]);
      } else if (PARAMETRES_OPTIMAL_CENTRAL[param.code]) {
        score = calculerScoreOptimalCentral(valeurParam.value, PARAMETRES_OPTIMAL_CENTRAL[param.code]);
      }
      
      scores.push(score);
      details.push({
        nom: param.nom,
        valeur: valeurParam.value,
        unite: valeurParam.unit,
        score: score,
        date: valeurParam.date
      });
    }
  });
  
  if (scores.length === 0) {
    return {
      score: null,
      teste: false,
      details: []
    };
  }
  
  // Moyenne des scores des paramètres de la catégorie
  const scoreMoyen = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  return {
    score: scoreMoyen,
    teste: true,
    details: details
  };
}

/**
 * ALGORITHME PRINCIPAL v5.0 - Calcul scientifique avec bénéfice du doute
 */
function calculateLifeWaterScore(parametersData, options = {}, sourceInfo = null) {
  console.log('=== CALCUL SCORING SCIENTIFIQUE v5.0 ===');
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
      sourceInfo: sourceInfo,
      metadata: {
        dateCalcul: new Date().toISOString(),
        version: '5.0 - Algorithme Scientifique',
        analyseApprofondie: options.analyseApprofondie || false,
        nombreParametres: 0
      }
    };
  }
  
  // ===== IDENTIFICATION DES CATÉGORIES TESTÉES =====
  const categoriesTestees = identifierCategoriesTestees(parametersData);
  const toutesCategories = Object.keys(PONDERATIONS_CATEGORIES);
  
  console.log(`Catégories testées: ${categoriesTestees.join(', ')}`);
  console.log(`Total catégories: ${toutesCategories.length}`);
  
  // ===== CALCUL DES SCORES PAR CATÉGORIE =====
  let contributions = {};
  let scoreFinalPondere = 0;
  let alertes = [];
  let recommandations = [];
  
  // Pour chaque catégorie possible
  toutesCategories.forEach(categorie => {
    const poids = PONDERATIONS_CATEGORIES[categorie];
    const resultCategorie = calculerScoreCategorie(categorie, parametersData);
    
    if (resultCategorie.teste) {
      // Catégorie testée - utiliser le score calculé
      const contribution = (poids * resultCategorie.score) / 100;
      scoreFinalPondere += contribution;
      
      contributions[categorie] = {
        points: contribution * 100, // Reconvertir en points sur 100
        source: "testé",
        score: resultCategorie.score,
        details: resultCategorie.details
      };
      
      // Générer alertes selon le score
      if (resultCategorie.score >= 80) {
        alertes.push(`✅ ${getNomCategorie(categorie)}: Excellent (${resultCategorie.score.toFixed(0)}/100)`);
      } else if (resultCategorie.score >= 60) {
        alertes.push(`🟡 ${getNomCategorie(categorie)}: Bon (${resultCategorie.score.toFixed(0)}/100)`);
      } else {
        alertes.push(`🟠 ${getNomCategorie(categorie)}: Améliorable (${resultCategorie.score.toFixed(0)}/100)`);
      }
      
    } else {
      // Catégorie non testée - bénéfice du doute à 50%
      const contribution = (poids * 50) / 100;
      scoreFinalPondere += contribution;
      
      contributions[categorie] = {
        points: contribution * 100,
        source: "bénéfice du doute",
        score: 50,
        details: []
      };
      
      alertes.push(`⚪ ${getNomCategorie(categorie)}: Non testé (50/100 par défaut)`);
    }
  });
  
  // ===== CALCUL DE LA FIABILITÉ =====
  const fiabilite = (categoriesTestees.length / toutesCategories.length) * 100;
  const infoFiabilite = getNiveauFiabilite(fiabilite);
  
  // ===== SCORE FINAL =====
  const scoreFinal = Math.round(scoreFinalPondere * 100);
  
  console.log(`Score final: ${scoreFinal}, Fiabilité: ${fiabilite.toFixed(0)}%`);
  
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
    recommandations.push(`⚠️ Analyse basée à seulement ${fiabilite.toFixed(0)}% sur des données réelles`);
    recommandations.push('🔬 Des analyses complémentaires amélioreront la précision du score');
  }
  
  if (scoreFinal < 60) {
    recommandations.push('📞 Contacter votre mairie pour signaler les problèmes détectés');
  }
  
  // Ajout info source si commune voisine
  if (sourceInfo && sourceInfo.type === 'commune_voisine') {
    alertes.unshift(`ℹ️ Analyse basée sur les données de ${sourceInfo.nomCommune} (${sourceInfo.distance.toFixed(1)}km)`);
  }
  
  // ===== ANALYSE COMPLÈTE LIFE WATER =====
  const categoriesManquantes = toutesCategories.filter(cat => !categoriesTestees.includes(cat));
  const analyseComplete = {
    disponible: true,
    message: `Pour un score ${fiabilite < 80 ? '100% fiable' : 'encore plus précis'}, Life Water peut effectuer des tests complémentaires de votre eau du robinet`,
    parametresManquants: categoriesManquantes,
    messageConfiance: `Ce score est basé à ${fiabilite.toFixed(0)}% sur des analyses réelles. ${(100 - fiabilite).toFixed(0)}% attribués par bénéfice du doute (niveau moyen supposé).`
  };
  
  return {
    score: scoreFinal,
    scorePrecis: scoreFinalPondere * 100,
    fiabilite: Math.round(fiabilite),
    niveauFiabilite: infoFiabilite.niveau,
    niveau: niveau,
    emoji: emoji,
    couleur: couleur,
    message: message,
    alertes: alertes,
    recommandations: [...new Set(recommandations)],
    contributions: contributions,
    analyseComplete: analyseComplete,
    sourceInfo: sourceInfo,
    metadata: {
      dateCalcul: new Date().toISOString(),
      version: '5.0 - Algorithme Scientifique',
      analyseApprofondie: options.analyseApprofondie || false,
      nombreParametres: nombreParametres,
      categoriesTestees: categoriesTestees.length,
      categoriesTotales: toutesCategories.length
    }
  };
}

/**
 * Obtient le nom lisible d'une catégorie
 */
function getNomCategorie(categorie) {
  const noms = {
    microbiologique: '🦠 Microbiologie',
    metauxLourds: '🔗 Métaux lourds', 
    pfas: '🧪 PFAS',
    nitrates: '⚗️ Nitrates',
    pesticides: '🌿 Pesticides',
    organoleptiques: '🌡️ Organoleptiques',
    chimie_generale: '⚖️ Chimie générale', // NOUVEAU
    medicaments: '🧬 Médicaments',
    microplastiques: '🔬 Microplastiques',
    chlore: '💧 Chlore'
  };
  return noms[categorie] || categorie;
}

// ===== GÉNÉRATION HTML MISE À JOUR v5.0 =====

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

  // ===== AFFICHAGE NORMAL v5.0 =====
  
  // Barres de contribution par catégorie
  let contributionsHTML = '';
  Object.entries(scoreResult.contributions).forEach(([categorie, contrib]) => {
    const couleurBarre = contrib.source === 'testé' ? 
      (contrib.score >= 75 ? '#28a745' : contrib.score >= 50 ? '#ffc107' : '#dc3545') : 
      '#6c757d';
    
    contributionsHTML += `
      <div class="contribution-item">
        <div class="contribution-header">
          <span class="contribution-name">${getNomCategorie(categorie)}</span>
          <span class="contribution-source ${contrib.source === 'testé' ? 'tested' : 'estimated'}">${contrib.source}</span>
          <span class="contribution-points">${contrib.points.toFixed(1)} pts</span>
        </div>
        <div class="contribution-bar">
          <div class="contribution-fill" style="width: ${contrib.score}%; background-color: ${couleurBarre};"></div>
        </div>
        <div class="contribution-score">${contrib.score}/100</div>
      </div>
    `;
  });

  return `
    <div class="life-water-report">
      <!-- En-tête Life Water -->
      <div class="life-water-header">
        <h2>🔬 <strong>Analyse scientifique de la qualité de votre eau</strong></h2>
        <p>Cette analyse vous est offerte par <strong>Life Water</strong>.</p>
        <p>Algorithme scientifique v5.0 basé sur les normes OMS et UE, avec calcul de fiabilité transparent.</p>
        <p><strong>Life Water est un groupe privé de recherche appliquée</strong>, engagé dans l'étude et l'amélioration de la qualité de l'eau destinée à la consommation humaine.</p>
        <hr>
        <p>💡 <strong>Analyse basée sur les dernières données disponibles avec bénéfice du doute scientifique.</strong></p>
      </div>

      <!-- Résultat Principal -->
      <div class="resultat-principal">
        <h3>📊 <strong>Résultat de votre analyse</strong></h3>
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
          </div>
        </div>

        <!-- Barre de fiabilité -->
        <div class="fiabilite-section">
          <h4>📊 <strong>Fiabilité de l'analyse</strong></h4>
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

        <!-- Informations détectées -->
        <div class="points-attention">
          <p><strong>📊 Informations détectées :</strong></p>
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
          <p><strong>Paramètres non analysés :</strong> ${scoreResult.analyseComplete.parametresManquants.map(p => getNomCategorie(p)).join(', ')}</p>
          ` : ''}
          <button onclick="alert('Contactez Life Water pour une analyse personnalisée')" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 1.1em;">
            🧪 Demander une analyse 100% fiable
          </button>
        </div>

        <!-- Footer -->
        <div class="footer-life-water">
          <h4>📅 <strong>Informations sur cette analyse</strong></h4>
          
          <p><strong>📊 Méthodologie :</strong> Algorithme scientifique v${scoreResult.metadata.version}</p>
          <p><strong>🎯 Catégories analysées :</strong> ${scoreResult.metadata.categoriesTestees}/${scoreResult.metadata.categoriesTotales}</p>
          <p><strong>📍 Source :</strong> ${scoreResult.sourceInfo ? scoreResult.sourceInfo.nomCommune : 'Données Hubeau'}</p>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>📋 Normes utilisées :</strong> UE Directive 2020/2184, OMS Guidelines 2022, Code de la santé publique français. Principe : aucun paramètre ajouté sans norme officielle reconnue.</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>🧮 Principe du bénéfice du doute :</strong> Les catégories non testées reçoivent un score neutre de 50/100, représentant un niveau moyen supposé. Cette approche évite de pénaliser injustement l'absence de tests rares tout en encourageant les analyses complètes.</p>
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
      /* Styles spécifiques v5.0 */
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
      
      .contribution-source {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        font-weight: 500;
      }
      
      .contribution-source.tested {
        background: #d4edda;
        color: #155724;
      }
      
      .contribution-source.estimated {
        background: #e2e3e5;
        color: #495057;
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
    </style>
  `;
}

// ===== EXPORT GLOBAL =====
if (typeof window !== 'undefined') {
  window.calculateLifeWaterScore = calculateLifeWaterScore;
  window.generateLifeWaterHTML = generateLifeWaterHTML;
  window.fetchHubeauDataWithFallback = fetchHubeauDataWithFallback;
  window.calculerScoreSeuilMax = calculerScoreSeuilMax;
  window.calculerScoreOptimalCentral = calculerScoreOptimalCentral;
  window.identifierCategoriesTestees = identifierCategoriesTestees;
  window.calculerScoreCategorie = calculerScoreCategorie;
  window.getNomCategorie = getNomCategorie;
  window.debugHubeauData = debugHubeauData;
}

console.log('✅ Scoring Eau v5.1 - Algorithme Scientifique enrichi avec normes officielles chargé');
