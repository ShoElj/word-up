import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { LinkRow, ToggleRow } from '@/components/ToggleRow';
import { Screen } from '@/components/Screen';
import { radii, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppState } from '@/contexts/AppStateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ReminderTime } from '@/types/player';
import { formatReminderTime } from '@/utils/reminderTime';

export default function SettingsScreen() {
  const {
    settings,
    updateSettings,
    notificationMessage,
    setDailyReminderEnabled,
    setReminderTimePreference,
  } = useAppState();
  const { colors } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftTime, setDraftTime] = useState<ReminderTime>(settings.reminderTime);

  const openPicker = () => {
    setDraftTime(settings.reminderTime);
    setPickerOpen(true);
  };

  const saveReminderTime = async () => {
    setPickerOpen(false);
    await setReminderTimePreference(draftTime);
  };

  const adjustTime = (field: 'hour' | 'minute', delta: number) => {
    setDraftTime((current) => {
      if (field === 'hour') {
        return { ...current, hour: (current.hour + delta + 24) % 24 };
      }
      return { ...current, minute: (current.minute + delta + 60) % 60 };
    });
  };

  return (
    <>
      <Screen scroll bottomTabs>
        <Header />
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.section, { color: colors.secondaryText }]}>DAILY</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow
            label="Daily reminder"
            value={settings.dailyReminder}
            onValueChange={setDailyReminderEnabled}
            grouped
          />
          <Divider />
          <LinkRow label="Reminder time" value={formatReminderTime(settings.reminderTime)} onPress={openPicker} grouped />
        </View>
        {notificationMessage ? (
          <View style={[styles.notice, { backgroundColor: colors.raised, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
            <Text style={[styles.noticeText, { color: colors.text }]}>{notificationMessage}</Text>
          </View>
        ) : null}
        <Text style={[styles.section, { color: colors.secondaryText }]}>EXPERIENCE</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ToggleRow label="Haptics" value={settings.haptics} onValueChange={(haptics) => updateSettings({ haptics })} grouped />
          <Divider />
          <ToggleRow label="Sound" value={settings.sound} onValueChange={(sound) => updateSettings({ sound })} grouped />
          <Divider />
          <ToggleRow label="Dark mode" value={settings.darkMode} onValueChange={(darkMode) => updateSettings({ darkMode })} grouped />
          <Divider />
          <ToggleRow label="Color blind mode" value={settings.colorBlindMode} onValueChange={(colorBlindMode) => updateSettings({ colorBlindMode })} grouped />
        </View>
        <Text style={[styles.section, { color: colors.secondaryText }]}>SUPPORT</Text>
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LinkRow label="How WordUp works" onPress={() => router.push('/how-to-play')} grouped />
          <Divider />
          <LinkRow label="Help" onPress={() => Alert.alert('Help', 'WordUp helps you learn one new word every day. Listen, read, and add it to Your Words.')} grouped />
          <Divider />
          <LinkRow label="About WordUp" onPress={() => Alert.alert('About WordUp', 'A calm daily vocabulary app built with Expo.')} grouped />
        </View>
      </Screen>
      <Modal transparent visible={pickerOpen} animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: settings.darkMode ? 'rgba(0, 0, 0, 0.48)' : 'rgba(17, 19, 26, 0.28)' }]} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Reminder time</Text>
            <View style={styles.timeControls}>
              <TimeStepper
                label="Hour"
                value={`${draftTime.hour % 12 || 12}`}
                onIncrease={() => adjustTime('hour', 1)}
                onDecrease={() => adjustTime('hour', -1)}
              />
              <Text style={[styles.separator, { color: colors.text }]}>:</Text>
              <TimeStepper
                label="Minute"
                value={`${draftTime.minute}`.padStart(2, '0')}
                onIncrease={() => adjustTime('minute', 5)}
                onDecrease={() => adjustTime('minute', -5)}
              />
              <View style={[styles.period, { borderColor: colors.border }]}>
                <Text style={[styles.periodText, { color: colors.text }]}>{draftTime.hour >= 12 ? 'PM' : 'AM'}</Text>
              </View>
            </View>
            <Text style={[styles.preview, { color: colors.secondaryText }]}>
              {formatReminderTime(draftTime)}
            </Text>
            <View style={styles.sheetActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setPickerOpen(false)} style={styles.sheetButton} />
              <Button label="Save" onPress={saveReminderTime} style={styles.sheetButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function TimeStepper({
  label,
  value,
  onIncrease,
  onDecrease,
}: {
  label: string;
  value: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" onPress={onIncrease} style={[styles.stepButton, { borderColor: colors.border }]}>
        <Text style={[styles.stepButtonText, { color: colors.text }]}>+</Text>
      </Pressable>
      <Text style={[styles.stepValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.stepLabel, { color: colors.secondaryText }]}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onDecrease} style={[styles.stepButton, { borderColor: colors.border }]}>
        <Text style={[styles.stepButtonText, { color: colors.text }]}>-</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 36,
    ...typography.hero,
  },
  section: {
    marginTop: 28,
    marginBottom: spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  group: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  notice: {
    marginTop: spacing.sm,
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  timeControls: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepper: {
    alignItems: 'center',
    gap: 8,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
  },
  stepValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  separator: {
    marginTop: -16,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  period: {
    minWidth: 54,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  preview: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  sheetActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetButton: {
    flex: 1,
  },
});
