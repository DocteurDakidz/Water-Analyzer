/**
 * =============================================================================
 * SCORING EAU - PARTIE 1/6 - FONCTIONS UTILITAIRES ET RECHERCHE ÉTENDUE
 * =============================================================================
 * Version 5.4 - Recherche étendue 36 mois + Analyse temporelle intelligente
 * =============================================================================
 */

// ===== FONCTIONS UTILITAIRES DE BASE =====

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
          raw: param.latestValue,
          methode: param.latestValue.methode || 'standard',
          historique: param.latestValue.historique || null
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

function calculerEcartType(valeurs) {
  if (valeurs.length <= 1) return 0;
  
  const moyenne = valeurs.reduce((sum, val) => sum + val, 0) / valeurs.length;
  const variance = valeurs.reduce((sum, val) => sum + Math.pow(val - moyenne, 2), 0) / valeurs.length;
  return Math.sqrt(variance);
}

// ===== RECHERCHE HUBEAU ÉTENDUE 36 MOIS v5.4 =====

/**
 * ✅ NOUVELLE VERSION : Recherche étendue à 36 mois avec analyse temporelle
 */
async function fetchHubeauForCommuneComplete(codeCommune, moisRecherche = 36) {
  console.log(`🔍 Recherche étendue pour commune ${codeCommune} sur ${moisRecherche} mois (3 ans)`);
  
  // Calculer les dates - ÉTENDU À 36 MOIS
  const dateFinISO = new Date().toISOString().split('T')[0];
  const dateDebut = new Date();
  dateDebut.setMonth(dateDebut.getMonth() - moisRecherche);
  const dateDebutISO = dateDebut.toISOString().split('T')[0];
  
  console.log(`📅 Période de recherche: ${dateDebutISO} → ${dateFinISO} (${moisRecherche} mois)`);
  
  const url = `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis?code_commune=${codeCommune}&date_min_prelevement=${dateDebutISO}&date_max_prelevement=${dateFinISO}&size=2000&sort=desc`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Résultats bruts trouvés: ${data.data?.length || 0} sur ${moisRecherche} mois`);
    
    const parametersData = {};
    let nomCommune = null;
    let compteurParametres = {};
    let analysesPeriodes = {}; // Compteur par année
    let repartitionTemporelle = {
      recent: 0,    // < 6 mois
      moyen: 0,     // 6-18 mois
      ancien: 0     // > 18 mois
    };
    
    if (data.data && data.data.length > 0) {
      nomCommune = data.data[0].nom_commune || `Commune ${codeCommune}`;
      
      // ✅ COLLECTE AVEC ANALYSE TEMPORELLE
      data.data.forEach(result => {
        const paramCode = result.code_parametre;
        const datePrelevement = result.date_prelevement;
        const ageEnJours = Math.floor((new Date() - new Date(datePrelevement)) / (1000 * 60 * 60 * 24));
        const annee = new Date(datePrelevement).getFullYear();
        
        // Compter par période
        if (ageEnJours <= 180) {
          repartitionTemporelle.recent++;
        } else if (ageEnJours <= 540) {
          repartitionTemporelle.moyen++;
        } else {
          repartitionTemporelle.ancien++;
        }
        
        // Compter par année
        if (!analysesPeriodes[annee]) analysesPeriodes[annee] = 0;
        analysesPeriodes[annee]++;
        
        // Compter par paramètre
        compteurParametres[paramCode] = (compteurParametres[paramCode] || 0) + 1;
        
        // ✅ STOCKAGE AVEC HISTORIQUE COMPLET
        if (!parametersData[paramCode]) {
          parametersData[paramCode] = {
            name: result.libelle_parametre,
            unit: result.unite,
            latestValue: {
              numeric: result.resultat_numerique,
              alphanumeric: result.resultat_alphanumerique
            },
            latestDate: datePrelevement,
            totalAnalyses: 1,
            allValues: [{
              numeric: result.resultat_numerique,
              alphanumeric: result.resultat_alphanumerique,
              date: datePrelevement,
              age: ageEnJours,
              annee: annee,
              periode: ageEnJours <= 180 ? 'recent' : ageEnJours <= 540 ? 'moyen' : 'ancien'
            }]
          };
        } else {
          // Ajouter à l'historique
          parametersData[paramCode].allValues.push({
            numeric: result.resultat_numerique,
            alphanumeric: result.resultat_alphanumerique,
            date: datePrelevement,
            age: ageEnJours,
            annee: annee,
            periode: ageEnJours <= 180 ? 'recent' : ageEnJours <= 540 ? 'moyen' : 'ancien'
          });
          
          // Mettre à jour si plus récent
          if (new Date(datePrelevement) > new Date(parametersData[paramCode].latestDate)) {
            parametersData[paramCode].latestValue = {
              numeric: result.resultat_numerique,
              alphanumeric: result.resultat_alphanumerique
            };
            parametersData[paramCode].latestDate = datePrelevement;
          }
          
          parametersData[paramCode].totalAnalyses++;
        }
      });
      
      // ✅ OPTIMISATION TEMPORELLE INTELLIGENTE
      Object.keys(parametersData).forEach(paramCode => {
        const param = parametersData[paramCode];
        const valeurOptimale = obtenirValeurOptimaleTemporelle(param, paramCode);
        
        if (valeurOptimale !== null) {
          param.latestValue.numeric = valeurOptimale.valeur;
          param.latestValue.methode = valeurOptimale.methode;
          param.latestValue.historique = valeurOptimale.historique;
          param.latestValue.strategieTemporelle = valeurOptimale.strategie;
        }
      });
      
      console.log(`✅ Paramètres collectés: ${Object.keys(parametersData).length}`);
      console.log(`📈 Répartition temporelle: Récent ${repartitionTemporelle.recent}, Moyen ${repartitionTemporelle.moyen}, Ancien ${repartitionTemporelle.ancien}`);
      console.log(`🎯 Optimisation temporelle intelligente appliquée`);
      
      // Log des paramètres optimisés
      Object.entries(compteurParametres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([code, count]) => {
          const param = parametersData[code];
          const methode = param.latestValue?.methode || 'standard';
          const strategie = param.latestValue?.strategieTemporelle || 'N/A';
          const periodeMin = Math.min(...param.allValues.map(v => v.annee));
          const periodeMax = Math.max(...param.allValues.map(v => v.annee));
          console.log(`${code}: ${param?.name} - ${count} analyses (${periodeMin}-${periodeMax}) → ${methode} (${strategie})`);
        });
    }
    
    return {
      data: parametersData,
      nomCommune: nomCommune,
      metadata: {
        totalResultats: data.data?.length || 0,
        parametresUniques: Object.keys(parametersData).length,
        periodeRecherche: `${dateDebutISO} à ${dateFinISO}`,
        moisRecherche: moisRecherche,
        periodeAnnees: Object.keys(analysesPeriodes).sort(),
        repartitionTemporelle: repartitionTemporelle,
        analysesPeriodes: analysesPeriodes,
        compteurParametres: compteurParametres,
        optimisationTemporelle: true
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
 * ✅ ANALYSE TEMPORELLE INTELLIGENTE : Obtenir la valeur optimale
 */
function obtenirValeurOptimaleTemporelle(param, paramCode) {
  if (!param.allValues || param.allValues.length === 0) {
    return null;
  }
  
  // Filtrer et trier les valeurs valides par âge
  const valeursValides = param.allValues
    .map(v => {
      let val = v.numeric;
      if (val === null || val === undefined) {
        val = cleanNumericValue(v.alphanumeric);
      }
      return { 
        valeur: val, 
        age: v.age, 
        date: v.date, 
        annee: v.annee,
        periode: v.periode
      };
    })
    .filter(v => v.valeur !== null && !isNaN(v.valeur))
    .sort((a, b) => a.age - b.age); // Plus récent d'abord
  
  if (valeursValides.length === 0) {
    return null;
  }
  
  // ✅ RÉPARTITION TEMPORELLE INTELLIGENTE
  const valeursRecentes = valeursValides.filter(v => v.periode === 'recent');   // < 6 mois
  const valeursMoyennes = valeursValides.filter(v => v.periode === 'moyen');    // 6-18 mois
  const valeursAnciennes = valeursValides.filter(v => v.periode === 'ancien');  // > 18 mois
  
  // Détermine la stratégie selon le paramètre ET la disponibilité
  const strategieTemporelle = determinerStrategieTemporelle(paramCode, param.name, {
    recentes: valeursRecentes.length,
    moyennes: valeursMoyennes.length,
    anciennes: valeursAnciennes.length,
    total: valeursValides.length
  });
  
  let valeurFinale;
  let methode;
  let strategie;
  
  // ✅ APPLICATION DE LA STRATÉGIE TEMPORELLE
  switch (strategieTemporelle) {
    case 'recent_strict':
      // Privilégier absolument le récent
      if (valeursRecentes.length >= 2) {
        valeurFinale = valeursRecentes.slice(0, 3).reduce((sum, v) => sum + v.valeur, 0) / Math.min(3, valeursRecentes.length);
        methode = `recent_moy_${Math.min(3, valeursRecentes.length)}`;
        strategie = 'Données récentes privilégiées';
      } else if (valeursRecentes.length === 1) {
        valeurFinale = valeursRecentes[0].valeur;
        methode = 'recent_unique';
        strategie = 'Valeur récente unique';
      } else {
        // Fallback sur moyennes si pas de récentes
        valeurFinale = valeursMoyennes.length > 0 ? 
          valeursMoyennes[0].valeur : 
          valeursValides[0].valeur;
        methode = valeursMoyennes.length > 0 ? 'fallback_moyen' : 'fallback_ancien';
        strategie = 'Fallback: pas de données récentes';
      }
      break;
      
    case 'recent_pondere':
      // Pondération par âge avec privilège au récent
      let sommeP = 0;
      let poidsP = 0;
      valeursValides.forEach(v => {
        const poids = Math.exp(-v.age / 120); // Décroissance sur 4 mois
        sommeP += v.valeur * poids;
        poidsP += poids;
      });
      valeurFinale = sommeP / poidsP;
      methode = 'pondere_recent';
      strategie = 'Pondération privilégiant le récent';
      break;
      
    case 'pire_cas_recent':
      // Pire cas mais en privilégiant le récent
      if (valeursRecentes.length > 0) {
        valeurFinale = Math.max(...valeursRecentes.map(v => v.valeur));
        methode = 'pire_cas_recent';
        strategie = 'Pire cas sur données récentes';
      } else if (valeursMoyennes.length > 0) {
        valeurFinale = Math.max(...valeursMoyennes.map(v => v.valeur));
        methode = 'pire_cas_moyen';
        strategie = 'Pire cas sur données moyennes';
      } else {
        valeurFinale = Math.max(...valeursValides.map(v => v.valeur));
        methode = 'pire_cas_global';
        strategie = 'Pire cas sur toutes données';
      }
      break;
      
    case 'tendance_amelioration':
      // Analyser la tendance temporelle
      if (valeursValides.length >= 4) {
        const recent = valeursRecentes.length > 0 ? 
          valeursRecentes.reduce((sum, v) => sum + v.valeur, 0) / valeursRecentes.length : null;
        const ancien = valeursAnciennes.length > 0 ? 
          valeursAnciennes.reduce((sum, v) => sum + v.valeur, 0) / valeursAnciennes.length : null;
        
        if (recent !== null && ancien !== null) {
          // Si amélioration dans le temps, favoriser le récent
          if (recent < ancien) {
            valeurFinale = recent;
            methode = 'tendance_amelioration';
            strategie = 'Tendance d\'amélioration détectée';
          } else {
            // Sinon, pondération équilibrée
            valeurFinale = (recent * 0.7) + (ancien * 0.3);
            methode = 'tendance_stable';
            strategie = 'Tendance stable ou dégradation';
          }
        } else {
          valeurFinale = valeursValides[0].valeur;
          methode = 'recent_defaut';
          strategie = 'Données insuffisantes pour tendance';
        }
      } else {
        valeurFinale = valeursValides[0].valeur;
        methode = 'recent_simple';
        strategie = 'Trop peu de données pour analyse';
      }
      break;
      
    default:
      // Moyenne pondérée standard
      valeurFinale = valeursValides.reduce((sum, v) => sum + v.valeur, 0) / valeursValides.length;
      methode = 'moyenne_standard';
      strategie = 'Moyenne de toutes les données';
  }
  
  // ✅ HISTORIQUE DÉTAILLÉ
  const historique = {
    total: valeursValides.length,
    recentes: valeursRecentes.length,
    moyennes: valeursMoyennes.length,
    anciennes: valeursAnciennes.length,
    periodeMin: Math.min(...valeursValides.map(v => v.annee)),
    periodeMax: Math.max(...valeursValides.map(v => v.annee)),
    valeurMin: Math.min(...valeursValides.map(v => v.valeur)),
    valeurMax: Math.max(...valeursValides.map(v => v.valeur)),
    ecartType: calculerEcartType(valeursValides.map(v => v.valeur)),
    valeurRecente: valeursRecentes.length > 0 ? valeursRecentes[0].valeur : null,
    dateRecente: valeursRecentes.length > 0 ? valeursRecentes[0].date : null
  };
  
  return {
    valeur: valeurFinale,
    methode: methode,
    strategie: strategie,
    historique: historique
  };
}
/**
 * =============================================================================
 * SCORING EAU - PARTIE 2/6 - STRATÉGIES TEMPORELLES ET FALLBACK
 * =============================================================================
 * Version 5.4 - Stratégies adaptées par paramètre + Recherche géographique
 * =============================================================================
 */

/**
 * ✅ DÉTERMINATION DES STRATÉGIES TEMPORELLES PAR PARAMÈTRE
 */
function determinerStrategieTemporelle(paramCode, nomParametre, repartition) {
  console.log(`🎯 Stratégie pour ${paramCode} (${nomParametre}):`, repartition);
  
  // ===== PARAMÈTRES MICROBIOLOGIQUES =====
  // Priorité absolue aux données récentes (contamination ponctuelle)
  if (['1506', '1449', '1507', '6455', '1447', '1042', '5440'].includes(paramCode)) {
    if (repartition.recentes >= 1) {
      return 'pire_cas_recent'; // Prendre le pire cas récent
    } else {
      return 'pire_cas_recent'; // Même logique en fallback
    }
  }
  
  // ===== CHLORE =====
  // Extrêmement volatil - TOUJOURS privilégier le récent
  if (['1398', '1399', '1959', '1958'].includes(paramCode)) {
    return 'recent_strict';
  }
  
  // ===== MÉTAUX LOURDS =====
  // Accumulation lente - Analyser les tendances si assez de données
  if (['1369', '1382', '1388', '1375', '1392', '1393', '1394'].includes(paramCode)) {
    if (repartition.total >= 4 && repartition.recentes >= 1) {
      return 'tendance_amelioration'; // Analyser l'évolution
    } else if (repartition.recentes >= 2) {
      return 'recent_pondere'; // Pondération récente
    } else {
      return 'recent_pondere'; // Fallback pondération
    }
  }
  
  // ===== PARAMÈTRES PHYSICO-CHIMIQUES STABLES =====
  // pH, conductivité, dureté - Évolution lente
  if (['1302', '1303', '1345', '1337', '1338', '1374', '1372', '1367'].includes(paramCode)) {
    if (repartition.recentes >= 2) {
      return 'recent_pondere'; // Privilégier récent avec pondération
    } else if (repartition.total >= 3) {
      return 'recent_pondere'; // Utiliser toutes les données avec pondération
    } else {
      return 'recent_strict'; // Fallback sur récent
    }
  }
  
  // ===== PESTICIDES ET PFAS =====
  // Contamination potentiellement variable - Pire cas récent
  if (paramCode.startsWith('6') || nomParametre.toLowerCase().includes('pesticide') || 
      ['6561', '5979', '8741'].includes(paramCode)) {
    if (repartition.recentes >= 1) {
      return 'pire_cas_recent';
    } else {
      return 'pire_cas_recent'; // Fallback
    }
  }
  
  // ===== NITRATES/NITRITES =====
  // Contamination agricole saisonnière - Privilégier récent
  if (['1340', '1335', '1339'].includes(paramCode)) {
    if (repartition.recentes >= 2) {
      return 'recent_pondere';
    } else {
      return 'recent_strict';
    }
  }
  
  // ===== ORGANOLEPTIQUES =====
  // Paramètres de confort - Récent pondéré
  if (['1304', '1295', '1309'].includes(paramCode)) {
    return 'recent_pondere';
  }
  
  // ===== DÉFAUT =====
  // Pour tous les autres paramètres
  return 'recent_pondere';
}

/**
 * ✅ VERSION AMÉLIORÉE : Fallback géographique avec recherche 36 mois
 */
async function fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm = 20, moisRecherche = 36) {
  console.log('=== RECHERCHE HUBEAU ÉTENDUE 36 MOIS v5.4 ===');
  console.log(`Commune: ${codeCommune}, Période: ${moisRecherche} mois (3 ans), Rayon: ${rayonKm}km`);
  
  // 1. ✅ RECHERCHE PRINCIPALE ÉTENDUE
  console.log('🎯 Recherche étendue 36 mois commune principale...');
  let result = await fetchHubeauForCommuneComplete(codeCommune, moisRecherche);
  
  // Critère d'acceptation : au moins 5 paramètres différents
  if (result.data && Object.keys(result.data).length >= 5) {
    console.log(`✅ Données suffisantes: ${Object.keys(result.data).length} paramètres sur ${moisRecherche} mois`);
    console.log(`📊 Couverture temporelle: ${result.metadata.periodeAnnees?.join('-') || 'N/A'}`);
    console.log(`🔍 Répartition: R:${result.metadata.repartitionTemporelle?.recent} M:${result.metadata.repartitionTemporelle?.moyen} A:${result.metadata.repartitionTemporelle?.ancien}`);
    
    return {
      parametersData: result.data,
      sourceInfo: {
        type: 'commune_principale_etendue',
        codeCommune: codeCommune,
        nomCommune: result.nomCommune || `Commune ${codeCommune}`,
        distance: 0,
        nombreParametres: Object.keys(result.data).length,
        metadata: result.metadata,
        periodeEtendue: true,
        moisRecherche: moisRecherche,
        anneesAnalysees: result.metadata.periodeAnnees,
        qualiteTemporelle: calculerQualiteTemporelle(result.metadata.repartitionTemporelle)
      }
    };
  }
  
  console.log(`⚠️ Données insuffisantes (${Object.keys(result.data).length} paramètres)`);
  console.log('🔍 Recherche dans les communes voisines...');
  
  // 2. ✅ RECHERCHE DANS LES COMMUNES VOISINES (aussi 36 mois)
  try {
    const communesVoisines = await findNearbyCommunes(lat, lon, rayonKm);
    console.log(`📍 Communes voisines trouvées: ${communesVoisines.length}`);
    
    for (const commune of communesVoisines.slice(0, 5)) {
      console.log(`🔍 Test: ${commune.nom} (${commune.code}) à ${commune.distance.toFixed(1)}km`);
      
      const resultVoisine = await fetchHubeauForCommuneComplete(commune.code, moisRecherche);
      
      if (resultVoisine.data && Object.keys(resultVoisine.data).length >= 5) {
        console.log(`✅ Données suffisantes: ${Object.keys(resultVoisine.data).length} paramètres`);
        console.log(`📊 Couverture: ${resultVoisine.metadata.periodeAnnees?.join('-') || 'N/A'}`);
        
        return {
          parametersData: resultVoisine.data,
          sourceInfo: {
            type: 'commune_voisine_etendue',
            codeCommune: commune.code,
            nomCommune: commune.nom,
            distance: commune.distance,
            nombreParametres: Object.keys(resultVoisine.data).length,
            communePrincipale: codeCommune,
            metadata: resultVoisine.metadata,
            periodeEtendue: true,
            moisRecherche: moisRecherche,
            anneesAnalysees: resultVoisine.metadata.periodeAnnees,
            qualiteTemporelle: calculerQualiteTemporelle(resultVoisine.metadata.repartitionTemporelle)
          }
        };
      }
    }
    
    console.log('❌ Aucune commune voisine avec données suffisantes sur 36 mois');
    
  } catch (error) {
    console.error('Erreur lors de la recherche géographique étendue:', error);
  }
  
  // 3. ✅ RETOUR DES DONNÉES LIMITÉES AVEC TRANSPARENCE
  return {
    parametersData: result.data,
    sourceInfo: {
      type: 'donnees_limitees_etendues',
      codeCommune: codeCommune,
      nomCommune: result.nomCommune || `Commune ${codeCommune}`,
      distance: 0,
      nombreParametres: Object.keys(result.data).length,
      message: `Seulement ${Object.keys(result.data).length} paramètres trouvés sur ${moisRecherche} mois`,
      metadata: result.metadata,
      periodeEtendue: true,
      moisRecherche: moisRecherche,
      limitationsDetectees: true
    }
  };
}

/**
 * ✅ NOUVELLE FONCTION : Calcul de la qualité temporelle
 */
function calculerQualiteTemporelle(repartition) {
  if (!repartition) return 'inconnue';
  
  const total = repartition.recent + repartition.moyen + repartition.ancien;
  if (total === 0) return 'aucune';
  
  const pourcentageRecent = (repartition.recent / total) * 100;
  const pourcentageMoyen = (repartition.moyen / total) * 100;
  
  if (pourcentageRecent >= 60) {
    return 'excellente'; // Majorité de données récentes
  } else if (pourcentageRecent >= 30) {
    return 'bonne'; // Mix équilibré
  } else if (pourcentageMoyen >= 40) {
    return 'moyenne'; // Données majoritairement moyennes
  } else {
    return 'limitee'; // Majorité de données anciennes
  }
}

// ===== FONCTIONS GÉOGRAPHIQUES (optimisées) =====

async function findNearbyCommunes(lat, lon, rayonKm) {
  try {
    const url = `https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&distance=${rayonKm * 1000}&fields=nom,code,centre&format=json&geometry=centre`;
    
    const response = await fetch(url);
    const communes = await response.json();
    
    if (!Array.isArray(communes)) {
      console.log('⚠️ Réponse API communes invalide');
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
      .filter(commune => commune.distance > 0.1) // Éviter la commune elle-même
      .sort((a, b) => a.distance - b.distance) // Trier par proximité
      .slice(0, 10); // Limiter à 10 communes
    
    console.log(`📍 ${communesAvecDistance.length} communes voisines dans ${rayonKm}km`);
    return communesAvecDistance;
    
  } catch (error) {
    console.error('Erreur lors de la recherche de communes voisines:', error);
    return [];
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ===== CORRECTION DES DOUBLONS v5.4 =====

/**
 * ✅ DÉDOUBLONNAGE AMÉLIORÉ avec priorité temporelle
 */
function dedoublonnerParametres(parametersData) {
  console.log('=== DÉDOUBLONNAGE DES PARAMÈTRES v5.4 ===');
  
  const parametersClean = { ...parametersData };
  const codesSupprimes = [];
  const substitutions = [];
  
  Object.entries(PARAMETRES_EQUIVALENTS).forEach(([groupKey, group]) => {
    console.log(`🔍 Vérification groupe: ${group.nom}`);
    
    // Chercher quels codes de ce groupe sont disponibles
    const codesDisponibles = group.codes.filter(code => parametersData[code]);
    
    if (codesDisponibles.length > 1) {
      console.log(`❌ Doublon détecté: ${group.nom} - Codes: ${codesDisponibles.join(', ')}`);
      
      // ✅ NOUVELLE LOGIQUE : Priorité selon qualité temporelle
      let codeAGarder = null;
      let meilleurScore = -1;
      
      codesDisponibles.forEach(code => {
        const param = parametersData[code];
        let score = 0;
        
        // Points pour la priorité définie
        const indexPriorite = group.priorite.indexOf(code);
        if (indexPriorite !== -1) {
          score += (group.priorite.length - indexPriorite) * 10;
        }
        
        // Points pour la fraîcheur des données
        if (param.latestDate) {
          const ageJours = Math.floor((new Date() - new Date(param.latestDate)) / (1000 * 60 * 60 * 24));
          if (ageJours <= 180) score += 20; // Très récent
          else if (ageJours <= 540) score += 10; // Récent
          else score += 5; // Ancien
        }
        
        // Points pour le nombre d'analyses
        if (param.totalAnalyses) {
          score += Math.min(param.totalAnalyses, 10); // Max 10 points
        }
        
        // Points pour la méthode d'optimisation
        if (param.latestValue?.methode) {
          if (param.latestValue.methode.includes('recent')) score += 5;
          if (param.latestValue.methode.includes('pondere')) score += 3;
        }
        
        console.log(`  ${code}: score ${score} (priorité: ${indexPriorite}, méthode: ${param.latestValue?.methode || 'N/A'})`);
        
        if (score > meilleurScore) {
          meilleurScore = score;
          codeAGarder = code;
        }
      });
      
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
              raisonSuppression: 'Doublon - qualité temporelle inférieure',
              scoreGarde: meilleurScore
            });
          }
        });
        
        console.log(`✅ Gardé: ${codeAGarder} (score: ${meilleurScore}), supprimé: ${codesDisponibles.filter(c => c !== codeAGarder).join(', ')}`);
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
      supprimes: codesSupprimes.length,
      ameliorationTemporelle: true
    }
  };
}
/**
 * =============================================================================
 * SCORING EAU - PARTIE 3/6 - AFFICHAGE ET SCORING SCIENTIFIQUE
 * =============================================================================
 * Version 5.4 - Affichage amélioré + Calcul scientifique avec historique
 * =============================================================================
 */

// ===== FONCTIONS D'AFFICHAGE AMÉLIORÉES v5.4 =====

/**
 * ✅ FORMATAGE INTELLIGENT avec informations temporelles
 */
function formaterValeurParametre(valeur, unite, nom, methodeOptimisation = null, historique = null) {
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
      interpretation: 'Aucune contamination détectée',
      methodeInfo: methodeOptimisation ? `Méthode: ${methodeOptimisation}` : '',
      contexteTemporel: historique ? genererContexteTemporel(historique) : ''
    };
  }
  
  // ✅ GESTION DES UNITÉS AMÉLIORÉE
  let uniteAffichee = unite;
  if (!unite || unite === 'undefined' || unite === 'null') {
    if (nom.includes('pH')) {
      uniteAffichee = 'unités pH';
    } else if (nom.includes('Conductivité')) {
      uniteAffichee = 'µS/cm';
    } else if (nom.includes('Température')) {
      uniteAffichee = '°C';
    } else if (parametresMicrobiologiques.some(p => nom.includes(p))) {
      uniteAffichee = nom.includes('aérobies 22°C') ? 'UFC/mL' : 'UFC/100mL';
    } else {
      uniteAffichee = '';
    }
  }
  
  // ✅ FORMATAGE NUMÉRIQUE INTELLIGENT
  let valeurAffichee = valeur;
  if (typeof valeur === 'number') {
    if (valeur === 0 && parametresMicrobiologiques.some(p => nom.includes(p))) {
      valeurAffichee = 'Non détecté';
      uniteAffichee = '';
    } else if (valeur < 0.001 && valeur > 0) {
      valeurAffichee = '< 0.001';
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
    interpretation: getInterpretationAvancee(valeur, nom, historique),
    methodeInfo: methodeOptimisation ? `Optimisation: ${methodeOptimisation}` : '',
    contexteTemporel: historique ? genererContexteTemporel(historique) : ''
  };
}

/**
 * ✅ INTERPRÉTATION AVANCÉE avec contexte historique
 */
function getInterpretationAvancee(valeur, nom, historique = null) {
  const parametresMicrobiologiques = [
    'E. coli', 'E. coli (MF)', 'Entérocoques', 'Entérocoques (MS)',
    'Bactéries coliformes', 'Bactéries sulfito-réductrices'
  ];
  
  let interpretation = '';
  
  // Interprétation de base
  if (parametresMicrobiologiques.some(p => nom.includes(p))) {
    if (valeur === 0) {
      interpretation = 'Aucune contamination - Excellent';
    } else if (valeur <= 1) {
      interpretation = 'Contamination très faible';
    } else if (valeur <= 10) {
      interpretation = 'Contamination modérée - Surveillance recommandée';
    } else {
      interpretation = 'Contamination importante - Action requise';
    }
  } else if (nom.includes('pH')) {
    if (valeur >= 6.5 && valeur <= 8.5) {
      interpretation = 'pH optimal pour la consommation';
    } else if (valeur < 6.5) {
      interpretation = 'Eau légèrement acide';
    } else {
      interpretation = 'Eau légèrement basique';
    }
  } else if (nom.includes('Nitrates')) {
    if (valeur <= 25) {
      interpretation = 'Niveau acceptable';
    } else if (valeur <= 40) {
      interpretation = 'Niveau élevé - surveillance';
    } else {
      interpretation = 'Niveau préoccupant';
    }
  } else {
    interpretation = 'Valeur dans les normes';
  }
  
  // ✅ AJOUT DU CONTEXTE TEMPOREL
  if (historique && historique.total > 1) {
    const tendance = analyserTendance(historique);
    if (tendance !== 'stable') {
      interpretation += ` • Tendance: ${tendance}`;
    }
  }
  
  return interpretation;
}

/**
 * ✅ GÉNÉRATION DU CONTEXTE TEMPOREL
 */
function genererContexteTemporel(historique) {
  if (!historique || historique.total <= 1) return '';
  
  const contexte = [];
  
  // Période couverte
  if (historique.periodeMin && historique.periodeMax) {
    if (historique.periodeMin === historique.periodeMax) {
      contexte.push(`Données de ${historique.periodeMax}`);
    } else {
      contexte.push(`Période ${historique.periodeMin}-${historique.periodeMax}`);
    }
  }
  
  // Répartition temporelle
  const repartition = [];
  if (historique.recentes > 0) repartition.push(`${historique.recentes} récente(s)`);
  if (historique.moyennes > 0) repartition.push(`${historique.moyennes} moyenne(s)`);
  if (historique.anciennes > 0) repartition.push(`${historique.anciennes} ancienne(s)`);
  
  if (repartition.length > 0) {
    contexte.push(`${historique.total} analyses: ${repartition.join(', ')}`);
  }
  
  // Variabilité
  if (historique.ecartType !== undefined && historique.total >= 3) {
    const coeffVar = (historique.ecartType / ((historique.valeurMin + historique.valeurMax) / 2)) * 100;
    if (coeffVar < 10) {
      contexte.push('Très stable');
    } else if (coeffVar < 30) {
      contexte.push('Modérément variable');
    } else {
      contexte.push('Très variable');
    }
  }
  
  return contexte.join(' • ');
}

/**
 * ✅ ANALYSE DE TENDANCE
 */
function analyserTendance(historique) {
  if (!historique.valeurRecente || !historique.valeurMin || !historique.valeurMax) {
    return 'stable';
  }
  
  const valeurRecente = historique.valeurRecente;
  const moyenne = (historique.valeurMin + historique.valeurMax) / 2;
  
  // Si la valeur récente est très différente de la moyenne
  const ecartPourcentage = Math.abs(valeurRecente - moyenne) / moyenne * 100;
  
  if (ecartPourcentage < 10) {
    return 'stable';
  } else if (valeurRecente < moyenne * 0.8) {
    return 'amélioration';
  } else if (valeurRecente > moyenne * 1.2) {
    return 'dégradation';
  } else {
    return 'stable';
  }
}

/**
 * ✅ BADGES DE QUALITÉ AMÉLIORÉS
 */
function genererBadgeQualite(score, methode = null) {
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
  
  // Ajout d'indicateur de méthode si disponible
  let indicateurMethode = '';
  if (methode) {
    if (methode.includes('recent')) indicateurMethode = ' 📅';
    else if (methode.includes('pondere')) indicateurMethode = ' ⚖️';
    else if (methode.includes('pire_cas')) indicateurMethode = ' ⚠️';
    else if (methode.includes('tendance')) indicateurMethode = ' 📈';
  }
  
  return {
    couleur,
    texte,
    emoji,
    methode: methode || 'standard',
    html: `<span style="background: ${couleur}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600;">${emoji} ${texte}${indicateurMethode}</span>`
  };
}

// ===== FONCTIONS SCIENTIFIQUES CORRIGÉES v5.4 =====

/**
 * ✅ CALCUL SCORE SEUIL MAXIMAL (inchangé mais optimisé)
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
  
  return Math.max(0, Math.min(100, score));
}

/**
 * ✅ CALCUL SCORE OPTIMAL CENTRAL (inchangé mais optimisé)
 */
function calculerScoreOptimalCentral(valeur, config) {
  const ecart = Math.abs(valeur - config.valeur_ideale);
  const score = 100 - config.beta * Math.pow(ecart, config.gamma);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * ✅ CALCUL SCORE PARAMÈTRE INDIVIDUEL avec contexte temporel
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
      source: 'bénéfice du doute',
      methode: null,
      historique: null,
      contexteTemporel: 'Paramètre non analysé - Score neutre appliqué'
    };
  }
  
  // ✅ PARAMÈTRE TESTÉ = calcul selon le type avec contexte
  let score = 50; // Valeur par défaut
  
  if (parametre.type === 'seuil_max') {
    score = calculerScoreSeuilMax(valeurParam.value, parametre.config);
  } else if (parametre.type === 'optimal_central') {
    score = calculerScoreOptimalCentral(valeurParam.value, parametre.config);
  } else if (parametre.type === 'qualitatif') {
    score = 80; // Score par défaut pour "acceptable"
  }
  
  // ✅ BONIFICATION POUR DONNÉES RÉCENTES DE QUALITÉ
  let bonification = 0;
  if (valeurParam.historique && valeurParam.historique.recentes > 0) {
    bonification = Math.min(5, valeurParam.historique.recentes); // Max +5 points
  }
  
  const scoreAjuste = Math.min(100, Math.round(score) + bonification);
  
  return {
    score: scoreAjuste,
    scoreBase: Math.round(score),
    bonification: bonification,
    teste: true,
    valeur: valeurParam.value,
    unite: valeurParam.unit,
    date: valeurParam.date,
    source: 'testé',
    methode: valeurParam.methode || 'standard',
    historique: valeurParam.historique,
    contexteTemporel: valeurParam.historique ? 
      genererContexteTemporel(valeurParam.historique) : 
      'Analyse ponctuelle'
  };
}

/**
 * ✅ CALCUL SCORE CATÉGORIE COMPLÈTE avec enrichissement temporel
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
      parametres_totaux: 0,
      qualiteTemporelle: 'aucune'
    };
  }
  
  let scores = [];
  let details = [];
  let parametres_testes = 0;
  let bonificationTotale = 0;
  let qualiteTemporelleGlobale = { recent: 0, moyen: 0, ancien: 0 };
  
  parametres.forEach(parametre => {
    const resultat = calculerScoreParametre(parametre, parametersData);
    
    scores.push(resultat.score);
    details.push({
      nom: parametre.nom,
      score: resultat.score,
      scoreBase: resultat.scoreBase || resultat.score,
      bonification: resultat.bonification || 0,
      teste: resultat.teste,
      valeur: resultat.valeur,
      unite: resultat.unite,
      date: resultat.date,
      impact: parametre.impact,
      gravite: parametre.gravite,
      norme: parametre.norme,
      source: resultat.source,
      methode: resultat.methode,
      contexteTemporel: resultat.contexteTemporel
    });
    
    if (resultat.teste) {
      parametres_testes++;
      bonificationTotale += resultat.bonification || 0;
      
      // Compter la qualité temporelle
      if (resultat.historique) {
        qualiteTemporelleGlobale.recent += resultat.historique.recentes || 0;
        qualiteTemporelleGlobale.moyen += resultat.historique.moyennes || 0;
        qualiteTemporelleGlobale.ancien += resultat.historique.anciennes || 0;
      }
    }
    
    console.log(`${parametre.nom}: ${resultat.score}/100 (base: ${resultat.scoreBase || resultat.score}, bonus: +${resultat.bonification || 0}) [${resultat.source}]`);
  });
  
  // Moyenne de TOUS les paramètres (testés + non testés à 50%)
  const scoreMoyen = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // Évaluer la qualité temporelle globale
  const totalTemporel = qualiteTemporelleGlobale.recent + qualiteTemporelleGlobale.moyen + qualiteTemporelleGlobale.ancien;
  let qualiteTemporelle = 'aucune';
  if (totalTemporel > 0) {
    const pctRecent = (qualiteTemporelleGlobale.recent / totalTemporel) * 100;
    if (pctRecent >= 60) qualiteTemporelle = 'excellente';
    else if (pctRecent >= 30) qualiteTemporelle = 'bonne';
    else qualiteTemporelle = 'limitee';
  }
  
  console.log(`Score final ${categorie}: ${scoreMoyen.toFixed(1)}/100 (${parametres_testes}/${parametres.length} testés, bonus total: +${bonificationTotale.toFixed(1)})`);
  console.log(`Qualité temporelle: ${qualiteTemporelle} (${qualiteTemporelleGlobale.recent}R/${qualiteTemporelleGlobale.moyen}M/${qualiteTemporelleGlobale.ancien}A)`);
  
  return {
    score: scoreMoyen,
    teste: parametres_testes > 0,
    details: details,
    parametres_testes: parametres_testes,
    parametres_totaux: parametres.length,
    bonificationTotale: bonificationTotale,
    qualiteTemporelle: qualiteTemporelle,
    repartitionTemporelle: qualiteTemporelleGlobale
  };
}

/**
 * ✅ NOM DE CATÉGORIE (inchangé)
 */
function getNomCategorie(categorie) {
  if (CATEGORIES_COMPLETES[categorie]) {
    return CATEGORIES_COMPLETES[categorie].nom;
  }
  
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
/**
 * =============================================================================
 * SCORING EAU - PARTIE 4/6 - ALGORITHME PRINCIPAL ET DEBUG
 * =============================================================================
 * Version 5.4 - Algorithme équitable avec analyse temporelle complète
 * =============================================================================
 */

// ===== FONCTION DE DEBUG ENRICHIE =====

function debugHubeauData(parametersData) {
  console.log('=== DEBUG DONNÉES HUBEAU v5.4 ===');
  console.log('Nombre total de paramètres:', Object.keys(parametersData).length);
  
  // Afficher tous les codes reçus avec contexte temporel
  console.log('Codes paramètres reçus:', Object.keys(parametersData));
  
  // ✅ DÉTAIL ENRICHI avec analyse temporelle
  Object.entries(parametersData).forEach(([code, param]) => {
    const methode = param.latestValue?.methode || 'standard';
    const historique = param.latestValue?.historique;
    
    console.log(`Code ${code}:`, {
      nom: param.name,
      unite: param.unit,
      valeur: param.latestValue?.numeric || param.latestValue?.alphanumeric,
      date: param.latestDate,
      analyses: param.totalAnalyses || 1,
      methode: methode,
      historique: historique ? {
        total: historique.total,
        recent: historique.recentes,
        periode: `${historique.periodeMin}-${historique.periodeMax}`
      } : 'aucun'
    });
  });
  
  // ✅ ANALYSE DES MÉTHODES D'OPTIMISATION
  console.log('=== ANALYSE DES MÉTHODES D\'OPTIMISATION ===');
  const compteurMethodes = {};
  Object.values(parametersData).forEach(param => {
    const methode = param.latestValue?.methode || 'standard';
    compteurMethodes[methode] = (compteurMethodes[methode] || 0) + 1;
  });
  
  console.log('Répartition des méthodes:', compteurMethodes);
  
  // Vérifier le mapping avec PARAMETRES_SEUIL_MAX
  console.log('=== MAPPING AVEC PARAMETRES_SEUIL_MAX ===');
  let mappingTrouve = 0;
  Object.keys(PARAMETRES_SEUIL_MAX).forEach(code => {
    if (parametersData[code]) {
      console.log(`✅ ${code} (${PARAMETRES_SEUIL_MAX[code].nom}) - TROUVÉ`);
      mappingTrouve++;
    } else {
      console.log(`❌ ${code} (${PARAMETRES_SEUIL_MAX[code].nom}) - MANQUANT`);
    }
  });
  
  // Vérifier le mapping avec PARAMETRES_OPTIMAL_CENTRAL
  console.log('=== MAPPING AVEC PARAMETRES_OPTIMAL_CENTRAL ===');
  Object.keys(PARAMETRES_OPTIMAL_CENTRAL).forEach(code => {
    if (parametersData[code]) {
      console.log(`✅ ${code} (${PARAMETRES_OPTIMAL_CENTRAL[code].nom}) - TROUVÉ`);
      mappingTrouve++;
    } else {
      console.log(`❌ ${code} (${PARAMETRES_OPTIMAL_CENTRAL[code].nom}) - MANQUANT`);
    }
  });
  
  // ✅ PARAMÈTRES HUBEAU NON MAPPÉS avec analyse de pertinence
  console.log('=== PARAMÈTRES HUBEAU NON MAPPÉS ===');
  let parametresNonMappes = 0;
  Object.keys(parametersData).forEach(code => {
    if (!PARAMETRES_SEUIL_MAX[code] && !PARAMETRES_OPTIMAL_CENTRAL[code]) {
      const param = parametersData[code];
      const analyses = param.totalAnalyses || 1;
      const methode = param.latestValue?.methode || 'standard';
      console.log(`🆕 ${code}: ${param.name} (${param.unit}) - ${analyses} analyses, méthode: ${methode}`);
      parametresNonMappes++;
    }
  });
  
  // ✅ RÉSUMÉ DE L'ANALYSE
  console.log('=== RÉSUMÉ DEBUG ===');
  console.log(`✅ Paramètres mappés: ${mappingTrouve}`);
  console.log(`🆕 Paramètres non mappés: ${parametresNonMappes}`);
  console.log(`📊 Total paramètres: ${Object.keys(parametersData).length}`);
  console.log(`🎯 Taux de mapping: ${Math.round((mappingTrouve / Object.keys(parametersData).length) * 100)}%`);
  
  return parametersData;
}

/**
 * ✅ ALGORITHME PRINCIPAL v5.4 - Calcul équitable avec analyse temporelle
 */
function calculateLifeWaterScore(parametersData, options = {}, sourceInfo = null) {
  console.log('=== CALCUL SCORING SCIENTIFIQUE ÉQUITABLE v5.4 ===');
  console.log('📊 Données reçues:', Object.keys(parametersData).length, 'paramètres');
  console.log('⏰ Source:', sourceInfo?.type || 'inconnue');
  console.log('🔍 Période analysée:', sourceInfo?.moisRecherche || 'inconnue', 'mois');
  
  // 1. ✅ DÉDOUBLONNAGE AUTOMATIQUE AMÉLIORÉ
  const dedouble = dedoublonnerParametres(parametersData);
  const parametersClean = dedouble.parametersData;
  
  console.log(`🔧 Dédoublonnage: ${Object.keys(parametersData).length} → ${Object.keys(parametersClean).length} paramètres`);
  if (dedouble.substitutions.length > 0) {
    console.log('📋 Substitutions:', dedouble.substitutions.map(s => `${s.supprime}→${s.garde}`).join(', '));
  }
  
  const nombreParametres = Object.keys(parametersClean).length;
  
  // ===== CAS CRITIQUE: AUCUNE DONNÉE =====
  if (nombreParametres === 0) {
    console.log('❌ AUCUNE DONNÉE HUBEAU DISPONIBLE');
    return genererResultatAucuneDonnee(sourceInfo, dedouble, options);
  }
  
  // 2. ✅ CALCUL DES SCORES PAR CATÉGORIE AVEC CONTEXTE TEMPOREL
  let contributions = {};
  let detailsParCategorie = {};
  let scoreFinalPondere = 0;
  let alertes = [];
  let recommandations = [];
  let parametres_testes_total = 0;
  let parametres_totaux_total = 0;
  let bonificationTotaleGlobale = 0;
  let qualiteTemporelleGlobale = { excellente: 0, bonne: 0, limitee: 0, aucune: 0 };
  
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
      parametres_totaux: resultCategorie.parametres_totaux,
      bonification: resultCategorie.bonificationTotale || 0,
      qualiteTemporelle: resultCategorie.qualiteTemporelle || 'aucune'
    };
    
    detailsParCategorie[categorie] = {
      nom: CATEGORIES_COMPLETES[categorie] ? CATEGORIES_COMPLETES[categorie].nom : getNomCategorie(categorie),
      description: CATEGORIES_COMPLETES[categorie] ? CATEGORIES_COMPLETES[categorie].description : 'Description non disponible',
      score: resultCategorie.score,
      ponderation: poids * 100,
      details: resultCategorie.details,
      parametres_testes: resultCategorie.parametres_testes,
      parametres_totaux: resultCategorie.parametres_totaux,
      bonification: resultCategorie.bonificationTotale || 0,
      qualiteTemporelle: resultCategorie.qualiteTemporelle || 'aucune',
      repartitionTemporelle: resultCategorie.repartitionTemporelle
    };
    
    // Compteurs globaux
    parametres_testes_total += resultCategorie.parametres_testes;
    parametres_totaux_total += resultCategorie.parametres_totaux;
    bonificationTotaleGlobale += resultCategorie.bonificationTotale || 0;
    qualiteTemporelleGlobale[resultCategorie.qualiteTemporelle || 'aucune']++;
    
    // ✅ ALERTES ENRICHIES avec contexte temporel
    const nom = getNomCategorie(categorie);
    const qualiteTemporelle = resultCategorie.qualiteTemporelle;
    const indicateurTemporel = qualiteTemporelle === 'excellente' ? '🕒' : 
                              qualiteTemporelle === 'bonne' ? '⏰' : 
                              qualiteTemporelle === 'limitee' ? '⏳' : '';
    
    if (resultCategorie.score >= 80) {
      alertes.push(`✅ ${nom}: Excellent (${resultCategorie.score.toFixed(0)}/100) ${indicateurTemporel} - ${resultCategorie.parametres_testes}/${resultCategorie.parametres_totaux} testés`);
    } else if (resultCategorie.score >= 60) {
      alertes.push(`🟡 ${nom}: Bon (${resultCategorie.score.toFixed(0)}/100) ${indicateurTemporel} - ${resultCategorie.parametres_testes}/${resultCategorie.parametres_totaux} testés`);
    } else {
      alertes.push(`🟠 ${nom}: Améliorable (${resultCategorie.score.toFixed(0)}/100) ${indicateurTemporel} - ${resultCategorie.parametres_testes}/${resultCategorie.parametres_totaux} testés`);
    }
  });
  
  // 3. ✅ CALCUL DE LA FIABILITÉ PONDÉRÉE
  const fiabiliteSimple = (parametres_testes_total / parametres_totaux_total) * 100;
  const fiabilitePonderee = calculerFiabilitePonderee(
    Object.keys(parametersClean), 
    Object.keys(parametersClean)
  );
  const fiabilite = Math.round(fiabilitePonderee);
  const infoFiabilite = getNiveauFiabilite(fiabilite);
  
  // 4. ✅ SCORE FINAL AVEC BONIFICATION TEMPORELLE
  const scoreBase = Math.round(scoreFinalPondere * 100);
  const bonificationFinale = Math.min(5, Math.round(bonificationTotaleGlobale / 5)); // Max +5 points
  const scoreFinal = Math.min(100, scoreBase + bonificationFinale);
  
  console.log(`🎯 Score final: ${scoreFinal}/100 (base: ${scoreBase}, bonus: +${bonificationFinale})`);
  console.log(`📊 Fiabilité: ${fiabilite}% (${parametres_testes_total}/${parametres_totaux_total} paramètres)`);
  console.log(`⏰ Qualité temporelle globale:`, qualiteTemporelleGlobale);
  
  // 5. ✅ DÉTERMINATION DU NIVEAU
  const { niveau, emoji, couleur, message } = determinerNiveauQualite(scoreFinal);
  
  // 6. ✅ RECOMMANDATIONS ADAPTÉES avec contexte temporel
  const recosAdaptees = genererRecommandationsAdaptees(
    fiabilite, 
    scoreFinal, 
    qualiteTemporelleGlobale, 
    sourceInfo
  );
  recommandations.push(...recosAdaptees);
  
  // 7. ✅ AJOUT D'INFORMATIONS SOURCE ET DÉDOUBLONNAGE
  if (sourceInfo && sourceInfo.type.includes('commune_voisine')) {
    alertes.unshift(`ℹ️ Analyse basée sur ${sourceInfo.nomCommune} (${sourceInfo.distance.toFixed(1)}km) - Qualité temporelle: ${sourceInfo.qualiteTemporelle || 'inconnue'}`);
  }
  
  if (dedouble.substitutions.length > 0) {
    alertes.unshift(`🔧 ${dedouble.substitutions.length} doublons corrigés avec optimisation temporelle`);
  }
  
  if (sourceInfo && sourceInfo.moisRecherche) {
    alertes.unshift(`📅 Analyse sur ${sourceInfo.moisRecherche} mois (${Math.round(sourceInfo.moisRecherche/12)} ans) de données`);
  }
  
  // 8. ✅ ANALYSE COMPLÈTE LIFE WATER
  const categoriesIncompletes = Object.keys(PONDERATIONS_CATEGORIES).filter(cat => 
    contributions[cat].parametres_testes < contributions[cat].parametres_totaux
  );
  
  const analyseComplete = {
    disponible: true,
    message: `Pour un score ${fiabilite < 80 ? '100% fiable' : 'encore plus précis'}, Life Water peut effectuer des tests complémentaires`,
    parametresManquants: categoriesIncompletes,
    messageConfiance: `Score basé sur ${parametres_testes_total}/${parametres_totaux_total} paramètres (${fiabilite}% fiabilité). Optimisation temporelle: ${bonificationFinale > 0 ? `+${bonificationFinale} points bonus` : 'standard'}.`,
    qualiteTemporelleGlobale: qualiteTemporelleGlobale
  };
  
  return {
    score: scoreFinal,
    scoreBase: scoreBase,
    bonificationTemporelle: bonificationFinale,
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
    qualiteTemporelleGlobale: qualiteTemporelleGlobale,
    metadata: {
      dateCalcul: new Date().toISOString(),
      version: '5.4 - Analyse temporelle 36 mois',
      analyseApprofondie: options.analyseApprofondie || false,
      nombreParametres: nombreParametres,
      parametres_testes_total: parametres_testes_total,
      parametres_totaux_total: parametres_totaux_total,
      fiabiliteSimple: Math.round(fiabiliteSimple),
      fiabilitePonderee: fiabilite,
      corrections_appliquees: dedouble.substitutions,
      optimisationTemporelle: true,
      bonificationTotale: bonificationTotaleGlobale,
      ponderations_corrigees: true,
      unites_standardisees: true
    }
  };
}

// ===== FONCTIONS AUXILIAIRES =====

function genererResultatAucuneDonnee(sourceInfo, dedouble, options) {
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
      `⚠️ Recherche étendue sur ${sourceInfo?.moisRecherche || 36} mois sans succès`,
      '🔍 Recherche dans communes voisines effectuée'
    ],
    recommandations: [
      '📞 Contacter votre mairie pour obtenir des analyses récentes',
      '🔬 Faire réaliser une analyse complète par un laboratoire agréé',
      '💧 Vérifier si votre commune dispose d\'un réseau public récent'
    ],
    analyseComplete: {
      disponible: true,
      message: "Pour un score fiable, Life Water peut effectuer des tests complémentaires",
      parametresManquants: Object.keys(PONDERATIONS_CATEGORIES),
      priorite: 'maximale'
    },
    contributions: {},
    detailsParCategorie: {},
    sourceInfo: sourceInfo,
    metadata: {
      dateCalcul: new Date().toISOString(),
      version: '5.4 - Analyse temporelle 36 mois',
      analyseApprofondie: options.analyseApprofondie || false,
      nombreParametres: 0,
      corrections_appliquees: dedouble.substitutions,
      rechercheEtendue: true
    }
  };
}

function determinerNiveauQualite(scoreFinal) {
  if (scoreFinal >= 85) {
    return { niveau: 'EXCELLENT', emoji: '🟢', couleur: '#28a745', message: 'Eau de qualité exceptionnelle' };
  } else if (scoreFinal >= 75) {
    return { niveau: 'TRÈS BON', emoji: '🟢', couleur: '#28a745', message: 'Eau de très bonne qualité' };
  } else if (scoreFinal >= 65) {
    return { niveau: 'BON', emoji: '🟡', couleur: '#ffc107', message: 'Eau de qualité satisfaisante' };
  } else if (scoreFinal >= 55) {
    return { niveau: 'CORRECT', emoji: '🟡', couleur: '#ffc107', message: 'Eau correcte, améliorations possibles' };
  } else if (scoreFinal >= 45) {
    return { niveau: 'AMÉLIORABLE', emoji: '🟠', couleur: '#fd7e14', message: 'Eau améliorable, traitement recommandé' };
  } else if (scoreFinal >= 35) {
    return { niveau: 'PRÉOCCUPANT', emoji: '🟠', couleur: '#fd7e14', message: 'Eau nécessitant un traitement prioritaire' };
  } else if (scoreFinal >= 20) {
    return { niveau: 'MAUVAIS', emoji: '🔴', couleur: '#dc3545', message: 'Eau présentant des risques sanitaires' };
  } else {
    return { niveau: 'CRITIQUE', emoji: '🔴', couleur: '#dc3545', message: 'Eau impropre à la consommation' };
  }
}

function genererRecommandationsAdaptees(fiabilite, scoreFinal, qualiteTemporelle, sourceInfo) {
  const recommendations = [];
  
  // Recommandations selon la fiabilité
  if (fiabilite >= 80) {
    if (scoreFinal >= 75) {
      recommendations.push('✅ Eau de bonne qualité selon une analyse fiable sur 3 ans');
    } else {
      recommendations.push('🌟 Installer un système de filtration adapté pourrait améliorer la qualité');
    }
  } else {
    recommendations.push(`⚠️ Analyse basée à ${fiabilite}% sur des données complètes`);
    recommendations.push('🔬 Des analyses complémentaires amélioreront significativement la précision');
  }
  
  // Recommandations selon la qualité temporelle
  if (qualiteTemporelle.excellente >= 5) {
    recommendations.push('📅 Données récentes excellentes - Analyse très fiable');
  } else if (qualiteTemporelle.limitee >= 3) {
    recommendations.push('⏳ Données majoritairement anciennes - Analyse récente recommandée');
  }
  
  // Recommandations selon le score
  if (scoreFinal < 60) {
    recommendations.push('📞 Contacter votre mairie pour signaler les problèmes détectés');
  }
  
  // Recommandations selon la source
  if (sourceInfo?.moisRecherche >= 36) {
    recommendations.push('📊 Analyse sur 3 ans effectuée - Tendances temporelles prises en compte');
  }
  
  return recommendations;
}
/**
 * =============================================================================
 * SCORING EAU - PARTIE 5/6 - INTERFACE ACCORDÉON AVEC AMÉLIORATION TEMPORELLE
 * =============================================================================
 * Version 5.4 - Interface enrichie avec analyse temporelle sur 36 mois
 * =============================================================================
 */

// ===== GÉNÉRATION HTML PRINCIPALE =====

/**
 * ✅ GÉNÉRATION HTML avec sections accordéon enrichies v5.4
 */
function generateLifeWaterHTML(scoreResult, adresse, parametersData) {
  // ===== CAS SPÉCIAUX =====
  if (scoreResult.score === 0 && scoreResult.fiabilite === 0) {
    return generateNoDataHTML(scoreResult, adresse);
  }

  // ===== AFFICHAGE NORMAL v5.4 avec enrichissements temporels =====
  const accordionSections = generateAccordionSections(scoreResult);
  const infoTemporelle = genererInfoTemporelle(scoreResult);

  return `
    <div class="life-water-report">
      <!-- En-tête Life Water enrichi -->
      <div class="life-water-header">
        <h2>🔬 <strong>Analyse scientifique équitable v5.4</strong></h2>
        <p>Cette analyse vous est offerte par <strong>Life Water</strong>.</p>
        <p>Algorithme scientifique v${scoreResult.metadata.version} avec scoring équitable et <strong>analyse temporelle sur 36 mois</strong>.</p>
        <p><strong>Life Water est un groupe privé de recherche appliquée</strong>, spécialisé dans l'amélioration de la qualité de l'eau.</p>
        <hr>
        <p>💡 <strong>Nouveauté v5.4 :</strong> Recherche étendue 3 ans + Optimisation temporelle intelligente + Bonifications qualité.</p>
      </div>

      <!-- Résultat Principal enrichi -->
      <div class="resultat-principal">
        <h3>📊 <strong>Résultat de votre analyse équitable 3 ans</strong></h3>
        <p><strong>Adresse analysée :</strong> ${adresse}</p>
        
        ${scoreResult.sourceInfo && scoreResult.sourceInfo.type.includes('commune_voisine') ? `
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0; font-size: 1.1em;"><strong>📍 Point de collecte :</strong> ${scoreResult.sourceInfo.nomCommune} (${scoreResult.sourceInfo.distance.toFixed(1)}km)</p>
          <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.9;">Données de la commune la plus proche • Qualité temporelle: ${scoreResult.sourceInfo.qualiteTemporelle || 'standard'}</p>
        </div>
        ` : ''}
        
        ${infoTemporelle}
        
        <div class="score-display">
          <div class="score-circle" style="border-color: ${scoreResult.couleur}; color: ${scoreResult.couleur};">
            <div class="score-number">${scoreResult.score}</div>
            <div class="score-label">/ 100</div>
            ${scoreResult.bonificationTemporelle > 0 ? `
            <div class="score-bonus">+${scoreResult.bonificationTemporelle} bonus</div>
            ` : ''}
          </div>
          <div class="score-info">
            <h4 style="color: ${scoreResult.couleur};">${scoreResult.emoji} ${scoreResult.niveau}</h4>
            <p class="score-message">${scoreResult.message}</p>
            <p class="score-details">${scoreResult.metadata.parametres_testes_total}/${scoreResult.metadata.parametres_totaux_total} paramètres testés</p>
            ${scoreResult.bonificationTemporelle > 0 ? `
            <p class="score-temporal-bonus">⏰ +${scoreResult.bonificationTemporelle} points pour données récentes</p>
            ` : ''}
          </div>
        </div>

        <!-- Barre de fiabilité enrichie -->
        <div class="fiabilite-section">
          <h4>📊 <strong>Fiabilité de l'analyse (pondérée par criticité)</strong></h4>
          <div class="fiabilite-bar">
            <div class="fiabilite-fill" style="width: ${scoreResult.fiabilite}%; background-color: ${scoreResult.fiabilite >= 80 ? '#28a745' : scoreResult.fiabilite >= 60 ? '#ffc107' : '#dc3545'};"></div>
          </div>
          <div class="fiabilite-info">
            <span class="fiabilite-percentage">${scoreResult.fiabilite}%</span>
            <span class="fiabilite-level">${scoreResult.niveauFiabilite}</span>
            <span class="fiabilite-temporal">${genererIndicateurTemporel(scoreResult.qualiteTemporelleGlobale)}</span>
          </div>
          <p class="fiabilite-message">${scoreResult.analyseComplete.messageConfiance}</p>
        </div>
      </div>

      <div class="content-section">
        <!-- SECTIONS ACCORDÉON ENRICHIES -->
        ${accordionSections}

        <!-- Informations détectées enrichies -->
        <div class="points-attention">
          <p><strong>📊 Synthèse de l'analyse temporelle 3 ans :</strong></p>
          <ul>
            ${scoreResult.alertes.map(alerte => `<li>${alerte}</li>`).join('')}
          </ul>
        </div>

        <!-- Recommandations enrichies -->
        <div class="recommandations">
          <p><strong>💡 Recommandations personnalisées</strong></p>
          <ul>
            ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
          </ul>
        </div>

        <!-- CTA Analyse complète enrichi -->
        <div class="complete-analysis-cta">
          <h4>🔬 <strong>Analyse complète Life Water</strong></h4>
          <p>${scoreResult.analyseComplete.message}</p>
          ${scoreResult.analyseComplete.parametresManquants.length > 0 ? `
          <p><strong>Catégories nécessitant des tests complémentaires :</strong> ${scoreResult.analyseComplete.parametresManquants.map(p => getNomCategorie(p)).join(', ')}</p>
          ` : ''}
          <div class="cta-buttons">
            <button onclick="alert('Contactez Life Water pour une analyse 100% complète')" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 1.1em;">
              🧪 Demander une analyse 100% fiable
            </button>
            <button onclick="alert('Suivi temporel disponible sur 5 ans')" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 20px; cursor: pointer; font-weight: 500; margin-left: 10px;">
              📈 Suivi évolution temporelle
            </button>
          </div>
        </div>

        <!-- Footer enrichi -->
        <div class="footer-life-water">
          <h4>📅 <strong>Informations sur cette analyse temporelle</strong></h4>
          
          <p><strong>📊 Méthodologie :</strong> Algorithme scientifique v${scoreResult.metadata.version}</p>
          <p><strong>🎯 Paramètres analysés :</strong> ${scoreResult.metadata.parametres_testes_total}/${scoreResult.metadata.parametres_totaux_total}</p>
          <p><strong>📍 Source :</strong> ${scoreResult.sourceInfo ? scoreResult.sourceInfo.nomCommune : 'Données Hubeau'}</p>
          <p><strong>⏰ Période :</strong> ${scoreResult.sourceInfo?.moisRecherche || 36} mois (${Math.round((scoreResult.sourceInfo?.moisRecherche || 36)/12)} ans)</p>
          
          ${scoreResult.metadata.corrections_appliquees && scoreResult.metadata.corrections_appliquees.length > 0 ? `
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>🔧 Optimisations appliquées :</strong> ${scoreResult.metadata.corrections_appliquees.length} doublons supprimés avec priorité temporelle, pondérations corrigées (100%), unités standardisées.</p>
          </div>
          ` : ''}
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 0.9em;"><strong>📋 Normes utilisées :</strong> UE Directive 2020/2184, OMS Guidelines 2022, Code de la santé publique français. Optimisation temporelle : privilégie les données récentes, analyse les tendances sur 3 ans.</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>🧮 Scoring équitable v5.4 :</strong> TOUS les paramètres importants pris en compte. Données récentes privilégiées. Paramètres non testés = 50/100 (bénéfice du doute). Bonifications pour données récentes de qualité (+${scoreResult.bonificationTemporelle || 0} points).</p>
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 20px 0;">
            <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 500;">🔄 Nouvelle analyse</button>
            <button onclick="window.print()" style="background: #ffc107; color: #333; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 500;">🖨️ Imprimer</button>
            <button onclick="alert('Export temporel disponible')" style="background: #17a2b8; color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: 500;">📊 Export données</button>
          </div>
          
          <p style="font-size: 0.9em; color: #666; margin: 10px 0;">
            <strong>Life Water v5.4</strong> - Analyse générée le ${new Date().toLocaleDateString('fr-FR')}<br>
            ${scoreResult.metadata.version} • Recherche étendue ${scoreResult.sourceInfo?.moisRecherche || 36} mois
          </p>
        </div>
      </div>
    </div>

    ${generateAccordionCSS()}
  `;
}

/**
 * ✅ GÉNÉRATION DES INFORMATIONS TEMPORELLES
 */
function genererInfoTemporelle(scoreResult) {
  if (!scoreResult.sourceInfo || !scoreResult.sourceInfo.anneesAnalysees) {
    return '';
  }
  
  const annees = scoreResult.sourceInfo.anneesAnalysees;
  const qualite = scoreResult.sourceInfo.qualiteTemporelle || 'standard';
  
  return `
    <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; margin: 15px 0;">
      <p style="margin: 0; font-size: 1em;"><strong>📊 Analyse temporelle :</strong> ${annees.join('-')} • Qualité des données: ${qualite}</p>
      <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.9;">
        ${scoreResult.metadata.bonificationTotale > 0 ? 
          `Optimisation temporelle active • Bonus qualité: +${Math.round(scoreResult.metadata.bonificationTotale)} points` : 
          'Analyse temporelle standard'
        }
      </p>
    </div>
  `;
}

/**
 * ✅ GÉNÉRATION INDICATEUR TEMPOREL
 */
function genererIndicateurTemporel(qualiteTemporelle) {
  if (!qualiteTemporelle) return '';
  
  const total = Object.values(qualiteTemporelle).reduce((sum, val) => sum + val, 0);
  if (total === 0) return '';
  
  if (qualiteTemporelle.excellente >= 5) {
    return '🕒 Données très récentes';
  } else if (qualiteTemporelle.bonne >= 3) {
    return '⏰ Données récentes';
  } else if (qualiteTemporelle.limitee >= 3) {
    return '⏳ Données anciennes';
  } else {
    return '📅 Données mixtes';
  }
}

/**
 * ✅ GÉNÉRATION SECTIONS ACCORDÉON ENRICHIES
 */
function generateAccordionSections(scoreResult) {
  return `
    <!-- SECTIONS ACCORDÉON ENRICHIES v5.4 -->
    <div class="accordion-sections">
      
      <!-- 1. DÉTAIL DES CONTRIBUTIONS TEMPORELLES -->
      <div class="accordion-section">
        <div class="accordion-header" onclick="toggleAccordion('contributions')">
          <span class="accordion-title">🎯 <strong>Détail des contributions au score</strong></span>
          <span class="accordion-score">${scoreResult.score}/100 ${scoreResult.bonificationTemporelle > 0 ? `(+${scoreResult.bonificationTemporelle})` : ''}</span>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-content" id="accordion-contributions" style="display: none;">
          ${generateContributionsDetailHTML(scoreResult)}
        </div>
      </div>

      <!-- 2. ANALYSE DÉTAILLÉE PAR CATÉGORIE AVEC TEMPORALITÉ -->
      <div class="accordion-section">
        <div class="accordion-header" onclick="toggleAccordion('categories')">
          <span class="accordion-title">🔍 <strong>Analyse détaillée par catégorie (3 ans)</strong></span>
          <span class="accordion-coverage">${scoreResult.metadata.parametres_testes_total}/${scoreResult.metadata.parametres_totaux_total} paramètres</span>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-content" id="accordion-categories" style="display: none;">
          ${generateCategoriesDetailHTML(scoreResult)}
        </div>
      </div>

      <!-- 3. ANALYSE TEMPORELLE APPROFONDIE -->
      <div class="accordion-section">
        <div class="accordion-header" onclick="toggleAccordion('temporal')">
          <span class="accordion-title">⏰ <strong>Analyse temporelle approfondie</strong></span>
          <span class="accordion-temporal">${scoreResult.sourceInfo?.moisRecherche || 36} mois</span>
          <span class="accordion-arrow">▼</span>
        </div>
        <div class="accordion-content" id="accordion-temporal" style="display: none;">
          ${generateTemporalDetailHTML(scoreResult)}
        </div>
      </div>

      <!-- 4. MÉTADONNÉES ET FIABILITÉ -->
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
 * ✅ DÉTAIL DES CONTRIBUTIONS ENRICHI
 */
function generateContributionsDetailHTML(scoreResult) {
  let html = `
    <div class="contributions-detail">
      <h5>📈 Répartition des points par catégorie (avec bonifications temporelles)</h5>
      <div class="contributions-chart">
  `;
  
  Object.entries(scoreResult.contributions).forEach(([categorie, contrib]) => {
    const details = scoreResult.detailsParCategorie[categorie];
    const couleur = contrib.score >= 75 ? '#28a745' : contrib.score >= 50 ? '#ffc107' : '#dc3545';
    const bonification = contrib.bonification || 0;
    const qualiteTemporelle = contrib.qualiteTemporelle || 'aucune';
    
    const indicateurTemporel = qualiteTemporelle === 'excellente' ? '🕒' : 
                              qualiteTemporelle === 'bonne' ? '⏰' : 
                              qualiteTemporelle === 'limitee' ? '⏳' : '📅';
    
    html += `
      <div class="contribution-bar-detail temporal-enhanced">
        <div class="contribution-info">
          <span class="contrib-name">${details.nom} ${indicateurTemporel}</span>
          <span class="contrib-weight">${(details.ponderation).toFixed(0)}%</span>
          <span class="contrib-score">${contrib.score.toFixed(0)}/100</span>
          <span class="contrib-points">${contrib.points.toFixed(1)} pts</span>
          ${bonification > 0 ? `<span class="contrib-bonus">+${bonification.toFixed(1)}</span>` : ''}
        </div>
        <div class="contribution-bar-container">
          <div class="contribution-bar-bg">
            <div class="contribution-bar-fill" style="width: ${contrib.score}%; background: ${couleur};"></div>
            ${bonification > 0 ? `<div class="contribution-bonus-overlay" style="width: ${Math.min(bonification * 2, 20)}%; background: linear-gradient(45deg, ${couleur}, #fff);"></div>` : ''}
          </div>
          <div class="contribution-coverage">
            ${contrib.parametres_testes}/${contrib.parametres_totaux} testés
            <br><small style="opacity: 0.8;">${qualiteTemporelle}</small>
          </div>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
      <div class="contributions-summary temporal-summary">
        <h6>💡 Interprétation avec analyse temporelle</h6>
        <ul>
          <li><strong>Points</strong> : Contribution réelle au score final (pondérée)</li>
          <li><strong>Score catégorie</strong> : Performance dans cette catégorie (0-100)</li>
          <li><strong>Bonifications</strong> : Points bonus pour données récentes de qualité</li>
          <li><strong>Qualité temporelle</strong> : 🕒 Excellente (récent) • ⏰ Bonne • ⏳ Limitée (ancien) • 📅 Mixte</li>
          <li><strong>Couverture</strong> : Nombre de paramètres testés vs total possible</li>
        </ul>
        ${scoreResult.bonificationTemporelle > 0 ? `
        <div class="bonus-explanation">
          <strong>🎯 Bonus temporel appliqué :</strong> +${scoreResult.bonificationTemporelle} points pour la qualité des données récentes
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  return html;
}

/**
 * ✅ NOUVELLE SECTION : ANALYSE TEMPORELLE APPROFONDIE
 */
function generateTemporalDetailHTML(scoreResult) {
  const sourceInfo = scoreResult.sourceInfo;
  const qualiteGlobale = scoreResult.qualiteTemporelleGlobale;
  
  return `
    <div class="temporal-detail">
      <h5>⏰ Analyse de l'évolution temporelle sur ${sourceInfo?.moisRecherche || 36} mois</h5>
      
      <div class="temporal-overview">
        <div class="temporal-card">
          <h6>📊 Période analysée</h6>
          <p><strong>Durée :</strong> ${sourceInfo?.moisRecherche || 36} mois (${Math.round((sourceInfo?.moisRecherche || 36)/12)} ans)</p>
          <p><strong>Années :</strong> ${sourceInfo?.anneesAnalysees?.join('-') || 'Non spécifié'}</p>
          <p><strong>Source :</strong> ${sourceInfo?.nomCommune || 'Commune analysée'}</p>
          ${sourceInfo?.distance > 0 ? `<p><strong>Distance :</strong> ${sourceInfo.distance.toFixed(1)} km</p>` : ''}
        </div>
        
        <div class="temporal-card">
          <h6>🎯 Qualité temporelle globale</h6>
          <div class="quality-breakdown">
            <div class="quality-item excellente">🕒 Excellente: ${qualiteGlobale?.excellente || 0} catégories</div>
            <div class="quality-item bonne">⏰ Bonne: ${qualiteGlobale?.bonne || 0} catégories</div>
            <div class="quality-item limitee">⏳ Limitée: ${qualiteGlobale?.limitee || 0} catégories</div>
            <div class="quality-item aucune">📅 Aucune: ${qualiteGlobale?.aucune || 0} catégories</div>
          </div>
        </div>
        
        <div class="temporal-card">
          <h6>🔧 Optimisations appliquées</h6>
          <p><strong>Bonification totale :</strong> +${scoreResult.bonificationTemporelle || 0} points</p>
          <p><strong>Stratégies utilisées :</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px; font-size: 0.9em;">
            <li>Privilégier les données récentes (< 6 mois)</li>
            <li>Pondération temporelle intelligente</li>
            <li>Analyse des tendances sur 3 ans</li>
            <li>Fallback progressif sur données anciennes</li>
          </ul>
        </div>
      </div>
      
      <div class="temporal-methodology">
        <h6>🧮 Méthodologie de l'analyse temporelle</h6>
        <div class="methodology-grid">
          <div class="method-item">
            <strong>Paramètres microbiologiques</strong><br>
            <small>Pire cas récent (contamination ponctuelle)</small>
          </div>
          <div class="method-item">
            <strong>Métaux lourds</strong><br>
            <small>Analyse de tendance + pondération (accumulation lente)</small>
          </div>
          <div class="method-item">
            <strong>Chlore</strong><br>
            <small>Strict récent (très volatil)</small>
          </div>
          <div class="method-item">
            <strong>Paramètres physico-chimiques</strong><br>
            <small>Pondération récente (évolution lente)</small>
          </div>
          <div class="method-item">
            <strong>Pesticides & PFAS</strong><br>
            <small>Pire cas récent (contamination variable)</small>
          </div>
          <div class="method-item">
            <strong>Nitrates</strong><br>
            <small>Pondération récente (saisonnalité)</small>
          </div>
        </div>
      </div>
      
      ${sourceInfo?.metadata?.repartitionTemporelle ? `
      <div class="temporal-distribution">
        <h6>📅 Répartition des analyses dans le temps</h6>
        <div class="distribution-bars">
          <div class="dist-bar">
            <span class="dist-label">Récentes (< 6 mois)</span>
            <div class="dist-bar-bg">
              <div class="dist-bar-fill recent" style="width: ${(sourceInfo.metadata.repartitionTemporelle.recent / (sourceInfo.metadata.totalResultats || 1)) * 100}%;"></div>
            </div>
            <span class="dist-value">${sourceInfo.metadata.repartitionTemporelle.recent}</span>
          </div>
          <div class="dist-bar">
            <span class="dist-label">Moyennes (6-18 mois)</span>
            <div class="dist-bar-bg">
              <div class="dist-bar-fill moyen" style="width: ${(sourceInfo.metadata.repartitionTemporelle.moyen / (sourceInfo.metadata.totalResultats || 1)) * 100}%;"></div>
            </div>
            <span class="dist-value">${sourceInfo.metadata.repartitionTemporelle.moyen}</span>
          </div>
          <div class="dist-bar">
            <span class="dist-label">Anciennes (> 18 mois)</span>
            <div class="dist-bar-bg">
              <div class="dist-bar-fill ancien" style="width: ${(sourceInfo.metadata.repartitionTemporelle.ancien / (sourceInfo.metadata.totalResultats || 1)) * 100}%;"></div>
            </div>
            <span class="dist-value">${sourceInfo.metadata.repartitionTemporelle.ancien}</span>
          </div>
        </div>
      </div>
      ` : ''}
      
    </div>
  `;
}
/**
 * =============================================================================
 * SCORING EAU - PARTIE 6/6 - FONCTIONS ACCORDÉON, CSS ET EXPORTS
 * =============================================================================
 * Version 5.4 - Interface complète avec styles temporels et exports
 * =============================================================================
 */

/**
 * ✅ ANALYSE DÉTAILLÉE PAR CATÉGORIE (enrichie v5.4)
 */
function generateCategoriesDetailHTML(scoreResult) {
  let html = `
    <div class="categories-detail temporal-enhanced">
      <h5>🔬 Analyse scientifique par catégorie (36 mois)</h5>
  `;
  
  Object.entries(scoreResult.detailsParCategorie).forEach(([categorie, details]) => {
    const contribution = scoreResult.contributions[categorie];
    const couleurCategorie = contribution.score >= 75 ? '#28a745' : contribution.score >= 50 ? '#ffc107' : '#dc3545';
    const bonification = details.bonification || 0;
    const qualiteTemporelle = details.qualiteTemporelle || 'aucune';
    
    const indicateurTemporel = qualiteTemporelle === 'excellente' ? '🕒 Excellente' : 
                              qualiteTemporelle === 'bonne' ? '⏰ Bonne' : 
                              qualiteTemporelle === 'limitee' ? '⏳ Limitée' : '📅 Standard';
    
    html += `
      <div class="category-detail-card temporal-card" style="border-left: 4px solid ${couleurCategorie};">
        <div class="category-detail-header">
          <h6>${details.nom}</h6>
          <div class="category-badges">
            <span class="category-score-badge" style="background: ${couleurCategorie};">${contribution.score.toFixed(0)}/100</span>
            ${bonification > 0 ? `<span class="category-bonus-badge">+${bonification.toFixed(1)}</span>` : ''}
          </div>
        </div>
        <p class="category-description">${details.description}</p>
        
        <div class="category-temporal-info">
          <span class="temporal-indicator" style="color: ${couleurCategorie};">
            Qualité temporelle: ${indicateurTemporel}
          </span>
          ${details.repartitionTemporelle ? `
          <span class="temporal-breakdown">
            (${details.repartitionTemporelle.recent}R/${details.repartitionTemporelle.moyen}M/${details.repartitionTemporelle.ancien}A)
          </span>
          ` : ''}
        </div>
        
        <div class="category-stats temporal-stats">
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
          ${bonification > 0 ? `
          <div class="stat-item bonus">
            <span class="stat-label">Bonus temporel</span>
            <span class="stat-value">+${bonification.toFixed(1)}</span>
          </div>
          ` : ''}
        </div>

        <div class="category-parameters temporal-parameters">
          <h7>Paramètres de cette catégorie (avec contexte temporel) :</h7>
          ${details.details.map(param => `
            <div class="param-mini temporal-param ${param.teste ? 'tested' : 'untested'}">
              <div class="param-main-info">
                <span class="param-name">${param.nom}</span>
                <span class="param-score">${param.score}/100</span>
                ${param.bonification > 0 ? `<span class="param-bonus">+${param.bonification}</span>` : ''}
                <span class="param-status">
                  ${param.teste ? '✅ Testé' : '⚪ Bénéfice du doute'}
                </span>
              </div>
              ${param.contexteTemporel ? `
              <div class="param-temporal-context">
                <small>📅 ${param.contexteTemporel}</small>
              </div>
              ` : ''}
              ${param.methode && param.methode !== 'standard' ? `
              <div class="param-method-info">
                <small>🔧 ${param.methode}</small>
              </div>
              ` : ''}
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
 * ✅ MÉTADONNÉES ENRICHIES
 */
function generateMetadataDetailHTML(scoreResult) {
  return `
    <div class="metadata-detail temporal-metadata">
      <div class="metadata-grid">
        <div class="metadata-card">
          <h6>🔬 Algorithme v5.4</h6>
          <p><strong>Version</strong> : ${scoreResult.metadata.version}</p>
          <p><strong>Date calcul</strong> : ${new Date(scoreResult.metadata.dateCalcul).toLocaleString('fr-FR')}</p>
          <p><strong>Optimisation temporelle</strong> : ${scoreResult.metadata.optimisationTemporelle ? 'Activée' : 'Désactivée'}</p>
          <p><strong>Bonification totale</strong> : +${scoreResult.metadata.bonificationTotale?.toFixed(1) || 0} points</p>
          <p><strong>Corrections</strong> : ${scoreResult.metadata.corrections_appliquees ? scoreResult.metadata.corrections_appliquees.length : 0} appliquées</p>
        </div>
        
        <div class="metadata-card">
          <h6>📊 Données analysées (36 mois)</h6>
          <p><strong>Paramètres testés</strong> : ${scoreResult.metadata.parametres_testes_total}</p>
          <p><strong>Paramètres totaux</strong> : ${scoreResult.metadata.parametres_totaux_total}</p>
          <p><strong>Fiabilité simple</strong> : ${scoreResult.metadata.fiabiliteSimple || 'N/A'}%</p>
          <p><strong>Fiabilité pondérée</strong> : ${scoreResult.metadata.fiabilitePonderee || scoreResult.fiabilite}%</p>
          <p><strong>Score base</strong> : ${scoreResult.scoreBase || scoreResult.score}/100</p>
          <p><strong>Bonus temporel</strong> : +${scoreResult.bonificationTemporelle || 0}</p>
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
          <p><strong>Période recherche</strong> : ${scoreResult.sourceInfo?.moisRecherche || 36} mois</p>
          <p><strong>Qualité temporelle</strong> : ${scoreResult.sourceInfo?.qualiteTemporelle || 'Standard'}</p>
        </div>
        
        ${scoreResult.sourceInfo?.anneesAnalysees ? `
        <div class="metadata-card">
          <h6>📅 Couverture temporelle</h6>
          <p><strong>Années analysées</strong> : ${scoreResult.sourceInfo.anneesAnalysees.join(', ')}</p>
          <p><strong>Span temporel</strong> : ${scoreResult.sourceInfo.anneesAnalysees.length} années</p>
          ${scoreResult.sourceInfo.metadata?.repartitionTemporelle ? `
          <p><strong>Récentes</strong> : ${scoreResult.sourceInfo.metadata.repartitionTemporelle.recent} analyses</p>
          <p><strong>Moyennes</strong> : ${scoreResult.sourceInfo.metadata.repartitionTemporelle.moyen} analyses</p>
          <p><strong>Anciennes</strong> : ${scoreResult.sourceInfo.metadata.repartitionTemporelle.ancien} analyses</p>
          ` : ''}
        </div>
        ` : ''}
      </div>
      
      <div class="algorithm-info temporal-algorithm">
        <h6>🧮 Principe de l'algorithme équitable v5.4</h6>
        <ul>
          <li><strong>Bénéfice du doute</strong> : Paramètres non testés = 50/100 (neutre)</li>
          <li><strong>Optimisation temporelle</strong> : Privilégie les données récentes selon le paramètre</li>
          <li><strong>Recherche étendue</strong> : 36 mois d'historique (3 ans) analysés</li>
          <li><strong>Bonifications qualité</strong> : +${scoreResult.bonificationTemporelle || 0} points pour données récentes</li>
          <li><strong>Stratégies adaptées</strong> : Pire cas (microbiologie), pondération (métaux), tendances (physico-chimie)</li>
          <li><strong>Fallback intelligent</strong> : Utilise données anciennes si récentes indisponibles</li>
          <li><strong>Normes officielles</strong> : UE, OMS, Code de la santé publique français</li>
          <li><strong>Transparence totale</strong> : Tous les paramètres importants affichés avec contexte temporel</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * ✅ HTML POUR AUCUNE DONNÉE (enrichi)
 */
function generateNoDataHTML(scoreResult, adresse) {
  return `
    <div class="life-water-report">
      <div class="life-water-header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
        <h2>❌ <strong>Aucune donnée disponible sur 36 mois</strong></h2>
        <p>Recherche étendue sur 3 ans effectuée dans la base Hubeau sans succès.</p>
        <p>Recherche géographique dans un rayon de 20km également effectuée.</p>
      </div>

      <div class="resultat-principal" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);">
        <h3>📊 <strong>Résultat de votre recherche étendue</strong></h3>
        <p><strong>Adresse analysée :</strong> ${adresse}</p>
        <p><strong>Période recherchée :</strong> ${scoreResult.sourceInfo?.moisRecherche || 36} mois (3 ans)</p>
        
        <div class="score-display">
          <div class="score-circle" style="border-color: #dc3545; color: #dc3545;">
            <div class="score-number">❌</div>
            <div class="score-label">Aucune donnée</div>
          </div>
          <div class="score-info">
            <h4 style="color: #dc3545;">❌ DONNÉES MANQUANTES</h4>
            <p class="score-message">Aucune donnée de qualité sur 3 ans</p>
          </div>
        </div>
      </div>

      <div class="content-section">
        <div class="recommandations">
          <p><strong>🔍 Actions recommandées :</strong></p>
          <ul>
            ${scoreResult.recommandations.map(reco => `<li>${reco}</li>`).join('')}
          </ul>
        </div>

        <div class="complete-analysis-cta">
          <h4>🔬 <strong>Analyse complète Life Water</strong></h4>
          <p>Face à l'absence de données publiques, Life Water peut réaliser une analyse complète et personnalisée de votre eau.</p>
          <div class="cta-buttons">
            <button onclick="alert('Contactez Life Water pour une analyse sur site')" style="background: #667eea; color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: 600;">
              🧪 Analyse personnalisée sur site
            </button>
            <button onclick="alert('Kit d\'analyse à domicile disponible')" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 20px; cursor: pointer; font-weight: 500; margin-left: 10px;">
              📦 Kit analyse domicile
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * ✅ FONCTIONS TOGGLE ACCORDÉON
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
 * ✅ CSS ENRICHI avec styles temporels
 */
function generateAccordionCSS() {
  return `<style>
    /* ===== STYLES ACCORDÉON v5.4 ENRICHIS TEMPORELS ===== */
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
      transition: all 0.3s ease;
      border-bottom: 1px solid transparent;
    }
    
    .accordion-header:hover {
      background: linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%);
      transform: translateY(-1px);
    }
    
    .accordion-header.expanded {
      border-bottom-color: #e9ecef;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }
    
    .accordion-title {
      font-size: 1.1em;
      font-weight: 600;
      flex: 1;
    }
    
    .accordion-score, .accordion-coverage, .accordion-reliability, .accordion-temporal {
      background: rgba(255,255,255,0.9);
      color: #333;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9em;
      margin: 0 5px;
    }
    
    .accordion-header.expanded .accordion-score,
    .accordion-header.expanded .accordion-coverage,
    .accordion-header.expanded .accordion-reliability,
    .accordion-header.expanded .accordion-temporal {
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
    
    /* ===== STYLES TEMPORELS ENRICHIS ===== */
    .temporal-enhanced {
      border-left: 3px solid #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(255, 255, 255, 1) 100%);
    }
    
    .temporal-card {
      border: 1px solid rgba(102, 126, 234, 0.1);
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.01) 0%, rgba(255, 255, 255, 1) 100%);
    }
    
    .score-bonus {
      font-size: 0.7em;
      color: #28a745;
      font-weight: 500;
      margin-top: 2px;
    }
    
    .score-temporal-bonus {
      font-size: 0.8em;
      color: #28a745;
      font-weight: 500;
      margin: 5px 0;
    }
    
    .fiabilite-temporal {
      font-size: 0.8em;
      color: #667eea;
      margin-left: 10px;
    }
    
    /* Détail des contributions temporelles */
    .contribution-bar-detail.temporal-enhanced {
      border-left: 3px solid rgba(102, 126, 234, 0.3);
    }
    
    .contrib-bonus {
      background: #28a745;
      color: white;
      text-align: center;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8em;
    }
    
    .contribution-bonus-overlay {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      opacity: 0.6;
      border-radius: 6px;
    }
    
    .temporal-summary {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(40, 167, 69, 0.08) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
    }
    
    .bonus-explanation {
      background: rgba(40, 167, 69, 0.1);
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
      border-left: 3px solid #28a745;
    }
    
    /* Analyse temporelle détaillée */
    .temporal-detail h5 {
      color: #667eea;
      border-bottom: 2px solid rgba(102, 126, 234, 0.2);
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .temporal-overview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .temporal-card {
      background: white;
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.1);
    }
    
    .temporal-card h6 {
      color: #667eea;
      margin: 0 0 15px 0;
      font-size: 1em;
      border-bottom: 1px solid rgba(102, 126, 234, 0.2);
      padding-bottom: 5px;
    }
    
    .quality-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .quality-item {
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: 500;
    }
    
    .quality-item.excellente { background: rgba(40, 167, 69, 0.1); color: #28a745; }
    .quality-item.bonne { background: rgba(255, 193, 7, 0.1); color: #ffc107; }
    .quality-item.limitee { background: rgba(253, 126, 20, 0.1); color: #fd7e14; }
    .quality-item.aucune { background: rgba(108, 117, 125, 0.1); color: #6c757d; }
    
    .methodology-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .method-item {
      background: rgba(102, 126, 234, 0.05);
      padding: 15px;
      border-radius: 8px;
      border-left: 3px solid #667eea;
    }
    
    .temporal-distribution {
      background: rgba(102, 126, 234, 0.02);
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .distribution-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 15px;
    }
    
    .dist-bar {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .dist-label {
      min-width: 150px;
      font-weight: 500;
      font-size: 0.9em;
    }
    
    .dist-bar-bg {
      flex: 1;
      height: 20px;
      background: #e9ecef;
      border-radius: 10px;
      overflow: hidden;
    }
    
    .dist-bar-fill {
      height: 100%;
      transition: width 1s ease;
      border-radius: 10px;
    }
    
    .dist-bar-fill.recent { background: #28a745; }
    .dist-bar-fill.moyen { background: #ffc107; }
    .dist-bar-fill.ancien { background: #6c757d; }
    
    .dist-value {
      min-width: 40px;
      text-align: center;
      font-weight: 600;
      color: #333;
    }
    
    /* Catégories enrichies */
    .category-detail-card.temporal-card {
      border-left-width: 4px;
    }
    
    .category-badges {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .category-bonus-badge {
      background: #28a745;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
    }
    
    .category-temporal-info {
      background: rgba(102, 126, 234, 0.05);
      padding: 10px;
      border-radius: 6px;
      margin: 10px 0;
      font-size: 0.9em;
    }
    
    .temporal-indicator {
      font-weight: 600;
    }
    
    .temporal-breakdown {
      opacity: 0.7;
      margin-left: 10px;
    }
    
    .temporal-stats {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    }
    
    .stat-item.bonus {
      background: rgba(40, 167, 69, 0.1);
      border-radius: 6px;
      padding: 8px;
    }
    
    .stat-item.bonus .stat-value {
      color: #28a745;
    }
    
    /* Paramètres temporels */
    .temporal-parameters .param-mini {
      border-left-width: 3px;
    }
    
    .param-main-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    
    .param-bonus {
      background: #28a745;
      color: white;
      padding: 1px 6px;
      border-radius: 8px;
      font-size: 0.7em;
      font-weight: 600;
      margin: 0 5px;
    }
    
    .param-temporal-context {
      background: rgba(102, 126, 234, 0.1);
      padding: 5px 8px;
      border-radius: 4px;
      margin: 5px 0;
    }
    
    .param-method-info {
      background: rgba(40, 167, 69, 0.1);
      padding: 5px 8px;
      border-radius: 4px;
      margin: 5px 0;
    }
    
    /* Métadonnées temporelles */
    .temporal-metadata .metadata-card {
      border-left: 3px solid rgba(102, 126, 234, 0.3);
    }
    
    .temporal-algorithm {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(40, 167, 69, 0.08) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
    }
    
    .temporal-algorithm h6 {
      color: #667eea;
    }
    
    /* ===== STYLES LIFE WATER EXISTANTS AMÉLIORÉS ===== */
    .life-water-report {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      background: white;
      margin: 20px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .life-water-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .life-water-header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
      animation: shimmer 3s infinite;
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
      100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }
    
    .cta-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 15px;
    }
    
    /* Responsive amélioré */
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
      
      .temporal-overview {
        grid-template-columns: 1fr;
      }
      
      .methodology-grid {
        grid-template-columns: 1fr;
      }
      
      .cta-buttons {
        flex-direction: column;
        align-items: center;
      }
      
      .cta-buttons button {
        width: 100%;
        max-width: 300px;
      }
    }
  </style>`;
}

// ===== EXPORTS GLOBAUX v5.4 =====
if (typeof window !== 'undefined') {
  // Fonctions principales
  window.fetchHubeauDataWithFallback = fetchHubeauDataWithFallback;
  window.fetchHubeauForCommuneComplete = fetchHubeauForCommuneComplete;
  window.calculateLifeWaterScore = calculateLifeWaterScore;
  window.generateLifeWaterHTML = generateLifeWaterHTML;
  
  // Fonctions d'optimisation temporelle
  window.obtenirValeurOptimaleTemporelle = obtenirValeurOptimaleTemporelle;
  window.determinerStrategieTemporelle = determinerStrategieTemporelle;
  window.calculerQualiteTemporelle = calculerQualiteTemporelle;
  
  // Fonctions de correction des doublons
  window.dedoublonnerParametres = dedoublonnerParametres;
  
  // Fonctions d'affichage améliorées
  window.formaterValeurParametre = formaterValeurParametre;
  window.getInterpretationAvancee = getInterpretationAvancee;
  window.genererBadgeQualite = genererBadgeQualite;
  window.genererContexteTemporel = genererContexteTemporel;
  window.analyserTendance = analyserTendance;
  
  // Fonctions accordéon
  window.generateAccordionSections = generateAccordionSections;
  window.generateContributionsDetailHTML = generateContributionsDetailHTML;
  window.generateCategoriesDetailHTML = generateCategoriesDetailHTML;
  window.generateTemporalDetailHTML = generateTemporalDetailHTML;
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
  window.calculerEcartType = calculerEcartType;
  
  // Fonctions d'aide
  window.genererInfoTemporelle = genererInfoTemporelle;
  window.genererIndicateurTemporel = genererIndicateurTemporel;
  window.genererResultatAucuneDonnee = genererResultatAucuneDonnee;
  window.determinerNiveauQualite = determinerNiveauQualite;
  window.genererRecommandationsAdaptees = genererRecommandationsAdaptees;
}

console.log('✅ SCORING EAU v5.4 COMPLET - Algorithme Scientifique Équitable 36 mois chargé');
console.log('🔧 Nouvelles fonctionnalités: Recherche étendue 36 mois, analyse temporelle intelligente');
console.log('📊 Optimisations: Stratégies par paramètre, bonifications qualité, fallback progressif');
console.log('🎯 Interface: 4 accordéons interactifs, styles temporels, responsive design complet');
console.log('⏰ Temporalité: Privilégie récent, analyse tendances, contexte historique sur 3 ans');
