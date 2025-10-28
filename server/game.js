const worldMap = require('./map');
const techTree = require('./techTree');

class GameState {
  constructor() {
    this.regions = {};
    this.players = {};
    this.teams = { red: [], blue: [], green: [], yellow: [] };
    this.resources = {};
    this.tech = {};
    this.winner = null;

    for (const id in worldMap) {
      this.regions[id] = {
        id,
        owner: null,
        troops: 0,
        ...worldMap[id]
      };
    }

    const starters = ['USA', 'RUS', 'CHN', 'BRA'];
    const teamNames = Object.keys(this.teams);
    starters.forEach((id, i) => {
      if (i < teamNames.length) {
        const team = teamNames[i];
        this.regions[id].owner = team;
        this.regions[id].troops = 15;
      }
    });

    setInterval(() => this.gameLoop(), 5000);
  }

  assignPlayerToTeam(playerId) {
    const smallestTeam = Object.keys(this.teams).reduce((a, b) =>
      this.teams[a].length <= this.teams[b].length ? a : b
    );
    this.teams[smallestTeam].push(playerId);
    this.players[playerId] = { team: smallestTeam };
    this.resources[smallestTeam] = { food: 30, metal: 30, energy: 30 };
    this.tech[smallestTeam] = { unlocks: [] };
    return smallestTeam;
  }

  collectResources() {
    for (const team in this.teams) {
      if (this.teams[team].length === 0) continue;
      let food = 0, metal = 0, energy = 0;
      for (const r of Object.values(this.regions)) {
        if (r.owner === team) {
          food += r.resources.food;
          metal += r.resources.metal;
          energy += r.resources.energy;
        }
      }
      this.resources[team].food += food;
      this.resources[team].metal += metal;
      this.resources[team].energy += energy;
    }
  }

  moveTroops(team, fromId, toId, count) {
    const from = this.regions[fromId];
    const to = this.regions[toId];
    if (!from || !to) return false;
    if (from.owner !== team || from.troops < count) return false;
    if (!from.neighbors.includes(toId)) return false;

    from.troops -= count;
    to.troops += count;

    if (to.owner && to.owner !== team) {
      this.resolveBattle(team, toId);
    } else {
      to.owner = team;
    }
    return true;
  }

  resolveBattle(attacker, regionId) {
    const r = this.regions[regionId];
    const defender = r.owner;
    const atk = r.troops;
    const def = r.troops * 1.3;

    if (atk > def) {
      r.owner = attacker;
    } else {
      r.troops = Math.max(1, def - atk);
    }
  }

  research(team, techKey) {
    const tech = techTree[techKey];
    if (!tech) return false;
    this.tech[team].unlocks.push(techKey);
    return true;
  }

  checkWin() {
    const keyRegions = ['USA', 'RUS', 'CHN', 'DEU', 'BRA', 'IND', 'EGY', 'AUS'];
    for (const team in this.teams) {
      const owned = keyRegions.filter(id => this.regions[id].owner === team).length;
      if (owned >= 6) {
        this.winner = team;
        return team;
      }
    }
    return null;
  }

  runAI() {
    for (const team of ['red', 'blue', 'green', 'yellow']) {
      if (this.teams[team].length > 0) continue;
      if (!this.teams[team].includes('AI')) this.teams[team].push('AI');

      const owned = Object.keys(this.regions).filter(id => this.regions[id].owner === team);
      if (owned.length === 0) continue;

      const fromId = owned[Math.floor(Math.random() * owned.length)];
      const from = this.regions[fromId];
      if (from.troops < 8) continue;

      const enemyNeighbor = from.neighbors.find(n => 
        this.regions[n] && this.regions[n].owner && this.regions[n].owner !== team
      );
      const neutralNeighbor = from.neighbors.find(n => 
        this.regions[n] && !this.regions[n].owner
      );

      const target = enemyNeighbor || neutralNeighbor;
      if (target) {
        this.moveTroops(team, fromId, target, Math.min(5, from.troops - 3));
      }
    }
  }

  gameLoop() {
    this.collectResources();
    this.runAI();
    this.checkWin();
  }
}

module.exports = GameState;