export type PlayerStats = {
  currentStreak: number;
  longestStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  lastCompletedDate?: string;
};

export type PlayerSettings = {
  onboardingCompleted: boolean;
  dailyReminder: boolean;
  reminderTime: ReminderTime;
  haptics: boolean;
  sound: boolean;
  darkMode: boolean;
  colorBlindMode: boolean;
};

export type ReminderTime = {
  hour: number;
  minute: number;
};
