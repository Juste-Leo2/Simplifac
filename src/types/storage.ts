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

export interface SubjectNote {
  subjectId: string;
  content: string;
  lastUpdated: string;
}

export type MailEntryType = 'received' | 'draft' | 'sent';

export interface MailEntry {
  id: number;
  type: MailEntryType;
  subject: string;
  from?: string;
  to?: string;
  content: string;
  extractedAt?: string;
  confirmedByUser: boolean;
  draftVersion?: number;
  finalizedByUser?: boolean;
  finalizedAt?: string;
}

export interface MailThread {
  discussion: string;
  mails: MailEntry[];
}

export interface ChatSession {
  id: string;
  title: string;
  mode: 'exam_copy' | 'free_problem' | 'history' | 'mail_thread';
  subject?: string;
  messages: any[];
  mailThread?: MailThread;
  updatedAt: string;
}
