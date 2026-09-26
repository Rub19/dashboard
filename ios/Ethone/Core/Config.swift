import Foundation

/// Configuration publique de l'app. Aucune valeur secrète ici : la clé « anon » de Supabase est publique par conception
/// (elle est déjà servie dans le JavaScript du site) et l'accès aux données est protégé par les règles RLS côté base.
enum Config {
    static let supabaseURL = URL(string: "https://bvgifyzhpzkbrwdjrqsg.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Z2lmeXpocHprYnJ3ZGpycXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODgzNjAsImV4cCI6MjA5NjE2NDM2MH0.PCm_g4w7ZrLqNilISt-Xnlw_CZrA8PY1Uvk9H_PUhCc"
    static let workerURL = URL(string: "https://raspy-fog-bf5b.rub19-mailpro.workers.dev")!
    static let botURL = URL(string: "https://bot.ethone.dev")!

    /// Schéma d'URL enregistré dans Info.plist ; la redirection doit être autorisée dans les réglages d'authentification Supabase.
    static let oauthCallbackScheme = "ethone"
    static let oauthRedirect = "ethone://auth-callback"

    static let appGroup = "group.dev.ethone.app"
    static let keychainService = "dev.ethone.app.session"
}
