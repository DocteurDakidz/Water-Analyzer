# 🔬 Analyseur de Qualité de l'Eau - Life Water v5.3

Un outil d'analyse scientifique avancé de la qualité de l'eau potable utilisant les données officielles françaises (Hubeau) avec algorithme équitable et affichage amélioré.

## 🌟 Fonctionnalités principales v5.3

- **Analyse scientifique équitable** avec bénéfice du doute transparent
- **Affichage amélioré** : badges colorés, interprétations claires, "Non détecté" pour les paramètres microbiologiques
- **Recherche géographique étendue** : fallback automatique dans les communes voisines (rayon 20km)
- **Scoring transparent** basé sur 10 catégories de paramètres avec pondération scientifique
- **Interface utilisateur intuitive** avec autocomplétion d'adresse et accordéon interactif
- **Résultats détaillés** avec recommandations personnalisées et calcul de fiabilité
- **Compatible Shopify 2.0** (section Liquid)

## 📋 Structure du projet

```
├── scoring-eau.js          # Moteur de calcul principal v5.3
├── baremes-eau.js          # Barèmes scientifiques v5.2
├── water-analyzer.liquid   # Interface utilisateur Shopify v5.2
└── README.md              # Documentation v5.3
```

## 🚀 Installation

### 1. Pour Shopify

1. **Ajouter les fichiers JavaScript** :
   - Uploadez `scoring-eau.js` dans vos assets Shopify
   - Uploadez `baremes-eau.js` dans vos assets Shopify
   - Les fichiers seront automatiquement chargés par la section

2. **Ajouter la section** :
   - Créez un nouveau fichier `water-analyzer.liquid` dans `/sections/`
   - Copiez le contenu du fichier fourni

3. **Utilisation** :
   - Ajoutez la section "Water Analyzer v5.2" à vos pages via l'éditeur de thème
   - Configurez le titre et la description si souhaité

### 2. Pour autres plateformes

```html
<script src="baremes-eau.js"></script>
<script src="scoring-eau.js"></script>
<script>
// Utiliser les fonctions disponibles
const result = await fetchHubeauDataWithFallback(codeCommune, lat, lon);
const score = calculateLifeWaterScore(result.parametersData, options, result.sourceInfo);
const html = generateLifeWaterHTML(score, adresse, result.parametersData);
</script>
```

## 🔧 Configuration

### Paramètres de la section Shopify

- **Titre** : Personnalisable via l'éditeur
- **Description** : Texte d'introduction optionnel
- **Analyse approfondie** : Option pour inclure les détails techniques
- **Styles** : Entièrement personnalisables via CSS

## 📊 Algorithme de scoring v5.3

### Pondérations scientifiques par catégorie

1. **🦠 Microbiologie** (23%) - Impact sanitaire immédiat
2. **🔗 Métaux lourds** (16%) - Cancérigènes, bioaccumulation
3. **🧪 PFAS** (14%) - Polluants éternels
4. **⚗️ Nitrates** (10%) - Pollution agricole
5. **🌿 Pesticides** (10%) - Résidus phytosanitaires
6. **⚖️ Chimie générale** (8%) - Confort et qualité générale
7. **🌡️ Organoleptiques** (8%) - Acceptabilité, indicateurs
8. **🧬 Médicaments** (7%) - Résistance antibiotique
9. **🔬 Microplastiques** (5%) - Impact à long terme
10. **💧 Chlore** (2%) - Désinfection nécessaire

### Algorithme équitable avec bénéfice du doute

- **Paramètres testés** : Score calculé selon formules scientifiques
- **Paramètres non testés** : Score neutre de 50/100 (bénéfice du doute)
- **Transparence totale** : Affichage de tous les paramètres importants
- **Fiabilité pondérée** : Calcul selon la criticité des paramètres testés

### Niveaux de qualité

- **🟢 EXCELLENT** (85-100) : Eau de qualité exceptionnelle
- **🟢 TRÈS BON** (75-84) : Eau de très bonne qualité
- **🟡 BON** (65-74) : Eau de qualité satisfaisante
- **🟡 CORRECT** (55-64) : Eau correcte, améliorations possibles
- **🟠 AMÉLIORABLE** (45-54) : Traitement recommandé
- **🟠 PRÉOCCUPANT** (35-44) : Traitement prioritaire
- **🔴 MAUVAIS** (20-34) : Risques sanitaires
- **🔴 CRITIQUE** (0-19) : Impropre à la consommation

## ✨ Nouvelles fonctionnalités v5.3

### Affichage amélioré des paramètres

- **"Non détecté"** au lieu de "0 undefined" pour les paramètres microbiologiques
- **Badges colorés** : 🟢 Excellent, 🟡 Bon, 🟠 Moyen, 🔴 Faible
- **Interprétations claires** : "Aucune contamination - Excellent"
- **Unités intelligentes** : Correction automatique des unités manquantes
- **Dates d'analyse** : Affichage de la date de prélèvement
- **Design premium** : Effets hover et animations fluides

### Exemples d'amélioration

