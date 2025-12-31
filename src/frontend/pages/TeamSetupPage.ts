import { createElement, clearElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import {
  getTeam,
  saveTeam,
  getSettings,
  saveCompetition,
  generateId,
} from '../../backend/database/db';
import type { CompetitionType, Team, Pilot, Competition } from '../../backend/types/index.js';

interface TeamFormState {
  name: string;
  pilots: Pilot[];
  initialized: boolean;
  currentTeamId?: string;
  currentCompetitionType?: CompetitionType;
}

let formState: TeamFormState = {
  name: '',
  pilots: [],
  initialized: false,
};

// Reset form state when navigating to a new team setup
export function resetTeamFormState(): void {
  formState = {
    name: '',
    pilots: [],
    initialized: false,
  };
}

export async function renderTeamSetupPage(
  container: HTMLElement,
  competitionType: CompetitionType,
  teamId?: string
): Promise<void> {
  clearElement(container);

  const settings = await getSettings(competitionType);
  
  // Only initialize form state if:
  // - Not yet initialized, OR
  // - Editing a different team, OR
  // - Switching competition type
  const needsInit = !formState.initialized ||
    formState.currentTeamId !== teamId ||
    formState.currentCompetitionType !== competitionType;

  if (needsInit) {
    if (teamId) {
      const existingTeam = await getTeam(teamId);
      if (existingTeam) {
        formState = {
          name: existingTeam.name,
          pilots: [...existingTeam.pilots],
          initialized: true,
          currentTeamId: teamId,
          currentCompetitionType: competitionType,
        };
      }
    } else {
      formState = {
        name: '',
        pilots: [],
        initialized: true,
        currentTeamId: undefined,
        currentCompetitionType: competitionType,
      };
    }
  }

  const page = createElement('div', { className: 'page page-team-setup' });

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
    textContent: teamId ? t('editTeam') : t('createTeam'),
  });
  header.appendChild(title);

  page.appendChild(header);

  // Form
  const form = createElement('form', {
    className: 'team-form',
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  // Team name
  const nameGroup = createFormGroup(t('teamName'), 'text', formState.name, (value) => {
    formState.name = value;
  });
  form.appendChild(nameGroup);

  // Pilots section
  const pilotsSection = createElement('div', { className: 'pilots-section' });
  
  const pilotsHeader = createElement('div', { className: 'pilots-header' });
  
  const pilotsTitle = createElement('h3', {
    textContent: `${t('pilots')} (${settings.minPilots}-${settings.maxPilots})`,
  });
  pilotsHeader.appendChild(pilotsTitle);

  const addPilotBtn = createButton({
    text: `+ ${t('addPilot')}`,
    variant: 'secondary',
    size: 'small',
    onClick: () => {
      if (formState.pilots.length < settings.maxPilots) {
        formState.pilots.push({
          id: generateId(),
          name: '',
          isFemale: false,
          hasThermalPlane: false,
        });
        renderTeamSetupPage(container, competitionType, teamId);
      }
    },
  });
  pilotsHeader.appendChild(addPilotBtn);
  pilotsSection.appendChild(pilotsHeader);

  // Pilot list
  const pilotsList = createElement('div', { className: 'pilots-list' });
  
  formState.pilots.forEach((pilot, index) => {
    const pilotRow = createPilotRow(pilot, index, competitionType, () => {
      formState.pilots.splice(index, 1);
      renderTeamSetupPage(container, competitionType, teamId);
    });
    pilotsList.appendChild(pilotRow);
  });

  pilotsSection.appendChild(pilotsList);
  form.appendChild(pilotsSection);

  // Error message container
  const errorContainer = createElement('div', { className: 'error-container hidden', id: 'form-error' });
  form.appendChild(errorContainer);

  // Actions
  const actions = createElement('div', { className: 'form-actions' });

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
      const error = validateForm(formState, settings.minPilots, settings.maxPilots);
      if (error) {
        showError(error);
        return;
      }

      const team: Team = {
        id: teamId || generateId(),
        name: formState.name.trim(),
        pilots: formState.pilots.map(p => ({ ...p, name: p.name.trim() })),
        competitionType,
        createdAt: Date.now(),
      };

      await saveTeam(team);
      navigate({ page: 'competition', type: competitionType });
    },
  });
  actions.appendChild(saveBtn);

  const startBtn = createButton({
    text: t('startCompetition'),
    variant: 'success',
    size: 'medium',
    onClick: async () => {
      const error = validateForm(formState, settings.minPilots, settings.maxPilots);
      if (error) {
        showError(error);
        return;
      }

      const team: Team = {
        id: teamId || generateId(),
        name: formState.name.trim(),
        pilots: formState.pilots.map(p => ({ ...p, name: p.name.trim() })),
        competitionType,
        createdAt: Date.now(),
      };

      await saveTeam(team);

      // Create competition
      const competition: Competition = {
        id: generateId(),
        type: competitionType,
        teamId: team.id,
        startTimestamp: Date.now(),
        endTimestamp: null,
        isActive: true,
        currentFlightId: null,
        safetyPeriodEndTimestamp: null,
        flights: [],
        createdAt: Date.now(),
      };

      await saveCompetition(competition);

      navigate({
        page: 'competition-active',
        type: competitionType,
        teamId: team.id,
        competitionId: competition.id,
      });
    },
  });
  actions.appendChild(startBtn);

  form.appendChild(actions);
  page.appendChild(form);
  container.appendChild(page);
}

