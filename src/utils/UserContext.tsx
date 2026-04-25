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
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    if (savedProfile) {
      setProfile(savedProfile);
    }
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfile(newProfile);
    StorageService.saveProfile(newProfile);
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
