import Foundation

// MARK: - Battlepass Level Model
struct ValorantBattlepassLevel: Identifiable, Hashable {
    let id: String
    let chapter: Int
    let level: Int
    let name: String
    let rewardType: String
    let rewardUUID: String
    let iconURL: String
    let xpCost: Int
    let isFree: Bool
}

// MARK: - Mission Item Model
struct ValorantMissionItem: Identifiable, Hashable {
    let id: String
    let title: String
    let type: String
    let xpGrant: Int
    let progressToComplete: Int
}

extension ValorantBattlepassLevel {
    static let sampleLevels: [ValorantBattlepassLevel] = [
        ValorantBattlepassLevel(id: "1", chapter: 1, level: 1, name: "Bandit (Solarium)", rewardType: "EquippableSkinLevel", rewardUUID: "34306910-4783-d3be-134a-6ea547cf8098", iconURL: "https://media.valorant-api.com/weaponskinlevels/34306910-4783-d3be-134a-6ea547cf8098/displayicon.png", xpCost: 0, isFree: false),
        ValorantBattlepassLevel(id: "2", chapter: 1, level: 2, name: "Porte-bonheur Gravnet manuel", rewardType: "EquippableCharmLevel", rewardUUID: "52da29e1-44c3-f9fc-7868-f0b2c3c3d8a2", iconURL: "https://media.valorant-api.com/buddylevels/52da29e1-44c3-f9fc-7868-f0b2c3c3d8a2/displayicon.png", xpCost: 2000, isFree: false),
        ValorantBattlepassLevel(id: "3", chapter: 1, level: 3, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 2750, isFree: false),
        ValorantBattlepassLevel(id: "4", chapter: 1, level: 4, name: "Carte Plans de Pearl", rewardType: "PlayerCard", rewardUUID: "94ea515a-4cc6-9412-aa15-1dadc9bce35c", iconURL: "https://media.valorant-api.com/playercards/94ea515a-4cc6-9412-aa15-1dadc9bce35c/largeart.png", xpCost: 3500, isFree: false),
        ValorantBattlepassLevel(id: "5", chapter: 1, level: 5, name: "Judge (Datalink)", rewardType: "EquippableSkinLevel", rewardUUID: "7105d018-473d-773b-c215-35836a4ea811", iconURL: "https://media.valorant-api.com/weaponskinlevels/7105d018-473d-773b-c215-35836a4ea811/displayicon.png", xpCost: 4250, isFree: false),
        ValorantBattlepassLevel(id: "6", chapter: 2, level: 6, name: "Graffiti Warden interdit", rewardType: "Spray", rewardUUID: "2cd2dd94-41b8-52e1-b81c-56a1158532b3", iconURL: "https://media.valorant-api.com/sprays/2cd2dd94-41b8-52e1-b81c-56a1158532b3/fulltransparenticon.png", xpCost: 5000, isFree: false),
        ValorantBattlepassLevel(id: "7", chapter: 2, level: 7, name: "Graffiti Zoum et boum", rewardType: "Spray", rewardUUID: "988f5aa5-4081-95b3-7cc6-aea582b2b5c5", iconURL: "https://media.valorant-api.com/sprays/988f5aa5-4081-95b3-7cc6-aea582b2b5c5/fulltransparenticon.png", xpCost: 5750, isFree: false),
        ValorantBattlepassLevel(id: "8", chapter: 2, level: 8, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 6500, isFree: false),
        ValorantBattlepassLevel(id: "9", chapter: 2, level: 9, name: "Carte Loyaux compagnons", rewardType: "PlayerCard", rewardUUID: "3b9bc827-44d0-442d-8335-5dbced752668", iconURL: "https://media.valorant-api.com/playercards/3b9bc827-44d0-442d-8335-5dbced752668/largeart.png", xpCost: 7250, isFree: false),
        ValorantBattlepassLevel(id: "10", chapter: 2, level: 10, name: "Odin (Souvenir)", rewardType: "EquippableSkinLevel", rewardUUID: "1d2c70bd-4ca3-2643-5917-02be2eddd545", iconURL: "https://media.valorant-api.com/weaponskinlevels/1d2c70bd-4ca3-2643-5917-02be2eddd545/displayicon.png", xpCost: 8000, isFree: false),
        ValorantBattlepassLevel(id: "11", chapter: 3, level: 11, name: "Carte Nuit sous les étoiles", rewardType: "PlayerCard", rewardUUID: "ac12278e-4458-6a7c-3e91-788da8cd226c", iconURL: "https://media.valorant-api.com/playercards/ac12278e-4458-6a7c-3e91-788da8cd226c/largeart.png", xpCost: 8750, isFree: false),
        ValorantBattlepassLevel(id: "12", chapter: 3, level: 12, name: "Graffiti Solarium", rewardType: "Spray", rewardUUID: "9e7d4c09-4017-7df6-9896-28b40796fdfb", iconURL: "https://media.valorant-api.com/sprays/9e7d4c09-4017-7df6-9896-28b40796fdfb/fulltransparenticon.png", xpCost: 9500, isFree: false),
        ValorantBattlepassLevel(id: "13", chapter: 3, level: 13, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 10250, isFree: false),
        ValorantBattlepassLevel(id: "14", chapter: 3, level: 14, name: "Porte-bonheur Solarium", rewardType: "EquippableCharmLevel", rewardUUID: "e29061f8-4741-a355-4e97-e1ac87d5715c", iconURL: "https://media.valorant-api.com/buddylevels/e29061f8-4741-a355-4e97-e1ac87d5715c/displayicon.png", xpCost: 11000, isFree: false),
        ValorantBattlepassLevel(id: "15", chapter: 3, level: 15, name: "Spectre (Solarium)", rewardType: "EquippableSkinLevel", rewardUUID: "0d2a0625-4ed5-74d4-37ed-9fb63fb7b8d7", iconURL: "https://media.valorant-api.com/weaponskinlevels/0d2a0625-4ed5-74d4-37ed-9fb63fb7b8d7/displayicon.png", xpCost: 11750, isFree: false),
        ValorantBattlepassLevel(id: "16", chapter: 4, level: 16, name: "Ghost (Datalink)", rewardType: "EquippableSkinLevel", rewardUUID: "30b4450c-48b4-41aa-af84-4096b6aa49c4", iconURL: "https://media.valorant-api.com/weaponskinlevels/30b4450c-48b4-41aa-af84-4096b6aa49c4/displayicon.png", xpCost: 12500, isFree: false),
        ValorantBattlepassLevel(id: "17", chapter: 4, level: 17, name: "Carte Brim Rat de bibliothèque", rewardType: "PlayerCard", rewardUUID: "20ab3f83-4a57-0705-cc7f-10bf477b1f46", iconURL: "https://media.valorant-api.com/playercards/20ab3f83-4a57-0705-cc7f-10bf477b1f46/largeart.png", xpCost: 13250, isFree: false),
        ValorantBattlepassLevel(id: "18", chapter: 4, level: 18, name: "Graffiti Souvenir", rewardType: "Spray", rewardUUID: "58a09a68-4653-ce2c-7a9d-c9ba2adfbcac", iconURL: "https://media.valorant-api.com/sprays/58a09a68-4653-ce2c-7a9d-c9ba2adfbcac/fulltransparenticon.png", xpCost: 14000, isFree: false),
        ValorantBattlepassLevel(id: "19", chapter: 4, level: 19, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 14750, isFree: false),
        ValorantBattlepassLevel(id: "20", chapter: 4, level: 20, name: "Guardian (Souvenir)", rewardType: "EquippableSkinLevel", rewardUUID: "c1416153-4618-1df5-c604-6c88835b43ee", iconURL: "https://media.valorant-api.com/weaponskinlevels/c1416153-4618-1df5-c604-6c88835b43ee/displayicon.png", xpCost: 15500, isFree: false),
        ValorantBattlepassLevel(id: "21", chapter: 5, level: 21, name: "Graffiti Regarde où tu marches", rewardType: "Spray", rewardUUID: "6f52988a-451f-afb1-2860-668f6ac31326", iconURL: "https://media.valorant-api.com/sprays/6f52988a-451f-afb1-2860-668f6ac31326/fulltransparenticon.png", xpCost: 16250, isFree: false),
        ValorantBattlepassLevel(id: "22", chapter: 5, level: 22, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 17000, isFree: false),
        ValorantBattlepassLevel(id: "23", chapter: 5, level: 23, name: "Porte-bonheur Rafraîchissant", rewardType: "EquippableCharmLevel", rewardUUID: "d9bb5c7c-473c-f6dd-a457-498cda06959c", iconURL: "https://media.valorant-api.com/buddylevels/d9bb5c7c-473c-f6dd-a457-498cda06959c/displayicon.png", xpCost: 17750, isFree: false),
        ValorantBattlepassLevel(id: "24", chapter: 5, level: 24, name: "Graffiti Datalink", rewardType: "Spray", rewardUUID: "0c5dfa7e-4080-6d0c-b7fd-348efb292094", iconURL: "https://media.valorant-api.com/sprays/0c5dfa7e-4080-6d0c-b7fd-348efb292094/fulltransparenticon.png", xpCost: 18500, isFree: false),
        ValorantBattlepassLevel(id: "25", chapter: 5, level: 25, name: "Warden (Datalink)", rewardType: "EquippableSkinLevel", rewardUUID: "80a9ca2c-4a7f-0e3a-3b60-4d82509c00ce", iconURL: "https://media.valorant-api.com/weaponskinlevels/80a9ca2c-4a7f-0e3a-3b60-4d82509c00ce/displayicon.png", xpCost: 19250, isFree: false),
        ValorantBattlepassLevel(id: "26", chapter: 6, level: 26, name: "Graffiti Lisez le manuel", rewardType: "Spray", rewardUUID: "29bac100-41de-29ff-667f-46ad202d7f86", iconURL: "https://media.valorant-api.com/sprays/29bac100-41de-29ff-667f-46ad202d7f86/fulltransparenticon.png", xpCost: 20000, isFree: false),
        ValorantBattlepassLevel(id: "27", chapter: 6, level: 27, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 20750, isFree: false),
        ValorantBattlepassLevel(id: "28", chapter: 6, level: 28, name: "Graffiti Transfert dimensionnel", rewardType: "Spray", rewardUUID: "aaeea80b-470d-8953-a24f-50b61808417d", iconURL: "https://media.valorant-api.com/sprays/aaeea80b-470d-8953-a24f-50b61808417d/fulltransparenticon.png", xpCost: 21500, isFree: false),
        ValorantBattlepassLevel(id: "29", chapter: 6, level: 29, name: "Carte Solarium", rewardType: "PlayerCard", rewardUUID: "2b45f061-4d89-6fef-eaf4-bdb39fdd7e4c", iconURL: "https://media.valorant-api.com/playercards/2b45f061-4d89-6fef-eaf4-bdb39fdd7e4c/largeart.png", xpCost: 22250, isFree: false),
        ValorantBattlepassLevel(id: "30", chapter: 6, level: 30, name: "Phantom (Solarium)", rewardType: "EquippableSkinLevel", rewardUUID: "d98e8c3d-4dbb-baa8-6d23-9ca57c9bb183", iconURL: "https://media.valorant-api.com/weaponskinlevels/d98e8c3d-4dbb-baa8-6d23-9ca57c9bb183/displayicon.png", xpCost: 23000, isFree: false),
        ValorantBattlepassLevel(id: "31", chapter: 7, level: 31, name: "Carte Datalink", rewardType: "PlayerCard", rewardUUID: "5d2b95df-447f-c419-4660-bd9ef0137e42", iconURL: "https://media.valorant-api.com/playercards/5d2b95df-447f-c419-4660-bd9ef0137e42/largeart.png", xpCost: 23750, isFree: false),
        ValorantBattlepassLevel(id: "32", chapter: 7, level: 32, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 24500, isFree: false),
        ValorantBattlepassLevel(id: "33", chapter: 7, level: 33, name: "Porte-bonheur Datalink", rewardType: "EquippableCharmLevel", rewardUUID: "606ed9c3-4efa-17cb-6e3a-bfbfb76c242f", iconURL: "https://media.valorant-api.com/buddylevels/606ed9c3-4efa-17cb-6e3a-bfbfb76c242f/displayicon.png", xpCost: 25250, isFree: false),
        ValorantBattlepassLevel(id: "34", chapter: 7, level: 34, name: "Graffiti Je chille", rewardType: "Spray", rewardUUID: "4f16491d-4d12-5b6c-8baa-57b382167790", iconURL: "https://media.valorant-api.com/sprays/4f16491d-4d12-5b6c-8baa-57b382167790/fulltransparenticon.png", xpCost: 26000, isFree: false),
        ValorantBattlepassLevel(id: "35", chapter: 7, level: 35, name: "Bulldog (Datalink)", rewardType: "EquippableSkinLevel", rewardUUID: "5039c000-4e99-9b53-4fe2-cc8670369332", iconURL: "https://media.valorant-api.com/weaponskinlevels/5039c000-4e99-9b53-4fe2-cc8670369332/displayicon.png", xpCost: 26750, isFree: false),
        ValorantBattlepassLevel(id: "36", chapter: 8, level: 36, name: "Graffiti Orbe de soin gribouillé", rewardType: "Spray", rewardUUID: "9b8caded-4165-40ef-d0c1-bcbcd4862004", iconURL: "https://media.valorant-api.com/sprays/9b8caded-4165-40ef-d0c1-bcbcd4862004/fulltransparenticon.png", xpCost: 27500, isFree: false),
        ValorantBattlepassLevel(id: "37", chapter: 8, level: 37, name: "Porte-bonheur Souvenir", rewardType: "EquippableCharmLevel", rewardUUID: "18a9b76e-43cd-c1db-62e2-53922112a931", iconURL: "https://media.valorant-api.com/buddylevels/18a9b76e-43cd-c1db-62e2-53922112a931/displayicon.png", xpCost: 28250, isFree: false),
        ValorantBattlepassLevel(id: "38", chapter: 8, level: 38, name: "Carte Souvenir", rewardType: "PlayerCard", rewardUUID: "14bcffd2-489a-e7e5-da32-32a7447ef9b9", iconURL: "https://media.valorant-api.com/playercards/14bcffd2-489a-e7e5-da32-32a7447ef9b9/largeart.png", xpCost: 29000, isFree: false),
        ValorantBattlepassLevel(id: "39", chapter: 8, level: 39, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 29750, isFree: false),
        ValorantBattlepassLevel(id: "40", chapter: 8, level: 40, name: "Operator (Souvenir)", rewardType: "EquippableSkinLevel", rewardUUID: "b08e91b3-4e3d-0a32-8dee-c9833d41d11a", iconURL: "https://media.valorant-api.com/weaponskinlevels/b08e91b3-4e3d-0a32-8dee-c9833d41d11a/displayicon.png", xpCost: 30500, isFree: false),
        ValorantBattlepassLevel(id: "41", chapter: 9, level: 41, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 31250, isFree: false),
        ValorantBattlepassLevel(id: "42", chapter: 9, level: 42, name: "Carte L'heure de la pizza", rewardType: "PlayerCard", rewardUUID: "f50228df-46b8-c6db-ff48-0a865946c037", iconURL: "https://media.valorant-api.com/playercards/f50228df-46b8-c6db-ff48-0a865946c037/largeart.png", xpCost: 32000, isFree: false),
        ValorantBattlepassLevel(id: "43", chapter: 9, level: 43, name: "Graffiti Pas de souci", rewardType: "Spray", rewardUUID: "0b76f1e0-42ab-ac61-5114-bb9372361d1f", iconURL: "https://media.valorant-api.com/sprays/0b76f1e0-42ab-ac61-5114-bb9372361d1f/fulltransparenticon.png", xpCost: 32750, isFree: false),
        ValorantBattlepassLevel(id: "44", chapter: 9, level: 44, name: "Graffiti HEEEIIIN ?", rewardType: "Spray", rewardUUID: "b818bb76-4af0-0ae4-48a0-16a96e958f2c", iconURL: "https://media.valorant-api.com/sprays/b818bb76-4af0-0ae4-48a0-16a96e958f2c/fulltransparenticon.png", xpCost: 33500, isFree: false),
        ValorantBattlepassLevel(id: "45", chapter: 9, level: 45, name: "Recompense", rewardType: "Totem", rewardUUID: "5a698a97-470b-7813-17e6-d3a6f5127b3f", iconURL: "", xpCost: 34250, isFree: false),
        ValorantBattlepassLevel(id: "46", chapter: 10, level: 46, name: "Graffiti Aura Farming", rewardType: "Spray", rewardUUID: "c958665a-444c-bf64-4361-af9b52aff4b9", iconURL: "https://media.valorant-api.com/sprays/c958665a-444c-bf64-4361-af9b52aff4b9/fulltransparenticon.png", xpCost: 35000, isFree: false),
        ValorantBattlepassLevel(id: "47", chapter: 10, level: 47, name: "Porte-bonheur Maître du barbecue", rewardType: "EquippableCharmLevel", rewardUUID: "96aa15db-480d-2f00-13ed-e9866e281fe5", iconURL: "https://media.valorant-api.com/buddylevels/96aa15db-480d-2f00-13ed-e9866e281fe5/displayicon.png", xpCost: 35750, isFree: false),
        ValorantBattlepassLevel(id: "48", chapter: 10, level: 48, name: "Carte Remords du soigneur", rewardType: "PlayerCard", rewardUUID: "5c46f086-446b-4d0c-b054-07a387bdb038", iconURL: "https://media.valorant-api.com/playercards/5c46f086-446b-4d0c-b054-07a387bdb038/largeart.png", xpCost: 36500, isFree: false),
        ValorantBattlepassLevel(id: "49", chapter: 10, level: 49, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 37250, isFree: false),
        ValorantBattlepassLevel(id: "50", chapter: 10, level: 50, name: "Marteau (Solarium)", rewardType: "EquippableSkinLevel", rewardUUID: "6dbcd80b-4e52-9d7c-7b4c-bf98d6cf2090", iconURL: "https://media.valorant-api.com/weaponskinlevels/6dbcd80b-4e52-9d7c-7b4c-bf98d6cf2090/displayicon.png", xpCost: 38000, isFree: false),
        ValorantBattlepassLevel(id: "51", chapter: 11, level: 51, name: "Porte-bonheur Épilogue : Rafraîchissant", rewardType: "EquippableCharmLevel", rewardUUID: "998f103b-4d1b-a786-89bc-7b8fa61384e8", iconURL: "https://media.valorant-api.com/buddylevels/998f103b-4d1b-a786-89bc-7b8fa61384e8/displayicon.png", xpCost: 36500, isFree: true),
        ValorantBattlepassLevel(id: "52", chapter: 11, level: 52, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 36500, isFree: true),
        ValorantBattlepassLevel(id: "53", chapter: 11, level: 53, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 36500, isFree: true),
        ValorantBattlepassLevel(id: "54", chapter: 11, level: 54, name: "RADIANITE Points", rewardType: "Currency", rewardUUID: "e59aa87c-4cbf-517a-5983-6e81511be9b7", iconURL: "https://media.valorant-api.com/currencies/e59aa87c-4cbf-517a-5983-6e81511be9b7/displayicon.png", xpCost: 36500, isFree: true),
        ValorantBattlepassLevel(id: "55", chapter: 11, level: 55, name: "Carte Épilogue : Brim rat de bibliothèque", rewardType: "PlayerCard", rewardUUID: "63c8c169-49ed-d35f-3725-e9921dcf4b49", iconURL: "https://media.valorant-api.com/playercards/63c8c169-49ed-d35f-3725-e9921dcf4b49/largeart.png", xpCost: 36500, isFree: true)
    ]
}