**Avant v5.3 :**
```
E. coli: 100/100
0 undefined
Impact: Impact sanitaire critique
```

**Après v5.3 :**
```
E. coli: 100/100 🟢 Excellent
Non détecté
Aucune contamination - Excellent
💡 Impact sanitaire critique - risque de gastro-entérite
📋 UE Directive 2020/2184
📅 Analysé le 15/06/2025
```

## 🔍 Système de fallback géographique

### Fonctionnement intelligent

1. **Recherche principale** : Données de la commune demandée
2. **Si insuffisant** (< 3 paramètres) : Recherche automatique dans les communes voisines
3. **Rayon étendu** : Jusqu'à 20km autour de l'adresse
4. **Tri par proximité** : Les communes les plus proches sont testées en premier
5. **Information transparente** : L'utilisateur est informé de la source des données

### Avantages

- **Couverture étendue** : Plus d'adresses peuvent être analysées
- **Transparence** : Source des données clairement indiquée
- **Fiabilité** : Préférence donnée aux données locales quand disponibles

## 📡 APIs utilisées

### API Hubeau (Données de qualité)
- **URL** : `https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis`
- **Source** : Ministère de la Transition Écologique
- **Données** : Analyses officielles de qualité de l'eau potable

### API Adresse (Géocodage)
- **URL** : `https://api-adresse.data.gouv.fr/search/`
- **Source** : IGN, Base Adresse Nationale
- **Fonction** : Autocomplétion et validation d'adresses

### API Géo (Communes voisines)
- **URL** : `https://geo.api.gouv.fr/communes`
- **Source** : Service public
- **Fonction** : Recherche de communes dans un rayon donné

## 🛠️ Fonctions principales v5.3

### `fetchHubeauDataWithFallback(codeCommune, lat, lon, rayonKm)`
Recherche les données de qualité avec fallback géographique.

**Paramètres :**
- `codeCommune` : Code INSEE de la commune
- `lat` : Latitude de l'adresse
- `lon` : Longitude de l'adresse  
- `rayonKm` : Rayon de recherche (défaut: 20km)

**Retour :**
```javascript
{
  parametersData: {}, // Données des paramètres trouvés
  sourceInfo: {       // Informations sur la source
    type: 'commune_principale|commune_voisine|aucune_donnee',
    codeCommune: '75001',
    nomCommune: 'Paris 1er',
    distance: 0.0,
    nombreParametres: 15
  }
}
```

### `calculateLifeWaterScore(parametersData, options, sourceInfo)`
Calcule le score de qualité de l'eau avec algorithme équitable v5.3.

**Paramètres :**
- `parametersData` : Données des paramètres analysés
- `options` : Options d'analyse (`{analyseApprofondie: boolean}`)
- `sourceInfo` : Informations sur la source des données

**Retour :**
```javascript
{
  score: 79,
  fiabilite: 58,
  niveau: 'TRÈS BON',
  emoji: '🟢',
  couleur: '#28a745',
  message: 'Eau de très bonne qualité',
  alertes: [...],
  recommandations: [...],
  contributions: {...},
  detailsParCategorie: {...},
  sourceInfo: {...},
  metadata: {
    version: '5.3 - Scoring équitable avec affichage amélioré',
    parametres_testes_total: 29,
    parametres_totaux_total: 47,
    fiabiliteSimple: 62,
    fiabilitePonderee: 58
  }
}
```

### `generateLifeWaterHTML(scoreResult, adresse, parametersData)`
Génère le rapport HTML formaté avec affichage amélioré v5.3.

### Nouvelles fonctions d'affichage v5.3

#### `formaterValeurParametre(valeur, unite, nom)`
Formate intelligemment l'affichage des valeurs :
- Paramètres microbiologiques à 0 → "Non détecté"
- Unités manquantes → Correction automatique
- Valeurs numériques → Formatage adapté

#### `getInterpretation(valeur, nom)`
Génère des interprétations claires :
- **E. coli = 0** → "Aucune contamination - Excellent"
- **pH = 7.2** → "pH optimal pour la consommation"
- **Nitrates = 15** → "Niveau acceptable"

#### `genererBadgeQualite(score)`
Crée des badges colorés selon le score :
- **90-100** → 🟢 Excellent
- **75-89** → 🟢 Très bon
- **60-74** → 🟡 Bon
- **40-59** → 🟠 Moyen
- **0-39** → 🔴 Faible

## ⚠️ Gestion des cas particuliers

### Aucune donnée disponible
- **Score** : 0
- **Niveau** : DONNÉES MANQUANTES
- **Action** : Recommandations pour obtenir des analyses

### Données insuffisantes
- **Algorithme équitable** : Bénéfice du doute à 50/100
- **Transparence** : Affichage de tous les paramètres importants
- **Fiabilité** : Calcul pondéré par criticité

### Contamination critique
- **E. coli détecté** : Score = 0, niveau CRITIQUE
- **Déclassement** : Score ajusté selon la gravité
- **Alertes** : Messages d'urgence affichés

## 🎨 Personnalisation

