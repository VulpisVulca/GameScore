// Shared session state. Game rules operate on snapshots, never on this object.
export function createAppState() {
  return {
    game: null,
    screen: 'home',
    setupCount: 3,
    setupMilestones: 'base',
    setupModules: {
      newDistricts: false,
      apartments: false,
      coffee: false,
      fryChef: false,
      lobbyist: false,
      reservePrices: false,
      kimchi: false,
      noodles: false,
      rural: false,
      ketchup: false,
      sushi: false,
    },
    setupPlayers: Array.from({ length: 6 }, (_, i) => ({ name: '', color: null })),
    editor: null,
    review: false,
    statisticsMetric: 'balance',
    storageFailed: false,
    offlineState: '',
  };
}
export const appState = createAppState();
