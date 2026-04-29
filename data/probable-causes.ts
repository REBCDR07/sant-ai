export type DiseaseReference = {
  diseaseCategory: string;
  label: string;
  definition?: string;
  keywords: string[];
  probableCauses: string[];
  keySymptoms: string[];
  redFlags: string[];
  initialActions: string[];
};

export const diseaseReferences: DiseaseReference[] = [
  {
    diseaseCategory: 'paludisme',
    label: 'Paludisme',
    definition: 'Infection parasitaire transmise par la piqure du moustique Anopheles et due aux parasites Plasmodium.',
    keywords: ['paludisme', 'palu', 'malaria', 'fievre intermittente', 'fievre', 'frissons', 'sueurs', 'maux de tete', 'nausee', 'vomissements', 'diarrhee', 'fatigue', 'anemie', 'moustique', 'anopheles', 'plasmodium', 'parasite', 'piqure de moustique', 'zone endemique', 'moustiquaire'],
    probableCauses: [
      'Piqure de moustique Anopheles porteur de Plasmodium',
      'Residence ou voyage dans une zone endemique',
      'Absence de moustiquaire ou de protection antivectorielle',
      'Eau stagnante et forte exposition aux moustiques',
    ],
    keySymptoms: [
      'Fievre, frissons et sueurs',
      'Maux de tete et fatigue intense',
      'Nausee, vomissements ou diarrhee',
      'Anemie, faiblesse ou douleurs musculaires',
    ],
    redFlags: [
      'Confusion, somnolence ou coma',
      'Convulsions',
      'Difficulte respiratoire',
      'Jaunisse, urines foncees ou insuffisance renale suspectee',
    ],
    initialActions: [
      'Faire un test rapide ou une goutte epaisse si disponible',
      'Demarrer le traitement antipaludique selon le protocole local',
      'Hydrater et traiter la fievre',
      'Referer en urgence si signes de paludisme severe',
    ],
  },
  {
    diseaseCategory: 'dengue',
    label: 'Dengue',
    definition: 'Infection virale transmise par les moustiques Aedes pouvant causer une forte fievre et, dans les formes graves, des saignements ou un choc.',
    keywords: ['dengue', 'fievre dengue', 'break bone fever', 'aedes', 'aedes aegypti', 'aedes albopictus', 'moustique tigre', 'piqure de moustique', 'fievre elevee', 'forte fievre', 'maux de tete', 'douleur derriere les yeux', 'douleur oculaire', 'douleurs musculaires', 'douleurs articulaires', 'courbatures', 'rash', 'eruption cutanee', 'nausee', 'vomissements', 'saignement', 'gencives qui saignent', 'nez qui saigne', 'fatigue', 'agitation', 'choc'],
    probableCauses: [
      'Piqure de moustique Aedes infecte',
      'Residence ou voyage en zone tropicale ou urbaine a risque',
      'Presence d eaux stagnantes et de gites larvaires',
      'Exposition aux moustiques pendant la journee',
    ],
    keySymptoms: [
      'Fievre elevee',
      'Maux de tete et douleur derriere les yeux',
      'Douleurs musculaires et articulaires',
      'Nausee, vomissements et rash',
    ],
    redFlags: [
      'Douleur abdominale intense',
      'Vomissements persistants',
      'Saignements des gencives ou du nez',
      'Sang dans les vomissements ou les selles',
    ],
    initialActions: [
      'Donner du paracetamol et eviter l ibuprofene ou l aspirine',
      'Hydrater abondamment et surveiller la diurese',
      'Referer rapidement si signes de dengue severe',
      'Protege contre les moustiques et rechercher un avis medical',
    ],
  },
  {
    diseaseCategory: 'marasme',
    label: 'Marasme',
    definition: 'Forme severe de denutrition proteino-energetique avec amaigrissement extreme et fonte musculaire.',
    keywords: ['marasme', 'emaciation', 'emacie', 'fonte musculaire', 'amaigrissement severe', 'cachexie', 'peau plisee', 'os visibles', 'cotes saillantes', 'visage de vieillard', 'bras tres mince', 'wasting', 'severe wasting', 'severe acute malnutrition', 'perte de graisse', 'faiblesse', 'apathie'],
    probableCauses: [
      'Apport calorique et proteique trop faible pendant une longue periode',
      'Famine, insecurite alimentaire ou pauvrete extreme',
      'Sevrage precoce ou alimentation complementaire insuffisante',
      'Diarrhee chronique, malabsorption ou infection repetee',
    ],
    keySymptoms: [
      'Amaigrissement extreme et perte de graisse sous-cutanee',
      'Fonte musculaire avec cotes saillantes',
      'Faiblesse, fatigue et apathie',
      'Poids tres bas pour la taille ou MUAC bas',
    ],
    redFlags: [
      'Lethargie, hypoglycemie ou hypothermie',
      'Incapacite a boire ou a manger',
      'Deshydratation ou choc',
      'Presence d oedemes bilateraux ou infection severe',
    ],
    initialActions: [
      'Evaluer la gravite nutritionnelle sans tarder',
      'Rechercher hypoglycemie, hypothermie et deshydratation',
      'Demarrer une prise en charge nutritionnelle therapeutique',
      'Referer en urgence si l etat general est altere',
    ],
  },
  {
    diseaseCategory: 'kwashiorkor',
    label: 'Kwashiorkor',
    definition: 'Forme severe de malnutrition due surtout a une carence en proteines, souvent avec oedemes.',
    keywords: ['kwashiorkor', 'protein malnutrition', 'carence proteique', 'carence en proteines', 'oedeme', 'oedemes', 'edeme', 'gonflement', 'ventre gonfle', 'pieds gonfles', 'mains gonflees', 'visage gonfle', 'dermatite', 'lesions cutanees', 'changements de peau', 'cheveux fins', 'cheveux decolores', 'cheveux cassants', 'apathie', 'irritabilite', 'faiblesse musculaire', 'foie gros', 'malnutrition severe'],
    probableCauses: [
      'Apport insuffisant en proteines sur une longue periode',
      'Famine, pauvrete ou insecurite alimentaire',
      'Sevrage precoce avec alimentation surtout basee sur les feculents',
      'Diarrhee, infection repetee ou malabsorption',
    ],
    keySymptoms: [
      'Oedemes bilateraux des pieds, jambes ou visage',
      'Ventre gonfle avec perte de masse musculaire',
      'Changements de peau et de cheveux',
      'Apathie, irritabilite et retard de croissance',
    ],
    redFlags: [
      'Lethargie ou trouble de conscience',
      'Incapacite a boire ou a manger',
      'Hypoglycemie, hypothermie ou choc',
      'Infection severe ou oedemes importants',
    ],
    initialActions: [
      'Evaluer la gravite nutritionnelle sans tarder',
      'Verifier la temperature et la glycemie si possible',
      'Traiter les infections et la deshydratation associees',
      'Referer en urgence pour prise en charge therapeutique',
    ],
  },
  {
    diseaseCategory: 'beriberi',
    label: 'Beriberi',
    definition: 'Carence en vitamine B1 (thiamine) pouvant provoquer une atteinte neurologique ou cardiaque.',
    keywords: ['beriberi', 'beri beri', 'thiamine', 'vitamine b1', 'carence b1', 'carence en thiamine', 'carence en vitamine b1', 'fourmillement', 'engourdissement', 'paresthesie', 'difficulte a marcher', 'faiblesse des jambes', 'paralysie', 'oedeme', 'dyspnee', 'tachycardie', 'insuffisance cardiaque', 'confusion', 'ataxie', 'nystagmus', 'vomissements', 'irritabilite', 'nourrisson', 'alcoolisme', 'dialyse', 'diuretiques', 'wernicke', 'polyneuropathie', 'beriberi sec', 'beriberi humide'],
    probableCauses: [
      'Apport insuffisant en thiamine (vitamine B1)',
      'Regime tres pauvre ou base sur riz poli et aliments raffines',
      'Alcoolisme chronique ou malabsorption digestive',
      'Grossesse, allaitement, dialyse ou diuretiques a forte dose',
    ],
    keySymptoms: [
      'Fourmillements, engourdissement ou perte de sensation',
      'Faiblesse des jambes et difficulte a marcher',
      'Essoufflement, tachycardie ou oedemes',
      'Confusion, ataxie ou troubles oculaires',
    ],
    redFlags: [
      'Essoufflement important ou signes d insuffisance cardiaque',
      'Confusion, ataxie ou troubles oculaires',
      'Paralysie ou faiblesse brutale',
      'Vomissements repetes ou malaise severe',
    ],
    initialActions: [
      'Administrer rapidement de la thiamine avant le glucose si possible',
      'Corriger l alimentation et l hydratation',
      'Referer si signes cardiaques ou neurologiques',
      'Evaluer alcoolisme, malnutrition ou trouble digestif associe',
    ],
  },
  {
    diseaseCategory: 'diarrhee_aigue',
    label: 'Diarrhee aiguë / gastroenterite',
    keywords: ['diarrhee', 'selles liquides', 'vomissement', 'douleur ventre', 'crampes', 'nausee', 'sang dans les selles', 'fièvre'],
    probableCauses: [
      'Eau contaminee ou mauvaise hygiene',
      'Aliments contamines ou mal conserves',
      'Infection virale, bacterienne ou parasitaire',
      'Contamination fecale de l environnement',
    ],
    keySymptoms: [
      'Selles liquides frequentes',
      'Crampes ou douleurs abdominales',
      'Nausee, vomissements ou fievre',
      'Faiblesse et perte d appetit',
    ],
    redFlags: [
      'Sang dans les selles',
      'Deshydratation severe',
      'Vomissements persistants',
      'Lethargie ou absence d urine',
    ],
    initialActions: [
      'Faire boire des solutions de rehydratation orale',
      'Evaluer rapidement la deshydratation',
      'Referer si sang, vomissements persistants ou signes severes',
      'Renforcer l hygiene et l eau potable',
    ],
  },
  {
    diseaseCategory: 'cholera',
    label: 'Cholera',
    definition: 'Infection intestinale due a Vibrio cholerae provoquant une diarrhee aqueuse abondante et une deshydratation rapide.',
    keywords: ['cholera', 'vibrio cholerae', 'diarrhee aqueuse', 'diarrhee profuse', 'eau de riz', 'vomissements', 'crampes', 'crampes des jambes', 'deshydratation', 'soif intense', 'yeux enfonces', 'faiblesse', 'eau contaminee', 'aliments contamines', 'mauvaise hygiene', 'assainissement', 'epidemie'],
    probableCauses: [
      'Eau ou aliments contamines par Vibrio cholerae',
      'Mauvaises conditions d hygiene et d assainissement',
      'Contact avec un cas ou exposition pendant une epidemie',
      'Absence d eau potable et contamination fecale',
    ],
    keySymptoms: [
      'Diarrhee aqueuse abondante',
      'Vomissements et crampes des jambes',
      'Soif, faiblesse et baisse des urines',
      'Yeux enfonces ou peau peu elastique',
    ],
    redFlags: [
      'Deshydratation severe',
      'Incapacite a boire',
      'Choc ou somnolence',
      'Absence d urine',
    ],
    initialActions: [
      'Donner immediatement une solution de rehydratation orale',
      'Referer si la deshydratation est severe ou si la personne ne peut pas boire',
      'Utiliser des fluides intraveineux et des antibiotiques selon protocole si severe',
      'Renforcer l eau potable, l hygiene et l isolement des selles',
    ],
  },
  {
    diseaseCategory: 'deshydratation',
    label: 'Deshydratation',
    keywords: ['soif', 'bouche seche', 'urine rare', 'vertiges', 'yeux enfonces', 'pli cutane', 'fatigue', 'vomissement', 'diarrhee'],
    probableCauses: [
      'Pertes digestives par diarrhee ou vomissements',
      'Fievre, chaleur ou sudation importante',
      'Apport hydrique insuffisant',
      'Allaitement ou alimentation insuffisante chez le nourrisson',
    ],
    keySymptoms: [
      'Soif intense et bouche seche',
      'Urine rare ou absente',
      'Vertiges, faiblesse ou yeux enfonces',
      'Peau peu elastique ou pleurs sans larmes',
    ],
    redFlags: [
      'Confusion ou lethargie',
      'Incapacite a boire',
      'Pouls rapide ou signes de choc',
      'Absence prolongee d urine',
    ],
    initialActions: [
      'Rehydrater immediatement si la personne peut boire',
      'Surveiller les signes vitaux et l etat mental',
      'Referer si la deshydratation est severe',
      'Traiter la cause sous-jacente',
    ],
  },
  {
    diseaseCategory: 'pneumonie',
    label: 'Pneumonie / infection respiratoire basse',
    keywords: ['toux', 'respiration rapide', 'difficulte respiratoire', 'tirage', 'fievre', 'douleur thoracique', 'sifflement', 'essoufflement'],
    probableCauses: [
      'Infection bacterienne ou virale des poumons',
      'Exposition a la fumee ou air interieur pollue',
      'Malnutrition ou immunite affaiblie',
      'Vie en espace clos ou vaccination incomplete',
    ],
    keySymptoms: [
      'Toux et fievre',
      'Respiration rapide ou difficile',
      'Douleur thoracique ou tirage',
      'Fatigue et malaise general',
    ],
    redFlags: [
      'Lèvres bleues ou cyanose',
      'Confusion ou somnolence',
      'Incapacite a boire',
      'Tirage severe ou saturation basse si mesuree',
    ],
    initialActions: [
      'Mesurer la frequence respiratoire',
      'Donner de l oxygene si disponible et requis',
      'Referer rapidement si difficulte respiratoire',
      'Utiliser le protocole local pour les antibiotiques si indique',
    ],
  },
  {
    diseaseCategory: 'malnutrition',
    label: 'Malnutrition generale',
    definition: 'Desordre nutritionnel lie a des carences, des exces ou des desequilibres de l apport energetique ou nutritionnel.',
    keywords: ['malnutrition', 'denutrition', 'emaciation', 'marasme', 'kwashiorkor', 'oedeme', 'retard de croissance', 'insuffisance ponderale', 'surpoids', 'obesite', 'carence alimentaire'],
    probableCauses: [
      'Apport alimentaire insuffisant, excessif ou desequilibre',
      'Pauvrete, insecurite alimentaire ou conflit',
      'Diarrhee, infection ou maladie chronique repetee',
      'Carence ou exces de vitamines et minerals',
    ],
    keySymptoms: [
      'Amaigrissement, retard de croissance ou prise de poids excessive',
      'Fatigue, faible energie et baisse de l appetit',
      'Carences en vitamines ou minerals',
      'Signes digestifs, oedemes ou changements de comportement',
    ],
    redFlags: [
      'Oedemes bilateraux',
      'Incapacite a boire ou a manger',
      'Lethargie, confusion ou perte de conscience',
      'Perte de poids rapide ou malnutrition severe',
    ],
    initialActions: [
      'Mesurer le poids, la taille et le MUAC',
      'Identifier le type de malnutrition et sa cause probable',
      'Traiter les infections ou la deshydratation associees',
      'Referer si forme severe, oedemes ou danger vital',
    ],
  },
  {
    diseaseCategory: 'denutrition',
    label: 'Denutrition / sous-nutrition',
    definition: 'Deficit durable d apport ou de perte de nutriments qui provoque emaciation, retard de croissance ou insuffisance ponderale.',
    keywords: ['denutrition', 'sous nutrition', 'emaciation', 'maigreur', 'perte de poids', 'bras mince', 'poids faible', 'taille faible', 'poids taille', 'poids age', 'taille age', 'muac', 'marasme'],
    probableCauses: [
      'Apport energetique insuffisant ou repas trop peu frequents',
      'Diarrhee, vomissements ou infection repetee',
      'Malabsorption ou maladie chronique',
      'Pauvrete, rupture alimentaire ou soins insuffisants',
    ],
    keySymptoms: [
      'Amaigrissement ou fonte musculaire',
      'Poids trop bas pour la taille ou l age',
      'Retard de croissance chez l enfant',
      'Faible energie, irritabilite ou fatigue',
    ],
    redFlags: [
      'Oedemes bilateraux',
      'Lethargie ou incapacite a boire',
      'Deshydratation, infection ou hypothermie',
      'Perte de poids rapide ou malnutrition severe',
    ],
    initialActions: [
      'Evaluer la gravite avec MUAC, poids et taille',
      'Rechercher diarrhee, infection ou autre cause associee',
      'Debuter la prise en charge nutritionnelle adaptee',
      'Referer si forme severe ou complication',
    ],
  },
  {
    diseaseCategory: 'retard_croissance',
    label: 'Retard de croissance',
    definition: 'Taille trop faible pour l age en lien avec une sous-nutrition chronique.',
    keywords: ['retard de croissance', 'petit pour son age', 'taille age', 'croissance lente', 'sous nutrition chronique', 'stunting', 'enfant trop petit'],
    probableCauses: [
      'Sous-nutrition chronique sur plusieurs mois ou annees',
      'Infections repetees ou diarrhee chronique',
      'Eau sale, mauvaises conditions sanitaires ou soins insuffisants',
      'Malnutrition maternelle pendant la grossesse ou l allaitement',
    ],
    keySymptoms: [
      'Taille trop faible pour l age',
      'Croissance lente ou stagnante',
      'Poids parfois correct mais taille insuffisante',
      'Retards du developpement ou fatigue chronique',
    ],
    redFlags: [
      'Signes de malnutrition severe associes',
      'Oedemes bilateraux',
      'Retard de developpement important',
      'Infection ou maladie chronique suspectee',
    ],
    initialActions: [
      'Comparer la taille aux courbes de croissance',
      'Interroger l alimentation sur le long terme',
      'Corriger les causes infectieuses et sociales',
      'Referer pour evaluation nutritionnelle et pediatrique',
    ],
  },
  {
    diseaseCategory: 'carence_micronutriments',
    label: 'Carence en micronutriments',
    definition: 'Carence ou exces de vitamines et minerals essentiels.',
    keywords: ['carence', 'micronutriments', 'fer', 'iode', 'folate', 'vitamine a', 'zinc', 'paleur', 'goitre', 'cecite nocturne', 'ongles cassants', 'cheveux fins'],
    probableCauses: [
      'Alimentation peu variee ou pauvre en nutriments',
      'Besoins augmentes pendant la croissance ou la grossesse',
      'Parasitoses, pertes sanguines ou malabsorption',
      'Absence de supplementation ou fortification',
    ],
    keySymptoms: [
      'Paleur, fatigue ou faiblesse',
      'Troubles visuels, goitre ou lesions cutanees',
      'Croissance ralentie ou immunite affaiblie',
      'Cheveux ou ongles fragiles',
    ],
    redFlags: [
      'Anemie severe',
      'Troubles neurologiques ou confusion',
      'Apathie importante ou retard de developpement',
      'Infection associee ou perte de poids',
    ],
    initialActions: [
      'Identifier le micronutriment suspect',
      'Corriger l alimentation et les carences confirmee',
      'Traiter les vers ou la maladie associee si besoin',
      'Referer si anemie severe ou complications',
    ],
  },
  {
    diseaseCategory: 'surpoids_obesite',
    label: 'Surpoids / obesite',
    definition: 'Exces d apport energetique avec accumulation de masse grasse.',
    keywords: ['surpoids', 'obesite', 'imc eleve', 'prise de poids', 'tour de taille', 'sedentaire', 'alimentation grasse', 'alimentation sucree', 'boissons sucrees'],
    probableCauses: [
      'Alimentation trop riche en calories, sucre, graisse ou sel',
      'Sedentarite ou faible activite physique',
      'Habitudes familiales et environnement alimentaire peu sain',
      'Parfois cause endocrine, medicamenteuse ou genetique',
    ],
    keySymptoms: [
      'Poids trop eleve pour la taille',
      'Essoufflement a l effort',
      'Fatigue, ronflement ou douleur articulaire',
      'Tour de taille eleve ou prise de poids progressive',
    ],
    redFlags: [
      'Douleur thoracique',
      'Dyspnee importante',
      'Hypertension, signes de diabete ou malaise',
      'Troubles neurologiques',
    ],
    initialActions: [
      'Evaluer l IMC et les facteurs de risque',
      'Conseiller une alimentation plus saine et l activite physique',
      'Depister diabete, hypertension ou complications',
      'Referer si comorbidites importantes',
    ],
  },
  {
    diseaseCategory: 'anemie',
    label: 'Anemie',
    keywords: ['paleur', 'fatigue', 'vertiges', 'essoufflement', 'palpitations', 'faiblesse', 'anemie', 'malaria', 'vers', 'saignement'],
    probableCauses: [
      'Carence en fer, folates ou vitamine B12',
      'Paludisme ou infection chronique',
      'Perte de sang, vers intestinaux ou regles abondantes',
      'Malnutrition ou grossesse',
    ],
    keySymptoms: [
      'Paleur des conjonctives ou de la peau',
      'Fatigue et faiblesse',
      'Essoufflement ou palpitations',
      'Vertiges et baisse de concentration',
    ],
    redFlags: [
      'Paleur intense ou malaise',
      'Douleur thoracique',
      'Syncope ou trouble de conscience',
      'Grossesse avec signes severes',
    ],
    initialActions: [
      'Chercher la cause sous-jacente',
      'Donner fer/folates selon protocole si approprie',
      'Traiter le paludisme ou les vers si confirmes',
      'Referer si l anemie est severe',
    ],
  },
  {
    diseaseCategory: 'rougeole',
    label: 'Rougeole',
    keywords: ['eruption', 'rash', 'toux', 'nez qui coule', 'conjonctivite', 'fievre', 'taches blanches', 'vaccin'],
    probableCauses: [
      'Absence de vaccination',
      'Exposition a une personne infectee',
      'Vie en milieu tres groupe ou surpeuple',
      'Couverture vaccinale insuffisante dans la communaute',
    ],
    keySymptoms: [
      'Fievre',
      'Toux, rhume et conjonctivite',
      'Eruption cutanee debutant souvent au visage',
      'Taches blanches buccales possibles',
    ],
    redFlags: [
      'Difficulte respiratoire',
      'Dehydratation ou lethargie',
      'Convulsions',
      'Complications oculaires ou neurologiques',
    ],
    initialActions: [
      'Isoler le patient si possible',
      'Hydrater et surveiller la fievre',
      'Donner vitamine A selon le protocole local',
      'Referer si complications ou signes graves',
    ],
  },
  {
    diseaseCategory: 'meningite',
    label: 'Meningite',
    keywords: ['raideur nuque', 'maux de tete', 'fievre', 'vomissements', 'photophobie', 'convulsions', 'confusion', 'fontanelle'],
    probableCauses: [
      'Infection bacterienne ou virale',
      'Vie en espace surpeuple ou contact proche',
      'Vaccination incomplete',
      'Extension d une infection ORL ou sinusienne',
    ],
    keySymptoms: [
      'Fievre et maux de tete intenses',
      'Raideur de la nuque',
      'Vomissements ou photophobie',
      'Confusion ou somnolence',
    ],
    redFlags: [
      'Convulsions',
      'Trouble de conscience',
      'Rash purpurique',
      'Choc ou deterioration rapide',
    ],
    initialActions: [
      'Referer en urgence sans attendre',
      'Ne pas retarder le traitement si suspicion forte',
      'Surveiller les voies respiratoires et l etat neurologique',
      'Appliquer le protocole local d antibiotique si indique',
    ],
  },
  {
    diseaseCategory: 'typhoide',
    label: 'Typhoide',
    keywords: ['fievre prolongee', 'douleur abdominale', 'diarrhee', 'constipation', 'eau sale', 'sanitation', 'fatigue', 'maux de tete'],
    probableCauses: [
      'Eau ou aliments contamines',
      'Mauvais assainissement et hygiene',
      'Contamination fecale de la chaine alimentaire',
      'Exposition dans un foyer ou un quartier a risque',
    ],
    keySymptoms: [
      'Fievre prolongee',
      'Douleur abdominale',
      'Diarrhee ou constipation',
      'Fatigue, maux de tete et malaise',
    ],
    redFlags: [
      'Confusion ou detresse generale',
      'Saignement digestif',
      'Douleur abdominale intense',
      'Deshydratation ou vomissements repetes',
    ],
    initialActions: [
      'Hydrater et surveiller',
      'Faire un test si disponible',
      'Referer pour confirmation et traitement',
      'Renforcer l eau potable et l hygiene',
    ],
  },
  {
    diseaseCategory: 'tuberculose',
    label: 'Tuberculose',
    keywords: ['toux chronique', 'sueur nocturne', 'amaigrissement', 'fievre', 'sang dans les crachats', 'contact tb', 'douleur thoracique'],
    probableCauses: [
      'Exposition a une personne atteinte de TB',
      'Vie en espace ferme ou mal ventile',
      'Malnutrition ou immunite affaiblie',
      'Infection VIH ou maladie chronique associee',
    ],
    keySymptoms: [
      'Toux persistante',
      'Perte de poids et fatigue',
      'Sueurs nocturnes et fievre',
      'Douleur thoracique ou crachats sanguinolents',
    ],
    redFlags: [
      'Sang dans les crachats',
      'Difficulte respiratoire importante',
      'Amaigrissement severe',
      'Signes neurologiques ou malaise profond',
    ],
    initialActions: [
      'Isoler si possible et orienter vers le depistage',
      'Referer pour test et prise en charge',
      'Evaluer les contacts proches',
      'Ne pas retarder si la respiration se degrade',
    ],
  },
  {
    diseaseCategory: 'infection_urinaire',
    label: 'Infection urinaire',
    keywords: ['brulure urinaire', 'frequence', 'urgence mictionnelle', 'douleur bas ventre', 'fievre', 'douleur lombaire', 'urines troubles', 'mauvaise odeur'],
    probableCauses: [
      'Infection bacterienne des voies urinaires',
      'Hydratation insuffisante',
      'Mauvaise hygiene ou retention urinaire',
      'Grossesse ou facteur anatomique',
    ],
    keySymptoms: [
      'Brulure a la miction',
      'Besoin frequent d uriner',
      'Douleur du bas ventre ou du dos',
      'Fievre ou urines troubles',
    ],
    redFlags: [
      'Fievre elevee',
      'Douleur lombaire intense',
      'Vomissements ou grossesse',
      'Confusion ou maladie renale suspectee',
    ],
    initialActions: [
      'Hydrater si la personne peut boire',
      'Faire un test urinaire si disponible',
      'Referer si infection haute suspectee',
      'Traiter selon le protocole local',
    ],
  },
  {
    diseaseCategory: 'infection_cutanee',
    label: 'Infection cutanee / plaie infectee',
    keywords: ['plaie', 'pus', 'rougeur', 'gonflement', 'douleur peau', 'abces', 'croûte', 'fever', 'eczema infecte'],
    probableCauses: [
      'Plaie ou piqure de insecte infectee',
      'Mauvaise hygiene ou grattage repeté',
      'Diabete ou immunite affaiblie',
      'Environnement sale ou humidite locale',
    ],
    keySymptoms: [
      'Rougeur, chaleur et douleur locale',
      'Gonflement ou pus',
      'Fievre si l infection est plus large',
      'Plaie qui ne guerit pas',
    ],
    redFlags: [
      'Rougeur qui s etend rapidement',
      'Necrose ou douleur intense',
      'Atteinte du visage, de l oeil ou de la main',
      'Fievre ou frissons',
    ],
    initialActions: [
      'Nettoyer et proteger la plaie',
      'Surveiller l extension et la fievre',
      'Referer si l infection se propage ou si absces profond',
      'Utiliser un antibiotique selon protocole local si indique',
    ],
  },
];

function normalizeForSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreReference(reference: DiseaseReference, normalizedSymptoms: string) {
  let score = 0;
  const haystack = ` ${normalizedSymptoms} `;

  for (const keyword of reference.keywords) {
    const normalizedKeyword = normalizeForSearch(keyword);
    if (!normalizedKeyword) continue;

    if (haystack.includes(` ${normalizedKeyword} `)) {
      score += Math.max(2, Math.min(6, normalizedKeyword.split(' ').length + 1));
    }
  }

  return score;
}

function formatReference(reference: DiseaseReference, rank: number) {
  const lines = [`${rank}. ${reference.label} (${reference.diseaseCategory})`];

  if (reference.definition) {
    lines.push(`Definition: ${reference.definition}`);
  }

  lines.push(
    `Causes probables: ${reference.probableCauses.join('; ')}`,
    `Signes cles: ${reference.keySymptoms.join('; ')}`,
    `Signes d'alerte: ${reference.redFlags.join('; ')}`,
    `Conduite initiale: ${reference.initialActions.join('; ')}`,
  );

  return lines.join('\n');
}

export function buildRelevantDiseaseReference(symptoms: string, limit = 6) {
  const normalizedSymptoms = normalizeForSearch(symptoms);
  const cappedLimit = Math.max(1, Math.min(limit, diseaseReferences.length));

  const ranked = diseaseReferences
    .map((reference, index) => ({
      reference,
      index,
      score: normalizedSymptoms ? scoreReference(reference, normalizedSymptoms) : 0,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, cappedLimit)
    .map(({ reference }, index) => formatReference(reference, index + 1));

  return `Base de reference medicale locale:\n\n${ranked.join('\n\n')}`;
}