### CSS v5.3
Nouveaux styles pour l'affichage amélioré :
```css
.parameter-item.improved {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 1px solid #e9ecef;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s ease;
}

.parameter-value-section {
  background: #f1f3f4;
  padding: 10px;
  border-radius: 6px;
}

.parameter-interpretation {
  color: #7f8c8d;
  font-style: italic;
}
```

### JavaScript
Fonctions modulaires réutilisables :
- Modification des seuils de scoring
- Ajout de nouveaux paramètres
- Personnalisation des interprétations
- Nouveau système de badges

## 📱 Responsive Design

- **Mobile-first** : Interface optimisée pour tous les écrans
- **Progressive Enhancement** : Fonctionne même sans JavaScript
- **Accessibilité** : Support lecteurs d'écran, navigation clavier
- **Accordéon adaptatif** : Design responsive pour les détails

## 🔒 Sécurité et Performance

### Sécurité
- **APIs publiques** : Aucune donnée sensible exposée
- **Validation côté client** : Contrôles des entrées utilisateur
- **Pas de stockage** : Aucune donnée personnelle conservée

### Performance v5.3
- **Chargement différé** : Script chargé avec `defer`
- **Debouncing** : Limitation des appels API d'autocomplétion
- **Cache navigateur** : Optimisation automatique des ressources
- **Animations optimisées** : Transitions CSS fluides

## 🐛 Débogage

### Logs de débogage v5.3
Le script affiche des logs détaillés dans la console :
```javascript
console.log('=== CALCUL SCORING SCIENTIFIQUE ÉQUITABLE v5.3 ===');
console.log('✅ Données trouvées dans la commune principale');
console.log('🔍 Recherche dans les communes voisines...');
console.log('E. coli: 100/100 (testé)');
console.log('Score final: 79, Fiabilité: 58%');
```

### Erreurs courantes
1. **Adresse non trouvée** : Vérifier la saisie
2. **Pas de données Hubeau** : Normal pour certaines communes rurales
3. **Erreur réseau** : Problème de connectivité
4. **Affichage "undefined"** : Corrigé automatiquement en v5.3

## 📈 Métriques et Statistiques

### Exemple de résultat type
```
Score final: 79/100 🟢 TRÈS BON
Fiabilité: 58% (29/47 paramètres testés)

Catégories:
🦠 Microbiologie: 93/100 (6/7 testés) - Excellent
🔗 Métaux lourds: 57/100 (1/7 testés) - Améliorable  
🧪 PFAS: 88/100 (3/4 testés) - Excellent
⚗️ Nitrates: 75/100 (3/3 testés) - Très bon
🌿 Pesticides: 87/100 (6/8 testés) - Excellent
```

## 🔬 Base scientifique

### Normes utilisées
- **UE Directive 2020/2184** (Eau potable)
- **OMS Guidelines 2022** (4e édition)
- **Code de la santé publique français**
- **Normes ISO** pour méthodes d'analyse

### Principe de transparence
- Aucun paramètre ajouté sans norme officielle reconnue
- Bénéfice du doute scientifique pour les paramètres non testés
- Calcul de fiabilité pondérée par criticité sanitaire

## 📝 Licence et Crédits

### Données
- **Hubeau** : Service public - Licence Ouverte
- **IGN** : Base Adresse Nationale - Licence Ouverte

### Code
- **Auteur** : Life Water Research Group
- **Version** : 5.3 - Scoring équitable avec affichage amélioré
- **License** : Propriétaire

## 🆕 Changelog v5.3

### Nouvelles fonctionnalités
- ✅ Affichage "Non détecté" pour paramètres microbiologiques
- ✅ Badges colorés avec emojis
- ✅ Interprétations claires et contextuelles
- ✅ Correction automatique des unités
- ✅ Dates d'analyse affichées
- ✅ Design premium avec effets hover
- ✅ Accordéon entièrement fonctionnel

### Améliorations techniques
- ✅ Fonctions de formatage modulaires
- ✅ Gestion intelligente des cas spéciaux
- ✅ CSS optimisé et responsive
- ✅ Export global des nouvelles fonctions
- ✅ Logs de debug enrichis

### Corrections
- 🔧 Structure du code réorganisée
- 🔧 Fonction toggleCategory exportée globalement
- 🔧 CSS intégré correctement dans la génération HTML
- 🔧 Gestion des erreurs améliorée

## 🤝 Support

Pour toute question ou problème :
1. Vérifiez les logs de la console navigateur
2. Testez avec différentes adresses
3. Vérifiez que les fichiers `baremes-eau.js` et `scoring-eau.js` sont bien chargés
4. Contactez l'équipe de développement

## 🚀 Roadmap future

### Version 6.0 (à venir)
- Integration de nouveaux paramètres émergents
- Système de notifications en temps réel
- API personnalisée pour analyses privées
- Dashboard administrateur
- Rapports PDF exportables

---

*Analyseur développé par Life Water - "Rendre à la terre une eau digne de confiance"*

**Version 5.3** - Décembre 2024 - Scoring équitable avec affichage amélioré
