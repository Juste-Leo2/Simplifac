import { ThemeType } from './theme';

export interface UserPreferences {
  theme: ThemeType;
  // D'autres paramètres comme les notifications pourront être ajoutés ici
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  age: string;
  university: string;
  fieldOfStudy: string;
  ineNumber: string;
  hasScholarship: boolean;
  hasHousing: boolean;
}

export interface CurriculumEntry {
  id: string;
  semester: string;
  ue: string;
  subject: string;
  teacher: string;
  coefficient: number;
  ects: number;
}

export interface CurriculumData {
  entries: CurriculumEntry[];
  lastUpdated: string;
}
