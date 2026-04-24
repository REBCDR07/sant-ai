import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Fonts } from '../theme/typography';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface HomeScreenProps {
  onStart: () => void;
}

interface UserProfile {
  icon: IconName;
  role: string;
  context: string;
  value: string;
}

interface ModuleItem {
  icon: IconName;
  title: string;
  steps: string[];
  outputs?: string[];
}

const USER_PROFILES: UserProfile[] = [
  {
    icon: 'account-heart-outline',
    role: 'Agent de sante communautaire (ASC)',
    context: 'Terrain, village recule, smartphone basique.',
    value: 'Diagnostic en 30 secondes et conduite a tenir claire, sans jargon medical.',
  },
  {
    icon: 'office-building-outline',
    role: 'Responsable de district sanitaire',
    context: 'Bureau regional.',
    value: 'Alertes epidemiques automatiques en temps reel.',
  },
  {
    icon: 'doctor',
    role: 'Medecin superviseur',
    context: 'Centre de sante de reference.',
    value: 'Suivi des cas critiques remontes par les ASC.',
  },
];

const MODULES: ModuleItem[] = [
  {
    icon: 'stethoscope',
    title: 'Module 1 - Diagnostic IA par symptomes',
    steps: [
      'L ASC ouvre SanteAI, saisit nom, age, sexe, poids et les observations.',
      'Il selectionne les symptomes observes et ajoute ses notes libres.',
      'Il appuie sur Analyser avec IA.',
    ],
    outputs: [
      'Diagnostic probable',
      'Niveau d urgence: Critique, Urgent, Modere, Stable',
      'Conduite a tenir simple et actionnable',
      'Medicaments de premiere ligne disponibles localement',
      'Signes d alarme pour transfert immediat',
    ],
  },
  {
    icon: 'camera-account',
    title: 'Module 2 - Detection malnutrition par vision IA',
    steps: [
      'L ASC prend une photo de l enfant ou charge une image.',
      'Le modele visuel analyse les signes de kwashiorkor, marasme et l etat general.',
    ],
    outputs: [
      'Score de risque: Eleve, Modere, Faible',
      'Type de malnutrition suspecte',
      'Recommandation immediate',
      'Indication claire de transfert si necessaire',
    ],
  },
  {
    icon: 'alert-decagram-outline',
    title: 'Module 3 - Alertes epidemiques automatiques',
    steps: [
      'Chaque diagnostic est enregistre pendant la session.',
      'A partir de 3 cas similaires: alerte de surveillance automatique.',
      'A partir de 5 cas similaires: alerte critique pour le district.',
      'Le tableau de bord affiche cas, cas critiques et alertes actives en temps reel.',
    ],
  },
  {
    icon: 'clipboard-text-clock-outline',
    title: 'Module 4 - Historique des cas',
    steps: [
      'Tous les patients tries sont listes avec code couleur par gravite.',
      'Vue rapide: nom, age, diagnostic, niveau d urgence.',
      'Permet a l ASC de preparer son rapport journalier rapidement.',
    ],
  },
];

const WIN_POINTS = [
  'Repond au besoin terrain: triage, vision IA et alertes dans un seul outil.',
  'Demo rapide en quelques minutes avec resultats visibles immediatement.',
  'Impact mesurable: environ 30 secondes pour orienter un cas prioritaire.',
  'Mobile first: pense pour Android d entree de gamme en zone rurale.',
];

function UserCard({ icon, role, context, value }: UserProfile) {
  return (
    <View style={styles.userCard}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color="#0f766e" />
      </View>
      <View style={styles.userTextWrap}>
        <Text style={styles.userRole}>{role}</Text>
        <Text style={styles.userContext}>{context}</Text>
        <Text style={styles.userValue}>{value}</Text>
      </View>
    </View>
  );
}

function ModuleCard({ icon, title, steps, outputs }: ModuleItem) {
  return (
    <View style={styles.moduleCard}>
      <View style={styles.moduleHeader}>
        <MaterialCommunityIcons name={icon} size={16} color="#0f172a" />
        <Text style={styles.moduleTitle}>{title}</Text>
      </View>

      {steps.map((line) => (
        <View key={line} style={styles.lineItem}>
          <MaterialCommunityIcons name="chevron-right" size={14} color="#0f766e" />
          <Text style={styles.lineText}>{line}</Text>
        </View>
      ))}

      {outputs ? (
        <View style={styles.outputBox}>
          <Text style={styles.outputTitle}>Resultats fournis</Text>
          {outputs.map((line) => (
            <View key={line} style={styles.lineItem}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color="#15803d" />
              <Text style={styles.lineText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>SanteAI - Assistant de triage communautaire</Text>
        <Text style={styles.heroText}>
          Dans les districts ruraux d Afrique, un enfant atteint de paludisme ou de pneumonie
          peut mourir en moins de 24h sans prise en charge. SanteAI aide les ASC a diagnostiquer,
          detecter la malnutrition et declencher des alertes plus vite.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pour qui ?</Text>
        {USER_PROFILES.map((profile) => (
          <UserCard key={profile.role} {...profile} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comment ca fonctionne ?</Text>
        {MODULES.map((module) => (
          <ModuleCard key={module.title} {...module} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pourquoi c est une solution qui gagne</Text>
        {WIN_POINTS.map((point) => (
          <View key={point} style={styles.lineItem}>
            <MaterialCommunityIcons name="check-decagram" size={14} color="#15803d" />
            <Text style={styles.lineText}>{point}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={onStart}>
        <View style={styles.ctaInner}>
          <MaterialCommunityIcons name="play-circle-outline" size={18} color="#ffffff" />
          <Text style={styles.ctaText}>Demarrer</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    paddingBottom: 128,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    backgroundColor: '#0f172a',
    padding: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 19,
    lineHeight: 24,
    fontFamily: Fonts.display,
  },
  heroText: {
    marginTop: 8,
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.body,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontFamily: Fonts.display,
  },
  userCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ccfbf1',
  },
  userTextWrap: {
    flex: 1,
    gap: 2,
  },
  userRole: {
    color: '#0f172a',
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  userContext: {
    color: '#334155',
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  userValue: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  moduleCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 8,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  lineText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  outputBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    padding: 8,
    gap: 6,
  },
  outputTitle: {
    color: '#166534',
    fontSize: 12,
    fontFamily: Fonts.heading,
  },
  ctaButton: {
    borderRadius: 14,
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: Fonts.display,
  },
});