function createFormGroup(
  label: string,
  type: string,
  value: string,
  onChange: (value: string) => void
): HTMLElement {
  const group = createElement('div', { className: 'form-group' });
  
  const labelEl = createElement('label', {
    className: 'form-label',
    textContent: label,
  });
  group.appendChild(labelEl);

  const input = createElement('input', {
    className: 'form-input',
    attributes: { type, value },
  }) as HTMLInputElement;
  
  input.addEventListener('input', () => onChange(input.value));
  group.appendChild(input);

  return group;
}

function createPilotRow(
  pilot: Pilot,
  index: number,
  competitionType: CompetitionType,
  onRemove: () => void
): HTMLElement {
  const row = createElement('div', { className: 'pilot-row' });

  const numberBadge = createElement('span', {
    className: 'pilot-number',
    textContent: `#${index + 1}`,
  });
  row.appendChild(numberBadge);

  const nameInput = createElement('input', {
    className: 'form-input pilot-name-input',
    attributes: {
      type: 'text',
      placeholder: t('pilotName'),
      value: pilot.name,
    },
  }) as HTMLInputElement;
  
  nameInput.addEventListener('input', () => {
    pilot.name = nameInput.value;
  });
  row.appendChild(nameInput);

  const femaleLabel = createElement('label', { className: 'checkbox-label female-checkbox', attributes: { title: t('isFemale') } });
  
  const femaleInput = createElement('input', {
    attributes: { type: 'checkbox' },
  }) as HTMLInputElement;
  femaleInput.checked = pilot.isFemale;
  femaleInput.addEventListener('change', () => {
    pilot.isFemale = femaleInput.checked;
  });
  
  const femaleIcon = createElement('span', { textContent: '♀' });
  
  femaleLabel.appendChild(femaleInput);
  femaleLabel.appendChild(femaleIcon);
  row.appendChild(femaleLabel);

  // Thermal plane checkbox (3h only)
  if (competitionType === '3h') {
    const thermalLabel = createElement('label', { className: 'checkbox-label thermal-checkbox', attributes: { title: t('hasThermalPlane') } });
    
    const thermalInput = createElement('input', {
      attributes: { type: 'checkbox' },
    }) as HTMLInputElement;
    thermalInput.checked = pilot.hasThermalPlane;
    thermalInput.addEventListener('change', () => {
      pilot.hasThermalPlane = thermalInput.checked;
    });
    
    const thermalIcon = createElement('span', { textContent: '🔥' });
    
    thermalLabel.appendChild(thermalInput);
    thermalLabel.appendChild(thermalIcon);
    row.appendChild(thermalLabel);
  }

  const removeBtn = createButton({
    text: '×',
    variant: 'danger',
    size: 'small',
    onClick: onRemove,
  });
  row.appendChild(removeBtn);

  return row;
}

function validateForm(
  state: TeamFormState,
  minPilots: number,
  maxPilots: number
): string | null {
  if (!state.name.trim()) {
    return t('errorTeamNameRequired');
  }

  if (state.pilots.length < minPilots) {
    return t('errorMinPilots', { min: minPilots });
  }

  if (state.pilots.length > maxPilots) {
    return t('errorMaxPilots', { max: maxPilots });
  }

  for (const pilot of state.pilots) {
    if (!pilot.name.trim()) {
      return t('errorPilotNameRequired');
    }
  }

  return null;
}

function showError(message: string): void {
  const errorContainer = document.getElementById('form-error');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
    
    setTimeout(() => {
      errorContainer.classList.add('hidden');
    }, 5000);
  }
}
