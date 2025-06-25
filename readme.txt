# 🔬 Analyseur de Qualité de l'Eau - Life Water

Un outil d'analyse de la qualité de l'eau potable utilisant les données officielles françaises (Hubeau) avec recherche géographique étendue et fallback automatique.

## 🌟 Fonctionnalités principales

- **Analyse complète** de la qualité de l'eau potable
- **Recherche géographique étendue** : si aucune donnée n'est disponible pour votre commune, recherche automatique dans les communes voisines (rayon 20km)
- **Scoring équilibré** basé sur 9 catégories de paramètres
- **Interface utilisateur intuitive** avec autocomplétion d'adresse
- **Résultats détaillés** avec recommandations personnalisées
- **Compatible Shopify 2.0** (section Liquid)

## 📋 Structure du projet

```
├── water-scoring.js        # Moteur de calcul principal
├── water-analyzer.liquid   # Interface utilisateur Shopify
└── README.md              # Documentation
```

## 🚀 Installation

### 1. Pour Shopify

1. **Ajouter le fichier JavaScript** :
   - Uploadez `water-scoring.js` dans vos assets Shopify
   - Le fichier sera automatiquement chargé par la section

2. **Ajouter la section** :
   - Créez un nouveau fichier `water-analyzer.liquid` dans `/sections/`
   - Copiez le contenu du fichier fourni

3. **Utilisation** :
   - Ajoutez la section "Water Analyzer" à vos pages via l'éditeur de thème
   - Configurez le titre et la description si souhaité

### 2. Pour autres plateformes

1. **Intégration JavaScript** :
```html
<script src="water-scoring.js"></script>
<script>
// Utiliser les fonctions disponibles
const result = await fetchHubeauDataWithFallback(codeCommune, lat, lon);
const score = calculateWaterQualityScore(result.parametersData, options, result.sourceInfo);
</script>
```

## 🔧 Configuration

### Paramètres de la section Shopify

- **Titre** : Personnalisable via l'éditeur
- **Description** : Texte d'introduction optionnel
- **Styles** : Entièrement personnalisables via CSS

### Options d'analyse

- **Analyse approfondie** : Inclut plus de détails techniques
- **Rayon de recherche** : 20km par défaut (modifiable dans le code)

## 📊 Algorithme de scoring

### Catégories analysées (avec pondération)

1. **🦠 Microbiologique** (20%) - Critère le plus important
2. **🔗 Métaux lourds** (15%) - Arsenic, plomb, cadmium
3. **⚗️ Nitrates** (12%) - Pollution agricole
4. **🌡️ Organoleptiques** (12%) - pH, conductivité, turbidité
5. **🧪 PFAS** (12%) - Polluants éternels
6. **🌿 Pesticides** (10%) - Résidus phytosanitaires
7. **🔬 Microplastiques** (10%) - Pollution plastique
8. **🧬 Médicaments** (9%) - Résidus pharmaceutiques
9. **💧 Autres** (5%) - Chlore, désinfection

### Niveaux de qualité

- **🟢 EXCELLENT** (80-100) : Eau de qualité exceptionnelle
- **🟢 TRÈS BON** (70-79) : Eau de très bonne qualité
- **🟡 BON** (60-69) : Eau de qualité satisfaisante
- **🟡 CORRECT** (50-59) : Eau correcte, améliorations possibles
- **🟠 AMÉLIORABLE** (40-49) : Traitement recommandé
- **🟠 PRÉOCCUPANT** (25-39) : Traitement prioritaire
- **🔴 MAUVAIS** (15-24) : Risques sanitaires
- **🔴 CRITIQUE** (0-14) : Impropre à la consommation

## 🔍 Système de fallback géographique

### Fonctionnement

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

## 🛠️ Fonctions principales

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

### `calculateWaterQualityScore(parametersData, options, sourceInfo)`
Calcule le score de qualité de l'eau.

**Paramètres :**
- `parametersData` : Données des paramètres analysés
- `options` : Options d'analyse (`{analyseApprofondie: boolean}`)
- `sourceInfo` : Informations sur la source des données

**Retour :**
```javascript
{
  score: 85,
  niveau: 'EXCELLENT',
  emoji: '🟢',
  couleur: '#28a745',
  message: 'Eau de qualité exceptionnelle',
  alertes: [...],
  recommandations: [...],
  sourceInfo: {...},
  details: {...}
}
```

### `generateLifeWaterHTML(scoreResult, adresse, parametersData)`
Génère le rapport HTML formaté.

## ⚠️ Gestion des cas particuliers

### Aucune donnée disponible
- **Score** : 0
- **Niveau** : DONNÉES MANQUANTES
- **Action** : Recommandations pour obtenir des analyses

### Données insuffisantes
- **Seuil** : < 3 paramètres
- **Score max** : 70 (plafonné)
- **Niveau** : DONNÉES INSUFFISANTES
- **Action** : Score partiel avec avertissements

### Contamination critique
- **E. coli détecté** : Score = 0, niveau CRITIQUE
- **Déclassement** : Score plafonné selon la gravité
- **Alertes** : Messages d'urgence affichés

## 🎨 Personnalisation

### CSS
Les styles sont entièrement personnalisables via CSS. Classes principales :
- `.water-analyzer-section`
- `.life-water-report`
- `.score-circle`
- `.points-attention`
- `.recommandations`

### JavaScript
Fonctions modulaires réutilisables :
- Modification des seuils de scoring
- Ajout de nouveaux paramètres
- Personnalisation des recommandations

## 📱 Responsive Design

- **Mobile-first** : Interface optimisée pour tous les écrans
- **Progressive Enhancement** : Fonctionne même sans JavaScript
- **Accessibilité** : Support lecteurs d'écran, navigation clavier

## 🔒 Sécurité et Performance

### Sécurité
- **APIs publiques** : Aucune donnée sensible exposée
- **Validation côté client** : Contrôles des entrées utilisateur
- **Pas de stockage** : Aucune donnée personnelle conservée

### Performance
- **Chargement différé** : Script chargé avec `defer`
- **Debouncing** : Limitation des appels API d'autocomplétion
- **Cache navigateur** : Optimisation automatique des ressources

## 🐛 Débogage

### Logs de débogage
Le script affiche des logs détaillés dans la console :
```javascript
console.log('=== RECHERCHE HUBEAU AVEC FALLBACK GÉOGRAPHIQUE ===');
console.log('✅ Données trouvées dans la commune principale');
console.log('🔍 Recherche dans les communes voisines...');
```

### Erreurs courantes
1. **Adresse non trouvée** : Vérifier la saisie
2. **Pas de données Hubeau** : Normal pour certaines communes rurales
3. **Erreur réseau** : Problème de connectivité

## 📝 Licence et Crédits

### Données
- **Hubeau** : Service public - Licence Ouverte
- **IGN** : Base Adresse Nationale - Licence Ouverte

### Code
- **Auteur** : Life Water Research Group
- **Version** : 4.4 - Scoring Équilibré avec Fallback Géographique
- **License** : Propriétaire

## 🤝 Support

Pour toute question ou problème :
1. Vérifiez les logs de la console navigateur
2. Testez avec différentes adresses
3. Contactez l'équipe de développement

---

*Analyseur développé par Life Water - "Rendre à la terre une eau digne de confiance"*
