import SwiftUI

// À propos, FAQ et données de connexion web du tracker E:VAL.

struct EvalAboutView: View {
    @Environment(\.dismiss) private var dismiss
    private var version: String {
        let info = Bundle.main.infoDictionary
        return "\(info?["CFBundleShortVersionString"] as? String ?? "") (\(info?["CFBundleVersion"] as? String ?? ""))"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                EvalNavHeader(title: "À propos") { dismiss() }
                EvalSettingsHero(icon: "info.circle", title: "Tracker VALORANT",
                                 text: "Statistiques, matchs, classement et boutique de vos comptes VALORANT, intégrés à Ethone.")
                VStack(alignment: .leading, spacing: 10) {
                    Text("Sources des données").font(.system(size: 21, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.leading, 4)
                    VStack(spacing: 0) {
                        EvalSettingsRow(icon: "server.rack", title: "Matchs, rangs, classement", value: "HenrikDev", chevron: false)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        EvalSettingsRow(icon: "photo.on.rectangle", title: "Agents, cartes, skins", value: "valorant-api", chevron: false)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        EvalSettingsRow(icon: "gamecontroller", title: "Boutique, équipement", value: "Compte Riot", chevron: false)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        EvalSettingsRow(icon: "externaldrive", title: "Sauvegarde", value: "Supabase", chevron: false)
                    }
                    .background(Color(hex: 0x1C1C1E), in: .rect(cornerRadius: 22))
                }
                Text("Ethone n’est ni approuvé ni affilié à Riot Games. VALORANT et Riot Games sont des marques de Riot Games, Inc. Les données du compte Riot passent par une API non officielle que Riot peut modifier à tout moment.")
                    .font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.horizontal, 4)
                Text("Version \(version)").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.horizontal, 4)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}

struct EvalFAQView: View {
    @Environment(\.dismiss) private var dismiss

    private struct Item: Identifiable { let q: String; let a: String; var id: String { q } }

    private let items: [Item] = [
        Item(q: "Pourquoi mes derniers matchs n’apparaissent pas ?", a: "Les matchs sont synchronisés au plus toutes les 10 minutes par compte, puis gardés pour toujours. Tirez vers le bas sur le profil après ce délai."),
        Item(q: "Comment voir des matchs plus anciens ?", a: "Profil → Voir les statistiques → « Charger 10 matchs de plus ». Chaque match n’est téléchargé qu’une seule fois."),
        Item(q: "Pourquoi l’onglet Jeu est verrouillé ?", a: "Boutique, portefeuille, équipement et groupe demandent la connexion à votre compte Riot (Paramètres → Connecter mon compte Riot)."),
        Item(q: "Mon mot de passe Riot est-il envoyé à Ethone ?", a: "Non. La connexion se fait sur la page officielle de Riot ; seuls les jetons de session sont gardés dans le Keychain de l’iPhone."),
        Item(q: "Pourquoi je ne vois pas le statut en jeu de mes amis ?", a: "La présence en direct des amis Riot n’est pas disponible dans l’app. Les amis ajoutés par Riot ID affichent leur rang, leurs matchs et leurs changements de pseudo."),
        Item(q: "Que contient une Snapshot ?", a: "Les paramètres en jeu du compte Riot connecté (sensibilité, viseur, touches…). Vous pouvez les réappliquer à n’importe quel compte Riot connecté."),
        Item(q: "Pourquoi l’historique des achats est vide ?", a: "Riot ne partage pas les paiements et transactions en dehors de son client. L’historique de la boutique, lui, est enregistré chaque jour par l’app.")
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                EvalNavHeader(title: "FAQ") { dismiss() }
                ForEach(items) { item in
                    DisclosureGroup {
                        Text(item.a).font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 6)
                    } label: {
                        Text(item.q).font(.system(size: 20, weight: .semibold)).foregroundStyle(.white).multilineTextAlignment(.leading)
                    }
                    .tint(Color(hex: 0xFD5B68))
                    .padding(18)
                    .background(Color(hex: 0x1C1C1E), in: .rect(cornerRadius: 20))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}

struct EvalWebLoginDataView: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("eval.clearWebLoginOnOpen") private var clearOnOpen = false
    @State private var cleared = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                EvalNavHeader(title: "Connexion au site web") { dismiss() }
                EvalSettingsHero(icon: "person.badge.key", title: "Données de connexion au site web",
                                 text: "Les cookies de la page de connexion Riot sont gardés pour vous reconnecter sans ressaisir votre mot de passe. Supprimez-les pour changer de compte ou résoudre un problème de connexion.")
                Toggle(isOn: $clearOnOpen) {
                    HStack(spacing: 14) {
                        Image(systemName: "arrow.3.trianglepath").font(.system(size: 23)).foregroundStyle(Color(hex: 0xFD5B68)).frame(width: 28)
                        Text("Effacer les données de connexion Web à l’ouverture").font(.system(size: 20)).foregroundStyle(.white)
                    }
                }
                .tint(Color(hex: 0xFD5B68))
                .padding(18)
                .background(Color(hex: 0x1C1C1E), in: .rect(cornerRadius: 22))
                Text("Efface les cookies Riot à chaque ouverture de l’écran de connexion. Votre compte reste connecté jusqu’à l’expiration de la session.")
                    .font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.horizontal, 4)
                Button {
                    Task { await RiotWebData.clear(); cleared = true }
                } label: {
                    Label(cleared ? "Données effacées" : "Effacer les données de connexion Web immédiatement", systemImage: cleared ? "checkmark" : "trash")
                        .font(.system(size: 20))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(18)
                        .background(Color(hex: 0x1C1C1E), in: .rect(cornerRadius: 22))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}
