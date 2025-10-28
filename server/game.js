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

    // Инициализируем ресурсы и технологии для ВСЕХ команд заранее
    for (const team of Object.keys(this.teams)) {
      this.resources[team] = { food: 0, metal: 0, energy: 0 };
      this.tech[team] = { unlocks: [] };
    }

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
        // Стартовые ресурсы только для стартовых команд
        this.resources[team] = { food: 30, metal: 30, energy: 30 };
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
    // Убедимся, что ресурсы есть (на случай, если ИИ уже создал запись)
    if (!this.resources[smallestTeam]) {
      this.resources[smallestTeam] = { food: 30, metal: 30, energy: 30 };
    }
    return smallestTeam;
  }

  collectResources() {
    for (const team in this.teams) {
      // Пропускаем команды, у которых нет регионов и нет игроков/ИИ
      const hasActivity = this.teams[team].length > 0 || 
                          Object.values(this.regions).some(r => r.owner === team);
      if (!hasActivity) continue;

      // Гарантируем, что ресурсы существуют
      if (!this.resources[team]) {
        this.resources[team] = { food: 0, metal: 0, energy: 0 };
      }

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
    if (!this.tech[team]) this.tech[team] = { unlocks: [] };
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
      // Если в команде есть игроки — ИИ не нужен
      if (this.teams[team].some(id => id !== 'AI')) continue;

      // Если ИИ ещё не добавлен — добавляем
      if (!this.teams[team].includes('AI')) {
        this.teams[team].push('AI');
        // Инициализируем ресурсы, если их нет
        if (!this.resources[team]) {
          this.resources[team] = { food: 20, metal: 20, energy: 20 };
        }
      }

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
