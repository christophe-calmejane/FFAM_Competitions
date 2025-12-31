// Simple router for SPA navigation

export type Route = 
  | { page: 'home' }
  | { page: 'competition'; type: '91min' | '3h' }
  | { page: 'team-setup'; type: '91min' | '3h'; teamId?: string }
  | { page: 'competition-active'; type: '91min' | '3h'; teamId: string; competitionId: string }
  | { page: 'results'; type: '91min' | '3h'; teamId: string; competitionId: string }
  | { page: 'settings'; type: '91min' | '3h' };

type RouteChangeHandler = (route: Route) => void;

let currentRoute: Route = { page: 'home' };
let handlers: RouteChangeHandler[] = [];

export function navigate(route: Route): void {
  currentRoute = route;
  updateUrl(route);
  notifyHandlers();
}

export function getCurrentRoute(): Route {
  return currentRoute;
}

export function onRouteChange(handler: RouteChangeHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter(h => h !== handler);
  };
}

function notifyHandlers(): void {
  handlers.forEach(h => h(currentRoute));
}

function updateUrl(route: Route): void {
  let hash = '#/';
  
  switch (route.page) {
    case 'home':
      hash = '#/';
      break;
    case 'competition':
      hash = `#/competition/${route.type}`;
      break;
    case 'team-setup':
      hash = route.teamId 
        ? `#/competition/${route.type}/team/${route.teamId}`
        : `#/competition/${route.type}/team/new`;
      break;
    case 'competition-active':
      hash = `#/competition/${route.type}/team/${route.teamId}/active/${route.competitionId}`;
      break;
    case 'results':
      hash = `#/competition/${route.type}/team/${route.teamId}/results/${route.competitionId}`;
      break;
    case 'settings':
      hash = `#/competition/${route.type}/settings`;
      break;
  }
  
  history.pushState(null, '', hash);
}

export function parseUrl(): Route {
  const hash = window.location.hash || '#/';
  const parts = hash.slice(2).split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return { page: 'home' };
  }
  
  if (parts[0] === 'competition' && parts.length >= 2) {
    const type = parts[1] as '91min' | '3h';
    
    if (!['91min', '3h'].includes(type)) {
      return { page: 'home' };
    }
    
    if (parts.length === 2) {
      return { page: 'competition', type };
    }
    
    if (parts[2] === 'settings') {
      return { page: 'settings', type };
    }
    
    if (parts[2] === 'team') {
      if (parts[3] === 'new') {
        return { page: 'team-setup', type };
      }
      
      const teamId = parts[3];
      
      if (parts[4] === 'active' && parts[5]) {
        return { page: 'competition-active', type, teamId, competitionId: parts[5] };
      }
      
      if (parts[4] === 'results' && parts[5]) {
        return { page: 'results', type, teamId, competitionId: parts[5] };
      }
      
      return { page: 'team-setup', type, teamId };
    }
  }
  
  return { page: 'home' };
}

export function initRouter(): void {
  // Parse initial URL
  currentRoute = parseUrl();
  
  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    currentRoute = parseUrl();
    notifyHandlers();
  });
}
