import { createElement, clearElement } from '../utils/dom';
import { t } from '../i18n/translations';
import { navigate } from '../router/router';
import { createButton } from '../components/Button';
import {
  getTeamsByCompetitionType,
  getCompetitionByTeam,
  deleteTeam,
  deleteCompetition,
} from '../../backend/database/db';
import { resetTeamFormState } from './TeamSetupPage';
import type { CompetitionType, Team, Competition } from '../../backend/types/index.js';

export async function renderCompetitionPage(
  container: HTMLElement,
  competitionType: CompetitionType
): Promise<void> {
  clearElement(container);

  const page = createElement('div', { className: 'page page-competition' });

  // Header
  const header = createElement('header', { className: 'page-header' });
  
  const backBtn = createButton({
    text: `← ${t('back')}`,
    variant: 'secondary',
    size: 'small',
    onClick: () => navigate({ page: 'home' }),
  });
  header.appendChild(backBtn);

  const title = createElement('h1', {
    className: 'page-title',
    textContent: competitionType === '91min' ? t('competition91min') : t('competition3h'),
  });
  header.appendChild(title);

  const settingsBtn = createButton({
    text: `⚙️ ${t('settings')}`,
    variant: 'secondary',
    size: 'small',
    onClick: () => navigate({ page: 'settings', type: competitionType }),
  });
  header.appendChild(settingsBtn);

  page.appendChild(header);

  // Content
  const content = createElement('div', { className: 'competition-content' });

  // New team button
  const newTeamBtn = createButton({
    text: `+ ${t('createTeam')}`,
    variant: 'primary',
    size: 'large',
    className: 'new-team-btn',
    onClick: () => {
      resetTeamFormState();
      navigate({ page: 'team-setup', type: competitionType });
    },
  });
  content.appendChild(newTeamBtn);

  // Existing teams list
  const teams = await getTeamsByCompetitionType(competitionType);
  
  if (teams.length > 0) {
    const teamsSection = createElement('div', { className: 'teams-section' });
    
    const teamsTitle = createElement('h2', {
      className: 'section-title',
      textContent: 'Équipes existantes',
    });
    teamsSection.appendChild(teamsTitle);

    const teamsList = createElement('div', { className: 'teams-list' });

    for (const team of teams) {
      const competition = await getCompetitionByTeam(team.id);
      const teamCard = await createTeamCard(team, competition, competitionType, container);
      teamsList.appendChild(teamCard);
    }

    teamsSection.appendChild(teamsList);
    content.appendChild(teamsSection);
  }

  page.appendChild(content);
  container.appendChild(page);
}

async function createTeamCard(
  team: Team,
  competition: Competition | undefined,
  competitionType: CompetitionType,
  rootContainer: HTMLElement
): Promise<HTMLElement> {
  const card = createElement('div', { className: 'team-card' });

  const info = createElement('div', { className: 'team-info' });
  
  const teamName = createElement('h3', {
    className: 'team-name',
    textContent: team.name,
  });
  info.appendChild(teamName);

  const pilotCount = createElement('p', {
    className: 'team-pilots',
    textContent: `${team.pilots.length} ${t('pilots')}`,
  });
  info.appendChild(pilotCount);

  // Status badge
  if (competition) {
    const statusBadge = createElement('span', {
      className: `team-status ${competition.isActive ? 'status-active' : 'status-ended'}`,
      textContent: competition.isActive ? '⏱️ En cours' : '✅ Terminée',
    });
    info.appendChild(statusBadge);
  }

  card.appendChild(info);

  // Actions
  const actions = createElement('div', { className: 'team-actions' });

  if (competition) {
    if (competition.isActive) {
      // Continue active competition
      const continueBtn = createButton({
        text: 'Continuer',
        variant: 'primary',
        size: 'small',
        onClick: () => navigate({
          page: 'competition-active',
          type: competitionType,
          teamId: team.id,
          competitionId: competition.id,
        }),
      });
      actions.appendChild(continueBtn);
    } else {
      // View results
      const resultsBtn = createButton({
        text: t('results'),
        variant: 'success',
        size: 'small',
        onClick: () => navigate({
          page: 'results',
          type: competitionType,
          teamId: team.id,
          competitionId: competition.id,
        }),
      });
      actions.appendChild(resultsBtn);
    }
  } else {
    // Start new competition
    const startBtn = createButton({
      text: t('startCompetition'),
      variant: 'success',
      size: 'small',
      onClick: () => {
        resetTeamFormState();
        navigate({
          page: 'team-setup',
          type: competitionType,
          teamId: team.id,
        });
      },
    });
    actions.appendChild(startBtn);
  }

  // Edit team (only if no active competition)
  if (!competition || !competition.isActive) {
    const editBtn = createButton({
      text: '✏️',
      variant: 'secondary',
      size: 'small',
      onClick: () => {
        resetTeamFormState();
        navigate({
          page: 'team-setup',
          type: competitionType,
          teamId: team.id,
        });
      },
    });
    actions.appendChild(editBtn);
  }

  // Delete team
  const deleteBtn = createButton({
    text: '🗑️',
    variant: 'danger',
    size: 'small',
    onClick: async () => {
      if (confirm(t('confirmDeleteTeam'))) {
        if (competition) {
          await deleteCompetition(competition.id);
        }
        await deleteTeam(team.id);
        renderCompetitionPage(rootContainer, competitionType);
      }
    },
  });
  actions.appendChild(deleteBtn);

  card.appendChild(actions);

  return card;
}
