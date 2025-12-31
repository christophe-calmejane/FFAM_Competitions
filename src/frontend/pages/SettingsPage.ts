import { createElement, clearElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import {
  getSettings,
  saveSettings,
} from '../../backend/database/db';
import type { CompetitionType, CompetitionSettings } from '../../backend/types/index.js';
import {
  DEFAULT_91MIN_SETTINGS,
  DEFAULT_3H_SETTINGS,
} from '../../backend/types/index.js';

let formState: CompetitionSettings | null = null;

export async function renderSettingsPage(
  container: HTMLElement,
  competitionType: CompetitionType
): Promise<void> {
  clearElement(container);

  formState = await getSettings(competitionType);

  const page = createElement('div', { className: 'page page-settings' });

  // Header
  const header = createElement('header', { className: 'page-header' });
  
  const backBtn = createButton({
    text: `← ${t('back')}`,
    variant: 'secondary',
    size: 'small',
    onClick: () => navigate({ page: 'competition', type: competitionType }),
  });
  header.appendChild(backBtn);

  const title = createElement('h1', {
    className: 'page-title',
    textContent: t('competitionSettings'),
  });
  header.appendChild(title);

  page.appendChild(header);

  // Form
  const form = createElement('form', { className: 'settings-form' });
  form.addEventListener('submit', (e) => e.preventDefault());

  // Duration settings section
  const durationSection = createSection('Durées');

  // Total duration
  durationSection.appendChild(createNumberInput(
    t('totalDuration') + ` (${t('minutes')})`,
    Math.round(formState.totalDuration / 60000),
    1,
    300,
    (value) => {
      if (formState) formState.totalDuration = value * 60000;
    }
  ));

  // Flight duration
  durationSection.appendChild(createNumberInput(
    t('flightDurationSetting') + ` (${t('minutes')})`,
    Math.round(formState.targetFlightDuration / 60000),
    1,
    30,
    (value) => {
      if (formState) formState.targetFlightDuration = value * 60000;
    }
  ));

  // Safety time
  durationSection.appendChild(createNumberInput(
    t('safetyTime') + ` (${t('seconds')})`,
    Math.round(formState.safetyTime / 1000),
    1,
    120,
    (value) => {
      if (formState) formState.safetyTime = value * 1000;
    }
  ));

  // Max relay time
  durationSection.appendChild(createNumberInput(
    t('maxRelayTime') + ` (${t('seconds')})`,
    Math.round(formState.maxRelayTime / 1000),
    1,
    120,
    (value) => {
      if (formState) formState.maxRelayTime = value * 1000;
    }
  ));

  // First takeoff max time
  durationSection.appendChild(createNumberInput(
    t('firstTakeoffMaxTime') + ` (${t('seconds')})`,
    Math.round(formState.firstTakeoffMaxTime / 1000),
    1,
    120,
    (value) => {
      if (formState) formState.firstTakeoffMaxTime = value * 1000;
    }
  ));

  form.appendChild(durationSection);

  // Penalty settings section
  const penaltySection = createSection('Pénalités');

  // Flight duration penalty interval
  penaltySection.appendChild(createNumberInput(
    t('penaltyInterval') + ' - Durée de vol (sec)',
    formState.flightDurationPenaltyInterval,
    1,
    60,
    (value) => {
      if (formState) formState.flightDurationPenaltyInterval = value;
    }
  ));

  // Max flight duration penalty (only for 3h)
  if (competitionType === '3h') {
    penaltySection.appendChild(createNumberInput(
      t('maxPenaltyPoints') + ' - Durée de vol',
      formState.flightDurationMaxPenalty ?? 0,
      0,
      200,
      (value) => {
        if (formState) formState.flightDurationMaxPenalty = value || null;
      }
    ));
  }

  // Late relay penalty interval
  penaltySection.appendChild(createNumberInput(
    t('penaltyInterval') + ' - Relais tardif (sec)',
    formState.lateRelayPenaltyInterval,
    1,
    60,
    (value) => {
      if (formState) formState.lateRelayPenaltyInterval = value;
    }
  ));

  form.appendChild(penaltySection);

  // Team settings section
  const teamSection = createSection('Équipes');

  // Min pilots
  teamSection.appendChild(createNumberInput(
    t('minPilotsRequired'),
    formState.minPilots,
    1,
    10,
    (value) => {
      if (formState) formState.minPilots = value;
    }
  ));

  // Max pilots
  teamSection.appendChild(createNumberInput(
    t('maxPilotsAllowed'),
    formState.maxPilots,
    1,
    10,
    (value) => {
      if (formState) formState.maxPilots = value;
    }
  ));

  // Female pilot bonus
  teamSection.appendChild(createNumberInput(
    t('femalePilotBonus'),
    formState.femalePilotBonus,
    -50,
    0,
    (value) => {
      if (formState) formState.femalePilotBonus = value;
    }
  ));

  // No thermal plane penalty (3h only)
  if (competitionType === '3h') {
    teamSection.appendChild(createNumberInput(
      t('noThermalPlane') + ' (pénalité)',
      formState.noThermalPlanePenalty,
      0,
      100,
      (value) => {
        if (formState) formState.noThermalPlanePenalty = value;
      }
    ));

    teamSection.appendChild(createNumberInput(
      t('pilotNeverFlew') + ' (pénalité)',
      formState.pilotNeverFlewPenalty,
      0,
      200,
      (value) => {
        if (formState) formState.pilotNeverFlewPenalty = value;
      }
    ));
  }

  form.appendChild(teamSection);

  // Actions
  const actions = createElement('div', { className: 'form-actions' });

  const resetBtn = createButton({
    text: t('resetToDefaults'),
    variant: 'warning',
    size: 'medium',
    onClick: async () => {
      const defaults = competitionType === '91min'
        ? { ...DEFAULT_91MIN_SETTINGS, id: '91min' }
        : { ...DEFAULT_3H_SETTINGS, id: '3h' };
      
      await saveSettings(defaults);
      renderSettingsPage(container, competitionType);
    },
  });
  actions.appendChild(resetBtn);

  const cancelBtn = createButton({
    text: t('cancel'),
    variant: 'secondary',
    size: 'medium',
    onClick: () => navigate({ page: 'competition', type: competitionType }),
  });
  actions.appendChild(cancelBtn);

  const saveBtn = createButton({
    text: t('save'),
    variant: 'primary',
    size: 'medium',
    onClick: async () => {
      if (formState) {
        await saveSettings(formState);
        navigate({ page: 'competition', type: competitionType });
      }
    },
  });
  actions.appendChild(saveBtn);

  form.appendChild(actions);
  page.appendChild(form);
  container.appendChild(page);
}

function createSection(title: string): HTMLElement {
  const section = createElement('div', { className: 'settings-section' });
  
  const sectionTitle = createElement('h3', {
    className: 'section-title',
    textContent: title,
  });
  section.appendChild(sectionTitle);

  return section;
}

function createNumberInput(
  label: string,
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void
): HTMLElement {
  const group = createElement('div', { className: 'form-group' });
  
  const labelEl = createElement('label', {
    className: 'form-label',
    textContent: label,
  });
  group.appendChild(labelEl);

  const input = createElement('input', {
    className: 'form-input',
    attributes: {
      type: 'number',
      value: String(value),
      min: String(min),
      max: String(max),
    },
  }) as HTMLInputElement;

  input.addEventListener('change', () => {
    const numValue = parseInt(input.value, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    }
  });

  group.appendChild(input);

  return group;
}
