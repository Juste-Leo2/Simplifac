import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/storage';
import { StorageService } from '../services/storage';

interface UserContextProps {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  age: '',
  university: '',
  ufr: '',
  studyLevel: '',
  otherLevel: '',
  fieldOfStudy: '',
  ineNumber: '',
  crousStatus: '',
  hasScholarship: false,
  hasHousing: false,
};

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    return StorageService.getProfile() || defaultProfile;
  });

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      StorageService.saveProfile(next);
      return next;
    });
  };

  return (
    <UserContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
