import Foundation

enum Config {
    static let supabaseURL = URL(string: "https://bvgifyzhpzkbrwdjrqsg.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Z2lmeXpocHprYnJ3ZGpycXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODgzNjAsImV4cCI6MjA5NjE2NDM2MH0.PCm_g4w7ZrLqNilISt-Xnlw_CZrA8PY1Uvk9H_PUhCc"
    static let workerURL = URL(string: "https://raspy-fog-bf5b.rub19-mailpro.workers.dev")!
    static let botURL = URL(string: "https://bot.ethone.dev")!

    static let oauthCallbackScheme = "ethone"
    static let oauthRedirect = "ethone://auth-callback"

    static let appGroup = "group.dev.ethone.app"
    static let keychainService = "dev.ethone.app.session"
}

