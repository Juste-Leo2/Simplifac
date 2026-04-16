export type CaseCategory = 'Grant' | 'Housing' | 'Exam' | 'Other';
export type CaseStatus = 'In Progress' | 'Resolved' | 'Draft';

export interface Message {
  id: string;
  text: string;
  sender: 'Student' | 'Administration' | 'AI';
  createdAt: string;
}

export interface StudentCase {
  id: string;
  title: string;
  category: CaseCategory;
  status: CaseStatus;
  messages: Message[];
  updatedAt: string;
}