extension ValorantMissionItem {
    static let sampleMissions: [ValorantMissionItem] = [
        ValorantMissionItem(id: "c88f4400-4d61-896d-810b-5aacd6812076", title: "Infligez des dégâts", type: "EAresMissionType::Weekly", xpGrant: 10080, progressToComplete: 18000),
        ValorantMissionItem(id: "a1924aab-41f8-c010-11c7-c4bea8a922a7", title: "Jouez une partie", type: "EAresMissionType::Weekly", xpGrant: 10080, progressToComplete: 10),
        ValorantMissionItem(id: "6e29014e-4bd3-0e2b-b4f4-fd96b72bb9c4", title: "Utilisez vos compétences", type: "EAresMissionType::Weekly", xpGrant: 10080, progressToComplete: 200),
        ValorantMissionItem(id: "aae711a7-4d5d-0d29-fb78-529b7bdab09d", title: "Posez ou désamorcez des spikes (ou un allié)", type: "EAresMissionType::Weekly", xpGrant: 12320, progressToComplete: 20),
        ValorantMissionItem(id: "f0f48165-40d1-708c-78f8-6ba7b78371e4", title: "Réalisez des tirs dans la tête", type: "EAresMissionType::Weekly", xpGrant: 12320, progressToComplete: 45),
        ValorantMissionItem(id: "9273d605-425b-67c9-b761-ca932fa0db46", title: "Utilisez votre ultime", type: "EAresMissionType::Weekly", xpGrant: 12320, progressToComplete: 25),
        ValorantMissionItem(id: "cba8a7cd-4501-4066-ca8d-fb9baea98116", title: "Éliminez des ennemis", type: "EAresMissionType::Weekly", xpGrant: 12320, progressToComplete: 100),
        ValorantMissionItem(id: "c5aaa4a5-477d-5619-189c-e698c9151bfd", title: "Jouez des manches", type: "EAresMissionType::Weekly", xpGrant: 12320, progressToComplete: 150),
        ValorantMissionItem(id: "c0393f68-4ead-384b-0ca6-74adef98762a", title: "Achetez des objets dans l'armurerie", type: "EAresMissionType::Weekly", xpGrant: 12320, progressToComplete: 100),
        ValorantMissionItem(id: "fd42458b-422d-d97f-406f-3197d2b6bc38", title: "Utilisez vos compétences", type: "EAresMissionType::Weekly", xpGrant: 16800, progressToComplete: 200),
        ValorantMissionItem(id: "c35b92ff-4466-1bba-24a7-d29952b1f269", title: "Infligez des dégâts", type: "EAresMissionType::Weekly", xpGrant: 16800, progressToComplete: 18000),
        ValorantMissionItem(id: "bfc252ef-4720-6877-cff6-9d81e0f5a1f7", title: "Utilisez votre ultime", type: "EAresMissionType::Weekly", xpGrant: 16800, progressToComplete: 25),
        ValorantMissionItem(id: "b0706e4d-408b-ce8c-8b7d-8ba3f63ceda3", title: "Posez ou désamorcez des spikes (ou un allié)", type: "EAresMissionType::Weekly", xpGrant: 17920, progressToComplete: 20),
        ValorantMissionItem(id: "6b11f53b-44e8-7266-9033-33ada27a687e", title: "Éliminez des ennemis", type: "EAresMissionType::Weekly", xpGrant: 17920, progressToComplete: 100),
        ValorantMissionItem(id: "9f471661-42f6-2931-b14f-8982a43bc9ae", title: "Jouez une partie", type: "EAresMissionType::Weekly", xpGrant: 17920, progressToComplete: 10),
        ValorantMissionItem(id: "675f23f9-4dd6-5bc9-68f6-43aa7c96cc6a", title: "Réalisez des tirs dans la tête", type: "EAresMissionType::Weekly", xpGrant: 21280, progressToComplete: 45),
        ValorantMissionItem(id: "384be70a-4f40-81f5-f0e5-c4b9dc62dba0", title: "Achetez des objets dans l'armurerie", type: "EAresMissionType::Weekly", xpGrant: 21280, progressToComplete: 100),
        ValorantMissionItem(id: "08acbae7-45db-4c44-3440-b78127739f55", title: "Utilisez votre ultime", type: "EAresMissionType::Weekly", xpGrant: 21280, progressToComplete: 25),
        ValorantMissionItem(id: "4bdc8f30-4cd0-65f2-77b3-429a0409e609", title: "Infligez des dégâts", type: "EAresMissionType::Weekly", xpGrant: 21280, progressToComplete: 18000),
        ValorantMissionItem(id: "cb4ed715-4d5e-12a9-a46f-fdb8a7a38a4d", title: "Jouez des manches", type: "EAresMissionType::Weekly", xpGrant: 21280, progressToComplete: 150),
        ValorantMissionItem(id: "3f01d7ac-49d0-fab3-8741-038c4f57bb62", title: "Utilisez vos compétences", type: "EAresMissionType::Weekly", xpGrant: 21280, progressToComplete: 150),
        ValorantMissionItem(id: "a1b38431-4a9a-e440-ddb7-c885718006ee", title: "Infligez des dégâts", type: "EAresMissionType::Weekly", xpGrant: 5200, progressToComplete: 18000),
        ValorantMissionItem(id: "0c031302-4cfb-c419-f1c3-75a95d95aa4f", title: "Jouez une partie", type: "EAresMissionType::Weekly", xpGrant: 5200, progressToComplete: 10),
        ValorantMissionItem(id: "9ada214c-40d9-423a-1e0b-bca93cdbd563", title: "Utilisez vos compétences", type: "EAresMissionType::Weekly", xpGrant: 5200, progressToComplete: 200),
        ValorantMissionItem(id: "cb51fc6d-4fb3-181c-3ece-4fb386b9e12c", title: "Infligez des dégâts", type: "EAresMissionType::Weekly", xpGrant: 16360, progressToComplete: 18000),
        ValorantMissionItem(id: "496c8e56-4ba0-51df-f555-cabfa244b461", title: "Jouez une partie", type: "EAresMissionType::Weekly", xpGrant: 16360, progressToComplete: 10),
        ValorantMissionItem(id: "f8081410-44fb-9804-5197-549ccc794c64", title: "Utilisez vos compétences", type: "EAresMissionType::Weekly", xpGrant: 16360, progressToComplete: 150),
        ValorantMissionItem(id: "41abdcbd-4957-b376-b8af-da9cbe8c049a", title: "Éliminez des ennemis", type: "EAresMissionType::Weekly", xpGrant: 16360, progressToComplete: 100),
        ValorantMissionItem(id: "9787361f-4b3d-7ce9-1492-edbccf4e8f0c", title: "Jouez des manches", type: "EAresMissionType::Weekly", xpGrant: 16360, progressToComplete: 150),
        ValorantMissionItem(id: "f07cc8c9-4f8e-5d0f-217d-3684242d3d61", title: "Achetez des objets dans l'armurerie", type: "EAresMissionType::Weekly", xpGrant: 16360, progressToComplete: 100)
    ]
}
