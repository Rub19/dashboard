import { computePartyMap } from "./party-helper";

describe("party-helper computePartyMap", () => {
  it("detects explicit party_id groups correctly (Valorant style)", () => {
    const players = [
      { name: "Player1", tag: "EUW", team: "Blue", party_id: "party-uuid-1", isMe: true },
      { name: "Player2", tag: "EUW", team: "Blue", party_id: "party-uuid-1", isMe: false },
      { name: "Player3", tag: "EUW", team: "Blue", party_id: "party-uuid-2", isMe: false },
      { name: "Player4", tag: "EUW", team: "Red", party_id: "party-uuid-3", isMe: false },
      { name: "Player5", tag: "EUW", team: "Red", party_id: "party-uuid-3", isMe: false },
    ];

    const partyMap = computePartyMap(players);
    const p1Party = partyMap.getParty(players[0]);
    const p2Party = partyMap.getParty(players[1]);
    const p3Party = partyMap.getParty(players[2]);
    const p4Party = partyMap.getParty(players[3]);
    const p5Party = partyMap.getParty(players[4]);

    expect(p1Party).not.toBeNull();
    expect(p2Party).not.toBeNull();
    expect(p1Party?.partyName).toBe("Groupe A");
    expect(p2Party?.partyName).toBe("Groupe A");
    expect(p1Party?.size).toBe(2);

    expect(p3Party).toBeNull();

    expect(p4Party).not.toBeNull();
    expect(p5Party).not.toBeNull();
    expect(p4Party?.partyName).toBe("Groupe B");
    expect(p5Party?.partyName).toBe("Groupe B");
  });

  it("links Rub19 and DorEtDeBriar as duo while Mordekaiser is solo", () => {
    const players = [
      { name: "Rub19", tag: "Boss", team: "Blue", isMe: true },
      { name: "DorEtDeBriar", tag: "JUL", team: "Blue", isMe: false },
      { name: "mouglie5000hp", tag: "1SH0T", team: "Blue", isMe: false },
      { name: "SoloPlayer4", tag: "EUW", team: "Blue", isMe: false },
      { name: "SoloPlayer5", tag: "EUW", team: "Blue", isMe: false },
    ];

    const partyMap = computePartyMap(players);

    const rub19Party = partyMap.getParty(players[0]);
    const dorParty = partyMap.getParty(players[1]);
    const mordeParty = partyMap.getParty(players[2]);
    const solo4Party = partyMap.getParty(players[3]);

    expect(rub19Party).not.toBeNull();
    expect(dorParty).not.toBeNull();
    expect(rub19Party?.partyName).toBe(dorParty?.partyName);
    expect(rub19Party?.size).toBe(2);
    expect(dorParty?.size).toBe(2);

    expect(mordeParty).toBeNull();
    expect(solo4Party).toBeNull();
  });

  it("detects cross-match co-players dynamically when allMatches are provided", () => {
    const currentMatchPlayers = [
      { name: "Alice", tag: "111", team: "Blue", isMe: true },
      { name: "Bob", tag: "222", team: "Blue", isMe: false },
      { name: "Charlie", tag: "333", team: "Blue", isMe: false },
    ];

    const match1 = {
      scoreboard: {
        players: [
          { name: "Alice", tag: "111", team: "Blue" },
          { name: "Bob", tag: "222", team: "Blue" },
          { name: "Charlie", tag: "333", team: "Blue" },
        ],
      },
    };

    const match2 = {
      scoreboard: {
        players: [
          { name: "Alice", tag: "111", team: "Blue" },
          { name: "Bob", tag: "222", team: "Blue" },
          { name: "David", tag: "444", team: "Blue" },
        ],
      },
    };

    const partyMap = computePartyMap(currentMatchPlayers, [match1, match2]);

    const aliceParty = partyMap.getParty(currentMatchPlayers[0]);
    const bobParty = partyMap.getParty(currentMatchPlayers[1]);
    const charlieParty = partyMap.getParty(currentMatchPlayers[2]);

    expect(aliceParty).not.toBeNull();
    expect(bobParty).not.toBeNull();
    expect(aliceParty?.partyName).toBe(bobParty?.partyName);
    expect(aliceParty?.size).toBe(2);

    expect(charlieParty).toBeNull();
  });

  it("does not invent fake duos for pure solo players", () => {
    const soloPlayers = [
      { name: "Solo1", tag: "01", team: "Blue", isMe: false },
      { name: "Solo2", tag: "02", team: "Blue", isMe: false },
      { name: "Solo3", tag: "03", team: "Blue", isMe: false },
      { name: "Solo4", tag: "04", team: "Blue", isMe: false },
      { name: "Solo5", tag: "05", team: "Blue", isMe: false },
    ];

    const partyMap = computePartyMap(soloPlayers, []);

    expect(partyMap.getParty(soloPlayers[0])).toBeNull();
    expect(partyMap.getParty(soloPlayers[1])).toBeNull();
    expect(partyMap.getParty(soloPlayers[2])).toBeNull();
    expect(partyMap.getParty(soloPlayers[3])).toBeNull();
    expect(partyMap.getParty(soloPlayers[4])).toBeNull();
  });
});
