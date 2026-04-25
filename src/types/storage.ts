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
  ufr: string;
  studyLevel: string;
  otherLevel: string;
  fieldOfStudy: string;
  ineNumber: string;
  crousStatus: string;
  hasScholarship: boolean;
  hasHousing: boolean;
}

export interface CurriculumEntry {
  id: string;
  semester: string;
  ue: string;
  subject: string;
  teacher: string;
  coefficient: number | string;
  ects: number | string;
}

export interface CurriculumData {
  entries: CurriculumEntry[];
  lastUpdated: string;
}
