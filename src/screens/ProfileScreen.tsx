import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../utils/ThemeContext';
import { useUser } from '../utils/UserContext';
import { ThemeColors } from '../types/theme';

import BottomSelectModal from '../components/BottomSelectModal';
import universityData from '../../data/university.json';
import choicesData from '../../data/choices.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile, updateProfile } = useUser();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // States: Études (pour la recherche uniquement, le reste est dans le context)
  const [universityQuery, setUniversityQuery] = React.useState(profile.university);
  const [showUnivSuggestions, setShowUnivSuggestions] = React.useState(false);
  const [selectedUnivObj, setSelectedUnivObj] = React.useState<typeof universityData.universities[0] | null>(() => {
    // Tenter de retrouver l'objet université à partir du nom sauvegardé
    return universityData.universities.find(u => (u.common_name || u.official_name) === profile.university) || null;
  });

  const [showUfrModal, setShowUfrModal] = React.useState(false);

  const [filiere, setFiliere] = React.useState(profile.fieldOfStudy);
  const [showFiliereSuggestions, setShowFiliereSuggestions] = React.useState(false);

  const levels = choicesData.studyLevels;
  const [showLevelModal, setShowLevelModal] = React.useState(false);

  // States: CROUS
  const [showCrousModal, setShowCrousModal] = React.useState(false);

  // Recherche Université
  const univSuggestions = React.useMemo(() => {
    if (!universityQuery || universityQuery.length < 2) return [];
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normalizedQuery = normalize(universityQuery);

    return universityData.universities.filter(u =>
      normalize(u.official_name).includes(normalizedQuery) ||
      (u.common_name && normalize(u.common_name).includes(normalizedQuery))
    ).slice(0, 5); // limite à 5 résultats pour la fluidité
  }, [universityQuery]);

  const handleSelectUniv = (univ: typeof universityData.universities[0]) => {
    const name = univ.common_name || univ.official_name;
    setSelectedUnivObj(univ);
    setUniversityQuery(name);
    setShowUnivSuggestions(false);
    updateProfile({ university: name, ufr: '' });
  };

  // Recherche Filière
  const filiereSuggestions = React.useMemo(() => {
    if (!filiere || filiere.length < 2) return [];
    const lowerQuery = filiere.toLowerCase();

    // Normalise les accents pour une meilleure recherche
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedQuery = normalize(lowerQuery);

    return choicesData.fieldsOfStudy
      .filter(f => normalize(f.toLowerCase()).includes(normalizedQuery))
      .slice(0, 5);
  }, [filiere]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNIERE VIE PRIVEE (Privacy by Design) */}
        <View style={styles.privacyBanner}>
          <Text style={styles.privacyIcon}>🛡️</Text>
          <View style={styles.privacyTextContainer}>
            <Text style={styles.privacyTitle}>Tes données restent ici</Text>
            <Text style={styles.privacyText}>
              Toutes les informations saisies ici sont stockées uniquement sur ton téléphone.
              Elles servent au traducteur IA pour pré-remplir les courriers et accélérer tes démarches administratives.
            </Text>
          </View>
        </View>

        {/* SECTION : IDENTITE */}
        <Text style={styles.sectionTitle}>Identité</Text>
        <View style={styles.cardGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Thomas"
              placeholderTextColor="#6B7280"
              value={profile.firstName}
              onChangeText={(text) => updateProfile({ firstName: text })}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Dupont"
              placeholderTextColor="#6B7280"
              value={profile.lastName}
              onChangeText={(text) => updateProfile({ lastName: text })}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Âge</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 21"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={profile.age}
              onChangeText={(text) => updateProfile({ age: text })}
            />
          </View>
        </View>

        {/* SECTION : ETUDES */}
        <Text style={styles.sectionTitle}>Études</Text>
        <View style={styles.cardGroup}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Université / Établissement</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Sorbonne Université"
              placeholderTextColor="#6B7280"
              value={universityQuery}
              onChangeText={text => {
                setUniversityQuery(text);
                setShowUnivSuggestions(true);
                if (selectedUnivObj && text !== (selectedUnivObj.common_name || selectedUnivObj.official_name)) {
                  setSelectedUnivObj(null);
                  updateProfile({ university: text, ufr: '' });
                } else if (!selectedUnivObj) {
                  updateProfile({ university: text });
                }
              }}
              onFocus={() => setShowUnivSuggestions(true)}
            />
            {showUnivSuggestions && univSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {univSuggestions.map((u, index) => (
                  <TouchableOpacity
                    key={u.official_name}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectUniv(u)}
                  >
                    <Text style={styles.suggestionText}>
                      {u.common_name || u.official_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {selectedUnivObj && selectedUnivObj.components && selectedUnivObj.components.length > 0 && (
            <>
              <View style={styles.separator} />
              <View style={styles.inputContainer}>
                <Text style={styles.label}>UFR / Composante</Text>
                <TouchableOpacity onPress={() => setShowUfrModal(true)} style={styles.modalSelectBtn}>
                  <Text style={[styles.textInput, !profile.ufr && { color: '#6B7280' }]}>
                    {profile.ufr || "Sélectionner la composante"}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Niveau d'étude</Text>
            <TouchableOpacity onPress={() => setShowLevelModal(true)} style={styles.modalSelectBtn}>
              <Text style={[styles.textInput, !profile.studyLevel && { color: '#6B7280' }]}>
                {profile.studyLevel || "Ex: L1, Master 2..."}
              </Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
          </View>

          {profile.studyLevel === 'Autres' && (
            <>
              <View style={styles.separator} />
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Précise ton niveau</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: BTS, BUT..."
                  placeholderTextColor="#6B7280"
                  value={profile.otherLevel}
                  onChangeText={(text) => updateProfile({ otherLevel: text })}
                />
              </View>
            </>
          )}

          <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Filière</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Informatique, Droit..."
              placeholderTextColor="#6B7280"
              value={filiere}
              onChangeText={text => {
                setFiliere(text);
                setShowFiliereSuggestions(true);
              }}
              onFocus={() => setShowFiliereSuggestions(true)}
            />
            {showFiliereSuggestions && filiereSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {filiereSuggestions.map((f, index) => (
                  <TouchableOpacity
                    key={f}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setFiliere(f);
                      setShowFiliereSuggestions(false);
                      updateProfile({ fieldOfStudy: f });
                    }}
                  >
                    <Text style={styles.suggestionText}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Numéro Étudiant (INE)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 123456789AZ"
              placeholderTextColor="#6B7280"
              value={profile.ineNumber}
              onChangeText={(text) => updateProfile({ ineNumber: text })}
            />
          </View>

          <View style={styles.separator} />
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Statut (CROUS)</Text>
            <TouchableOpacity onPress={() => setShowCrousModal(true)} style={styles.modalSelectBtn}>
              <Text style={[styles.textInput, !profile.crousStatus && { color: '#6B7280' }]}>
                {profile.crousStatus || "Sélectionner le statut"}
              </Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.scannerButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Curriculum')}
          >
            <Text style={styles.scannerIcon}>📋</Text>
            <Text style={styles.scannerText}>Ma filière</Text>
            <Text style={styles.chevron}>▶</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals de Saisie */}
      <BottomSelectModal
        visible={showUfrModal}
        onClose={() => setShowUfrModal(false)}
        title="Sélectionner une composante"
        options={selectedUnivObj?.components || []}
        onSelect={(val) => updateProfile({ ufr: val })}
      />

      <BottomSelectModal
        visible={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        title="Niveau d'étude"
        options={levels}
        onSelect={(val) => updateProfile({ studyLevel: val })}
      />

      <BottomSelectModal
        visible={showCrousModal}
        onClose={() => setShowCrousModal(false)}
        title="Statut (CROUS)"
        options={choicesData.crousStatus}
        onSelect={(val) => updateProfile({ crousStatus: val })}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44, // Permet de centrer le titre
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  privacyBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHighlight, // Violet très léger pour apaiser
    borderColor: 'rgba(147, 51, 234, 0.3)', // À remplacer éventuellement
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  privacyText: {
    color: colors.textSecondary, // Gris très clair
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  cardGroup: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 8,
    marginBottom: 24,
    // Ombre légère
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  textInput: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 6,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: colors.surfaceHighlight || 'rgba(147, 51, 234, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
  },
  modalSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  scannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  scannerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  scannerText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
